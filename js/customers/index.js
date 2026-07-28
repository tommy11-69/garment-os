import { api } from '../services/api.js';
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

let currentCustomers = [];
let selectedCustomerIds = new Set();
let isBulkMode = false;
let currentSearch = '';
let currentFilters = { status: 'All', customerType: 'All' };

// ─── INITIALIZATION ───────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
    initUI();
    await loadCustomers();
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
            currentSearch = e.target.value;
            applyFiltersAndSearch();
        });
    }

    // Filter binding (Assuming there's a filter button triggering a filter sheet, mock for now)
    const filterBtn = Array.from(document.querySelectorAll('button')).find(btn => btn.textContent.includes('tune'));
    if (filterBtn) {
        filterBtn.addEventListener('click', () => {
            window.showToast('Filters coming soon', 'info');
        });
    }
}

// ─── DATA LOADING & RENDERING ─────────────────────────────────────

async function loadCustomers() {
    const container = document.getElementById('customers-list-container');
    if (window.setLoading && container) {
        window.setLoading('customers-list-container');
    }
    
    try {
        currentCustomers = await api.getCustomers();
        applyFiltersAndSearch();
    } catch (error) {
        if (container) container.innerHTML = '<div class="p-md text-center text-error">Failed to load customers</div>';
        console.error(error);
    }
}

async function applyFiltersAndSearch() {
    const container = document.getElementById('customers-list-container');
    if (!container) return;

    let filtered = [...currentCustomers];

    // Search
    if (currentSearch) {
        const q = currentSearch.toLowerCase();
        filtered = filtered.filter(c => 
            c.name.toLowerCase().includes(q) || 
            (c.company && c.company.toLowerCase().includes(q)) ||
            (c.customerCode && c.customerCode.toLowerCase().includes(q)) ||
            (c.phone && c.phone.includes(q)) ||
            (c.email && c.email.toLowerCase().includes(q))
        );
    }

    // Filters
    if (currentFilters.status !== 'All') {
        filtered = filtered.filter(c => c.status === currentFilters.status);
    }
    if (currentFilters.customerType !== 'All') {
        filtered = filtered.filter(c => c.customerType === currentFilters.customerType);
    }

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center p-xl text-center">
                <div class="w-16 h-16 rounded-full bg-surface-variant flex items-center justify-center mb-4 text-secondary">
                    <span class="material-symbols-outlined text-[32px]">person_off</span>
                </div>
                <h3 class="text-[16px] font-bold text-on-surface mb-1">No Customers Found</h3>
                <p class="text-body text-secondary max-w-[250px]">Try adjusting your search or filters.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = filtered.map(c => 
        renderers.customerCard(c, isBulkMode, selectedCustomerIds.has(c.id))
    ).join('');
    
    updateBulkToolbar();
}

// ─── CRUD OPERATIONS ──────────────────────────────────────────────

