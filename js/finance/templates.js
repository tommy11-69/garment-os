import { SelectInput, TextInput, TextareaInput } from '../components/inputs.js';

export function getAddTransactionSheetHTML() {
    return `
        <div class="flex flex-col gap-4">
            ${SelectInput({ label: 'Transaction Type', id: 'add-trans-type', options: [
                {label: 'Income (Money In)', value: 'in'},
                {label: 'Expense (Money Out)', value: 'out'}
            ], required: true })}
            ${TextInput({ label: 'Amount', id: 'add-trans-amount', type: 'number', placeholder: '$0.00', required: true, validationType: 'positive', min: '0.01', step: '0.01' })}
            <div class="grid grid-cols-2 gap-4">
                ${SelectInput({ label: 'Category', id: 'add-trans-cat', options: [
                    {label: 'Sales Revenue'}, {label: 'Advance Payment'}, {label: 'Raw Materials'}, {label: 'Salary'}, {label: 'Utilities'}
                ], required: true })}
                ${TextInput({ label: 'Date', id: 'add-trans-date', type: 'date', required: true })}
            </div>
            ${TextInput({ label: 'Party / Vendor / Customer', id: 'add-trans-party', placeholder: 'e.g. Chennai Silks' })}
            ${TextInput({ label: 'Link Order (Optional)', id: 'add-trans-order', placeholder: 'e.g. ORD-992' })}
            ${TextareaInput({ label: 'Notes', id: 'add-trans-notes', rows: 2 })}
            <div class="h-4"></div>
        </div>
    `;
}

export function getAddTransactionFooterHTML() {
    return `
        <button id="add-trans-submit" onclick="window.closeSheet('addTransactionSheet'); window.showToast('Transaction recorded', 'success')" class="w-full bg-primary text-on-primary font-bold text-[16px] py-4 rounded-2xl active-scale transition-apple shadow-sm">
            Save Transaction
        </button>
    `;
}

export function getTransferFundsSheetHTML() {
    return `
        <div class="flex gap-4">
            <div class="flex-1">
                ${SelectInput({ label: 'From Account', id: 'tr-from', options: [{label: 'Main Bank Account'}] })}
            </div>
            <div class="flex-1">
                ${SelectInput({ label: 'To Account', id: 'tr-to', options: [{label: 'Petty Cash'}] })}
            </div>
        </div>
        ${TextInput({ label: 'Amount', id: 'tr-amount', type: 'number', placeholder: '$0.00', required: true, validationType: 'positive', min: '0.01', step: '0.01' })}
        ${TextInput({ label: 'Date', id: 'tr-date', type: 'date', required: true })}
        ${TextareaInput({ label: 'Notes', id: 'tr-notes', rows: 2 })}
        <div class="h-10"></div>
    `;
}

export function getTransferFundsFooterHTML() {
    return `
        <button id="tr-funds-submit" onclick="window.closeSheet('transferFundsSheet'); window.showToast('Funds transferred', 'success')" class="w-full bg-primary text-on-primary font-bold text-[16px] py-4 rounded-2xl active-scale transition-apple shadow-sm">
            Transfer
        </button>
    `;
}

export function getTransactionDetailsHeader(txn) {
    if (!txn) return '';
    return `
    <div class="px-lg pb-md flex justify-between items-start border-b border-outline-variant/30">
        <div>
            <span class="text-[13px] font-bold text-secondary mb-1 block">${txn.type} • ${txn.date}</span>
            <h2 class="text-[22px] font-bold text-on-surface leading-tight">${txn.party}</h2>
        </div>
        <div class="flex gap-2">
            <button onclick="window.closeSheet('transactionDetailsSheet')" class="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center text-secondary active-scale transition-apple">
                <span class="material-symbols-outlined text-[20px]">close</span>
            </button>
        </div>
    </div>`;
}

export function getTransactionDetailsContent(txn) {
    if (!txn) return '';
    const isIncome = txn.amount.startsWith('+');
    const colorClass = isIncome ? 'text-success' : 'text-on-surface';
    return `
        <div class="bg-surface-container-lowest p-6 rounded-[24px] border border-outline-variant shadow-sm text-center mb-2">
            <span class="text-[32px] font-bold ${colorClass}">${txn.amount}</span>
            <span class="block text-[14px] text-secondary mt-1">Ref: ${txn.id}</span>
        </div>
        <div class="flex flex-col gap-4 p-4">
            <div class="flex justify-between border-b border-outline-variant/30 pb-3">
                <span class="text-secondary text-[14px]">Category</span>
                <span class="text-on-surface font-semibold text-[15px]">${txn.type}</span>
            </div>
            <div class="flex justify-between border-b border-outline-variant/30 pb-3">
                <span class="text-secondary text-[14px]">Associated Order</span>
                <span class="text-primary font-semibold text-[15px]">${txn.orderId || 'None'}</span>
            </div>
            <div class="flex justify-between border-b border-outline-variant/30 pb-3">
                <span class="text-secondary text-[14px]">Date</span>
                <span class="text-on-surface font-semibold text-[15px]">${txn.date}</span>
            </div>
            <div class="flex flex-col gap-1 pt-2">
                <span class="text-secondary text-[14px]">Status</span>
                <span class="text-on-surface text-[15px]">${txn.status}</span>
            </div>
        </div>
        <div class="h-10"></div>
    `;
}

export function getTransactionDetailsFooter(txn) {
    return `
        <button class="flex-1 bg-surface-container-high text-on-surface font-bold text-[15px] py-3.5 rounded-2xl active-scale transition-apple">
            Download Receipt
        </button>
        <button class="flex-1 bg-error-container/30 text-error font-bold text-[15px] py-3.5 rounded-2xl active-scale transition-apple">
            Reverse Transaction
        </button>
    `;
}
