import { TextInput, SelectInput, TextareaInput } from '../components/inputs.js';
import { VENDOR_TYPES } from '../components/vendorForms.js';

const fmt = (n) => '₹' + parseFloat(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 });

const VENDOR_TYPE_COLORS = {
    'Fabric':      { bg: 'bg-blue-500/10',   text: 'text-blue-600',   avatar: 'bg-blue-500/15 text-blue-700' },
    'Yarn':        { bg: 'bg-sky-500/10',     text: 'text-sky-600',    avatar: 'bg-sky-500/15 text-sky-700' },
    'Stitching':   { bg: 'bg-purple-500/10',  text: 'text-purple-600', avatar: 'bg-purple-500/15 text-purple-700' },
    'Dyeing':      { bg: 'bg-teal-500/10',    text: 'text-teal-600',   avatar: 'bg-teal-500/15 text-teal-700' },
    'Printing':    { bg: 'bg-orange-500/10',  text: 'text-orange-600', avatar: 'bg-orange-500/15 text-orange-700' },
    'Embroidery':  { bg: 'bg-pink-500/10',    text: 'text-pink-600',   avatar: 'bg-pink-500/15 text-pink-700' },
    'Packaging':   { bg: 'bg-gray-500/10',    text: 'text-gray-600',   avatar: 'bg-gray-500/15 text-gray-700' },
    'Accessories': { bg: 'bg-yellow-500/10',  text: 'text-yellow-600', avatar: 'bg-yellow-500/15 text-yellow-700' },
    'Other':       { bg: 'bg-primary/10',     text: 'text-primary',    avatar: 'bg-primary/15 text-primary' },
};

function getTypeColor(type) {
    return VENDOR_TYPE_COLORS[type] || VENDOR_TYPE_COLORS['Other'];
}

// ─── BULK TOOLBAR ────────────────────────────────────────────────────────────

export function getBulkToolbarHTML(count) {
    return `
        <div class="flex items-center justify-between w-full">
            <div class="flex items-center gap-3">
                <button onclick="window.clearVendorSelection()" class="w-10 h-10 rounded-full flex items-center justify-center text-on-surface hover:bg-surface-variant transition-colors">
                    <span class="material-symbols-outlined">close</span>
                </button>
                <span class="text-[16px] font-bold text-on-surface">${count} Selected</span>
            </div>
            <div class="flex items-center gap-2">
                <button onclick="window.bulkArchiveVendors()" class="px-4 py-2 bg-surface-variant text-on-surface rounded-xl text-[13px] font-semibold active-scale transition-apple">
                    Archive
                </button>
                <button onclick="window.bulkDeleteVendors()" class="px-4 py-2 bg-error text-white rounded-xl text-[13px] font-semibold active-scale transition-apple shadow-sm">
                    Delete
                </button>
            </div>
        </div>
    `;
}

// ─── VENDOR DETAIL HEADER ────────────────────────────────────────────────────

export function getVendorDetailsHeader(vendor) {
    const tc = getTypeColor(vendor.vendorType);
    const initials = vendor.initials || (vendor.name || 'VN').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

    return `
        <div class="px-lg pb-md flex justify-between items-start border-b border-outline-variant/30">
            <div class="flex items-center gap-4">
                <div class="w-14 h-14 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-[20px] ${tc.avatar}">
                    ${initials}
                </div>
                <div>
                    <div class="flex items-center gap-2 mb-0.5">
                        <span class="text-[12px] font-semibold text-primary">${vendor.vendorCode || ''}</span>
                        <span class="px-2 py-0.5 rounded text-[10px] font-semibold ${tc.bg} ${tc.text}">${vendor.vendorType || 'Vendor'}</span>
                        <span class="px-2 py-0.5 rounded text-[10px] font-medium ${vendor.statusColor || 'bg-[#008A00]/10 text-[#008A00]'}">${vendor.status || 'Active'}</span>
                    </div>
                    <h2 class="text-[20px] font-bold text-on-surface leading-tight">${vendor.name}</h2>
                    ${vendor.company ? `<span class="text-[13px] text-secondary">${vendor.company}</span>` : ''}
                </div>
            </div>
            <div class="flex gap-2">
                <button onclick="window.duplicateVendorFlow('${vendor.id}')" class="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center text-secondary active-scale transition-apple" title="Duplicate">
                    <span class="material-symbols-outlined text-[18px]">content_copy</span>
                </button>
                <button onclick="window.deleteVendorFlow('${vendor.id}')" class="w-8 h-8 rounded-full bg-error-container/30 flex items-center justify-center text-error active-scale transition-apple" title="Delete">
                    <span class="material-symbols-outlined text-[18px]">delete</span>
                </button>
                <button onclick="window.openEditVendor('${vendor.id}')" class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary active-scale transition-apple" title="Edit">
                    <span class="material-symbols-outlined text-[18px]">edit</span>
                </button>
                <button onclick="window.closeSheet('vendorDetailsSheet')" class="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center text-secondary active-scale transition-apple">
                    <span class="material-symbols-outlined text-[20px]">close</span>
                </button>
            </div>
        </div>
    `;
}

