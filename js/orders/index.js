import { api } from '../services/api.js';
import { renderers } from '../renderers.js';
import { SegmentedControl, BottomSheet, TimelineEvent } from '../components/index.js';
import { TextInput, SelectInput, TextareaInput } from '../components/inputs.js';
import { bindFormValidation } from '../utils/formHandler.js';

let currentOrders = [];
let activeOrder = null;
let currentFilter = 'all';

document.addEventListener('DOMContentLoaded', async () => {
    const segControl = document.getElementById('orders-segmented-control');
    if (segControl) {
        const options = [
            { id: 'all', label: 'All' },
            { id: 'active', label: 'Active (Draft/Prod)' },
            { id: 'completed', label: 'Completed' }
        ];
        
        const renderSegControl = () => {
            segControl.innerHTML = SegmentedControl({
                options: options,
                activeOption: currentFilter
            });
            
            // Attach event listeners manually
            const tabs = segControl.querySelectorAll('button[role="tab"]');
            tabs.forEach(tab => {
                tab.addEventListener('click', (e) => {
                    currentFilter = e.currentTarget.dataset.option;
                    renderSegControl(); // Re-render to update classes
                    renderOrders();
                });
            });
        };
        renderSegControl();
    }

    // 2. Load Data
    await loadOrders();
    await renderSheets();

    // If URL has orderId, open it
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('orderId');
    if (orderId) {
        window.openOrderDetails(orderId);
    }
});

async function loadOrders() {
    const container = document.getElementById('orders-list');
    if (container && window.setLoading) window.setLoading('orders-list');
    try {
        currentOrders = await api.getOrders();
        renderOrders();
    } catch (error) {
        if (container) container.innerHTML = '<div class="p-md text-center text-error">Failed to load orders</div>';
        console.error(error);
    }
}

function renderOrders() {
    const container = document.getElementById('orders-list');
    if (!container) return;

    let filtered = currentOrders;
    if (currentFilter === 'active') {
        filtered = currentOrders.filter(o => ['Draft', 'Approved', 'Production', 'QC', 'Dispatch'].includes(o.status));
    } else if (currentFilter === 'completed') {
        filtered = currentOrders.filter(o => ['Delivered', 'Archived'].includes(o.status));
    } else {
        filtered = currentOrders.filter(o => o.status !== 'Archived');
    }

    if (filtered.length === 0) {
        container.innerHTML = '<div class="p-md text-center text-secondary">No orders found</div>';
        const countEl = document.getElementById('orders-count');
        if (countEl) countEl.textContent = '0 Orders';
        return;
    }
    container.innerHTML = filtered.map(o => renderers.orderCard(o)).join('');
    const countEl = document.getElementById('orders-count');
    if (countEl) countEl.textContent = `${filtered.length} ${currentFilter === 'active' ? 'Active ' : currentFilter === 'completed' ? 'Completed ' : ''}Orders`;
}

