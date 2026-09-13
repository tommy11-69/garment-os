import { customerStore } from '../stores/CustomerStore.js?v=5.2';
import { renderers } from '../renderers.js?v=5.2';
import { BottomSheet } from '../components/index.js?v=5.2';
import { bindFormValidation } from '../utils/formHandler.js?v=5.2';
import { getCreateCustomerSheetHTML, getCreateCustomerFooterHTML } from '../components/customerForms.js?v=5.2';
import { 
    getBulkToolbarHTML, 
    getCustomerDetailsHeader, 
    getCustomerDetailsContent, 
    getCustomerDetailsFooter, 
    getEditCustomerSheetHTML, 
    getEditCustomerFooterHTML,
    getCollectPaymentSheetHTML,
    getCollectPaymentFooterHTML
} from './templates.js?v=5.2';

// ─── INITIALIZATION ───────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    initUI();
    customerStore.subscribe(renderUI);
    customerStore.loadCustomers();
});

function initUI() {
    // Setup Create Customer Sheet globally (used by FAB)
    const sheetsContainer = document.getElementById('sheets-container');
    if (sheetsContainer) {
        sheetsContainer.innerHTML = BottomSheet({ 
            id: 'addCustomerSheet', 
            title: 'New Customer', 
            content: getCreateCustomerSheetHTML(), 
            footerContent: getCreateCustomerFooterHTML("window.saveNewCustomer()"), 
            isForm: true 
        });
        bindFormValidation('addCustomerSheet-content', 'create-customer-submit');
    }

    // Search binding via explicit ID
    const searchInput = document.getElementById('customer-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            customerStore.setSearch(e.target.value);
        });
    }
}

// ─── STATE-DRIVEN RENDERING ─────────────────────────────────────

function renderUI(state) {
    const { entities, activeEntity, selectedIds, isBulkMode, loading, error } = state;
    
    // Update live count badge
    const countEl = document.getElementById('customers-count');
    if (countEl) {
        if (loading) {
            countEl.textContent = 'Loading customers...';
        } else {
            const activeCount = entities.filter(c => c.status === 'Active').length;
            countEl.textContent = `${activeCount} Active ${activeCount === 1 ? 'Customer' : 'Customers'}` +
                (entities.length !== activeCount ? ` (${entities.length} Total)` : '');
        }
    }

    // Render List
    const container = document.getElementById('customers-list-container');
    if (container) {
        if (loading) {
            if (window.setLoading) window.setLoading('customers-list-container');
        } else if (error) {
            container.innerHTML = `<div class="p-md text-center text-error">Failed to load customers: ${error.message}</div>`;
        } else if (entities.length === 0) {
            container.innerHTML = `
                <div class="flex flex-col items-center justify-center p-xl text-center">
                    <div class="w-16 h-16 rounded-full bg-surface-variant flex items-center justify-center mb-4 text-secondary">
                        <span class="material-symbols-outlined text-[32px]">person_off</span>
                    </div>
                    <h3 class="text-[16px] font-bold text-on-surface mb-1">No Customers Found</h3>
                    <p class="text-body text-secondary max-w-[250px]">Try adjusting your search or filters.</p>
                </div>
            `;
        } else {
            container.innerHTML = entities.map(c => 
                renderers.customerCard(c, isBulkMode, selectedIds.has(c.id))
            ).join('');
        }
    }
    
    // Update Bulk Toolbar
    updateBulkToolbar(state);
    
    // Update Active Entity Sheets if they are open
    if (activeEntity) {
        updateActiveEntitySheets(activeEntity);
    }
}

