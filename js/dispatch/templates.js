import { SelectInput, TextInput, TextareaInput } from '../components/inputs.js';

export function getDispatchOrderSheetHTML() {
    return `
        ${SelectInput({ label: 'Select Order', id: 'disp-order', options: [{label: 'Select Order...'}, {label: 'ORD-992 (Chennai Silks)'}, {label: 'ORD-993 (Arvind Fashions)'}] })}
        ${SelectInput({ label: 'Courier Service', id: 'disp-courier', options: [{label: 'Select Courier...'}, {label: 'BlueDart'}, {label: 'Delhivery'}, {label: 'DHL Express'}] })}
        ${TextInput({ label: 'LR Number / Tracking ID', id: 'disp-lr', placeholder: 'Enter tracking number' })}
        <div class="flex gap-4">
            <div class="flex-1">
                ${TextInput({ label: 'Number of Boxes', id: 'disp-boxes', type: 'number', placeholder: '0' })}
            </div>
            <div class="flex-1">
                ${TextInput({ label: 'Total Weight', id: 'disp-weight', type: 'number', placeholder: 'kg' })}
            </div>
        </div>
        ${TextInput({ label: 'Invoice Number', id: 'disp-invoice', placeholder: 'INV-...' })}
        
        <div class="mt-2 flex gap-4 items-center">
            <div class="flex-1">
                <button class="w-full bg-surface-variant text-on-surface font-semibold py-3 rounded-xl border border-outline-variant active-scale transition-apple flex items-center justify-center gap-2">
                    <span class="material-symbols-outlined text-[18px]">upload_file</span>
                    Attach LR Copy
                </button>
            </div>
        </div>
        
        ${TextareaInput({ label: 'Notes', id: 'disp-notes', rows: 2 })}
        <div class="h-10"></div>
    `;
}

export function getDispatchOrderFooterHTML() {
    return `
        <button onclick="window.closeSheet('dispatchOrderSheet')" class="w-full bg-primary text-on-primary font-bold text-[16px] py-4 rounded-2xl active-scale transition-apple shadow-sm">
            Confirm Dispatch
        </button>
    `;
}
