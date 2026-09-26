// js/billings/index.js — Unified Billings Controller & Workbench for Garment OS
import { api } from '../services/api.js?v=5.6';
import { calculateInvoice, fmtCurrency, fmtDate } from './calculator.js';
import {
    BILLING_TYPES, getNextSerialNumber,
    getStatsBarHTML, getBillingCardHTML, getEmptyStateHTML,
    getCreateSheetHTML, getBillingDetailsHTML, getPrintHTML
} from './templates.js?v=6.0';
import { renderInvoicePageMarkup } from './document-renderer.js';

// ── Module State ────────────────────────────────────────────────────
let currentTab = 'Sales_Bill';
let allBillings = {};   // { Quotation: [...], Sales_Bill: [...], ... }
let currentSearchQuery = '';
let currentStatusFilter = '';
let currentSortOrder = 'date-desc';
let currentFormItems = [];
let cachedInventory = [];
let cachedContacts = {};  // { customer: [...], vendor: [...] }
let selectedDocId = null;
let sheetsContainer = null;
let billingSaveInFlight = false;

// ── Initialization ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    sheetsContainer = document.getElementById('sheets-container');

    if (sheetsContainer) {
        sheetsContainer.innerHTML = `
            <div id="billingCreateSheet-portal"></div>
            <div id="billingDetailsSheet-portal"></div>
            <div id="recordPaymentSheet-portal"></div>
        `;
    }

    // Check URL query parameters (e.g. ?type=Quotation or ?createFromOrder=ord-123)
    const urlParams = new URLSearchParams(window.location.search);
    const initialType = urlParams.get('type');
    if (initialType && BILLING_TYPES[initialType]) {
        currentTab = initialType;
    }
    const createFromOrderId = urlParams.get('createFromOrder');

    // Load data in parallel
    await Promise.all([
        loadStats(),
        loadBillings(currentTab),
        preloadContacts(),
        preloadInventory()
    ]);

    // Bind search input
    document.getElementById('billings-search-input')?.addEventListener('input', (e) => {
        currentSearchQuery = e.target.value.trim().toLowerCase();
        renderBillingsList();
    });

    setTabActive(currentTab);

    // Auto-trigger Create from Order if requested
    if (createFromOrderId) {
        await window.createInvoiceFromOrder(createFromOrderId);
    }
});

// ── Data Loading ────────────────────────────────────────────────────

async function loadStats() {
    try {
        const stats = await api.getBillingStats();
        const el = document.getElementById('billings-stats-bar');
        if (el) el.innerHTML = getStatsBarHTML(stats);
    } catch (e) {
        console.error('Failed to load billing stats:', e);
    }
}

async function loadBillings(type) {
    try {
        window.startSubtleLoading?.();
        const docs = await api.getBillings({ type });
        allBillings[type] = docs || [];
        renderBillingsList();
        
        // Auto-select first document on desktop if none selected
        if (window.innerWidth >= 1024 && allBillings[type].length > 0 && !selectedDocId) {
            selectBillingDoc(allBillings[type][0].id);
        }
        window.finishSubtleLoading?.();
    } catch (e) {
        console.error(`Failed to load ${type}:`, e);
        window.showToast?.('Failed to load documents', 'error');
        window.finishSubtleLoading?.();
    }
}

async function preloadContacts() {
    try {
        const [customers, vendors] = await Promise.all([
            api.getCustomers(),
            api.getVendors()
        ]);
        cachedContacts.customer = customers || [];
        cachedContacts.vendor = vendors || [];
    } catch (e) {
        console.error('Failed to preload contacts:', e);
        cachedContacts.customer = [];
        cachedContacts.vendor = [];
    }
}

async function preloadInventory() {
    try {
        cachedInventory = (await api.getInventory()) || [];
    } catch (e) {
        console.error('Failed to preload inventory:', e);
        cachedInventory = [];
    }
}

// ── List Rendering ──────────────────────────────────────────────────

function renderBillingsList() {
    const container = document.getElementById('billings-list');
    if (!container) return;

    let docs = [...(allBillings[currentTab] || [])];

    // Search filter
    if (currentSearchQuery) {
        docs = docs.filter(d =>
            (d.invoice_number || '').toLowerCase().includes(currentSearchQuery) ||
            (d.contact_name || '').toLowerCase().includes(currentSearchQuery) ||
            (d.notes || '').toLowerCase().includes(currentSearchQuery)
        );
    }

    // Status filter
    if (currentStatusFilter) {
        docs = docs.filter(d => d.status === currentStatusFilter);
    }

    // Sorting
    docs.sort((a, b) => {
        if (currentSortOrder === 'date-desc') {
            return new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0);
        } else if (currentSortOrder === 'date-asc') {
            return new Date(a.date || a.createdAt || 0) - new Date(b.date || b.createdAt || 0);
        } else if (currentSortOrder === 'amount-desc') {
            return (b.grand_total || 0) - (a.grand_total || 0);
        } else if (currentSortOrder === 'amount-asc') {
            return (a.grand_total || 0) - (b.grand_total || 0);
        }
        return 0;
    });

    if (docs.length === 0) {
        container.innerHTML = getEmptyStateHTML(currentTab);
        const desktopPane = document.getElementById('billing-desktop-preview-pane');
        if (desktopPane) {
            desktopPane.innerHTML = `
                <div class="flex flex-col items-center justify-center py-24 text-center text-secondary">
                    <span class="material-symbols-outlined text-[48px] opacity-40 mb-2">description</span>
                    <p class="text-[14px]">No document selected</p>
                </div>
            `;
        }
        return;
    }

    container.innerHTML = docs.map(d => getBillingCardHTML(d, d.id === selectedDocId)).join('');
}