// ─── VENDOR DETAIL CONTENT ───────────────────────────────────────────────────

export function getVendorDetailsContent(vendor) {
    const outstanding = parseFloat(vendor.outstandingPayable || 0);
    const purchases   = parseFloat(vendor.totalPurchases || 0);
    const paid        = parseFloat(vendor.totalPaid || 0);

    return `
        <!-- Financial Summary Grid -->
        <div class="grid grid-cols-2 gap-3 mb-4">
            <div class="bg-surface-container-lowest p-4 rounded-[20px] border border-outline-variant shadow-sm">
                <span class="text-[11px] font-bold text-secondary uppercase tracking-wider mb-1 block">Total Purchased</span>
                <span class="text-[20px] font-extrabold text-on-surface">${fmt(purchases)}</span>
            </div>
            <div class="bg-surface-container-lowest p-4 rounded-[20px] border border-outline-variant shadow-sm">
                <span class="text-[11px] font-bold text-secondary uppercase tracking-wider mb-1 block">You Owe</span>
                <span class="text-[20px] font-extrabold ${outstanding > 0 ? 'text-error' : 'text-[#008A00]'}">${fmt(outstanding)}</span>
            </div>
        </div>
        <div class="grid grid-cols-2 gap-3 mb-4">
            <div class="bg-surface-container-lowest p-3 rounded-[20px] border border-outline-variant shadow-sm flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-[#008A00]/10 flex items-center justify-center shrink-0">
                    <span class="material-symbols-outlined text-[16px] text-[#008A00]">payments</span>
                </div>
                <div>
                    <span class="text-[10px] font-bold text-secondary uppercase tracking-wider block">Total Paid</span>
                    <span class="text-[14px] font-bold text-[#008A00]">${fmt(paid)}</span>
                </div>
            </div>
            <div class="bg-surface-container-lowest p-3 rounded-[20px] border border-outline-variant shadow-sm flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span class="material-symbols-outlined text-[16px] text-primary">receipt_long</span>
                </div>
                <div>
                    <span class="text-[10px] font-bold text-secondary uppercase tracking-wider block">Transactions</span>
                    <span class="text-[14px] font-bold text-on-surface">${vendor.transactionCount || 0}</span>
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
                    <p class="text-[11px] text-error/70">Pending payment to ${vendor.name}</p>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <span class="text-[18px] font-extrabold text-error">${fmt(outstanding)}</span>
                <button onclick="window.openRecordPayment('${vendor.id}')" class="px-3 py-1.5 bg-error text-white text-[12px] font-bold rounded-xl active-scale transition-apple shadow-sm">
                    Pay Now
                </button>
            </div>
        </div>` : `
        <div class="bg-[#008A00]/10 border border-[#008A00]/20 rounded-[20px] p-3 flex items-center gap-3 mb-4">
            <span class="material-symbols-outlined text-[#008A00] text-[20px]">check_circle</span>
            <p class="text-[13px] font-semibold text-[#008A00]">All settled up with ${vendor.name}</p>
        </div>`}

        <!-- Contact Information -->
        <div class="bg-surface-container-lowest rounded-[24px] border border-outline-variant shadow-sm overflow-hidden mb-4">
            <div class="p-4 border-b border-outline-variant/50 flex items-center justify-between">
                <h3 class="text-[15px] font-bold text-on-surface">Contact Information</h3>
                <div class="flex gap-2">
                    ${vendor.phone ? `<a href="tel:${vendor.phone}" class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary active-scale"><span class="material-symbols-outlined text-[16px]">call</span></a>` : ''}
                    ${vendor.whatsapp || vendor.phone ? `<a href="https://wa.me/${(vendor.whatsapp || vendor.phone).replace(/\D/g,'')}" target="_blank" class="w-8 h-8 rounded-full bg-[#25D366]/10 flex items-center justify-center text-[#25D366] active-scale"><span class="material-symbols-outlined text-[16px]">chat</span></a>` : ''}
                    ${vendor.email ? `<a href="mailto:${vendor.email}" class="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center text-secondary active-scale"><span class="material-symbols-outlined text-[16px]">mail</span></a>` : ''}
                </div>
            </div>
            <div class="p-4 flex flex-col gap-3">
                ${vendor.contactPerson ? `<div class="flex items-center gap-3"><span class="material-symbols-outlined text-secondary text-[20px]">person</span><span class="text-[14px] text-on-surface">${vendor.contactPerson}</span></div>` : ''}
                ${vendor.phone ? `<div class="flex items-center gap-3"><span class="material-symbols-outlined text-secondary text-[20px]">phone_iphone</span><a href="tel:${vendor.phone}" class="text-[14px] text-primary">${vendor.phone}</a></div>` : ''}
                ${vendor.email ? `<div class="flex items-center gap-3"><span class="material-symbols-outlined text-secondary text-[20px]">mail</span><a href="mailto:${vendor.email}" class="text-[14px] text-primary truncate">${vendor.email}</a></div>` : ''}
                ${vendor.city ? `<div class="flex items-start gap-3"><span class="material-symbols-outlined text-secondary text-[20px]">location_on</span><p class="text-[14px] text-on-surface">${[vendor.addressLine1, vendor.city, vendor.state, vendor.pincode].filter(Boolean).join(', ')}</p></div>` : ''}
            </div>
        </div>

        <!-- Business / Payment Info -->
        <div class="bg-surface-container-lowest rounded-[24px] border border-outline-variant shadow-sm overflow-hidden mb-4">
            <div class="p-4 border-b border-outline-variant/50">
                <h3 class="text-[15px] font-bold text-on-surface">Business & Payment Details</h3>
            </div>
            <div class="p-4 grid grid-cols-2 gap-4">
                <div>
                    <span class="text-[11px] font-bold text-secondary uppercase tracking-wider block mb-1">Vendor Type</span>
                    <span class="text-[14px] text-on-surface">${vendor.vendorType || 'N/A'}</span>
                </div>
                <div>
                    <span class="text-[11px] font-bold text-secondary uppercase tracking-wider block mb-1">Payment Terms</span>
                    <span class="text-[14px] text-on-surface">${vendor.paymentTerms || 'N/A'}</span>
                </div>
                <div>
                    <span class="text-[11px] font-bold text-secondary uppercase tracking-wider block mb-1">GST Number</span>
                    <span class="text-[14px] text-on-surface font-mono">${vendor.gst || 'N/A'}</span>
                </div>
                <div>
                    <span class="text-[11px] font-bold text-secondary uppercase tracking-wider block mb-1">Credit Limit</span>
                    <span class="text-[14px] text-on-surface">${vendor.creditLimit ? fmt(vendor.creditLimit) : 'N/A'}</span>
                </div>
                ${vendor.upiId ? `<div class="col-span-2"><span class="text-[11px] font-bold text-secondary uppercase tracking-wider block mb-1">UPI ID</span><span class="text-[14px] text-on-surface font-mono">${vendor.upiId}</span></div>` : ''}
                ${vendor.bankName ? `<div><span class="text-[11px] font-bold text-secondary uppercase tracking-wider block mb-1">Bank</span><span class="text-[14px] text-on-surface">${vendor.bankName}</span></div>` : ''}
                ${vendor.accountNumber ? `<div><span class="text-[11px] font-bold text-secondary uppercase tracking-wider block mb-1">Account No</span><span class="text-[14px] text-on-surface font-mono">${vendor.accountNumber}</span></div>` : ''}
                ${vendor.ifsc ? `<div><span class="text-[11px] font-bold text-secondary uppercase tracking-wider block mb-1">IFSC</span><span class="text-[14px] text-on-surface font-mono">${vendor.ifsc}</span></div>` : ''}
            </div>
        </div>

        <!-- Linked Transactions -->
        <div class="bg-surface-container-lowest rounded-[24px] border border-outline-variant shadow-sm overflow-hidden mb-4">
            <div class="p-4 border-b border-outline-variant/50 flex items-center justify-between">
                <h3 class="text-[15px] font-bold text-on-surface">Finance Transactions</h3>
                <button onclick="window.location.href='finance.html'" class="text-[12px] font-bold text-primary flex items-center gap-1">
                    View All <span class="material-symbols-outlined text-[14px]">arrow_forward</span>
                </button>
            </div>
            <div class="flex flex-col">
                ${(vendor.recentTransactions || []).length === 0 ? `
                    <div class="p-6 text-center">
                        <span class="material-symbols-outlined text-[32px] text-secondary/40 block mb-2">receipt_long</span>
                        <p class="text-[13px] text-secondary">No transactions yet</p>
                    </div>
                ` : (vendor.recentTransactions || []).map(t => {
                    const isExpense = t.type === 'Expense' || t.isNegative;
                    const isPending = t.status === 'Pending';
                    const amountColor = isPending ? 'text-[#FF9F0A]' : isExpense ? 'text-error' : 'text-[#008A00]';
                    const amountSign = isExpense ? '-' : '+';
                    return `
                    <button onclick="window.openTransactionDetails && window.openTransactionDetails('${t.id}')" class="flex items-center justify-between p-4 border-b border-outline-variant/30 last:border-0 active-bg text-left transition-colors">
                        <div class="flex items-center gap-3">
                            <div class="w-9 h-9 rounded-full ${isExpense ? 'bg-error/10' : 'bg-[#008A00]/10'} flex items-center justify-center shrink-0">
                                <span class="material-symbols-outlined text-[16px] ${isExpense ? 'text-error' : 'text-[#008A00]'}">${isExpense ? 'arrow_upward' : 'arrow_downward'}</span>
                            </div>
                            <div>
                                <p class="text-[13px] font-semibold text-on-surface leading-tight">${t.title || t.category || t.type}</p>
                                <p class="text-[11px] text-secondary">${t.date} · ${t.category || ''}</p>
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
        ${(vendor.relatedOrders || []).length > 0 ? `
        <div class="bg-surface-container-lowest rounded-[24px] border border-outline-variant shadow-sm overflow-hidden mb-4">
            <div class="p-4 border-b border-outline-variant/50 flex items-center justify-between">
                <h3 class="text-[15px] font-bold text-on-surface">Related Orders</h3>
                <button onclick="window.location.href='orders.html'" class="text-[12px] font-bold text-primary flex items-center gap-1">
                    View All <span class="material-symbols-outlined text-[14px]">arrow_forward</span>
                </button>
            </div>
            <div class="flex flex-col">
                ${(vendor.relatedOrders || []).map(o => `
                    <button onclick="window.location.href='orders.html?orderId=${o.id}'" class="flex items-center justify-between p-4 border-b border-outline-variant/30 last:border-0 active-bg text-left transition-colors">
                        <div>
                            <p class="text-[13px] font-bold text-on-surface">${o.id}</p>
                            <p class="text-[11px] text-secondary">${o.product || o.garmentType || ''} · ${o.qty || 0} pcs</p>
                        </div>
                        <div class="text-right">
                            <p class="text-[13px] font-bold text-on-surface">${fmt(o.value || o.grandTotal || 0)}</p>
                            <span class="text-[10px] font-medium px-1.5 py-0.5 rounded ${o.statusColor || 'bg-surface-variant text-secondary'}">${o.status}</span>
                        </div>
                    </button>
                `).join('')}
            </div>
        </div>` : ''}

        <!-- Notes -->
        ${vendor.notes ? `
        <div class="bg-surface-container-lowest rounded-[24px] border border-outline-variant shadow-sm overflow-hidden mb-4">
            <div class="p-4 border-b border-outline-variant/50"><h3 class="text-[15px] font-bold text-on-surface">Notes</h3></div>
            <div class="p-4"><p class="text-[14px] text-on-surface whitespace-pre-wrap">${vendor.notes}</p></div>
        </div>` : ''}

        <div class="h-10"></div>
    `;
}

// ─── VENDOR DETAIL FOOTER ────────────────────────────────────────────────────

export function getVendorDetailsFooter(vendor) {
    const isArchived = vendor.status === 'Inactive' || vendor.status === 'Archived';
    return `
        <button onclick="${isArchived ? `window.restoreVendorFlow('${vendor.id}')` : `window.archiveVendorFlow('${vendor.id}')`}" class="flex-1 bg-surface-container-high text-on-surface font-bold text-[15px] py-3.5 rounded-2xl active-scale transition-apple">
            ${isArchived ? 'Restore' : 'Archive'}
        </button>
        <button onclick="window.openRecordPayment('${vendor.id}')" class="flex-[2] bg-primary text-on-primary font-bold text-[15px] py-3.5 rounded-2xl active-scale transition-apple shadow-sm flex items-center justify-center gap-2">
            <span class="material-symbols-outlined text-[18px]">payments</span>
            Record Payment
        </button>
    `;
}

// ─── EDIT VENDOR FORM ────────────────────────────────────────────────────────

export function getEditVendorSheetHTML(vendor) {
    const typeOptions = VENDOR_TYPES.map(opt => ({ ...opt, selected: opt.value === vendor.vendorType }));
    return `
    <div id="editVendorForm" class="flex flex-col gap-6">
        <input type="hidden" id="edit-vend-id" value="${vendor.id}">

        <div>
            <h4 class="text-[13px] font-bold text-secondary uppercase tracking-wider mb-4 border-b border-outline-variant pb-2">Basic Information</h4>
            <div class="flex flex-col gap-4">
                ${TextInput({ label: 'Vendor Name', id: 'edit-vend-name', required: true, value: vendor.name || '' })}
                ${TextInput({ label: 'Company / Shop Name', id: 'edit-vend-company', value: vendor.company || '' })}
                ${TextInput({ label: 'Contact Person', id: 'edit-vend-contact', value: vendor.contactPerson || '' })}
                <div class="grid grid-cols-2 gap-4">
                    ${TextInput({ label: 'Mobile Number', id: 'edit-vend-phone', required: true, validationType: 'phone', type: 'tel', value: vendor.phone || '' })}
                    ${TextInput({ label: 'WhatsApp', id: 'edit-vend-whatsapp', validationType: 'phone', type: 'tel', value: vendor.whatsapp || '' })}
                </div>
                <div class="grid grid-cols-2 gap-4">
                    ${TextInput({ label: 'Email', id: 'edit-vend-email', type: 'email', validationType: 'email', value: vendor.email || '' })}
                    ${TextInput({ label: 'GST Number', id: 'edit-vend-gst', validationType: 'gst', value: vendor.gst || '' })}
                </div>
            </div>
        </div>

        <div>
            <h4 class="text-[13px] font-bold text-secondary uppercase tracking-wider mb-4 border-b border-outline-variant pb-2">Vendor Details</h4>
            <div class="grid grid-cols-2 gap-4 mb-4">
                ${SelectInput({ label: 'Vendor Type', id: 'edit-vend-type', options: typeOptions })}
                ${TextInput({ label: 'Payment Terms', id: 'edit-vend-terms', value: vendor.paymentTerms || '' })}
            </div>
            <div class="grid grid-cols-2 gap-4">
                ${TextInput({ label: 'Credit Limit (₹)', id: 'edit-vend-limit', type: 'number', value: vendor.creditLimit || '' })}
                ${TextInput({ label: 'UPI ID', id: 'edit-vend-upi', value: vendor.upiId || '' })}
            </div>
        </div>

        <div>
            <h4 class="text-[13px] font-bold text-secondary uppercase tracking-wider mb-4 border-b border-outline-variant pb-2">Bank Details</h4>
            <div class="flex flex-col gap-4">
                <div class="grid grid-cols-2 gap-4">
                    ${TextInput({ label: 'Bank Name', id: 'edit-vend-bank', value: vendor.bankName || '' })}
                    ${TextInput({ label: 'Account Number', id: 'edit-vend-account', value: vendor.accountNumber || '' })}
                </div>
                ${TextInput({ label: 'IFSC Code', id: 'edit-vend-ifsc', value: vendor.ifsc || '' })}
            </div>
        </div>

        <div>
            <h4 class="text-[13px] font-bold text-secondary uppercase tracking-wider mb-4 border-b border-outline-variant pb-2">Address</h4>
            <div class="flex flex-col gap-4">
                ${TextInput({ label: 'Address Line 1', id: 'edit-vend-addr1', value: vendor.addressLine1 || '' })}
                <div class="grid grid-cols-2 gap-4">
                    ${TextInput({ label: 'City', id: 'edit-vend-city', value: vendor.city || '' })}
                    ${TextInput({ label: 'State', id: 'edit-vend-state', value: vendor.state || '' })}
                </div>
                <div class="grid grid-cols-2 gap-4">
                    ${TextInput({ label: 'Country', id: 'edit-vend-country', value: vendor.country || 'India' })}
                    ${TextInput({ label: 'Pincode', id: 'edit-vend-pincode', value: vendor.pincode || '' })}
                </div>
            </div>
        </div>

        <div>
            <h4 class="text-[13px] font-bold text-secondary uppercase tracking-wider mb-4 border-b border-outline-variant pb-2">Additional</h4>
            ${TextareaInput({ label: 'Notes', id: 'edit-vend-notes', rows: 3, value: vendor.notes || '' })}
            <div class="flex items-center justify-between mt-4 p-4 rounded-xl border border-outline-variant bg-surface-container-lowest">
                <div>
                    <p class="text-[15px] font-semibold text-on-surface">Active Status</p>
                    <p class="text-[12px] text-secondary">Vendor is available for transactions</p>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" id="edit-vend-active" class="sr-only peer" ${vendor.status === 'Active' ? 'checked' : ''}>
                    <div class="w-11 h-6 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
            </div>
        </div>

        <div class="h-10"></div>
    </div>
    `;
}

export function getEditVendorFooterHTML() {
    return `
        <button type="button" onclick="window.closeSheet('editVendorSheet')" class="flex-1 bg-surface-container-high text-on-surface font-bold text-[16px] py-4 rounded-2xl active-scale transition-apple">
            Cancel
        </button>
        <button id="edit-vendor-submit" type="button" onclick="window.saveEditedVendor()" class="flex-[2] bg-primary text-white font-bold text-[16px] py-4 rounded-2xl active-scale transition-apple shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
            Update Vendor
        </button>
    `;
}

// ─── RECORD PAYMENT FORM ─────────────────────────────────────────────────────

export function getRecordPaymentSheetHTML(vendorId) {
    return `
    <div class="flex flex-col gap-4">
        <input type="hidden" id="pay-vendor-id" value="${vendorId}">
        ${TextInput({ label: 'Amount (₹)', id: 'pay-amount', required: true, type: 'number', placeholder: '0.00' })}
        ${SelectInput({ label: 'Payment Method', id: 'pay-method', options: [
            { label: 'UPI', value: 'UPI' },
            { label: 'Bank Transfer', value: 'Bank Transfer' },
            { label: 'Cash', value: 'Cash' },
            { label: 'Cheque', value: 'Cheque' },
        ]})}
        ${TextInput({ label: 'Date', id: 'pay-date', type: 'date', value: new Date().toISOString().split('T')[0] })}
        ${TextInput({ label: 'Reference No / Txn ID', id: 'pay-ref', placeholder: 'Optional' })}
        ${TextareaInput({ label: 'Notes', id: 'pay-notes', rows: 2, placeholder: 'What was this payment for?' })}
        <div class="h-10"></div>
    </div>
    `;
}

export function getRecordPaymentFooterHTML() {
    return `
        <button type="button" onclick="window.closeSheet('recordPaymentSheet')" class="flex-1 bg-surface-container-high text-on-surface font-bold text-[16px] py-4 rounded-2xl active-scale transition-apple">
            Cancel
        </button>
        <button id="record-payment-submit" type="button" onclick="window.saveVendorPayment()" class="flex-[2] bg-primary text-white font-bold text-[16px] py-4 rounded-2xl active-scale transition-apple shadow-sm">
            Record Payment
        </button>
    `;
}
