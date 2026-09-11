import { TextInput, SelectInput, TextareaInput, SearchableSelectInput } from '../components/inputs.js';

// Category definitions by type
const INCOME_CATEGORIES = [
    { label: 'Partial', value: 'Partial' },
    { label: 'Advance', value: 'Advance' },
    { label: 'Balance', value: 'Balance' },
    { label: 'Other', value: 'Other' }
];

const EXPENSE_CATEGORIES = [
    { label: 'Fabric Purchase', value: 'Fabric Purchase' },
    { label: 'Stitching', value: 'Stitching' },
    { label: 'Own Expenses', value: 'Own Expenses' },
    { label: 'Accessories', value: 'Accessories' },
    { label: 'Printing', value: 'Printing' },
    { label: 'Embroidery', value: 'Embroidery' },
    { label: 'Transport', value: 'Transport' },
    { label: 'Salary', value: 'Salary' },
    { label: 'Rent', value: 'Rent' },
    { label: 'Electricity', value: 'Electricity' },
    { label: 'Internet', value: 'Internet' },
    { label: 'Fuel', value: 'Fuel' },
    { label: 'Marketing', value: 'Marketing' },
    { label: 'Office Expense', value: 'Office Expense' },
    { label: 'Maintenance', value: 'Maintenance' },
    { label: 'Sampling', value: 'Sampling' },
    { label: 'Machine Repair', value: 'Machine Repair' },
    { label: 'Cutting', value: 'Cutting' },
    { label: 'Other', value: 'Other' }
];

export function getCategoriesByType(type) {
    return type === 'Income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
}

export function getAddTransactionSheetHTML(transaction = null, prefix = 'trans-') {
    const isEdit = !!transaction;
    
    const types = [
        { label: 'Income', value: 'Income' },
        { label: 'Expense', value: 'Expense' }
    ];
    
    const transactionType = isEdit ? transaction.type : 'Expense';
    const categories = getCategoriesByType(transactionType);

    const knownCategories = new Set(categories.map(c => c.value));
    const currentCat = isEdit ? (transaction.category || categories[0].value) : categories[0].value;
    const isOther = isEdit && !knownCategories.has(currentCat) || currentCat === 'Other';
    const selectedDropdownCat = isOther ? 'Other' : currentCat;
    const otherCustomValue = isOther && currentCat !== 'Other' ? currentCat : (isEdit ? (transaction.otherCategory || '') : '');

    const paymentMethods = [
        { label: 'UPI', value: 'UPI' },
        { label: 'Cash', value: 'Cash' },
        { label: 'Bank Transfer', value: 'Bank Transfer' },
        { label: 'Cheque', value: 'Cheque' },
        { label: 'Card', value: 'Card' }
    ];

    const statuses = [
        { label: 'Completed', value: 'Completed' },
        { label: 'Pending', value: 'Pending' },
        { label: 'Cancelled', value: 'Cancelled' }
    ];

    return `
        <div class="flex flex-col gap-4">
            <input type="hidden" id="${prefix}id" value="${isEdit ? transaction.id : ''}">
            
            <div class="grid grid-cols-2 gap-4">
                ${SelectInput({ label: 'Type', id: `${prefix}type`, options: types, value: transactionType, required: true })}
                ${TextInput({ label: 'Date', id: `${prefix}date`, type: 'date', value: isEdit ? transaction.date : new Date().toISOString().split('T')[0], required: true })}
            </div>

            ${TextInput({ label: 'Title', id: `${prefix}title`, placeholder: 'e.g. Fabric from Supplier X', value: isEdit ? transaction.title : '', required: true })}
            
            <div class="grid grid-cols-2 gap-4">
                ${TextInput({ label: 'Amount (₹)', id: `${prefix}amount`, type: 'number', step: '0.01', placeholder: '0.00', value: isEdit ? transaction.amount : '', required: true })}
                <div id="${prefix}category-container" class="searchable-select-wrapper overflow-visible">
                    ${SearchableSelectInput({ label: 'Category', id: `${prefix}category`, options: categories, value: selectedDropdownCat, required: true })}
                </div>
            </div>

            <div id="${prefix}other-category-container" class="${isOther ? '' : 'hidden'}">
                ${TextInput({ label: 'Specify Category Name', id: `${prefix}other-category`, placeholder: 'Enter custom category (e.g. Packaging, Utilities)', value: otherCustomValue })}
            </div>

            <div class="grid grid-cols-2 gap-4">
                ${SelectInput({ label: 'Payment Method', id: `${prefix}method`, options: paymentMethods, value: isEdit ? (transaction.paymentMethod || 'UPI') : 'UPI', required: true })}
                ${TextInput({ label: 'Reference No.', id: `${prefix}ref`, placeholder: 'Cheque/Txn ID', value: isEdit ? transaction.referenceNo : '' })}
            </div>

            ${SelectInput({ label: 'Status', id: `${prefix}status`, options: statuses, value: isEdit ? transaction.status : 'Completed', required: true })}
            
            ${TextareaInput({ label: 'Notes', id: `${prefix}notes`, placeholder: 'Additional details...', rows: 2, value: isEdit ? transaction.notes : '' })}

            <div class="bg-surface-container rounded-2xl p-4 flex items-center justify-center border border-dashed border-outline-variant text-secondary text-[13px] font-medium cursor-pointer active-bg">
                <span class="material-symbols-outlined mr-2 text-[18px]">attach_file</span> Attachments (Future Ready)
            </div>

            <div class="h-4"></div>
        </div>
    `;
}

