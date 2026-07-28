import { inventoryStore } from '../stores/InventoryStore.js';
import { renderers } from '../renderers.js';
import { BottomSheet } from '../components/index.js';
import { bindFormValidation } from '../utils/formHandler.js';
import { 
    getStockInSheetHTML, getStockInFooterHTML,
    getStockOutSheetHTML, getStockOutFooterHTML,
    getAdjustStockSheetHTML, getAdjustStockFooterHTML,
    getTransferStockSheetHTML, getTransferStockFooterHTML,
    getItemDetailsHeader, getItemDetailsContent, getItemDetailsFooter
} from './templates.js';

document.addEventListener('DOMContentLoaded', () => {
    initUI();
    inventoryStore.subscribe(renderUI);
    inventoryStore.loadInventory();
});

function initUI() {
    // Inject static sheets
    const sheetsContainer = document.getElementById('sheets-container');
    if (sheetsContainer) {
        const sheetsHTML = [
            BottomSheet({ id: 'stockInSheet', title: 'Stock In', content: getStockInSheetHTML(), footerContent: getStockInFooterHTML(), isForm: true }),
            BottomSheet({ id: 'stockOutSheet', title: 'Stock Out', content: getStockOutSheetHTML(), footerContent: getStockOutFooterHTML(), isForm: true }),
            BottomSheet({ id: 'adjustStockSheet', title: 'Adjust Stock Level', content: getAdjustStockSheetHTML(), footerContent: getAdjustStockFooterHTML(), isForm: true }),
            BottomSheet({ id: 'transferStockSheet', title: 'Transfer Location', content: getTransferStockSheetHTML(), footerContent: getTransferStockFooterHTML(), isForm: true })
        ].join('');
        
        sheetsContainer.innerHTML = sheetsHTML;

        // Bind form validations
        bindFormValidation('stockInSheet-content', 'in-submit');
        bindFormValidation('stockOutSheet-content', 'out-submit');
        bindFormValidation('adjustStockSheet-content', 'adj-submit');
        bindFormValidation('transferStockSheet-content', 'tr-submit');
    }

    // Bind Search
    const searchInput = document.querySelector('input[placeholder="Search inventory..."]');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            inventoryStore.setSearch(e.target.value);
        });
    }

    // Setup Category Tabs
    const catTabs = document.querySelectorAll('#inventory-categories button');
    catTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            // Update UI
            catTabs.forEach(t => t.classList.remove('active', 'bg-on-surface', 'text-surface'));
            catTabs.forEach(t => t.classList.add('bg-surface', 'text-on-surface'));
            
            const target = e.currentTarget;
            target.classList.remove('bg-surface', 'text-on-surface');
            target.classList.add('active', 'bg-on-surface', 'text-surface');
            
            // Update Store
            let cat = target.textContent.trim();
            if (cat === 'All Items') cat = 'All';
            inventoryStore.setCategory(cat);
        });
    });
}

function renderUI(state) {
    const { entities, activeEntity, loading, error } = state;
    
    const container = document.getElementById('inventory-list');
    if (!container) return;

    if (loading) {
        if (window.setLoading) window.setLoading('inventory-list');
    } else if (error) {
        container.innerHTML = `<div class="p-md text-center text-error">Failed to load inventory: ${error.message}</div>`;
    } else if (entities.length === 0) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center p-xl text-center">
                <div class="w-16 h-16 rounded-full bg-surface-variant flex items-center justify-center mb-4 text-secondary">
                    <span class="material-symbols-outlined text-[32px]">inventory</span>
                </div>
                <h3 class="text-[16px] font-bold text-on-surface mb-1">No Items Found</h3>
                <p class="text-body text-secondary max-w-[250px]">Try adjusting your search or category filter.</p>
            </div>
        `;
    } else {
        container.innerHTML = entities.map(item => renderers.inventoryCard(item)).join('');
    }
}

window.openItemDetails = async function(id) {
    await inventoryStore.fetchActiveEntity(id);
    const item = inventoryStore.getState().activeEntity;
    if (!item) return;

    const container = document.getElementById('sheets-container');
    const existing = document.getElementById('itemDetailsSheet');
    if (existing) {
        existing.remove();
        const overlay = document.getElementById('itemDetailsSheet-overlay');
        if (overlay) overlay.remove();
    }

    const sheetHTML = BottomSheet({
        id: 'itemDetailsSheet',
        customHeader: getItemDetailsHeader(item),
        content: getItemDetailsContent(item),
        footerContent: getItemDetailsFooter(item),
        height: '90vh'
    });

    container.insertAdjacentHTML('beforeend', sheetHTML);
    setTimeout(() => window.openSheet('itemDetailsSheet'), 50);
};
