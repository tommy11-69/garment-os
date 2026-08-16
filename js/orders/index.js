import { api } from '../services/api.js';
import { renderers } from '../renderers.js';
import { getOrderSheetsHTML, getOrderDetailsHeader, getOrderDetailsContent, getOrdersAnalyticsHTML } from './templates.js';

let currentOrders = [];
let activeOrder = null;
let currentFilter = 'active';
let currentSearchQuery = '';
const TOTAL_WIZARD_STEPS = 4;
window.currentWizardStep = 1;

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Render Sheets
    const sheetsContainer = document.getElementById('sheets-container');
    if (sheetsContainer) {
        try {
            sheetsContainer.innerHTML = await getOrderSheetsHTML();
        } catch (e) {
            console.error("Failed to render order sheets:", e);
        }
    }
    
    // 2. Load Data
    try {
        await loadOrders();
    } catch (e) {
        console.error("Failed to load orders:", e);
    }

    // 3. Bind events
    document.getElementById('orders-search-input')?.addEventListener('input', (e) => {
        currentSearchQuery = e.target.value.trim().toLowerCase();
        renderOrders();
    });

    bindWizardCalculations();
    bindCostingAutoFill();

    // Open from URL if present
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('orderId');
    if (orderId) window.openOrderDetails(orderId);
});

async function loadOrders() {
    currentOrders = await api.getOrders();
    renderOrders();
    renderAnalyticsSummary();
}

function renderAnalyticsSummary() {
    const container = document.getElementById('orders-analytics-container');
    if (!container) return;

    const activeOrders = currentOrders.filter(o => !['Dispatched', 'Delivered', 'Closed', 'Archived'].includes(o.status));
    
    const totalValue = activeOrders.reduce((sum, o) => sum + (o.value || 0), 0);
    const pendingUnits = activeOrders.reduce((sum, o) => sum + (o.qty || 0), 0);
    const cuttingCount = activeOrders.filter(o => o.status === 'Cutting').length;
    const stitchingCount = activeOrders.filter(o => o.status === 'Stitching').length;
    const printingCount = activeOrders.filter(o => o.status === 'Printing').length;

    container.innerHTML = getOrdersAnalyticsHTML({
        totalValue,
        pendingUnits,
        cuttingCount,
        stitchingCount,
        printingCount
    });
}

function renderOrders() {
    const container = document.getElementById('orders-list');
    if (!container) return;

    let filtered = currentOrders;

    // Segmented tab
    if (currentFilter === 'active') {
        filtered = filtered.filter(o => !['Dispatched', 'Delivered', 'Closed', 'Archived'].includes(o.status));
    } else if (currentFilter === 'completed') {
        filtered = filtered.filter(o => ['Dispatched', 'Delivered', 'Closed', 'Archived'].includes(o.status));
    }

    // Search
    if (currentSearchQuery) {
        filtered = filtered.filter(o => 
            (o.id && o.id.toLowerCase().includes(currentSearchQuery)) ||
            (o.product && o.product.toLowerCase().includes(currentSearchQuery)) ||
            (o.customerId && o.customerId.toLowerCase().includes(currentSearchQuery)) ||
            (o.status && o.status.toLowerCase().includes(currentSearchQuery))
        );
    }

    if (filtered.length === 0) {
        container.innerHTML = `<div class="p-8 text-center text-secondary">
            <span class="material-symbols-outlined text-[48px] mb-2 opacity-50">inbox</span>
            <p>No orders found.</p>
        </div>`;
        return;
    }

    container.innerHTML = filtered.map(o => `
        <div onclick="window.openOrderDetails('${o.id}')" class="cursor-pointer active-scale transition-apple">
            ${renderers.orderCard(o)}
        </div>
    `).join('');
}

window.setFilter = function(filter) {
    currentFilter = filter;
    document.getElementById('tab-active')?.classList.replace('bg-surface-variant', 'text-secondary');
    document.getElementById('tab-active')?.classList.replace('text-on-surface', 'text-secondary');
    document.getElementById('tab-active')?.classList.remove('bg-surface-variant', 'text-on-surface');
    document.getElementById('tab-completed')?.classList.remove('bg-surface-variant', 'text-on-surface');
    
    if (filter === 'active') {
        document.getElementById('tab-active')?.classList.add('bg-surface-variant', 'text-on-surface');
        document.getElementById('tab-completed')?.classList.add('text-secondary');
    } else {
        document.getElementById('tab-completed')?.classList.add('bg-surface-variant', 'text-on-surface');
        document.getElementById('tab-completed')?.classList.remove('text-secondary');
        document.getElementById('tab-active')?.classList.add('text-secondary');
    }
    renderOrders();
}

