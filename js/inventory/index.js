import { inventoryStore } from '../stores/InventoryStore.js?v=5.2';
import { vendorRepository } from '../repositories/VendorRepository.js?v=5.2';
import { orderRepository } from '../repositories/OrderRepository.js?v=5.2';
import { renderers } from '../renderers.js?v=5.2';
import { BottomSheet } from '../components/index.js?v=5.2';
import { bindFormValidation } from '../utils/formHandler.js?v=5.2';
import {
    getCreateItemSheetHTML, getCreateItemFooterHTML,
    getStockInSheetHTML, getStockInFooterHTML,
    getStockOutSheetHTML, getStockOutFooterHTML,
    getAdjustStockSheetHTML, getAdjustStockFooterHTML,
    getItemDetailsHeader, getItemDetailsContent, getItemDetailsFooter
} from './templates.js?v=5.2';

// ── EXPOSE WINDOW HANDLERS IMMEDIATELY ───────────────────────────────────────
// Prevents any "is not a function" race condition when inline attributes or FAB are tapped

window.setInventoryCategoryFilter = function(category) {
    inventoryStore.setCategory(category);

    document.querySelectorAll('#inventory-category-chips [data-category-filter]').forEach(btn => {
        const isActive = btn.getAttribute('data-category-filter') === category;
        btn.classList.toggle('bg-primary', isActive);
        btn.classList.toggle('text-white', isActive);
        btn.classList.toggle('border-primary', isActive);
        btn.classList.toggle('shadow-xs', isActive);
        btn.classList.toggle('bg-surface-container-lowest', !isActive);
        btn.classList.toggle('text-secondary', !isActive);
        btn.classList.toggle('border-outline-variant', !isActive);
    });
};

window.setInventoryStatusFilter = function(status) {
    inventoryStore.setStatus(status);

    document.querySelectorAll('[data-status-filter]').forEach(btn => {
        const isActive = btn.getAttribute('data-status-filter') === status;
        btn.className = isActive
            ? 'flex-1 py-2 rounded-[12px] text-[13px] font-semibold bg-surface-container-lowest text-on-surface shadow-xs transition-all cursor-pointer touch-manipulation'
            : 'flex-1 py-2 rounded-[12px] text-[13px] font-semibold text-secondary transition-all cursor-pointer touch-manipulation';
    });
};

window.setInventorySort = function(sortValue) {
    inventoryStore.setSort(sortValue);
};

// ── MODAL OPENERS ───────────────────────────────────────────────────────────

window.openCreateItemSheet = async function() {
    let vendors = [];
    try {
        vendors = await vendorRepository.getAll();
    } catch (e) {
        console.warn('Vendors load fallback', e);
    }

    const container = document.getElementById('sheets-container');
    document.getElementById('createItemSheet-content')?.remove();
    document.getElementById('createItemSheet-overlay')?.remove();

    const sheetHTML = BottomSheet({
        id: 'createItemSheet',
        title: 'New Inventory Item',
        content: getCreateItemSheetHTML(vendors),
        footerContent: getCreateItemFooterHTML(),
        isForm: true
    });

    container.insertAdjacentHTML('beforeend', sheetHTML);
    setTimeout(() => {
        bindFormValidation('createItemSheet-content', 'create-item-submit');
        window.openSheet('createItemSheet');
    }, 50);
};

window.openStockInModal = async function(preselectedId = null) {
    const items = inventoryStore.getState().entities || [];
    let vendors = [];
    try {
        vendors = await vendorRepository.getAll();
    } catch (e) { /* ignore */ }

    const container = document.getElementById('sheets-container');
    document.getElementById('stockInSheet-content')?.remove();
    document.getElementById('stockInSheet-overlay')?.remove();

    const sheetHTML = BottomSheet({
        id: 'stockInSheet',
        title: 'Stock In (Goods Inward)',
        content: getStockInSheetHTML(items, vendors, preselectedId),
        footerContent: getStockInFooterHTML(),
        isForm: true
    });

    container.insertAdjacentHTML('beforeend', sheetHTML);
    setTimeout(() => {
        bindFormValidation('stockInSheet-content', 'stock-in-submit');
        window.openSheet('stockInSheet');
    }, 50);
};

