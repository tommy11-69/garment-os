import { vendorStore } from '../stores/VendorStore.js';
import { db } from '../data/database.js';
import { templates } from './templates.js';

const DOM = {
    list: document.getElementById('vendors-list-container'),
    search: document.getElementById('vendor-search'),
    count: document.getElementById('vendors-count'),
    sheets: document.getElementById('sheets-container')
};

function renderList() {
    const { entities, loading, error } = vendorStore.getState();
    if (loading) {
        DOM.list.innerHTML = `<div class="p-4 text-center text-secondary">Loading vendors...</div>`;
        return;
    }
    if (error) {
        DOM.list.innerHTML = `<div class="p-4 text-center text-error">Error: ${error.message}</div>`;
        return;
    }
    
    if (entities.length === 0) {
        DOM.list.innerHTML = `
            <div class="py-10 text-center">
                <div class="w-16 h-16 rounded-full bg-surface-container mx-auto mb-4 flex items-center justify-center text-secondary">
                    <span class="material-symbols-outlined text-[32px]">storefront</span>
                </div>
                <h3 class="text-[16px] font-bold text-on-surface mb-1">No vendors found</h3>
                <p class="text-[14px] text-secondary">Try adjusting your filters or add a new vendor.</p>
            </div>
        `;
        DOM.count.textContent = `0 Vendors`;
        return;
    }

    DOM.list.innerHTML = entities.map(v => templates.vendorCard(v)).join('');
    DOM.count.textContent = `${entities.length} Vendors`;
}

// Subscriptions
vendorStore.subscribe(() => renderList());

// Filtering & Search
window.setFilter = (key, val) => {
    vendorStore.setFilter(key, val);
    
    // Update active tab styling
    if (key === 'status') {
        const btns = ['filter-active', 'filter-inactive', 'filter-all'];
        btns.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            if (id === `filter-${val.toLowerCase()}`) {
                el.className = "flex-1 py-2 rounded-[12px] text-[13px] font-semibold bg-surface-container-lowest text-on-surface shadow-sm transition-all";
            } else {
                el.className = "flex-1 py-2 rounded-[12px] text-[13px] font-semibold text-secondary transition-all";
            }
        });
    }
};

DOM.search.addEventListener('input', (e) => {
    vendorStore.setSearch(e.target.value);
});

