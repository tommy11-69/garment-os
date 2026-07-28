import { productionStore } from '../stores/ProductionStore.js';
import { renderers } from '../renderers.js';
import { BottomSheet } from '../components/index.js';
import { bindFormValidation } from '../utils/formHandler.js';
import { 
    getExpenseContentHTML, getExpenseFooterHTML,
    getConsumptionContentHTML, getConsumptionFooterHTML,
    getUpdateProgressContentHTML, getUpdateProgressFooterHTML
} from './templates.js';

document.addEventListener('DOMContentLoaded', () => {
    initUI();
    productionStore.subscribe(renderUI);
    productionStore.loadBatches();
});

function initUI() {
    const sheetsContainer = document.getElementById('sheets-container');
    if (sheetsContainer) {
        sheetsContainer.innerHTML = [
            BottomSheet({ id: 'updateProgressSheet', title: 'Update Progress', content: getUpdateProgressContentHTML(), footerContent: getUpdateProgressFooterHTML() }),
            BottomSheet({ id: 'logExpenseSheet', title: 'Log Batch Expense', content: getExpenseContentHTML(), footerContent: getExpenseFooterHTML(), isForm: true }),
            BottomSheet({ id: 'logConsumptionSheet', title: 'Log Material Consumption', content: getConsumptionContentHTML(), footerContent: getConsumptionFooterHTML(), isForm: true })
        ].join('');

        bindFormValidation('logExpenseSheet-content', 'submit-expense');
        bindFormValidation('logConsumptionSheet-content', 'submit-consumption');
    }
}

function renderUI(state) {
    const { entities, loading, error } = state;
    
    if (loading || error || entities.length === 0) return;
    
    // As it is a single view, we just update the title area for demo purposes
    const batch = entities[0];
    
    const h2 = document.querySelector('h2');
    if(h2) h2.textContent = 'Production';
    
    const badge = document.querySelector('.px-2.py-0\\.5.rounded-md.text-\\[12px\\].font-bold.bg-surface-container-high.text-on-surface');
    if(badge) badge.textContent = `Batch #${batch.id}`;
    
    const p = document.querySelector('.text-\\[14px\\].text-secondary');
    if(p) p.textContent = batch.description;
}