window.openStockOutModal = async function(preselectedId = null) {
    const items = inventoryStore.getState().entities || [];
    let orders = [];
    try {
        orders = await orderRepository.getAll();
    } catch (e) { /* ignore */ }

    const container = document.getElementById('sheets-container');
    document.getElementById('stockOutSheet-content')?.remove();
    document.getElementById('stockOutSheet-overlay')?.remove();

    const sheetHTML = BottomSheet({
        id: 'stockOutSheet',
        title: 'Stock Out (Issue to Production)',
        content: getStockOutSheetHTML(items, orders, preselectedId),
        footerContent: getStockOutFooterHTML(),
        isForm: true
    });

    container.insertAdjacentHTML('beforeend', sheetHTML);
    setTimeout(() => {
        bindFormValidation('stockOutSheet-content', 'stock-out-submit');
        window.openSheet('stockOutSheet');
    }, 50);
};

window.openAdjustModal = function(preselectedId = null) {
    const items = inventoryStore.getState().entities || [];

    const container = document.getElementById('sheets-container');
    document.getElementById('adjustStockSheet-content')?.remove();
    document.getElementById('adjustStockSheet-overlay')?.remove();

    const sheetHTML = BottomSheet({
        id: 'adjustStockSheet',
        title: 'Adjust Stock Level',
        content: getAdjustStockSheetHTML(items, preselectedId),
        footerContent: getAdjustStockFooterHTML(),
        isForm: true
    });

    container.insertAdjacentHTML('beforeend', sheetHTML);
    setTimeout(() => {
        bindFormValidation('adjustStockSheet-content', 'adjust-submit');
        window.openSheet('adjustStockSheet');
    }, 50);
};

window.openItemDetails = async function(id) {
    await inventoryStore.fetchActiveEntity(id);
    const item = inventoryStore.getState().activeEntity;
    if (!item) return;

    let vendor = null;
    if (item.supplier) {
        try {
            const vendors = await vendorRepository.getAll();
            vendor = vendors.find(v => v.name === item.supplier || v.id === item.supplierId);
        } catch (e) { /* ignore */ }
    }

    const container = document.getElementById('sheets-container');
    document.getElementById('itemDetailsSheet-content')?.remove();
    document.getElementById('itemDetailsSheet-overlay')?.remove();

    const sheetHTML = BottomSheet({
        id: 'itemDetailsSheet',
        customHeader: getItemDetailsHeader(item),
        content: getItemDetailsContent(item, vendor),
        footerContent: getItemDetailsFooter(item),
        height: '92vh'
    });

    container.insertAdjacentHTML('beforeend', sheetHTML);
    setTimeout(() => window.openSheet('itemDetailsSheet'), 50);
};

