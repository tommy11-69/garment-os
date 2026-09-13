import { vendorStore } from '../stores/VendorStore.js';
import { BottomSheet } from '../components/index.js';
import { bindFormValidation } from '../utils/formHandler.js';
import { getCreateVendorSheetHTML, getCreateVendorFooterHTML } from '../components/vendorForms.js';
import {
    getBulkToolbarHTML,
    getVendorDetailsHeader,
    getVendorDetailsContent,
    getVendorDetailsFooter,
    getEditVendorSheetHTML,
    getEditVendorFooterHTML,
    getRecordPaymentSheetHTML,
    getRecordPaymentFooterHTML,
} from './templates.js';

// Expose filter functions on window immediately at module execution
window.setVendorStatusFilter = function (val) {
    vendorStore.setFilter('status', val);

    document.querySelectorAll('[data-status-filter]').forEach(btn => {
        const isActive = btn.getAttribute('data-status-filter') === val;
        btn.className = isActive
            ? 'flex-1 py-2 rounded-[12px] text-[13px] font-semibold bg-surface-container-lowest text-on-surface shadow-sm transition-all'
            : 'flex-1 py-2 rounded-[12px] text-[13px] font-semibold text-secondary transition-all';
    });
};

window.setVendorTypeFilter = function (val) {
    vendorStore.setFilter('vendorType', val);

    document.querySelectorAll('[data-type-filter]').forEach(btn => {
        const isActive = btn.getAttribute('data-type-filter') === val;
        btn.classList.toggle('bg-primary',         isActive);
        btn.classList.toggle('text-white',         isActive);
        btn.classList.toggle('border-primary',     isActive);
        btn.classList.toggle('bg-surface-container-lowest', !isActive);
        btn.classList.toggle('text-secondary',     !isActive);
        btn.classList.toggle('border-outline-variant', !isActive);
    });
};

// ─── INITIALIZATION ───────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    initUI();
    vendorStore.subscribe(renderUI);
    vendorStore.loadVendors();
});

function initUI() {
    // Inject Add Vendor sheet
    const sheetsContainer = document.getElementById('sheets-container');
    if (sheetsContainer) {
        sheetsContainer.innerHTML = BottomSheet({
            id: 'addVendorSheet',
            title: 'New Vendor',
            content: getCreateVendorSheetHTML(),
            footerContent: getCreateVendorFooterHTML(),
            isForm: true,
        });
        bindFormValidation('addVendorSheet-content', 'create-vendor-submit');
    }

    // Search
    const searchInput = document.getElementById('vendor-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            vendorStore.setSearch(e.target.value);
        });
    }

    // Status filter buttons (Active / Inactive / All)
    document.querySelectorAll('[data-status-filter]').forEach(btn => {
        btn.addEventListener('click', () => {
            const val = btn.getAttribute('data-status-filter');
            window.setVendorStatusFilter(val);
        });
    });

    // Type filter chips
    document.querySelectorAll('[data-type-filter]').forEach(btn => {
        btn.addEventListener('click', () => {
            window.setVendorTypeFilter(btn.getAttribute('data-type-filter'));
        });
    });
}

// ─── RENDERING ────────────────────────────────────────────────────────────────

function renderUI(state) {
    const { entities, activeEntity, selectedIds, isBulkMode, loading, error } = state;

    // List
    const container = document.getElementById('vendors-list-container');
    if (container) {
        if (loading) {
            if (window.setLoading) window.setLoading('vendors-list-container');
        } else if (error) {
            container.innerHTML = `<div class="p-md text-center text-error">Failed to load vendors: ${error.message}</div>`;
        } else if (entities.length === 0) {
            container.innerHTML = `
                <div class="flex flex-col items-center justify-center p-xl text-center">
                    <div class="w-16 h-16 rounded-full bg-surface-variant flex items-center justify-center mb-4 text-secondary">
                        <span class="material-symbols-outlined text-[32px]">storefront_off</span>
                    </div>
                    <h3 class="text-[16px] font-bold text-on-surface mb-1">No Vendors Found</h3>
                    <p class="text-body text-secondary max-w-[250px]">Try adjusting your search or filters, or add a new vendor.</p>
                </div>
            `;
        } else {
            container.innerHTML = entities.map(v => vendorCard(v, isBulkMode, selectedIds.has(v.id))).join('');
        }
    }

    // Count badge
    const countEl = document.getElementById('vendors-count');
    if (countEl && !loading) {
        const total = entities.length;
        countEl.textContent = `${total} Vendor${total !== 1 ? 's' : ''}`;
    }

    // Bulk toolbar
    updateBulkToolbar(state);

    // If detail sheet open, refresh its contents
    if (activeEntity) updateActiveEntitySheets(activeEntity);
}

