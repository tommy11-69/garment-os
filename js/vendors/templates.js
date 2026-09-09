import { makeTimestamp } from '../services/api.js';

export const templates = {
    vendorCard: (v) => `
        <div class="bg-surface-container-lowest rounded-[24px] p-4 border border-outline-variant shadow-sm active-scale relative group" onclick="window.openVendorDetails('${v.id}')">
            <div class="flex justify-between items-start mb-3">
                <div class="flex gap-3 items-center">
                    <div class="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[18px]">
                        ${v.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                        <h3 class="text-[17px] font-bold text-on-surface leading-tight">${v.name}</h3>
                        <div class="flex items-center gap-1.5 mt-0.5">
                            <span class="text-[12px] text-secondary font-medium">${v.id}</span>
                            <span class="w-1 h-1 rounded-full bg-outline-variant"></span>
                            <span class="text-[12px] font-semibold ${v.statusColor}">${v.status}</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="grid grid-cols-2 gap-y-3 gap-x-2 pt-3 border-t border-outline-variant/30">
                <div>
                    <p class="text-[11px] font-medium text-secondary uppercase tracking-wider mb-0.5">Type</p>
                    <p class="text-[13px] font-semibold text-on-surface">${v.vendorType || '-'}</p>
                </div>
                <div>
                    <p class="text-[11px] font-medium text-secondary uppercase tracking-wider mb-0.5">Contact</p>
                    <p class="text-[13px] font-semibold text-on-surface">${v.contactPerson || '-'}</p>
                </div>
                <div>
                    <p class="text-[11px] font-medium text-secondary uppercase tracking-wider mb-0.5">Outstanding</p>
                    <p class="text-[13px] font-bold ${v.outstandingPayable > 0 ? 'text-[#FF9F0A]' : 'text-[#008A00]'}">
                        ₹${(v.outstandingPayable || 0).toLocaleString()}
                    </p>
                </div>
                <div>
                    <p class="text-[11px] font-medium text-secondary uppercase tracking-wider mb-0.5">City</p>
                    <p class="text-[13px] font-semibold text-on-surface">${v.city || '-'}</p>
                </div>
            </div>
        </div>
    `,

    vendorDetails: (v) => `
        <div class="p-lg pt-0">
            <!-- Header section -->
            <div class="flex justify-between items-start mb-6 border-b border-outline-variant/30 pb-4">
                <div class="flex gap-4 items-center">
                    <div class="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[24px]">
                        ${v.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                        <h2 class="text-[22px] font-bold text-on-surface leading-tight">${v.name}</h2>
                        <div class="flex items-center gap-2 mt-1">
                            <span class="text-[13px] text-secondary font-medium">${v.id}</span>
                            <span class="px-2 py-0.5 rounded text-[11px] font-bold ${v.statusColor}">${v.status}</span>
                        </div>
                    </div>
                </div>
                <div class="flex gap-2">
                    <button onclick="window.closeVendorDetails()" class="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center text-secondary active-scale transition-apple">
                        <span class="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </div>
            </div>

            <!-- KPI Cards -->
            <div class="grid grid-cols-2 gap-3 mb-6">
                <div class="bg-surface-container-lowest p-4 rounded-[20px] border border-outline-variant shadow-sm">
                    <span class="text-[12px] font-semibold text-secondary uppercase tracking-wider mb-1 block">Total Purchases</span>
                    <span class="text-[18px] font-bold text-on-surface">₹${(v.totalPurchases || 0).toLocaleString()}</span>
                </div>
                <div class="bg-surface-container-lowest p-4 rounded-[20px] border border-outline-variant shadow-sm">
                    <span class="text-[12px] font-semibold text-secondary uppercase tracking-wider mb-1 block">Outstanding</span>
                    <span class="text-[18px] font-bold ${v.outstandingPayable > 0 ? 'text-[#FF9F0A]' : 'text-on-surface'}">₹${(v.outstandingPayable || 0).toLocaleString()}</span>
                </div>
            </div>
            
            <div class="bg-surface-container-lowest p-4 rounded-[20px] border border-outline-variant shadow-sm mb-6 flex items-center justify-between">
                <div>
                    <span class="text-[12px] font-semibold text-secondary uppercase tracking-wider mb-1 block">Total Paid</span>
                    <span class="text-[16px] font-bold text-[#008A00]">₹${(v.totalPaid || 0).toLocaleString()}</span>
                </div>
                <div class="text-right">
                    <span class="text-[12px] font-semibold text-secondary uppercase tracking-wider mb-1 block">Transactions</span>
                    <span class="text-[16px] font-bold text-on-surface">${v.transactionCount || 0}</span>
                </div>
            </div>

            <!-- Actions -->
            <div class="flex gap-2 overflow-x-auto no-scrollbar mb-6 pb-2">
                <button onclick="window.editVendor('${v.id}')" class="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-primary/10 text-primary font-semibold rounded-xl active-scale">
                    <span class="material-symbols-outlined text-[18px]">edit</span> Edit
                </button>
                <button onclick="window.addVendorPayment('${v.id}')" class="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-[#008A00]/10 text-[#008A00] font-semibold rounded-xl active-scale border border-[#008A00]/20">
                    <span class="material-symbols-outlined text-[18px]">payments</span> Add Payment
                </button>
                ${v.phone ? `
                <a href="tel:${v.phone}" class="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-surface-container-highest text-on-surface font-semibold rounded-xl active-scale">
                    <span class="material-symbols-outlined text-[18px]">call</span> Call
                </a>
                <a href="https://wa.me/${v.phone.replace(/\\D/g, '')}" target="_blank" class="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-[#25D366]/10 text-[#25D366] font-semibold rounded-xl active-scale">
                    <span class="material-symbols-outlined text-[18px]">chat</span> WhatsApp
                </a>` : ''}
                <button onclick="window.deleteVendor('${v.id}')" class="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-error/10 text-error font-semibold rounded-xl active-scale ml-auto">
                    <span class="material-symbols-outlined text-[18px]">delete</span>
                </button>
            </div>

            <!-- Details Grid -->
            <div class="bg-surface-container-lowest rounded-[24px] border border-outline-variant shadow-sm p-4 mb-6">
                <h3 class="text-[14px] font-bold text-on-surface mb-3 uppercase tracking-wider">Contact Details</h3>
                <div class="grid grid-cols-2 gap-y-3 text-[13px]">
                    <div><span class="text-secondary block">Contact Person</span><span class="font-semibold text-on-surface">${v.contactPerson || '-'}</span></div>
                    <div><span class="text-secondary block">Phone</span><span class="font-semibold text-on-surface">${v.phone || '-'}</span></div>
                    <div class="col-span-2"><span class="text-secondary block">Email</span><span class="font-semibold text-on-surface">${v.email || '-'}</span></div>
                    <div class="col-span-2"><span class="text-secondary block">Address</span><span class="font-semibold text-on-surface">${v.address || '-'}, ${v.city || '-'} ${v.pincode ? '- '+v.pincode : ''}</span></div>
                    <div><span class="text-secondary block">GSTIN</span><span class="font-semibold text-on-surface">${v.gstin || '-'}</span></div>
                </div>
            </div>

            <div class="bg-surface-container-lowest rounded-[24px] border border-outline-variant shadow-sm p-4 mb-6">
                <h3 class="text-[14px] font-bold text-on-surface mb-3 uppercase tracking-wider">Payment Details</h3>
                <div class="grid grid-cols-2 gap-y-3 text-[13px]">
                    <div><span class="text-secondary block">Terms</span><span class="font-semibold text-on-surface">${v.paymentTerms || '-'}</span></div>
                    <div><span class="text-secondary block">Bank</span><span class="font-semibold text-on-surface">${v.bankName || '-'}</span></div>
                    <div class="col-span-2"><span class="text-secondary block">Account No</span><span class="font-semibold text-on-surface">${v.accountNumber || '-'}</span></div>
                    <div><span class="text-secondary block">IFSC</span><span class="font-semibold text-on-surface">${v.ifsc || '-'}</span></div>
                    <div><span class="text-secondary block">UPI</span><span class="font-semibold text-on-surface">${v.upiId || '-'}</span></div>
                </div>
            </div>

            <!-- Transactions -->
            <div class="mb-6">
                <h3 class="text-[16px] font-bold text-on-surface mb-4">Recent Transactions</h3>
                <div class="flex flex-col gap-3">
                    ${(v.recentTransactions || []).map(t => templates.transactionCard(t)).join('')}
                    ${!(v.recentTransactions || []).length ? '<p class="text-secondary text-sm italic">No transactions found.</p>' : ''}
                </div>
            </div>
            
            <div class="h-10"></div>
        </div>
    `,

    transactionCard: (t) => `
        <div class="bg-surface-container-lowest p-3 rounded-2xl border border-outline-variant flex items-center gap-3">
            <div class="w-10 h-10 rounded-full ${t.isNegative ? 'bg-[#FF9F0A]/10 text-[#FF9F0A]' : 'bg-[#008A00]/10 text-[#008A00]'} flex items-center justify-center shrink-0">
                <span class="material-symbols-outlined text-[20px]">${t.type === 'Payment' ? 'payments' : 'receipt_long'}</span>
            </div>
            <div class="flex-1 min-w-0">
                <h4 class="text-[14px] font-semibold text-on-surface truncate">${t.type}</h4>
                <p class="text-[12px] text-secondary truncate">${t.date}</p>
            </div>
            <div class="text-right shrink-0">
                <span class="block text-[14px] font-bold ${t.isNegative ? 'text-[#FF9F0A]' : 'text-[#008A00]'}">
                    ${t.isNegative ? '-' : '+'}₹${(t.amount || 0).toLocaleString()}
                </span>
                <span class="text-[11px] text-secondary font-medium">${t.paymentMethod || '-'}</span>
            </div>
        </div>
    `
};
