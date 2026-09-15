import { api } from '../services/api.js?v=5.2';
import { SelectInput, TextInput, TextareaInput } from '../components/inputs.js?v=5.2';
import { BottomSheet } from '../components/index.js?v=5.2';
import { calculateOrderRollup, STAGE_DEFINITIONS, normalizeStageKey, getProductWorkflowStages, WORKFLOW_ROUTES } from '../production/domain/workflowEngine.js?v=5.5';

export async function getOrderSheetsHTML() {
    let customers = [];
    let costings = [];
    try {
        const [custRes, costRes] = await Promise.all([
            api.getCustomers().catch(e => { console.error(e); return []; }),
            api.getCostings().catch(e => { console.error(e); return []; })
        ]);
        customers = custRes || [];
        costings = costRes || [];
    } catch (e) {
        console.error("Failed to fetch data for order sheets:", e);
    }

    const customerOptions = [
        {label: 'Select Customer', value: ''},
        {label: '+ Create New Customer', value: 'NEW_CUSTOMER'},
        ...customers.map(c => ({label: c.name, value: c.id}))
    ];
    const costingOptions = [{label: 'None (Manual Entry)', value: ''}, ...costings.map(c => ({label: c.styleRef, value: c.id}))];
    const statusOptions = Object.values(api.ORDER_STATUSES || {}).map(s => ({label: s, value: s}));

    const fabActionContent = `<div class="flex flex-col gap-2">
        <button onclick="window.closeSheet('fabActionSheet'); window.openCreateWizard();" class="flex items-center gap-4 p-4 rounded-xl bg-surface-container-lowest border border-outline-variant active-bg transition-colors text-left w-full">
            <div class="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center"><span class="material-symbols-outlined">add</span></div>
            <div><h4 class="text-[16px] font-semibold text-on-surface mb-0.5">New Order</h4><p class="text-[13px] text-secondary">Start a new guided order wizard</p></div>
        </button></div><div class="h-8"></div>`;

    const createOrderContent = `<form id="create-order-form">
        <div class="w-full bg-surface-variant h-1 rounded-full mb-6 relative overflow-hidden"><div id="wizard-progress-bar" class="absolute top-0 left-0 h-full bg-primary transition-all duration-300" style="width: 0%"></div></div>
        
        <div id="order-step-1" class="wizard-step">
            <h3 class="text-[18px] font-bold text-on-surface mb-4">Customer Details</h3>
            <div class="flex flex-col gap-4">
                ${SelectInput({ label: 'Select Customer *', id: 'create-customer-select', options: customerOptions })}
                ${SelectInput({ label: 'From Quotation', id: 'create-quote', options: costingOptions })}
            </div>
        </div>

        <div id="order-step-2" class="wizard-step hidden">
            <h3 class="text-[18px] font-bold text-on-surface mb-4">Product Specs</h3>
            <div class="flex flex-col gap-4">
                ${TextInput({ label: 'Product Name *', id: 'create-product', placeholder: 'e.g. Cotton T-Shirt' })}
                ${TextInput({ label: 'Fabric / Material', id: 'create-fabric', placeholder: 'e.g. 100% Cotton, 180 GSM' })}
                <div class="grid grid-cols-2 gap-4">
                    ${TextInput({ label: 'Sizes', id: 'create-sizes', placeholder: 'S, M, L, XL' })}
                    ${TextInput({ label: 'Colors', id: 'create-colors', placeholder: 'Red, Blue' })}
                </div>
                ${TextInput({ label: 'Total Quantity *', id: 'create-qty', type: 'number', placeholder: '0' })}
            </div>
        </div>

        <div id="order-step-3" class="wizard-step hidden">
            <h3 class="text-[18px] font-bold text-on-surface mb-4">Pricing</h3>
            <div class="flex flex-col gap-4">
                ${TextInput({ label: 'Unit Price (₹) *', id: 'create-price', type: 'number', placeholder: '0.00' })}
                <div class="bg-surface-variant/30 p-4 rounded-xl border border-outline-variant/50 flex justify-between items-center mt-2">
                    <span class="text-[14px] text-secondary font-medium">Grand Total</span>
                    <span id="calc-grandtotal" class="text-[20px] font-bold text-on-surface">₹0.00</span>
                </div>
            </div>
        </div>

        <div id="order-step-4" class="wizard-step hidden">
            <h3 class="text-[18px] font-bold text-on-surface mb-4">Routing & Setup</h3>
            <div class="grid grid-cols-2 gap-4 mb-4">
                ${SelectInput({ label: 'Initial Status', id: 'create-status', options: statusOptions })}
                ${SelectInput({ label: 'Priority', id: 'create-priority', options: [{label:'Normal', value:'Normal'},{label:'High', value:'High'},{label:'Urgent', value:'Urgent'}] })}
            </div>
            <div class="mb-4">
                ${SelectInput({ 
                    label: 'Workflow Route Preset', 
                    id: 'create-workflow', 
                    options: [
                        {label: 'Standard Knits (Fabric → Cut → Stitch → Print → Pack)', value: 'default'},
                        {label: 'Print Panels First (Cut → Print → Stitch → Pack)', value: 'print_before_stitch'},
                        {label: 'Garment Wash (Cut → Stitch → Wash → Pack)', value: 'wash_before_stitch'},
                        {label: 'Stitch First, Embroidery Later', value: 'stitch_before_embroidery'},
                        {label: 'Direct Fulfillment / Trading (Procure → Dispatch)', value: 'direct_fulfillment'}
                    ] 
                })}
            </div>
            ${TextInput({ label: 'Delivery Deadline', id: 'create-delivery', type: 'date' })}
        </div>
    </form><div class="h-10"></div>`;

    const createOrderFooter = `<button id="wizard-prev-btn" type="button" onclick="window.goToOrderStep(-1)" class="hidden flex-1 bg-surface-container-high text-on-surface font-bold text-[16px] py-4 rounded-2xl active-scale transition-apple">Back</button>
        <button id="wizard-next-btn" type="button" onclick="window.goToOrderStep(1)" class="flex-1 bg-primary text-on-primary font-bold text-[16px] py-4 rounded-2xl active-scale transition-apple shadow-sm">Next Step</button>
        <button id="create-order-submit" type="button" onclick="window.submitNewOrder()" class="hidden flex-1 bg-[#008A00] text-white font-bold text-[16px] py-4 rounded-2xl active-scale transition-apple shadow-sm">Save Order</button>`;

    const editOrderContent = `<div class="flex flex-col gap-4">
        ${TextInput({ label: 'Product Name', id: 'edit-product' })}
        ${TextInput({ label: 'Total Quantity', id: 'edit-qty', type: 'number' })}
        ${TextInput({ label: 'Unit Price (₹)', id: 'edit-price', type: 'number' })}
        ${SelectInput({ label: 'Priority', id: 'edit-priority', options: [{label:'Normal', value:'Normal'},{label:'High', value:'High'},{label:'Urgent', value:'Urgent'}] })}
        ${TextInput({ label: 'Delivery Date', id: 'edit-delivery', type: 'date' })}
    </div><div class="h-10"></div>`;

    const editOrderFooter = `<button id="edit-order-submit" type="button" onclick="window.submitEditOrder()" class="w-full bg-primary text-on-primary font-bold text-[16px] py-4 rounded-2xl active-scale transition-apple shadow-sm">Save Changes</button>`;

    const filterOrderContent = `<div class="flex flex-col gap-4">
        ${SelectInput({ label: 'Status', id: 'filter-status', options: [{label: 'All', value: ''}, ...statusOptions] })}
        ${SelectInput({ label: 'Priority', id: 'filter-priority', options: [{label:'All', value:''},{label:'Normal', value:'Normal'},{label:'High', value:'High'},{label:'Urgent', value:'Urgent'}] })}
    </div><div class="h-10"></div>`;
    
    const filterOrderFooter = `<button onclick="window.applyFilters()" class="w-full bg-primary text-on-primary font-bold text-[16px] py-4 rounded-2xl active-scale transition-apple shadow-sm">Apply Filters</button>`;

    const logPaymentContent = `<div class="flex flex-col gap-4">
        ${TextInput({ label: 'Amount Received (₹)', id: 'log-payment-amount', type: 'number' })}
        ${SelectInput({ label: 'Payment Method', id: 'log-payment-method', options: [{label: 'UPI', value: 'UPI'}, {label: 'Cash', value: 'Cash'}, {label: 'Bank Transfer', value: 'Bank Transfer'}] })}
        ${TextInput({ label: 'Reference / Note (Optional)', id: 'log-payment-note' })}
    </div><div class="h-10"></div>`;

    const logPaymentFooter = `<button id="log-payment-submit" type="button" onclick="window.submitLogPayment()" class="w-full bg-[#008A00] text-white font-bold text-[16px] py-4 rounded-2xl active-scale transition-apple shadow-sm">Save Payment</button>`;

    return `
        <div id="fabActionSheetContainer">${BottomSheet({ id: 'fabActionSheet', title: 'Order Actions', content: fabActionContent, height: 'auto' })}</div>
        <div id="createOrderSheetContainer">${BottomSheet({ id: 'createOrderSheet', title: 'Create Order', content: createOrderContent, footerContent: createOrderFooter })}</div>
        <div id="editOrderSheetContainer">${BottomSheet({ id: 'editOrderSheet', title: 'Edit Order', content: editOrderContent, footerContent: editOrderFooter, height: 'auto' })}</div>
        <div id="filterOrderSheetContainer">${BottomSheet({ id: 'filterOrderSheet', title: 'Filter Orders', content: filterOrderContent, footerContent: filterOrderFooter, height: 'auto' })}</div>
        <div id="logPaymentSheetContainer">${BottomSheet({ id: 'logPaymentSheet', title: 'Log Payment', content: logPaymentContent, footerContent: logPaymentFooter, height: 'auto' })}</div>
        <div id="orderDetailsSheetContainer">${BottomSheet({ id: 'orderDetailsSheet', customHeader: '<div class="sheet-custom-header"></div>', content: '<div id="orderDetailsSheet-inner-content"></div>', height: '95vh' })}</div>
    `;
}

