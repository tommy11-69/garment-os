import { orderStore } from '../stores/OrderStore.js';
import { api, makeTimestamp } from '../services/api.js';
import { renderers } from '../renderers.js';
import { SegmentedControl, BottomSheet, TimelineEvent, TaskCard } from '../components/index.js';
import { bindFormValidation } from '../utils/formHandler.js';
import { getOrderSheetsHTML, getOrderDetailsHeader, getOrderDetailsContent, getTaskSheetHTML } from './templates.js';
import { getCreateCustomerSheetHTML, getCreateCustomerFooterHTML } from '../components/customerForms.js';

// ─── Shared timeline event pusher ────────────────────────────────────────────
// Pushes a standardised event to an order's timeline array.
// type: 'system' | 'status' | 'action' | 'task' | 'expense' | 'edit' | 'inventory'
function pushTimelineEvent(order, title, type = 'action', user = 'System', description = '') {
    if (!order) return;
    if (!order.timeline) order.timeline = [];
    order.timeline.unshift({
        id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        date: makeTimestamp(),
        title,
        description,
        user,
        type
    });
}





let currentAdvFilters = {
    status: '',
    priority: '',
    dateFrom: '',
    dateTo: ''
};



async function renderSheets() {
    const container = document.getElementById('sheets-container');
    if (container) {
        let html = '';
        if (typeof getOrderSheetsHTML === 'function') {
            html += await getOrderSheetsHTML();
        }
        if (typeof getCreateCustomerSheetHTML === 'function') {
            html += getCreateCustomerSheetHTML();
        }
        container.innerHTML = html;
        if (typeof bindFormValidation === 'function') {
            bindFormValidation(document);
        }
    }
}

async function initModule() {
    // 1. Subscribe to Store
    orderStore.subscribe(renderUI);

    const segControl = document.getElementById('orders-segmented-control');
    if (segControl) {
        const options = [
            { id: 'all', label: 'All' },
            { id: 'active', label: 'Active (Draft/Prod)' },
            { id: 'completed', label: 'Completed' }
        ];
        
        const renderSegControl = () => {
            segControl.innerHTML = SegmentedControl({
                options: options,
                activeOption: orderStore.getState().currentFilters.status || 'all'
            });
            
            const tabs = segControl.querySelectorAll('button[role="tab"]');
            tabs.forEach(tab => {
                tab.addEventListener('click', (e) => {
                    orderStore.setFilter('status', e.currentTarget.dataset.option);
                    renderSegControl();
                });
            });
        };
        renderSegControl();
    }

    // Bind Search
    const searchInput = document.getElementById('order-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            orderStore.setSearch(e.target.value);
        });
    }

    // 2. Render Sheets
    await renderSheets();
    
    // 3. Load Data
    await orderStore.loadOrders();

    // If URL has orderId, open it
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('orderId');
    if (orderId) {
        window.openOrderDetails(orderId);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initModule);
} else {
    initModule();
}

// ─── STATE-DRIVEN RENDERING ─────────────────────────────────────

function renderUI(state) {
    const { entities, activeEntity, selectedIds, isBulkMode, loading, error } = state;
    
    // Render List
    const container = document.getElementById('orders-list');
    if (container) {
        if (loading) {
            if (window.setLoading) window.setLoading('orders-list');
        } else if (error) {
            container.innerHTML = `<div class="p-md text-center text-error">Failed to load orders: ${error.message}</div>`;
        } else if (entities.length === 0) {
            container.innerHTML = `
                <div class="flex flex-col items-center justify-center p-xl text-center">
                    <div class="w-16 h-16 rounded-full bg-surface-variant flex items-center justify-center mb-4 text-secondary">
                        <span class="material-symbols-outlined text-[32px]">inventory_2</span>
                    </div>
                    <h3 class="text-[16px] font-bold text-on-surface mb-1">No Orders Found</h3>
                    <p class="text-body text-secondary max-w-[250px]">Adjust filters or create a new order.</p>
                </div>
            `;
        } else {
            container.innerHTML = entities.map(o => 
                renderers.orderCard(o, isBulkMode, selectedIds.has(o.id))
            ).join('');
        }
    }
    
    // Update Bulk Toolbar
    updateBulkToolbar(state);
    
    // Update Active Entity Sheets
    if (activeEntity) {
        updateActiveEntitySheets(activeEntity);
    }
}

function updateBulkToolbar(state) {
    const { isBulkMode, selectedIds } = state;
    let toolbarContainer = document.getElementById('bulk-toolbar-container');
    
    if (isBulkMode) {
        if (!toolbarContainer) {
            toolbarContainer = document.createElement('div');
            toolbarContainer.id = 'bulk-toolbar-container';
            document.body.appendChild(toolbarContainer);
        }
        // Make sure we have getBulkToolbarHTML from templates... we'll just mock it if not imported properly
        toolbarContainer.innerHTML = `<div class="fixed bottom-[80px] left-4 right-4 bg-surface-container-highest border border-outline-variant shadow-lg rounded-2xl p-3 z-40 transition-all duration-300 translate-y-0 opacity-100 flex items-center max-w-[400px] mx-auto">
            <button onclick="window.cancelBulkSelection()" class="w-10 h-10 rounded-full hover:bg-surface-variant flex items-center justify-center text-secondary active-scale transition-apple mr-3">
                <span class="material-symbols-outlined text-[20px]">close</span>
            </button>
            <div class="flex-1">
                <span class="text-[14px] font-bold text-on-surface block">${selectedIds.size} Selected</span>
                <span class="text-[12px] text-secondary">Bulk Actions</span>
            </div>
        </div>`;
    } else if (toolbarContainer) {
        toolbarContainer.remove();
    }
}

