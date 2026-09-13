// js/billings/index.js — Main BILLINGS module controller
import { api } from '../services/api.js?v=5.3';
import {
    BILLING_TYPES, fmtCurrency,
    getStatsBarHTML, getBillingCardHTML, getEmptyStateHTML,
    getCreateSheetHTML, getBillingDetailsHTML, getPrintHTML
} from './templates.js?v=5.3';

// ── Module State ────────────────────────────────────────────────────
let currentTab = 'Quotation';
let allBillings = {};   // keyed by type: { Quotation: [...], Sales_Bill: [...], ... }
let currentSearchQuery = '';
let currentStatusFilter = '';
let currentFormItems = [];
let cachedInventory = [];
let cachedContacts = {};  // { customer: [...], vendor: [...] }
let sheetsContainer = null;

// ── Init ────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    sheetsContainer = document.getElementById('sheets-container');

    // Render static sheet containers
    if (sheetsContainer) {
        sheetsContainer.innerHTML = `
            <div id="billingCreateSheet-portal"></div>
            <div id="billingDetailsSheet-portal"></div>
            <div id="recordPaymentSheet-portal"></div>
        `;
    }

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

    // Set initial tab active state
    setTabActive(currentTab);
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
        allBillings[type] = docs;
        renderBillingsList();
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
        cachedContacts.customer = customers;
        cachedContacts.vendor = vendors;
    } catch (e) {
        console.error('Failed to preload contacts:', e);
        cachedContacts.customer = [];
        cachedContacts.vendor = [];
    }
}

async function preloadInventory() {
    try {
        cachedInventory = await api.getInventory();
    } catch (e) {
        console.error('Failed to preload inventory:', e);
        cachedInventory = [];
    }
}

// ── Rendering ────────────────────────────────────────────────────────