// Initialization
function initSheets() {
    DOM.sheets.innerHTML = `
        ${window.BottomSheet ? window.BottomSheet({ 
            id: 'addVendorSheet', 
            title: 'Add Vendor', 
            content: `
                <div class="flex flex-col gap-4">
                    <div class="field-group">
                        <label class="text-[12px] font-semibold text-secondary uppercase tracking-wider mb-1.5 block">Vendor Name *</label>
                        <input type="text" id="v-name" class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-4 py-3 text-[15px] font-medium text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors" required>
                    </div>
                    <div class="field-group">
                        <label class="text-[12px] font-semibold text-secondary uppercase tracking-wider mb-1.5 block">Vendor Type</label>
                        <select id="v-type" class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-4 py-3 text-[15px] font-medium text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors">
                            <option value="Fabric">Fabric</option>
                            <option value="Yarn">Yarn</option>
                            <option value="Accessories">Accessories</option>
                            <option value="Printing">Printing</option>
                            <option value="Dyeing">Dyeing</option>
                            <option value="Embroidery">Embroidery</option>
                            <option value="Packaging">Packaging</option>
                            <option value="Other" selected>Other</option>
                        </select>
                    </div>
                    <div class="field-group">
                        <label class="text-[12px] font-semibold text-secondary uppercase tracking-wider mb-1.5 block">Contact Person</label>
                        <input type="text" id="v-contact" class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-4 py-3 text-[15px] font-medium text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors">
                    </div>
                    <div class="field-group">
                        <label class="text-[12px] font-semibold text-secondary uppercase tracking-wider mb-1.5 block">Phone</label>
                        <input type="tel" id="v-phone" class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-4 py-3 text-[15px] font-medium text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors">
                    </div>
                    <div class="field-group">
                        <label class="text-[12px] font-semibold text-secondary uppercase tracking-wider mb-1.5 block">City</label>
                        <input type="text" id="v-city" class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-4 py-3 text-[15px] font-medium text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors">
                    </div>
                    <div class="field-group">
                        <label class="text-[12px] font-semibold text-secondary uppercase tracking-wider mb-1.5 block">Payment Terms</label>
                        <input type="text" id="v-terms" placeholder="e.g. 30 Days" class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-4 py-3 text-[15px] font-medium text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors">
                    </div>
                    <div class="h-10"></div>
                </div>
            `,
            footerContent: `<button onclick="window.saveVendor()" class="w-full bg-primary text-on-primary font-bold text-[16px] py-4 rounded-2xl active-scale transition-apple shadow-sm">Save Vendor</button>`,
            isForm: true
        }) : ''}

        ${window.BottomSheet ? window.BottomSheet({ 
            id: 'vendorDetailsSheet', 
            customHeader: '<div id="vd-header"></div>', 
            content: '<div id="vd-content"></div>',
            height: '90vh'
        }) : ''}
        
        ${window.BottomSheet ? window.BottomSheet({ 
            id: 'addPaymentSheet', 
            title: 'Add Payment', 
            content: `
                <div class="flex flex-col gap-4">
                    <input type="hidden" id="p-vendor-id">
                    <div class="field-group">
                        <label class="text-[12px] font-semibold text-secondary uppercase tracking-wider mb-1.5 block">Amount *</label>
                        <input type="number" id="p-amount" class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-4 py-3 text-[15px] font-medium text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors" required>
                    </div>
                    <div class="field-group">
                        <label class="text-[12px] font-semibold text-secondary uppercase tracking-wider mb-1.5 block">Payment Method</label>
                        <select id="p-method" class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-4 py-3 text-[15px] font-medium text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors">
                            <option value="UPI">UPI</option>
                            <option value="Bank Transfer">Bank Transfer</option>
                            <option value="Cash">Cash</option>
                            <option value="Cheque">Cheque</option>
                        </select>
                    </div>
                    <div class="field-group">
                        <label class="text-[12px] font-semibold text-secondary uppercase tracking-wider mb-1.5 block">Reference No / Notes</label>
                        <input type="text" id="p-ref" class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-4 py-3 text-[15px] font-medium text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors">
                    </div>
                    <div class="h-10"></div>
                </div>
            `,
            footerContent: `<button onclick="window.savePayment()" class="w-full bg-primary text-on-primary font-bold text-[16px] py-4 rounded-2xl active-scale transition-apple shadow-sm">Record Payment</button>`,
            isForm: true
        }) : ''}
    `;
}

let editingVendorId = null;

window.openVendorDetails = async (id) => {
    await vendorStore.fetchActiveEntity(id);
    const { activeEntity } = vendorStore.getState();
    if (!activeEntity) return;

    document.getElementById('vd-header').innerHTML = '';
    document.getElementById('vd-content').innerHTML = templates.vendorDetails(activeEntity);
    window.openSheet('vendorDetailsSheet');
};

window.closeVendorDetails = () => {
    window.closeSheet('vendorDetailsSheet');
};

window.saveVendor = async () => {
    const name = document.getElementById('v-name').value;
    if (!name) {
        window.showToast?.('Vendor name is required', 'error');
        return;
    }

    const data = {
        name,
        vendorType: document.getElementById('v-type').value,
        contactPerson: document.getElementById('v-contact').value,
        phone: document.getElementById('v-phone').value,
        city: document.getElementById('v-city').value,
        paymentTerms: document.getElementById('v-terms').value
    };

    try {
        if (editingVendorId) {
            await vendorStore.updateVendor(editingVendorId, data);
            window.showToast?.('Vendor updated', 'success');
        } else {
            await vendorStore.createVendor(data);
            window.showToast?.('Vendor created', 'success');
        }
        window.closeSheet('addVendorSheet');
        editingVendorId = null;
    } catch (e) {
        window.showToast?.(e.message, 'error');
    }
};

