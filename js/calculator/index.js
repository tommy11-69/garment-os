import { api } from '../services/api.js';
import { BottomSheet } from '../components/index.js';
import { TextInput, SelectInput, TextareaInput } from '../components/inputs.js';
import { bindFormValidation } from '../utils/formHandler.js';

document.addEventListener('DOMContentLoaded', async () => {
    const sheetsContainer = document.getElementById('sheets-container');

    // Create Sheets content
    const saveCostContent = `
        ${TextInput({ label: 'Style Name / Reference', id: 'save-style', placeholder: 'e.g. SS24-TS-01', required: true })}
        ${SelectInput({ label: 'Client / Brand', id: 'save-client', options: [{label: 'Select Client...'}, {label: 'Everlane Corp.', value: 'c-001'}, {label: 'Patagonia', value: 'c-002'}], required: true })}
        ${SelectInput({ label: 'Status', id: 'save-status', options: [{label: 'Draft', value: 'Draft'}, {label: 'Generate Quote', value: 'Quoted'}], required: true })}
        ${TextareaInput({ label: 'Notes', id: 'save-notes', rows: 2 })}
        <div class="h-10"></div>
    `;
    const saveCostFooter = `
        <button id="save-cost-submit" class="w-full bg-primary text-on-primary font-bold text-[16px] py-4 rounded-2xl active-scale transition-apple shadow-sm disabled:opacity-50">
            Save & Update Orders
        </button>
    `;
    
    // Load Cost Sheet
    const loadCostContent = `
        ${SelectInput({ label: 'Saved Costings', id: 'load-style', options: [{label: 'SS24-TS-01 (Everlane Corp.)'}, {label: 'AW25-JK-02 (Patagonia)'}], required: true })}
        <div class="h-10"></div>
    `;
    const loadCostFooter = `
        <button id="load-cost-submit" onclick="closeSheet('loadCostSheet'); window.showToast('Costing loaded', 'success')" class="w-full bg-primary text-on-primary font-bold text-[16px] py-4 rounded-2xl active-scale transition-apple shadow-sm">
            Load Data
        </button>
    `;

    // Render Sheets
    sheetsContainer.innerHTML = [
        BottomSheet({ id: 'saveCostSheet', title: 'Save Costing Draft', content: saveCostContent, footerContent: saveCostFooter, isForm: true }),
        BottomSheet({ id: 'loadCostSheet', title: 'Load Saved Costing', content: loadCostContent, footerContent: loadCostFooter, isForm: true })
    ].join('');

    // Bind validation
    bindFormValidation('saveCostSheet-content', 'save-cost-submit');
    bindFormValidation('loadCostSheet-content', 'load-cost-submit');

    // Save action
    document.getElementById('save-cost-submit').addEventListener('click', async () => {
        const styleRef = document.getElementById('save-style').value;
        const clientId = document.getElementById('save-client').value;
        const status = document.getElementById('save-status').value;
        
        await api.saveCosting({
            styleRef,
            clientId,
            totalUnitCost: 22.10, // from UI, hardcoded for now
            retailPrice: 34.50, // from UI, hardcoded for now
            status
        });
        
        window.closeSheet('saveCostSheet');
        window.showToast(`Costing saved as ${status}`, 'success');
    });
});
