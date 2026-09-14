import { api } from '../services/api.js?v=5.2';
import { SelectInput, TextInput, TextareaInput } from '../components/inputs.js?v=5.2';
import { BottomSheet } from '../components/index.js?v=5.2';
import { calculateOrderRollup, STAGE_DEFINITIONS, normalizeStageKey } from '../production/domain/workflowEngine.js?v=5.5';

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

    return `
        <div class="px-4 py-3 border-b border-outline-variant bg-surface-container-lowest sticky top-0 z-20">
            <div class="flex items-center justify-between mb-2">
                <div class="flex flex-col min-w-0 pr-2">
                    <div class="flex items-center gap-2">
                        <span class="text-[12px] font-mono font-bold text-primary uppercase tracking-wider">${order.id}</span>
                        ${countdownBadge}
                    </div>
                    <h2 class="text-[18px] font-bold text-on-surface line-clamp-1 mt-0.5">${order.product || 'Custom Apparel'}</h2>
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

            <div class="flex gap-4 mt-3 border-b border-outline-variant/50 overflow-x-auto no-scrollbar">
                <button onclick="window.switchOrderTab('overview')" id="od-tab-btn-overview" class="od-tab-btn shrink-0 px-2 py-2 text-[14px] font-semibold text-primary border-b-2 border-primary transition-colors">Overview</button>
                <button onclick="window.switchOrderTab('production')" id="od-tab-btn-production" class="od-tab-btn shrink-0 px-2 py-2 text-[14px] font-medium text-secondary border-b-2 border-transparent hover:text-on-surface transition-colors">Production Floor</button>
                <button onclick="window.switchOrderTab('timeline')" id="od-tab-btn-timeline" class="od-tab-btn shrink-0 px-2 py-2 text-[14px] font-medium text-secondary border-b-2 border-transparent hover:text-on-surface transition-colors">Timeline</button>
            </div>
        </div>
    `;
}