window.saveNewCustomer = async function() {
    const btn = document.getElementById('create-customer-submit');
    if (btn) btn.innerHTML = '<span class="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>';
    
    const customerData = {
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
    
    try {
        await api.saveCustomer(customerData);
        window.closeSheet('addCustomerSheet');
        window.showToast('Customer saved successfully', 'success');
        
        // Reset form
        const form = document.getElementById('addCustomerSheet-content');
        if (form) form.reset();
        
        await loadCustomers();
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
        status: document.getElementById('edit-cust-active').checked ? 'Active' : 'Inactive'
    };
    
    try {
        await api.updateCustomer(id, customerData);
        window.closeSheet('editCustomerSheet');
        window.showToast('Customer updated successfully', 'success');
        await loadCustomers();
        
        // Optional: Re-open details sheet with updated data
        setTimeout(() => window.openCustomerDetails(id), 300);
    } catch (error) {
        console.error(error);
        window.showToast('Failed to update customer', 'error');
    } finally {
        if (btn) btn.innerHTML = 'Update Customer';
    }
};

window.deleteCustomerFlow = function(id) {
    const customer = currentCustomers.find(c => c.id === id);
    if (!customer) return;

    window.showConfirmation({
        title: 'Delete Customer',
        message: `Are you sure you want to delete ${customer.name}? This action cannot be undone and will permanently remove the customer record.`,
        confirmText: 'Delete',
        onConfirm: async () => {
            try {
                window.closeSheet('customerDetailsSheet');
                await api.deleteCustomer(id);
                window.showToast('Customer deleted successfully', 'success');
                await loadCustomers();
            } catch (error) {
                window.showToast('Failed to delete customer', 'error');
            }
        }
    });
};

window.archiveCustomerFlow = async function(id) {
    try {
        window.closeSheet('customerDetailsSheet');
        await api.archiveCustomer(id);
        window.showToast('Customer archived', 'success');
        await loadCustomers();
    } catch (error) {
        window.showToast('Failed to archive customer', 'error');
    }
};

window.restoreCustomerFlow = async function(id) {
    try {
        window.closeSheet('customerDetailsSheet');
        await api.restoreCustomer(id);
        window.showToast('Customer restored', 'success');
        await loadCustomers();
    } catch (error) {
        window.showToast('Failed to restore customer', 'error');
    }
};

window.duplicateCustomerFlow = async function(id) {
    try {
        window.closeSheet('customerDetailsSheet');
        await api.duplicateCustomer(id);
        window.showToast('Customer duplicated successfully', 'success');
        await loadCustomers();
    } catch (error) {
        window.showToast('Failed to duplicate customer', 'error');
    }
};

// ─── SHEETS & UI FLOWS ────────────────────────────────────────────

window.openCustomerDetails = function(id) {
    if (isBulkMode) {
        window.toggleCustomerSelection(id);
        return;
    }

    const customer = currentCustomers.find(c => c.id === id);
    if (!customer) return;

    // We dynamically inject the bottom sheet for this customer
    const container = document.getElementById('sheets-container');
    const existing = document.getElementById('customerDetailsSheet');
    if (existing) existing.remove(); // Remove old instance

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

window.openEditCustomer = function(id) {
    const customer = currentCustomers.find(c => c.id === id);
    if (!customer) return;

    window.closeSheet('customerDetailsSheet');

    const container = document.getElementById('sheets-container');
    const existing = document.getElementById('editCustomerSheet');
    if (existing) existing.remove();

    const sheetHTML = BottomSheet({
        id: 'editCustomerSheet',
        title: 'Edit Customer',
        content: getEditCustomerSheetHTML(customer),
        footerContent: getEditCustomerFooterHTML(),
        isForm: true
    });

    container.insertAdjacentHTML('beforeend', sheetHTML);
    
    // Bind validation
    setTimeout(() => {
        bindFormValidation('editCustomerSheet-content', 'edit-customer-submit');
        window.openSheet('editCustomerSheet');
    }, 50);
};

// ─── BULK OPERATIONS ──────────────────────────────────────────────

window.toggleCustomerSelection = function(id) {
    if (selectedCustomerIds.has(id)) {
        selectedCustomerIds.delete(id);
    } else {
        selectedCustomerIds.add(id);
    }
    
    isBulkMode = selectedCustomerIds.size > 0;
    applyFiltersAndSearch();
};

window.clearCustomerSelection = function() {
    selectedCustomerIds.clear();
    isBulkMode = false;
    applyFiltersAndSearch();
};

function updateBulkToolbar() {
    let toolbar = document.getElementById('customer-bulk-toolbar');
    
    if (isBulkMode) {
        if (!toolbar) {
            toolbar = document.createElement('div');
            toolbar.id = 'customer-bulk-toolbar';
            toolbar.className = 'fixed bottom-[80px] left-4 right-4 bg-surface-container-highest border border-outline-variant shadow-lg rounded-2xl p-3 z-40 transition-all duration-300 translate-y-0 opacity-100 flex items-center max-w-[400px] mx-auto';
            document.body.appendChild(toolbar);
        }
        toolbar.innerHTML = getBulkToolbarHTML(selectedCustomerIds.size);
    } else {
        if (toolbar) {
            toolbar.classList.add('translate-y-4', 'opacity-0');
            setTimeout(() => toolbar.remove(), 300);
        }
    }
}

window.bulkArchiveCustomers = async function() {
    const ids = Array.from(selectedCustomerIds);
    if (!ids.length) return;
    
    try {
        for (const id of ids) {
            await api.archiveCustomer(id);
        }
        window.showToast(`${ids.length} customers archived`, 'success');
        window.clearCustomerSelection();
    } catch (e) {
        window.showToast('Failed to archive customers', 'error');
    }
};

window.bulkDeleteCustomers = function() {
    const ids = Array.from(selectedCustomerIds);
    if (!ids.length) return;

    window.showConfirmation({
        title: 'Delete Customers',
        message: `Are you sure you want to permanently delete ${ids.length} customers?`,
        confirmText: 'Delete All',
        onConfirm: async () => {
            try {
                for (const id of ids) {
                    await api.deleteCustomer(id);
                }
                window.showToast(`${ids.length} customers deleted`, 'success');
                window.clearCustomerSelection();
            } catch (e) {
                window.showToast('Failed to delete customers', 'error');
            }
        }
    });
};
