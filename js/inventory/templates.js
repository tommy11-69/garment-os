import { SelectInput, TextInput, TextareaInput } from '../components/inputs.js';
import { TimelineEvent } from '../components/index.js';

export function getStockInSheetHTML() {
    return `
        <div class="flex flex-col gap-4">
            ${SelectInput({ label: 'Item / Material', id: 'in-item', options: [{label: 'Cotton Jersey 180GSM'}], required: true })}
            <div class="grid grid-cols-2 gap-4">
                ${TextInput({ label: 'Quantity', id: 'in-qty', type: 'number', placeholder: '0', required: true, validationType: 'positive' })}
                ${TextInput({ label: 'Unit', id: 'in-unit', value: 'kgs', disabled: true })}
            </div>
            ${TextInput({ label: 'Purchase Order (Optional)', id: 'in-po', placeholder: 'e.g. PO-2023-089' })}
            ${TextInput({ label: 'Supplier', id: 'in-supplier', placeholder: 'Supplier name' })}
            ${TextareaInput({ label: 'Notes', id: 'in-notes', placeholder: 'Location or batch info...', rows: 2 })}
            <div class="h-4"></div>
        </div>
    `;
}

export function getStockInFooterHTML() {
    return `
        <button id="in-submit" onclick="window.closeSheet('stockInSheet'); window.showToast('Stock added successfully', 'success')" class="w-full bg-primary text-on-primary font-bold text-[16px] py-4 rounded-2xl active-scale transition-apple shadow-sm">
            Add Stock
        </button>
    `;
}

export function getStockOutSheetHTML() {
    return `
        <div class="flex flex-col gap-4">
            ${SelectInput({ label: 'Item / Material', id: 'out-item', options: [{label: 'Cotton Jersey 180GSM'}], required: true })}
            <div class="grid grid-cols-2 gap-4">
                ${TextInput({ label: 'Quantity', id: 'out-qty', type: 'number', placeholder: '0', required: true, validationType: 'positive', min: '1', max: '1250' })}
                ${TextInput({ label: 'Unit', id: 'out-unit', value: 'kgs', disabled: true })}
            </div>
            ${TextInput({ label: 'Link to Production Order', id: 'out-order', placeholder: 'e.g. ORD-992' })}
            ${TextareaInput({ label: 'Reason / Notes', id: 'out-notes', placeholder: 'Why is this stock leaving?', rows: 2, required: true })}
            <div class="h-4"></div>
        </div>
    `;
}

export function getStockOutFooterHTML() {
    return `
        <button id="out-submit" onclick="window.closeSheet('stockOutSheet'); window.showToast('Stock removed successfully', 'success')" class="w-full bg-primary text-on-primary font-bold text-[16px] py-4 rounded-2xl active-scale transition-apple shadow-sm">
            Remove Stock
        </button>
    `;
}

export function getAdjustStockSheetHTML() {
    return `
        <div class="bg-warning-container/30 border border-warning/20 p-4 rounded-xl mb-4">
            <div class="flex items-start gap-3">
                <span class="material-symbols-outlined text-warning mt-0.5">warning</span>
                <div>
                    <h4 class="text-[14px] font-bold text-on-surface mb-1">Adjustment Warning</h4>
                    <p class="text-[13px] text-secondary leading-relaxed">Adjustments directly overwrite current stock levels. Use only for audits or damage write-offs.</p>
                </div>
            </div>
        </div>
        <div class="flex flex-col gap-4">
            ${SelectInput({ label: 'Item / Material', id: 'adj-item', options: [{label: 'Cotton Jersey 180GSM'}], required: true })}
            <div class="grid grid-cols-2 gap-4">
                ${TextInput({ label: 'New Total Quantity', id: 'adj-qty', type: 'number', placeholder: '0', required: true, validationType: 'positive' })}
                ${TextInput({ label: 'Unit', id: 'adj-unit', value: 'kgs', disabled: true })}
            </div>
            ${SelectInput({ label: 'Reason Code', id: 'adj-reason', options: [
                {label: 'Select Reason', value: ''},
                {label: 'Physical Audit (Count Mismatch)', value: 'audit'},
                {label: 'Damaged / Spoiled', value: 'damage'},
                {label: 'Lost / Stolen', value: 'lost'}
            ], required: true })}
            ${TextareaInput({ label: 'Explanation', id: 'adj-notes', placeholder: 'Details of the adjustment...', rows: 2, required: true })}
            <div class="h-4"></div>
        </div>
    `;
}