export function getOrderDetailsContent(order) {
    if (!order) return '';
    let customerName = order.customerName || order.customerId;
    if (typeof api.getCustomerSync === 'function') {
        const c = api.getCustomerSync(order.customerId);
        if (c) customerName = c.name;
    }

    const rollup = calculateOrderRollup(order);
    const paymentReceived = order.paymentReceived || 0;
    const paymentPending = Math.max((order.value || 0) - paymentReceived, 0);
    const paymentPct = order.value ? Math.min((paymentReceived / order.value) * 100, 100) : 0;

    return `
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


            <div class="bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant mb-4 shadow-sm">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-[14px] font-semibold text-secondary uppercase tracking-wider">Products &amp; Specs</h3>
                    <span class="px-2 py-1 rounded-md text-[12px] font-bold bg-surface-variant text-on-surface-variant">${order.qty} pcs</span>
                </div>
                <div class="flex flex-col gap-3 mb-4">
                    <div class="grid grid-cols-2 gap-y-2 pb-3 border-b border-outline-variant/30 text-[13px]">
                        <div><span class="text-secondary">Customer:</span> <span class="font-semibold text-on-surface">${customerName}</span></div>
                        <div><span class="text-secondary">Delivery:</span> <span class="font-semibold text-on-surface">${order.deliveryDate || 'Not set'}</span></div>
                    </div>
                </div>
                <div class="flex flex-col gap-4">
                    ${(() => {
                        if (order.products && order.products.length > 0) {
                            return order.products.map((p, pIdx) => {
                                const isKids = p.category === 'Kids';
                                const sizeKeys = isKids
                                    ? ['24', '26', '28', '30', '32', '34', '36', '38']
                                    : ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'XXXXL'];
                                
                                const sizesHtml = sizeKeys.map(k => `
                                    <div class="text-center bg-surface-container/60 rounded-lg py-1 px-0.5 border border-outline-variant/30">
                                        <p class="text-[9px] font-bold text-secondary uppercase leading-none">${k}</p>
                                        <p class="text-[12px] font-bold text-on-surface mt-0.5">${p.sizes[k] || 0}</p>
                                    </div>
                                `).join('');

                                const stages = order.workflowType === 'direct_fulfillment' ? ['Procurement', 'Dispatch', 'Delivered'] : ['Fabric', 'Cutting', 'Stitching', 'Printing/Embroidery', 'Ironing & Packing', 'Dispatch'];
                                const stageOptions = stages.map(s => `
                                    <option value="${s}" ${p.status === s ? 'selected' : ''}>${s}</option>
                                `).join('');
                                const currentNormStage = normalizeStageKey(p.status);
                                const stageDef = STAGE_DEFINITIONS[currentNormStage] || STAGE_DEFINITIONS.fabric;

                                return `
                                    <div class="border-b border-outline-variant/30 last:border-0 pb-4 last:pb-0">
                                        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2.5">
                                            <div>
                                                <h4 class="text-[14px] font-bold text-on-surface leading-tight">${p.name || 'Unnamed Product'}</h4>
                                                <div class="flex items-center gap-2 mt-0.5 flex-wrap">
                                                    <span class="inline-block text-[11px] font-semibold text-secondary bg-surface-variant/40 px-1.5 py-0.5 rounded">${p.category || 'Adults'} Category · ${p.qty} pcs</span>
                                                    <span class="inline-flex items-center gap-1 text-[11px] font-bold ${stageDef.color} ${stageDef.bgColor} px-2 py-0.5 rounded-md">
                                                        <span class="material-symbols-outlined text-[13px]">${stageDef.icon}</span>
                                                        ${stageDef.label}
                                                    </span>
                                                </div>
                                            </div>
                                            <div class="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                                                <button type="button" onclick="window.location.href='production.html?orderId=${order.id}&stage=${currentNormStage}&productId=${pIdx}'" 
                                                    class="px-2.5 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-bold flex items-center gap-1 active-scale transition-all">
                                                    <span class="material-symbols-outlined text-[14px]">precision_manufacturing</span>
                                                    <span>Floor Workspace</span>
                                                    <span class="material-symbols-outlined text-[13px]">arrow_forward</span>
                                                </button>
                                                <select onchange="window.updateProductStage('${order.id}', ${pIdx}, this.value)" class="text-[11px] font-bold text-secondary bg-surface-variant/60 border-0 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-primary/20">
                                                    ${stageOptions}
                                                </select>
                                            </div>
                                        </div>
                                        <div class="grid grid-cols-8 gap-1">
                                            ${sizesHtml}
                                        </div>
                                    </div>
                                `;
                            }).join('');

                        } else {
                            // Legacy single product orders fallback
                            return `
                                <div class="grid grid-cols-2 gap-y-3">
                                    <div><p class="text-[12px] text-secondary">Fabric</p><p class="text-[14px] font-medium text-on-surface">${order.fabric || '-'}</p></div>
                                    <div><p class="text-[12px] text-secondary">Sizes</p><p class="text-[14px] font-medium text-on-surface">${order.sizes || '-'}</p></div>
                                </div>
                            `;
                        }
                    })()}
                </div>
            </div>
            
            <div class="bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant shadow-sm mb-4">
                <div class="flex justify-between items-center mb-3">
                    <h3 class="text-[14px] font-semibold text-secondary uppercase tracking-wider">Financials</h3>
                    <span class="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${paymentPending === 0 ? 'bg-[#008A00]/10 text-[#008A00]' : 'bg-[#FF9F0A]/10 text-[#FF9F0A]'}">${paymentPending === 0 ? 'Paid' : 'Pending'}</span>
                </div>
                
                <div class="flex justify-between items-end mb-4">
                    <div><p class="text-[12px] text-secondary">Order Value</p><p class="text-[24px] font-bold text-on-surface">₹${(order.value || 0).toLocaleString()}</p></div>
                </div>

                <div class="w-full bg-surface-variant h-1.5 rounded-full overflow-hidden mb-2">
                    <div class="h-full ${paymentPending === 0 ? 'bg-[#008A00]' : 'bg-primary'}" style="width: ${paymentPct}%"></div>
                </div>
                
                <div class="flex justify-between items-center text-[13px]">
                    <div class="flex flex-col"><span class="text-secondary">Paid</span><span class="font-semibold text-on-surface">₹${paymentReceived.toLocaleString()}</span></div>
                    <div class="flex flex-col text-right"><span class="text-secondary">Due</span><span class="font-semibold ${paymentPending > 0 ? 'text-[#FF9F0A]' : 'text-secondary'}">₹${paymentPending.toLocaleString()}</span></div>
                </div>

                <div class="mt-4 pt-4 border-t border-outline-variant/50">
                    <button onclick="window.logPayment()" class="w-full py-3 bg-surface-variant text-on-surface font-semibold text-[14px] rounded-xl active-scale transition-colors">Log Payment</button>
                </div>
            </div>
        </div>
        <div id="od-tab-production" class="od-tab-content hidden p-4">
            ${renderProductionDataTab(order)}
        </div>
        <div id="od-tab-timeline" class="od-tab-content hidden p-4">
            <div class="flex flex-col gap-4">
                ${(order.timeline || []).map(t => `<div class="flex gap-4"><div class="flex flex-col items-center"><div class="w-3 h-3 rounded-full bg-primary"></div><div class="w-px h-full bg-outline-variant my-1"></div></div><div class="pb-4"><p class="text-[14px] font-semibold text-on-surface">${t.status || t.title || 'Updated'}</p><p class="text-[12px] text-secondary">${new Date(t.timestamp || t.date).toLocaleString()} • ${t.user || 'System'}</p></div></div>`).join('')}
                ${!(order.timeline || []).length ? '<p class="text-secondary text-sm">No timeline events yet.</p>' : ''}
            </div>
        </div>
        <div class="h-20"></div>
    `;
}

// ─── Production Data Tab ──────────────────────────────────────────────────────
function renderProductionDataTab(order) {
    const rollup = calculateOrderRollup(order);
    const wf = (order.workflowType || 'default').replace(/_/g, ' ');

    const stagesList = [
        { key: 'procurement', label: 'Procurement & Sourcing', icon: 'shopping_cart', desc: 'Supplier POs, yarn & trims inward' },
        { key: 'fabric', label: 'Fabric & Inward', icon: 'texture', desc: 'Roll tally, GSM, Dia, shrinkage & QC' },
        { key: 'cutting', label: 'Cutting & Bundles', icon: 'content_cut', desc: 'Size ratio breakdown, bundles, scrap %' },
        { key: 'print_wash', label: 'Print, Embroidery & Wash', icon: 'palette', desc: 'Strike-off sample, panel outward/inward' },
        { key: 'stitching', label: 'Stitching & Assembly', icon: 'precision_manufacturing', desc: 'Sewing lines, hourly output & defect audit' },
        { key: 'packing', label: 'Finishing & Packing', icon: 'inventory_2', desc: 'Thread trim, ironing, carton master matrix' },
        { key: 'dispatch', label: 'Dispatch & Gate Pass', icon: 'local_shipping', desc: 'Delivery Challan, carrier LR & handover' }
    ];

    return `
        <div class="flex flex-col gap-4">
            <!-- Header Status -->
            <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 shadow-sm">
                <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center gap-2">
                        <span class="text-[11px] font-bold text-secondary uppercase tracking-wider">Workflow Route:</span>
                        <span class="px-2.5 py-1 rounded-md text-[11px] font-bold bg-primary/10 text-primary capitalize">${wf}</span>
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