window.openOrderDetails = async function(orderId) {
    activeOrder = currentOrders.find(o => o.id === orderId);
    if (!activeOrder) return;
    
    // Update DOM inside orderDetailsSheet
    document.getElementById('od-id').textContent = activeOrder.id;
    document.getElementById('od-customer').textContent = activeOrder.customerName;
    document.getElementById('od-status').textContent = activeOrder.status;
    document.getElementById('od-status').className = `inline-block mt-2 px-3 py-1 rounded-full text-[12px] font-medium ${activeOrder.statusColor || 'bg-surface-variant text-secondary'}`;
    
    document.getElementById('od-product').textContent = activeOrder.product || '—';
    document.getElementById('od-qty').textContent = activeOrder.qty ? activeOrder.qty.toLocaleString() : '—';
    document.getElementById('od-sizes').textContent = activeOrder.sizes ? activeOrder.sizes.join(', ') : '—';
    document.getElementById('od-colours').textContent = activeOrder.colours ? activeOrder.colours.join(', ') : '—';
    document.getElementById('od-delivery').textContent = activeOrder.deliveryDate || '—';
    document.getElementById('od-notes').textContent = activeOrder.notes || 'No notes.';

    // Financials
    const quoted = activeOrder.quotedCost || 0;
    const incurred = activeOrder.incurredCost || 0;
    const revenue = activeOrder.value || 0;
    
    document.getElementById('od-quoted').textContent = '$' + quoted.toLocaleString();
    document.getElementById('od-incurred').textContent = '$' + incurred.toLocaleString();
    
    // Profit margin bar
    const profit = revenue - incurred;
    const profitPct = revenue > 0 ? (profit / revenue) * 100 : 0;
    document.getElementById('od-profit-val').textContent = '$' + profit.toLocaleString();
    const pBar = document.getElementById('od-profit-bar');
    if (pBar) {
        pBar.style.width = Math.max(0, Math.min(100, profitPct)) + '%';
        pBar.className = `h-full rounded-full transition-all duration-500 ${profitPct >= 20 ? 'bg-[#008A00]' : profitPct >= 0 ? 'bg-primary' : 'bg-error'}`;
    }

    // Production Progress Stepper
    const progressMap = {
        'Draft': 0, 'Approved': 10, 'Material Reserved': 20, 
        'Knitting': 30, 'Dyeing': 40, 'Compacting': 50, 
        'Cutting': 60, 'Printing': 70, 'Stitching': 80, 
        'Quality Check': 90, 'Packing': 95, 'Dispatched': 100, 'Delivered': 100
    };
    const currentProgress = progressMap[activeOrder.status] || 0;
    
    document.getElementById('od-progress-label').textContent = activeOrder.status;
    document.getElementById('od-progress-pct').textContent = currentProgress + '%';
    document.getElementById('od-progress-bar').style.width = currentProgress + '%';

    window.openSheet('orderDetailsSheet');
};

window.handleStatusTransition = async function(newStatus) {
    if (!activeOrder) return;
    try {
        window.showToast?.(`Moving to ${newStatus}...`, 'info');
        await api.updateOrderStatus(activeOrder.id, newStatus);
        await loadOrders(); // Refresh lists
        window.openOrderDetails(activeOrder.id); // Re-render sheet
        window.showToast?.(`Status updated to ${newStatus}`, 'success');
    } catch (e) {
        window.showToast?.('Failed to update status', 'error');
    }
};

window.duplicateOrder = async function() {
    if (!activeOrder) return;
    window.closeSheet('orderDetailsSheet');
    if (window.setLoading) window.setLoading('orders-list');
    try {
        await api.duplicateOrder(activeOrder.id);
        window.showToast?.('Order duplicated', 'success');
        await loadOrders();
    } catch (e) {
        window.showToast?.('Failed to duplicate', 'error');
    }
};

window.archiveOrder = async function() {
    if (!activeOrder) return;
    window.closeSheet('orderDetailsSheet');
    if (window.setLoading) window.setLoading('orders-list');
    try {
        await api.archiveOrder(activeOrder.id);
        window.showToast?.('Order archived', 'success');
        await loadOrders();
    } catch (e) {
        window.showToast?.('Failed to archive', 'error');
    }
};

window.deleteOrder = async function() {
    if (!activeOrder) return;
    window.closeSheet('orderDetailsSheet');
    if (window.setLoading) window.setLoading('orders-list');
    try {
        await api.deleteOrder(activeOrder.id);
        window.showToast?.('Order deleted', 'success');
        await loadOrders();
    } catch (e) {
        window.showToast?.('Failed to delete', 'error');
    }
};

// ==========================================
// WIZARD LOGIC & CALCULATIONS
// ==========================================
let currentWizardStep = 1;
const TOTAL_WIZARD_STEPS = 4;

