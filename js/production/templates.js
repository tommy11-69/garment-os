import { SelectInput, TextInput, TextareaInput } from '../components/inputs.js';

export function getExpenseContentHTML() {
    return `
        ${TextInput({ label: 'Expense Description', id: 'exp-title', placeholder: 'e.g., Dyeing Chemicals', required: true })}
        ${TextInput({ label: 'Amount (₹)', id: 'exp-amount', type: 'number', placeholder: '500.00', required: true })}
        <div class="h-10"></div>
    `;
}

export function getExpenseFooterHTML() {
    return `
        <button id="submit-expense" onclick="window.closeSheet('logExpenseSheet'); window.showToast('Expense logged successfully', 'success')" class="w-full bg-primary text-on-primary font-bold text-[16px] py-4 rounded-2xl active-scale transition-apple shadow-sm disabled:opacity-50">
            Log Expense
        </button>
    `;
}

export function getConsumptionContentHTML() {
    return `
        ${SelectInput({ label: 'Material', id: 'cons-material', options: [{label: 'Select Material...'}, {label: 'Organic Cotton Jersey', value: 'inv-001'}, {label: 'Navy Blue Thread', value: 'inv-002'}], required: true })}
        ${TextInput({ label: 'Quantity Consumed', id: 'cons-qty', type: 'number', placeholder: '150', required: true })}
        <div class="h-10"></div>
    `;
}

export function getConsumptionFooterHTML() {
    return `
        <button id="submit-consumption" onclick="window.closeSheet('logConsumptionSheet'); window.showToast('Consumption logged', 'success')" class="w-full bg-primary text-on-primary font-bold text-[16px] py-4 rounded-2xl active-scale transition-apple shadow-sm disabled:opacity-50">
            Log Consumption
        </button>
    `;
}

export function getUpdateProgressContentHTML() {
    return `
        ${SelectInput({ label: 'Stage', id: 'upd-stage', options: [{label: 'Printing'}] })}
        <div class="flex gap-4">
            <div class="flex-1">
                ${TextInput({ label: 'Progress (%)', id: 'upd-prog', type: 'number', value: '45' })}
            </div>
            <div class="flex-1 flex items-end mb-[8px]">
                <button class="w-full bg-surface-variant text-on-surface font-semibold py-3 rounded-xl border border-outline-variant active-scale transition-apple flex items-center justify-center gap-2">
                    <span class="material-symbols-outlined text-[18px]">add_photo_alternate</span>
                    Upload
                </button>
            </div>
        </div>
        ${SelectInput({ label: 'Status', id: 'upd-status', options: [{label: 'In Progress'}, {label: 'Completed'}, {label: 'Delayed'}, {label: 'On Hold'}] })}
        ${SelectInput({ label: 'Assign To Worker', id: 'upd-worker', options: [{label: 'Raj Kumar'}] })}
        ${TextareaInput({ label: 'Notes', id: 'upd-notes', value: 'Screen printing front logo.', rows: 2 })}
        
        <div class="mt-2 flex gap-2">
            <div class="w-16 h-16 rounded-lg bg-surface-variant overflow-hidden relative">
                <img src="https://images.unsplash.com/photo-1596558450255-7c0b7be9d56a?auto=format&fit=crop&w=150" class="w-full h-full object-cover">
                <button class="absolute -top-1 -right-1 w-5 h-5 bg-error text-white rounded-full flex items-center justify-center text-[12px]"><span class="material-symbols-outlined text-[12px]">close</span></button>
            </div>
        </div>
        <div class="h-10"></div>
    `;
}

export function getUpdateProgressFooterHTML() {
    return `
        <button onclick="window.closeSheet('updateProgressSheet'); window.showToast('Progress updated', 'success')" class="w-full bg-primary text-on-primary font-bold text-[16px] py-4 rounded-2xl active-scale transition-apple shadow-sm">
            Save Update
        </button>
    `;
}