export function getOrderDetailsHeader(order) {
    if (!order) return '';

    const rollup = calculateOrderRollup(order);
    const progress = rollup.overallPercentage;

    // Delivery & Bottleneck Status
    const today = new Date();
    const deliveryDate = order.deliveryDate ? new Date(order.deliveryDate) : null;
    const daysLeft = deliveryDate ? Math.ceil((deliveryDate - today) / (1000 * 60 * 60 * 24)) : null;
    let countdownBadge = '';
    if (daysLeft !== null) {
        if (daysLeft < 0) countdownBadge = `<span class="text-[11px] font-bold px-2 py-0.5 rounded-full bg-error/10 text-error">${Math.abs(daysLeft)}d Overdue</span>`;
        else if (daysLeft <= 4) countdownBadge = `<span class="text-[11px] font-bold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600">${daysLeft}d Remaining</span>`;
        else countdownBadge = `<span class="text-[11px] font-semibold text-secondary">${daysLeft}d Left</span>`;
    }

    const bottleneckAlert = rollup.isBottleneck ? `
        <div class="mt-2.5 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-700 text-[12px] font-medium">
            <span class="material-symbols-outlined text-[16px] text-orange-600">warning</span>
            <span>Delivery Risk: Production bottleneck currently at <strong>${rollup.activeStageDef.label}</strong></span>
        </div>
    ` : '';

    const primaryProd = (Array.isArray(order.products) && order.products.length > 0) ? order.products[0] : null;
    const headerTitle = primaryProd?.name
        ? `${primaryProd.name}${order.products.length > 1 ? ` (+${order.products.length - 1} more)` : ''}`
        : (order.product || 'Custom Apparel');

    return `
        <div class="px-4 py-3 border-b border-outline-variant bg-surface-container-lowest sticky top-0 z-20">
            <div class="flex items-center justify-between mb-2">
                <div class="flex flex-col min-w-0 pr-2">
                    <div class="flex items-center gap-2">
                        <span class="text-[12px] font-mono font-bold text-primary uppercase tracking-wider">${order.id}</span>
                        ${countdownBadge}
                    </div>
                    <h2 class="text-[18px] font-bold text-on-surface line-clamp-1 mt-0.5">${headerTitle}</h2>
                </div>
                <div class="flex gap-2 shrink-0">
                    <button onclick="window.openEditOrder()" class="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center text-secondary active-scale transition-apple"><span class="material-symbols-outlined text-[18px]">edit</span></button>
                    <button onclick="window.showConfirmation({title: 'Delete Order?', message: 'Are you sure you want to delete this order?', confirmText: 'Delete', type: 'danger', onConfirm: window.deleteOrder})" class="w-8 h-8 rounded-full bg-error-container/30 flex items-center justify-center text-error active-scale transition-apple"><span class="material-symbols-outlined text-[18px]">delete</span></button>
                    <button onclick="window.closeSheet('orderDetailsSheet')" class="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center text-secondary active-scale transition-apple"><span class="material-symbols-outlined text-[20px]">close</span></button>
                </div>
            </div>

            <!-- Weighted Production Progress Bar -->
            <div class="mt-3">
                <div class="flex justify-between items-center text-[12px] mb-1">
                    <span class="text-secondary font-medium">Weighted Factory Progress</span>
                    <span class="font-bold text-primary">${progress}%</span>
                </div>
                <div class="w-full h-2 rounded-full bg-surface-variant overflow-hidden">
                    <div class="h-full bg-primary rounded-full transition-all duration-500" style="width: ${progress}%"></div>
                </div>
            </div>
            ${bottleneckAlert}

            <div class="flex gap-3 mt-3 border-b border-outline-variant/50 overflow-x-auto no-scrollbar">
                <button onclick="window.switchOrderTab('overview')" id="od-tab-btn-overview" class="od-tab-btn shrink-0 px-2 py-2 text-[13px] font-semibold text-primary border-b-2 border-primary transition-colors">1. Overview &amp; Margin</button>
                <button onclick="window.switchOrderTab('products')" id="od-tab-btn-products" class="od-tab-btn shrink-0 px-2 py-2 text-[13px] font-medium text-secondary border-b-2 border-transparent hover:text-on-surface transition-colors">2. Products &amp; Sizes</button>
                <button onclick="window.switchOrderTab('bom')" id="od-tab-btn-bom" class="od-tab-btn shrink-0 px-2 py-2 text-[13px] font-medium text-secondary border-b-2 border-transparent hover:text-on-surface transition-colors">3. Automated BOM</button>
                <button onclick="window.switchOrderTab('floor')" id="od-tab-btn-floor" class="od-tab-btn shrink-0 px-2 py-2 text-[13px] font-medium text-secondary border-b-2 border-transparent hover:text-on-surface transition-colors">4. Floor Stages</button>
                <button onclick="window.switchOrderTab('docs')" id="od-tab-btn-docs" class="od-tab-btn shrink-0 px-2 py-2 text-[13px] font-medium text-secondary border-b-2 border-transparent hover:text-on-surface transition-colors">5. Print Docs</button>
                <button onclick="window.switchOrderTab('timeline')" id="od-tab-btn-timeline" class="od-tab-btn shrink-0 px-2 py-2 text-[13px] font-medium text-secondary border-b-2 border-transparent hover:text-on-surface transition-colors">6. Audit Trail</button>
            </div>
        </div>
    `;
}