function renderBillingsList() {
    const container = document.getElementById('billings-list');
    if (!container) return;

    let docs = allBillings[currentTab] || [];

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

    if (docs.length === 0) {
        container.innerHTML = getEmptyStateHTML(currentTab);
        return;
    }

    container.innerHTML = docs.map(d => getBillingCardHTML(d)).join('');
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

    // Update status filter chips
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

// ── Tab Switching ────────────────────────────────────────────────────

window.switchBillingTab = async function (type) {
    currentTab = type;
    currentStatusFilter = '';
    currentSearchQuery = '';
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

// ── Create Sheet ─────────────────────────────────────────────────────

window.openCreateBillingSheet = async function (type) {
    type = type || currentTab;
    const meta = BILLING_TYPES[type];
    if (!meta) return;

    currentFormItems = [];

    // Ensure contacts are loaded
    if (!cachedContacts[meta.contactType] || cachedContacts[meta.contactType].length === 0) {
        await preloadContacts();
    }

    const contacts = cachedContacts[meta.contactType] || [];

    // For payment sheets, load outstanding bills
    let linkedBills = [];
    if (type === 'Payment_In') {
        linkedBills = (allBillings['Sales_Bill'] || await api.getBillings({ type: 'Sales_Bill' }))
            .filter(b => ['Finalized', 'Partially_Paid'].includes(b.status));
    } else if (type === 'Payment_Out') {
        linkedBills = (allBillings['Purchase_Bill'] || await api.getBillings({ type: 'Purchase_Bill' }))
            .filter(b => ['Finalized', 'Partially_Paid'].includes(b.status));
    }

    const portal = document.getElementById('billingCreateSheet-portal');
    if (!portal) return;
    portal.innerHTML = getCreateSheetHTML(type, contacts, cachedInventory, linkedBills);

    // Bind contact select for GSTIN display
    const contactSelect = document.getElementById('billing-contact-select');
    if (contactSelect) {
        contactSelect.addEventListener('change', () => {
            const gstin = contactSelect.selectedOptions[0]?.dataset?.gstin || '';
            const infoEl = document.getElementById('billing-contact-info');
            if (infoEl) {
                if (gstin) {
                    infoEl.textContent = `GSTIN: ${gstin}`;
                    infoEl.classList.remove('hidden');
                } else {
                    infoEl.classList.add('hidden');
                }
            }
        });
    }

    // Update totals when payment amount changes
    const paymentAmountEl = document.getElementById('billing-payment-amount');
    if (paymentAmountEl) {
        paymentAmountEl.addEventListener('input', updateBillingTotals);
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

// ── Form Item Management ─────────────────────────────────────────────

window.onInventoryItemSelect = function () {
    const select = document.getElementById('billing-item-inventory');
    if (!select || !select.value) return;
    const opt = select.selectedOptions[0];
    const price = parseFloat(opt.dataset.price) || 0;
    const name = opt.dataset.name || '';

    const nameInput = document.getElementById('billing-item-name');
    const priceInput = document.getElementById('billing-item-price');
    if (nameInput && !nameInput.value) nameInput.value = name;
    if (priceInput) priceInput.value = price.toFixed(2);
};

window.addBillingItem = function () {
    const nameEl = document.getElementById('billing-item-name');
    const qtyEl = document.getElementById('billing-item-qty');
    const priceEl = document.getElementById('billing-item-price');
    const taxEl = document.getElementById('billing-item-tax');
    const discEl = document.getElementById('billing-item-discount');
    const invEl = document.getElementById('billing-item-inventory');

    const name = nameEl?.value?.trim();
    const qty = parseFloat(qtyEl?.value) || 0;
    const price = parseFloat(priceEl?.value) || 0;
    const taxPct = parseFloat(taxEl?.value) || 0;
    const discPct = parseFloat(discEl?.value) || 0;
    const itemId = invEl?.value || '';

    if (!name) { window.showToast?.('Item name is required', 'error'); return; }
    if (qty <= 0) { window.showToast?.('Quantity must be > 0', 'error'); return; }
    if (price < 0) { window.showToast?.('Price cannot be negative', 'error'); return; }

    const discountAmount = price * qty * (discPct / 100);
    const netPrice = price * qty - discountAmount;
    const taxAmount = netPrice * (taxPct / 100);
    const rowTotal = netPrice + taxAmount;

    currentFormItems.push({
        item_name: name,
        item_id: itemId,
        description: '',
        quantity: qty,
        unit: 'pcs',
        unit_price: price,
        discount_pct: discPct,
        tax_pct: taxPct,
        tax_amount: taxAmount,
        row_total: rowTotal
    });

    // Clear inputs
    if (nameEl) nameEl.value = '';
    if (qtyEl) qtyEl.value = '';
    if (priceEl) priceEl.value = '';
    if (discEl) discEl.value = '';
    if (invEl) invEl.value = '';

    renderFormItems();
    window.showToast?.('Item added', 'success');
};

window.removeBillingItem = function (index) {
    currentFormItems.splice(index, 1);
    renderFormItems();
};

function renderFormItems() {
    const container = document.getElementById('billing-items-list');
    const emptyEl = document.getElementById('billing-items-empty');
    if (!container) return;

    if (currentFormItems.length === 0) {
        if (emptyEl) emptyEl.style.display = 'block';
        // Remove all item cards
        container.querySelectorAll('.billing-item-card').forEach(el => el.remove());
    } else {
        if (emptyEl) emptyEl.style.display = 'none';
        container.querySelectorAll('.billing-item-card').forEach(el => el.remove());
        currentFormItems.forEach((item, i) => {
            const el = document.createElement('div');
            el.className = 'billing-item-card bg-surface-container-lowest border border-outline-variant/50 rounded-xl p-3';
            el.innerHTML = `
                <div class="flex items-start justify-between gap-2">
                    <div class="flex-1 min-w-0">
                        <div class="text-[14px] font-semibold text-on-surface">${item.item_name}</div>
                        <div class="text-[12px] text-secondary">
                            ${item.quantity} pcs × ${fmtCurrency(item.unit_price)}
                            ${item.discount_pct > 0 ? ` − ${item.discount_pct}% disc` : ''}
                            ${item.tax_pct > 0 ? ` + ${item.tax_pct}% GST` : ''}
                            ${item.item_id ? ' · <span class="text-primary">Inv. linked</span>' : ''}
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="text-[15px] font-bold text-on-surface">${fmtCurrency(item.row_total)}</span>
                        <button type="button" onclick="window.removeBillingItem(${i})" class="text-error active-scale">
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
    const subtotal = currentFormItems.reduce((s, it) => s + (it.unit_price * it.quantity), 0);
    const discountTotal = currentFormItems.reduce((s, it) => s + (it.unit_price * it.quantity * (it.discount_pct / 100)), 0);
    const taxTotal = currentFormItems.reduce((s, it) => s + (it.tax_amount || 0), 0);
    const grandTotal = subtotal - discountTotal + taxTotal;

    // Payment mode — use direct amount input
    const paymentEl = document.getElementById('billing-payment-amount');
    if (paymentEl) {
        const payGrand = parseFloat(paymentEl.value) || 0;
        const gEl = document.getElementById('billing-display-grand');
        if (gEl) gEl.textContent = fmtCurrency(payGrand);
        return;
    }

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = fmtCurrency(val); };
    set('billing-display-subtotal', subtotal);
    set('billing-display-discount', discountTotal);
    set('billing-display-tax', taxTotal);
    set('billing-display-grand', grandTotal);
}

function collectFormData(status) {
    const type = document.getElementById('billing-type')?.value;
    const contactSelect = document.getElementById('billing-contact-select');
    const contactId = contactSelect?.value;
    const contactName = contactSelect?.selectedOptions[0]?.text || '';
    const contactGstin = contactSelect?.selectedOptions[0]?.dataset?.gstin || '';
    const date = document.getElementById('billing-date')?.value;
    const dueDate = document.getElementById('billing-due-date')?.value || '';
    const notes = document.getElementById('billing-notes')?.value?.trim() || '';

    if (!contactId) { window.showToast?.('Please select a contact', 'error'); return null; }
    if (!date) { window.showToast?.('Please select a date', 'error'); return null; }

    const isPayment = type === 'Payment_In' || type === 'Payment_Out';

    if (isPayment) {
        const amount = parseFloat(document.getElementById('billing-payment-amount')?.value) || 0;
        if (amount <= 0) { window.showToast?.('Please enter a payment amount', 'error'); return null; }
        const linkedBillId = document.getElementById('billing-linked-bill')?.value || '';
        return {
            transaction_type: type,
            contact_id: contactId,
            contact_type: BILLING_TYPES[type]?.contactType || 'customer',
            contact_name: contactName,
            contact_gstin: contactGstin,
            date, due_date: dueDate,
            subtotal: amount,
            discount: 0,
            tax_total: 0,
            grand_total: amount,
            linked_bill_id: linkedBillId,
            status,
            notes,
            items: []
        };
    }

    if (currentFormItems.length === 0) {
        window.showToast?.('Please add at least one item', 'error');
        return null;
    }

    const subtotal = currentFormItems.reduce((s, it) => s + (it.unit_price * it.quantity), 0);
    const discountTotal = currentFormItems.reduce((s, it) => s + (it.unit_price * it.quantity * (it.discount_pct / 100)), 0);
    const taxTotal = currentFormItems.reduce((s, it) => s + (it.tax_amount || 0), 0);
    const grandTotal = subtotal - discountTotal + taxTotal;

    const editId = document.getElementById('billing-edit-id')?.value;

    return {
        ...(editId ? { id: editId } : {}),
        transaction_type: type,
        contact_id: contactId,
        contact_type: BILLING_TYPES[type]?.contactType || 'customer',
        contact_name: contactName,
        contact_gstin: contactGstin,
        date, due_date: dueDate,
        subtotal,
        discount: discountTotal,
        tax_total: taxTotal,
        grand_total: grandTotal,
        status,
        notes,
        items: currentFormItems
    };
}

// ── Save Operations ──────────────────────────────────────────────────

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
    try {
        window.showToast?.('Saving...', 'info');
        let saved;
        if (data.id) {
            saved = await api.updateBilling(data.id, data);
        } else {
            saved = await api.createBilling(data);
        }
        window.closeBillingCreateSheet();
        // Refresh data
        allBillings[currentTab] = null;
        await Promise.all([loadBillings(currentTab), loadStats()]);
        window.showToast?.(`${BILLING_TYPES[currentTab]?.label.slice(0,-1)} saved! #${saved.invoice_number}`, 'success');
    } catch (e) {
        console.error('Save billing error:', e);
        window.showToast?.(e.message || 'Failed to save', 'error');
    }
}

// ── Detail View ──────────────────────────────────────────────────────

window.openBillingDetails = async function (id) {
    try {
        const doc = await api.getBilling(id);
        if (!doc) return;

        const portal = document.getElementById('billingDetailsSheet-portal');
        if (!portal) return;

        portal.innerHTML = `
            <div id="billingDetailsSheet-overlay" class="bottom-sheet-overlay" onclick="window.closeBillingDetails()"></div>
            <div id="billingDetailsSheet-content" class="bottom-sheet-content overflow-y-auto" style="max-height:92vh;">
                <div class="sheet-handle"></div>
                <div class="flex justify-between items-center px-lg pb-md pt-sm border-b border-outline-variant/30">
                    <h2 class="text-[18px] font-bold text-on-surface">Document Details</h2>
                    <button type="button" onclick="window.closeBillingDetails()" class="w-9 h-9 rounded-full bg-surface-variant flex items-center justify-center active-scale">
                        <span class="material-symbols-outlined text-[20px] text-secondary">close</span>
                    </button>
                </div>
                ${getBillingDetailsHTML(doc)}
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

// ── Actions ──────────────────────────────────────────────────────────

window.finalizeBillingDoc = async function (id) {
    window.showConfirmation?.({
        title: 'Finalize Document',
        message: 'Finalizing will apply all business triggers (inventory changes, balance updates). This cannot be undone.',
        confirmText: 'Finalize',
        onConfirm: async () => {
            try {
                window.showToast?.('Finalizing...', 'info');
                const doc = await api.finalizeBilling(id);
                window.closeBillingDetails();
                allBillings[currentTab] = null;
                await Promise.all([loadBillings(currentTab), loadStats()]);
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
        message: 'This will create a new Sales Bill with all the same line items. The quotation will be marked as Converted.',
        confirmText: 'Convert',
        onConfirm: async () => {
            try {
                window.showToast?.('Converting...', 'info');
                const newBill = await api.convertQuotationToBill(id);
                window.closeBillingDetails();
                // Invalidate both tabs
                allBillings['Quotation'] = null;
                allBillings['Sales_Bill'] = null;
                await Promise.all([loadBillings(currentTab), loadStats()]);
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
        message: 'Voiding marks this document as cancelled. It cannot be edited or finalized after voiding.',
        confirmText: 'Void',
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

window.editBillingDoc = async function (id) {
    try {
        const doc = await api.getBilling(id);
        if (!doc) return;
        window.closeBillingDetails();

        currentFormItems = doc.items || [];
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

        // Prefill form
        const titleEl = document.getElementById('createBillingSheet-title');
        if (titleEl) titleEl.textContent = `Edit ${meta?.label.slice(0,-1)}`;
        const editIdEl = document.getElementById('billing-edit-id');
        if (editIdEl) editIdEl.value = doc.id;

        const contactSelect = document.getElementById('billing-contact-select');
        if (contactSelect) contactSelect.value = doc.contact_id;
        const dateEl = document.getElementById('billing-date');
        if (dateEl) dateEl.value = doc.date;
        const dueEl = document.getElementById('billing-due-date');
        if (dueEl) dueEl.value = doc.due_date || '';
        const notesEl = document.getElementById('billing-notes');
        if (notesEl) notesEl.value = doc.notes || '';

        // Payment amount
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

// ── Record Payment Shortcut ──────────────────────────────────────────

window.recordPaymentForBill = async function (billId, billType) {
    window.closeBillingDetails();
    const paymentType = billType === 'Sales_Bill' ? 'Payment_In' : 'Payment_Out';
    await window.openCreateBillingSheet(paymentType);

    // Pre-select the linked bill
    setTimeout(() => {
        const linkedBillEl = document.getElementById('billing-linked-bill');
        if (linkedBillEl) linkedBillEl.value = billId;
    }, 200);
};

// ── Print ────────────────────────────────────────────────────────────

window.printBillingDoc = async function (id) {
    try {
        const doc = await api.getBilling(id);
        if (!doc) return;

        let contactInfo = {};
        try {
            if (doc.contact_type === 'customer') {
                const c = await api.getCustomer(doc.contact_id);
                if (c) contactInfo = { address: c.address, city: c.city, email: c.email };
            } else {
                const v = await api.getVendor(doc.contact_id);
                if (v) contactInfo = { address: v.address, city: v.city, email: v.email };
            }
        } catch (_) { /* ignore */ }

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