window.goToOrderStep = function(dir) {
    const nextStep = currentWizardStep + dir;
    if (nextStep < 1 || nextStep > TOTAL_WIZARD_STEPS) return;

    // Hide all steps
    for (let i = 1; i <= TOTAL_WIZARD_STEPS; i++) {
        const stepEl = document.getElementById(`order-step-${i}`);
        const dotEl = document.getElementById(`wizard-dot-${i}`);
        if (stepEl) stepEl.classList.add('hidden');
        if (dotEl) {
            dotEl.className = i <= nextStep
                ? 'w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center z-10 font-bold text-[13px] shadow-sm transition-colors'
                : 'w-8 h-8 rounded-full bg-surface-container-highest text-secondary flex items-center justify-center z-10 font-bold text-[13px] transition-colors';
        }
    }

    // Show current step
    document.getElementById(`order-step-${nextStep}`).classList.remove('hidden');
    
    // Update progress bar
    const progressWidth = ((nextStep - 1) / (TOTAL_WIZARD_STEPS - 1)) * 100;
    document.getElementById('wizard-progress-bar').style.width = `${progressWidth}%`;

    // Update Footer Buttons
    document.getElementById('wizard-prev-btn').classList.toggle('hidden', nextStep === 1);
    document.getElementById('wizard-next-btn').classList.toggle('hidden', nextStep === TOTAL_WIZARD_STEPS);
    document.getElementById('create-order-submit').classList.toggle('hidden', nextStep !== TOTAL_WIZARD_STEPS);
    
    currentWizardStep = nextStep;
};

// Open wizard normally starts at step 1
window.openCreateWizard = function() {
    currentWizardStep = 1;
    // reset visual state
    window.goToOrderStep(0); 
    // Clear inputs (can use formHandler.resetForm if available, but manual is fine for mock)
    document.getElementById('createOrderSheet-content').querySelector('form').reset();
    document.getElementById('calc-subtotal').textContent = '$0.00';
    document.getElementById('calc-grandtotal').textContent = '$0.00';
    closeSheet('fabActionSheet'); 
    openSheet('createOrderSheet');
}

// Live Calculations listener setup (needs to be called after renderSheets)
function bindWizardCalculations() {
    const qtyInput = document.getElementById('create-qty');
    const priceInput = document.getElementById('create-price');
    const taxInput = document.getElementById('create-tax');
    
    const updateCalculations = () => {
        const qty = parseFloat(qtyInput.value) || 0;
        const price = parseFloat(priceInput.value) || 0;
        const tax = parseFloat(taxInput.value) || 0;
        
        const subtotal = qty * price;
        const grandTotal = subtotal + tax;
        
        document.getElementById('calc-subtotal').textContent = `$${subtotal.toFixed(2)}`;
        document.getElementById('calc-grandtotal').textContent = `$${grandTotal.toFixed(2)}`;
    };

    if (qtyInput) qtyInput.addEventListener('input', updateCalculations);
    if (priceInput) priceInput.addEventListener('input', updateCalculations);
    if (taxInput) taxInput.addEventListener('input', updateCalculations);
}

window.handleOrderAction = function(action) {
    window.showToast?.(`Action: ${action}`, 'info');
    // Implementation for PDF, Invoice generation would go here
};