window.editVendor = (id) => {
    const { entities } = vendorStore.getState();
    const vendor = entities.find(v => v.id === id);
    if (!vendor) return;

    editingVendorId = id;
    document.getElementById('v-name').value = vendor.name || '';
    document.getElementById('v-type').value = vendor.vendorType || 'Other';
    document.getElementById('v-contact').value = vendor.contactPerson || '';
    document.getElementById('v-phone').value = vendor.phone || '';
    document.getElementById('v-city').value = vendor.city || '';
    document.getElementById('v-terms').value = vendor.paymentTerms || '';

    window.closeSheet('vendorDetailsSheet');
    setTimeout(() => window.openSheet('addVendorSheet'), 300);
};

window.deleteVendor = async (id) => {
    if (confirm('Are you sure you want to delete this vendor? This action cannot be undone.')) {
        try {
            await vendorStore.deleteVendor(id);
            window.closeSheet('vendorDetailsSheet');
            window.showToast?.('Vendor deleted', 'success');
        } catch (e) {
            window.showToast?.(e.message, 'error');
        }
    }
};

window.addVendorPayment = (id) => {
    document.getElementById('p-vendor-id').value = id;
    document.getElementById('p-amount').value = '';
    document.getElementById('p-ref').value = '';
    
    window.closeSheet('vendorDetailsSheet');
    setTimeout(() => window.openSheet('addPaymentSheet'), 300);
};

window.savePayment = async () => {
    const vendorId = document.getElementById('p-vendor-id').value;
    const amount = parseFloat(document.getElementById('p-amount').value);
    
    if (!amount || amount <= 0) {
        window.showToast?.('Please enter a valid amount', 'error');
        return;
    }

    const { entities } = vendorStore.getState();
    const vendor = entities.find(v => v.id === vendorId);

    const transactionData = {
        id: `tx-${Date.now()}`,
        type: 'Payment',
        amount: amount,
        date: new Date().toISOString().split('T')[0],
        status: 'Completed',
        paymentMethod: document.getElementById('p-method').value,
        referenceNo: document.getElementById('p-ref').value,
        createdBy: 'Admin',
        description: `Payment to ${vendor ? vendor.name : 'Vendor'}`,
        refId: vendorId,
        title: `Payment`,
        amountColor: 'text-[#FF9F0A]',
        isNegative: 1, // 1 because it's money out
        icon: 'payments',
        iconBg: 'bg-[#FF9F0A]/10',
        iconColor: 'text-[#FF9F0A]',
    };

    try {
        await db.insert('transactions', transactionData);
        await vendorStore.fetchActiveEntity(vendorId);
        await vendorStore.loadVendors(); // Refresh the list
        
        window.closeSheet('addPaymentSheet');
        window.showToast?.('Payment recorded successfully', 'success');
        
        // Re-open details
        setTimeout(() => window.openVendorDetails(vendorId), 300);
    } catch (e) {
        window.showToast?.(e.message, 'error');
    }
};

// Reset form when opening add sheet (if not editing)
const originalOpenSheet = window.openSheet;
window.openSheet = (id) => {
    if (id === 'addVendorSheet' && !editingVendorId) {
        document.getElementById('v-name').value = '';
        document.getElementById('v-type').value = 'Other';
        document.getElementById('v-contact').value = '';
        document.getElementById('v-phone').value = '';
        document.getElementById('v-city').value = '';
        document.getElementById('v-terms').value = '';
    }
    if (originalOpenSheet) originalOpenSheet(id);
};

// Init
document.addEventListener('DOMContentLoaded', () => {
    initSheets();
    vendorStore.loadVendors();
});