export function getOrderDetailsContent(order) {
    if (!order) return '';

    let customer = {};
    if (typeof api.getCustomerSync === 'function') {
        customer = api.getCustomerSync(order.customerId) || {};
    }
    const customerName    = customer.name || order.customerName || order.customerId;
    const customerCompany = customer.company || 'Direct Buyer / Brand';
    const customerGst     = customer.gstNumber || customer.taxId || '33AAAAA0000A1Z5';
    const customerAddress = customer.shippingAddress || customer.address || 'Standard Buyer Delivery Hub, Tirupur';
    const orderNotes      = order.notes || order.instructions || 'Standard export polybag packaging. 50 pcs per 7-ply export master carton.';

    const rollup = calculateOrderRollup(order);
    const orderValue = order.value || 0;
    const unitPrice = order.qty > 0 ? (orderValue / order.qty) : 0;
    const incurredCost = order.incurredCost || Math.round(orderValue * 0.68);
    const grossProfit = orderValue - incurredCost;
    const marginPct = orderValue > 0 ? Math.round((grossProfit / orderValue) * 100) : 0;

    let marginColor = 'bg-[#008A00]/10 text-[#008A00] border-[#008A00]/20';
    if (marginPct < 18) marginColor = 'bg-error/10 text-error border-error/20';
    else if (marginPct < 26) marginColor = 'bg-[#FF9500]/10 text-[#FF9500] border-[#FF9500]/20';

    const paymentReceived = order.paymentReceived || 0;
    const paymentPending = Math.max(orderValue - paymentReceived, 0);
    const paymentPct = orderValue ? Math.min((paymentReceived / orderValue) * 100, 100) : 0;

    return `
        <!-- TAB 1: COMMERCIAL OVERVIEW & MARGIN LEDGER -->
        <div id="od-tab-overview" class="od-tab-content block p-4">
            <!-- HERO ACTION: Open in Production Floor Hub -->
            <div onclick="window.location.href='production.html?orderId=${order.id}&stage=${rollup.activeStageKey}'"
                class="bg-gradient-to-r from-primary to-blue-700 text-white rounded-2xl p-4 mb-4 shadow-sm flex items-center justify-between cursor-pointer active-scale transition-all">
                <div class="flex items-center gap-3">
                    <div class="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                        <span class="material-symbols-outlined text-[24px]">precision_manufacturing</span>
                    </div>
                    <div>
                        <p class="text-[11px] font-bold uppercase tracking-wider text-white/80">Active Factory Floor Stage</p>
                        <h4 class="text-[16px] font-bold leading-tight mt-0.5">${rollup.activeStageDef.label}</h4>
                        <p class="text-[12px] text-white/90 mt-0.5">${rollup.overallPercentage}% Weighted Progress • ${rollup.totalOrderQty} pcs</p>
                    </div>
                </div>
                <div class="bg-white text-primary px-3.5 py-2 rounded-xl text-[13px] font-bold flex items-center gap-1 shrink-0 shadow-sm">
                    <span>Open Floor</span>
                    <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
                </div>
            </div>

            <!-- BUYER COMMERCIAL DOSSIER -->
            <div class="bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant mb-4 shadow-sm">
                <div class="flex justify-between items-center mb-3">
                    <h3 class="text-[13px] font-bold text-secondary uppercase tracking-wider">Buyer Commercial Dossier</h3>
                    <span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary">PO: ${order.customerPO || order.id}</span>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[13px] pb-3 border-b border-outline-variant/40">
                    <div>
                        <span class="text-secondary block text-[11px] font-semibold uppercase">Buyer / Customer</span>
                        <span class="font-bold text-on-surface text-[15px]">${customerName}</span>
                        <span class="text-secondary text-[12px] block">${customerCompany}</span>
                    </div>
                    <div>
                        <span class="text-secondary block text-[11px] font-semibold uppercase">GSTIN / Tax ID</span>
                        <span class="font-mono font-bold text-on-surface">${customerGst}</span>
                    </div>
                    <div>
                        <span class="text-secondary block text-[11px] font-semibold uppercase">Delivery Destination</span>
                        <span class="font-medium text-on-surface">${customerAddress}</span>
                    </div>
                    <div>
                        <span class="text-secondary block text-[11px] font-semibold uppercase">Target Delivery Date</span>
                        <span class="font-bold text-on-surface">${order.deliveryDate || 'Not specified'}</span>
                    </div>
                </div>
                <div class="pt-3 text-[12px]">
                    <span class="text-secondary block font-semibold uppercase text-[10px]">Packing & Handling Instructions</span>
                    <p class="text-on-surface mt-0.5">${orderNotes}</p>
                </div>
            </div>

            <!-- FINANCIAL MARGIN & COSTING LEDGER -->
            <div class="bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant shadow-sm mb-4">
                <div class="flex justify-between items-center mb-3">
                    <h3 class="text-[13px] font-bold text-secondary uppercase tracking-wider">Commercial Margin Ledger</h3>
                    <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${marginColor}">
                        ${marginPct}% Gross Margin
                    </span>
                </div>

                <div class="grid grid-cols-3 gap-2.5 mb-4 p-3 rounded-xl bg-surface-container/50 border border-outline-variant/40 text-center">
                    <div>
                        <p class="text-[10px] font-bold text-secondary uppercase">Quoted Revenue</p>
                        <p class="text-[16px] font-extrabold text-on-surface mt-0.5">&#8377;${orderValue.toLocaleString()}</p>
                        <span class="text-[10px] text-secondary">&#8377;${unitPrice.toFixed(0)}/pc</span>
                    </div>
                    <div>
                        <p class="text-[10px] font-bold text-secondary uppercase">Est. Floor Cost</p>
                        <p class="text-[16px] font-extrabold text-secondary mt-0.5">&#8377;${incurredCost.toLocaleString()}</p>
                        <span class="text-[10px] text-secondary">&#8377;${(incurredCost / (order.qty || 1)).toFixed(0)}/pc</span>
                    </div>
                    <div>
                        <p class="text-[10px] font-bold text-secondary uppercase">Est. Gross Profit</p>
                        <p class="text-[16px] font-extrabold ${grossProfit >= 0 ? 'text-[#008A00]' : 'text-error'} mt-0.5">&#8377;${grossProfit.toLocaleString()}</p>
                        <span class="text-[10px] font-bold ${grossProfit >= 0 ? 'text-[#008A00]' : 'text-error'}">${marginPct}%</span>
                    </div>
                </div>

                <!-- Payment Status Bar -->
                <div class="flex justify-between items-center text-[12px] mb-1.5">
                    <span class="text-secondary font-medium">Buyer Payment Status</span>
                    <span class="font-bold ${paymentPending === 0 ? 'text-[#008A00]' : 'text-orange-500'}">
                        ${paymentPending === 0 ? 'Fully Settled' : 'Payment Due'}
                    </span>
                </div>
                <div class="w-full bg-surface-variant h-2 rounded-full overflow-hidden mb-2">
                    <div class="h-full ${paymentPending === 0 ? 'bg-[#008A00]' : 'bg-primary'} transition-all" style="width: ${paymentPct}%"></div>
                </div>
                <div class="flex justify-between items-center text-[13px]">
                    <div><span class="text-secondary">Collected:</span> <strong class="text-on-surface">&#8377;${paymentReceived.toLocaleString()}</strong></div>
                    <div><span class="text-secondary">Balance Due:</span> <strong class="${paymentPending > 0 ? 'text-orange-600 font-bold' : 'text-secondary'}">&#8377;${paymentPending.toLocaleString()}</strong></div>
                </div>

                <div class="mt-4 pt-3 border-t border-outline-variant/40 flex gap-2">
                    <button onclick="window.logPayment()" class="flex-1 py-2.5 bg-surface-variant text-on-surface font-semibold text-[13px] rounded-xl active-scale transition-colors">
                        Log Payment
                    </button>
                    <button onclick="window.printProformaInvoice('${order.id}')" class="px-4 py-2.5 bg-primary/10 text-primary hover:bg-primary/20 font-bold text-[13px] rounded-xl active-scale transition-colors flex items-center gap-1">
                        <span class="material-symbols-outlined text-[16px]">receipt_long</span>
                        <span>Invoice</span>
                    </button>
                </div>
            </div>
        </div>

        <!-- TAB 2: PRODUCTS & MULTI-SIZE MATRIX BREAKDOWN -->
        <div id="od-tab-products" class="od-tab-content hidden p-4">
            ${renderProductsMatrixTab(order)}
        </div>

        <!-- TAB 3: AUTOMATED BILL OF MATERIALS (BOM) CALCULATOR -->
        <div id="od-tab-bom" class="od-tab-content hidden p-4">
            ${renderBOMCalculatorTab(order)}
        </div>

        <!-- TAB 4: PRODUCTION FLOOR WORKSPACES -->
        <div id="od-tab-floor" class="od-tab-content hidden p-4">
            ${renderProductionDataTab(order)}
        </div>

        <!-- TAB 5: PRINTABLE FACTORY DOCUMENTS & TRAVELERS -->
        <div id="od-tab-docs" class="od-tab-content hidden p-4">
            ${renderPrintDocsTab(order)}
        </div>

        <!-- TAB 6: AUDIT TIMELINE -->
        <div id="od-tab-timeline" class="od-tab-content hidden p-4">
            <div class="flex flex-col gap-4">
                ${(order.timeline || []).map(t => `
                    <div class="flex gap-4">
                        <div class="flex flex-col items-center">
                            <div class="w-3 h-3 rounded-full bg-primary"></div>
                            <div class="w-px h-full bg-outline-variant my-1"></div>
                        </div>
                        <div class="pb-4">
                            <p class="text-[14px] font-semibold text-on-surface">${t.status || t.title || 'Updated'}</p>
                            <p class="text-[12px] text-secondary">${new Date(t.timestamp || t.date).toLocaleString()} • ${t.user || 'System'}</p>
                            ${t.note ? `<p class="text-[12px] text-on-surface-variant mt-1 p-2 rounded-lg bg-surface-container">${t.note}</p>` : ''}
                        </div>
                    </div>
                `).join('')}
                ${!(order.timeline || []).length ? '<p class="text-secondary text-sm p-4 text-center">No timeline events recorded yet.</p>' : ''}
            </div>
        </div>
        <div class="h-20"></div>
    `;
}

