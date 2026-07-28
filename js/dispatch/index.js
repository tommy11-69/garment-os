import { dispatchStore } from '../stores/DispatchStore.js';
import { renderers } from '../renderers.js';
import { BottomSheet } from '../components/index.js';
import { 
    getDispatchOrderSheetHTML, getDispatchOrderFooterHTML
} from './templates.js';

document.addEventListener('DOMContentLoaded', () => {
    initUI();
    dispatchStore.subscribe(renderUI);
    dispatchStore.loadShipments();
});

function initUI() {
    const sheetsContainer = document.getElementById('sheets-container');
    if (sheetsContainer) {
        sheetsContainer.innerHTML = [
            BottomSheet({ id: 'dispatchOrderSheet', title: 'Dispatch Order', content: getDispatchOrderSheetHTML(), footerContent: getDispatchOrderFooterHTML() })
        ].join('');
    }

    const filterTabs = document.querySelectorAll('.bg-surface-container-lowest.border button');
    filterTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            filterTabs.forEach(t => {
                t.classList.remove('bg-surface-variant', 'text-on-surface', 'shadow-sm');
                t.classList.add('text-secondary');
            });
            const target = e.currentTarget;
            target.classList.remove('text-secondary');
            target.classList.add('bg-surface-variant', 'text-on-surface', 'shadow-sm');
            
            dispatchStore.setFilter(target.textContent.trim());
        });
    });
}

function renderUI(state) {
    const { entities, loading, error } = state;
    
    // We will find a container to render into.
    // In dispatch.html, the cards are inside `<div class="flex flex-col gap-md">`
    // Let's dynamically add an id if it's not there.
    let container = document.getElementById('dispatch-list');
    if (!container) {
        const h2 = document.querySelector('h2');
        if(h2) {
            const listParent = h2.parentElement.nextElementSibling.nextElementSibling;
            if(listParent && listParent.classList.contains('flex-col')) {
                listParent.id = 'dispatch-list';
                container = listParent;
            }
        }
    }
    
    if (!container) return;

    if (loading) {
        if (window.setLoading) window.setLoading('dispatch-list');
    } else if (error) {
        container.innerHTML = `<div class="p-md text-center text-error">Failed to load shipments: ${error.message}</div>`;
    } else if (entities.length === 0) {
        container.innerHTML = `<div class="p-md text-center text-secondary">No shipments found.</div>`;
    } else {
        container.innerHTML = entities.map(s => renderers.shipmentCard(s)).join('');
    }
}
