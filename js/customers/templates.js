import { TextInput, SelectInput, TextareaInput } from '../components/inputs.js';
import { CUSTOMER_TYPES, CUSTOMER_TYPE_COLORS } from '../components/customerForms.js';

const fmt = (n) => '₹' + parseFloat(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 });

function getTypeColor(type) {
    return CUSTOMER_TYPE_COLORS[type] || CUSTOMER_TYPE_COLORS['Other'];
}

// ─── BULK TOOLBAR ────────────────────────────────────────────────────────────

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

// ─── CUSTOMER DETAIL HEADER ──────────────────────────────────────────────────

export function getCustomerDetailsHeader(customer) {
    const tc = getTypeColor(customer.customerType);
    const initials = customer.initials || (customer.name || 'CU').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
    const phone = customer.phone || customer.mobile || '';
    const whatsapp = customer.whatsapp || phone;

    const avatarHtml = customer.avatar 
        ? `<img class="w-full h-full object-cover rounded-full" src="${customer.avatar}" alt="${customer.name}"/>`
        : `<span class="font-bold text-[20px]">${initials}</span>`;

    return `
        <div class="px-lg pb-md flex justify-between items-start border-b border-outline-variant/30">
            <div class="flex items-center gap-4">
                <div class="w-14 h-14 rounded-full flex-shrink-0 flex items-center justify-center ${tc.avatar}">
                    ${avatarHtml}
                </div>
                <div>
                    <div class="flex items-center gap-2 mb-0.5">
                        <span class="text-[12px] font-semibold text-primary">${customer.customerCode || ''}</span>
                        <span class="px-2 py-0.5 rounded text-[10px] font-semibold ${tc.bg} ${tc.text}">${customer.customerType || 'Customer'}</span>
                        <span class="px-2 py-0.5 rounded text-[10px] font-medium ${customer.statusColor || 'bg-[#008A00]/10 text-[#008A00]'}">${customer.status || 'Active'}</span>
                    </div>
                    <h2 class="text-[20px] font-bold text-on-surface leading-tight">${customer.name}</h2>
                    ${customer.company ? `<span class="text-[13px] text-secondary">${customer.company}</span>` : ''}
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

// ─── CUSTOMER DETAIL CONTENT ─────────────────────────────────────────────────

export function getCustomerDetailsContent(customer) {
    const revenue     = parseFloat(customer.totalRevenue || 0);
    const received    = parseFloat(customer.totalReceived || 0);
    const outstanding = parseFloat(customer.totalOutstanding ?? customer.outstanding ?? 0);
    const activeOrders = customer.activeOrders || 0;
    const creditLimit = parseFloat(customer.creditLimit || 0);
    const utilization = customer.creditUtilization || (creditLimit > 0 ? Math.min(100, Math.round((outstanding / creditLimit) * 100)) : 0);
    const phone = customer.phone || customer.mobile || '';
    const whatsapp = customer.whatsapp || phone;

    // Credit progress color
    const utilColor = utilization > 80 ? 'bg-error' : utilization > 50 ? 'bg-orange-500' : 'bg-[#008A00]';

    return `
        <!-- Financial Summary Grid (2x2) -->
        <div class="grid grid-cols-2 gap-3 mb-4">
            <div class="bg-surface-container-lowest p-4 rounded-[20px] border border-outline-variant shadow-sm">
                <span class="text-[11px] font-bold text-secondary uppercase tracking-wider mb-1 block">Total Revenue</span>
                <span class="text-[20px] font-extrabold text-on-surface">${fmt(revenue)}</span>
            </div>
            <div class="bg-surface-container-lowest p-4 rounded-[20px] border border-outline-variant shadow-sm">
                <span class="text-[11px] font-bold text-secondary uppercase tracking-wider mb-1 block">Outstanding</span>
                <span class="text-[20px] font-extrabold ${outstanding > 0 ? 'text-error' : 'text-[#008A00]'}">${fmt(outstanding)}</span>
            </div>
        </div>
        <div class="grid grid-cols-2 gap-3 mb-4">
            <div class="bg-surface-container-lowest p-3 rounded-[20px] border border-outline-variant shadow-sm flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-[#008A00]/10 flex items-center justify-center shrink-0">
                    <span class="material-symbols-outlined text-[16px] text-[#008A00]">payments</span>
                </div>
                <div>
                    <span class="text-[10px] font-bold text-secondary uppercase tracking-wider block">Total Received</span>
                    <span class="text-[14px] font-bold text-[#008A00]">${fmt(received)}</span>
                </div>
            </div>
            <div class="bg-surface-container-lowest p-3 rounded-[20px] border border-outline-variant shadow-sm flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span class="material-symbols-outlined text-[16px] text-primary">shopping_bag</span>
                </div>
                <div>
                    <span class="text-[10px] font-bold text-secondary uppercase tracking-wider block">Active Orders</span>
                    <span class="text-[14px] font-bold text-on-surface">${activeOrders}</span>
                </div>
            </div>
        </div>

        <!-- Outstanding Alert Banner -->
        ${outstanding > 0 ? `
        <div class="bg-error-container/20 border border-error/25 rounded-[20px] p-4 flex items-center justify-between mb-4">
            <div class="flex items-center gap-3">
                <span class="material-symbols-outlined text-error text-[22px]">warning</span>
                <div>
                    <p class="text-[13px] font-bold text-error">Outstanding Balance</p>
                    <p class="text-[11px] text-error/70">Customer owes ₹${outstanding.toLocaleString('en-IN')}</p>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <span class="text-[18px] font-extrabold text-error">${fmt(outstanding)}</span>
                <button onclick="window.openCollectPayment('${customer.id}')" class="px-3 py-1.5 bg-[#008A00] text-white text-[12px] font-bold rounded-xl active-scale transition-apple shadow-sm flex items-center gap-1">
                    <span class="material-symbols-outlined text-[14px]">payments</span>
                    Collect
                </button>
            </div>
        </div>` : `
        <div class="bg-[#008A00]/10 border border-[#008A00]/20 rounded-[20px] p-3 flex items-center gap-3 mb-4">
            <span class="material-symbols-outlined text-[#008A00] text-[20px]">check_circle</span>
            <p class="text-[13px] font-semibold text-[#008A00]">All payments settled with ${customer.name}</p>
        </div>`}

        <!-- Credit Utilization Bar (if creditLimit > 0) -->
        ${creditLimit > 0 ? `
        <div class="bg-surface-container-lowest rounded-[24px] border border-outline-variant shadow-sm p-4 mb-4">
            <div class="flex justify-between items-center mb-2">
                <span class="text-[12px] font-bold text-on-surface">Credit Limit</span>
                <span class="text-[12px] font-bold text-secondary">${fmt(outstanding)} / ${fmt(creditLimit)} (${utilization}%)</span>
            </div>
            <div class="w-full h-2.5 bg-surface-container rounded-full overflow-hidden">
                <div class="h-full rounded-full transition-all ${utilColor}" style="width: ${utilization}%"></div>
            </div>
        </div>` : ''}

        <!-- Contact Information -->
        <div class="bg-surface-container-lowest rounded-[24px] border border-outline-variant shadow-sm overflow-hidden mb-4">
            <div class="p-4 border-b border-outline-variant/50 flex items-center justify-between">
                <h3 class="text-[15px] font-bold text-on-surface">Contact Information</h3>
                <div class="flex gap-2">
                    ${phone ? `<a href="tel:${phone}" class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary active-scale" title="Call"><span class="material-symbols-outlined text-[16px]">call</span></a>` : ''}
                    ${whatsapp ? `<a href="https://wa.me/${whatsapp.replace(/\D/g, '')}" target="_blank" class="w-8 h-8 rounded-full bg-[#25D366]/10 flex items-center justify-center text-[#25D366] active-scale" title="WhatsApp"><span class="material-symbols-outlined text-[16px]">chat</span></a>` : ''}
                    ${customer.email ? `<a href="mailto:${customer.email}" class="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center text-secondary active-scale" title="Email"><span class="material-symbols-outlined text-[16px]">mail</span></a>` : ''}
                </div>
            </div>
            <div class="p-4 flex flex-col gap-3">
                ${customer.contactPerson ? `<div class="flex items-center gap-3"><span class="material-symbols-outlined text-secondary text-[20px]">person</span><span class="text-[14px] text-on-surface">${customer.contactPerson}</span></div>` : ''}
                ${phone ? `<div class="flex items-center gap-3"><span class="material-symbols-outlined text-secondary text-[20px]">phone_iphone</span><a href="tel:${phone}" class="text-[14px] text-primary">${phone}</a></div>` : ''}
                ${customer.whatsapp && customer.whatsapp !== phone ? `<div class="flex items-center gap-3"><span class="material-symbols-outlined text-[#25D366] text-[20px]">chat</span><a href="https://wa.me/${customer.whatsapp.replace(/\D/g, '')}" target="_blank" class="text-[14px] text-primary">${customer.whatsapp}</a></div>` : ''}
                ${customer.email ? `<div class="flex items-center gap-3"><span class="material-symbols-outlined text-secondary text-[20px]">mail</span><a href="mailto:${customer.email}" class="text-[14px] text-primary truncate">${customer.email}</a></div>` : ''}
                ${customer.city || customer.addressLine1 ? `<div class="flex items-start gap-3"><span class="material-symbols-outlined text-secondary text-[20px]">location_on</span><p class="text-[14px] text-on-surface">${[customer.addressLine1, customer.addressLine2, customer.city, customer.state, customer.pincode, customer.country].filter(Boolean).join(', ')}</p></div>` : ''}
            </div>
        </div>

        <!-- Business Details -->
        <div class="bg-surface-container-lowest rounded-[24px] border border-outline-variant shadow-sm overflow-hidden mb-4">
            <div class="p-4 border-b border-outline-variant/50">
                <h3 class="text-[15px] font-bold text-on-surface">Business Details</h3>
            </div>
            <div class="p-4 grid grid-cols-2 gap-4">
                <div>
                    <span class="text-[11px] font-bold text-secondary uppercase tracking-wider block mb-1">Customer Type</span>
                    <span class="text-[14px] text-on-surface">${customer.customerType || 'N/A'}</span>
                </div>
                <div>
                    <span class="text-[11px] font-bold text-secondary uppercase tracking-wider block mb-1">Payment Terms</span>
                    <span class="text-[14px] text-on-surface">${customer.paymentTerms || 'N/A'}</span>
                </div>
                <div>
                    <span class="text-[11px] font-bold text-secondary uppercase tracking-wider block mb-1">GST Number</span>
                    <span class="text-[14px] text-on-surface font-mono">${customer.gst || 'N/A'}</span>
                </div>
                <div>
                    <span class="text-[11px] font-bold text-secondary uppercase tracking-wider block mb-1">Credit Limit</span>
                    <span class="text-[14px] text-on-surface">${creditLimit > 0 ? fmt(creditLimit) : 'N/A'}</span>
                </div>
                <div>
                    <span class="text-[11px] font-bold text-secondary uppercase tracking-wider block mb-1">Currency</span>
                    <span class="text-[14px] text-on-surface">${customer.currency || 'INR'}</span>
                </div>
                <div>
                    <span class="text-[11px] font-bold text-secondary uppercase tracking-wider block mb-1">Total Orders</span>
                    <span class="text-[14px] text-on-surface font-bold">${customer.totalOrders || 0} (${customer.completedOrders || 0} completed)</span>
                </div>
            </div>
        </div>

        <!-- Linked Finance Transactions -->
        <div class="bg-surface-container-lowest rounded-[24px] border border-outline-variant shadow-sm overflow-hidden mb-4">
            <div class="p-4 border-b border-outline-variant/50 flex items-center justify-between">
                <h3 class="text-[15px] font-bold text-on-surface">Finance Transactions</h3>
                <button onclick="window.location.href='finance.html'" class="text-[12px] font-bold text-primary flex items-center gap-1">
                    View All <span class="material-symbols-outlined text-[14px]">arrow_forward</span>
                </button>
            </div>
            <div class="flex flex-col">
                ${(customer.recentTransactions || []).length === 0 ? `
                    <div class="p-6 text-center">
                        <span class="material-symbols-outlined text-[32px] text-secondary/40 block mb-2">receipt_long</span>
                        <p class="text-[13px] text-secondary">No transactions yet</p>
                    </div>
                ` : (customer.recentTransactions || []).map(t => {
                    const isIncome = t.type === 'Income' || !t.isNegative;
                    const isPending = t.status === 'Pending';
                    const amountColor = isPending ? 'text-[#FF9F0A]' : isIncome ? 'text-[#008A00]' : 'text-error';
                    const amountSign = isIncome ? '+' : '-';
                    return `
                    <button onclick="window.openTransactionDetails && window.openTransactionDetails('${t.id}')" class="flex items-center justify-between p-4 border-b border-outline-variant/30 last:border-0 active-bg text-left transition-colors">
                        <div class="flex items-center gap-3">
                            <div class="w-9 h-9 rounded-full ${isIncome ? 'bg-[#008A00]/10' : 'bg-error/10'} flex items-center justify-center shrink-0">
                                <span class="material-symbols-outlined text-[16px] ${isIncome ? 'text-[#008A00]' : 'text-error'}">${isIncome ? 'arrow_downward' : 'arrow_upward'}</span>
                            </div>
                            <div>
                                <p class="text-[13px] font-semibold text-on-surface leading-tight">${t.title || t.category || t.type}</p>
                                <p class="text-[11px] text-secondary">${t.date} · ${t.paymentMethod || t.category || ''}</p>
                            </div>
                        </div>
                        <div class="text-right">
                            <p class="text-[13px] font-bold ${amountColor}">${amountSign}${fmt(t.amount)}</p>
                            <span class="text-[10px] font-semibold px-1.5 py-0.5 rounded ${isPending ? 'bg-[#FF9F0A]/10 text-[#FF9F0A]' : 'bg-[#008A00]/10 text-[#008A00]'}">${t.status || 'Completed'}</span>
                        </div>
                    </button>`;
                }).join('')}
            </div>
        </div>

        <!-- Linked Orders -->
        ${(customer.recentOrders || []).length > 0 ? `
        <div class="bg-surface-container-lowest rounded-[24px] border border-outline-variant shadow-sm overflow-hidden mb-4">
            <div class="p-4 border-b border-outline-variant/50 flex items-center justify-between">
                <h3 class="text-[15px] font-bold text-on-surface">Recent Orders</h3>
                <button onclick="window.location.href='orders.html?customerId=${customer.id}'" class="text-[12px] font-bold text-primary flex items-center gap-1">
                    View All <span class="material-symbols-outlined text-[14px]">arrow_forward</span>
                </button>
            </div>
            <div class="flex flex-col">
                ${(customer.recentOrders || []).map(o => {
                    let deliveryBadge = '';
                    if (o.daysLeft !== null && o.daysLeft !== undefined) {
                        if (o.daysLeft < 0) deliveryBadge = `<span class="text-[10px] font-bold text-error">${Math.abs(o.daysLeft)}d overdue</span>`;
                        else if (o.daysLeft <= 5) deliveryBadge = `<span class="text-[10px] font-bold text-orange-500">${o.daysLeft}d left</span>`;
                        else deliveryBadge = `<span class="text-[10px] text-secondary">${o.daysLeft}d left</span>`;
                    }
                    const pmtStatus = o.paymentStatus || 'Unpaid';
                    const pmtDot = pmtStatus === 'Paid' ? 'bg-[#008A00]' : pmtStatus === 'Partial' ? 'bg-orange-400' : 'bg-error';

                    return `
                    <button onclick="window.location.href='orders.html?orderId=${o.id}'" class="flex items-center justify-between p-4 border-b border-outline-variant/30 last:border-0 active-bg text-left transition-colors">
                        <div>
                            <div class="flex items-center gap-1.5 mb-0.5">
                                <span class="text-[13px] font-bold text-on-surface">${o.id}</span>
                                <span class="w-1.5 h-1.5 rounded-full ${pmtDot} shrink-0" title="Payment: ${pmtStatus}"></span>
                                ${deliveryBadge}
                            </div>
                            <p class="text-[11px] text-secondary">${o.product || o.garmentType || 'Garment'} · ${o.qty || 0} pcs</p>
                        </div>
                        <div class="text-right">
                            <p class="text-[13px] font-bold text-on-surface mb-0.5">${fmt(o.value || o.grandTotal || 0)}</p>
                            <span class="text-[10px] font-medium px-2 py-0.5 rounded ${o.statusColor || 'bg-surface-variant text-secondary'}">${o.status}</span>
                        </div>
                    </button>`;
                }).join('')}
            </div>
        </div>` : ''}

        <!-- Notes -->
        ${customer.notes ? `
        <div class="bg-surface-container-lowest rounded-[24px] border border-outline-variant shadow-sm overflow-hidden mb-4">
            <div class="p-4 border-b border-outline-variant/50"><h3 class="text-[15px] font-bold text-on-surface">Notes</h3></div>
            <div class="p-4"><p class="text-[14px] text-on-surface whitespace-pre-wrap">${customer.notes}</p></div>
        </div>` : ''}

        <div class="h-10"></div>
    `;
}

// ─── CUSTOMER DETAIL FOOTER ──────────────────────────────────────────────────

export function getCustomerDetailsFooter(customer) {
    const isArchived = customer.status === 'Inactive' || customer.status === 'Archived';
    return `
        <button onclick="${isArchived ? `window.restoreCustomerFlow('${customer.id}')` : `window.archiveCustomerFlow('${customer.id}')`}" class="flex-1 bg-surface-container-high text-on-surface font-bold text-[15px] py-3.5 rounded-2xl active-scale transition-apple">
            ${isArchived ? 'Restore' : 'Archive'}
        </button>
        <button onclick="window.openCollectPayment('${customer.id}')" class="flex-1 bg-[#008A00] text-white font-bold text-[15px] py-3.5 rounded-2xl active-scale transition-apple shadow-sm flex items-center justify-center gap-1.5">
            <span class="material-symbols-outlined text-[18px]">payments</span>
            Collect
        </button>
        <button onclick="window.location.href='orders.html?customerId=${customer.id}'" class="flex-1 bg-primary text-on-primary font-bold text-[15px] py-3.5 rounded-2xl active-scale transition-apple shadow-sm flex items-center justify-center gap-1">
            Orders <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
        </button>
    `;
}

// ─── EDIT CUSTOMER FORM ──────────────────────────────────────────────────────

export function getEditCustomerSheetHTML(customer) {
    const typeOptions = CUSTOMER_TYPES.map(opt => ({
        ...opt,
        selected: opt.value === customer.customerType
    }));

    return `
    <div id="editCustomerForm" class="flex flex-col gap-6">
        <input type="hidden" id="edit-cust-id" value="${customer.id}">
        
        <div>
            <h4 class="text-[13px] font-bold text-secondary uppercase tracking-wider mb-4 border-b border-outline-variant pb-2">Basic Information</h4>
            <div class="flex flex-col gap-4">
                ${TextInput({ label: 'Customer Name', id: 'edit-cust-name', required: true, value: customer.name || '' })}
                ${TextInput({ label: 'Company Name', id: 'edit-cust-company', value: customer.company || '' })}
                ${TextInput({ label: 'Contact Person', id: 'edit-cust-contact', value: customer.contactPerson || '' })}
                <div class="grid grid-cols-2 gap-4">
                    ${TextInput({ label: 'Mobile Number', id: 'edit-cust-mobile', required: true, validationType: 'phone', type: 'tel', value: customer.phone || customer.mobile || '' })}
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
                ${SelectInput({ label: 'Customer Type', id: 'edit-cust-type', options: typeOptions })}
                ${TextInput({ label: 'Payment Terms', id: 'edit-cust-terms', placeholder: 'e.g. Net 30', value: customer.paymentTerms || '' })}
            </div>
            <div class="grid grid-cols-2 gap-4">
                ${TextInput({ label: 'Credit Limit (₹)', id: 'edit-cust-limit', type: 'number', placeholder: '0.00', value: customer.creditLimit || '' })}
                ${SelectInput({ label: 'Currency', id: 'edit-cust-currency', options: [
                    { label: 'INR', value: 'INR', selected: (customer.currency || 'INR') === 'INR' },
                    { label: 'USD', value: 'USD', selected: customer.currency === 'USD' },
                    { label: 'EUR', value: 'EUR', selected: customer.currency === 'EUR' }
                ] })}
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

// ─── RECORD / COLLECT PAYMENT FORM ───────────────────────────────────────────

export function getCollectPaymentSheetHTML(customerId) {
    return `
    <div class="flex flex-col gap-4">
        <input type="hidden" id="collect-customer-id" value="${customerId}">
        ${TextInput({ label: 'Amount Collected (₹)', id: 'collect-amount', required: true, type: 'number', placeholder: '0.00' })}
        ${SelectInput({ label: 'Payment Method', id: 'collect-method', options: [
            { label: 'UPI', value: 'UPI' },
            { label: 'Bank Transfer', value: 'Bank Transfer' },
            { label: 'Cash', value: 'Cash' },
            { label: 'Cheque', value: 'Cheque' },
        ]})}
        ${TextInput({ label: 'Date', id: 'collect-date', type: 'date', value: new Date().toISOString().split('T')[0] })}
        ${TextInput({ label: 'Reference No / Txn ID / UTR', id: 'collect-ref', placeholder: 'Optional' })}
        ${TextareaInput({ label: 'Notes', id: 'collect-notes', rows: 2, placeholder: 'e.g. Advance payment / Balance clearance' })}
        <div class="h-10"></div>
    </div>
    `;
}

export function getCollectPaymentFooterHTML() {
    return `
        <button type="button" onclick="window.closeSheet('collectPaymentSheet')" class="flex-1 bg-surface-container-high text-on-surface font-bold text-[16px] py-4 rounded-2xl active-scale transition-apple">
            Cancel
        </button>
        <button id="collect-payment-submit" type="button" onclick="window.saveCustomerPayment()" class="flex-[2] bg-[#008A00] text-white font-bold text-[16px] py-4 rounded-2xl active-scale transition-apple shadow-sm">
            Record Income
        </button>
    `;
}
