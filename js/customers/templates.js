import { TextInput, SelectInput, TextareaInput } from '../components/inputs.js';

export function getBulkToolbarHTML(selectedCount) {
    return `
        <div class="flex items-center justify-between w-full">
            <div class="flex items-center gap-3">
                <button onclick="window.clearCustomerSelection()" class="w-10 h-10 rounded-full flex items-center justify-center text-on-surface hover:bg-surface-variant transition-colors">
                    <span class="material-symbols-outlined">close</span>
                </button>
                <span class="text-[16px] font-bold text-on-surface">${selectedCount} Selected</span>
            </div>
            <div class="flex items-center gap-2">
                <button onclick="window.bulkArchiveCustomers()" class="px-4 py-2 bg-surface-variant text-on-surface rounded-xl text-[13px] font-semibold active-scale transition-apple">
                    Archive
                </button>
                <button onclick="window.bulkDeleteCustomers()" class="px-4 py-2 bg-error text-white rounded-xl text-[13px] font-semibold active-scale transition-apple shadow-sm">
                    Delete
                </button>
            </div>
        </div>
    `;
}

export function getCustomerDetailsHeader(customer) {
    const avatarHtml = customer.avatar 
        ? `<img class="w-full h-full object-cover" src="${customer.avatar}" alt="${customer.name}"/>`
        : `<span class="text-secondary font-medium text-[20px]">${customer.initials}</span>`;

    return `
        <div class="px-lg pb-md flex justify-between items-start border-b border-outline-variant/30">
            <div class="flex items-center gap-4">
                <div class="w-14 h-14 rounded-full overflow-hidden border border-outline-variant/30 flex-shrink-0 flex items-center justify-center bg-surface-variant/50">
                    ${avatarHtml}
                </div>
                <div>
                    <div class="flex items-center gap-2 mb-0.5">
                        <span class="text-[12px] font-semibold text-primary">${customer.customerCode}</span>
                        <span class="px-2 py-0.5 rounded text-[10px] font-medium ${customer.statusColor || 'bg-success-container/30 text-success'}">${customer.status || 'Active'}</span>
                    </div>
                    <h2 class="text-[20px] font-bold text-on-surface leading-tight">${customer.name}</h2>
                    <span class="text-[13px] text-secondary">${customer.company}</span>
                </div>
            </div>
            <div class="flex gap-2">
                <button onclick="window.duplicateCustomerFlow('${customer.id}')" class="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center text-secondary active-scale transition-apple" title="Duplicate">
                    <span class="material-symbols-outlined text-[18px]">content_copy</span>
                </button>
                <button onclick="window.deleteCustomerFlow('${customer.id}')" class="w-8 h-8 rounded-full bg-error-container/30 flex items-center justify-center text-error active-scale transition-apple" title="Delete">
                    <span class="material-symbols-outlined text-[18px]">delete</span>
                </button>
                <button onclick="window.openEditCustomer('${customer.id}')" class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary active-scale transition-apple" title="Edit">
                    <span class="material-symbols-outlined text-[18px]">edit</span>
                </button>
                <button onclick="window.closeSheet('customerDetailsSheet')" class="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center text-secondary active-scale transition-apple">
                    <span class="material-symbols-outlined text-[20px]">close</span>
                </button>
            </div>
        </div>
    `;
}