function setTabActive(type) {
    const tabs = document.querySelectorAll('.billing-tab-btn');
    tabs.forEach(btn => {
        const isActive = btn.dataset.type === type;
        if (isActive) {
            btn.classList.add('bg-surface-variant', 'text-on-surface');
            btn.classList.remove('text-secondary');
        } else {
            btn.classList.remove('bg-surface-variant', 'text-on-surface');
            btn.classList.add('text-secondary');
        }
    });

    updateStatusChips(type);
}

function updateStatusChips(type) {
    const meta = BILLING_TYPES[type];
    const chipBar = document.getElementById('billings-status-chips');
    if (!chipBar || !meta) return;

    chipBar.innerHTML = [
        { label: 'All', value: '' },
        ...meta.statuses.map(s => ({ label: s.replace('_', ' '), value: s }))
    ].map(({ label, value }) => `
        <button type="button" onclick="window.setBillingStatusFilter('${value}')"
            class="billing-status-chip flex-shrink-0 px-3 py-1.5 rounded-full text-[13px] font-semibold border transition-all
            ${currentStatusFilter === value ? 'bg-primary text-white border-primary' : 'bg-surface-container-lowest border-outline-variant text-secondary'}">
            ${label}
        </button>
    `).join('');
}

// ── Tab & Filter Handlers ───────────────────────────────────────────

window.switchBillingTab = async function (type) {
    currentTab = type;
    currentStatusFilter = '';
    currentSearchQuery = '';
    selectedDocId = null;
    const searchInput = document.getElementById('billings-search-input');
    if (searchInput) searchInput.value = '';
    setTabActive(type);
    if (!allBillings[type]) {
        await loadBillings(type);
    } else {
        renderBillingsList();
    }
};

window.setBillingStatusFilter = function (status) {
    currentStatusFilter = status;
    updateStatusChips(currentTab);
    renderBillingsList();
};

window.setBillingSort = function (sortOrder) {
    currentSortOrder = sortOrder;
    renderBillingsList();
};

