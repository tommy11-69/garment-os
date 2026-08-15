import { TextInput, SelectInput, TextareaInput } from '../components/inputs.js';

export function getAddTransactionSheetHTML(transaction = null) {
    const isEdit = !!transaction;
    
    const types = [
        { label: 'Income', value: 'Income' },
        { label: 'Expense', value: 'Expense' }
    ];
    
    const categories = [
        { label: 'Fabric Purchase', value: 'Fabric Purchase' },
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
        { label: 'Customer Payment', value: 'Customer Payment' },
        { label: 'Advance Received', value: 'Advance Received' },
        { label: 'Order Payment', value: 'Order Payment' },
        { label: 'Refund Received', value: 'Refund Received' },
        { label: 'Investment', value: 'Investment' },
        { label: 'Other', value: 'Other' }
    ];

    const paymentMethods = [
        { label: 'Cash', value: 'Cash' },
        { label: 'UPI', value: 'UPI' },
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
            <input type="hidden" id="trans-id" value="${isEdit ? transaction.id : ''}">
            
            <div class="grid grid-cols-2 gap-4">
                ${SelectInput({ label: 'Type', id: 'trans-type', options: types, value: isEdit ? transaction.type : 'Expense', required: true })}
                ${TextInput({ label: 'Date', id: 'trans-date', type: 'date', value: isEdit ? transaction.date : new Date().toISOString().split('T')[0], required: true })}
            </div>

            ${TextInput({ label: 'Title', id: 'trans-title', placeholder: 'e.g. Fabric from Supplier X', value: isEdit ? transaction.title : '', required: true })}
            
            <div class="grid grid-cols-2 gap-4">
                ${TextInput({ label: 'Amount (₹)', id: 'trans-amount', type: 'number', step: '0.01', placeholder: '0.00', value: isEdit ? transaction.amount : '', required: true })}
                ${SelectInput({ label: 'Category', id: 'trans-category', options: categories, value: isEdit ? transaction.category : 'Fabric Purchase', required: true })}
            </div>

            <div class="grid grid-cols-2 gap-4">
                ${SelectInput({ label: 'Payment Method', id: 'trans-method', options: paymentMethods, value: isEdit ? transaction.paymentMethod : 'Bank Transfer', required: true })}
                ${TextInput({ label: 'Reference No.', id: 'trans-ref', placeholder: 'Cheque/Txn ID', value: isEdit ? transaction.referenceNo : '' })}
            </div>

            ${SelectInput({ label: 'Status', id: 'trans-status', options: statuses, value: isEdit ? transaction.status : 'Completed', required: true })}
            
            ${TextareaInput({ label: 'Notes', id: 'trans-notes', placeholder: 'Additional details...', rows: 2, value: isEdit ? transaction.notes : '' })}

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
    const amountStr = (isIncome ? '+' : '-') + '₹' + parseFloat(t.amount).toLocaleString(undefined, {minimumFractionDigits:2});
    const statusColor = t.status === 'Completed' ? 'bg-[#008A00]/10 text-[#008A00]' : (t.status === 'Pending' ? 'bg-[#FF9F0A]/10 text-[#FF9F0A]' : 'bg-surface-variant text-secondary');

    return `
        <div class="px-lg pb-md flex justify-between items-start border-b border-outline-variant/30">
            <div>
                <span class="text-[13px] font-bold text-secondary mb-1 block">${t.id}</span>
                <h2 class="text-[22px] font-bold text-on-surface leading-tight mb-2">${t.title}</h2>
                <span class="text-[24px] font-bold ${color}">${amountStr}</span>
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

            ${t.notes ? `
            <div class="pt-4 border-t border-outline-variant/30">
                <span class="block text-[12px] text-secondary mb-2">Notes</span>
                <p class="text-[14px] text-on-surface leading-relaxed whitespace-pre-wrap">${t.notes}</p>
            </div>` : ''}

            <div class="pt-4 border-t border-outline-variant/30">
                <span class="block text-[12px] text-secondary mb-4">Audit History (Placeholder)</span>
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
        { label: 'This Month', value: 'this_month' }
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