export function getAdjustStockFooterHTML() {
    return `
        <button id="adj-submit" onclick="window.closeSheet('adjustStockSheet'); window.showToast('Stock adjusted', 'success')" class="w-full bg-error text-white font-bold text-[16px] py-4 rounded-2xl active-scale transition-apple shadow-sm">
            Confirm Adjustment
        </button>
    `;
}

export function getTransferStockSheetHTML() {
    return `
        <div class="flex flex-col gap-4">
            ${SelectInput({ label: 'Item / Material', id: 'tr-item', options: [{label: 'Cotton Jersey 180GSM'}], required: true })}
            ${TextInput({ label: 'Quantity to Transfer', id: 'tr-qty', type: 'number', placeholder: '0', required: true, validationType: 'positive', min: '1', max: '1250' })}
            <div class="flex gap-4">
                <div class="flex-1">
                    ${TextInput({ label: 'From Location', id: 'tr-from', value: 'A-12', disabled: true })}
                </div>
                <div class="flex-1">
                    ${TextInput({ label: 'To Location', id: 'tr-to', placeholder: 'e.g. B-04', required: true })}
                </div>
            </div>
            <div class="h-10"></div>
        </div>
    `;
}

export function getTransferStockFooterHTML() {
    return `
        <button id="tr-submit" onclick="window.closeSheet('transferStockSheet'); window.showToast('Stock transferred', 'success')" class="w-full bg-primary text-on-primary font-bold text-[16px] py-4 rounded-2xl active-scale transition-apple shadow-sm">
            Transfer
        </button>
    `;
}

export function getItemDetailsHeader(item) {
    if (!item) return '';
    return `
    <div class="px-lg pb-md flex justify-between items-start border-b border-outline-variant/30">
        <div>
            <span class="text-[13px] font-bold text-secondary mb-1 block">${item.category}</span>
            <h2 class="text-[22px] font-bold text-on-surface leading-tight">${item.name}</h2>
            <div class="flex gap-2 mt-2">
                <span class="inline-block px-3 py-1 rounded-full text-[12px] font-medium ${item.statusColor}">${item.status}</span>
            </div>
        </div>
        <div class="flex gap-2">
            <button onclick="window.closeSheet('itemDetailsSheet')" class="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center text-secondary active-scale transition-apple">
                <span class="material-symbols-outlined text-[20px]">close</span>
            </button>
        </div>
    </div>`;
}

export function getItemDetailsContent(item) {
    if (!item) return '';
    return `
        <div class="grid grid-cols-2 gap-3">
            <div class="bg-surface-container-lowest p-4 rounded-[20px] border border-outline-variant shadow-sm">
                <span class="text-[12px] font-semibold text-secondary uppercase tracking-wider mb-1 block">Current Stock</span>
                <span class="text-[20px] font-bold text-on-surface">${item.qty.toLocaleString()} <span class="text-[14px] text-secondary font-medium">${item.unit}</span></span>
            </div>
            <div class="bg-surface-container-lowest p-4 rounded-[20px] border border-outline-variant shadow-sm">
                <span class="text-[12px] font-semibold text-secondary uppercase tracking-wider mb-1 block">Location</span>
                <span class="text-[20px] font-bold text-on-surface">${item.location}</span>
            </div>
        </div>

        <div class="bg-surface-container-lowest rounded-[24px] border border-outline-variant shadow-sm p-lg mt-6">
            <h3 class="text-[16px] font-bold text-on-surface mb-4">Stock History</h3>
            <div class="relative border-l-2 border-outline-variant ml-3 space-y-6">
                ${TimelineEvent({ title: 'Stock Out: 250 ' + item.unit, subtitle: 'Assigned to ORD-992', time: 'Oct 22, 10:30 AM', isCompleted: true })}
                ${TimelineEvent({ title: 'Stock In: 1,500 ' + item.unit, subtitle: 'Received from Raj Textiles', time: 'Oct 15, 02:15 PM', isCompleted: true })}
            </div>
        </div>
        <div class="h-10"></div>
    `;
}

export function getItemDetailsFooter(item) {
    if (!item) return '';
    return `
        <button onclick="window.openSheet('stockOutSheet')" class="flex-1 bg-surface-container-high text-on-surface font-bold text-[15px] py-3.5 rounded-2xl active-scale transition-apple">
            Stock Out
        </button>
        <button onclick="window.openSheet('adjustStockSheet')" class="flex-1 bg-surface-container-high text-on-surface font-bold text-[15px] py-3.5 rounded-2xl active-scale transition-apple">
            Adjust
        </button>
        <button onclick="window.openSheet('stockInSheet')" class="flex-1 bg-primary text-on-primary font-bold text-[15px] py-3.5 rounded-2xl active-scale transition-apple shadow-sm">
            Stock In
        </button>
    `;
}
