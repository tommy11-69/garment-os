import { api } from '../services/api.js';
import { SelectInput, TextInput, TextareaInput } from '../components/inputs.js';
import { BottomSheet } from '../components/index.js';

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
                ${SelectInput({ label: 'Status', id: 'create-status', options: statusOptions })}
                ${SelectInput({ label: 'Priority', id: 'create-priority', options: [{label:'Normal', value:'Normal'},{label:'High', value:'High'},{label:'Urgent', value:'Urgent'}] })}
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

    return `
        <div id="fabActionSheetContainer">${BottomSheet({ id: 'fabActionSheet', title: 'Order Actions', content: fabActionContent, height: 'auto' })}</div>
        <div id="createOrderSheetContainer">${BottomSheet({ id: 'createOrderSheet', title: 'Create Order', content: createOrderContent, footerContent: createOrderFooter })}</div>
        <div id="editOrderSheetContainer">${BottomSheet({ id: 'editOrderSheet', title: 'Edit Order', content: editOrderContent, footerContent: editOrderFooter, height: 'auto' })}</div>
        <div id="filterOrderSheetContainer">${BottomSheet({ id: 'filterOrderSheet', title: 'Filter Orders', content: filterOrderContent, footerContent: filterOrderFooter, height: 'auto' })}</div>
        <div id="orderDetailsSheetContainer">${BottomSheet({ id: 'orderDetailsSheet', customHeader: '<div class="sheet-custom-header"></div>', content: '<div id="orderDetailsSheet-inner-content"></div>', height: '95vh' })}</div>
    `;
}

export function getOrderDetailsHeader(order) {
    if (!order) return '';
    return `
        <div class="px-4 py-3 border-b border-outline-variant bg-surface-container-lowest sticky top-0 z-20">
            <div class="flex items-center justify-between mb-2">
                <div class="flex flex-col">
                    <span class="text-[12px] font-medium text-secondary uppercase tracking-wider">${order.id}</span>
                    <h2 class="text-[18px] font-bold text-on-surface line-clamp-1">${order.product}</h2>
                </div>
                <div class="flex gap-2">
                    <button onclick="window.openEditOrder()" class="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center text-secondary active-scale transition-apple"><span class="material-symbols-outlined text-[18px]">edit</span></button>
                    <button onclick="window.showConfirmation({title: 'Delete Order?', message: 'Are you sure you want to delete this order?', confirmText: 'Delete', type: 'danger', onConfirm: window.deleteOrder})" class="w-8 h-8 rounded-full bg-error-container/30 flex items-center justify-center text-error active-scale transition-apple"><span class="material-symbols-outlined text-[18px]">delete</span></button>
                    <button onclick="window.closeSheet('orderDetailsSheet')" class="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center text-secondary active-scale transition-apple"><span class="material-symbols-outlined text-[20px]">close</span></button>
                </div>
            </div>
            <div class="flex gap-4 border-b border-outline-variant/50">
                <button onclick="window.switchOrderTab('overview')" id="od-tab-btn-overview" class="od-tab-btn px-2 py-2 text-[14px] font-semibold text-primary border-b-2 border-primary transition-colors">Overview</button>
                <button onclick="window.switchOrderTab('timeline')" id="od-tab-btn-timeline" class="od-tab-btn px-2 py-2 text-[14px] font-medium text-secondary border-b-2 border-transparent hover:text-on-surface transition-colors">Timeline</button>
            </div>
        </div>
    `;
}

