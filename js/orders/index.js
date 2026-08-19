import { api } from '../services/api.js';
import { renderers } from '../renderers.js';
import { getOrderSheetsHTML, getOrderDetailsHeader, getOrderDetailsContent, getOrdersAnalyticsHTML } from './templates.js';

let currentOrders = [];
let activeOrder = null;
let currentFilter = 'active';
let currentSearchQuery = '';
let currentViewMode = 'list';
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
    const listContainer = document.getElementById('orders-list');
    const kanbanContainer = document.getElementById('orders-kanban');
    if (!listContainer || !kanbanContainer) return;

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

    if (currentViewMode === 'list') {
        listContainer.classList.remove('hidden');
        kanbanContainer.classList.add('hidden');
        
        if (filtered.length === 0) {
            listContainer.innerHTML = `<div class="p-8 text-center text-secondary">
                <span class="material-symbols-outlined text-[48px] mb-2 opacity-50">inbox</span>
                <p>No orders found.</p>
            </div>`;
            return;
        }

        listContainer.innerHTML = filtered.map(o => `
            <div onclick="window.openOrderDetails('${o.id}')" class="cursor-pointer active-scale transition-apple">
                ${renderers.orderCard(o)}
            </div>
        `).join('');
    } else {
        listContainer.classList.add('hidden');
        kanbanContainer.classList.remove('hidden');
        renderKanban(filtered);
    }
}

function renderKanban(filteredOrders) {
    const kanbanContainer = document.getElementById('orders-kanban');
    if (!kanbanContainer) return;

    const stages = ['Draft', 'Cutting', 'Stitching', 'Printing', 'Finished', 'Dispatched'];
    
    kanbanContainer.innerHTML = stages.map(stage => {
        const stageOrders = filteredOrders.filter(o => o.status === stage);
        
        // Setup styles based on stage
        let stageColor = 'bg-surface-variant text-on-surface-variant';
        let badgeColor = 'bg-surface-container-high text-secondary';
        
        if (stage === 'Finished' || stage === 'Dispatched') {
            stageColor = 'bg-[#008A00]/10 text-[#008A00] border border-[#008A00]/20';
            badgeColor = 'bg-[#008A00] text-white';
        } else if (stage === 'Stitching') {
            stageColor = 'bg-[#FF9F0A]/10 text-[#FF9F0A] border border-[#FF9F0A]/20';
            badgeColor = 'bg-[#FF9F0A] text-white';
        } else if (stage === 'Printing') {
            stageColor = 'bg-[#0A84FF]/10 text-[#0A84FF] border border-[#0A84FF]/20';
            badgeColor = 'bg-[#0A84FF] text-white';
        }
        
        const columnHeader = `
            <div class="flex justify-between items-center mb-3">
                <span class="text-[13px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${stageColor}">${stage}</span>
                <span class="text-[12px] font-bold px-2 py-1 rounded-full ${badgeColor}">${stageOrders.length}</span>
            </div>
        `;

        const columnCards = stageOrders.map(o => `
            <div onclick="window.openOrderDetails('${o.id}')" class="cursor-pointer bg-surface-container-lowest p-3 rounded-xl border border-outline-variant shadow-sm active-scale transition-apple mb-2">
                <div class="flex justify-between items-start mb-2">
                    <span class="text-[11px] font-semibold text-secondary uppercase">${o.id}</span>
                    <span class="text-[11px] font-bold px-2 py-0.5 rounded-full bg-surface-variant text-on-surface-variant">${o.qty}</span>
                </div>
                <h4 class="text-[14px] font-bold text-on-surface mb-1 line-clamp-1">${o.product}</h4>
                <p class="text-[12px] text-secondary line-clamp-1">${api.getCustomerSync?.(o.customerId)?.name || o.customerId}</p>
            </div>
        `).join('');

        return `
            <div class="min-w-[280px] max-w-[280px] snap-center flex flex-col h-full bg-surface-container/30 rounded-2xl p-3 border border-outline-variant/50">
                ${columnHeader}
                <div class="flex-1 overflow-y-auto hide-scrollbar flex flex-col gap-1 min-h-[300px]">
                    ${columnCards}
                    ${stageOrders.length === 0 ? '<div class="flex-1 flex items-center justify-center p-4 border-2 border-dashed border-outline-variant rounded-xl opacity-50"><p class="text-[12px] text-secondary font-medium">Empty</p></div>' : ''}
                </div>
            </div>
        `;
    }).join('');
}

