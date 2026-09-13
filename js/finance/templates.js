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

export function FormSegmentedControl({ id, options = [], value = '' }) {
    const tabs = options.map(opt => {
        const isActive = opt.value === value;
        return `
            <button type="button" 
                class="flex-1 py-2 text-[14px] font-bold rounded-xl transition-all ${isActive ? 'bg-surface shadow-sm text-on-surface' : 'text-secondary hover:text-on-surface'}"
                onclick="document.getElementById('${id}').value='${opt.value}'; this.parentElement.querySelectorAll('button').forEach(b => { b.classList.remove('bg-surface', 'shadow-sm', 'text-on-surface'); b.classList.add('text-secondary'); }); this.classList.remove('text-secondary'); this.classList.add('bg-surface', 'shadow-sm', 'text-on-surface'); document.getElementById('${id}').dispatchEvent(new Event('change', { bubbles: true }));">
                ${opt.label}
            </button>
        `;
    }).join('');

    return `
    <div class="flex bg-surface-container-lowest p-1.5 rounded-[16px] border border-outline-variant w-full relative mb-2">
        <input type="hidden" id="${id}" value="${value}">
        ${tabs}
    </div>`;
}

export function HeroAmountInput({ id, value = '' }) {
    return `
    <div class="flex flex-col items-center justify-center py-6 mb-2">
        <label class="text-[12px] font-bold text-secondary uppercase tracking-widest mb-3">Amount</label>
        <div class="relative flex items-center justify-center">
            <span class="text-[36px] font-bold text-on-surface mr-1 -mt-1">₹</span>
            <input type="number" step="0.01" id="${id}" value="${value}" required placeholder="0.00"
                   class="bg-transparent border-none outline-none focus:ring-0 text-[56px] font-bold text-on-surface text-center w-full max-w-[240px] placeholder:text-outline-variant/50 tracking-tight p-0 [&::-webkit-inner-spin-button]:appearance-none"
                   style="-moz-appearance: textfield;">
        </div>
    </div>`;
}

export function RadioPillsInput({ label, id, options = [], value = '' }) {
    const pills = options.map(opt => {
        const isActive = opt.value === value;
        let colorClass = 'bg-primary border-primary text-white';
        let inactiveColorClass = 'bg-surface-container-lowest border-outline-variant text-secondary hover:border-primary/50';
        
        if (opt.value === 'Completed') colorClass = 'bg-[#008A00] border-[#008A00] text-white';
        if (opt.value === 'Pending') colorClass = 'bg-[#FF9F0A] border-[#FF9F0A] text-white';
        if (opt.value === 'Cancelled') colorClass = 'bg-error border-error text-white';

        return `
            <button type="button" 
                class="px-4 py-2 text-[13px] font-bold rounded-xl border transition-all ${isActive ? colorClass : inactiveColorClass}"
                data-val="${opt.value}"
                onclick="
                    document.getElementById('${id}').value='${opt.value}'; 
                    const container = this.closest('.radio-pills-container');
                    container.querySelectorAll('button').forEach(b => { 
                        b.className = 'px-4 py-2 text-[13px] font-bold rounded-xl border transition-all bg-surface-container-lowest border-outline-variant text-secondary hover:border-primary/50'; 
                    }); 
                    this.className = 'px-4 py-2 text-[13px] font-bold rounded-xl border transition-all ${colorClass.replace(/'/g, "\\'")}';
                    document.getElementById('${id}').dispatchEvent(new Event('change', { bubbles: true }));
                ">
                ${opt.label}
            </button>
        `;
    }).join('');

    return `
    <div class="flex flex-col gap-2.5 relative group radio-pills-container mt-1">
        <label class="text-[14px] font-semibold text-on-surface">${label}</label>
        <input type="hidden" id="${id}" value="${value}">
        <div class="flex flex-wrap gap-2">
            ${pills}
        </div>
    </div>`;
}