window.exportBillingsCSV = function () {
    const docs = allBillings[currentTab] || [];
    if (docs.length === 0) {
        window.showToast?.('No records to export', 'info');
        return;
    }

    const headers = ['Invoice Number', 'Type', 'Contact Name', 'Date', 'Due Date', 'Status', 'Subtotal', 'Discount', 'GST Total', 'Grand Total', 'Amount Paid', 'Notes'];
    const rows = docs.map(d => [
        `"${(d.invoice_number || '').replace(/"/g, '""')}"`,
        `"${(d.transaction_type || '').replace(/"/g, '""')}"`,
        `"${(d.contact_name || '').replace(/"/g, '""')}"`,
        `"${d.date || ''}"`,
        `"${d.due_date || ''}"`,
        `"${d.status || ''}"`,
        Number(d.subtotal || 0).toFixed(2),
        Number(d.discount || 0).toFixed(2),
        Number(d.tax_total || 0).toFixed(2),
        Number(d.grand_total || 0).toFixed(2),
        Number(d.amount_paid || 0).toFixed(2),
        `"${(d.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${currentTab}_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.showToast?.('Exported to CSV', 'success');
};

// ── Document Selection & Details View ───────────────────────────────

window.selectBillingDoc = async function (id) {
    selectedDocId = id;
    renderBillingsList();

    try {
        const doc = await api.getBilling(id);
        if (!doc) return;

        const contactInfo = await fetchContactAddress(doc);

        // If screen is wide (>= 1024px), render in desktop side-by-side pane
        const desktopPane = document.getElementById('billing-desktop-preview-pane');
        if (window.innerWidth >= 1024 && desktopPane) {
            desktopPane.innerHTML = getBillingDetailsHTML(doc, contactInfo);
            return;
        }

        // On mobile/tablet, open details sheet
        window.openBillingDetails(id);
    } catch (e) {
        console.error('Failed to select document:', e);
    }
};

window.openBillingDetails = async function (id) {
    try {
        const doc = await api.getBilling(id);
        if (!doc) return;

        const contactInfo = await fetchContactAddress(doc);
        const portal = document.getElementById('billingDetailsSheet-portal');
        if (!portal) return;

        portal.innerHTML = `
            <div id="billingDetailsSheet-overlay" class="bottom-sheet-overlay" onclick="window.closeBillingDetails()"></div>
            <div id="billingDetailsSheet-content" class="bottom-sheet-content overflow-y-auto" style="height:95vh; max-height:95vh;">
                <div class="sheet-handle"></div>
                <div class="flex justify-between items-center px-lg pb-md pt-sm border-b border-outline-variant/30">
                    <h2 class="text-[18px] font-bold text-on-surface">Document Details</h2>
                    <button type="button" onclick="window.closeBillingDetails()" class="w-9 h-9 rounded-full bg-surface-variant flex items-center justify-center active-scale">
                        <span class="material-symbols-outlined text-[20px] text-secondary">close</span>
                    </button>
                </div>
                ${getBillingDetailsHTML(doc, contactInfo)}
            </div>
        `;

        requestAnimationFrame(() => openSheet('billingDetailsSheet'));
    } catch (e) {
        console.error('Open billing details error:', e);
        window.showToast?.('Failed to load document', 'error');
    }
};

window.closeBillingDetails = function () {
    closeSheet('billingDetailsSheet');
    setTimeout(() => {
        const portal = document.getElementById('billingDetailsSheet-portal');
        if (portal) portal.innerHTML = '';
    }, 400);
};

// ── Create & Edit Handlers ──────────────────────────────────────────

window.openCreateBillingSheet = async function (type) {
    type = type || currentTab;
    const meta = BILLING_TYPES[type];
    if (!meta) return;

    currentFormItems = [];

    if (!cachedContacts[meta.contactType] || cachedContacts[meta.contactType].length === 0) {
        await preloadContacts();
    }

    const contacts = cachedContacts[meta.contactType] || [];

    let linkedBills = [];
    if (type === 'Payment_In') {
        linkedBills = (allBillings['Sales_Bill'] || await api.getBillings({ type: 'Sales_Bill' }))
            .filter(b => ['Finalized', 'Partially_Paid'].includes(b.status));
    } else if (type === 'Payment_Out') {
        linkedBills = (allBillings['Purchase_Bill'] || await api.getBillings({ type: 'Purchase_Bill' }))
            .filter(b => ['Finalized', 'Partially_Paid'].includes(b.status));
    }

    const nextSerial = getNextSerialNumber(type, allBillings[type] || []);

    const portal = document.getElementById('billingCreateSheet-portal');
    if (!portal) return;
    portal.innerHTML = getCreateSheetHTML(type, contacts, cachedInventory, linkedBills, nextSerial);

    // Bind payment amount input
    const payAmtEl = document.getElementById('billing-payment-amount');
    if (payAmtEl) {
        payAmtEl.addEventListener('input', updateBillingTotals);
    }

    requestAnimationFrame(() => openSheet('billingCreateSheet'));
};

window.closeBillingCreateSheet = function () {
    closeSheet('billingCreateSheet');
    setTimeout(() => {
        const portal = document.getElementById('billingCreateSheet-portal');
        if (portal) portal.innerHTML = '';
    }, 400);
};

// ── Contact Change Handler ──────────────────────────────────────────

window.onContactSelectChange = function () {
    const contactSelect = document.getElementById('billing-contact-select');
    if (!contactSelect) return;

    const opt = contactSelect.selectedOptions[0];
    const gstin = opt?.dataset?.gstin || '';
    const state = opt?.dataset?.state || '';
    const infoEl = document.getElementById('billing-contact-info');
    const placeEl = document.getElementById('billing-place-of-supply');

    if (infoEl) {
        if (gstin) {
            infoEl.textContent = `GSTIN: ${gstin}`;
            infoEl.classList.remove('hidden');
        } else {
            infoEl.classList.add('hidden');
        }
    }

    if (state && placeEl) {
        placeEl.value = state.includes('Tamil') ? '33-Tamil Nadu' : state;
    }
    updateBillingTotals();
};

// ── Line Items Management ───────────────────────────────────────────

window.onInventoryItemSelect = function () {
    const select = document.getElementById('billing-item-inventory');
    if (!select || !select.value) return;
    const opt = select.selectedOptions[0];
    const price = parseFloat(opt.dataset.price) || 0;
    const name = opt.dataset.name || '';
    const hsn = opt.dataset.hsn || '6109';

    const nameInput = document.getElementById('billing-item-name');
    const priceInput = document.getElementById('billing-item-price');
    const hsnInput = document.getElementById('billing-item-hsn');

    if (nameInput && !nameInput.value) nameInput.value = name;
    if (priceInput) priceInput.value = price.toFixed(2);
    if (hsnInput) hsnInput.value = hsn;
};

window.addBillingItem = function () {
    const editIndexEl = document.getElementById('billing-item-edit-index');
    const editIndex = editIndexEl ? parseInt(editIndexEl.value, 10) : -1;

    const nameEl = document.getElementById('billing-item-name');
    const hsnEl = document.getElementById('billing-item-hsn');
    const qtyEl = document.getElementById('billing-item-qty');
    const priceEl = document.getElementById('billing-item-price');
    const taxEl = document.getElementById('billing-item-tax');
    const discEl = document.getElementById('billing-item-discount');
    const invEl = document.getElementById('billing-item-inventory');

    const name = nameEl?.value?.trim();
    const hsn = hsnEl?.value?.trim() || '6109';
    const qty = parseFloat(qtyEl?.value) || 0;
    const price = parseFloat(priceEl?.value) || 0;
    const taxPct = parseFloat(taxEl?.value) || 0;
    const discPct = parseFloat(discEl?.value) || 0;
    const itemId = invEl?.value || '';

    if (!name) { window.showToast?.('Item name is required', 'error'); return; }
    if (qty <= 0) { window.showToast?.('Quantity must be greater than 0', 'error'); return; }
    if (price < 0) { window.showToast?.('Price cannot be negative', 'error'); return; }

    const itemObj = {
        item_name: name,
        item_id: itemId,
        description: '',
        hsn_code: hsn,
        quantity: qty,
        unit: 'pcs',
        unit_price: price,
        discount_pct: discPct,
        tax_pct: taxPct
    };

    if (editIndex >= 0 && editIndex < currentFormItems.length) {
        currentFormItems[editIndex] = itemObj;
        window.showToast?.('Item updated', 'success');
    } else {
        currentFormItems.push(itemObj);
        window.showToast?.('Item added', 'success');
    }

    window.cancelEditBillingItem();
    renderFormItems();
};

window.editBillingItem = function (index) {
    const item = currentFormItems[index];
    if (!item) return;

    const editIndexEl = document.getElementById('billing-item-edit-index');
    if (editIndexEl) editIndexEl.value = index;

    const nameEl = document.getElementById('billing-item-name');
    const hsnEl = document.getElementById('billing-item-hsn');
    const qtyEl = document.getElementById('billing-item-qty');
    const priceEl = document.getElementById('billing-item-price');
    const taxEl = document.getElementById('billing-item-tax');
    const discEl = document.getElementById('billing-item-discount');
    const invEl = document.getElementById('billing-item-inventory');
    const submitBtn = document.getElementById('billing-item-submit-btn');
    const cancelBtn = document.getElementById('billing-item-cancel-edit-btn');

    if (nameEl) nameEl.value = item.item_name || '';
    if (hsnEl) hsnEl.value = item.hsn_code || '6109';
    if (qtyEl) qtyEl.value = item.quantity || '';
    if (priceEl) priceEl.value = item.unit_price || '';
    if (taxEl) taxEl.value = item.tax_pct || 5;
    if (discEl) discEl.value = item.discount_pct || '';
    if (invEl) invEl.value = item.item_id || '';

    if (submitBtn) submitBtn.innerHTML = `<span class="material-symbols-outlined text-[16px]">check</span> Update Item`;
    if (cancelBtn) cancelBtn.classList.remove('hidden');

    nameEl?.focus();
};

window.cancelEditBillingItem = function () {
    const editIndexEl = document.getElementById('billing-item-edit-index');
    if (editIndexEl) editIndexEl.value = '-1';

    const nameEl = document.getElementById('billing-item-name');
    const hsnEl = document.getElementById('billing-item-hsn');
    const qtyEl = document.getElementById('billing-item-qty');
    const priceEl = document.getElementById('billing-item-price');
    const taxEl = document.getElementById('billing-item-tax');
    const discEl = document.getElementById('billing-item-discount');
    const invEl = document.getElementById('billing-item-inventory');
    const submitBtn = document.getElementById('billing-item-submit-btn');
    const cancelBtn = document.getElementById('billing-item-cancel-edit-btn');

    if (nameEl) nameEl.value = '';
    if (hsnEl) hsnEl.value = '6109';
    if (qtyEl) qtyEl.value = '';
    if (priceEl) priceEl.value = '';
    if (taxEl) taxEl.value = '5';
    if (discEl) discEl.value = '';
    if (invEl) invEl.value = '';

    if (submitBtn) submitBtn.innerHTML = `<span class="material-symbols-outlined text-[16px]">add_circle</span> Add Item`;
    if (cancelBtn) cancelBtn.classList.add('hidden');
};

window.removeBillingItem = function (index) {
    currentFormItems.splice(index, 1);
    window.cancelEditBillingItem();
    renderFormItems();
};

function renderFormItems() {
    const container = document.getElementById('billing-items-list');
    const emptyEl = document.getElementById('billing-items-empty');
    if (!container) return;

    if (currentFormItems.length === 0) {
        if (emptyEl) emptyEl.style.display = 'block';
        container.querySelectorAll('.billing-item-card').forEach(el => el.remove());
    } else {
        if (emptyEl) emptyEl.style.display = 'none';
        container.querySelectorAll('.billing-item-card').forEach(el => el.remove());

        const calc = calculateInvoice(currentFormItems);

        calc.items.forEach((item, i) => {
            const el = document.createElement('div');
            el.className = 'billing-item-card bg-surface-container-lowest border border-outline-variant/50 rounded-xl p-3 shadow-xs';
            el.innerHTML = `
                <div class="flex items-start justify-between gap-2">
                    <div class="flex-1 min-w-0 cursor-pointer" onclick="window.editBillingItem(${i})" title="Tap to edit item">
                        <div class="text-[14px] font-semibold text-on-surface flex items-center gap-1.5">
                            ${item.item_name}
                            <span class="text-[11px] font-mono text-secondary bg-surface-variant px-1.5 py-0.2 rounded">HSN ${item.hsn_code}</span>
                        </div>
                        <div class="text-[12px] text-secondary mt-0.5">
                            ${item.quantity} ${item.unit} × ${fmtCurrency(item.unit_price)}
                            ${item.discount_pct > 0 ? ` · <span class="text-error">−${item.discount_pct}%</span>` : ''}
                            ${item.tax_pct > 0 ? ` · <span class="text-primary">+${item.tax_pct}% GST</span>` : ''}
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="text-[15px] font-bold text-on-surface font-mono">${fmtCurrency(item.row_total)}</span>
                        <button type="button" onclick="window.editBillingItem(${i})" class="text-secondary hover:text-primary active-scale" title="Edit">
                            <span class="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button type="button" onclick="window.removeBillingItem(${i})" class="text-error active-scale" title="Remove">
                            <span class="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                    </div>
                </div>
            `;
            container.appendChild(el);
        });
    }

    updateBillingTotals();
}

function updateBillingTotals() {
    const isPayment = document.getElementById('billing-type')?.value?.includes('Payment');
    
    if (isPayment) {
        const payAmt = parseFloat(document.getElementById('billing-payment-amount')?.value) || 0;
        const gEl = document.getElementById('billing-display-grand');
        if (gEl) gEl.textContent = fmtCurrency(payAmt);
        return;
    }

    const calc = calculateInvoice(currentFormItems);

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('billing-display-subtotal', fmtCurrency(calc.grossSubtotal));
    set('billing-display-discount', `−${fmtCurrency(calc.totalDiscount)}`);
    set('billing-display-tax', fmtCurrency(calc.totalTax));
    set('billing-display-roundoff', `${calc.roundOff >= 0 ? '+' : ''}${fmtCurrency(calc.roundOff)}`);
    set('billing-display-grand', fmtCurrency(calc.grandTotal));
}

// ── Save Operations ──────────────────────────────────────────────────

function collectFormData(status) {
    const type = document.getElementById('billing-type')?.value;
    const contactSelect = document.getElementById('billing-contact-select');
    const contactId = contactSelect?.value;
    const contactName = contactSelect?.selectedOptions[0]?.text || '';
    const contactGstin = contactSelect?.selectedOptions[0]?.dataset?.gstin || '';
    const placeOfSupply = document.getElementById('billing-place-of-supply')?.value || '33-Tamil Nadu';
    const date = document.getElementById('billing-date')?.value;
    const dueDate = document.getElementById('billing-due-date')?.value || '';
    const notes = document.getElementById('billing-notes')?.value?.trim() || '';
    const orderId = document.getElementById('billing-order-id')?.value || null;
    const editId = document.getElementById('billing-edit-id')?.value;

    if (!contactId) { window.showToast?.('Please select a contact', 'error'); return null; }
    if (!date) { window.showToast?.('Please select a date', 'error'); return null; }

    const isPayment = type === 'Payment_In' || type === 'Payment_Out';

    if (isPayment) {
        const amount = parseFloat(document.getElementById('billing-payment-amount')?.value) || 0;
        if (amount <= 0) { window.showToast?.('Please enter a payment amount', 'error'); return null; }
        const linkedBillId = document.getElementById('billing-linked-bill')?.value || '';
        return {
            ...(editId ? { id: editId } : {}),
            transaction_type: type,
            contact_id: contactId,
            contact_type: BILLING_TYPES[type]?.contactType || 'customer',
            contact_name: contactName,
            contact_gstin: contactGstin,
            place_of_supply: placeOfSupply,
            date, due_date: dueDate,
            grand_total: amount,
            linked_bill_id: linkedBillId,
            order_id: orderId,
            status,
            notes,
            items: []
        };
    }

    if (currentFormItems.length === 0) {
        window.showToast?.('Please add at least one line item', 'error');
        return null;
    }

    return {
        ...(editId ? { id: editId } : {}),
        transaction_type: type,
        contact_id: contactId,
        contact_type: BILLING_TYPES[type]?.contactType || 'customer',
        contact_name: contactName,
        contact_gstin: contactGstin,
        place_of_supply: placeOfSupply,
        tax_type: placeOfSupply.includes('Tamil') ? 'INTRA_STATE' : 'INTER_STATE',
        order_id: orderId,
        date, due_date: dueDate,
        status,
        notes,
        items: currentFormItems
    };
}

window.saveBillingDraft = async function () {
    const data = collectFormData('Draft');
    if (!data) return;
    await saveBilling(data);
};

window.saveBillingAndFinalize = async function () {
    const data = collectFormData('Finalized');
    if (!data) return;
    await saveBilling(data);
};

async function saveBilling(data) {
    if (billingSaveInFlight) return;
    billingSaveInFlight = true;
    try {
        window.showToast?.('Saving document...', 'info');
        let saved;
        if (data.id) {
            saved = await api.updateBilling(data.id, data);
        } else {
            saved = await api.createBilling(data);
        }
        window.closeBillingCreateSheet();
        
        allBillings[currentTab] = null;
        await Promise.all([loadBillings(currentTab), loadStats()]);
        
        if (saved && saved.id) {
            window.selectBillingDoc(saved.id);
        }
        window.showToast?.(`${BILLING_TYPES[currentTab]?.label.slice(0,-1)} saved! #${saved.invoice_number}`, 'success');
    } catch (e) {
        console.error('Save billing error:', e);
        window.showToast?.(e.message || 'Failed to save document', 'error');
    } finally {
        billingSaveInFlight = false;
    }
}

// ── Document Operations (Finalize, Convert, Void, Delete, Duplicate) ──

window.finalizeBillingDoc = async function (id) {
    window.showConfirmation?.({
        title: 'Finalize Document',
        message: 'Finalizing locks this document and executes inventory and ledger adjustments. This action cannot be undone.',
        confirmText: 'Finalize Document',
        onConfirm: async () => {
            try {
                window.showToast?.('Finalizing...', 'info');
                const doc = await api.finalizeBilling(id);
                window.closeBillingDetails();
                allBillings[currentTab] = null;
                await Promise.all([loadBillings(currentTab), loadStats()]);
                window.selectBillingDoc(id);
                window.showToast?.(`${doc.invoice_number} finalized!`, 'success');
            } catch (e) {
                window.showToast?.(e.message || 'Failed to finalize', 'error');
            }
        }
    });
};

window.convertBillingToInvoice = async function (id) {
    window.showConfirmation?.({
        title: 'Convert to Sales Bill',
        message: 'This will generate a new official Tax Invoice from this quotation. The quote will be marked as Converted.',
        confirmText: 'Convert',
        onConfirm: async () => {
            try {
                window.showToast?.('Converting...', 'info');
                const newBill = await api.convertQuotationToBill(id);
                window.closeBillingDetails();
                allBillings['Quotation'] = null;
                allBillings['Sales_Bill'] = null;
                currentTab = 'Sales_Bill';
                setTabActive('Sales_Bill');
                await Promise.all([loadBillings('Sales_Bill'), loadStats()]);
                window.selectBillingDoc(newBill.id);
                window.showToast?.(`Sales Bill ${newBill.invoice_number} created!`, 'success');
            } catch (e) {
                window.showToast?.(e.message || 'Failed to convert', 'error');
            }
        }
    });
};

window.voidBillingDoc = async function (id) {
    window.showConfirmation?.({
        title: 'Void Document',
        message: 'Voiding cancels this document and marks it invalid for tax purposes.',
        confirmText: 'Void Document',
        onConfirm: async () => {
            try {
                window.showToast?.('Voiding...', 'info');
                await api.voidBilling(id);
                window.closeBillingDetails();
                allBillings[currentTab] = null;
                await Promise.all([loadBillings(currentTab), loadStats()]);
                window.showToast?.('Document voided', 'success');
            } catch (e) {
                window.showToast?.(e.message || 'Failed to void', 'error');
            }
        }
    });
};

window.deleteBillingDraft = async function (id) {
    window.showConfirmation?.({
        title: 'Delete Draft',
        message: 'Are you sure you want to permanently delete this draft? This cannot be undone.',
        confirmText: 'Delete Permanently',
        confirmColor: 'bg-error text-white',
        onConfirm: async () => {
            try {
                window.showToast?.('Deleting draft...', 'info');
                await api.deleteBillingDraft(id);
                window.closeBillingDetails();
                allBillings[currentTab] = null;
                await Promise.all([loadBillings(currentTab), loadStats()]);
                window.showToast?.('Draft deleted', 'success');
            } catch (e) {
                window.showToast?.(e.message || 'Failed to delete draft', 'error');
            }
        }
    });
};

window.deleteBillingVoid = async function (id) {
    window.showConfirmation?.({
        title: 'Delete Voided Record',
        message: 'Permanently remove this voided document from the database.',
        confirmText: 'Delete Permanently',
        confirmColor: 'bg-error text-white',
        onConfirm: async () => {
            try {
                window.showToast?.('Deleting...', 'info');
                await api.deleteBillingVoid(id);
                window.closeBillingDetails();
                allBillings[currentTab] = null;
                await Promise.all([loadBillings(currentTab), loadStats()]);
                window.showToast?.('Document removed permanently', 'success');
            } catch (e) {
                window.showToast?.(e.message || 'Failed to delete', 'error');
            }
        }
    });
};

window.editBillingDoc = async function (id) {
    try {
        const doc = await api.getBilling(id);
        if (!doc) return;
        window.closeBillingDetails();

        currentFormItems = (doc.items || []).map(it => ({ ...it }));
        const type = doc.transaction_type;
        const meta = BILLING_TYPES[type];
        const contacts = cachedContacts[meta?.contactType || 'customer'] || [];

        let linkedBills = [];
        if (type === 'Payment_In') {
            linkedBills = await api.getBillings({ type: 'Sales_Bill' }).then(bs => bs.filter(b => ['Finalized', 'Partially_Paid'].includes(b.status)));
        } else if (type === 'Payment_Out') {
            linkedBills = await api.getBillings({ type: 'Purchase_Bill' }).then(bs => bs.filter(b => ['Finalized', 'Partially_Paid'].includes(b.status)));
        }

        const portal = document.getElementById('billingCreateSheet-portal');
        if (!portal) return;
        portal.innerHTML = getCreateSheetHTML(type, contacts, cachedInventory, linkedBills);

        // Populate fields
        const titleEl = document.getElementById('billingCreateSheet-title');
        if (titleEl) titleEl.textContent = `Edit ${meta?.label.slice(0,-1)}`;
        const subtextEl = document.getElementById('billingCreateSheet-subtext');
        if (subtextEl) subtextEl.textContent = `Doc No: ${doc.invoice_number || doc.id}`;
        const editIdEl = document.getElementById('billing-edit-id');
        if (editIdEl) editIdEl.value = doc.id;
        const orderIdEl = document.getElementById('billing-order-id');
        if (orderIdEl && doc.order_id) orderIdEl.value = doc.order_id;

        const contactSelect = document.getElementById('billing-contact-select');
        if (contactSelect) contactSelect.value = doc.contact_id;
        const placeEl = document.getElementById('billing-place-of-supply');
        if (placeEl && doc.place_of_supply) placeEl.value = doc.place_of_supply;
        const dateEl = document.getElementById('billing-date');
        if (dateEl) dateEl.value = doc.date;
        const dueEl = document.getElementById('billing-due-date');
        if (dueEl) dueEl.value = doc.due_date || '';
        const notesEl = document.getElementById('billing-notes');
        if (notesEl) notesEl.value = doc.notes || '';

        const payAmtEl = document.getElementById('billing-payment-amount');
        if (payAmtEl) payAmtEl.value = doc.grand_total || 0;
        const linkedBillEl = document.getElementById('billing-linked-bill');
        if (linkedBillEl && doc.linked_bill_id) linkedBillEl.value = doc.linked_bill_id;

        renderFormItems();
        requestAnimationFrame(() => openSheet('billingCreateSheet'));
    } catch (e) {
        console.error('Edit billing error:', e);
        window.showToast?.('Failed to load document for editing', 'error');
    }
};

window.duplicateBillingDoc = async function (id) {
    try {
        const doc = await api.getBilling(id);
        if (!doc) return;
        window.closeBillingDetails();

        currentFormItems = (doc.items || []).map(item => ({ ...item }));
        const type = doc.transaction_type;
        const meta = BILLING_TYPES[type];
        const contacts = cachedContacts[meta?.contactType || 'customer'] || [];

        let linkedBills = [];
        if (type === 'Payment_In') {
            linkedBills = await api.getBillings({ type: 'Sales_Bill' }).then(bs => bs.filter(b => ['Finalized', 'Partially_Paid'].includes(b.status)));
        } else if (type === 'Payment_Out') {
            linkedBills = await api.getBillings({ type: 'Purchase_Bill' }).then(bs => bs.filter(b => ['Finalized', 'Partially_Paid'].includes(b.status)));
        }

        const nextSerial = getNextSerialNumber(type, allBillings[type] || []);
        const portal = document.getElementById('billingCreateSheet-portal');
        if (!portal) return;
        portal.innerHTML = getCreateSheetHTML(type, contacts, cachedInventory, linkedBills, nextSerial);

        const titleEl = document.getElementById('billingCreateSheet-title');
        if (titleEl) titleEl.textContent = `New ${meta?.label.slice(0,-1)} (Cloned)`;

        const contactSelect = document.getElementById('billing-contact-select');
        if (contactSelect) contactSelect.value = doc.contact_id;
        const placeEl = document.getElementById('billing-place-of-supply');
        if (placeEl && doc.place_of_supply) placeEl.value = doc.place_of_supply;
        const notesEl = document.getElementById('billing-notes');
        if (notesEl) notesEl.value = doc.notes || '';

        renderFormItems();
        requestAnimationFrame(() => openSheet('billingCreateSheet'));
        window.showToast?.('Document cloned into new draft', 'info');
    } catch (e) {
        console.error('Duplicate billing error:', e);
        window.showToast?.('Failed to duplicate document', 'error');
    }
};

// ── 1-Click Order to Invoice Generator ──────────────────────────────

window.createInvoiceFromOrder = async function (orderId) {
    try {
        window.showToast?.('Generating invoice from order...', 'info');
        const order = await api.getOrder(orderId);
        if (!order) return;

        await window.openCreateBillingSheet('Sales_Bill');

        // Pre-fill customer
        const contactSelect = document.getElementById('billing-contact-select');
        if (contactSelect && order.customerId) {
            contactSelect.value = order.customerId;
            window.onContactSelectChange();
        }

        // Set order reference
        const orderIdEl = document.getElementById('billing-order-id');
        if (orderIdEl) orderIdEl.value = order.id;
        const notesEl = document.getElementById('billing-notes');
        if (notesEl) notesEl.value = `Generated from Order #${order.orderNumber || order.id}`;

        // Populate items from order items
        if (Array.isArray(order.items) && order.items.length > 0) {
            currentFormItems = order.items.map(oi => ({
                item_name: oi.styleName || oi.name || oi.garmentType || 'Garment Style',
                item_id: '',
                description: oi.description || `Style: ${oi.styleNumber || ''}`,
                hsn_code: '6109',
                quantity: parseFloat(oi.quantity || oi.qty || 1),
                unit: 'pcs',
                unit_price: parseFloat(oi.unitPrice || oi.price || 0),
                discount_pct: 0,
                tax_pct: 5
            }));
            renderFormItems();
        }
    } catch (e) {
        console.error('Create invoice from order error:', e);
        window.showToast?.('Failed to create invoice from order', 'error');
    }
};

window.recordPaymentForBill = async function (billId, billType) {
    window.closeBillingDetails();
    const paymentType = billType === 'Sales_Bill' ? 'Payment_In' : 'Payment_Out';
    await window.openCreateBillingSheet(paymentType);

    setTimeout(() => {
        const linkedBillEl = document.getElementById('billing-linked-bill');
        if (linkedBillEl) linkedBillEl.value = billId;
    }, 250);
};

// ── Print Launcher ──────────────────────────────────────────────────

async function fetchContactAddress(doc) {
    let contactInfo = {};
    try {
        if (doc.contact_type === 'customer' || !doc.contact_type) {
            let c = doc.contact_id ? await api.getCustomer(doc.contact_id) : null;
            if (c) {
                const addrParts = [
                    c.addressLine1 || c.address || '',
                    c.addressLine2 || '',
                    c.city || '',
                    c.state ? (c.pincode ? `${c.state} - ${c.pincode}` : c.state) : (c.pincode || '')
                ].filter(Boolean);

                contactInfo = {
                    name: c.name || doc.contact_name || '',
                    company: c.company || '',
                    address: addrParts.join(', '),
                    city: c.city || '',
                    state: c.state || '',
                    stateCode: c.stateCode || (c.gst ? c.gst.substring(0,2) : '33'),
                    phone: c.phone || c.mobile || '',
                    email: c.email || '',
                    gstin: c.gst || c.gstin || doc.contact_gstin || ''
                };
            }
        } else {
            let v = doc.contact_id ? await api.getVendor(doc.contact_id) : null;
            if (v) {
                const addrParts = [
                    v.addressLine1 || v.address || '',
                    v.addressLine2 || '',
                    v.city || '',
                    v.state ? (v.pincode ? `${v.state} - ${v.pincode}` : v.state) : (v.pincode || '')
                ].filter(Boolean);

                contactInfo = {
                    name: v.name || doc.contact_name || '',
                    company: '',
                    address: addrParts.join(', '),
                    city: v.city || '',
                    state: v.state || '',
                    stateCode: v.stateCode || (v.gstin ? v.gstin.substring(0,2) : '33'),
                    phone: v.phone || '',
                    email: v.email || '',
                    gstin: v.gstin || doc.contact_gstin || ''
                };
            }
        }
    } catch (err) {
        console.warn('Could not fetch detailed contact info:', err);
    }
    return contactInfo;
}

window.printBillingDoc = async function (id) {
    try {
        const doc = await api.getBilling(id);
        if (!doc) return;

        const contactInfo = await fetchContactAddress(doc);
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(getPrintHTML(doc, contactInfo));
            printWindow.document.close();
        }
    } catch (e) {
        console.error('Print billing error:', e);
        window.showToast?.('Failed to generate print view', 'error');
    }
};