window.setViewMode = function(mode) {
    currentViewMode = mode;
    
    // Update button states
    const listBtn = document.getElementById('view-list-btn');
    const kanbanBtn = document.getElementById('view-kanban-btn');
    
    if (mode === 'list') {
        listBtn.className = 'w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center transition-colors';
        kanbanBtn.className = 'w-8 h-8 rounded-lg text-secondary hover:bg-surface-variant flex items-center justify-center transition-colors';
    } else {
        kanbanBtn.className = 'w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center transition-colors';
        listBtn.className = 'w-8 h-8 rounded-lg text-secondary hover:bg-surface-variant flex items-center justify-center transition-colors';
    }
    
    renderOrders();
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
                { title: 'Verify fabric quantity & laying', completed: false },
                { title: 'Apply marker templates & cut fabrics', completed: false }
            ];
        } else if (newStatus === 'Stitching') {
            autoTasks = [
                { title: 'Assemble front & back panels', completed: false },
                { title: 'Attach collar and sleeves', completed: false }
            ];
        } else if (newStatus === 'Printing') {
            autoTasks = [
                { title: 'Prepare screen/embroidery frames', completed: false },
                { title: 'Print sample panel & check alignment', completed: false }
            ];
        }
        
        if (autoTasks.length > 0) {
            for (const t of autoTasks) {
                await api.addOrderTask(activeOrder.id, t);
            }
        }

        await loadOrders();
        window.openOrderDetails(activeOrder.id); // Re-open with new data instead of closing
        window.showToast?.(`Status updated to ${newStatus}`, 'success');
    } catch (e) {
        console.error(e);
        window.showToast?.('Failed to update status', 'error');
    }
};

window.toggleOrderTask = async function(taskId, isCompleted) {
    if (!activeOrder) return;
    try {
        const task = activeOrder.tasks.find(t => t.id === taskId);
        if (task) {
            task.completed = isCompleted;
            await api.updateOrderTask(activeOrder.id, taskId, task);
            
            // Re-render order details locally without closing sheet
            const activeOrderIdx = currentOrders.findIndex(o => o.id === activeOrder.id);
            if(activeOrderIdx > -1) {
                currentOrders[activeOrderIdx] = await api.getOrder(activeOrder.id);
                activeOrder = currentOrders[activeOrderIdx];
                const contentEl = document.getElementById('orderDetailsSheet-inner-content');
                if (contentEl) contentEl.innerHTML = getOrderDetailsContent(activeOrder);
            }
        }
    } catch(e) {
        window.showToast?.('Failed to update task', 'error');
    }
}

window.logPayment = function() {
    if (!activeOrder) return;
    const paymentPending = Math.max((activeOrder.value || 0) - (activeOrder.paymentReceived || 0), 0);
    document.getElementById('log-payment-amount').value = paymentPending || '';
    document.getElementById('log-payment-note').value = '';
    window.openSheet('logPaymentSheet');
}

window.submitLogPayment = async function() {
    if (!activeOrder) return;
    
    const amount = parseFloat(document.getElementById('log-payment-amount').value) || 0;
    const method = document.getElementById('log-payment-method').value;
    const note = document.getElementById('log-payment-note').value;
    
    if (amount <= 0) {
        window.showToast?.('Enter a valid amount', 'error');
        return;
    }

    try {
        const newTotal = (activeOrder.paymentReceived || 0) + amount;
        const isPaid = newTotal >= (activeOrder.value || 0);
        
        await api.updateOrder(activeOrder.id, {
            paymentReceived: newTotal,
            paymentStatus: isPaid ? 'Paid' : 'Partially Paid'
        });

        window.showToast?.(`Logged ₹${amount.toLocaleString()} payment`, 'success');
        window.closeSheet('logPaymentSheet');
        
        await loadOrders();
        window.openOrderDetails(activeOrder.id);
        
    } catch (e) {
        window.showToast?.('Failed to log payment', 'error');
    }
}