export function getAddTransactionSheetHTML(transaction = null, prefix = 'trans-', parties = { customers: [], vendors: [] }) {
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

    const partiesList = transactionType === 'Income' ? parties.customers : parties.vendors;
    const partyOptions = partiesList ? partiesList.map(p => ({ label: p.name, value: p.id })) : [];
    partyOptions.unshift({ label: 'None', value: '' });
    const currentParty = isEdit ? (transaction.refId || '') : '';

    return `
        <div class="flex flex-col gap-4 px-1">
            <input type="hidden" id="${prefix}id" value="${isEdit ? transaction.id : ''}">
            
            ${FormSegmentedControl({ id: `${prefix}type`, options: types, value: transactionType })}
            
            ${HeroAmountInput({ id: `${prefix}amount`, value: isEdit ? transaction.amount : '' })}

            ${TextInput({ label: 'Title', id: `${prefix}title`, placeholder: 'What was this for?', value: isEdit ? transaction.title : '', required: true })}
            
            <div id="${prefix}party-container" class="searchable-select-wrapper overflow-visible">
                ${SearchableSelectInput({ label: transactionType === 'Income' ? 'Customer (Optional)' : 'Vendor (Optional)', id: `${prefix}refId`, options: partyOptions, value: currentParty })}
            </div>
            
            <div class="grid grid-cols-2 gap-4">
                ${TextInput({ label: 'Date', id: `${prefix}date`, type: 'date', value: isEdit ? transaction.date : new Date().toISOString().split('T')[0], required: true })}
                <div id="${prefix}category-container" class="searchable-select-wrapper overflow-visible">
                    ${SearchableSelectInput({ label: 'Category', id: `${prefix}category`, options: categories, value: selectedDropdownCat, required: true })}
                </div>
            </div>

            <div id="${prefix}other-category-container" class="${isOther ? '' : 'hidden'}">
                ${TextInput({ label: 'Specify Category Name', id: `${prefix}other-category`, placeholder: 'e.g. Packaging, Utilities', value: otherCustomValue })}
            </div>

            ${RadioPillsInput({ label: 'Payment Method', id: `${prefix}method`, options: paymentMethods, value: isEdit ? (transaction.paymentMethod || 'UPI') : 'UPI' })}
            
            ${RadioPillsInput({ label: 'Status', id: `${prefix}status`, options: statuses, value: isEdit ? transaction.status : 'Completed' })}
            
            <div class="grid grid-cols-1 gap-4 mt-2">
                ${TextInput({ label: 'Reference No.', id: `${prefix}ref`, placeholder: 'Cheque/Txn ID', value: isEdit ? transaction.referenceNo : '' })}
            </div>

            ${TextareaInput({ label: 'Notes', id: `${prefix}notes`, placeholder: 'Additional details...', rows: 2, value: isEdit ? transaction.notes : '' })}

            <div class="bg-surface-container rounded-2xl p-4 flex items-center justify-center border border-dashed border-outline-variant text-secondary text-[13px] font-medium cursor-pointer active-bg mt-2">
                <span class="material-symbols-outlined mr-2 text-[18px]">attach_file</span> Attachments (Future Ready)
            </div>

            <div class="h-2"></div>
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

export function getBalanceSheetDetailHTML(type, items = [], parties = { customers: [], vendors: [] }, runningBalanceData = null) {
    const fmt = (n) => '₹' + parseFloat(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    const today = new Date();
    const daysSince = (dateStr) => Math.floor((today - new Date(dateStr)) / 86400000);

    // ── 1. CASH LEDGER ──────────────────────────────────────────────────────
    if (type === 'cash') {
        const sorted = [...items].sort((a, b) => {
            const diff = new Date(a.date) - new Date(b.date);
            if (diff !== 0) return diff;
            return String(a.id).localeCompare(String(b.id));
        });
        let balance = runningBalanceData?.openingBalance || 0;
        const openingBalance = balance;

        const rows = sorted.map(t => {
            const amount = parseFloat(t.amount || 0);
            const isIncome = t.type === 'Income';
            const debit = isIncome ? 0 : amount;
            const credit = isIncome ? amount : 0;
            balance += isIncome ? amount : -amount;
            return { ...t, debit, credit, balance };
        });

        const closingBalance = rows.length > 0 ? rows[rows.length - 1].balance : openingBalance;
        const totalDebits   = rows.reduce((s, r) => s + r.debit, 0);
        const totalCredits  = rows.reduce((s, r) => s + r.credit, 0);

        return `
        <div class="flex flex-col h-full">
            <!-- Summary bar -->
            <div class="px-4 py-3 bg-surface-variant/40 border-b border-outline-variant/30 grid grid-cols-3 gap-2 text-center shrink-0">
                <div>
                    <p class="text-[9px] font-bold text-secondary uppercase tracking-wider">Closing Balance</p>
                    <p class="text-[14px] font-extrabold ${closingBalance >= 0 ? 'text-on-surface' : 'text-error'}">${fmt(closingBalance)}</p>
                </div>
                <div class="border-x border-outline-variant/30">
                    <p class="text-[9px] font-bold text-secondary uppercase tracking-wider">Total In ↓</p>
                    <p class="text-[14px] font-extrabold text-[#008A00]">${fmt(totalCredits)}</p>
                </div>
                <div>
                    <p class="text-[9px] font-bold text-secondary uppercase tracking-wider">Total Out ↑</p>
                    <p class="text-[14px] font-extrabold text-error">${fmt(totalDebits)}</p>
                </div>
            </div>
            <!-- Scrollable table -->
            <div class="overflow-auto flex-1">
                <table class="w-full text-left border-collapse" style="min-width:520px">
                    <thead class="sticky top-0 bg-surface z-10 shadow-sm">
                        <tr class="border-b-2 border-outline-variant/50">
                            <th class="px-3 py-2.5 text-[9px] font-bold text-secondary uppercase tracking-wider w-[80px]">Date</th>
                            <th class="px-3 py-2.5 text-[9px] font-bold text-secondary uppercase tracking-wider">Description</th>
                            <th class="px-3 py-2.5 text-[9px] font-bold text-error uppercase tracking-wider text-right w-[90px]">Debit (−)</th>
                            <th class="px-3 py-2.5 text-[9px] font-bold text-[#008A00] uppercase tracking-wider text-right w-[90px]">Credit (+)</th>
                            <th class="px-3 py-2.5 text-[9px] font-bold text-secondary uppercase tracking-wider text-right w-[100px]">Balance</th>
                        </tr>
                        <tr class="bg-surface-variant/30 border-b border-outline-variant/20">
                            <td class="px-3 py-2 text-[10px] text-secondary">—</td>
                            <td class="px-3 py-2 text-[11px] font-bold text-secondary italic" colspan="3">Opening Balance</td>
                            <td class="px-3 py-2 text-[12px] font-bold text-right text-on-surface">${fmt(openingBalance)}</td>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.map((r, idx) => `
                        <tr class="border-b border-outline-variant/15 cursor-pointer hover:bg-primary/5 active:bg-primary/10 transition-colors ${idx % 2 === 1 ? 'bg-surface-container/20' : ''}"
                            onclick="window.openTransactionDetails('${r.id}')">
                            <td class="px-3 py-2.5 text-[11px] text-secondary whitespace-nowrap">${r.date}</td>
                            <td class="px-3 py-2.5">
                                <p class="text-[12px] font-semibold text-on-surface leading-tight truncate max-w-[180px]">${r.title}</p>
                                <p class="text-[10px] text-secondary">${r.category}${r.paymentMethod ? ' · ' + r.paymentMethod : ''}</p>
                            </td>
                            <td class="px-3 py-2.5 text-[12px] font-semibold text-right ${r.debit > 0 ? 'text-error' : 'text-secondary/30'}">${r.debit > 0 ? fmt(r.debit) : '—'}</td>
                            <td class="px-3 py-2.5 text-[12px] font-semibold text-right ${r.credit > 0 ? 'text-[#008A00]' : 'text-secondary/30'}">${r.credit > 0 ? fmt(r.credit) : '—'}</td>
                            <td class="px-3 py-2.5 text-[12px] font-bold text-right ${r.balance >= 0 ? 'text-on-surface' : 'text-error'}">${fmt(r.balance)}</td>
                        </tr>`).join('')}
                    </tbody>
                    <tfoot>
                        <tr class="border-t-2 border-primary/30 bg-primary/5">
                            <td class="px-3 py-3 text-[11px] font-bold text-on-surface" colspan="2">Closing Total</td>
                            <td class="px-3 py-3 text-[12px] font-extrabold text-right text-error">${fmt(totalDebits)}</td>
                            <td class="px-3 py-3 text-[12px] font-extrabold text-right text-[#008A00]">${fmt(totalCredits)}</td>
                            <td class="px-3 py-3 text-[13px] font-extrabold text-right ${closingBalance >= 0 ? 'text-primary' : 'text-error'}">${fmt(closingBalance)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>`;
    }

    if (items.length === 0) {
        return `<div class="flex flex-col items-center justify-center py-16 text-secondary">
            <span class="material-symbols-outlined text-[48px] mb-3 opacity-40">receipt_long</span>
            <p class="text-[15px] font-medium">No entries found for this period</p>
        </div>`;
    }

    // ── 2. ACCOUNTS RECEIVABLE ──────────────────────────────────────────────
    if (type === 'receivable') {
        const grouped = {};
        items.forEach(t => {
            const p = t.refId ? parties.customers?.find(c => String(c.id) === String(t.refId)) : null;
            const key = p ? p.name : (t.title || 'Unknown');
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(t);
        });

        const total = items.reduce((s, t) => s + parseFloat(t.amount || 0), 0);
        const avgDays = items.length ? Math.round(items.reduce((s, t) => s + daysSince(t.date), 0) / items.length) : 0;
        const overdueCount = items.filter(t => daysSince(t.date) > 30).length;

        return `
        <div class="flex flex-col h-full">
            <div class="px-4 py-3 bg-surface-variant/40 border-b border-outline-variant/30 grid grid-cols-3 gap-2 text-center shrink-0">
                <div>
                    <p class="text-[9px] font-bold text-secondary uppercase tracking-wider">Outstanding</p>
                    <p class="text-[14px] font-extrabold text-[#008A00]">${fmt(total)}</p>
                </div>
                <div class="border-x border-outline-variant/30">
                    <p class="text-[9px] font-bold text-secondary uppercase tracking-wider">Customers</p>
                    <p class="text-[14px] font-extrabold text-on-surface">${Object.keys(grouped).length}</p>
                </div>
                <div>
                    <p class="text-[9px] font-bold text-secondary uppercase tracking-wider">Avg Age</p>
                    <p class="text-[14px] font-extrabold ${avgDays > 30 ? 'text-error' : avgDays > 7 ? 'text-[#FF9F0A]' : 'text-on-surface'}">${avgDays}d</p>
                </div>
            </div>
            ${overdueCount > 0 ? `<div class="flex items-center gap-2 px-4 py-2 bg-error/5 border-b border-error/20">
                <span class="material-symbols-outlined text-error text-[14px]">warning</span>
                <p class="text-[11px] font-semibold text-error">${overdueCount} invoice${overdueCount > 1 ? 's' : ''} overdue (30+ days)</p>
            </div>` : ''}
            <div class="overflow-auto flex-1">
                <table class="w-full text-left border-collapse" style="min-width:460px">
                    <thead class="sticky top-0 bg-surface z-10 shadow-sm">
                        <tr class="border-b-2 border-outline-variant/50">
                            <th class="px-3 py-2.5 text-[9px] font-bold text-secondary uppercase tracking-wider">Customer / Description</th>
                            <th class="px-3 py-2.5 text-[9px] font-bold text-secondary uppercase tracking-wider w-[75px]">Date</th>
                            <th class="px-3 py-2.5 text-[9px] font-bold text-secondary uppercase tracking-wider text-center w-[50px]">Age</th>
                            <th class="px-3 py-2.5 text-[9px] font-bold text-secondary uppercase tracking-wider text-right w-[95px]">Due Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Object.entries(grouped).map(([customer, txns]) => {
                            const custTotal = txns.reduce((s, t) => s + parseFloat(t.amount || 0), 0);
                            return `
                            <tr class="bg-[#5E5CE6]/5 border-y border-[#5E5CE6]/20">
                                <td class="px-3 py-2 text-[12px] font-bold text-on-surface">
                                    <span class="flex items-center gap-1.5"><span class="material-symbols-outlined text-[13px] text-[#5E5CE6]">person</span>${customer}</span>
                                </td>
                                <td class="px-3 py-2 text-[10px] text-secondary">${txns.length} inv.</td>
                                <td></td>
                                <td class="px-3 py-2 text-[12px] font-bold text-right text-[#008A00]">${fmt(custTotal)}</td>
                            </tr>
                            ${txns.map(t => {
                                const days = daysSince(t.date);
                                const ageClr = days > 30 ? 'text-error bg-error/10' : days > 7 ? 'text-[#FF9F0A] bg-[#FF9F0A]/10' : 'text-[#008A00] bg-[#008A00]/10';
                                return `
                                <tr class="border-b border-outline-variant/15 cursor-pointer hover:bg-primary/5 transition-colors ${days > 30 ? 'border-l-2 border-l-error' : ''}"
                                    onclick="window.openTransactionDetails('${t.id}')">
                                    <td class="px-3 py-2.5 pl-7">
                                        <p class="text-[12px] font-medium text-on-surface leading-tight">${t.title}</p>
                                        <p class="text-[10px] text-secondary">${t.category}${t.paymentMethod ? ' · ' + t.paymentMethod : ''}</p>
                                    </td>
                                    <td class="px-3 py-2.5 text-[11px] text-secondary whitespace-nowrap">${t.date}</td>
                                    <td class="px-3 py-2.5 text-center"><span class="px-1.5 py-0.5 rounded-md text-[10px] font-bold ${ageClr}">${days}d</span></td>
                                    <td class="px-3 py-2.5 text-[12px] font-semibold text-right text-[#008A00]">${fmt(parseFloat(t.amount || 0))}</td>
                                </tr>`;
                            }).join('')}`;
                        }).join('')}
                    </tbody>
                    <tfoot>
                        <tr class="border-t-2 border-[#008A00]/30 bg-[#008A00]/5">
                            <td class="px-3 py-3 text-[11px] font-bold text-on-surface" colspan="3">Total Receivable</td>
                            <td class="px-3 py-3 text-[13px] font-extrabold text-right text-[#008A00]">${fmt(total)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>`;
    }

    // ── 3. ACCOUNTS PAYABLE ──────────────────────────────────────────────────
    if (type === 'payable') {
        const grouped = {};
        items.forEach(t => {
            const p = t.refId ? parties.vendors?.find(v => String(v.id) === String(t.refId)) : null;
            const key = p ? p.name : (t.title || 'Unknown');
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(t);
        });

        const total = items.reduce((s, t) => s + parseFloat(t.amount || 0), 0);
        const overdueCount = items.filter(t => daysSince(t.date) > 30).length;
        const avgDays = items.length ? Math.round(items.reduce((s, t) => s + daysSince(t.date), 0) / items.length) : 0;

        return `
        <div class="flex flex-col h-full">
            <div class="px-4 py-3 bg-surface-variant/40 border-b border-outline-variant/30 grid grid-cols-3 gap-2 text-center shrink-0">
                <div>
                    <p class="text-[9px] font-bold text-secondary uppercase tracking-wider">Total Payable</p>
                    <p class="text-[14px] font-extrabold text-error">${fmt(total)}</p>
                </div>
                <div class="border-x border-outline-variant/30">
                    <p class="text-[9px] font-bold text-secondary uppercase tracking-wider">Vendors</p>
                    <p class="text-[14px] font-extrabold text-on-surface">${Object.keys(grouped).length}</p>
                </div>
                <div>
                    <p class="text-[9px] font-bold text-secondary uppercase tracking-wider">Overdue (30d+)</p>
                    <p class="text-[14px] font-extrabold ${overdueCount > 0 ? 'text-error' : 'text-[#008A00]'}">${overdueCount}</p>
                </div>
            </div>
            ${overdueCount > 0 ? `<div class="flex items-center gap-2 px-4 py-2 bg-error/5 border-b border-error/20">
                <span class="material-symbols-outlined text-error text-[14px]">warning</span>
                <p class="text-[11px] font-semibold text-error">${overdueCount} payment${overdueCount > 1 ? 's' : ''} overdue — pay immediately</p>
            </div>` : ''}
            <div class="overflow-auto flex-1">
                <table class="w-full text-left border-collapse" style="min-width:460px">
                    <thead class="sticky top-0 bg-surface z-10 shadow-sm">
                        <tr class="border-b-2 border-outline-variant/50">
                            <th class="px-3 py-2.5 text-[9px] font-bold text-secondary uppercase tracking-wider">Vendor / Description</th>
                            <th class="px-3 py-2.5 text-[9px] font-bold text-secondary uppercase tracking-wider w-[75px]">Date</th>
                            <th class="px-3 py-2.5 text-[9px] font-bold text-secondary uppercase tracking-wider text-center w-[50px]">Age</th>
                            <th class="px-3 py-2.5 text-[9px] font-bold text-secondary uppercase tracking-wider text-right w-[95px]">Amount Due</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Object.entries(grouped).map(([vendor, txns]) => {
                            const vendTotal = txns.reduce((s, t) => s + parseFloat(t.amount || 0), 0);
                            return `
                            <tr class="bg-[#FF9F0A]/5 border-y border-[#FF9F0A]/20">
                                <td class="px-3 py-2 text-[12px] font-bold text-on-surface">
                                    <span class="flex items-center gap-1.5"><span class="material-symbols-outlined text-[13px] text-[#FF9F0A]">storefront</span>${vendor}</span>
                                </td>
                                <td class="px-3 py-2 text-[10px] text-secondary">${txns.length} bill${txns.length > 1 ? 's' : ''}</td>
                                <td></td>
                                <td class="px-3 py-2 text-[12px] font-bold text-right text-error">${fmt(vendTotal)}</td>
                            </tr>
                            ${txns.map(t => {
                                const days = daysSince(t.date);
                                const isOverdue = days > 30;
                                const ageClr = isOverdue ? 'text-error bg-error/10' : days > 7 ? 'text-[#FF9F0A] bg-[#FF9F0A]/10' : 'text-secondary bg-surface-variant/60';
                                return `
                                <tr class="border-b border-outline-variant/15 cursor-pointer hover:bg-primary/5 transition-colors ${isOverdue ? 'border-l-2 border-l-error' : ''}"
                                    onclick="window.openTransactionDetails('${t.id}')">
                                    <td class="px-3 py-2.5 pl-7">
                                        <p class="text-[12px] font-medium text-on-surface leading-tight">${t.title}${isOverdue ? ' <span class="ml-1 text-[9px] font-bold text-error bg-error/10 px-1 rounded">OVERDUE</span>' : ''}</p>
                                        <p class="text-[10px] text-secondary">${t.category}${t.paymentMethod ? ' · ' + t.paymentMethod : ''}</p>
                                    </td>
                                    <td class="px-3 py-2.5 text-[11px] text-secondary whitespace-nowrap">${t.date}</td>
                                    <td class="px-3 py-2.5 text-center"><span class="px-1.5 py-0.5 rounded-md text-[10px] font-bold ${ageClr}">${days}d</span></td>
                                    <td class="px-3 py-2.5 text-[12px] font-semibold text-right text-error">${fmt(parseFloat(t.amount || 0))}</td>
                                </tr>`;
                            }).join('')}`;
                        }).join('')}
                    </tbody>
                    <tfoot>
                        <tr class="border-t-2 border-error/30 bg-error/5">
                            <td class="px-3 py-3 text-[11px] font-bold text-on-surface" colspan="3">Total Payable</td>
                            <td class="px-3 py-3 text-[13px] font-extrabold text-right text-error">${fmt(total)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>`;
    }

    // ── 4. INVENTORY TABLE ──────────────────────────────────────────────────
    if (type === 'inventory') {
        const total = items.reduce((s, i) => {
            const cost = Number(i.costPrice != null ? i.costPrice : (i.unitCost || 0));
            return s + (i.totalValue != null ? Number(i.totalValue) : (Number(i.quantity || 0) * cost));
        }, 0);
        const lowStockCount = items.filter(i => i.status === 'Low Stock').length;
        const outOfStockCount = items.filter(i => i.status === 'Out of Stock').length;
        const inStockCount = items.filter(i => i.status === 'In Stock').length;

        // Group valuations by category for summary strip
        const categoryMap = {};
        items.forEach(i => {
            const cat = i.category || 'Fabric';
            const cost = Number(i.costPrice != null ? i.costPrice : (i.unitCost || 0));
            const val = i.totalValue != null ? Number(i.totalValue) : (Number(i.quantity || 0) * cost);
            categoryMap[cat] = (categoryMap[cat] || 0) + val;
        });

        return `
        <div class="flex flex-col h-full">
            <!-- Valuation KPI strip -->
            <div class="px-4 py-3 bg-surface-variant/40 border-b border-outline-variant/30 grid grid-cols-3 gap-2 text-center shrink-0">
                <div>
                    <p class="text-[9px] font-bold text-secondary uppercase tracking-wider">Total Value</p>
                    <p class="text-[14px] font-extrabold text-primary">${fmt(total)}</p>
                </div>
                <div class="border-x border-outline-variant/30">
                    <p class="text-[9px] font-bold text-secondary uppercase tracking-wider">Total SKUs</p>
                    <p class="text-[14px] font-extrabold text-on-surface">${items.length}</p>
                </div>
                <div>
                    <p class="text-[9px] font-bold text-secondary uppercase tracking-wider">Stock Health</p>
                    <p class="text-[12px] font-extrabold ${outOfStockCount > 0 ? 'text-error' : lowStockCount > 0 ? 'text-[#FF9F0A]' : 'text-[#008A00]'}">
                        ${outOfStockCount > 0 ? `${outOfStockCount} Out · ` : ''}${lowStockCount} Low · ${inStockCount} Good
                    </p>
                </div>
            </div>

            <!-- Category Valuation Pills Strip -->
            <div class="px-4 py-2 bg-surface border-b border-outline-variant/20 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
                <span class="text-[10px] font-bold text-secondary uppercase whitespace-nowrap">By Category:</span>
                ${Object.entries(categoryMap).map(([cat, val]) => `
                    <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-surface-container-high text-on-surface whitespace-nowrap border border-outline-variant/30">
                        <span class="text-secondary">${cat}:</span>
                        <span class="font-bold text-primary">${fmt(val)}</span>
                    </span>
                `).join('')}
            </div>

            ${(lowStockCount > 0 || outOfStockCount > 0) ? `
            <div class="flex items-center justify-between px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-600 dark:text-amber-400">
                <div class="flex items-center gap-2 text-[11px] font-semibold">
                    <span class="material-symbols-outlined text-[15px]">inventory_2</span>
                    <span>${lowStockCount + outOfStockCount} item(s) require re-order / replenishment</span>
                </div>
                <a href="../pages/inventory.html" class="text-[11px] font-bold underline hover:opacity-80">Manage Stock →</a>
            </div>` : ''}

            <!-- Scrollable Table -->
            <div class="overflow-auto flex-1">
                <table class="w-full text-left border-collapse" style="min-width:560px">
                    <thead class="sticky top-0 bg-surface z-10 shadow-sm">
                        <tr class="border-b-2 border-outline-variant/50">
                            <th class="px-3 py-2.5 text-[9px] font-bold text-secondary uppercase tracking-wider">Item & Category</th>
                            <th class="px-3 py-2.5 text-[9px] font-bold text-secondary uppercase tracking-wider text-right w-[90px]">In Hand</th>
                            <th class="px-3 py-2.5 text-[9px] font-bold text-secondary uppercase tracking-wider text-right w-[85px]">Unit Cost</th>
                            <th class="px-3 py-2.5 text-[9px] font-bold text-secondary uppercase tracking-wider text-right w-[105px]">Valuation</th>
                            <th class="px-3 py-2.5 text-[9px] font-bold text-secondary uppercase tracking-wider text-right w-[50px]">%</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${items.map((item, idx) => {
                            const unitCost = Number(item.costPrice != null ? item.costPrice : (item.unitCost || 0));
                            const lineVal = item.totalValue != null ? Number(item.totalValue) : (Number(item.quantity || 0) * unitCost);
                            const pct = total > 0 ? (lineVal / total * 100) : 0;
                            const statusClr = item.status === 'Low Stock'
                                ? 'bg-[#FF9F0A]/10 text-[#FF9F0A] border-[#FF9F0A]/20'
                                : item.status === 'Out of Stock'
                                    ? 'bg-error/10 text-error border-error/20'
                                    : 'bg-[#008A00]/10 text-[#008A00] border-[#008A00]/20';
                            return `
                            <tr class="border-b border-outline-variant/15 hover:bg-surface-variant/30 transition-colors ${idx % 2 === 1 ? 'bg-surface-container/20' : ''}">
                                <td class="px-3 py-2.5">
                                    <div class="flex items-center gap-1.5 flex-wrap">
                                        <p class="text-[12px] font-bold text-on-surface leading-tight">${item.name}</p>
                                        <span class="px-1.5 py-0.2 rounded text-[9px] font-bold border ${statusClr}">${item.status || 'In Stock'}</span>
                                    </div>
                                    <div class="flex items-center gap-2 mt-1 text-[10px] text-secondary">
                                        <span class="px-1.5 py-0.5 rounded bg-surface-variant/60 font-medium">${item.category || 'Fabric'}${item.subCategory ? ` · ${item.subCategory}` : ''}</span>
                                        <span class="font-mono">SKU: ${item.sku || 'N/A'}</span>
                                        ${item.location ? `<span>· ${item.location}</span>` : ''}
                                    </div>
                                    <div class="w-full bg-surface-variant rounded-full h-1 mt-1.5 max-w-[140px]">
                                        <div class="bg-primary h-1 rounded-full transition-all" style="width:${Math.min(pct, 100)}%"></div>
                                    </div>
                                </td>
                                <td class="px-3 py-2.5 text-[12px] text-right font-semibold text-on-surface whitespace-nowrap">
                                    ${Number(item.quantity || 0).toLocaleString()} <span class="text-[10px] font-normal text-secondary">${item.unit || 'Units'}</span>
                                </td>
                                <td class="px-3 py-2.5 text-[12px] text-right text-secondary whitespace-nowrap font-mono">
                                    ${fmt(unitCost)}
                                </td>
                                <td class="px-3 py-2.5 text-[12px] font-bold text-right text-on-surface whitespace-nowrap">
                                    ${fmt(lineVal)}
                                </td>
                                <td class="px-3 py-2.5 text-[11px] text-right text-secondary font-mono">
                                    ${pct.toFixed(1)}%
                                </td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                    <tfoot>
                        <tr class="border-t-2 border-primary/30 bg-primary/5">
                            <td class="px-3 py-3 text-[11px] font-bold text-on-surface" colspan="3">Total Current Inventory Valuation</td>
                            <td class="px-3 py-3 text-[13px] font-extrabold text-right text-primary">${fmt(total)}</td>
                            <td class="px-3 py-3 text-[11px] text-right text-secondary font-bold">100%</td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            <!-- Footer Link -->
            <div class="p-3 bg-surface-container-lowest border-t border-outline-variant/30 flex items-center justify-between shrink-0">
                <span class="text-[11px] text-secondary">Values auto-updated from Inventory ledger</span>
                <a href="../pages/inventory.html" class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-[12px] font-bold hover:bg-primary/20 transition-colors">
                    <span>Full Inventory Details</span>
                    <span class="material-symbols-outlined text-[15px]">arrow_forward</span>
                </a>
            </div>
        </div>`;
    }

    return `<div class="flex flex-col items-center justify-center py-16 text-secondary">
        <span class="material-symbols-outlined text-[48px] mb-3 opacity-40">receipt_long</span>
        <p class="text-[15px] font-medium">No entries found</p>
    </div>`;
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
                <div class="mt-2.5 flex items-center gap-2 flex-wrap">
                    <span class="px-3 py-1 rounded-full text-[12px] font-medium ${statusColor}">${t.status}</span>
                    ${(() => {
                        if (!t.refId) return '';
                        let partyName = t.refId;
                        if (window.financeParties) {
                            const partiesList = isIncome ? window.financeParties.customers : window.financeParties.vendors;
                            const party = partiesList?.find(p => String(p.id) === String(t.refId));
                            if (party) partyName = party.name;
                        }
                        return `
                        <div class="flex items-center gap-1 px-3 py-1 rounded-full bg-[#5E5CE6]/10 text-[#5E5CE6] border border-[#5E5CE6]/20">
                            <span class="material-symbols-outlined text-[13px]">${isIncome ? 'person' : 'storefront'}</span>
                            <span class="text-[12px] font-bold tracking-wide">${partyName}</span>
                        </div>`;
                    })()}
                </div>
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
    const curType = currentFilters.type || 'all';
    const curStatus = currentFilters.status || 'all';
    const curMethod = currentFilters.paymentMethod || 'all';
    const curDate = currentFilters.dateRange || 'all';

    const types = [
        { label: 'All Types', value: 'all', icon: 'apps' },
        { label: 'Income 🟢', value: 'Income', icon: 'arrow_downward' },
        { label: 'Expense 🔴', value: 'Expense', icon: 'arrow_upward' }
    ];

    const statuses = [
        { label: 'All Statuses', value: 'all' },
        { label: 'Completed ✅', value: 'Completed' },
        { label: 'Pending ⏳', value: 'Pending' },
        { label: 'Cancelled ❌', value: 'Cancelled' }
    ];

    const methods = [
        { label: 'All', value: 'all', icon: 'clear_all' },
        { label: 'Cash', value: 'Cash', icon: 'payments' },
        { label: 'UPI', value: 'UPI', icon: 'qr_code_2' },
        { label: 'Bank', value: 'Bank Transfer', icon: 'account_balance' },
        { label: 'Cheque', value: 'Cheque', icon: 'edit_note' },
        { label: 'Card', value: 'Card', icon: 'credit_card' }
    ];

    const dateRanges = [
        { label: 'All Time', value: 'all' },
        { label: 'Today', value: 'today' },
        { label: 'This Week', value: 'this_week' },
        { label: 'This Month', value: 'this_month' }
    ];

    return `
        <div class="flex flex-col gap-5">
            <!-- Hidden inputs to preserve form values for applyFilters -->
            <input type="hidden" id="filter-type" value="${curType}">
            <input type="hidden" id="filter-status" value="${curStatus}">
            <input type="hidden" id="filter-method" value="${curMethod}">
            <input type="hidden" id="filter-date" value="${curDate}">

            <!-- 1. Transaction Type -->
            <div>
                <label class="block text-[12px] font-bold text-secondary uppercase tracking-wider mb-2">Transaction Type</label>
                <div class="grid grid-cols-3 gap-2">
                    ${types.map(t => {
                        const active = curType === t.value;
                        return `
                            <button type="button" class="filter-pill-type px-3 py-2.5 rounded-xl text-[13px] font-bold border transition-all flex items-center justify-center gap-1.5 active-scale ${active ? 'bg-primary text-white border-primary shadow-xs' : 'bg-surface-container-lowest text-on-surface border-outline-variant hover:border-primary/50'}" data-value="${t.value}" onclick="window.selectFilterPill('type', '${t.value}', this)">
                                <span>${t.label}</span>
                            </button>
                        `;
                    }).join('')}
                </div>
            </div>

            <!-- 2. Status -->
            <div>
                <label class="block text-[12px] font-bold text-secondary uppercase tracking-wider mb-2">Status</label>
                <div class="grid grid-cols-2 gap-2">
                    ${statuses.map(s => {
                        const active = curStatus === s.value;
                        return `
                            <button type="button" class="filter-pill-status px-3 py-2.5 rounded-xl text-[13px] font-bold border transition-all flex items-center justify-center gap-1.5 active-scale ${active ? 'bg-primary text-white border-primary shadow-xs' : 'bg-surface-container-lowest text-on-surface border-outline-variant hover:border-primary/50'}" data-value="${s.value}" onclick="window.selectFilterPill('status', '${s.value}', this)">
                                <span>${s.label}</span>
                            </button>
                        `;
                    }).join('')}
                </div>
            </div>

            <!-- 3. Payment Method -->
            <div>
                <label class="block text-[12px] font-bold text-secondary uppercase tracking-wider mb-2">Payment Method</label>
                <div class="grid grid-cols-3 gap-2">
                    ${methods.map(m => {
                        const active = curMethod === m.value;
                        return `
                            <button type="button" class="filter-pill-method px-2.5 py-2.5 rounded-xl text-[12px] font-bold border transition-all flex flex-col items-center justify-center gap-1 active-scale ${active ? 'bg-primary text-white border-primary shadow-xs' : 'bg-surface-container-lowest text-on-surface border-outline-variant hover:border-primary/50'}" data-value="${m.value}" onclick="window.selectFilterPill('method', '${m.value}', this)">
                                <span class="material-symbols-outlined text-[18px]">${m.icon}</span>
                                <span class="truncate max-w-full">${m.label}</span>
                            </button>
                        `;
                    }).join('')}
                </div>
            </div>

            <!-- 4. Date Range -->
            <div>
                <label class="block text-[12px] font-bold text-secondary uppercase tracking-wider mb-2">Date Range</label>
                <div class="grid grid-cols-2 gap-2">
                    ${dateRanges.map(d => {
                        const active = curDate === d.value;
                        return `
                            <button type="button" class="filter-pill-date px-3 py-2.5 rounded-xl text-[13px] font-bold border transition-all flex items-center justify-center gap-1.5 active-scale ${active ? 'bg-primary text-white border-primary shadow-xs' : 'bg-surface-container-lowest text-on-surface border-outline-variant hover:border-primary/50'}" data-value="${d.value}" onclick="window.selectFilterPill('date', '${d.value}', this)">
                                <span>${d.label}</span>
                            </button>
                        `;
                    }).join('')}
                </div>
            </div>

            <div class="h-2"></div>
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
