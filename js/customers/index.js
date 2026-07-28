import { customerStore } from '../stores/CustomerStore.js';
import { renderers } from '../renderers.js';
import { BottomSheet } from '../components/index.js';
import { bindFormValidation } from '../utils/formHandler.js';
import { getCreateCustomerSheetHTML, getCreateCustomerFooterHTML } from '../components/customerForms.js';
import { 
    getBulkToolbarHTML, 
    getCustomerDetailsHeader, 
    getCustomerDetailsContent, 
    getCustomerDetailsFooter, 
    getEditCustomerSheetHTML, 
    getEditCustomerFooterHTML 
} from './templates.js';

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

    // Search binding
    const searchInput = document.querySelector('input[placeholder="Search..."]');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            customerStore.setSearch(e.target.value);
        });
    }

    // Filter binding
    const filterBtn = Array.from(document.querySelectorAll('button')).find(btn => btn.textContent.includes('tune'));
    if (filterBtn) {
        filterBtn.addEventListener('click', () => {
            window.showToast('Filters coming soon', 'info');
        });
    }
}

// ─── STATE-DRIVEN RENDERING ─────────────────────────────────────

function renderUI(state) {
    const { entities, activeEntity, selectedIds, isBulkMode, loading, error } = state;
    
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
    // If the customer details sheet is currently open, we should re-render its contents to reflect any state changes.
    const detailsSheet = document.getElementById('customerDetailsSheet');
    if (detailsSheet && !detailsSheet.classList.contains('translate-y-full')) {
        // We avoid completely replacing the HTML so we don't break animations.
        // For now, since we rebuild BottomSheet HTML, we will just silently swap the contents.
        const bodyContent = detailsSheet.querySelector('.overflow-y-auto');
        if (bodyContent) {
            bodyContent.innerHTML = getCustomerDetailsContent(entity);
        }
        // Header
        const header = detailsSheet.querySelector('.bg-surface-container-lowest.sticky');
        if (header) {
            header.innerHTML = getCustomerDetailsHeader(entity);
        }
    }
}

// ─── CRUD OPERATIONS ──────────────────────────────────────────────

window.saveNewCustomer = async function() {
    const btn = document.getElementById('create-customer-submit');
    if (btn) btn.innerHTML = '<span class="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>';
    
    const data = {
        name: document.getElementById('new-cust-name').value,
        company: document.getElementById('new-cust-company').value,
        contactPerson: document.getElementById('new-cust-contact').value,
        mobile: document.getElementById('new-cust-mobile').value,
        whatsapp: document.getElementById('new-cust-whatsapp').value,
        email: document.getElementById('new-cust-email').value,
        gst: document.getElementById('new-cust-gst').value,
        customerType: document.getElementById('new-cust-type').value,
        paymentTerms: document.getElementById('new-cust-terms').value,
        creditLimit: document.getElementById('new-cust-limit').value,
        currency: document.getElementById('new-cust-currency').value,
        addressLine1: document.getElementById('new-cust-addr1').value,
        addressLine2: document.getElementById('new-cust-addr2').value,
        city: document.getElementById('new-cust-city').value,
        state: document.getElementById('new-cust-state').value,
        country: document.getElementById('new-cust-country').value,
        pincode: document.getElementById('new-cust-pincode').value,
        notes: document.getElementById('new-cust-notes').value,
        isActive: document.getElementById('new-cust-active').checked
    };
    
    const payload = {
        ...data,
        status: 'Active',
        statusColor: 'bg-success-container/30 text-success'
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
    
    const id = document.getElementById('edit-cust-id').value;
    const isActive = document.getElementById('edit-cust-active').checked;
    
    const customerData = {
        name: document.getElementById('edit-cust-name').value,
        company: document.getElementById('edit-cust-company').value,
        contactPerson: document.getElementById('edit-cust-contact').value,
        phone: document.getElementById('edit-cust-mobile').value,
        whatsapp: document.getElementById('edit-cust-whatsapp').value,
        email: document.getElementById('edit-cust-email').value,
        gst: document.getElementById('edit-cust-gst').value,
        customerType: document.getElementById('edit-cust-type').value,
        paymentTerms: document.getElementById('edit-cust-terms').value,
        creditLimit: parseFloat(document.getElementById('edit-cust-limit').value) || 0,
        currency: document.getElementById('edit-cust-currency').value,
        addressLine1: document.getElementById('edit-cust-addr1').value,
        addressLine2: document.getElementById('edit-cust-addr2').value,
        city: document.getElementById('edit-cust-city').value,
        state: document.getElementById('edit-cust-state').value,
        country: document.getElementById('edit-cust-country').value,
        pincode: document.getElementById('edit-cust-pincode').value,
        notes: document.getElementById('edit-cust-notes').value,
        status: isActive ? 'Active' : 'Inactive',
        statusColor: isActive ? 'bg-success-container/30 text-success' : 'bg-surface-variant text-secondary'
    };
    
    try {
        await customerStore.updateCustomer(id, customerData);
        window.closeSheet('editCustomerSheet');
        window.showToast('Customer updated successfully', 'success');
        // Re-open details sheet
        setTimeout(() => window.openCustomerDetails(id), 300);
    } catch (error) {
        console.error(error);
        window.showToast('Failed to update customer', 'error');
    } finally {
        if (btn) btn.innerHTML = 'Update Customer';
    }
};

window.deleteCustomerFlow = function(id) {
    const customer = customerStore.getState().entities.find(c => c.id === id);
    if (!customer) return;

    window.showConfirmation({
        title: 'Delete Customer',
        message: `Are you sure you want to delete ${customer.name}? This action cannot be undone and will permanently remove the customer record.`,
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
    const existing = document.getElementById('customerDetailsSheet');
    if (existing) {
        existing.remove(); 
        const overlay = document.getElementById('customerDetailsSheet-overlay');
        if (overlay) overlay.remove();
    }

    const sheetHTML = BottomSheet({
        id: 'customerDetailsSheet',
        customHeader: getCustomerDetailsHeader(customer),
        content: getCustomerDetailsContent(customer),
        footerContent: getCustomerDetailsFooter(customer),
        height: '90vh'
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
    const existing = document.getElementById('editCustomerSheet');
    if (existing) {
        existing.remove();
        const overlay = document.getElementById('editCustomerSheet-overlay');
        if (overlay) overlay.remove();
    }

    const sheetHTML = BottomSheet({
        id: 'editCustomerSheet',
        title: 'Edit Customer',
        content: getEditCustomerSheetHTML(customer),
        footerContent: getEditCustomerFooterHTML(customer.id),
        isForm: true
    });

    container.insertAdjacentHTML('beforeend', sheetHTML);
    
    // Bind validation
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