window.openOrderDetails = async function (orderId) {
    activeOrder = currentOrders.find(o => o.id === orderId);
    if (!activeOrder) return;

    const detailsSheet = document.getElementById('orderDetailsSheet-content');
    if (detailsSheet) {
        const headerEl = detailsSheet.querySelector('.sheet-custom-header');
        const contentEl = document.getElementById('orderDetailsSheet-inner-content');
        if (headerEl) headerEl.innerHTML = getOrderDetailsHeader(activeOrder);
        if (contentEl) contentEl.innerHTML = getOrderDetailsContent(activeOrder);
    }

    window.openSheet('orderDetailsSheet');
    window.switchOrderTab('overview');
};

window.switchOrderTab = function(tabId) {
    document.querySelectorAll('.od-tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.od-tab-btn').forEach(btn => {
        btn.classList.remove('border-primary', 'text-primary');
        btn.classList.add('border-transparent', 'text-secondary');
    });

    document.getElementById(`od-tab-${tabId}`)?.classList.remove('hidden');
    const btn = document.getElementById(`od-tab-btn-${tabId}`);
    if (btn) {
        btn.classList.remove('border-transparent', 'text-secondary');
        btn.classList.add('border-primary', 'text-primary');
    }
}

// ==========================================
// CREATE WIZARD LOGIC
// ==========================================
window.openCreateWizard = function() {
    window.currentWizardStep = 1;
    window.goToOrderStep(0); // init
    document.getElementById('create-order-form')?.reset();
    document.getElementById('calc-grandtotal').textContent = '₹0.00';
    window.openSheet('createOrderSheet');

    const select = document.getElementById('create-customer-select');
    if (select) {
        select.onchange = (e) => {
            if (e.target.value === 'NEW_CUSTOMER') {
                select.value = '';
                window.openQuickAddCustomer(async (newCust) => {
                    const customers = await api.getCustomers();
                    select.innerHTML = `<option value="">Select Customer</option><option value="NEW_CUSTOMER">+ Create New Customer</option>` + 
                        customers.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
                    select.value = newCust.id;
                });
            }
        };
    }
}

window.goToOrderStep = function(direction) {
    let nextStep = window.currentWizardStep + direction;
    if (nextStep < 1 || nextStep > TOTAL_WIZARD_STEPS) return;
    
    for (let i = 1; i <= TOTAL_WIZARD_STEPS; i++) {
        document.getElementById(`order-step-${i}`)?.classList.add('hidden');
    }
    document.getElementById(`order-step-${nextStep}`)?.classList.remove('hidden');
    
    const progressWidth = ((nextStep - 1) / (TOTAL_WIZARD_STEPS - 1)) * 100;
    const progressEl = document.getElementById('wizard-progress-bar');
    if (progressEl) progressEl.style.width = `${progressWidth}%`;

    document.getElementById('wizard-prev-btn')?.classList.toggle('hidden', nextStep === 1);
    document.getElementById('wizard-next-btn')?.classList.toggle('hidden', nextStep === TOTAL_WIZARD_STEPS);
    document.getElementById('create-order-submit')?.classList.toggle('hidden', nextStep !== TOTAL_WIZARD_STEPS);

    window.currentWizardStep = nextStep;
}

function bindWizardCalculations() {
    const qtyInput = document.getElementById('create-qty');
    const priceInput = document.getElementById('create-price');
    const totalEl = document.getElementById('calc-grandtotal');

    const calc = () => {
        const q = parseInt(qtyInput?.value) || 0;
        const p = parseFloat(priceInput?.value) || 0;
        if (totalEl) totalEl.textContent = `₹${(q * p).toLocaleString()}`;
    };

    qtyInput?.addEventListener('input', calc);
    priceInput?.addEventListener('input', calc);
}

function bindCostingAutoFill() {
    const quoteSelect = document.getElementById('create-quote');
    quoteSelect?.addEventListener('change', async (e) => {
        const costingId = e.target.value;
        if (!costingId) return;

        try {
            const costings = await api.getCostings();
            const costing = costings.find(c => c.id === costingId);
            if (costing) {
                const productInput = document.getElementById('create-product');
                const fabricInput = document.getElementById('create-fabric');
                const priceInput = document.getElementById('create-price');

                if (productInput) productInput.value = costing.styleRef || '';
                if (fabricInput) fabricInput.value = costing.fabricType || '';
                if (priceInput) {
                    priceInput.value = costing.retailPrice || costing.totalCost || 0;
                    // Trigger calculations
                    const qtyInput = document.getElementById('create-qty');
                    const q = parseInt(qtyInput?.value) || 0;
                    const p = parseFloat(priceInput.value) || 0;
                    const totalEl = document.getElementById('calc-grandtotal');
                    if (totalEl) totalEl.textContent = `₹${(q * p).toLocaleString()}`;
                }
                window.showToast?.('Pre-filled specs from quotation', 'success');
            }
        } catch (err) {
            console.error('Failed to auto-fill costing:', err);
        }
    });
}