async function renderSheets() {
    const sheetsContainer = document.getElementById('sheets-container');
    if (!sheetsContainer) return;

    // Fetch dynamic data for dropdowns
    const [customers, costings] = await Promise.all([
        api.getCustomers(),
        api.getCostings()
    ]);

    const customerOptions = [{label: 'Select Customer', value: ''}, ...customers.map(c => ({label: c.name, value: c.id}))];
    const costingOptions = [{label: 'None (Manual Entry)', value: ''}, ...costings.map(c => ({label: `${c.styleRef} ($${c.retailPrice}/pc)`, value: c.id}))];

    // Create Order Content - Guided Wizard
    const createOrderContent = `
        <!-- Wizard Progress Tracker -->
        <div class="flex items-center justify-between mb-6 relative">
            <div class="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-surface-variant z-0 rounded-full"></div>
            <div id="wizard-progress-bar" class="absolute left-0 top-1/2 -translate-y-1/2 w-1/4 h-1 bg-primary z-0 rounded-full transition-all duration-300"></div>
            
            <div class="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center z-10 font-bold text-[13px] shadow-sm transition-colors" id="wizard-dot-1">1</div>
            <div class="w-8 h-8 rounded-full bg-surface-container-highest text-secondary flex items-center justify-center z-10 font-bold text-[13px] transition-colors" id="wizard-dot-2">2</div>
            <div class="w-8 h-8 rounded-full bg-surface-container-highest text-secondary flex items-center justify-center z-10 font-bold text-[13px] transition-colors" id="wizard-dot-3">3</div>
            <div class="w-8 h-8 rounded-full bg-surface-container-highest text-secondary flex items-center justify-center z-10 font-bold text-[13px] transition-colors" id="wizard-dot-4">4</div>
        </div>

        <!-- Step 1: Customer & Quote -->
        <div id="order-step-1" class="wizard-step">
            <h3 class="text-[18px] font-bold text-on-surface mb-4">Customer & Product</h3>
            ${SelectInput({ label: 'Link Saved Quote', id: 'create-quote', options: costingOptions, helpText: 'Optional: Inherit pricing from a quotation' })}
            ${SelectInput({ label: 'Customer', id: 'create-customer', options: customerOptions, required: true })}
            ${TextInput({ label: 'Product Name', id: 'create-product', placeholder: 'e.g. Organic Cotton Tees', required: true })}
        </div>

        <!-- Step 2: Variants & Specs -->
        <div id="order-step-2" class="wizard-step hidden">
            <h3 class="text-[18px] font-bold text-on-surface mb-4">Variants & Quantity</h3>
            <div class="grid grid-cols-2 gap-4">
                ${TextInput({ label: 'Sizes', id: 'create-sizes', placeholder: 'S, M, L', helpText: 'Comma separated' })}
                ${TextInput({ label: 'Colours', id: 'create-colours', placeholder: 'Navy, White', helpText: 'Comma separated' })}
            </div>
            ${TextInput({ label: 'Total Quantity', id: 'create-qty', type: 'number', placeholder: '1000', required: true })}
        </div>
        
        <!-- Step 3: Finance & Logistics -->
        <div id="order-step-3" class="wizard-step hidden">
            <h3 class="text-[18px] font-bold text-on-surface mb-4">Finance & Delivery</h3>
            <div class="grid grid-cols-2 gap-4">
                ${TextInput({ label: 'Unit Price ($)', id: 'create-price', type: 'number', placeholder: '0.00', required: true })}
                ${TextInput({ label: 'Tax Amount ($)', id: 'create-tax', type: 'number', placeholder: '0.00' })}
            </div>
            
            <!-- Live Calc Display -->
            <div class="bg-surface-variant/30 p-3 rounded-xl mb-4 border border-outline-variant/50">
                <div class="flex justify-between text-[13px] mb-1">
                    <span class="text-secondary">Subtotal</span>
                    <span class="font-medium" id="calc-subtotal">$0.00</span>
                </div>
                <div class="flex justify-between text-[14px] font-bold">
                    <span class="text-on-surface">Grand Total</span>
                    <span class="text-primary" id="calc-grandtotal">$0.00</span>
                </div>
            </div>

            ${TextInput({ label: 'Delivery Date', id: 'create-date', type: 'date', required: true })}
        </div>
        
        <!-- Step 4: Routing & Notes -->
        <div id="order-step-4" class="wizard-step hidden">
            <h3 class="text-[18px] font-bold text-on-surface mb-4">Routing & Setup</h3>
            <div class="grid grid-cols-2 gap-4">
                ${SelectInput({ label: 'Status', id: 'create-status', options: Object.values(api.ORDER_STATUSES || {}).map(s => ({label: s, value: s})) })}
                ${SelectInput({ label: 'Priority', id: 'create-priority', options: [
                    {label: 'Normal', value: 'Normal'}, {label: 'High', value: 'High'}, {label: 'Urgent', value: 'Urgent'}
                ] })}
            </div>
            ${TextareaInput({ label: 'Notes & Instructions', id: 'create-notes', placeholder: 'Special requirements for production...', rows: 3 })}
        </div>
        <div class="h-10"></div>
    `;
    
    const createOrderFooter = `
        <button id="wizard-prev-btn" type="button" onclick="window.goToOrderStep(-1)" class="hidden flex-1 bg-surface-container-high text-on-surface font-bold text-[16px] py-4 rounded-2xl active-scale transition-apple">
            Back
        </button>
        <button id="wizard-next-btn" type="button" onclick="window.goToOrderStep(1)" class="flex-1 bg-primary text-on-primary font-bold text-[16px] py-4 rounded-2xl active-scale transition-apple shadow-sm">
            Next Step
        </button>
        <button id="create-order-submit" type="button" class="hidden flex-1 bg-[#008A00] text-white font-bold text-[16px] py-4 rounded-2xl active-scale transition-apple shadow-sm">
            Save Order
        </button>
    `;

    // Order Details Content
    const orderDetailsHeader = `
    <div class="px-lg pb-md flex justify-between items-start border-b border-outline-variant/30">
        <div>
            <span id="od-id" class="text-[13px] font-bold text-primary mb-1 block"></span>
            <h2 id="od-customer" class="text-[22px] font-bold text-on-surface leading-tight"></h2>
            <span id="od-status" class="inline-block mt-2 px-3 py-1 rounded-full text-[12px] font-medium bg-surface-variant text-secondary"></span>
        </div>
        <div class="flex gap-2">
            <button onclick="window.duplicateOrder()" class="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center text-on-surface active-scale transition-apple" title="Duplicate">
                <span class="material-symbols-outlined text-[18px]">content_copy</span>
            </button>
            <button onclick="window.archiveOrder()" class="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center text-on-surface active-scale transition-apple" title="Archive">
                <span class="material-symbols-outlined text-[18px]">archive</span>
            </button>
            <button onclick="window.showConfirmation({title: 'Delete Order?', message: 'Are you sure you want to delete this order? This action cannot be undone.', confirmText: 'Delete', onConfirm: window.deleteOrder})" class="w-8 h-8 rounded-full bg-error-container/30 flex items-center justify-center text-error active-scale transition-apple" title="Delete">
                <span class="material-symbols-outlined text-[18px]">delete</span>
            </button>
            <button onclick="closeSheet('orderDetailsSheet')" class="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center text-secondary active-scale transition-apple">
                <span class="material-symbols-outlined text-[20px]">close</span>
            </button>
        </div>
    </div>`;
    const orderDetailsContent = `
        <!-- Financial Overview Dashboard -->
        <div class="bg-surface-container-lowest rounded-[24px] border border-outline-variant shadow-sm p-lg mb-6">
            <h3 class="text-[14px] font-semibold text-secondary uppercase tracking-wider mb-4">Financial Overview</h3>
            <div class="grid grid-cols-2 gap-4 mb-4">
                <div class="flex flex-col">
                    <span class="text-[12px] font-medium text-secondary mb-1">Estimated Cost (Quote)</span>
                    <span id="od-quoted" class="text-[18px] font-bold text-on-surface"></span>
                </div>
                <div class="flex flex-col">
                    <span class="text-[12px] font-medium text-secondary mb-1">Actual Incurred Cost</span>
                    <span id="od-incurred" class="text-[18px] font-bold text-error"></span>
                </div>
            </div>
            
            <div>
                <div class="flex justify-between text-[12px] font-medium mb-1">
                    <span class="text-secondary">Current Profit</span>
                    <span id="od-profit-val" class="font-bold text-on-surface"></span>
                </div>
                <div class="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                    <div id="od-profit-bar" class="h-full rounded-full transition-all duration-500" style="width: 0%"></div>
                </div>
            </div>
        </div>

        <!-- Production Pipeline Stepper -->
        <div class="bg-surface-container-lowest rounded-[24px] border border-outline-variant shadow-sm p-lg mb-6">
            <h3 class="text-[14px] font-semibold text-secondary uppercase tracking-wider mb-4">Production Status</h3>
            <div class="flex items-center justify-between mb-2">
                <span class="text-[14px] font-medium text-on-surface" id="od-progress-label"></span>
                <span class="text-[14px] font-bold text-primary" id="od-progress-pct"></span>
            </div>
            <div class="w-full h-2 bg-surface-variant rounded-full overflow-hidden mb-4">
                <div id="od-progress-bar" class="h-full bg-primary rounded-full transition-all duration-500" style="width: 0%"></div>
            </div>
            
            <div class="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                <button onclick="handleStatusTransition('Approved')" class="shrink-0 px-3 py-1.5 rounded-lg border border-outline-variant text-[12px] font-medium text-secondary active-bg">Approve</button>
                <button onclick="handleStatusTransition('Material Reserved')" class="shrink-0 px-3 py-1.5 rounded-lg border border-outline-variant text-[12px] font-medium text-secondary active-bg">Reserve Mat.</button>
                <button onclick="handleStatusTransition('Cutting')" class="shrink-0 px-3 py-1.5 rounded-lg border border-outline-variant text-[12px] font-medium text-secondary active-bg">Cutting</button>
                <button onclick="handleStatusTransition('Stitching')" class="shrink-0 px-3 py-1.5 rounded-lg border border-outline-variant text-[12px] font-medium text-secondary active-bg">Stitching</button>
                <button onclick="handleStatusTransition('Quality Check')" class="shrink-0 px-3 py-1.5 rounded-lg border border-outline-variant text-[12px] font-medium text-secondary active-bg">QC</button>
                <button onclick="handleStatusTransition('Dispatched')" class="shrink-0 px-3 py-1.5 rounded-lg border border-outline-variant text-[12px] font-medium text-secondary active-bg">Dispatch</button>
            </div>
        </div>

        <!-- Order Info -->
        <div class="bg-surface-container-lowest rounded-[24px] border border-outline-variant shadow-sm p-lg mb-6">
            <h3 class="text-[14px] font-semibold text-secondary uppercase tracking-wider mb-4">Order Details</h3>
            <div class="grid grid-cols-2 gap-y-4">
                <div>
                    <p class="text-[11px] text-secondary">Product</p>
                    <p id="od-product" class="text-[14px] font-medium text-on-surface"></p>
                </div>
                <div>
                    <p class="text-[11px] text-secondary">Quantity</p>
                    <p id="od-qty" class="text-[14px] font-medium text-on-surface"></p>
                </div>
                <div>
                    <p class="text-[11px] text-secondary">Sizes</p>
                    <p id="od-sizes" class="text-[14px] font-medium text-on-surface"></p>
                </div>
                <div>
                    <p class="text-[11px] text-secondary">Colours</p>
                    <p id="od-colours" class="text-[14px] font-medium text-on-surface"></p>
                </div>
                <div>
                    <p class="text-[11px] text-secondary">Delivery Date</p>
                    <p id="od-delivery" class="text-[14px] font-medium text-on-surface"></p>
                </div>
            </div>
            <div class="mt-4">
                <p class="text-[11px] text-secondary">Notes</p>
                <p id="od-notes" class="text-[13px] text-on-surface mt-1"></p>
            </div>
        </div>

        <!-- Action Grid -->
        <div class="bg-surface-container-lowest rounded-[24px] border border-outline-variant shadow-sm p-lg">
            <h3 class="text-[14px] font-semibold text-secondary uppercase tracking-wider mb-4">Quick Actions</h3>
            <div class="grid grid-cols-3 gap-3">
                <button onclick="handleOrderAction('Print Quote')" class="flex flex-col items-center justify-center p-3 rounded-xl bg-surface-variant active-scale transition-apple">
                    <span class="material-symbols-outlined text-secondary mb-1">picture_as_pdf</span>
                    <span class="text-[11px] font-medium text-on-surface">Print Quote</span>
                </button>
                <button onclick="handleOrderAction('Generate Invoice')" class="flex flex-col items-center justify-center p-3 rounded-xl bg-surface-variant active-scale transition-apple">
                    <span class="material-symbols-outlined text-secondary mb-1">receipt_long</span>
                    <span class="text-[11px] font-medium text-on-surface">Invoice</span>
                </button>
                <button onclick="handleOrderAction('Generate PO')" class="flex flex-col items-center justify-center p-3 rounded-xl bg-surface-variant active-scale transition-apple">
                    <span class="material-symbols-outlined text-secondary mb-1">shopping_cart_checkout</span>
                    <span class="text-[11px] font-medium text-on-surface">Purch. Order</span>
                </button>
                <button onclick="handleOrderAction('Assign Production')" class="flex flex-col items-center justify-center p-3 rounded-xl bg-primary/10 active-scale transition-apple text-primary">
                    <span class="material-symbols-outlined mb-1">precision_manufacturing</span>
                    <span class="text-[11px] font-medium">Assign Prod.</span>
                </button>
                <button onclick="handleOrderAction('View Timeline')" class="flex flex-col items-center justify-center p-3 rounded-xl bg-surface-variant active-scale transition-apple">
                    <span class="material-symbols-outlined text-secondary mb-1">history</span>
                    <span class="text-[11px] font-medium text-on-surface">Timeline</span>
                </button>
                <button onclick="handleOrderAction('View Dispatch')" class="flex flex-col items-center justify-center p-3 rounded-xl bg-surface-variant active-scale transition-apple">
                    <span class="material-symbols-outlined text-secondary mb-1">local_shipping</span>
                    <span class="text-[11px] font-medium text-on-surface">Dispatch</span>
                </button>
            </div>
        </div>
        <div class="h-10"></div>
    `;
    const orderDetailsFooter = `
        <button onclick="closeSheet('orderDetailsSheet')" class="flex-1 bg-surface-container-high text-on-surface font-bold text-[15px] py-3.5 rounded-2xl active-scale transition-apple">
            Close
        </button>
    `;

    // FAB Action Sheet Content
    const fabActionContent = `
        <div class="flex flex-col gap-2">
            <button onclick="closeSheet('fabActionSheet'); openSheet('createOrderSheet');" class="flex items-center gap-4 p-4 rounded-xl bg-surface-container-lowest border border-outline-variant active-bg transition-colors text-left w-full">
                <div class="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <span class="material-symbols-outlined">add</span>
                </div>
                <div>
                    <h4 class="text-[16px] font-semibold text-on-surface mb-0.5">New Order</h4>
                    <p class="text-[13px] text-secondary">Start a new guided order wizard</p>
                </div>
            </button>
            <button onclick="window.showToast?.('Duplicate workflow coming soon', 'info'); closeSheet('fabActionSheet');" class="flex items-center gap-4 p-4 rounded-xl bg-surface-container-lowest border border-outline-variant active-bg transition-colors text-left w-full">
                <div class="w-10 h-10 rounded-full bg-surface-variant text-on-surface-variant flex items-center justify-center">
                    <span class="material-symbols-outlined">content_copy</span>
                </div>
                <div>
                    <h4 class="text-[16px] font-semibold text-on-surface mb-0.5">Duplicate Existing</h4>
                    <p class="text-[13px] text-secondary">Clone a previous order</p>
                </div>
            </button>
            <button onclick="window.showToast?.('Import workflow coming soon', 'info'); closeSheet('fabActionSheet');" class="flex items-center gap-4 p-4 rounded-xl bg-surface-container-lowest border border-outline-variant active-bg transition-colors text-left w-full">
                <div class="w-10 h-10 rounded-full bg-surface-variant text-on-surface-variant flex items-center justify-center">
                    <span class="material-symbols-outlined">upload_file</span>
                </div>
                <div>
                    <h4 class="text-[16px] font-semibold text-on-surface mb-0.5">Import Orders</h4>
                    <p class="text-[13px] text-secondary">Upload CSV or Excel</p>
                </div>
            </button>
            <button onclick="window.showToast?.('Sample workflow coming soon', 'info'); closeSheet('fabActionSheet');" class="flex items-center gap-4 p-4 rounded-xl bg-surface-container-lowest border border-outline-variant active-bg transition-colors text-left w-full">
                <div class="w-10 h-10 rounded-full bg-surface-variant text-on-surface-variant flex items-center justify-center">
                    <span class="material-symbols-outlined">science</span>
                </div>
                <div>
                    <h4 class="text-[16px] font-semibold text-on-surface mb-0.5">Sample Order</h4>
                    <p class="text-[13px] text-secondary">Create a rapid R&D sample</p>
                </div>
            </button>
        </div>
        <div class="h-4"></div>
    `;

    // Render Sheets
    sheetsContainer.innerHTML = [
        BottomSheet({ id: 'fabActionSheet', title: 'Order Actions', content: fabActionContent, height: 'auto' }),
        BottomSheet({ id: 'createOrderSheet', title: 'Create Order', content: createOrderContent, footerContent: createOrderFooter, isForm: true }),
        BottomSheet({ id: 'orderDetailsSheet', customHeader: orderDetailsHeader, content: orderDetailsContent, footerContent: orderDetailsFooter, height: '90vh' })
    ].join('');
    
    // Bind form validation for the create order sheet
    if (window.bindFormValidation) {
        window.bindFormValidation('createOrderSheet', 'create-order-submit');
    }
    
    // Bind live wizard calculations
    bindWizardCalculations();

    // Bind Auto-Fill for Quote Linking
    const quoteSelect = document.getElementById('create-quote');
    if (quoteSelect) {
        quoteSelect.addEventListener('change', async (e) => {
            const quoteId = e.target.value;
            if (!quoteId) return;
            const quote = await api.getCostingById(quoteId);
            if (quote) {
                document.getElementById('create-product').value = quote.styleRef || '';
                // Auto calculate value based on expected retail price
                const qtyInput = document.getElementById('create-qty');
                if (qtyInput && qtyInput.value) {
                    document.getElementById('create-price').value = (quote.retailPrice * parseInt(qtyInput.value)).toFixed(2);
                }
                
                // If the user types quantity AFTER selecting quote
                qtyInput.addEventListener('input', (ev) => {
                    const q = parseInt(ev.target.value);
                    if (!isNaN(q)) {
                        document.getElementById('create-price').value = (quote.retailPrice * q).toFixed(2);
                    }
                });
            }
        });
    }

    // Bind validation for Create
    bindFormValidation('createOrderSheet-content', 'create-order-submit');
    document.getElementById('create-order-submit')?.addEventListener('click', async () => {
        const payload = {
            costingId: document.getElementById('create-quote').value,
            customerId: document.getElementById('create-customer').value,
            customerName: document.getElementById('create-customer').options[document.getElementById('create-customer').selectedIndex].text,
            product: document.getElementById('create-product').value,
            sizes: document.getElementById('create-sizes').value.split(',').map(s => s.trim()).filter(Boolean),
            colours: document.getElementById('create-colours').value.split(',').map(s => s.trim()).filter(Boolean),
            qty: parseInt(document.getElementById('create-qty').value) || 0,
            value: parseFloat(document.getElementById('create-price').value) || 0,
            status: document.getElementById('create-status').value,
            priority: document.getElementById('create-priority').value,
            deliveryDate: document.getElementById('create-date').value,
            notes: document.getElementById('create-notes').value,
            progressPercentage: 0,
            progressLabel: 'Initiated',
            progressColor: 'bg-primary'
        };

        window.closeSheet('createOrderSheet');
        if (window.setLoading) window.setLoading('orders-list');
        try {
            await api.saveOrder(payload);
            window.showToast?.('Order created successfully', 'success');
            await loadOrders();
        } catch (err) {
            console.error(err);
            window.showToast?.('Failed to create order', 'error');
        }
    });
}