export function getAddTransactionFooterHTML(isEdit = false) {
    const btnId = isEdit ? 'edit-trans-submit' : 'add-trans-submit';
    return `
        <button id="${btnId}" type="button" class="flex-1 bg-primary text-on-primary font-bold text-[15px] py-3.5 rounded-2xl active-scale transition-apple shadow-sm">
            ${isEdit ? 'Update Transaction' : 'Save Transaction'}
        </button>
    `;
}

export function getTransactionDetailsHeader(t) {
    if(!t) return '';
    const isIncome = t.type === 'Income';
    const color = isIncome ? 'text-[#008A00]' : 'text-error';

    // Sum subEntries into total displayed amount
    let subTotal = 0;
    if (t.subEntries) {
        try {
            const entries = typeof t.subEntries === 'string' ? JSON.parse(t.subEntries) : (Array.isArray(t.subEntries) ? t.subEntries : []);
            subTotal = entries.reduce((s, se) => s + parseFloat(se.amount || 0), 0);
        } catch { subTotal = 0; }
    }
    const displayAmount = parseFloat(t.amount) + subTotal;
    const amountStr = (isIncome ? '+' : '-') + '₹' + displayAmount.toLocaleString(undefined, {minimumFractionDigits:2});
    const hasAdds = subTotal > 0;
    const statusColor = t.status === 'Completed' ? 'bg-[#008A00]/10 text-[#008A00]' : (t.status === 'Pending' ? 'bg-[#FF9F0A]/10 text-[#FF9F0A]' : 'bg-surface-variant text-secondary');

    return `
        <div class="px-lg pb-md flex justify-between items-start border-b border-outline-variant/30">
            <div>
                <span class="text-[13px] font-bold text-secondary mb-1 block">${t.id}</span>
                <h2 class="text-[22px] font-bold text-on-surface leading-tight mb-2">${t.title}</h2>
                <span class="text-[24px] font-bold ${color}">${amountStr}</span>
                ${hasAdds ? `<span class="inline-block ml-1.5 text-[12px] text-secondary font-medium">(+\u20b9${subTotal.toLocaleString(undefined, {minimumFractionDigits:2})} adds)</span>` : ''}
                <span class="inline-block ml-3 px-3 py-1 rounded-full text-[12px] font-medium ${statusColor} align-text-bottom">${t.status}</span>
            </div>
            <div class="flex gap-2">
                <button onclick="window.editTransaction()" class="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center text-on-surface active-scale transition-apple" title="Edit">
                    <span class="material-symbols-outlined text-[18px]">edit</span>
                </button>
                <button onclick="window.duplicateTransaction()" class="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center text-on-surface active-scale transition-apple" title="Duplicate">
                    <span class="material-symbols-outlined text-[18px]">content_copy</span>
                </button>
                <button onclick="window.showConfirmation({title: 'Delete Transaction?', message: 'Are you sure? This cannot be undone.', confirmText: 'Delete', onConfirm: window.deleteTransaction})" class="w-8 h-8 rounded-full bg-error-container/30 flex items-center justify-center text-error active-scale transition-apple" title="Delete">
                    <span class="material-symbols-outlined text-[18px]">delete</span>
                </button>
                <button onclick="window.closeSheet('transactionDetailsSheet')" class="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center text-secondary active-scale transition-apple">
                    <span class="material-symbols-outlined text-[20px]">close</span>
                </button>
            </div>
        </div>
    `;
}