// ==========================================
// CRUD OPERATIONS
// ==========================================
window.submitNewOrder = async function() {
    const customerId = document.getElementById('create-customer-select')?.value;
    const product = document.getElementById('create-product')?.value;
    const qty = parseInt(document.getElementById('create-qty')?.value) || 0;
    const unitPrice = parseFloat(document.getElementById('create-price')?.value) || 0;
    
    if (!customerId || !product || qty <= 0) {
        window.showToast?.('Please fill required fields (Customer, Product, Qty > 0)', 'error');
        return;
    }
    
    const newOrder = {
        customerId,
        product,
        qty,
        fabric: document.getElementById('create-fabric')?.value || '',
        sizes: document.getElementById('create-sizes')?.value || '',
        colors: document.getElementById('create-colors')?.value || '',
        status: document.getElementById('create-status')?.value || 'Draft',
        priority: document.getElementById('create-priority')?.value || 'Normal',
        value: (qty * unitPrice),
        incurredCost: 0,
        deliveryDate: document.getElementById('create-delivery')?.value || '',
        tasks: [],
        timeline: [],
        paymentStatus: 'Unpaid',
        paymentReceived: 0
    };
    
    try {
        await api.saveOrder(newOrder);
        window.showToast?.('Order created successfully', 'success');
        window.closeSheet('createOrderSheet');
        await loadOrders();
    } catch (err) {
        window.showToast?.('Failed to create order', 'error');
    }
}

window.openEditOrder = function() {
    if (!activeOrder) return;
    document.getElementById('edit-product').value = activeOrder.product || '';
    document.getElementById('edit-qty').value = activeOrder.qty || '';
    document.getElementById('edit-price').value = (activeOrder.value / (activeOrder.qty || 1)) || '';
    document.getElementById('edit-priority').value = activeOrder.priority || 'Normal';
    document.getElementById('edit-delivery').value = activeOrder.deliveryDate || '';
    
    window.closeSheet('orderDetailsSheet');
    window.openSheet('editOrderSheet');
}

window.submitEditOrder = async function() {
    if (!activeOrder) return;
    const product = document.getElementById('edit-product').value;
    const qty = parseInt(document.getElementById('edit-qty').value) || activeOrder.qty;
    const unitPrice = parseFloat(document.getElementById('edit-price').value) || 0;
    const priority = document.getElementById('edit-priority').value;
    const deliveryDate = document.getElementById('edit-delivery').value;

    const updates = {
        product,
        qty,
        priority,
        deliveryDate,
        value: (qty * unitPrice)
    };

    try {
        await api.updateOrder(activeOrder.id, updates);
        window.showToast?.('Order updated', 'success');
        window.closeSheet('editOrderSheet');
        await loadOrders();
        window.openOrderDetails(activeOrder.id);
    } catch (e) {
        window.showToast?.('Failed to update', 'error');
    }
}

window.deleteOrder = async function () {
    if (!activeOrder) return;
    try {
        await api.deleteOrder(activeOrder.id);
        window.showToast?.('Order deleted', 'success');
        window.closeSheet('orderDetailsSheet');
        await loadOrders();
    } catch (e) {
        window.showToast?.('Failed to delete', 'error');
    }
};

window.handleStatusTransition = async function (newStatus) {
    if (!activeOrder) return;
    try {
        window.showToast?.(`Moving to ${newStatus}...`, 'info');
        await api.updateOrderStatus(activeOrder.id, newStatus);
        
        let autoTasks = [];
        if (newStatus === 'Cutting') {
            autoTasks = [
                { id: `t-cut-1-${Date.now()}`, title: 'Verify fabric quantity & laying', completed: false },
                { id: `t-cut-2-${Date.now()}`, title: 'Apply marker templates & cut fabrics', completed: false }
            ];
        } else if (newStatus === 'Stitching') {
            autoTasks = [
                { id: `t-stitch-1-${Date.now()}`, title: 'Assemble front & back panels', completed: false },
                { id: `t-stitch-2-${Date.now()}`, title: 'Attach collar and sleeves', completed: false }
            ];
        } else if (newStatus === 'Printing') {
            autoTasks = [
                { id: `t-print-1-${Date.now()}`, title: 'Prepare screen/embroidery frames', completed: false },
                { id: `t-print-2-${Date.now()}`, title: 'Print sample panel & check alignment', completed: false }
            ];
        }
        
        if (autoTasks.length > 0) {
            for (const t of autoTasks) {
                await api.updateOrderTask(activeOrder.id, t.id, t);
            }
        }

        await loadOrders();
        window.closeSheet('orderDetailsSheet');
        window.showToast?.(`Status updated to ${newStatus}`, 'success');
    } catch (e) {
        window.showToast?.('Failed to update status', 'error');
    }
};