// ─── Products & Size Breakdown Matrix Tab ─────────────────────────────────────
function renderProductsMatrixTab(order) {
    const products = (Array.isArray(order.products) && order.products.length > 0)
        ? order.products
        : [{
            name: order.product || 'Garment Item',
            category: 'Adults',
            qty: order.qty || 0,
            status: order.status || 'Fabric',
            sizes: order.stageData?.cutting?.sizes || {}
        }];

    return `
        <div class="flex flex-col gap-4">
            <div class="flex justify-between items-center">
                <h3 class="text-[13px] font-bold text-secondary uppercase tracking-wider">Itemized Products &amp; Size Breakdown</h3>
                <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-surface-variant text-on-surface-variant">${order.qty} pcs total</span>
            </div>

            ${products.map((p, pIdx) => {
                const isKids = p.category === 'Kids';
                const sizeKeys = isKids
                    ? ['24', '26', '28', '30', '32', '34', '36', '38']
                    : ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'XXXXL'];

                const sizesObj = (p.sizes && typeof p.sizes === 'object') ? p.sizes : {};

                const sizesGridHtml = sizeKeys.map(sz => `
                    <div class="text-center bg-surface-container/70 rounded-xl py-1.5 px-1 border border-outline-variant/40">
                        <p class="text-[9px] font-bold text-secondary uppercase">${sz}</p>
                        <p class="text-[13px] font-extrabold text-on-surface mt-0.5">${sizesObj[sz] || 0}</p>
                    </div>
                `).join('');

                const pWf = p.workflowType || order.workflowType || 'default';
                const pStages = getProductWorkflowStages(p, pWf);
                const initialStage = pStages[0] || 'procurement';
                const currentNormStage = normalizeStageKey(p.status || initialStage);
                const stageDef = STAGE_DEFINITIONS[currentNormStage] || STAGE_DEFINITIONS[initialStage] || STAGE_DEFINITIONS.procurement;

                return `
                    <div class="bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant shadow-sm">
                        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3 pb-3 border-b border-outline-variant/40">
                            <div>
                                <h4 class="text-[16px] font-bold text-on-surface">${p.name}</h4>
                                <div class="flex items-center gap-2 mt-1">
                                    <span class="text-[11px] font-bold text-secondary uppercase tracking-wide bg-surface-variant px-2 py-0.5 rounded-md">${p.category || 'Adults'}</span>
                                    <span class="text-[12px] font-bold text-on-surface">${p.qty || 0} pcs</span>
                                    <span class="inline-flex items-center gap-1 text-[11px] font-bold ${stageDef.color} ${stageDef.bgColor} px-2 py-0.5 rounded-md">
                                        <span class="material-symbols-outlined text-[13px]">${stageDef.icon}</span>
                                        ${stageDef.label}
                                    </span>
                                </div>
                            </div>
                            <button onclick="window.location.href='production.html?orderId=${order.id}&stage=${currentNormStage}&productId=${pIdx}'"
                                class="px-3 py-1.5 rounded-xl bg-primary text-white text-[12px] font-bold flex items-center gap-1 shadow-xs active-scale transition-apple hover:bg-primary-hover">
                                <span class="material-symbols-outlined text-[15px]">precision_manufacturing</span>
                                <span>Floor Workspace</span>
                                <span class="material-symbols-outlined text-[14px]">arrow_forward</span>
                            </button>
                        </div>
                        <p class="text-[11px] font-bold text-secondary uppercase mb-2">Size Ratio Matrix (pcs)</p>
                        <div class="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                            ${sizesGridHtml}
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

// ─── Automated Bill of Materials (BOM) Calculator Tab ─────────────────────────
function renderBOMCalculatorTab(order) {
    const totalQty = order.qty || 0;
    const fabricType = order.fabric || '100% Combed Cotton Single Jersey, 180 GSM';
    const isHoodieOrFleece = fabricType.toLowerCase().includes('hood') || fabricType.toLowerCase().includes('fleece');
    
    // Industrial consumption benchmark
    const avgConsumptionKg = isHoodieOrFleece ? 0.65 : 0.24; // kg per pc
    const netFabricKg = Math.round(totalQty * avgConsumptionKg * 10) / 10;
    const grossFabricKg = Math.round(netFabricKg * 1.05 * 10) / 10; // +5% cutting/wastage buffer
    const estRolls = Math.ceil(grossFabricKg / 20); // standard 20kg roll
    const estFabricPricePerKg = isHoodieOrFleece ? 440 : 380;
    const estFabricCost = Math.round(grossFabricKg * estFabricPricePerKg);

    // Trims benchmarks
    const threadCones = Math.ceil(totalQty / 150);
    const polybags = totalQty;
    const labels = totalQty;
    const cartons = Math.ceil(totalQty / 50);

    return `
        <div class="flex flex-col gap-4">
            <!-- Header Summary Banner -->
            <div class="bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant shadow-sm">
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <span class="text-[11px] font-bold text-secondary uppercase tracking-wider">Automated Requirement Estimator</span>
                        <h3 class="text-[18px] font-extrabold text-on-surface mt-0.5">Bill of Materials (BOM)</h3>
                    </div>
                    <span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#5856D6]/10 text-[#5856D6] border border-[#5856D6]/20">
                        Order Qty: ${totalQty.toLocaleString()} pcs
                    </span>
                </div>
                <p class="text-[12px] text-secondary">Dynamically calculated based on apparel style consumption, standard Tirupur roll metrics, and export trims benchmarks.</p>
            </div>

            <!-- Fabric Sourcing Specification -->
            <div class="bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant shadow-sm">
                <div class="flex items-center gap-2 mb-3">
                    <span class="material-symbols-outlined text-[20px] text-primary">texture</span>
                    <h4 class="text-[14px] font-bold text-on-surface uppercase tracking-wide">1. Primary Fabric Allocation</h4>
                </div>

                <div class="p-3 rounded-xl bg-surface-container/50 border border-outline-variant/40 mb-3">
                    <p class="text-[11px] font-bold text-secondary uppercase">Material &amp; Construction</p>
                    <p class="text-[14px] font-bold text-on-surface mt-0.5">${fabricType}</p>
                </div>

                <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center mb-3">
                    <div class="p-2.5 rounded-xl bg-surface-container/40 border border-outline-variant/30">
                        <span class="text-[10px] font-bold text-secondary uppercase block">Per-Pc Consumption</span>
                        <strong class="text-[15px] text-on-surface">${avgConsumptionKg} kg</strong>
                    </div>
                    <div class="p-2.5 rounded-xl bg-surface-container/40 border border-outline-variant/30">
                        <span class="text-[10px] font-bold text-secondary uppercase block">Gross Fabric (+5%)</span>
                        <strong class="text-[15px] text-primary">${grossFabricKg} kg</strong>
                    </div>
                    <div class="p-2.5 rounded-xl bg-surface-container/40 border border-outline-variant/30">
                        <span class="text-[10px] font-bold text-secondary uppercase block">Rolls Required</span>
                        <strong class="text-[15px] text-on-surface">${estRolls} Rolls</strong>
                        <span class="text-[9px] text-secondary block">(@20kg/roll)</span>
                    </div>
                    <div class="p-2.5 rounded-xl bg-surface-container/40 border border-outline-variant/30">
                        <span class="text-[10px] font-bold text-secondary uppercase block">Est. Fabric Cost</span>
                        <strong class="text-[15px] text-[#008A00]">&#8377;${estFabricCost.toLocaleString()}</strong>
                    </div>
                </div>

                <div class="flex items-center justify-between text-[12px] pt-2 border-t border-outline-variant/30 text-secondary">
                    <span>Knitting &amp; Dyeing Route: Standard Inward QC</span>
                    <a href="production.html?orderId=${order.id}&stage=fabric" class="text-primary font-bold hover:underline flex items-center gap-0.5">
                        <span>Check Fabric Floor</span>
                        <span class="material-symbols-outlined text-[14px]">arrow_forward</span>
                    </a>
                </div>
            </div>

            <!-- Trims & Packaging Specification Table -->
            <div class="bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant shadow-sm">
                <div class="flex items-center gap-2 mb-3">
                    <span class="material-symbols-outlined text-[20px] text-[#5856D6]">inventory</span>
                    <h4 class="text-[14px] font-bold text-on-surface uppercase tracking-wide">2. Trims, Labels &amp; Packaging Matrix</h4>
                </div>

                <div class="overflow-x-auto">
                    <table class="w-full text-left text-[12px]">
                        <thead>
                            <tr class="border-b border-outline-variant/50 text-secondary uppercase text-[10px]">
                                <th class="py-2 pr-2">Item Description</th>
                                <th class="py-2 px-2">Specification</th>
                                <th class="py-2 px-2 text-right">Required Qty</th>
                                <th class="py-2 pl-2 text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-outline-variant/30">
                            <tr>
                                <td class="py-2.5 pr-2 font-bold text-on-surface">Sewing Thread</td>
                                <td class="py-2.5 px-2 text-secondary">40/2 Spun Polyester (Color Matched)</td>
                                <td class="py-2.5 px-2 text-right font-mono font-bold">${threadCones} Cones</td>
                                <td class="py-2.5 pl-2 text-right"><span class="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-bold text-[10px]">In Stock</span></td>
                            </tr>
                            <tr>
                                <td class="py-2.5 pr-2 font-bold text-on-surface">Brand Woven Label</td>
                                <td class="py-2.5 px-2 text-secondary">High-Definition Damask Center Fold</td>
                                <td class="py-2.5 px-2 text-right font-mono font-bold">${labels} pcs</td>
                                <td class="py-2.5 pl-2 text-right"><span class="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-bold text-[10px]">Allotted</span></td>
                            </tr>
                            <tr>
                                <td class="py-2.5 pr-2 font-bold text-on-surface">Wash &amp; Care Label</td>
                                <td class="py-2.5 px-2 text-secondary">Printed Satin with RN &amp; Composition</td>
                                <td class="py-2.5 px-2 text-right font-mono font-bold">${labels} pcs</td>
                                <td class="py-2.5 pl-2 text-right"><span class="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-bold text-[10px]">Allotted</span></td>
                            </tr>
                            <tr>
                                <td class="py-2.5 pr-2 font-bold text-on-surface">Size Pips</td>
                                <td class="py-2.5 px-2 text-secondary">Woven Loop Fold (XS to 4XL)</td>
                                <td class="py-2.5 px-2 text-right font-mono font-bold">${labels} pcs</td>
                                <td class="py-2.5 pl-2 text-right"><span class="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-bold text-[10px]">In Stock</span></td>
                            </tr>
                            <tr>
                                <td class="py-2.5 pr-2 font-bold text-on-surface">Hangtag &amp; Tag Pin</td>
                                <td class="py-2.5 px-2 text-secondary">350 GSM Cardstock + 25mm Nylon Barb</td>
                                <td class="py-2.5 px-2 text-right font-mono font-bold">${labels} pcs</td>
                                <td class="py-2.5 pl-2 text-right"><span class="px-2 py-0.5 rounded bg-orange-500/10 text-orange-600 font-bold text-[10px]">Inward Due</span></td>
                            </tr>
                            <tr>
                                <td class="py-2.5 pr-2 font-bold text-on-surface">Individual Polybag</td>
                                <td class="py-2.5 px-2 text-secondary">40 Micron Self-Adhesive Polypropylene</td>
                                <td class="py-2.5 px-2 text-right font-mono font-bold">${polybags} pcs</td>
                                <td class="py-2.5 pl-2 text-right"><span class="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-bold text-[10px]">In Stock</span></td>
                            </tr>
                            <tr>
                                <td class="py-2.5 pr-2 font-bold text-on-surface">Master Cartons</td>
                                <td class="py-2.5 px-2 text-secondary">7-Ply Export Corrugated (50 pcs/ctn)</td>
                                <td class="py-2.5 px-2 text-right font-mono font-bold">${cartons} Boxes</td>
                                <td class="py-2.5 pl-2 text-right"><span class="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-bold text-[10px]">Available</span></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

// ─── Printable Documents & Job Travelers Tab ──────────────────────────────────
function renderPrintDocsTab(order) {
    return `
        <div class="flex flex-col gap-4">
            <div class="bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant shadow-sm">
                <h3 class="text-[14px] font-bold text-on-surface uppercase tracking-wider mb-1">Printable Factory Documentation</h3>
                <p class="text-[12px] text-secondary">Generate industrial job tickets, production travelers, carton packing slips, and proforma invoices formatted for thermal or laser printing.</p>
            </div>

            <!-- DOCUMENT 1: FACTORY JOB TRAVELER & CUT TICKET -->
            <div class="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div class="flex items-center gap-3 min-w-0">
                    <div class="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <span class="material-symbols-outlined text-[24px]">assignment</span>
                    </div>
                    <div>
                        <div class="flex items-center gap-2">
                            <h4 class="text-[16px] font-bold text-on-surface">Factory Job Traveler &amp; Cut Ticket</h4>
                            <span class="px-2 py-0.5 rounded bg-surface-variant text-secondary text-[10px] font-extrabold uppercase">A4 Format</span>
                        </div>
                        <p class="text-[12px] text-secondary mt-0.5">Accompanies fabric rolls and cut bundles across all floor departments. Includes marker breakdown, bundle matrix, and supervisor sign-offs.</p>
                    </div>
                </div>
                <button onclick="window.printJobTraveler('${order.id}')"
                    class="px-4 py-2.5 rounded-xl bg-primary text-white text-[13px] font-bold flex items-center gap-1.5 shadow-xs active-scale transition-apple hover:bg-primary-hover shrink-0 w-full sm:w-auto justify-center">
                    <span class="material-symbols-outlined text-[17px]">print</span>
                    <span>Print Job Traveler</span>
                </button>
            </div>

            <!-- DOCUMENT 2: COMMERCIAL PROFORMA INVOICE -->
            <div class="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div class="flex items-center gap-3 min-w-0">
                    <div class="w-12 h-12 rounded-2xl bg-[#008A00]/10 text-[#008A00] flex items-center justify-center shrink-0">
                        <span class="material-symbols-outlined text-[24px]">receipt_long</span>
                    </div>
                    <div>
                        <div class="flex items-center gap-2">
                            <h4 class="text-[16px] font-bold text-on-surface">Commercial Proforma Invoice</h4>
                            <span class="px-2 py-0.5 rounded bg-surface-variant text-secondary text-[10px] font-extrabold uppercase">Official Tax Slip</span>
                        </div>
                        <p class="text-[12px] text-secondary mt-0.5">Itemized commercial invoice with GSTIN breakdown, banking details, payment terms, and delivery instructions.</p>
                    </div>
                </div>
                <button onclick="window.printProformaInvoice('${order.id}')"
                    class="px-4 py-2.5 rounded-xl bg-[#008A00] text-white text-[13px] font-bold flex items-center gap-1.5 shadow-xs active-scale transition-apple hover:opacity-90 shrink-0 w-full sm:w-auto justify-center">
                    <span class="material-symbols-outlined text-[17px]">print</span>
                    <span>Print Proforma Invoice</span>
                </button>
            </div>

            <!-- DOCUMENT 3: MASTER CARTON SHIPPING SLIPS -->
            <div class="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div class="flex items-center gap-3 min-w-0">
                    <div class="w-12 h-12 rounded-2xl bg-[#5856D6]/10 text-[#5856D6] flex items-center justify-center shrink-0">
                        <span class="material-symbols-outlined text-[24px]">label</span>
                    </div>
                    <div>
                        <div class="flex items-center gap-2">
                            <h4 class="text-[16px] font-bold text-on-surface">Carton Master Packing Slips</h4>
                            <span class="px-2 py-0.5 rounded bg-surface-variant text-secondary text-[10px] font-extrabold uppercase">Thermal 4x6</span>
                        </div>
                        <p class="text-[12px] text-secondary mt-0.5">Outer box shipping labels with carton sequence (e.g. Box 1 of 8), destination barcode, style code, and size quantities.</p>
                    </div>
                </div>
                <button onclick="window.printCartonSlips('${order.id}')"
                    class="px-4 py-2.5 rounded-xl bg-surface-variant text-on-surface hover:bg-surface-container-high text-[13px] font-bold flex items-center gap-1.5 shadow-xs active-scale transition-apple shrink-0 w-full sm:w-auto justify-center">
                    <span class="material-symbols-outlined text-[17px]">print</span>
                    <span>Print Carton Slips</span>
                </button>
            </div>
        </div>
    `;
}

// ─── Production Data Tab ──────────────────────────────────────────────────────
function renderProductionDataTab(order) {
    const primaryProd = (Array.isArray(order.products) && order.products.length > 0)
        ? order.products[0]
        : null;
    const workflowType = primaryProd?.workflowType || order.workflowType || 'default';
    const stageKeys = getProductWorkflowStages(primaryProd, workflowType);
    const rollup = calculateOrderRollup(order);

    const WORKFLOW_TITLES = {
        default: 'Standard Knits (Fabric → Cut → Stitch → Print → Pack)',
        print_before_stitch: 'Print-First Route (Print Cut Panels Before Sewing)',
        wash_before_stitch: 'Panel-Wash Route (Pre-Wash Panels Before Assembly)',
        stitch_before_embroidery: 'Post-Assembly Embellishment',
        direct_fulfillment: 'Trading / Direct Fulfillment (Source & Dispatch)',
        full_vertical: 'Full Vertical Integration (Yarn → Winding → Knitting → Dyeing → Cut → Stitch)'
    };
    const wfName = WORKFLOW_TITLES[workflowType] || workflowType.replace(/_/g, ' ');

    const stagesList = stageKeys.map(key => {
        const def = STAGE_DEFINITIONS[key] || {
            label: key,
            icon: 'circle',
            description: ''
        };
        return {
            key,
            label: def.label,
            icon: def.icon || 'circle',
            desc: def.description || ''
        };
    });

    return `
        <div class="flex flex-col gap-4">
            <!-- Header Status -->
            <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 shadow-sm">
                <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center gap-2">
                        <span class="text-[11px] font-bold text-secondary uppercase tracking-wider">Workflow Route:</span>
                        <span class="px-2.5 py-1 rounded-md text-[11px] font-bold bg-primary/10 text-primary capitalize">${wfName}</span>
                    </div>
                    <span class="text-[13px] font-bold text-primary">${rollup.overallPercentage}% Complete</span>
                </div>
                <div class="w-full h-2 rounded-full bg-surface-variant overflow-hidden mb-3">
                    <div class="h-full bg-primary rounded-full" style="width: ${rollup.overallPercentage}%"></div>
                </div>
                <div class="flex justify-between items-center text-[12px] text-secondary">
                    <span>Active Bottleneck: <strong class="text-on-surface">${rollup.activeStageDef.label}</strong></span>
                    <span>Total Order: <strong class="text-on-surface">${rollup.totalOrderQty} pcs</strong></span>
                </div>
            </div>

            <!-- Operational Stage Workspaces Launcher -->
            <div class="flex flex-col gap-2">
                <h4 class="text-[13px] font-bold text-secondary uppercase tracking-wider px-1">Floor Stage Workspaces</h4>
                <div class="grid grid-cols-1 gap-2.5">
                    ${stagesList.map(stg => {
                        const isCurrent = rollup.activeStageKey === stg.key;
                        return `
                            <div onclick="window.location.href='production.html?orderId=${order.id}&stage=${stg.key}'"
                                class="p-3.5 rounded-2xl bg-surface-container-lowest border ${isCurrent ? 'border-primary ring-1 ring-primary/30 bg-primary/5' : 'border-outline-variant'} flex items-center justify-between cursor-pointer active-scale transition-apple shadow-xs hover:border-primary">
                                <div class="flex items-center gap-3 min-w-0 pr-2">
                                    <div class="w-10 h-10 rounded-xl ${isCurrent ? 'bg-primary text-white' : 'bg-surface-variant text-secondary'} flex items-center justify-center shrink-0">
                                        <span class="material-symbols-outlined text-[20px]">${stg.icon}</span>
                                    </div>
                                    <div class="min-w-0">
                                        <div class="flex items-center gap-2">
                                            <h5 class="text-[14px] font-bold text-on-surface truncate">${stg.label}</h5>
                                            ${isCurrent ? '<span class="text-[10px] font-bold px-1.5 py-0.2 rounded bg-primary text-white uppercase">Active</span>' : ''}
                                        </div>
                                        <p class="text-[12px] text-secondary truncate mt-0.5">${stg.desc}</p>
                                    </div>
                                </div>
                                <span class="material-symbols-outlined text-secondary text-[18px] shrink-0">arrow_forward_ios</span>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        </div>
    `;
}


export function getOrdersAnalyticsHTML({ totalValue, pendingUnits, cuttingCount, stitchingCount, printingCount, riskCount = 0 }) {
    return `
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div class="bg-surface-container-lowest border border-outline-variant p-4 rounded-2xl shadow-sm">
                <p class="text-[11px] font-bold text-secondary uppercase tracking-wider">Active Order Book</p>
                <h3 class="text-[22px] font-extrabold text-on-surface mt-1">₹${(totalValue || 0).toLocaleString()}</h3>
                <p class="text-[12px] text-secondary mt-0.5">${(pendingUnits || 0).toLocaleString()} pcs in pipeline</p>
            </div>

            <div class="bg-surface-container-lowest border border-outline-variant p-4 rounded-2xl shadow-sm">
                <p class="text-[11px] font-bold text-secondary uppercase tracking-wider">Active Pieces</p>
                <h3 class="text-[22px] font-extrabold text-primary mt-1">${(pendingUnits || 0).toLocaleString()}</h3>
                <p class="text-[12px] text-secondary mt-0.5">Floor manufacturing</p>
            </div>

            <div class="bg-surface-container-lowest border border-outline-variant p-4 rounded-2xl shadow-sm">
                <p class="text-[11px] font-bold text-secondary uppercase tracking-wider">Floor Department Queues</p>
                <div class="flex items-center gap-2 mt-1.5 flex-wrap text-[12px]">
                    <span class="px-2 py-0.5 rounded bg-[#FF9500]/10 text-[#FF9500] font-bold">Cut: ${cuttingCount || 0}</span>
                    <span class="px-2 py-0.5 rounded bg-[#34C759]/10 text-[#34C759] font-bold">Stitch: ${stitchingCount || 0}</span>
                    <span class="px-2 py-0.5 rounded bg-[#AF52DE]/10 text-[#AF52DE] font-bold">Print: ${printingCount || 0}</span>
                </div>
            </div>

            <div class="bg-surface-container-lowest border border-outline-variant p-4 rounded-2xl shadow-sm">
                <p class="text-[11px] font-bold text-secondary uppercase tracking-wider">Delivery Watchlist</p>
                <h3 class="text-[22px] font-extrabold ${riskCount > 0 ? 'text-error' : 'text-[#34C759]'} mt-1">${riskCount}</h3>
                <p class="text-[12px] text-secondary mt-0.5">${riskCount > 0 ? 'Orders nearing deadline' : 'On schedule'}</p>
            </div>
        </div>
    `;
}