export function getCustomerDetailsContent(customer) {
    const revenueStr = `₹${(customer.totalRevenue || 0).toLocaleString()}`;
    const activeOrders = customer.activeOrders || 0;
    const completedOrders = customer.completedOrders || 0;
    const outstandingStr = `₹${(customer.outstanding || 0).toLocaleString()}`;
    const avgOrderValue = `₹${(customer.averageOrderValue || 0).toLocaleString(undefined, {maximumFractionDigits: 2})}`;

    return `
        <div class="grid grid-cols-2 gap-3 mb-4">
            <div class="bg-surface-container-lowest p-4 rounded-[20px] border border-outline-variant shadow-sm">
                <span class="text-[12px] font-semibold text-secondary uppercase tracking-wider mb-1 block">Total Revenue</span>
                <span class="text-[22px] font-bold text-success">${revenueStr}</span>
            </div>
            <div class="bg-surface-container-lowest p-4 rounded-[20px] border border-outline-variant shadow-sm">
                <span class="text-[12px] font-semibold text-secondary uppercase tracking-wider mb-1 block">Active Orders</span>
                <span class="text-[22px] font-bold text-on-surface">${activeOrders}</span>
            </div>
        </div>

        <div class="bg-surface-container-lowest rounded-[24px] border border-outline-variant shadow-sm overflow-hidden mb-4">
            <div class="p-4 border-b border-outline-variant/50">
                <h3 class="text-[15px] font-bold text-on-surface">Contact Information</h3>
            </div>
            <div class="p-4 flex flex-col gap-4">
                <div class="flex items-center gap-3">
                    <span class="material-symbols-outlined text-secondary text-[20px]">person</span>
                    <span class="text-[14px] text-on-surface">${customer.contactPerson || 'N/A'}</span>
                </div>
                <div class="flex items-center gap-3">
                    <span class="material-symbols-outlined text-secondary text-[20px]">mail</span>
                    ${customer.email ? `<a href="mailto:${customer.email}" class="text-[14px] text-primary">${customer.email}</a>` : `<span class="text-[14px] text-secondary">N/A</span>`}
                </div>
                <div class="flex items-center gap-3">
                    <span class="material-symbols-outlined text-secondary text-[20px]">phone_iphone</span>
                    ${customer.phone ? `<a href="tel:${customer.phone}" class="text-[14px] text-on-surface">${customer.phone}</a>` : `<span class="text-[14px] text-secondary">N/A</span>`}
                </div>
                <div class="flex items-start gap-3">
                    <span class="material-symbols-outlined text-secondary text-[20px]">location_on</span>
                    <p class="text-[14px] text-on-surface">
                        ${customer.addressLine1 || ''} <br>
                        ${customer.addressLine2 || ''} <br>
                        ${customer.city || ''}, ${customer.state || ''} ${customer.pincode || ''} <br>
                        ${customer.country || ''}
                    </p>
                </div>
            </div>
        </div>

        <div class="bg-surface-container-lowest rounded-[24px] border border-outline-variant shadow-sm overflow-hidden mb-4">
            <div class="p-4 border-b border-outline-variant/50">
                <h3 class="text-[15px] font-bold text-on-surface">Business Information</h3>
            </div>
            <div class="p-4 grid grid-cols-2 gap-4">
                <div>
                    <span class="text-[11px] font-semibold text-secondary uppercase tracking-wider block mb-1">Customer Type</span>
                    <span class="text-[14px] text-on-surface">${customer.customerType || 'N/A'}</span>
                </div>
                <div>
                    <span class="text-[11px] font-semibold text-secondary uppercase tracking-wider block mb-1">GST / Tax ID</span>
                    <span class="text-[14px] text-on-surface font-mono">${customer.gst || 'N/A'}</span>
                </div>
                <div>
                    <span class="text-[11px] font-semibold text-secondary uppercase tracking-wider block mb-1">Payment Terms</span>
                    <span class="text-[14px] text-on-surface">${customer.paymentTerms || 'N/A'}</span>
                </div>
                <div>
                    <span class="text-[11px] font-semibold text-secondary uppercase tracking-wider block mb-1">Credit Limit</span>
                    <span class="text-[14px] text-on-surface">${customer.creditLimit ? `₹${customer.creditLimit.toLocaleString()}` : 'N/A'}</span>
                </div>
            </div>
        </div>

        ${customer.outstanding > 0 ? `
        <div class="bg-error-container/30 border border-error/20 rounded-[20px] p-4 flex items-center justify-between mb-4">
            <div>
                <h4 class="text-[14px] font-bold text-error">Outstanding Balance</h4>
            </div>
            <span class="text-[20px] font-bold text-error">${outstandingStr}</span>
        </div>
        ` : ''}

        <div class="bg-surface-container-lowest rounded-[24px] border border-outline-variant shadow-sm overflow-hidden mb-4">
            <div class="p-4 border-b border-outline-variant/50">
                <h3 class="text-[15px] font-bold text-on-surface">Order Statistics</h3>
            </div>
            <div class="p-4 grid grid-cols-2 gap-4">
                <div>
                    <span class="text-[11px] font-semibold text-secondary uppercase tracking-wider block mb-1">Total Orders</span>
                    <span class="text-[14px] text-on-surface">${customer.totalOrders || 0}</span>
                </div>
                <div>
                    <span class="text-[11px] font-semibold text-secondary uppercase tracking-wider block mb-1">Completed</span>
                    <span class="text-[14px] text-on-surface">${completedOrders}</span>
                </div>
                <div>
                    <span class="text-[11px] font-semibold text-secondary uppercase tracking-wider block mb-1">Avg Order Value</span>
                    <span class="text-[14px] text-on-surface">${avgOrderValue}</span>
                </div>
                <div>
                    <span class="text-[11px] font-semibold text-secondary uppercase tracking-wider block mb-1">Last Order</span>
                    <span class="text-[14px] text-on-surface">${customer.lastOrderDate ? new Date(customer.lastOrderDate).toLocaleDateString() : 'N/A'}</span>
                </div>
            </div>
        </div>
        
        ${customer.notes ? `
        <div class="bg-surface-container-lowest rounded-[24px] border border-outline-variant shadow-sm overflow-hidden mb-4">
            <div class="p-4 border-b border-outline-variant/50">
                <h3 class="text-[15px] font-bold text-on-surface">Notes</h3>
            </div>
            <div class="p-4">
                <p class="text-[14px] text-on-surface whitespace-pre-wrap">${customer.notes}</p>
            </div>
        </div>
        ` : ''}

        
        ${customer.recentOrders && customer.recentOrders.length > 0 ? `
        <div class="bg-surface-container-lowest rounded-[24px] border border-outline-variant shadow-sm overflow-hidden mb-4">
            <div class="p-4 border-b border-outline-variant/50">
                <h3 class="text-[15px] font-bold text-on-surface">Recent Orders</h3>
            </div>
            <div class="flex flex-col">
                ${customer.recentOrders.map(o => `
                    <button onclick="window.location.href='orders.html?orderId=${o.id}'" class="flex items-center justify-between p-4 border-b border-outline-variant/50 last:border-0 active-bg text-left transition-colors">
                        <div>
                            <p class="text-[14px] font-bold text-on-surface mb-1">${o.id}</p>
                            <p class="text-[12px] text-secondary">${o.garmentType} • ${o.qty} pcs</p>
                        </div>
                        <div class="text-right">
                            <p class="text-[14px] font-bold text-on-surface mb-1">₹${(o.value || o.grandTotal || 0).toLocaleString()}</p>
                            <span class="text-[10px] font-medium px-2 py-0.5 rounded ${o.statusColor || 'bg-surface-variant'}">${o.status}</span>
                        </div>
                    </button>
                `).join('')}
            </div>
        </div>
        ` : ''}

        <div class="h-10"></div>
    `;
}

