import { api } from '../services/api.js';
import { SelectInput, TextInput, TextareaInput } from '../components/inputs.js';

export async function getOrderSheetsHTML() {
    const [customers, costings] = await Promise.all([
        api.getCustomers(),
        api.getCostings()
    ]);

    const customerOptions = [{label: 'Select Customer', value: ''}, ...customers.map(c => ({label: c.name, value: c.id}))];
    const costingOptions = [{label: 'None (Manual Entry)', value: ''}, ...costings.map(c => ({label: `${c.styleRef} ($${c.retailPrice}/pc)`, value: c.id}))];

    // ==========================================
    // FAB ACTION SHEET
    // ==========================================
    const fabActionContent = `
        <div class="flex flex-col gap-2">
            <button onclick="window.closeSheet('fabActionSheet'); window.openSheet('createOrderSheet');" class="flex items-center gap-4 p-4 rounded-xl bg-surface-container-lowest border border-outline-variant active-bg transition-colors text-left w-full">
                <div class="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <span class="material-symbols-outlined">add</span>
                </div>
                <div>
                    <h4 class="text-[16px] font-semibold text-on-surface mb-0.5">New Order</h4>
                    <p class="text-[13px] text-secondary">Start a new guided order wizard</p>
                </div>
            </button>
            <button onclick="window.closeSheet('fabActionSheet'); window.duplicateFlow();" class="flex items-center gap-4 p-4 rounded-xl bg-surface-container-lowest border border-outline-variant active-bg transition-colors text-left w-full">
                <div class="w-10 h-10 rounded-full bg-surface-variant text-on-surface-variant flex items-center justify-center">
                    <span class="material-symbols-outlined">content_copy</span>
                </div>
                <div>
                    <h4 class="text-[16px] font-semibold text-on-surface mb-0.5">Duplicate Existing</h4>
                    <p class="text-[13px] text-secondary">Clone a previous order</p>
                </div>
            </button>
            <button onclick="window.closeSheet('fabActionSheet'); window.openSheet('importOrderSheet');" class="flex items-center gap-4 p-4 rounded-xl bg-surface-container-lowest border border-outline-variant active-bg transition-colors text-left w-full">
                <div class="w-10 h-10 rounded-full bg-surface-variant text-on-surface-variant flex items-center justify-center">
                    <span class="material-symbols-outlined">upload_file</span>
                </div>
                <div>
                    <h4 class="text-[16px] font-semibold text-on-surface mb-0.5">Import Orders</h4>
                    <p class="text-[13px] text-secondary">Upload CSV or Excel</p>
                </div>
            </button>
            <button onclick="window.closeSheet('fabActionSheet'); window.createSampleOrder();" class="flex items-center gap-4 p-4 rounded-xl bg-surface-container-lowest border border-outline-variant active-bg transition-colors text-left w-full">
                <div class="w-10 h-10 rounded-full bg-surface-variant text-on-surface-variant flex items-center justify-center">
                    <span class="material-symbols-outlined">experiment</span>
                </div>
                <div>
                    <h4 class="text-[16px] font-semibold text-on-surface mb-0.5">Sample Order</h4>
                    <p class="text-[13px] text-secondary">Create a pre-production sample</p>
                </div>
            </button>
            <button onclick="window.closeSheet('fabActionSheet'); window.createDraftOrder();" class="flex items-center gap-4 p-4 rounded-xl bg-surface-container-lowest border border-outline-variant active-bg transition-colors text-left w-full">
                <div class="w-10 h-10 rounded-full bg-surface-variant text-on-surface-variant flex items-center justify-center">
                    <span class="material-symbols-outlined">draft</span>
                </div>
                <div>
                    <h4 class="text-[16px] font-semibold text-on-surface mb-0.5">Draft Order</h4>
                    <p class="text-[13px] text-secondary">Quick empty draft</p>
                </div>
            </button>
        </div>
        <div class="h-4"></div>
    `;

    // ==========================================
    // CREATE ORDER WIZARD
    // ==========================================
    const createOrderContent = `
        <div class="flex items-center justify-between mb-6 relative">
            <div class="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-surface-variant z-0 rounded-full"></div>
            <div id="wizard-progress-bar" class="absolute left-0 top-1/2 -translate-y-1/2 w-1/4 h-1 bg-primary z-0 rounded-full transition-all duration-300"></div>
            
            <div class="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center z-10 font-bold text-[13px] shadow-sm transition-colors" id="wizard-dot-1">1</div>
            <div class="w-8 h-8 rounded-full bg-surface-container-highest text-secondary flex items-center justify-center z-10 font-bold text-[13px] transition-colors" id="wizard-dot-2">2</div>
            <div class="w-8 h-8 rounded-full bg-surface-container-highest text-secondary flex items-center justify-center z-10 font-bold text-[13px] transition-colors" id="wizard-dot-3">3</div>
            <div class="w-8 h-8 rounded-full bg-surface-container-highest text-secondary flex items-center justify-center z-10 font-bold text-[13px] transition-colors" id="wizard-dot-4">4</div>
        </div>

        <div id="order-step-1" class="wizard-step">
            <h3 class="text-[18px] font-bold text-on-surface mb-4">Customer & Product</h3>
            ${SelectInput({ label: 'Link Saved Quote', id: 'create-quote', options: costingOptions, helpText: 'Optional: Inherit pricing' })}
            ${SelectInput({ label: 'Customer', id: 'create-customer', options: customerOptions, required: true })}
            ${TextInput({ label: 'Product Name', id: 'create-product', placeholder: 'e.g. Organic Cotton Tees', required: true })}
        </div>

        <div id="order-step-2" class="wizard-step hidden">
            <h3 class="text-[18px] font-bold text-on-surface mb-4">Variants & Quantity</h3>
            ${TextInput({ label: 'Fabric / Material', id: 'create-fabric', placeholder: 'e.g. 100% Organic Cotton', helpText: 'Main composition' })}
            <div class="grid grid-cols-2 gap-4">
                ${TextInput({ label: 'Sizes', id: 'create-sizes', placeholder: 'S, M, L', helpText: 'Comma separated' })}
                ${TextInput({ label: 'Colours', id: 'create-colours', placeholder: 'Navy, White', helpText: 'Comma separated' })}
            </div>
            ${TextInput({ label: 'Total Quantity', id: 'create-qty', type: 'number', placeholder: '1000', required: true })}
        </div>
        
        <div id="order-step-3" class="wizard-step hidden">
            <h3 class="text-[18px] font-bold text-on-surface mb-4">Finance & Delivery</h3>
            <div class="grid grid-cols-2 gap-4">
                ${TextInput({ label: 'Unit Price ($)', id: 'create-price', type: 'number', placeholder: '0.00', required: true })}
                ${TextInput({ label: 'Discount ($)', id: 'create-discount', type: 'number', placeholder: '0.00' })}
            </div>
            ${TextInput({ label: 'Tax (%)', id: 'create-tax', type: 'number', placeholder: '5' })}
            
            <div class="bg-surface-variant/30 p-3 rounded-xl mb-4 border border-outline-variant/50 mt-4">
                <div class="flex justify-between text-[13px] mb-1">
                    <span class="text-secondary">Subtotal</span>
                    <span class="font-medium" id="calc-subtotal">$0.00</span>
                </div>
                <div class="flex justify-between text-[13px] mb-1">
                    <span class="text-secondary">Tax</span>
                    <span class="font-medium" id="calc-taxval">$0.00</span>
                </div>
                <div class="flex justify-between text-[14px] font-bold">
                    <span class="text-on-surface">Grand Total</span>
                    <span class="text-primary" id="calc-grandtotal">$0.00</span>
                </div>
            </div>

            ${TextInput({ label: 'Delivery Date', id: 'create-date', type: 'date', required: true })}
        </div>
        
        <div id="order-step-4" class="wizard-step hidden">
            <h3 class="text-[18px] font-bold text-on-surface mb-4">Routing & Setup</h3>
            <div class="grid grid-cols-2 gap-4">
                ${SelectInput({ label: 'Status', id: 'create-status', options: Object.values(api.ORDER_STATUSES || {}).map(s => ({label: s, value: s})) })}
                ${SelectInput({ label: 'Priority', id: 'create-priority', options: [
                    {label: 'Normal', value: 'Normal'}, {label: 'High', value: 'High'}, {label: 'Urgent', value: 'Urgent'}
                ] })}
            </div>
            ${TextareaInput({ label: 'Notes & Instructions', id: 'create-notes', placeholder: 'Special requirements...', rows: 3 })}
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

    // ==========================================
    // EDIT ORDER SHEET (Single Scrollable Form)
    // ==========================================
    const editOrderContent = `
        <div class="flex flex-col gap-6">
            <div class="bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant shadow-sm">
                <h3 class="text-[14px] font-semibold text-secondary uppercase tracking-wider mb-4">Customer & Product</h3>
                ${SelectInput({ label: 'Customer', id: 'edit-customer', options: customerOptions, required: true })}
                ${TextInput({ label: 'Product Name', id: 'edit-product', required: true })}
                ${TextInput({ label: 'Fabric / Material', id: 'edit-fabric' })}
            </div>

            <div class="bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant shadow-sm">
                <h3 class="text-[14px] font-semibold text-secondary uppercase tracking-wider mb-4">Variants & Quantity</h3>
                <div class="grid grid-cols-2 gap-4">
                    ${TextInput({ label: 'Sizes', id: 'edit-sizes', helpText: 'Comma separated' })}
                    ${TextInput({ label: 'Colours', id: 'edit-colours', helpText: 'Comma separated' })}
                </div>
                ${TextInput({ label: 'Total Quantity', id: 'edit-qty', type: 'number', required: true })}
            </div>

            <div class="bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant shadow-sm">
                <h3 class="text-[14px] font-semibold text-secondary uppercase tracking-wider mb-4">Finance & Logistics</h3>
                <div class="grid grid-cols-2 gap-4">
                    ${TextInput({ label: 'Unit Price ($)', id: 'edit-price', type: 'number', required: true })}
                    ${TextInput({ label: 'Discount ($)', id: 'edit-discount', type: 'number' })}
                </div>
                <div class="grid grid-cols-2 gap-4">
                    ${TextInput({ label: 'Tax (%)', id: 'edit-tax', type: 'number' })}
                    ${TextInput({ label: 'Delivery Date', id: 'edit-date', type: 'date', required: true })}
                </div>
            </div>

            <div class="bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant shadow-sm">
                <h3 class="text-[14px] font-semibold text-secondary uppercase tracking-wider mb-4">Routing</h3>
                <div class="grid grid-cols-2 gap-4">
                    ${SelectInput({ label: 'Priority', id: 'edit-priority', options: [
                        {label: 'Normal', value: 'Normal'}, {label: 'High', value: 'High'}, {label: 'Urgent', value: 'Urgent'}
                    ] })}
                    ${SelectInput({ label: 'Assigned Production', id: 'edit-factory', options: [
                        {label: 'Unassigned', value: ''},
                        {label: 'Unit A - South Wing', value: 'Unit A - South Wing'},
                        {label: 'Unit B - North Wing', value: 'Unit B - North Wing'}
                    ] })}
                </div>
                ${TextareaInput({ label: 'Notes & Instructions', id: 'edit-notes', rows: 3 })}
            </div>
        </div>
        <div class="h-10"></div>
    `;
    const editOrderFooter = `
        <div class="p-md bg-surface border-t border-outline-variant/30 flex gap-3">
            <button onclick="window.closeSheet('editOrderSheet')" class="flex-1 py-3 px-4 rounded-xl font-bold text-[15px] bg-surface-variant text-on-surface active-scale transition-apple">Cancel</button>
            <button id="edit-order-submit" class="flex-1 py-3 px-4 rounded-xl font-bold text-[15px] bg-primary text-white active-scale transition-apple flex items-center justify-center gap-2">
                Save Changes
            </button>
        </div>
    `;

    const filterOrderHeader = `
        <div class="px-md py-4 flex items-center justify-between sticky top-0 bg-surface z-10 border-b border-outline-variant/30">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <span class="material-symbols-outlined">tune</span>
                </div>
                <div>
                    <h3 class="font-bold text-[18px] text-on-surface leading-tight">Filter Orders</h3>
                    <p class="text-[13px] text-secondary">Advanced search</p>
                </div>
            </div>
            <button onclick="window.closeSheet('filterOrderSheet')" class="w-8 h-8 flex items-center justify-center rounded-full bg-surface-variant text-on-surface active-scale transition-apple">
                <span class="material-symbols-outlined text-[20px]">close</span>
            </button>
        </div>
    `;

    const filterOrderContent = `
        <div class="p-md flex flex-col gap-6">
            ${SelectInput({
                id: 'filter-status',
                label: 'Status',
                options: [
                    { value: '', label: 'All Statuses' },
                    { value: 'Draft', label: 'Draft' },
                    { value: 'Quotation Sent', label: 'Quotation Sent' },
                    { value: 'Approved', label: 'Approved' },
                    { value: 'Production Assigned', label: 'In Production' },
                    { value: 'Quality Check', label: 'Quality Check' },
                    { value: 'Dispatched', label: 'Dispatched' },
                    { value: 'Delivered', label: 'Delivered' }
                ]
            })}
            
            ${SelectInput({
                id: 'filter-priority',
                label: 'Priority',
                options: [
                    { value: '', label: 'All Priorities' },
                    { value: 'Normal', label: 'Normal' },
                    { value: 'High', label: 'High' },
                    { value: 'Urgent', label: 'Urgent' }
                ]
            })}
            
            ${SelectInput({
                id: 'filter-customer',
                label: 'Customer',
                options: customerOptions
            })}
            
            <div class="grid grid-cols-2 gap-4">
                ${SelectInput({
                    id: 'filter-department',
                    label: 'Department',
                    options: [
                        { value: '', label: 'All Departments' },
                        { value: 'Knitting', label: 'Knitting' },
                        { value: 'Dyeing', label: 'Dyeing' },
                        { value: 'Cutting', label: 'Cutting' },
                        { value: 'Printing', label: 'Printing' },
                        { value: 'Embroidery', label: 'Embroidery' },
                        { value: 'Stitching', label: 'Stitching' },
                        { value: 'Packing', label: 'Packing' }
                    ]
                })}
                ${SelectInput({
                    id: 'filter-payment-status',
                    label: 'Payment Status',
                    options: [
                        { value: '', label: 'Any Status' },
                        { value: 'Unpaid', label: 'Unpaid' },
                        { value: 'Partially Paid', label: 'Partially Paid' },
                        { value: 'Paid', label: 'Paid' }
                    ]
                })}
            </div>

            <div class="grid grid-cols-2 gap-4">
                ${TextInput({ id: 'filter-date-from', label: 'Delivery From', type: 'date' })}
                ${TextInput({ id: 'filter-date-to', label: 'Delivery To', type: 'date' })}
            </div>
            
            ${TextInput({ id: 'filter-dispatch-date', label: 'Exact Dispatch Date', type: 'date' })}
            
            <div class="h-20"></div>
        </div>
    `;

    const filterOrderFooter = `
        <div class="p-md bg-surface border-t border-outline-variant/30 flex gap-3">
            <button onclick="window.resetOrderFilters()" class="flex-1 py-3 px-4 rounded-xl font-bold text-[15px] bg-surface-variant text-on-surface active-scale transition-apple">Reset</button>
            <button onclick="window.applyOrderFilters()" class="flex-1 py-3 px-4 rounded-xl font-bold text-[15px] bg-primary text-white active-scale transition-apple">Apply Filters</button>
        </div>
    `;

    const importOrderContent = `
        <div class="flex flex-col gap-6 text-center py-4">
            <div class="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <span class="material-symbols-outlined text-[32px]">upload_file</span>
            </div>
            <div>
                <h3 class="text-[20px] font-bold text-on-surface">Import via CSV</h3>
                <p class="text-[14px] text-secondary mt-1">Upload a spreadsheet containing your orders.</p>
            </div>
            <div class="bg-surface-container-lowest border border-dashed border-outline-variant rounded-2xl p-6 relative">
                <input type="file" id="import-file-upload" accept=".csv, .xlsx" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onchange="window.handleImportFileSelect(this)">
                <span class="material-symbols-outlined text-[32px] text-secondary mb-2">cloud_upload</span>
                <p class="text-[14px] font-medium text-on-surface">Tap to select a file</p>
                <p class="text-[12px] text-secondary">CSV or Excel (Max 5MB)</p>
            </div>
            <!-- Preview panel (shown after file select) -->
            <div id="import-preview-panel" class="hidden text-left">
                <div class="flex items-center justify-between mb-3">
                    <h4 class="text-[15px] font-bold text-on-surface">Preview</h4>
                    <span id="import-preview-count" class="text-[12px] text-secondary"></span>
                </div>
                <div id="import-preview-rows" class="flex flex-col gap-2"></div>
                <div id="import-error-banner" class="hidden mt-3 p-3 bg-error/10 border border-error/20 rounded-xl">
                    <p class="text-[13px] text-error font-medium" id="import-error-msg"></p>
                </div>
            </div>
        </div>
    `;

    const importOrderFooter = `
        <div class="p-md bg-surface border-t border-outline-variant/30 flex gap-3">
            <button onclick="window.closeSheet('importOrderSheet')" class="flex-1 py-3 px-4 rounded-xl font-bold text-[15px] bg-surface-variant text-on-surface active-scale transition-apple">Cancel</button>
            <button id="import-submit-btn" onclick="window.importOrders()" class="flex-[2] py-3 px-4 rounded-xl font-bold text-[15px] bg-primary text-white active-scale transition-apple flex items-center justify-center gap-2">
                Import Orders
            </button>
        </div>
    `;

    return {
        createOrderContent, createOrderFooter,
        editOrderContent, editOrderFooter,
        fabActionContent, importOrderContent, importOrderFooter,
        filterOrderHeader, filterOrderContent, filterOrderFooter
    };
}

/**
 * Returns the HTML for the Task create/edit bottom sheet.
 * A single sheet is reused for both modes — the caller sets task-sheet-mode
 * data attribute and pre-populates fields before opening.
 */
export function getTaskSheetHTML() {
    const assigneeOptions = [
        { label: 'Unassigned', value: '' },
        { label: 'Sales', value: 'Sales' },
        { label: 'QC Team', value: 'QC Team' },
        { label: 'Purchasing', value: 'Purchasing' },
        { label: 'Cutting Floor', value: 'Cutting Floor' },
        { label: 'Prod Mgr', value: 'Prod Mgr' },
        { label: 'Finance', value: 'Finance' },
        { label: 'Logistics', value: 'Logistics' },
        { label: 'Floor Spv', value: 'Floor Spv' },
    ];
    const priorityOptions = [
        { label: 'Normal', value: 'Normal' },
        { label: 'High', value: 'High' },
        { label: 'Low', value: 'Low' },
    ];

    const taskFormContent = `
        <div class="flex flex-col gap-4">
            ${TextInput({ label: 'Task Title', id: 'task-title', placeholder: 'e.g. Review cut plan', required: true })}
            <div class="grid grid-cols-2 gap-4">
                ${SelectInput({ label: 'Assignee', id: 'task-assignee', options: assigneeOptions })}
                ${SelectInput({ label: 'Priority', id: 'task-priority', options: priorityOptions })}
            </div>
            ${TextInput({ label: 'Due Date', id: 'task-due-date', type: 'date' })}
            ${TextareaInput({ label: 'Notes', id: 'task-notes', placeholder: 'Optional details…', rows: 2 })}
            <div class="h-4"></div>
        </div>
    `;
    const taskFormFooter = `
        <button id="task-sheet-submit" type="button" class="flex-1 bg-primary text-on-primary font-bold text-[15px] py-3.5 rounded-2xl active-scale transition-apple shadow-sm">
            Save Task
        </button>
    `;
    return { taskFormContent, taskFormFooter };
}

export function getOrderDetailsHTML() {
    const orderDetailsHeader = `
    <div class="px-lg pb-md flex justify-between items-start border-b border-outline-variant/30">
        <div>
            <span id="od-id" class="text-[13px] font-bold text-primary mb-1 block"></span>
            <h2 id="od-customer" class="text-[22px] font-bold text-on-surface leading-tight"></h2>
            <span id="od-status" class="inline-block mt-2 px-3 py-1 rounded-full text-[12px] font-medium bg-surface-variant text-secondary"></span>
        </div>
        <div class="flex gap-2">
            <button onclick="window.editOrder()" class="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center text-on-surface active-scale transition-apple" title="Edit Order">
                <span class="material-symbols-outlined text-[18px]">edit</span>
            </button>
            <button onclick="window.duplicateFlow()" class="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center text-on-surface active-scale transition-apple" title="Duplicate">
                <span class="material-symbols-outlined text-[18px]">content_copy</span>
            </button>
            <button id="od-btn-archive" onclick="window.archiveOrder()" class="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center text-on-surface active-scale transition-apple" title="Archive">
                <span id="od-icon-archive" class="material-symbols-outlined text-[18px]">archive</span>
            </button>
            <button onclick="window.showConfirmation({title: 'Delete Order?', message: 'Are you sure you want to delete this order? This action cannot be undone.', confirmText: 'Delete', onConfirm: window.deleteOrder})" class="w-8 h-8 rounded-full bg-error-container/30 flex items-center justify-center text-error active-scale transition-apple" title="Delete">
                <span class="material-symbols-outlined text-[18px]">delete</span>
            </button>
            <button onclick="window.closeSheet('orderDetailsSheet')" class="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center text-secondary active-scale transition-apple">
                <span class="material-symbols-outlined text-[20px]">close</span>
            </button>
        </div>
        </div>
    </div>`;

    const orderDetailsContent = `
        <!-- Sticky Tabs -->
        <div class="sticky top-0 bg-surface z-20 pb-4 mb-4 border-b border-outline-variant/30 flex justify-between overflow-x-auto scrollbar-hide">
            <button onclick="window.switchOrderTab('overview')" id="od-tab-btn-overview" class="flex-1 pb-3 px-2 whitespace-nowrap text-[14px] font-bold text-primary border-b-2 border-primary">Overview</button>
            <button onclick="window.switchOrderTab('timeline')" id="od-tab-btn-timeline" class="flex-1 pb-3 px-2 whitespace-nowrap text-[14px] font-medium text-secondary border-b-2 border-transparent">Timeline</button>
            <button onclick="window.switchOrderTab('tasks')" id="od-tab-btn-tasks" class="flex-1 pb-3 px-2 whitespace-nowrap text-[14px] font-medium text-secondary border-b-2 border-transparent">Tasks</button>
            <button onclick="window.switchOrderTab('activity')" id="od-tab-btn-activity" class="flex-1 pb-3 px-2 whitespace-nowrap text-[14px] font-medium text-secondary border-b-2 border-transparent">Activity</button>
        </div>

        <!-- OVERVIEW TAB -->
        <div id="od-tab-overview" class="od-tab-content">
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
                    <div class="w-full h-2 bg-surface-container rounded-full overflow-hidden mb-4">
                        <div id="od-profit-bar" class="h-full rounded-full transition-all duration-500" style="width: 0%"></div>
                    </div>
                    <button onclick="window.openSheet('addExpenseSheet')" class="w-full py-2 rounded-xl bg-surface-variant text-[13px] font-semibold text-on-surface active-scale transition-apple flex items-center justify-center gap-2">
                        <span class="material-symbols-outlined text-[16px]">receipt_long</span>
                        Log Production Expense
                    </button>
                </div>
            </div>

            <!-- Order Metrics -->
            <div class="bg-surface-container-lowest rounded-[24px] border border-outline-variant shadow-sm p-lg mb-6">
                <h3 class="text-[14px] font-semibold text-secondary uppercase tracking-wider mb-4">Order Metrics</h3>
                <div class="grid grid-cols-2 gap-4">
                    <div class="flex flex-col">
                        <span class="text-[12px] font-medium text-secondary mb-1">Delay</span>
                        <span id="od-delay" class="text-[16px] font-bold text-on-surface"></span>
                    </div>
                    <div class="flex flex-col">
                        <span class="text-[12px] font-medium text-secondary mb-1">Days Remaining</span>
                        <span id="od-days-remaining" class="text-[16px] font-bold text-on-surface"></span>
                    </div>
                    <div class="flex flex-col">
                        <span class="text-[12px] font-medium text-secondary mb-1">Outstanding Balance</span>
                        <span id="od-outstanding" class="text-[16px] font-bold text-error"></span>
                    </div>
                    <div class="flex flex-col">
                        <span class="text-[12px] font-medium text-secondary mb-1">Remaining Quantity</span>
                        <span id="od-remaining-qty" class="text-[16px] font-bold text-primary"></span>
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
                
                <div class="flex gap-2 overflow-x-auto pb-2 scrollbar-hide" id="od-status-actions">
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
        </div>

        <!-- TIMELINE TAB -->
        <div id="od-tab-timeline" class="od-tab-content hidden">
            <div id="od-timeline-container" class="pt-4"></div>
        </div>

        <!-- TASKS TAB -->
        <div id="od-tab-tasks" class="od-tab-content hidden">
            <div class="flex justify-between items-center mb-4 mt-2">
                <h3 class="text-[16px] font-bold text-on-surface">Tasks</h3>
                <button onclick="window.promptNewTask()" class="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center active-scale transition-apple">
                    <span class="material-symbols-outlined text-[18px]">add</span>
                </button>
            </div>
            <div id="od-tasks-container"></div>
        </div>

        <!-- ACTIVITY TAB -->
        <div id="od-tab-activity" class="od-tab-content hidden">
            <div class="flex justify-between items-center mb-4 mt-2">
                <h3 class="text-[16px] font-bold text-on-surface">Activity Log</h3>
            </div>
            <div id="od-activity-container">
                <p class="text-secondary text-[13px] text-center p-4">Activity logs will be stored here.</p>
            </div>
        </div>

        <div class="h-10"></div>
    `;

    const orderDetailsFooter = `
        <button onclick="window.closeSheet('orderDetailsSheet')" class="flex-1 bg-surface-container-high text-on-surface font-bold text-[15px] py-3.5 rounded-2xl active-scale transition-apple">
            Close
        </button>
    `;

    return { orderDetailsHeader, orderDetailsContent, orderDetailsFooter };
}