window.generateItemSKU = function() {
    const cat = document.getElementById('new-item-category')?.value || 'GEN';
    const sub = document.getElementById('new-item-subcategory')?.value || '';
    const prefix = cat.substring(0, 3).toUpperCase();
    const subPrefix = sub ? sub.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase() : 'ITM';
    const rand = Math.floor(100 + Math.random() * 900);
    const skuInput = document.getElementById('new-item-sku');
    if (skuInput) {
        skuInput.value = `${prefix}-${subPrefix}-${rand}`;
        skuInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
};

// ── CRUD SUBMIT ACTIONS ─────────────────────────────────────────────────────

window.saveNewItem = async function() {
    const name = document.getElementById('new-item-name')?.value?.trim();
    if (!name) {
        window.showToast?.('Please enter an item name', 'error');
        return;
    }

    const category = document.getElementById('new-item-category')?.value || 'Fabric';
    const subCategory = document.getElementById('new-item-subcategory')?.value?.trim() || '';
    const sku = document.getElementById('new-item-sku')?.value?.trim() || `SKU-${Date.now().toString().slice(-4)}`;
    const quantity = parseFloat(document.getElementById('new-item-qty')?.value) || 0;
    const unit = document.getElementById('new-item-unit')?.value || 'Kgs';
    const costPrice = parseFloat(document.getElementById('new-item-cost')?.value) || 0;
    const minStock = parseFloat(document.getElementById('new-item-min-stock')?.value) || 0;
    const location = document.getElementById('new-item-location')?.value?.trim() || '';
    const color = document.getElementById('new-item-color')?.value?.trim() || '';
    const supplier = document.getElementById('new-item-supplier')?.value || '';
    const notes = document.getElementById('new-item-notes')?.value?.trim() || '';

    try {
        await inventoryStore.createItem({
            name,
            category,
            subCategory,
            sku,
            quantity,
            unit,
            costPrice,
            totalValue: quantity * costPrice,
            minStock,
            location,
            color,
            supplier,
            notes
        });

        window.closeSheet('createItemSheet');
        window.showToast?.(`Item "${name}" created successfully!`, 'success');
    } catch (err) {
        console.error('Failed to create item:', err);
        window.showToast?.('Failed to create inventory item: ' + err.message, 'error');
    }
};

window.confirmStockIn = async function() {
    const itemId = document.getElementById('stock-in-item-id')?.value;
    const qty = parseFloat(document.getElementById('stock-in-qty')?.value);

    if (!itemId) {
        window.showToast?.('Please select a material', 'error');
        return;
    }
    if (!qty || qty <= 0) {
        window.showToast?.('Please enter a valid quantity received', 'error');
        return;
    }

    const costPrice = parseFloat(document.getElementById('stock-in-cost')?.value) || undefined;
    const supplier = document.getElementById('stock-in-supplier')?.value || undefined;
    const poNumber = document.getElementById('stock-in-po')?.value?.trim() || undefined;
    const location = document.getElementById('stock-in-location')?.value?.trim() || undefined;
    const notes = document.getElementById('stock-in-notes')?.value?.trim() || undefined;

    try {
        await inventoryStore.recordStockIn(itemId, {
            qty,
            costPrice,
            supplier,
            poNumber,
            location,
            notes
        });

        window.closeSheet('stockInSheet');
        window.showToast?.(`Stock In: +${qty} recorded successfully!`, 'success');

        // If item details sheet is currently open, refresh it
        const activeItem = inventoryStore.getState().activeEntity;
        if (activeItem && activeItem.id === itemId) {
            window.openItemDetails(itemId);
        }
    } catch (err) {
        console.error('Failed to record stock in:', err);
        window.showToast?.('Failed to record stock in: ' + err.message, 'error');
    }
};

window.confirmStockOut = async function() {
    const itemId = document.getElementById('stock-out-item-id')?.value;
    const qty = parseFloat(document.getElementById('stock-out-qty')?.value);

    if (!itemId) {
        window.showToast?.('Please select a material', 'error');
        return;
    }
    if (!qty || qty <= 0) {
        window.showToast?.('Please enter a valid quantity to issue', 'error');
        return;
    }

    const orderId = document.getElementById('stock-out-order')?.value || undefined;
    const purpose = document.getElementById('stock-out-purpose')?.value || 'Cutting / Stitching';
    const notes = document.getElementById('stock-out-notes')?.value?.trim() || undefined;

    try {
        await inventoryStore.recordStockOut(itemId, {
            qty,
            orderId,
            purpose,
            notes
        });

        window.closeSheet('stockOutSheet');
        window.showToast?.(`Stock Out: -${qty} issued to ${purpose}`, 'success');

        const activeItem = inventoryStore.getState().activeEntity;
        if (activeItem && activeItem.id === itemId) {
            window.openItemDetails(itemId);
        }
    } catch (err) {
        console.error('Failed to record stock out:', err);
        window.showToast?.('Failed to record stock out: ' + err.message, 'error');
    }
};

window.confirmStockAdjust = async function() {
    const itemId = document.getElementById('adjust-item-id')?.value;
    const newQtyStr = document.getElementById('adjust-qty')?.value;

    if (!itemId) {
        window.showToast?.('Please select a material', 'error');
        return;
    }
    if (newQtyStr === '' || isNaN(parseFloat(newQtyStr)) || parseFloat(newQtyStr) < 0) {
        window.showToast?.('Please enter a valid count quantity', 'error');
        return;
    }

    const newQty = parseFloat(newQtyStr);
    const reasonCode = document.getElementById('adjust-reason')?.value || 'Physical Audit Mismatch';
    const notes = document.getElementById('adjust-notes')?.value?.trim() || '';

    try {
        await inventoryStore.adjustStock(itemId, {
            newQty,
            reasonCode,
            notes
        });

        window.closeSheet('adjustStockSheet');
        window.showToast?.(`Inventory stock adjusted to ${newQty}`, 'success');

        const activeItem = inventoryStore.getState().activeEntity;
        if (activeItem && activeItem.id === itemId) {
            window.openItemDetails(itemId);
        }
    } catch (err) {
        console.error('Failed to adjust stock:', err);
        window.showToast?.('Failed to adjust stock: ' + err.message, 'error');
    }
};

// ── INITIALIZATION ───────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    initUI();
    inventoryStore.subscribe(renderUI);
    inventoryStore.loadInventory();
});