function updateActiveEntitySheets(entity) {
    const sheet = document.getElementById('orderDetailsSheet');
    if (sheet && !sheet.classList.contains('translate-y-full')) {
        const bodyContent = sheet.querySelector('.overflow-y-auto');
        if (bodyContent && getOrderDetailsContent) {
            bodyContent.innerHTML = getOrderDetailsContent(entity);
        }
        const header = sheet.querySelector('.bg-surface-container-lowest.sticky');
        if (header && getOrderDetailsHeader) {
            header.innerHTML = getOrderDetailsHeader(entity);
        }
    }
}

window.toggleOrderSelection = function(orderId) {
    orderStore.toggleSelection(orderId);
};

window.selectAllOrders = function() {
    const state = orderStore.getState();
    const allSelected = state.entities.length > 0 && state.selectedIds.size === state.entities.length;
    if (allSelected) {
        orderStore.clearSelection();
    } else {
        orderStore.selectAll(state.entities.map(e => e.id));
    }
};

window.cancelBulkSelection = function() {
    orderStore.clearSelection();
};



window.bulkArchive = async function() {
    if (orderStore.getState().selectedIds.size === 0) return;
    window.showToast?.(`Archiving ${orderStore.getState().selectedIds.size} orders...`, 'info');
    if (window.setLoading) window.setLoading('orders-list');
    
    try {
        for (const orderId of orderStore.getState().selectedIds) {
            await api.archiveOrder(orderId);
        }
        window.showToast?.('Orders archived', 'success');
        orderStore.clearSelection(); // Exit bulk mode
        await orderStore.loadOrders();
    } catch (e) {
        window.showToast?.('Failed to bulk archive', 'error');
    }
};

window.bulkDelete = async function() {
    if (orderStore.getState().selectedIds.size === 0) return;
    window.showConfirmation({
        title: 'Bulk Delete',
        message: `Are you sure you want to permanently delete ${orderStore.getState().selectedIds.size} orders?`,
        confirmText: 'Delete',
        onConfirm: async () => {
            window.showToast?.(`Deleting ${orderStore.getState().selectedIds.size} orders...`, 'info');
            if (window.setLoading) window.setLoading('orders-list');
            try {
                for (const orderId of orderStore.getState().selectedIds) {
                    await api.deleteOrder(orderId);
                }
                window.showToast?.('Orders deleted', 'success');
                orderStore.clearSelection();
                await orderStore.loadOrders();
            } catch (e) {
                window.showToast?.('Failed to bulk delete', 'error');
            }
        }
    });
};

window.bulkExport = function() {
    if (orderStore.getState().selectedIds.size === 0) return;
    window.showToast?.(`Exporting ${orderStore.getState().selectedIds.size} orders to CSV...`, 'info');
    setTimeout(() => {
        window.showToast?.('Export complete', 'success');
        orderStore.clearSelection();
    }, 1000);
};

window.bulkPrint = function() {
    if (orderStore.getState().selectedIds.size === 0) return;
    window.showToast?.(`Generating PDFs for ${orderStore.getState().selectedIds.size} orders...`, 'info');
    setTimeout(() => {
        window.showToast?.('Ready for printing', 'success');
        orderStore.clearSelection();
        window.print();
    }, 1000);
};

window.bulkAssign = function() {
    if (orderStore.getState().selectedIds.size === 0) return;
    // Simulate assigning to production
    window.showToast?.(`Assigning ${orderStore.getState().selectedIds.size} orders to production...`, 'info');
    setTimeout(() => {
        window.showToast?.('Orders assigned', 'success');
        orderStore.clearSelection();
    }, 1000);
};

window.bulkApprove = async function() {
    if (orderStore.getState().selectedIds.size === 0) return;
    window.showToast?.(`Approving ${orderStore.getState().selectedIds.size} orders...`, 'info');
    if (window.setLoading) window.setLoading('orders-list');
    
    try {
        for (const orderId of orderStore.getState().selectedIds) {
            const o = orderStore.getState().entities.find(ord => ord.id === orderId);
            if (o && (o.status === 'Draft' || o.status === 'Quotation Sent' || o.status === 'Awaiting Approval')) {
                await api.updateOrderStatus(orderId, 'Approved');
            }
        }
        window.showToast?.('Orders approved', 'success');
        orderStore.clearSelection(); // Exit bulk mode
        await orderStore.loadOrders();
    } catch (e) {
        window.showToast?.('Failed to bulk approve', 'error');
    }
};

window.openOrderDetails = async function(orderId) {
    if (orderStore.getState().isBulkMode) {
        window.toggleOrderSelection(orderId);
        return;
    }

    await orderStore.fetchActiveEntity(orderId);
    const order = orderStore.getState().activeEntity;
    if (!order) return;

    const container = document.getElementById('sheets-container');
    const existing = document.getElementById('orderDetailsSheet');
    if (existing) {
        existing.remove(); 
        const overlay = document.getElementById('orderDetailsSheet-overlay');
        if (overlay) overlay.remove();
    }

    const sheetHTML = BottomSheet({
        id: 'orderDetailsSheet',
        customHeader: getOrderDetailsHeader ? getOrderDetailsHeader(order) : '<div class="p-4">Loading Header...</div>',
        content: getOrderDetailsContent ? getOrderDetailsContent(order) : '<div class="p-4">Loading Content...</div>',
        height: '90vh'
    });

    container.insertAdjacentHTML('beforeend', sheetHTML);
    setTimeout(() => window.openSheet('orderDetailsSheet'), 50);
};