export function getTransactionDetailsContent(t) {
    if(!t) return '';
    const isExpense = t.type === 'Expense';

    // Parse subEntries (stored as JSON or already an array)
    let subEntries = [];
    if (t.subEntries) {
        try {
            subEntries = typeof t.subEntries === 'string' ? JSON.parse(t.subEntries) : (Array.isArray(t.subEntries) ? t.subEntries : []);
        } catch { subEntries = []; }
    }
    const hasSubEntries = subEntries.length > 0;

    // Build instalments timeline
    const instalmentsHTML = hasSubEntries ? `
        <div class="pt-4 border-t border-outline-variant/30">
            <div class="flex items-center justify-between mb-3">
                <span class="text-[12px] font-semibold text-secondary uppercase tracking-wider">Payment Instalments</span>
                <span class="text-[11px] font-bold px-2 py-0.5 rounded-full bg-error/10 text-error">${subEntries.length} entries</span>
            </div>
            <div class="flex flex-col gap-3">
                <!-- original entry -->
                <div class="flex items-start gap-3">
                    <div class="flex flex-col items-center shrink-0">
                        <div class="w-2.5 h-2.5 rounded-full bg-on-surface-variant mt-1"></div>
                        <div class="w-px flex-1 bg-outline-variant/50 mt-1 min-h-[16px]"></div>
                    </div>
                    <div class="flex-1 min-w-0 pb-2">
                        <div class="flex justify-between items-center">
                            <span class="text-[13px] font-semibold text-on-surface">Initial Entry</span>
                            <span class="text-[13px] font-bold text-on-surface">₹${parseFloat(t.amount).toLocaleString()}</span>
                        </div>
                        <span class="text-[11px] text-secondary">${t.date} · ${t.paymentMethod || 'N/A'}</span>
                    </div>
                </div>
                <!-- sub entries -->
                ${subEntries.map((se, idx) => `
                    <div class="flex items-start gap-3">
                        <div class="flex flex-col items-center shrink-0">
                            <div class="w-2.5 h-2.5 rounded-full bg-error mt-1"></div>
                            ${idx < subEntries.length - 1 ? '<div class="w-px flex-1 bg-outline-variant/50 mt-1 min-h-[16px]"></div>' : ''}
                        </div>
                        <div class="flex-1 min-w-0 pb-2">
                            <div class="flex justify-between items-center">
                                <span class="text-[13px] font-semibold text-error">${se.note || 'Additional Payment'}</span>
                                <span class="text-[13px] font-bold text-error">+₹${parseFloat(se.amount).toLocaleString()}</span>
                            </div>
                            <span class="text-[11px] text-secondary">${se.date} · ${se.paymentMethod || 'N/A'}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    ` : '';

    // Add Amount inline form (Expense only)
    const addAmountHTML = isExpense ? `
        <div class="pt-4 border-t border-outline-variant/30">
            <button
                id="toggle-add-amount-btn"
                onclick="window.toggleAddAmountForm('${t.id}')"
                class="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-outline-variant text-secondary text-[14px] font-semibold active-bg transition-apple hover:border-primary hover:text-primary"
            >
                <span class="material-symbols-outlined text-[18px]">add_circle</span>
                Add Amount to this Expense
            </button>

            <div id="add-amount-form" class="hidden mt-4 bg-surface-container/50 rounded-2xl p-4 border border-outline-variant flex flex-col gap-3">
                <p class="text-[13px] font-semibold text-on-surface">Log Additional Payment</p>

                <div class="grid grid-cols-2 gap-3">
                    <div class="flex flex-col gap-1">
                        <label class="text-[11px] font-semibold text-secondary uppercase tracking-wider">Amount (₹) *</label>
                        <input type="number" id="sub-amount" step="0.01" placeholder="0.00"
                            class="bg-surface border border-outline-variant rounded-xl px-3 py-2.5 text-[14px] text-on-surface outline-none focus:ring-2 focus:ring-primary/20 transition-apple" />
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="text-[11px] font-semibold text-secondary uppercase tracking-wider">Date *</label>
                        <input type="date" id="sub-date" value="${new Date().toISOString().split('T')[0]}"
                            class="bg-surface border border-outline-variant rounded-xl px-3 py-2.5 text-[14px] text-on-surface outline-none focus:ring-2 focus:ring-primary/20 transition-apple" />
                    </div>
                </div>

                <div class="flex flex-col gap-1">
                    <label class="text-[11px] font-semibold text-secondary uppercase tracking-wider">Note</label>
                    <input type="text" id="sub-note" placeholder="e.g. 2nd instalment, remaining balance..."
                        class="bg-surface border border-outline-variant rounded-xl px-3 py-2.5 text-[14px] text-on-surface outline-none focus:ring-2 focus:ring-primary/20 transition-apple" />
                </div>

                <div class="flex flex-col gap-1">
                    <label class="text-[11px] font-semibold text-secondary uppercase tracking-wider">Payment Method</label>
                    <select id="sub-method" class="bg-surface border border-outline-variant rounded-xl px-3 py-2.5 text-[14px] text-on-surface outline-none focus:ring-2 focus:ring-primary/20 transition-apple">
                        <option value="Cash">Cash</option>
                        <option value="UPI">UPI</option>
                        <option value="Bank Transfer" selected>Bank Transfer</option>
                        <option value="Cheque">Cheque</option>
                        <option value="Card">Card</option>
                    </select>
                </div>

                <div class="flex gap-2 pt-1">
                    <button onclick="window.toggleAddAmountForm('${t.id}')" class="flex-1 py-2.5 rounded-xl border border-outline-variant text-secondary text-[13px] font-semibold active-bg transition-apple">Cancel</button>
                    <button onclick="window.addExpenseSubEntry('${t.id}')" class="flex-[2] py-2.5 rounded-xl bg-error text-white text-[13px] font-bold active-scale transition-apple shadow-sm">
                        <span class="material-symbols-outlined text-[16px] align-middle mr-1">add</span> Save Payment
                    </button>
                </div>
            </div>
        </div>
    ` : '';

    return `
        <div class="p-4 space-y-6">
            <div class="grid grid-cols-2 gap-y-6">
                <div>
                    <span class="block text-[12px] text-secondary mb-1">Date</span>
                    <span class="block text-[14px] font-medium text-on-surface">${t.date}</span>
                </div>
                <div>
                    <span class="block text-[12px] text-secondary mb-1">Category</span>
                    <span class="block text-[14px] font-medium text-on-surface">${t.category}</span>
                </div>
                <div>
                    <span class="block text-[12px] text-secondary mb-1">Payment Method</span>
                    <span class="block text-[14px] font-medium text-on-surface">${t.paymentMethod}</span>
                </div>
                <div>
                    <span class="block text-[12px] text-secondary mb-1">Reference No.</span>
                    <span class="block text-[14px] font-medium text-on-surface">${t.referenceNo || '--'}</span>
                </div>
                <div>
                    <span class="block text-[12px] text-secondary mb-1">Created By</span>
                    <span class="block text-[14px] font-medium text-on-surface">${t.createdBy || 'Admin'}</span>
                </div>
                <div>
                    <span class="block text-[12px] text-secondary mb-1">Created At</span>
                    <span class="block text-[14px] font-medium text-on-surface">${t.createdAt ? t.createdAt.split('T')[0] : '--'}</span>
                </div>
            </div>

            ${instalmentsHTML}

            ${addAmountHTML}

            <div class="pt-4 border-t border-outline-variant/30">
                <div class="flex justify-between items-center mb-2">
                    <span class="block text-[12px] text-secondary">Notes</span>
                    <button id="save-detail-notes-btn" onclick="window.saveDetailNotes('${t.id}')" class="text-[12px] text-primary font-bold hover:underline hidden">Save</button>
                </div>
                <textarea id="detail-notes-input" class="w-full bg-surface border border-outline-variant rounded-xl px-3 py-2 text-[14px] text-on-surface focus:ring-2 focus:ring-primary/20 outline-none resize-none transition-apple placeholder:text-secondary/60" placeholder="Add notes..." rows="3" oninput="document.getElementById('save-detail-notes-btn').classList.remove('hidden')">${t.notes || ''}</textarea>
            </div>

            <div class="pt-4 border-t border-outline-variant/30">
                <span class="block text-[12px] text-secondary mb-4">Audit History</span>
                <div class="flex gap-3 mb-3">
                    <div class="w-2 h-2 rounded-full bg-surface-variant mt-1.5 shrink-0"></div>
                    <div>
                        <p class="text-[13px] text-on-surface">Transaction created by Admin</p>
                        <span class="text-[11px] text-secondary">${t.createdAt || t.date}</span>
                    </div>
                </div>
            </div>
            
            <div class="h-10"></div>
        </div>
    `;
}


export function getFilterSheetHTML(currentFilters = {}) {
    const types = [
        { label: 'All Types', value: 'all' },
        { label: 'Income', value: 'Income' },
        { label: 'Expense', value: 'Expense' }
    ];
    
    const statuses = [
        { label: 'All Statuses', value: 'all' },
        { label: 'Completed', value: 'Completed' },
        { label: 'Pending', value: 'Pending' },
        { label: 'Cancelled', value: 'Cancelled' }
    ];

    const methods = [
        { label: 'All Methods', value: 'all' },
        { label: 'Cash', value: 'Cash' },
        { label: 'UPI', value: 'UPI' },
        { label: 'Bank Transfer', value: 'Bank Transfer' },
        { label: 'Cheque', value: 'Cheque' },
        { label: 'Card', value: 'Card' }
    ];

    const dateRanges = [
        { label: 'All Time', value: 'all' },
        { label: 'Today', value: 'today' },
        { label: 'This Week', value: 'this_week' },
        { label: 'This Month', value: 'this_month' },
        { label: 'Custom Range', value: 'custom' }
    ];

    return `
        <div class="flex flex-col gap-4">
            ${SelectInput({ label: 'Transaction Type', id: 'filter-type', options: types, value: currentFilters.type || 'all' })}
            ${SelectInput({ label: 'Status', id: 'filter-status', options: statuses, value: currentFilters.status || 'all' })}
            ${SelectInput({ label: 'Payment Method', id: 'filter-method', options: methods, value: currentFilters.paymentMethod || 'all' })}
            ${SelectInput({ label: 'Date Range', id: 'filter-date', options: dateRanges, value: currentFilters.dateRange || 'all' })}
            <div class="h-4"></div>
        </div>
    `;
}

export function getFilterFooterHTML() {
    return `
        <div class="flex gap-3 w-full">
            <button onclick="window.clearFilters()" class="flex-1 py-3.5 rounded-2xl border border-outline-variant text-on-surface font-semibold text-[15px] active-bg transition-colors">
                Clear
            </button>
            <button onclick="window.applyFilters()" class="flex-[2] bg-primary text-on-primary font-bold text-[15px] py-3.5 rounded-2xl active-scale transition-apple shadow-sm">
                Apply Filters
            </button>
        </div>
    `;
}

// ─── Custom Date Range Sheet ──────────────────────────────────────────────────

export function getCustomDateSheetHTML(initialStart = '', initialEnd = '') {
    const todayStr = new Date().toISOString().split('T')[0];
    const defaultStart = initialStart || (() => {
        const d = new Date();
        d.setDate(1);
        return d.toISOString().split('T')[0];
    })();
    const defaultEnd = initialEnd || todayStr;

    return `
        <div class="flex flex-col gap-4">
            <!-- Quick Presets -->
            <div>
                <p class="text-[12px] font-semibold text-secondary uppercase tracking-wider mb-2">Quick Presets</p>
                <div class="flex flex-wrap gap-1.5" id="custom-date-presets">
                    <button type="button" class="preset-pill px-3 py-1.5 rounded-xl border border-outline-variant text-[12px] font-medium text-on-surface hover:bg-surface-variant active-scale transition-apple" data-preset="today">Today</button>
                    <button type="button" class="preset-pill px-3 py-1.5 rounded-xl border border-outline-variant text-[12px] font-medium text-on-surface hover:bg-surface-variant active-scale transition-apple" data-preset="7d">Last 7 Days</button>
                    <button type="button" class="preset-pill px-3 py-1.5 rounded-xl border border-outline-variant text-[12px] font-medium text-on-surface hover:bg-surface-variant active-scale transition-apple" data-preset="30d">Last 30 Days</button>
                    <button type="button" class="preset-pill px-3 py-1.5 rounded-xl border border-outline-variant text-[12px] font-medium text-on-surface hover:bg-surface-variant active-scale transition-apple" data-preset="this_month">This Month</button>
                    <button type="button" class="preset-pill px-3 py-1.5 rounded-xl border border-outline-variant text-[12px] font-medium text-on-surface hover:bg-surface-variant active-scale transition-apple" data-preset="last_month">Last Month</button>
                    <button type="button" class="preset-pill px-3 py-1.5 rounded-xl border border-outline-variant text-[12px] font-medium text-on-surface hover:bg-surface-variant active-scale transition-apple" data-preset="90d">Last 90 Days</button>
                </div>
            </div>

            <!-- Date Pickers (From / To) -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div class="flex flex-col gap-1.5">
                    <label class="text-[12px] font-semibold text-secondary uppercase tracking-wider" for="custom-date-start">
                        From Date
                    </label>
                    <div class="relative">
                        <span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary text-[18px]">calendar_month</span>
                        <input type="date" id="custom-date-start" value="${defaultStart}" max="${todayStr}"
                               class="w-full bg-surface border border-outline-variant rounded-xl pl-10 pr-3 py-3 text-[15px] font-medium text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-apple">
                    </div>
                </div>
                <div class="flex flex-col gap-1.5">
                    <label class="text-[12px] font-semibold text-secondary uppercase tracking-wider" for="custom-date-end">
                        To Date
                    </label>
                    <div class="relative">
                        <span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary text-[18px]">event_available</span>
                        <input type="date" id="custom-date-end" value="${defaultEnd}" max="${todayStr}"
                               class="w-full bg-surface border border-outline-variant rounded-xl pl-10 pr-3 py-3 text-[15px] font-medium text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-apple">
                    </div>
                </div>
            </div>

            <!-- Dynamic Selection Summary -->
            <div id="custom-date-summary-box" class="p-3 rounded-2xl bg-surface-container/60 border border-outline-variant/60 flex items-center gap-3">
                <div class="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <span class="material-symbols-outlined text-[18px]">date_range</span>
                </div>
                <div class="flex-1 min-w-0">
                    <p id="custom-date-summary-text" class="text-[13px] font-semibold text-on-surface truncate">Range selected</p>
                    <p id="custom-date-duration-text" class="text-[11px] text-secondary">Calculating duration...</p>
                </div>
            </div>

            <!-- Validation Error Display -->
            <div id="custom-date-error-box" class="hidden p-3 rounded-2xl bg-error/10 border border-error/20 flex items-center gap-2.5 text-error text-[13px] font-medium">
                <span class="material-symbols-outlined text-[18px]">error</span>
                <span id="custom-date-error-text">From Date cannot be later than To Date</span>
            </div>

            <!-- Scope Options -->
            <label class="flex items-center gap-3 p-3.5 rounded-2xl bg-surface-container-lowest border border-outline-variant cursor-pointer active:bg-surface-container/50 transition-apple select-none">
                <input type="checkbox" id="custom-date-apply-list" checked
                       class="w-4 h-4 rounded text-primary focus:ring-primary/20 border-outline-variant accent-primary cursor-pointer">
                <div class="flex flex-col">
                    <span class="text-[14px] font-semibold text-on-surface">Filter Transaction List as well</span>
                    <span class="text-[12px] text-secondary">Keep recent transactions in sync with this date window</span>
                </div>
            </label>

            <div class="h-2"></div>
        </div>
    `;
}

export function getCustomDateFooterHTML() {
    return `
        <div class="flex gap-3 w-full">
            <button type="button" onclick="window.clearCustomDateFilter()" class="flex-1 py-3.5 rounded-2xl border border-outline-variant text-on-surface font-semibold text-[15px] active-bg transition-apple">
                Reset to 7D
            </button>
            <button type="button" id="custom-date-apply-btn" onclick="window.applyCustomDateFilter()" class="flex-[2] bg-primary text-on-primary font-bold text-[15px] py-3.5 rounded-2xl active-scale transition-apple shadow-sm flex items-center justify-center gap-2">
                <span class="material-symbols-outlined text-[18px]">check</span>
                Apply Range
            </button>
        </div>
    `;
}

// ─── Category Breakdown Sheet ─────────────────────────────────────────────────

export function getCategoryBreakdownSheetContent(category, txns, totalExpenses) {
    const fmt = n => '₹' + parseFloat(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // Filter & sort transactions for this category
    const catTxns = txns
        .filter(t => t.type === 'Expense' && (t.category || 'Other') === category)
        .sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount));

    const catTotal = catTxns.reduce((s, t) => {
        let sub = 0;
        if (t.subEntries) {
            try {
                const entries = typeof t.subEntries === 'string' ? JSON.parse(t.subEntries) : (Array.isArray(t.subEntries) ? t.subEntries : []);
                sub = entries.reduce((ss, se) => ss + parseFloat(se.amount || 0), 0);
            } catch { sub = 0; }
        }
        return s + parseFloat(t.amount) + sub;
    }, 0);

    const pct = totalExpenses > 0 ? Math.round((catTotal / totalExpenses) * 100) : 0;
    const biggest = catTxns[0];
    const biggestTotal = biggest ? (() => {
        let sub = 0;
        if (biggest.subEntries) {
            try {
                const entries = typeof biggest.subEntries === 'string' ? JSON.parse(biggest.subEntries) : (Array.isArray(biggest.subEntries) ? biggest.subEntries : []);
                sub = entries.reduce((ss, se) => ss + parseFloat(se.amount || 0), 0);
            } catch { sub = 0; }
        }
        return parseFloat(biggest.amount) + sub;
    })() : 0;

    const insightText = catTxns.length === 0
        ? `No ${category} expenses in this period.`
        : catTxns.length === 1
            ? `${category} has ${pct}% share of total expenses. Only one transaction logged — ${fmt(biggestTotal)} on ${biggest.date}.`
            : `${category} accounts for ${pct}% of your total expenses (${catTxns.length} transactions). The biggest single charge was ${fmt(biggestTotal)} on ${biggest.date}.`;

    const txnRows = catTxns.map(t => {
        let sub = 0;
        let subCount = 0;
        if (t.subEntries) {
            try {
                const entries = typeof t.subEntries === 'string' ? JSON.parse(t.subEntries) : (Array.isArray(t.subEntries) ? t.subEntries : []);
                sub = entries.reduce((ss, se) => ss + parseFloat(se.amount || 0), 0);
                subCount = entries.length;
            } catch { sub = 0; }
        }
        const tTotal = parseFloat(t.amount) + sub;
        const statusColor = t.status === 'Completed' ? 'bg-[#008A00]/10 text-[#008A00]' : (t.status === 'Pending' ? 'bg-[#FF9F0A]/10 text-[#FF9F0A]' : 'bg-surface-variant text-secondary');

        return `
            <div
                onclick="window.closeSheet('categoryBreakdownSheet'); setTimeout(() => window.openTransactionDetails('${t.id}'), 200);"
                class="flex items-center gap-3 py-3 px-3 rounded-2xl active-bg transition-apple cursor-pointer border border-transparent hover:border-outline-variant"
            >
                <div class="w-10 h-10 rounded-xl bg-error/10 flex items-center justify-center shrink-0">
                    <span class="material-symbols-outlined text-error text-[18px]">payments</span>
                </div>
                <div class="flex-1 min-w-0">
                    <p class="text-[14px] font-semibold text-on-surface truncate">${t.title}</p>
                    <div class="flex items-center gap-2 mt-0.5">
                        <span class="text-[11px] text-secondary">${t.date}</span>
                        ${t.paymentMethod ? `<span class="text-[10px] font-medium text-secondary bg-surface-variant px-1.5 py-0.5 rounded-md">${t.paymentMethod}</span>` : ''}
                        ${subCount > 0 ? `<span class="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-md">${subCount} adds</span>` : ''}
                    </div>
                    ${t.notes ? `<p class="text-[11px] text-secondary italic mt-0.5 truncate">${t.notes}</p>` : ''}
                </div>
                <div class="text-right shrink-0">
                    <p class="text-[15px] font-bold text-error">-${fmt(tTotal)}</p>
                    ${subCount > 0 ? `<p class="text-[10px] text-secondary">${fmt(parseFloat(t.amount))} + adds</p>` : ''}
                </div>
            </div>
        `;
    }).join('');

    return `
        <div class="flex flex-col">
            <!-- Insight card -->
            <div class="mx-4 mt-4 mb-2 bg-error/5 border border-error/15 rounded-2xl p-4 flex gap-3">
                <div class="w-8 h-8 rounded-xl bg-error/10 flex items-center justify-center shrink-0 mt-0.5">
                    <span class="material-symbols-outlined text-error text-[18px]">auto_awesome</span>
                </div>
                <p class="text-[13px] text-on-surface leading-relaxed">${insightText}</p>
            </div>

            <!-- Stats row -->
            <div class="mx-4 grid grid-cols-3 gap-3 mb-4">
                <div class="bg-surface-container rounded-2xl p-3 text-center">
                    <p class="text-[20px] font-bold text-error">${pct}%</p>
                    <p class="text-[10px] text-secondary font-medium mt-0.5">of expenses</p>
                </div>
                <div class="bg-surface-container rounded-2xl p-3 text-center">
                    <p class="text-[20px] font-bold text-on-surface">${catTxns.length}</p>
                    <p class="text-[10px] text-secondary font-medium mt-0.5">transactions</p>
                </div>
                <div class="bg-surface-container rounded-2xl p-3 text-center">
                    <p class="text-[13px] font-bold text-on-surface leading-tight">${fmt(catTotal)}</p>
                    <p class="text-[10px] text-secondary font-medium mt-0.5">total spent</p>
                </div>
            </div>

            <!-- Transaction list -->
            <div class="px-4 mb-2">
                <p class="text-[12px] font-semibold text-secondary uppercase tracking-wider mb-2">Transactions</p>
                ${catTxns.length === 0
                    ? `<div class="py-8 flex flex-col items-center text-secondary"><span class="material-symbols-outlined text-[40px] mb-2 opacity-40">receipt_long</span><p class="text-[14px]">No transactions in this period</p></div>`
                    : `<div class="flex flex-col divide-y divide-outline-variant/30">${txnRows}</div>`
                }
            </div>

            <div class="h-8"></div>
        </div>
    `;
}