export function getCustomerDetailsFooter(customer) {
    const toggleArchiveStr = customer.status === 'Archived' ? 'Restore' : 'Archive';
    const toggleArchiveAction = customer.status === 'Archived' ? `window.restoreCustomerFlow('${customer.id}')` : `window.archiveCustomerFlow('${customer.id}')`;
    
    return `
        <button onclick="${toggleArchiveAction}" class="flex-1 bg-surface-container-high text-on-surface font-bold text-[15px] py-3.5 rounded-2xl active-scale transition-apple">
            ${toggleArchiveStr}
        </button>
        <button onclick="window.location.href='orders.html?customerId=${customer.id}'" class="flex-[2] bg-primary text-on-primary font-bold text-[15px] py-3.5 rounded-2xl active-scale transition-apple shadow-sm">
            View Orders
        </button>
    `;
}

export function getEditCustomerSheetHTML(customer) {
    const customerTypes = [
        {label: 'Select Type', value: ''},
        {label: 'Brand', value: 'Brand'},
        {label: 'Manufacturer', value: 'Manufacturer'},
        {label: 'Exporter', value: 'Exporter'},
        {label: 'Retailer', value: 'Retailer'},
        {label: 'Wholesaler', value: 'Wholesaler'},
        {label: 'Distributor', value: 'Distributor'}
    ].map(opt => ({ ...opt, selected: opt.value === customer.customerType }));

    return `
    <div id="editCustomerForm" class="flex flex-col gap-6">
        <input type="hidden" id="edit-cust-id" value="${customer.id}">
        
        <div>
            <h4 class="text-[13px] font-bold text-secondary uppercase tracking-wider mb-4 border-b border-outline-variant pb-2">Basic Information</h4>
            <div class="flex flex-col gap-4">
                ${TextInput({ label: 'Customer Name', id: 'edit-cust-name', required: true, value: customer.name })}
                ${TextInput({ label: 'Company Name', id: 'edit-cust-company', value: customer.company || '' })}
                ${TextInput({ label: 'Contact Person', id: 'edit-cust-contact', value: customer.contactPerson || '' })}
                <div class="grid grid-cols-2 gap-4">
                    ${TextInput({ label: 'Mobile Number', id: 'edit-cust-mobile', required: true, validationType: 'phone', type: 'tel', value: customer.phone || '' })}
                    ${TextInput({ label: 'WhatsApp Number', id: 'edit-cust-whatsapp', validationType: 'phone', type: 'tel', value: customer.whatsapp || '' })}
                </div>
                <div class="grid grid-cols-2 gap-4">
                    ${TextInput({ label: 'Email', id: 'edit-cust-email', type: 'email', validationType: 'email', value: customer.email || '' })}
                    ${TextInput({ label: 'GST Number', id: 'edit-cust-gst', validationType: 'gst', value: customer.gst || '' })}
                </div>
            </div>
        </div>

        <div>
            <h4 class="text-[13px] font-bold text-secondary uppercase tracking-wider mb-4 border-b border-outline-variant pb-2">Business Details</h4>
            <div class="grid grid-cols-2 gap-4 mb-4">
                <!-- We will set the select value manually in JS after render since SelectInput doesn't support selected out of the box in our simple implementation without extending it -->
                ${SelectInput({ label: 'Customer Type', id: 'edit-cust-type', options: customerTypes })}
                ${TextInput({ label: 'Payment Terms', id: 'edit-cust-terms', placeholder: 'e.g. Net 30', value: customer.paymentTerms || '' })}
            </div>
            <div class="grid grid-cols-2 gap-4">
                ${TextInput({ label: 'Credit Limit', id: 'edit-cust-limit', type: 'number', placeholder: '0.00', value: customer.creditLimit || '' })}
                ${SelectInput({ label: 'Currency', id: 'edit-cust-currency', options: [{label:'INR', value:'INR'}, {label:'USD', value:'USD'}, {label:'EUR', value:'EUR'}] })}
            </div>
        </div>

        <div>
            <h4 class="text-[13px] font-bold text-secondary uppercase tracking-wider mb-4 border-b border-outline-variant pb-2">Address</h4>
            <div class="flex flex-col gap-4">
                ${TextInput({ label: 'Address Line 1', id: 'edit-cust-addr1', value: customer.addressLine1 || '' })}
                ${TextInput({ label: 'Address Line 2', id: 'edit-cust-addr2', value: customer.addressLine2 || '' })}
                <div class="grid grid-cols-2 gap-4">
                    ${TextInput({ label: 'City', id: 'edit-cust-city', value: customer.city || '' })}
                    ${TextInput({ label: 'State', id: 'edit-cust-state', value: customer.state || '' })}
                </div>
                <div class="grid grid-cols-2 gap-4">
                    ${TextInput({ label: 'Country', id: 'edit-cust-country', value: customer.country || 'India' })}
                    ${TextInput({ label: 'Pincode', id: 'edit-cust-pincode', value: customer.pincode || '' })}
                </div>
            </div>
        </div>

        <div>
            <h4 class="text-[13px] font-bold text-secondary uppercase tracking-wider mb-4 border-b border-outline-variant pb-2">Additional</h4>
            ${TextareaInput({ label: 'Notes', id: 'edit-cust-notes', rows: 3, value: customer.notes || '' })}
            <div class="flex items-center justify-between mt-4 p-4 rounded-xl border border-outline-variant bg-surface-container-lowest">
                <div>
                    <p class="text-[15px] font-semibold text-on-surface">Active Status</p>
                    <p class="text-[12px] text-secondary">Customer can be assigned to new orders</p>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" id="edit-cust-active" class="sr-only peer" ${customer.status === 'Active' ? 'checked' : ''}>
                    <div class="w-11 h-6 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
            </div>
        </div>
        
        ${customer.recentOrders && customer.recentOrders.length > 0 ? `
        <div class="bg-surface-container-lowest rounded-[24px] border border-outline-variant shadow-sm overflow-hidden mb-4">
            <div class="p-4 border-b border-outline-variant/50">
                <h3 class="text-[15px] font-bold text-on-surface">Recent Orders</h3>
            </div>
            <div class="flex flex-col">
                ${customer.recentOrders.map(o => `
                    <button onclick="window.location.href='orders.html?orderId=${o.id}'" class="flex items-center justify-between p-4 border-b border-outline-variant/50 last:border-0 active-bg text-left transition-colors">
                        <div>
                            <p class="text-[14px] font-bold text-on-surface mb-1">${o.id}</p>
                            <p class="text-[12px] text-secondary">${o.garmentType} • ${o.qty} pcs</p>
                        </div>
                        <div class="text-right">
                            <p class="text-[14px] font-bold text-on-surface mb-1">₹${(o.value || o.grandTotal || 0).toLocaleString()}</p>
                            <span class="text-[10px] font-medium px-2 py-0.5 rounded ${o.statusColor || 'bg-surface-variant'}">${o.status}</span>
                        </div>
                    </button>
                `).join('')}
            </div>
        </div>
        ` : ''}

        <div class="h-10"></div>
    </div>
    `;
}

export function getEditCustomerFooterHTML() {
    return `
        <button type="button" onclick="window.closeSheet('editCustomerSheet')" class="flex-1 bg-surface-container-high text-on-surface font-bold text-[16px] py-4 rounded-2xl active-scale transition-apple">
            Cancel
        </button>
        <button id="edit-customer-submit" type="button" onclick="window.saveEditedCustomer()" class="flex-[2] bg-primary text-white font-bold text-[16px] py-4 rounded-2xl active-scale transition-apple shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
            Update Customer
        </button>
    `;
}