export function getOrderDetailsContent(order) {
    if (!order) return '';
    let customerName = order.customerId;
    if (typeof api.getCustomerSync === 'function') {
        const c = api.getCustomerSync(order.customerId);
        if (c) customerName = c.name;
    }
    
    return `
        <div id="od-tab-overview" class="od-tab-content block p-4">
            <div class="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-4">
                <button onclick="window.handleStatusTransition('Cutting')" class="shrink-0 px-4 py-2 bg-surface-container-highest text-on-surface text-[13px] font-semibold rounded-lg active-scale">Move to Cutting</button>
                <button onclick="window.handleStatusTransition('Stitching')" class="shrink-0 px-4 py-2 bg-surface-container-highest text-on-surface text-[13px] font-semibold rounded-lg active-scale">Move to Stitching</button>
                <button onclick="window.handleStatusTransition('Printing')" class="shrink-0 px-4 py-2 bg-surface-container-highest text-on-surface text-[13px] font-semibold rounded-lg active-scale">Move to Printing</button>
                <button onclick="window.handleStatusTransition('Finished')" class="shrink-0 px-4 py-2 bg-[#008A00]/10 text-[#008A00] text-[13px] font-bold rounded-lg active-scale border border-[#008A00]/20">Mark Finished</button>
            </div>
            <div class="bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant mb-4 shadow-sm">
                <div class="flex justify-between items-center mb-3">
                    <h3 class="text-[14px] font-semibold text-secondary uppercase tracking-wider">Specs</h3>
                    <span class="px-2 py-1 rounded-md text-[12px] font-bold bg-surface-variant text-on-surface-variant">${order.qty} pcs</span>
                </div>
                <div class="grid grid-cols-2 gap-y-3">
                    <div><p class="text-[12px] text-secondary">Customer</p><p class="text-[14px] font-medium text-on-surface">${customerName}</p></div>
                    <div><p class="text-[12px] text-secondary">Delivery Date</p><p class="text-[14px] font-medium text-on-surface">${order.deliveryDate || 'Not set'}</p></div>
                    <div><p class="text-[12px] text-secondary">Fabric</p><p class="text-[14px] font-medium text-on-surface">${order.fabric || '-'}</p></div>
                    <div><p class="text-[12px] text-secondary">Sizes</p><p class="text-[14px] font-medium text-on-surface">${order.sizes || '-'}</p></div>
                </div>
            </div>
            <div class="bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant shadow-sm">
                <h3 class="text-[14px] font-semibold text-secondary uppercase tracking-wider mb-3">Financials</h3>
                <div class="flex justify-between items-end">
                    <div><p class="text-[12px] text-secondary">Order Value</p><p class="text-[24px] font-bold text-on-surface">₹${(order.value || 0).toLocaleString()}</p></div>
                    <div class="text-right"><p class="text-[12px] text-secondary">Payment</p><span class="inline-flex items-center gap-1 text-[13px] font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-md">${order.paymentStatus || 'Unpaid'}</span></div>
                </div>
            </div>
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

export function getOrdersAnalyticsHTML({ totalValue, pendingUnits, cuttingCount, stitchingCount, printingCount }) {
    return `
        <div class="grid grid-cols-2 gap-3 mb-2">
            <div class="bg-surface-container-lowest border border-outline-variant p-4 rounded-2xl shadow-sm flex flex-col justify-between">
                <span class="text-[12px] font-semibold text-secondary uppercase tracking-wider">Active Pipeline</span>
                <span class="text-[20px] font-bold text-on-surface mt-1">₹${totalValue.toLocaleString()}</span>
                <span class="text-[11px] text-secondary mt-1">${pendingUnits.toLocaleString()} total units</span>
            </div>
            <div class="bg-surface-container-lowest border border-outline-variant p-4 rounded-2xl shadow-sm">
                <span class="text-[12px] font-semibold text-secondary uppercase tracking-wider mb-2 block">Stages Summary</span>
                <div class="flex flex-col gap-1 text-[13px]">
                    <div class="flex justify-between text-on-surface"><span class="font-medium">Cutting</span><span class="font-bold text-primary">${cuttingCount}</span></div>
                    <div class="flex justify-between text-on-surface"><span class="font-medium">Stitching</span><span class="font-bold text-[#FF9F0A]">${stitchingCount}</span></div>
                    <div class="flex justify-between text-on-surface"><span class="font-medium">Printing</span><span class="font-bold text-[#008A00]">${printingCount}</span></div>
                </div>
            </div>
        </div>
    `;
}