function updateBulkToolbar(state) {
    const { isBulkMode, selectedIds } = state;
    let toolbar = document.getElementById('customer-bulk-toolbar');
    
    if (isBulkMode) {
        if (!toolbar) {
            toolbar = document.createElement('div');
            toolbar.id = 'customer-bulk-toolbar';
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
    const detailsSheet = document.getElementById('customerDetailsSheet');
    if (detailsSheet && !detailsSheet.classList.contains('translate-y-full')) {
        const bodyContent = detailsSheet.querySelector('.overflow-y-auto');
        if (bodyContent) {
            bodyContent.innerHTML = getCustomerDetailsContent(entity);
        }
        const header = detailsSheet.querySelector('.bg-surface-container-lowest.sticky') || detailsSheet.querySelector('.px-lg.pb-md');
        if (header) {
            header.outerHTML = getCustomerDetailsHeader(entity);
        }
    }
}

// ─── CRUD OPERATIONS ──────────────────────────────────────────────

window.saveNewCustomer = async function() {
    const btn = document.getElementById('create-customer-submit');
    if (btn) btn.innerHTML = '<span class="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>';
    
    const mobile = document.getElementById('new-cust-mobile')?.value || '';
    const whatsapp = document.getElementById('new-cust-whatsapp')?.value || mobile;
    const name = document.getElementById('new-cust-name')?.value || '';
    const creditLimit = parseFloat(document.getElementById('new-cust-limit')?.value || 0);

    const data = {
        name,
        company: document.getElementById('new-cust-company')?.value || '',
        contactPerson: document.getElementById('new-cust-contact')?.value || '',
        phone: mobile,
        mobile: mobile,
        whatsapp,
        email: document.getElementById('new-cust-email')?.value || '',
        gst: document.getElementById('new-cust-gst')?.value || '',
        customerType: document.getElementById('new-cust-type')?.value || 'Brand',
        paymentTerms: document.getElementById('new-cust-terms')?.value || '',
        creditLimit,
        currency: document.getElementById('new-cust-currency')?.value || 'INR',
        addressLine1: document.getElementById('new-cust-addr1')?.value || '',
        addressLine2: document.getElementById('new-cust-addr2')?.value || '',
        city: document.getElementById('new-cust-city')?.value || '',
        state: document.getElementById('new-cust-state')?.value || '',
        country: document.getElementById('new-cust-country')?.value || 'India',
        pincode: document.getElementById('new-cust-pincode')?.value || '',
        notes: document.getElementById('new-cust-notes')?.value || '',
        isActive: document.getElementById('new-cust-active')?.checked ? 1 : 0
    };
    
    const payload = {
        ...data,
        status: data.isActive ? 'Active' : 'Inactive',
        statusColor: data.isActive ? 'bg-[#008A00]/10 text-[#008A00]' : 'bg-surface-variant text-secondary'
    };
    
    try {
        await customerStore.createCustomer(payload);
        window.closeSheet('addCustomerSheet');
        window.showToast('Customer saved successfully', 'success');
        
        const form = document.getElementById('addCustomerSheet-content');
        if (form) form.reset();
    } catch (error) {
        console.error(error);
        window.showToast(error.message || 'Failed to save customer', 'error');
    } finally {
        if (btn) btn.innerHTML = 'Save Customer';
    }
};

window.saveEditedCustomer = async function() {
    const btn = document.getElementById('edit-customer-submit');
    if (btn) btn.innerHTML = '<span class="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>';
    
    const id = document.getElementById('edit-cust-id')?.value;
    const isActive = document.getElementById('edit-cust-active')?.checked;
    const mobile = document.getElementById('edit-cust-mobile')?.value || '';
    const whatsapp = document.getElementById('edit-cust-whatsapp')?.value || mobile;
    const creditLimit = parseFloat(document.getElementById('edit-cust-limit')?.value || 0);
    
    const customerData = {
        name: document.getElementById('edit-cust-name')?.value || '',
        company: document.getElementById('edit-cust-company')?.value || '',
        contactPerson: document.getElementById('edit-cust-contact')?.value || '',
        phone: mobile,
        mobile: mobile,
        whatsapp,
        email: document.getElementById('edit-cust-email')?.value || '',
        gst: document.getElementById('edit-cust-gst')?.value || '',
        customerType: document.getElementById('edit-cust-type')?.value || 'Brand',
        paymentTerms: document.getElementById('edit-cust-terms')?.value || '',
        creditLimit,
        currency: document.getElementById('edit-cust-currency')?.value || 'INR',
        addressLine1: document.getElementById('edit-cust-addr1')?.value || '',
        addressLine2: document.getElementById('edit-cust-addr2')?.value || '',
        city: document.getElementById('edit-cust-city')?.value || '',
        state: document.getElementById('edit-cust-state')?.value || '',
        country: document.getElementById('edit-cust-country')?.value || 'India',
        pincode: document.getElementById('edit-cust-pincode')?.value || '',
        notes: document.getElementById('edit-cust-notes')?.value || '',
        isActive: isActive ? 1 : 0,
        status: isActive ? 'Active' : 'Inactive',
        statusColor: isActive ? 'bg-[#008A00]/10 text-[#008A00]' : 'bg-surface-variant text-secondary'
    };
    
    try {
        await customerStore.updateCustomer(id, customerData);
        window.closeSheet('editCustomerSheet');
        window.showToast('Customer updated successfully', 'success');
        setTimeout(() => window.openCustomerDetails(id), 300);
    } catch (error) {
        console.error(error);
        window.showToast('Failed to update customer', 'error');
    } finally {
        if (btn) btn.innerHTML = 'Update Customer';
    }
};

window.deleteCustomerFlow = function(id) {
    const customer = customerStore.getState().entities.find(c => c.id === id)
        || customerStore.getState().activeEntity;
    if (!customer) return;

    window.showConfirmation({
        title: 'Delete Customer',
        message: `Are you sure you want to permanently delete ${customer.name}? This cannot be undone.`,
        confirmText: 'Delete',
        onConfirm: async () => {
            try {
                window.closeSheet('customerDetailsSheet');
                await customerStore.deleteCustomer(id);
                window.showToast('Customer deleted successfully', 'success');
            } catch (error) {
                window.showToast('Failed to delete customer', 'error');
            }
        }
    });
};

window.archiveCustomerFlow = async function(id) {
    try {
        window.closeSheet('customerDetailsSheet');
        await customerStore.archiveCustomer(id);
        window.showToast('Customer archived', 'success');
    } catch (error) {
        window.showToast('Failed to archive customer', 'error');
    }
};

window.restoreCustomerFlow = async function(id) {
    try {
        window.closeSheet('customerDetailsSheet');
        await customerStore.restoreCustomer(id);
        window.showToast('Customer restored', 'success');
    } catch (error) {
        window.showToast('Failed to restore customer', 'error');
    }
};

window.duplicateCustomerFlow = async function(id) {
    try {
        window.closeSheet('customerDetailsSheet');
        await customerStore.duplicateCustomer(id);
        window.showToast('Customer duplicated successfully', 'success');
    } catch (error) {
        window.showToast('Failed to duplicate customer', 'error');
    }
};

// ─── RECORD / COLLECT PAYMENT FLOW ────────────────────────────────

window.openCollectPayment = function(id) {
    const container = document.getElementById('sheets-container');
    document.getElementById('collectPaymentSheet-content')?.remove();
    document.getElementById('collectPaymentSheet-overlay')?.remove();

    const sheetHTML = BottomSheet({
        id: 'collectPaymentSheet',
        title: 'Collect Payment',
        content: getCollectPaymentSheetHTML(id),
        footerContent: getCollectPaymentFooterHTML(),
        isForm: true,
    });

    container.insertAdjacentHTML('beforeend', sheetHTML);
    setTimeout(() => window.openSheet('collectPaymentSheet'), 50);
};

window.saveCustomerPayment = async function() {
    const btn = document.getElementById('collect-payment-submit');
    if (btn) btn.innerHTML = '<span class="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>';

    const customerId = document.getElementById('collect-customer-id')?.value;
    const amount     = parseFloat(document.getElementById('collect-amount')?.value || 0);
    const method     = document.getElementById('collect-method')?.value || 'UPI';
    const date       = document.getElementById('collect-date')?.value || new Date().toISOString().split('T')[0];
    const ref        = document.getElementById('collect-ref')?.value || '';
    const notes      = document.getElementById('collect-notes')?.value || '';

    if (!amount || amount <= 0) {
        window.showToast?.('Please enter a valid amount', 'error');
        if (btn) btn.innerHTML = 'Record Income';
        return;
    }

    const customer = customerStore.getState().entities.find(c => c.id === customerId)
        || customerStore.getState().activeEntity;

    // Create a finance transaction that links to the customer
    const txn = {
        id:            `txn-inc-${Date.now()}`,
        type:          'Income',
        title:         `Payment from ${customer?.name || 'Customer'}`,
        category:      'Customer Payment',
        amount,
        date,
        status:        'Completed',
        paymentMethod: method,
        referenceNo:   ref,
        notes,
        refId:         customerId,
        isNegative:    0,
        createdBy:     'Admin',
        icon:          'payments',
        iconBg:        'bg-[#008A00]/10',
        iconColor:     'text-[#008A00]',
        amountColor:   'text-[#008A00]',
    };

    try {
        const { db } = await import('../data/database.js');
        await db.insert('transactions', txn);

        window.closeSheet('collectPaymentSheet');
        window.showToast?.(`Income of ₹${amount.toLocaleString('en-IN')} recorded`, 'success');

        // Refresh customer detail and reload list
        await customerStore.fetchActiveEntity(customerId);
        await customerStore.loadCustomers();
        setTimeout(() => window.openCustomerDetails(customerId), 300);
    } catch (e) {
        console.error(e);
        window.showToast?.('Failed to record payment', 'error');
    } finally {
        if (btn) btn.innerHTML = 'Record Income';
    }
};

// ─── FILTER HANDLERS ──────────────────────────────────────────────

window.setCustomerStatusFilter = function (val) {
    customerStore.setFilter('status', val);

    document.querySelectorAll('[data-status-filter]').forEach(btn => {
        const isActive = btn.getAttribute('data-status-filter') === val;
        btn.className = isActive
            ? 'flex-1 py-2 rounded-[12px] text-[13px] font-semibold bg-surface-container-lowest text-on-surface shadow-sm transition-all'
            : 'flex-1 py-2 rounded-[12px] text-[13px] font-semibold text-secondary transition-all';
    });
};

window.setCustomerTypeFilter = function (val) {
    customerStore.setFilter('customerType', val);

    document.querySelectorAll('#customer-type-chips [data-type-filter]').forEach(btn => {
        const isActive = btn.getAttribute('data-type-filter') === val;
        btn.className = isActive
            ? 'px-3 py-1.5 rounded-xl text-[12px] font-bold border transition-all shrink-0 bg-primary text-white border-primary cursor-pointer touch-manipulation'
            : 'px-3 py-1.5 rounded-xl text-[12px] font-bold border transition-all shrink-0 bg-surface-container-lowest text-secondary border-outline-variant cursor-pointer touch-manipulation';
    });
};

// ─── SHEETS & UI FLOWS ────────────────────────────────────────────

window.openCustomerDetails = async function(id) {
    if (customerStore.getState().isBulkMode) {
        window.toggleCustomerSelection(id);
        return;
    }

    await customerStore.fetchActiveEntity(id);
    const customer = customerStore.getState().activeEntity;
    if (!customer) return;

    const container = document.getElementById('sheets-container');
    document.getElementById('customerDetailsSheet-content')?.remove();
    document.getElementById('customerDetailsSheet-overlay')?.remove();

    const sheetHTML = BottomSheet({
        id: 'customerDetailsSheet',
        customHeader: getCustomerDetailsHeader(customer),
        content: getCustomerDetailsContent(customer),
        footerContent: getCustomerDetailsFooter(customer),
        height: '92vh'
    });

    container.insertAdjacentHTML('beforeend', sheetHTML);
    setTimeout(() => window.openSheet('customerDetailsSheet'), 50);
};

window.openEditCustomer = async function(id) {
    await customerStore.fetchActiveEntity(id);
    const customer = customerStore.getState().activeEntity;
    if (!customer) return;

    window.closeSheet('customerDetailsSheet');

    const container = document.getElementById('sheets-container');
    document.getElementById('editCustomerSheet-content')?.remove();
    document.getElementById('editCustomerSheet-overlay')?.remove();

    const sheetHTML = BottomSheet({
        id: 'editCustomerSheet',
        title: 'Edit Customer',
        content: getEditCustomerSheetHTML(customer),
        footerContent: getEditCustomerFooterHTML(),
        isForm: true
    });

    container.insertAdjacentHTML('beforeend', sheetHTML);
    
    setTimeout(() => {
        bindFormValidation('editCustomerSheet-content', 'edit-customer-submit');
        window.openSheet('editCustomerSheet');
    }, 300);
};

// ─── BULK OPERATIONS ──────────────────────────────────────────────

window.toggleCustomerSelection = function(id) {
    customerStore.toggleSelection(id);
};

window.clearCustomerSelection = function() {
    customerStore.clearSelection();
};

window.bulkArchiveCustomers = async function() {
    const size = customerStore.getState().selectedIds.size;
    if (!size) return;
    
    try {
        await customerStore.bulkArchive();
        window.showToast(`${size} customers archived`, 'success');
    } catch (e) {
        window.showToast('Failed to archive customers', 'error');
    }
};

window.bulkDeleteCustomers = function() {
    const size = customerStore.getState().selectedIds.size;
    if (!size) return;

    window.showConfirmation({
        title: 'Delete Customers',
        message: `Are you sure you want to permanently delete ${size} customers?`,
        confirmText: 'Delete All',
        onConfirm: async () => {
            try {
                await customerStore.bulkDelete();
                window.showToast(`${size} customers deleted`, 'success');
            } catch (e) {
                window.showToast('Failed to delete customers', 'error');
            }
        }
    });
};
