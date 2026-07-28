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
    pBar.style.width = Math.max(0, Math.min(100, profitPct)) + '%';
    pBar.className = `h-full rounded-full transition-all duration-500 ${profitPct >= 20 ? 'bg-[#008A00]' : profitPct >= 0 ? 'bg-primary' : 'bg-error'}`;

    window.openSheet('orderDetailsSheet');
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

    // Create Order Content
    const createOrderContent = `
        ${SelectInput({ label: 'Link Saved Quote', id: 'create-quote', options: costingOptions })}
        ${SelectInput({ label: 'Customer', id: 'create-customer', options: customerOptions, required: true })}
        ${TextInput({ label: 'Product Name', id: 'create-product', placeholder: 'e.g. Organic Cotton Tees', required: true })}
        
        <div class="grid grid-cols-2 gap-4">
            ${TextInput({ label: 'Sizes', id: 'create-sizes', placeholder: 'S, M, L', helpText: 'Comma separated' })}
            ${TextInput({ label: 'Colours', id: 'create-colours', placeholder: 'Navy, White', helpText: 'Comma separated' })}
        </div>
        
        <div class="grid grid-cols-2 gap-4">
            ${TextInput({ label: 'Total Quantity', id: 'create-qty', type: 'number', placeholder: '1000', required: true })}
            ${TextInput({ label: 'Total Value ($)', id: 'create-price', type: 'number', placeholder: '0.00', required: true })}
        </div>
        
        <div class="grid grid-cols-2 gap-4">
            ${SelectInput({ label: 'Status', id: 'create-status', options: [
                {label: 'Draft', value: 'Draft'}, {label: 'Approved', value: 'Approved'}, 
                {label: 'Production', value: 'Production'}, {label: 'QC', value: 'QC'}, 
                {label: 'Dispatch', value: 'Dispatch'}, {label: 'Delivered', value: 'Delivered'},
                {label: 'Cancelled', value: 'Cancelled'}
            ] })}
            ${SelectInput({ label: 'Priority', id: 'create-priority', options: [
                {label: 'Normal', value: 'Normal'}, {label: 'High', value: 'High'}, {label: 'Urgent', value: 'Urgent'}
            ] })}
        </div>
        
        ${TextInput({ label: 'Delivery Date', id: 'create-date', type: 'date', required: true })}
        ${TextareaInput({ label: 'Notes', id: 'create-notes', placeholder: 'Any special instructions...', rows: 2 })}
        <div class="h-10"></div>
    `;
    const createOrderFooter = `
        <button id="create-order-submit" class="w-full bg-primary text-on-primary font-bold text-[16px] py-4 rounded-2xl active-scale transition-apple shadow-sm">
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

    // Render Sheets
    sheetsContainer.innerHTML = [
        BottomSheet({ id: 'createOrderSheet', title: 'Create Order', content: createOrderContent, footerContent: createOrderFooter, isForm: true }),
        BottomSheet({ id: 'orderDetailsSheet', customHeader: orderDetailsHeader, content: orderDetailsContent, footerContent: orderDetailsFooter, height: '90vh' })
    ].join('');

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