function initUI() {
    // Search input
    const searchInput = document.getElementById('inventory-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            inventoryStore.setSearch(e.target.value);
        });
    }
}

// ── STATE-DRIVEN RENDERING ───────────────────────────────────────────────────

function renderUI(state) {
    const { entities, kpis, loading, error } = state;

    // Update KPIs
    if (kpis) {
        const valEl = document.getElementById('kpi-valuation');
        if (valEl) {
            const v = kpis.totalValuation || 0;
            if (v >= 100000) {
                valEl.textContent = `₹ ${(v / 100000).toFixed(2)} Lakhs`;
            } else {
                valEl.textContent = `₹ ${v.toLocaleString('en-IN')}`;
            }
        }

        const skuEl = document.getElementById('kpi-skus');
        if (skuEl) skuEl.textContent = `${kpis.totalSKUs || 0} Items`;

        const lowEl = document.getElementById('kpi-low-stock');
        if (lowEl) lowEl.textContent = `${kpis.lowStockCount || 0} Items`;

        const outEl = document.getElementById('kpi-out-stock');
        if (outEl) outEl.textContent = `${kpis.outOfStockCount || 0} Items`;
    }

    // Render Items List
    const container = document.getElementById('inventory-list');
    if (!container) return;

    if (loading) {
        if (window.setLoading) {
            window.setLoading('inventory-list');
        } else {
            container.innerHTML = '<div class="p-md text-center text-secondary">Loading materials...</div>';
        }
    } else if (error) {
        container.innerHTML = `<div class="p-md text-center text-error font-medium">Failed to load inventory: ${error.message}</div>`;
    } else if (entities.length === 0) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center p-12 text-center bg-surface-container-lowest rounded-3xl border border-outline-variant/40">
                <div class="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center mb-4 text-secondary">
                    <span class="material-symbols-outlined text-[32px]">inventory_2</span>
                </div>
                <h3 class="text-[17px] font-bold text-on-surface mb-1">No Materials Found</h3>
                <p class="text-[13px] text-secondary max-w-[280px] mb-4">No inventory items matched your active category, status, or search filters.</p>
                <button onclick="window.openCreateItemSheet()" class="px-5 py-2.5 rounded-xl bg-primary text-white text-[13px] font-bold active-scale transition-apple shadow-xs cursor-pointer">
                    + Add New Material
                </button>
            </div>
        `;
    } else {
        container.innerHTML = entities.map(item => renderers.inventoryCard(item)).join('');
    }
}