function vendorCard(v, isBulkMode = false, isSelected = false) {
    const typeColors = {
        'Fabric':      'bg-blue-500/15 text-blue-700',
        'Yarn':        'bg-sky-500/15 text-sky-700',
        'Stitching':   'bg-purple-500/15 text-purple-700',
        'Dyeing':      'bg-teal-500/15 text-teal-700',
        'Printing':    'bg-orange-500/15 text-orange-700',
        'Embroidery':  'bg-pink-500/15 text-pink-700',
        'Packaging':   'bg-gray-500/15 text-gray-700',
        'Accessories': 'bg-yellow-500/15 text-yellow-700',
        'Other':       'bg-primary/15 text-primary',
    };
    const avatarCls = typeColors[v.vendorType] || typeColors['Other'];
    const initials = v.initials || (v.name || 'VN').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
    const outstanding = parseFloat(v.outstandingPayable || 0);
    const checkboxHtml = isBulkMode ? `
        <div class="mr-3 flex items-center h-full">
            <div class="w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-primary border-primary' : 'border-outline-variant'}" onclick="event.stopPropagation(); window.toggleVendorSelection('${v.id}')">
                ${isSelected ? '<span class="material-symbols-outlined text-white text-[16px] font-bold">check</span>' : ''}
            </div>
        </div>
    ` : '';

    return `
        <div role="button" tabindex="0"
            onclick="${isBulkMode ? `window.toggleVendorSelection('${v.id}')` : `window.openVendorDetails('${v.id}')`}"
            class="bg-surface-container-lowest rounded-[24px] border ${isSelected ? 'border-primary ring-1 ring-primary' : 'border-outline-variant'} p-md shadow-sm active-bg transition-colors flex items-start gap-4 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary">
            ${checkboxHtml}
            <div class="w-[56px] h-[56px] rounded-full flex-shrink-0 flex items-center justify-center font-bold text-[18px] ${avatarCls}">
                ${initials}
            </div>
            <div class="flex-1 w-full min-w-0">
                <div class="flex items-start justify-between mb-1">
                    <div class="min-w-0">
                        <span class="text-[11px] font-semibold text-primary block mb-0.5">${v.vendorCode || ''}</span>
                        <h4 class="text-[16px] font-bold text-on-surface leading-tight truncate">${v.name}</h4>
                        ${v.company ? `<p class="text-[12px] text-secondary truncate">${v.company}</p>` : ''}
                    </div>
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ml-2 ${v.statusColor || 'bg-[#008A00]/10 text-[#008A00]'}">${v.status || 'Active'}</span>
                </div>
                <div class="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-outline-variant/30">
                    <div>
                        <span class="text-[10px] text-secondary uppercase tracking-wider block mb-0.5">Type</span>
                        <span class="text-[12px] font-semibold text-on-surface">${v.vendorType || '-'}</span>
                    </div>
                    <div>
                        <span class="text-[10px] text-secondary uppercase tracking-wider block mb-0.5">Purchased</span>
                        <span class="text-[12px] font-bold text-on-surface">₹${(v.totalPurchases || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div>
                        <span class="text-[10px] text-secondary uppercase tracking-wider block mb-0.5">You Owe</span>
                        <span class="text-[12px] font-bold ${outstanding > 0 ? 'text-error' : 'text-[#008A00]'}">₹${outstanding.toLocaleString('en-IN')}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function updateBulkToolbar(state) {
    const { isBulkMode, selectedIds } = state;
    let toolbar = document.getElementById('vendor-bulk-toolbar');

    if (isBulkMode) {
        if (!toolbar) {
            toolbar = document.createElement('div');
            toolbar.id = 'vendor-bulk-toolbar';
            toolbar.className = 'fixed bottom-[80px] left-4 right-4 bg-surface-container-highest border border-outline-variant shadow-lg rounded-2xl p-3 z-40 transition-all duration-300 translate-y-0 opacity-100 flex items-center max-w-[400px] mx-auto';
            document.body.appendChild(toolbar);
        }
        toolbar.innerHTML = getBulkToolbarHTML(selectedIds.size);
    } else {
        if (toolbar) {
            toolbar.classList.add('translate-y-4', 'opacity-0');
            setTimeout(() => toolbar.remove(), 300);
        }
    }
}

function updateActiveEntitySheets(entity) {
    const detailsSheet = document.getElementById('vendorDetailsSheet');
    if (detailsSheet && !detailsSheet.classList.contains('translate-y-full')) {
        const bodyContent = detailsSheet.querySelector('.overflow-y-auto');
        if (bodyContent) bodyContent.innerHTML = getVendorDetailsContent(entity);

        const header = detailsSheet.querySelector('.bg-surface-container-lowest.sticky');
        if (header) header.innerHTML = getVendorDetailsHeader(entity);
    }
}

// ─── CRUD OPERATIONS ──────────────────────────────────────────────────────────

window.saveNewVendor = async function () {
    const btn = document.getElementById('create-vendor-submit');
    if (btn) btn.innerHTML = '<span class="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>';

    const isActive = document.getElementById('new-vend-active')?.checked ?? true;
    const data = {
        name:          document.getElementById('new-vend-name')?.value || '',
        company:       document.getElementById('new-vend-company')?.value || '',
        contactPerson: document.getElementById('new-vend-contact')?.value || '',
        phone:         document.getElementById('new-vend-phone')?.value || '',
        whatsapp:      document.getElementById('new-vend-whatsapp')?.value || '',
        email:         document.getElementById('new-vend-email')?.value || '',
        gst:           document.getElementById('new-vend-gst')?.value || '',
        vendorType:    document.getElementById('new-vend-type')?.value || 'Other',
        paymentTerms:  document.getElementById('new-vend-terms')?.value || '',
        creditLimit:   parseFloat(document.getElementById('new-vend-limit')?.value) || 0,
        upiId:         document.getElementById('new-vend-upi')?.value || '',
        bankName:      document.getElementById('new-vend-bank')?.value || '',
        accountNumber: document.getElementById('new-vend-account')?.value || '',
        ifsc:          document.getElementById('new-vend-ifsc')?.value || '',
        addressLine1:  document.getElementById('new-vend-addr1')?.value || '',
        city:          document.getElementById('new-vend-city')?.value || '',
        state:         document.getElementById('new-vend-state')?.value || '',
        country:       document.getElementById('new-vend-country')?.value || 'India',
        pincode:       document.getElementById('new-vend-pincode')?.value || '',
        notes:         document.getElementById('new-vend-notes')?.value || '',
        status:        isActive ? 'Active' : 'Inactive',
        statusColor:   isActive ? 'bg-[#008A00]/10 text-[#008A00]' : 'bg-surface-variant text-secondary',
    };

    try {
        await vendorStore.createVendor(data);
        window.closeSheet('addVendorSheet');
        window.showToast?.('Vendor saved successfully', 'success');
        document.getElementById('addVendorSheet-content')?.reset();
    } catch (e) {
        console.error(e);
        window.showToast?.(e.message || 'Failed to save vendor', 'error');
    } finally {
        if (btn) btn.innerHTML = 'Save Vendor';
    }
};

window.saveEditedVendor = async function () {
    const btn = document.getElementById('edit-vendor-submit');
    if (btn) btn.innerHTML = '<span class="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>';

    const id = document.getElementById('edit-vend-id')?.value;
    const isActive = document.getElementById('edit-vend-active')?.checked ?? true;
    const data = {
        name:          document.getElementById('edit-vend-name')?.value || '',
        company:       document.getElementById('edit-vend-company')?.value || '',
        contactPerson: document.getElementById('edit-vend-contact')?.value || '',
        phone:         document.getElementById('edit-vend-phone')?.value || '',
        whatsapp:      document.getElementById('edit-vend-whatsapp')?.value || '',
        email:         document.getElementById('edit-vend-email')?.value || '',
        gst:           document.getElementById('edit-vend-gst')?.value || '',
        vendorType:    document.getElementById('edit-vend-type')?.value || 'Other',
        paymentTerms:  document.getElementById('edit-vend-terms')?.value || '',
        creditLimit:   parseFloat(document.getElementById('edit-vend-limit')?.value) || 0,
        upiId:         document.getElementById('edit-vend-upi')?.value || '',
        bankName:      document.getElementById('edit-vend-bank')?.value || '',
        accountNumber: document.getElementById('edit-vend-account')?.value || '',
        ifsc:          document.getElementById('edit-vend-ifsc')?.value || '',
        addressLine1:  document.getElementById('edit-vend-addr1')?.value || '',
        city:          document.getElementById('edit-vend-city')?.value || '',
        state:         document.getElementById('edit-vend-state')?.value || '',
        country:       document.getElementById('edit-vend-country')?.value || 'India',
        pincode:       document.getElementById('edit-vend-pincode')?.value || '',
        notes:         document.getElementById('edit-vend-notes')?.value || '',
        status:        isActive ? 'Active' : 'Inactive',
        statusColor:   isActive ? 'bg-[#008A00]/10 text-[#008A00]' : 'bg-surface-variant text-secondary',
    };

    try {
        await vendorStore.updateVendor(id, data);
        window.closeSheet('editVendorSheet');
        window.showToast?.('Vendor updated successfully', 'success');
        setTimeout(() => window.openVendorDetails(id), 300);
    } catch (e) {
        console.error(e);
        window.showToast?.('Failed to update vendor', 'error');
    } finally {
        if (btn) btn.innerHTML = 'Update Vendor';
    }
};

window.saveVendorPayment = async function () {
    const btn = document.getElementById('record-payment-submit');
    if (btn) btn.innerHTML = '<span class="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>';

    const vendorId = document.getElementById('pay-vendor-id')?.value;
    const amount   = parseFloat(document.getElementById('pay-amount')?.value || 0);
    const method   = document.getElementById('pay-method')?.value || 'UPI';
    const date     = document.getElementById('pay-date')?.value || new Date().toISOString().split('T')[0];
    const ref      = document.getElementById('pay-ref')?.value || '';
    const notes    = document.getElementById('pay-notes')?.value || '';

    if (!amount || amount <= 0) {
        window.showToast?.('Please enter a valid amount', 'error');
        if (btn) btn.innerHTML = 'Record Payment';
        return;
    }

    const vendor = vendorStore.getState().entities.find(v => v.id === vendorId)
        || vendorStore.getState().activeEntity;

    // Create a finance transaction that links to the vendor
    const txn = {
        id:            `txn-pay-${Date.now()}`,
        type:          'Expense',
        title:         `Payment to ${vendor?.name || 'Vendor'}`,
        category:      'Vendor Payment',
        amount,
        date,
        status:        'Completed',
        paymentMethod: method,
        referenceNo:   ref,
        notes,
        refId:         vendorId,
        isNegative:    1,
        createdBy:     'Admin',
        icon:          'payments',
        iconBg:        'bg-[#008A00]/10',
        iconColor:     'text-[#008A00]',
        amountColor:   'text-error',
    };

    try {
        // Use the finance API / db to insert so it shows in Finance page too
        const { db } = await import('../data/database.js');
        await db.insert('transactions', txn);

        window.closeSheet('recordPaymentSheet');
        window.showToast?.(`Payment of ₹${amount.toLocaleString('en-IN')} recorded`, 'success');

        // Refresh vendor detail
        await vendorStore.fetchActiveEntity(vendorId);
        await vendorStore.loadVendors();
        setTimeout(() => window.openVendorDetails(vendorId), 300);
    } catch (e) {
        console.error(e);
        window.showToast?.('Failed to record payment', 'error');
    } finally {
        if (btn) btn.innerHTML = 'Record Payment';
    }
};

window.deleteVendorFlow = function (id) {
    const vendor = vendorStore.getState().entities.find(v => v.id === id)
        || vendorStore.getState().activeEntity;
    if (!vendor) return;

    window.showConfirmation({
        title: 'Delete Vendor',
        message: `Are you sure you want to permanently delete ${vendor.name}? This cannot be undone.`,
        confirmText: 'Delete',
        onConfirm: async () => {
            try {
                window.closeSheet('vendorDetailsSheet');
                await vendorStore.deleteVendor(id);
                window.showToast?.('Vendor deleted', 'success');
            } catch (e) {
                window.showToast?.('Failed to delete vendor', 'error');
            }
        },
    });
};

window.archiveVendorFlow = async function (id) {
    try {
        window.closeSheet('vendorDetailsSheet');
        await vendorStore.archiveVendor(id);
        window.showToast?.('Vendor archived', 'success');
    } catch (e) {
        window.showToast?.('Failed to archive vendor', 'error');
    }
};

window.restoreVendorFlow = async function (id) {
    try {
        window.closeSheet('vendorDetailsSheet');
        await vendorStore.restoreVendor(id);
        window.showToast?.('Vendor restored', 'success');
    } catch (e) {
        window.showToast?.('Failed to restore vendor', 'error');
    }
};

window.duplicateVendorFlow = async function (id) {
    try {
        window.closeSheet('vendorDetailsSheet');
        await vendorStore.duplicateVendor(id);
        window.showToast?.('Vendor duplicated', 'success');
    } catch (e) {
        window.showToast?.('Failed to duplicate vendor', 'error');
    }
};

// ─── SHEET FLOWS ──────────────────────────────────────────────────────────────

window.openVendorDetails = async function (id) {
    if (vendorStore.getState().isBulkMode) {
        window.toggleVendorSelection(id);
        return;
    }

    await vendorStore.fetchActiveEntity(id);
    const vendor = vendorStore.getState().activeEntity;
    if (!vendor) return;

    const container = document.getElementById('sheets-container');
    // Remove previous if any
    document.getElementById('vendorDetailsSheet-content')?.remove();
    document.getElementById('vendorDetailsSheet-overlay')?.remove();

    const sheetHTML = BottomSheet({
        id: 'vendorDetailsSheet',
        customHeader: getVendorDetailsHeader(vendor),
        content: getVendorDetailsContent(vendor),
        footerContent: getVendorDetailsFooter(vendor),
        height: '92vh',
    });

    container.insertAdjacentHTML('beforeend', sheetHTML);
    setTimeout(() => window.openSheet('vendorDetailsSheet'), 50);
};

window.openEditVendor = async function (id) {
    await vendorStore.fetchActiveEntity(id);
    const vendor = vendorStore.getState().activeEntity;
    if (!vendor) return;

    window.closeSheet('vendorDetailsSheet');

    const container = document.getElementById('sheets-container');
    document.getElementById('editVendorSheet-content')?.remove();
    document.getElementById('editVendorSheet-overlay')?.remove();

    const sheetHTML = BottomSheet({
        id: 'editVendorSheet',
        title: 'Edit Vendor',
        content: getEditVendorSheetHTML(vendor),
        footerContent: getEditVendorFooterHTML(),
        isForm: true,
    });

    container.insertAdjacentHTML('beforeend', sheetHTML);
    setTimeout(() => {
        bindFormValidation('editVendorSheet-content', 'edit-vendor-submit');
        window.openSheet('editVendorSheet');
    }, 300);
};

window.openRecordPayment = function (id) {
    const container = document.getElementById('sheets-container');
    document.getElementById('recordPaymentSheet-content')?.remove();
    document.getElementById('recordPaymentSheet-overlay')?.remove();

    const sheetHTML = BottomSheet({
        id: 'recordPaymentSheet',
        title: 'Record Payment',
        content: getRecordPaymentSheetHTML(id),
        footerContent: getRecordPaymentFooterHTML(),
        isForm: true,
    });

    container.insertAdjacentHTML('beforeend', sheetHTML);
    setTimeout(() => window.openSheet('recordPaymentSheet'), 50);
};

// ─── BULK OPERATIONS ─────────────────────────────────────────────────────────

window.toggleVendorSelection = function (id) {
    vendorStore.toggleSelection(id);
};

window.clearVendorSelection = function () {
    vendorStore.clearSelection();
};

window.bulkArchiveVendors = async function () {
    const size = vendorStore.getState().selectedIds.size;
    if (!size) return;
    try {
        await vendorStore.bulkArchive();
        window.showToast?.(`${size} vendors archived`, 'success');
    } catch (e) {
        window.showToast?.('Failed to archive vendors', 'error');
    }
};

window.bulkDeleteVendors = function () {
    const size = vendorStore.getState().selectedIds.size;
    if (!size) return;

    window.showConfirmation({
        title: 'Delete Vendors',
        message: `Are you sure you want to permanently delete ${size} vendors?`,
        confirmText: 'Delete All',
        onConfirm: async () => {
            try {
                await vendorStore.bulkDelete();
                window.showToast?.(`${size} vendors deleted`, 'success');
            } catch (e) {
                window.showToast?.('Failed to delete vendors', 'error');
            }
        },
    });
};
