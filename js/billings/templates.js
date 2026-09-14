// js/billings/templates.js — HTML template generators for the BILLINGS module

// Document type metadata
export const BILLING_TYPES = {
    Quotation:      { label: 'Quotations',       icon: 'request_quote',   color: 'text-[#6C63FF]', bg: 'bg-[#6C63FF]/10', contactType: 'customer', statuses: ['Draft','Sent','Converted','Expired','Void'] },
    Sales_Bill:     { label: 'Sales Bills',       icon: 'receipt_long',    color: 'text-[#00B386]', bg: 'bg-[#00B386]/10', contactType: 'customer', statuses: ['Draft','Finalized','Paid','Partially_Paid','Void'] },
    Payment_In:     { label: 'Payments In',       icon: 'payments',        color: 'text-[#0071E3]', bg: 'bg-[#0071E3]/10', contactType: 'customer', statuses: ['Draft','Finalized','Void'] },
    Purchase_Bill:  { label: 'Purchase Bills',    icon: 'local_shipping',  color: 'text-[#FF9F0A]', bg: 'bg-[#FF9F0A]/10', contactType: 'vendor',   statuses: ['Draft','Finalized','Paid','Partially_Paid','Void'] },
    Purchase_Order: { label: 'Purchase Orders',   icon: 'inventory_2',     color: 'text-[#FF6B00]', bg: 'bg-[#FF6B00]/10', contactType: 'vendor',   statuses: ['Draft','Sent','Received','Void'] },
    Payment_Out:    { label: 'Payments Out',      icon: 'outgoing_mail',   color: 'text-[#FF3B30]', bg: 'bg-[#FF3B30]/10', contactType: 'vendor',   statuses: ['Draft','Finalized','Void'] },
};

const STATUS_BADGE = {
    Draft:          'bg-surface-variant text-secondary',
    Sent:           'bg-[#0071E3]/10 text-[#0071E3]',
    Converted:      'bg-[#6C63FF]/10 text-[#6C63FF]',
    Expired:        'bg-error/10 text-error',
    Finalized:      'bg-[#00B386]/10 text-[#00B386]',
    Paid:           'bg-[#008A00]/10 text-[#008A00]',
    Partially_Paid: 'bg-[#FF9F0A]/10 text-[#FF9F0A]',
    Void:           'bg-error/10 text-error',
    Received:       'bg-[#00B386]/10 text-[#00B386]',
};

export function fmtCurrency(amount) {
    return '₹' + Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fmtDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Stats Bar ──────────────────────────────────────────────────────────

export function getStatsBarHTML(stats) {
    if (!stats) return '';
    const receivable = fmtCurrency(stats.totalReceivable);
    const payable = fmtCurrency(stats.totalPayable);
    return `
    <div class="flex gap-3 px-xs overflow-x-auto pb-1 hide-scrollbar">
        <div class="flex-shrink-0 bg-[#00B386]/10 border border-[#00B386]/20 rounded-2xl px-4 py-3 min-w-[160px]">
            <div class="text-[11px] font-semibold text-[#00B386] uppercase tracking-wide">Total Receivable</div>
            <div class="text-[18px] font-bold text-on-surface mt-0.5">${receivable}</div>
        </div>
        <div class="flex-shrink-0 bg-[#FF3B30]/10 border border-[#FF3B30]/20 rounded-2xl px-4 py-3 min-w-[160px]">
            <div class="text-[11px] font-semibold text-[#FF3B30] uppercase tracking-wide">Total Payable</div>
            <div class="text-[18px] font-bold text-on-surface mt-0.5">${payable}</div>
        </div>
        ${Object.entries(stats.byType || {}).map(([type, s]) => {
            const meta = BILLING_TYPES[type];
            if (!meta || s.count === 0) return '';
            return `
            <div class="flex-shrink-0 ${meta.bg} border border-outline-variant/30 rounded-2xl px-4 py-3 min-w-[140px]">
                <div class="text-[11px] font-semibold ${meta.color} uppercase tracking-wide">${meta.label}</div>
                <div class="text-[18px] font-bold text-on-surface mt-0.5">${s.count}</div>
                <div class="text-[11px] text-secondary">${fmtCurrency(s.total)}</div>
            </div>`;
        }).join('')}
    </div>`;
}

// ── Billing Card ───────────────────────────────────────────────────────

export function getBillingCardHTML(doc) {
    const meta = BILLING_TYPES[doc.transaction_type] || BILLING_TYPES.Quotation;
    const badgeClass = STATUS_BADGE[doc.status] || 'bg-surface-variant text-secondary';
    const displayStatus = (doc.status || 'Draft').replace('_', ' ');
    const balance = doc.grand_total - (doc.amount_paid || 0);
    const isPayment = doc.transaction_type === 'Payment_In' || doc.transaction_type === 'Payment_Out';

    return `
    <div onclick="window.openBillingDetails('${doc.id}')"
         class="bg-surface-container-lowest border border-outline-variant/50 rounded-2xl p-4 active-scale transition-apple cursor-pointer">
        <div class="flex items-start justify-between gap-3">
            <div class="flex items-start gap-3 flex-1 min-w-0">
                <div class="w-10 h-10 rounded-xl ${meta.bg} flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span class="material-symbols-outlined text-[20px] ${meta.color}">${meta.icon}</span>
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                        <span class="text-[13px] font-bold text-on-surface font-mono tracking-tight">${doc.invoice_number}</span>
                        <span class="text-[11px] font-semibold px-2 py-0.5 rounded-full ${badgeClass}">${displayStatus}</span>
                    </div>
                    <div class="text-[14px] font-semibold text-on-surface mt-0.5 truncate">${doc.contact_name || '—'}</div>
                    <div class="text-[12px] text-secondary mt-0.5">${fmtDate(doc.date)}</div>
                </div>
            </div>
            <div class="text-right flex-shrink-0">
                <div class="text-[16px] font-bold text-on-surface">${fmtCurrency(doc.grand_total)}</div>
                ${!isPayment && balance > 0.01 && doc.status !== 'Void' ? `
                <div class="text-[11px] text-[#FF3B30] font-semibold">Due ${fmtCurrency(balance)}</div>
                ` : ''}
                ${doc.amount_paid > 0 ? `<div class="text-[11px] text-[#00B386]">Paid ${fmtCurrency(doc.amount_paid)}</div>` : ''}
            </div>
        </div>
    </div>`;
}

// ── Empty State ────────────────────────────────────────────────────────

export function getEmptyStateHTML(type) {
    const meta = BILLING_TYPES[type] || BILLING_TYPES.Quotation;
    return `
    <div class="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div class="w-20 h-20 rounded-3xl ${meta.bg} flex items-center justify-center mb-4">
            <span class="material-symbols-outlined text-[40px] ${meta.color}">${meta.icon}</span>
        </div>
        <h3 class="text-[18px] font-bold text-on-surface mb-1">No ${meta.label} Yet</h3>
        <p class="text-[14px] text-secondary max-w-[260px]">Tap the + button to create your first ${meta.label.slice(0,-1).toLowerCase()}.</p>
    </div>`;
}

// ── Helper: Calculate next serial number ──────────────────────────────
export function getNextSerialNumber(type, existingDocs = []) {
    const PREFIX_MAP = {
        Quotation: 'AG-QTY',
        Sales_Bill: 'AG-INV',
        Payment_In: 'AG-REC',
        Purchase_Bill: 'AG-BILL',
        Purchase_Order: 'AG-PO',
        Payment_Out: 'AG-EXP'
    };
    const prefix = PREFIX_MAP[type] || 'AG-DOC';
    const year = new Date().getFullYear();
    const fullPrefix = `${prefix}-${year}-`;

    let maxSeq = 0;
    if (Array.isArray(existingDocs)) {
        for (const doc of existingDocs) {
            const invNum = doc.invoice_number || doc.invoiceNumber || doc.serial_number || doc.id || '';
            if (invNum.startsWith(fullPrefix)) {
                const seqStr = invNum.replace(fullPrefix, '');
                const seqNum = parseInt(seqStr, 10);
                if (!isNaN(seqNum) && seqNum > maxSeq) {
                    maxSeq = seqNum;
                }
            }
        }
    }
    const nextSeq = maxSeq + 1;
    return `${fullPrefix}${String(nextSeq).padStart(4, '0')}`;
}

// ── Create Sheet ───────────────────────────────────────────────────────

export function getCreateSheetHTML(type, contacts, inventoryItems, linkedBills = [], nextSerial = '') {
    const meta = BILLING_TYPES[type] || BILLING_TYPES.Quotation;
    const isPayment = type === 'Payment_In' || type === 'Payment_Out';
    const today = new Date().toISOString().split('T')[0];
    const showItems = !isPayment;

    const contactOptions = contacts.map(c => 
        `<option value="${c.id}" data-gstin="${c.gst || c.gstin || ''}">${c.name}</option>`
    ).join('');

    const linkedBillOptions = linkedBills.length > 0 ? 
        linkedBills.map(b => `<option value="${b.id}">${b.invoice_number} — ${fmtCurrency(b.grand_total - (b.amount_paid||0))} due</option>`).join('') : 
        '<option value="">No outstanding bills</option>';

    const inventoryOptions = inventoryItems.map(i =>
        `<option value="${i.id}" data-price="${i.costPrice || 0}" data-name="${i.name}">${i.name} (${i.sku || 'No SKU'}) — ${i.quantity} ${i.unit}</option>`
    ).join('');

    const taxOptions = [0, 5, 12, 18, 28].map(r =>
        `<option value="${r}" ${r === 5 ? 'selected' : ''}>${r}% GST</option>`
    ).join('');

    return `
    <div id="billingCreateSheet-overlay" class="bottom-sheet-overlay" onclick="window.closeBillingCreateSheet()"></div>
    <div id="billingCreateSheet-content" class="bottom-sheet-content flex flex-col" style="height: 95vh;">
        <div class="sheet-handle"></div>
        <!-- Header -->
        <div class="px-lg pb-md pt-sm flex justify-between items-center border-b border-outline-variant/30 flex-shrink-0">
            <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl ${meta.bg} flex items-center justify-center">
                    <span class="material-symbols-outlined text-[18px] ${meta.color}">${meta.icon}</span>
                </div>
                <div>
                    <h2 id="billingCreateSheet-title" class="text-[18px] font-bold text-on-surface">New ${meta.label.slice(0,-1)}</h2>
                    <p id="billingCreateSheet-subtext" class="text-[12px] text-secondary">${nextSerial ? `Auto-numbered (${nextSerial})` : 'Auto-numbered on save'}</p>
                </div>
            </div>
            <button type="button" onclick="window.closeBillingCreateSheet()" class="w-9 h-9 rounded-full bg-surface-variant flex items-center justify-center active-scale">
                <span class="material-symbols-outlined text-[20px] text-secondary">close</span>
            </button>
        </div>

        <!-- Form Body -->
        <div class="flex-1 overflow-y-auto p-lg flex flex-col gap-5 bg-background">
            <input type="hidden" id="billing-edit-id" value="">
            <input type="hidden" id="billing-type" value="${type}">

            <!-- Contact -->
            <div>
                <label class="text-[13px] font-semibold text-on-surface mb-1.5 block">${meta.contactType === 'vendor' ? 'Vendor' : 'Customer'} *</label>
                <select id="billing-contact-select" class="w-full bg-surface border border-outline-variant rounded-xl px-4 py-3 text-[15px] text-on-surface focus:ring-2 focus:ring-primary/20 outline-none">
                    <option value="">Select ${meta.contactType === 'vendor' ? 'vendor' : 'customer'}...</option>
                    ${contactOptions}
                </select>
                <div id="billing-contact-info" class="mt-2 text-[12px] text-secondary hidden"></div>
            </div>

            <!-- Date & Due Date -->
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="text-[13px] font-semibold text-on-surface mb-1.5 block">Date *</label>
                    <input type="date" id="billing-date" value="${today}" class="w-full bg-surface border border-outline-variant rounded-xl px-4 py-3 text-[15px] text-on-surface focus:ring-2 focus:ring-primary/20 outline-none">
                </div>
                <div>
                    <label class="text-[13px] font-semibold text-on-surface mb-1.5 block">${isPayment ? 'Payment Ref' : 'Due Date'}</label>
                    <input type="${isPayment ? 'text' : 'date'}" id="billing-due-date" placeholder="${isPayment ? 'Ref / Cheque#' : ''}" class="w-full bg-surface border border-outline-variant rounded-xl px-4 py-3 text-[15px] text-on-surface focus:ring-2 focus:ring-primary/20 outline-none">
                </div>
            </div>

            ${isPayment ? `
            <!-- Payment Amount -->
            <div>
                <label class="text-[13px] font-semibold text-on-surface mb-1.5 block">Payment Amount *</label>
                <div class="relative">
                    <span class="absolute left-4 top-1/2 -translate-y-1/2 text-secondary font-semibold">₹</span>
                    <input type="number" id="billing-payment-amount" min="0" step="0.01" placeholder="0.00" 
                        class="w-full bg-surface border border-outline-variant rounded-xl pl-8 pr-4 py-3 text-[15px] text-on-surface focus:ring-2 focus:ring-primary/20 outline-none">
                </div>
            </div>
            <!-- Link to Bill -->
            <div>
                <label class="text-[13px] font-semibold text-on-surface mb-1.5 block">Link to ${type === 'Payment_In' ? 'Sales Bill' : 'Purchase Bill'}</label>
                <select id="billing-linked-bill" class="w-full bg-surface border border-outline-variant rounded-xl px-4 py-3 text-[15px] text-on-surface focus:ring-2 focus:ring-primary/20 outline-none">
                    <option value="">None (standalone payment)</option>
                    ${linkedBillOptions}
                </select>
            </div>
            ` : ''}

            ${showItems ? `
            <!-- Line Items -->
            <div>
                <div class="flex items-center justify-between mb-2">
                    <label class="text-[13px] font-semibold text-on-surface">Line Items</label>
                    <button type="button" onclick="window.addBillingItem()" 
                        class="text-[12px] font-semibold text-primary flex items-center gap-1 active-scale">
                        <span class="material-symbols-outlined text-[16px]">add</span> Add Item
                    </button>
                </div>

                <!-- Item Input Row -->
                <div class="bg-surface border border-outline-variant rounded-xl p-3 flex flex-col gap-3 mb-3">
                    <input type="hidden" id="billing-item-edit-index" value="-1">
                    <div class="grid grid-cols-2 gap-2">
                        <div class="col-span-2">
                            <input type="text" id="billing-item-name" placeholder="Item name / description *"
                                class="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:ring-2 focus:ring-primary/20 outline-none">
                        </div>
                    </div>
                    <!-- Optional inventory link -->
                    <div>
                        <label class="text-[11px] text-secondary mb-1 block">Link to Inventory SKU (optional — enables stock tracking)</label>
                        <select id="billing-item-inventory" onchange="window.onInventoryItemSelect()"
                            class="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:ring-2 focus:ring-primary/20 outline-none">
                            <option value="">No inventory link (free-text)</option>
                            ${inventoryOptions}
                        </select>
                    </div>
                    <div class="grid grid-cols-3 gap-2">
                        <div>
                            <label class="text-[11px] text-secondary mb-1 block">Qty</label>
                            <input type="number" id="billing-item-qty" min="0.01" step="0.01" placeholder="1" 
                                class="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:ring-2 focus:ring-primary/20 outline-none">
                        </div>
                        <div>
                            <label class="text-[11px] text-secondary mb-1 block">Unit Price</label>
                            <input type="number" id="billing-item-price" min="0" step="0.01" placeholder="0.00" 
                                class="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:ring-2 focus:ring-primary/20 outline-none">
                        </div>
                        <div>
                            <label class="text-[11px] text-secondary mb-1 block">GST</label>
                            <select id="billing-item-tax"
                                class="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:ring-2 focus:ring-primary/20 outline-none">
                                ${taxOptions}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label class="text-[11px] text-secondary mb-1 block">Discount %</label>
                        <input type="number" id="billing-item-discount" min="0" max="100" step="0.01" placeholder="0" 
                            class="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:ring-2 focus:ring-primary/20 outline-none">
                    </div>
                    <div class="flex gap-2">
                        <button type="button" id="billing-item-submit-btn" onclick="window.addBillingItem()"
                            class="flex-1 bg-primary/10 text-primary font-semibold py-2.5 rounded-xl text-[14px] active-scale">
                            + Add to Bill
                        </button>
                        <button type="button" id="billing-item-cancel-edit-btn" onclick="window.cancelEditBillingItem()"
                            class="hidden px-4 bg-surface-variant text-secondary font-semibold py-2.5 rounded-xl text-[14px] active-scale">
                            Cancel
                        </button>
                    </div>
                </div>

                <!-- Items Table -->
                <div id="billing-items-list" class="flex flex-col gap-2">
                    <div id="billing-items-empty" class="text-[13px] text-secondary italic text-center py-4">No items added yet</div>
                </div>
            </div>

            <!-- Totals -->
            <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4">
                <div class="flex justify-between text-[13px] text-secondary mb-2">
                    <span>Subtotal</span><span id="billing-display-subtotal" class="text-on-surface">₹0.00</span>
                </div>
                <div class="flex justify-between text-[13px] text-secondary mb-2">
                    <span>Discount</span><span id="billing-display-discount" class="text-on-surface">₹0.00</span>
                </div>
                <div class="flex justify-between text-[13px] text-secondary mb-3">
                    <span>GST Total</span><span id="billing-display-tax" class="text-on-surface">₹0.00</span>
                </div>
                <div class="flex justify-between text-[16px] font-bold text-on-surface border-t border-outline-variant/30 pt-3">
                    <span>Grand Total</span><span id="billing-display-grand">₹0.00</span>
                </div>
            </div>
            ` : ''}

            <!-- Notes -->
            <div>
                <label class="text-[13px] font-semibold text-on-surface mb-1.5 block">Notes</label>
                <textarea id="billing-notes" rows="2" placeholder="Internal notes or terms..."
                    class="w-full bg-surface border border-outline-variant rounded-xl px-4 py-3 text-[15px] text-on-surface focus:ring-2 focus:ring-primary/20 outline-none resize-none"></textarea>
            </div>
        </div>

        <!-- Action Buttons -->
        <div class="p-4 border-t border-outline-variant/30 bg-surface-container-lowest safe-bottom flex gap-3 flex-shrink-0">
            <button type="button" onclick="window.closeBillingCreateSheet()"
                class="flex-1 bg-surface-container-high text-on-surface font-semibold py-3.5 rounded-xl active-scale">Cancel</button>
            <button type="button" onclick="window.saveBillingDraft()"
                class="flex-1 bg-surface-variant text-on-surface font-semibold py-3.5 rounded-xl active-scale">Save Draft</button>
            <button type="button" onclick="window.saveBillingAndFinalize()"
                class="flex-1 bg-primary text-white font-semibold py-3.5 rounded-xl shadow-sm active-scale">
                ${isPayment ? 'Record Payment' : 'Save & Finalize'}
            </button>
        </div>
    </div>`;
}

// ── Detail View Sheet ──────────────────────────────────────────────────

export function getBillingDetailsHTML(doc) {
    const meta = BILLING_TYPES[doc.transaction_type] || BILLING_TYPES.Quotation;
    const badgeClass = STATUS_BADGE[doc.status] || 'bg-surface-variant text-secondary';
    const displayStatus = (doc.status || 'Draft').replace('_', ' ');
    const items = doc.items || [];
    const balance = doc.grand_total - (doc.amount_paid || 0);
    const isPayment = doc.transaction_type === 'Payment_In' || doc.transaction_type === 'Payment_Out';
    const isQuotation = doc.transaction_type === 'Quotation';
    const isSalesBill = doc.transaction_type === 'Sales_Bill';
    const isDraft = doc.status === 'Draft' || doc.status === 'Sent';
    const isVoid = doc.status === 'Void';

    return `
    <div class="p-lg flex flex-col gap-4">
        <!-- Header -->
        <div class="flex items-start justify-between gap-3">
            <div class="flex items-start gap-3">
                <div class="w-12 h-12 rounded-2xl ${meta.bg} flex items-center justify-center">
                    <span class="material-symbols-outlined text-[24px] ${meta.color}">${meta.icon}</span>
                </div>
                <div>
                    <div class="text-[11px] text-secondary uppercase font-semibold tracking-wide">${meta.label.slice(0,-1)}</div>
                    <div class="text-[20px] font-bold text-on-surface font-mono">${doc.invoice_number}</div>
                    <span class="text-[12px] font-semibold px-2.5 py-0.5 rounded-full ${badgeClass}">${displayStatus}</span>
                </div>
            </div>
            <div class="text-right">
                <div class="text-[22px] font-bold text-on-surface">${fmtCurrency(doc.grand_total)}</div>
                ${!isPayment && balance > 0.01 && !isVoid ? `<div class="text-[12px] text-[#FF3B30] font-semibold">Due: ${fmtCurrency(balance)}</div>` : ''}
                ${doc.amount_paid > 0 ? `<div class="text-[12px] text-[#00B386]">Paid: ${fmtCurrency(doc.amount_paid)}</div>` : ''}
            </div>
        </div>

        <!-- Contact & Date Info -->
        <div class="bg-surface-container-lowest border border-outline-variant/50 rounded-2xl p-4 flex flex-col gap-2">
            <div class="flex justify-between">
                <span class="text-[12px] text-secondary">${meta.contactType === 'vendor' ? 'Vendor' : 'Customer'}</span>
                <span class="text-[13px] font-semibold text-on-surface">${doc.contact_name || '—'}</span>
            </div>
            ${doc.contact_gstin ? `<div class="flex justify-between">
                <span class="text-[12px] text-secondary">GSTIN</span>
                <span class="text-[12px] font-mono text-on-surface">${doc.contact_gstin}</span>
            </div>` : ''}
            <div class="flex justify-between">
                <span class="text-[12px] text-secondary">Date</span>
                <span class="text-[13px] font-semibold text-on-surface">${fmtDate(doc.date)}</span>
            </div>
            ${doc.due_date ? `<div class="flex justify-between">
                <span class="text-[12px] text-secondary">Due / Ref</span>
                <span class="text-[13px] font-semibold text-on-surface">${doc.transaction_type.includes('Payment') ? doc.due_date : fmtDate(doc.due_date)}</span>
            </div>` : ''}
        </div>

        <!-- Line Items -->
        ${items.length > 0 ? `
        <div>
            <div class="text-[13px] font-semibold text-secondary uppercase tracking-wide mb-2">Line Items</div>
            <div class="flex flex-col gap-2">
                ${items.map((item, i) => `
                <div class="bg-surface-container-lowest border border-outline-variant/50 rounded-xl p-3">
                    <div class="flex justify-between items-start">
                        <div class="flex-1 min-w-0">
                            <div class="text-[14px] font-semibold text-on-surface">${item.item_name}</div>
                            ${item.description ? `<div class="text-[12px] text-secondary">${item.description}</div>` : ''}
                            <div class="text-[12px] text-secondary mt-1">
                                ${item.quantity} ${item.unit} × ${fmtCurrency(item.unit_price)}
                                ${item.discount_pct > 0 ? ` − ${item.discount_pct}% disc` : ''}
                                ${item.tax_pct > 0 ? ` + ${item.tax_pct}% GST` : ''}
                            </div>
                        </div>
                        <div class="text-[15px] font-bold text-on-surface ml-3">${fmtCurrency(item.row_total)}</div>
                    </div>
                </div>`).join('')}
            </div>

            <!-- Totals breakdown -->
            <div class="bg-surface-container-lowest border border-outline-variant/50 rounded-2xl p-4 mt-3 flex flex-col gap-2">
                <div class="flex justify-between text-[13px]">
                    <span class="text-secondary">Subtotal</span><span class="text-on-surface font-medium">${fmtCurrency(doc.subtotal)}</span>
                </div>
                ${doc.discount > 0 ? `<div class="flex justify-between text-[13px]">
                    <span class="text-secondary">Discount</span><span class="text-[#FF3B30] font-medium">−${fmtCurrency(doc.discount)}</span>
                </div>` : ''}
                ${doc.tax_total > 0 ? `<div class="flex justify-between text-[13px]">
                    <span class="text-secondary">GST Total</span><span class="text-on-surface font-medium">${fmtCurrency(doc.tax_total)}</span>
                </div>` : ''}
                <div class="flex justify-between text-[16px] font-bold border-t border-outline-variant/30 pt-3 mt-1">
                    <span>Grand Total</span><span>${fmtCurrency(doc.grand_total)}</span>
                </div>
            </div>
        </div>
        ` : `<div class="text-[13px] text-secondary italic text-center py-3">No line items</div>`}

        ${doc.notes ? `
        <div class="bg-surface-container-lowest border border-outline-variant/50 rounded-xl p-3">
            <div class="text-[11px] text-secondary uppercase font-semibold mb-1">Notes</div>
            <div class="text-[14px] text-on-surface">${doc.notes}</div>
        </div>` : ''}

        <!-- Action Buttons -->
        <div class="flex flex-col gap-2 pb-2">
            ${!isVoid && isDraft ? `
            <button type="button" onclick="window.finalizeBillingDoc('${doc.id}')"
                class="w-full bg-primary text-white font-semibold py-3.5 rounded-xl active-scale text-[15px]">
                <span class="flex items-center justify-center gap-2">
                    <span class="material-symbols-outlined text-[18px]">check_circle</span>
                    ${isPayment ? 'Confirm Payment' : 'Finalize Document'}
                </span>
            </button>` : ''}

            ${isQuotation && !isVoid && doc.status !== 'Converted' ? `
            <button type="button" onclick="window.convertBillingToInvoice('${doc.id}')"
                class="w-full bg-[#6C63FF] text-white font-semibold py-3.5 rounded-xl active-scale text-[15px]">
                <span class="flex items-center justify-center gap-2">
                    <span class="material-symbols-outlined text-[18px]">receipt_long</span>
                    Convert to Sales Bill
                </span>
            </button>` : ''}

            ${(isSalesBill || doc.transaction_type === 'Purchase_Bill') && (doc.status === 'Finalized' || doc.status === 'Partially_Paid') ? `
            <button type="button" onclick="window.recordPaymentForBill('${doc.id}', '${doc.transaction_type}')"
                class="w-full bg-[#00B386] text-white font-semibold py-3.5 rounded-xl active-scale text-[15px]">
                <span class="flex items-center justify-center gap-2">
                    <span class="material-symbols-outlined text-[18px]">payments</span>
                    Record Payment
                </span>
            </button>` : ''}

            ${!isVoid ? `
            <div class="flex gap-2">
                <button type="button" onclick="window.printBillingDoc('${doc.id}')"
                    class="flex-1 bg-surface-variant text-on-surface font-semibold py-3.5 rounded-xl active-scale text-[14px]">
                    <span class="flex items-center justify-center gap-1.5">
                        <span class="material-symbols-outlined text-[18px]">print</span>
                        Print / PDF
                    </span>
                </button>
                <button type="button" onclick="window.duplicateBillingDoc('${doc.id}')"
                    class="flex-1 bg-surface-variant text-on-surface font-semibold py-3.5 rounded-xl active-scale text-[14px]">
                    <span class="flex items-center justify-center gap-1.5">
                        <span class="material-symbols-outlined text-[18px]">content_copy</span>
                        Duplicate
                    </span>
                </button>
            </div>` : ''}

            <div class="flex gap-2">
                ${!isVoid && isDraft ? `
                <button type="button" onclick="window.editBillingDoc('${doc.id}')"
                    class="flex-1 bg-surface-container-high text-on-surface font-semibold py-3 rounded-xl active-scale text-[14px]">
                    <span class="flex items-center justify-center gap-1">
                        <span class="material-symbols-outlined text-[16px]">edit</span> Edit Draft
                    </span>
                </button>
                <button type="button" onclick="window.deleteBillingDraft('${doc.id}')"
                    class="flex-1 bg-error/10 text-error font-semibold py-3 rounded-xl active-scale text-[14px]">
                    <span class="flex items-center justify-center gap-1">
                        <span class="material-symbols-outlined text-[16px]">delete_forever</span> Delete Draft
                    </span>
                </button>
                ` : !isVoid ? `
                <button type="button" onclick="window.voidBillingDoc('${doc.id}')"
                    class="w-full bg-error/10 text-error font-semibold py-3 rounded-xl active-scale text-[14px]">
                    <span class="flex items-center justify-center gap-1">
                        <span class="material-symbols-outlined text-[16px]">block</span> Void Document
                    </span>
                </button>
                ` : ''}
            </div>
        </div>
    </div>`;
}

// ── Print Template ─────────────────────────────────────────────────────

export function getPrintHTML(doc, contactInfo = {}) {
    const meta = BILLING_TYPES[doc.transaction_type] || BILLING_TYPES.Quotation;
    const items = doc.items || [];
    const subtotal = doc.subtotal || 0;
    const taxTotal = doc.tax_total || 0;
    const grandTotal = doc.grand_total || 0;

    function numberToWords(num) {
        if (num === 0) return 'Zero Rupees only';
        const a = ['','One ','Two ','Three ','Four ','Five ','Six ','Seven ','Eight ','Nine ','Ten ','Eleven ','Twelve ','Thirteen ','Fourteen ','Fifteen ','Sixteen ','Seventeen ','Eighteen ','Nineteen '];
        const b = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
        const numStr = Math.floor(num).toString();
        if (numStr.length > 9) return 'Amount too large';
        const n = ('000000000' + numStr).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
        if (!n) return '';
        let str = '';
        str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
        str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
        str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
        str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
        str += (n[5] != 0) ? ((str !== '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
        return str.trim() + ' Rupees only';
    }

    const amountWords = numberToWords(Math.round(grandTotal));
    const cgst = (taxTotal / 2).toFixed(2);
    const sgst = (taxTotal / 2).toFixed(2);

    const itemsHTML = items.map((item, i) => {
        const gstPct = item.tax_pct || 0;
        const taxAmt = item.tax_amount || 0;
        return `
        <tr>
            <td style="text-align:center;color:#64748b">${i+1}</td>
            <td>${item.item_name}${item.description ? `<br><small style="color:#64748b">${item.description}</small>` : ''}</td>
            <td style="text-align:center;color:#64748b">6109</td>
            <td style="text-align:center">${item.quantity} ${item.unit}</td>
            <td style="text-align:right">₹ ${Number(item.unit_price).toFixed(2)}</td>
            ${item.discount_pct > 0 ? `<td style="text-align:right;color:#64748b">${item.discount_pct}%</td>` : '<td></td>'}
            <td style="text-align:right;color:#64748b">₹ ${taxAmt.toFixed(2)} (${gstPct}%)</td>
            <td style="text-align:right;font-weight:600">₹ ${Number(item.row_total).toFixed(2)}</td>
        </tr>`;
    }).join('');

    const isPayment = doc.transaction_type === 'Payment_In' || doc.transaction_type === 'Payment_Out';

    const docTitle = doc.transaction_type === 'Quotation' ? 'PROFORMA INVOICE' : 
                     doc.transaction_type === 'Sales_Bill' ? 'TAX INVOICE' : 
                     doc.transaction_type === 'Purchase_Order' ? 'PURCHASE ORDER' : 
                     doc.transaction_type === 'Purchase_Bill' ? 'PURCHASE BILL' : 
                     doc.transaction_type === 'Payment_In' ? 'PAYMENT RECEIPT' : 
                     doc.transaction_type === 'Payment_Out' ? 'PAYMENT VOUCHER' : meta.label.toUpperCase();

    return `<!DOCTYPE html>
<html>
<head>
    <title>${doc.invoice_number}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        @page { size: A4; margin: 12mm 15mm; }
        * { box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; font-size: 12px; color: #1e293b; margin: 0; background: #fff; line-height: 1.5; }
        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 24px; }
        .company-name { font-size: 24px; font-weight: 800; }
        .doc-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; }
        .doc-title { font-size: 26px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }
        .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
        .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; }
        .info-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; font-weight: 600; margin-bottom: 6px; }
        table { width: 100%; border-collapse: collapse; }
        .table-wrap { border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin-bottom: 24px; }
        th { background: #f8fafc; padding: 10px 8px; font-size: 10px; font-weight: 600; color: #475569; text-transform: uppercase; letter-spacing: 0.3px; border-bottom: 2px solid #e2e8f0; }
        td { padding: 10px 8px; border-bottom: 1px solid #f1f5f9; }
        tr:last-child td { border-bottom: none; }
        .totals-wrap { display: flex; justify-content: flex-end; margin-bottom: 32px; }
        .totals-box { width: 300px; background: #f8fafc; border-radius: 8px; padding: 18px; border: 1px solid #e2e8f0; }
        .total-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
        .total-grand { border-top: 2px solid #e2e8f0; padding-top: 12px; margin-top: 8px; margin-bottom: 0; font-size: 17px; font-weight: 800; }
        .amount-words { font-style: italic; color: #64748b; text-align: right; margin-top: 8px; font-size: 11px; }
        .footer { display: grid; grid-template-columns: 2fr 1fr; gap: 40px; border-top: 2px solid #e2e8f0; padding-top: 24px; }
        .terms-list { padding-left: 14px; margin: 0; color: #475569; font-size: 11px; }
        .terms-list li { margin-bottom: 5px; }
        .sign-box { text-align: center; }
        .sign-line { border-bottom: 1px solid #cbd5e1; margin-top: 50px; margin-bottom: 8px; }
    </style>
</head>
<body>
    <div class="header">
        <div>
            <img src="/assets/logo-primary.webp" alt="Logo" style="max-height:60px;max-width:120px;" 
                onerror="this.outerHTML='<div style=\\'font-size:28px;font-weight:800;\\'>UDHAYAA</div>'">
        </div>
        <div style="text-align:right">
            <div class="company-name"><span>Udhayaa </span><span style="color:#FF6B00">Textiles</span></div>
            <div style="color:#64748b">63/A Senthur Nagar, Ellapalayam Road</div>
            <div style="color:#64748b">Periyasemur, Erode, Tamil Nadu 638004</div>
            <div style="color:#64748b;margin-top:4px">+91 77083 33813 · info@udhayaatextiles.com</div>
        </div>
    </div>

    <div class="doc-header">
        <div class="doc-title">${docTitle}</div>
        <div style="text-align:right">
            <div style="font-weight:700;font-size:15px">${doc.invoice_number}</div>
            <div style="color:#64748b">Date: ${doc.date}</div>
            ${doc.due_date ? `<div style="color:#64748b">Due: ${doc.due_date}</div>` : ''}
        </div>
    </div>

    <div class="grid2">
        <div class="info-box">
            <div class="info-label">${meta.contactType === 'vendor' ? (isPayment ? 'Paid To Vendor' : 'Vendor') : (isPayment ? 'Received From Customer' : 'Bill To')}</div>
            <div style="font-weight:700;font-size:15px;margin-bottom:4px">${doc.contact_name}</div>
            ${doc.contact_gstin ? `<div style="color:#64748b">GSTIN: ${doc.contact_gstin}</div>` : ''}
            ${contactInfo.address ? `<div style="color:#64748b">${contactInfo.address}</div>` : ''}
            ${contactInfo.city ? `<div style="color:#64748b">${contactInfo.city}</div>` : ''}
            ${contactInfo.email ? `<div style="color:#64748b">${contactInfo.email}</div>` : ''}
        </div>
        <div class="info-box">
            <div class="info-label">Bank Details</div>
            <div style="font-weight:600;margin-bottom:2px">Indian Overseas Bank</div>
            <div style="color:#64748b">Branch: Erode Periasemur</div>
            <div style="color:#64748b">A/C Name: Udhayaa Textiles</div>
            <div style="font-weight:700;margin-top:6px">A/C No: 134601000036234</div>
            <div style="font-weight:700">IFSC: IOBA0001346</div>
            <div style="font-weight:700">UPI: info.udhayaatextiles-2@okhdfcbank</div>
        </div>
    </div>

    ${isPayment ? `
    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:20px; margin-bottom:32px;">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0; padding-bottom:14px; margin-bottom:14px;">
            <div>
                <div style="font-size:10px; text-transform:uppercase; color:#64748b; font-weight:600;">Transaction Type</div>
                <div style="font-size:16px; font-weight:700; color:#0f172a;">${doc.transaction_type === 'Payment_In' ? 'Payment Received' : 'Payment Outflow'}</div>
            </div>
            <div style="text-align:right;">
                <div style="font-size:10px; text-transform:uppercase; color:#64748b; font-weight:600;">Total Amount</div>
                <div style="font-size:24px; font-weight:800; color:${doc.transaction_type === 'Payment_In' ? '#00B386' : '#FF3B30'};">₹ ${grandTotal.toFixed(2)}</div>
            </div>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
            <div>
                <div style="font-size:10px; text-transform:uppercase; color:#64748b; font-weight:600;">Amount in Words</div>
                <div style="font-weight:600; color:#1e293b; margin-top:2px;">${amountWords}</div>
            </div>
            <div>
                <div style="font-size:10px; text-transform:uppercase; color:#64748b; font-weight:600;">Linked Document / Ref</div>
                <div style="font-weight:600; color:#1e293b; margin-top:2px;">${doc.linked_bill_id || 'Direct Payment'}</div>
            </div>
            ${doc.notes ? `
            <div style="grid-column: span 2;">
                <div style="font-size:10px; text-transform:uppercase; color:#64748b; font-weight:600;">Notes / Particulars</div>
                <div style="font-weight:500; color:#334155; margin-top:2px;">${doc.notes}</div>
            </div>` : ''}
        </div>
    </div>
    ` : `
    <div class="table-wrap">
        <table>
            <thead>
                <tr>
                    <th style="width:35px;text-align:center">#</th>
                    <th>Description</th>
                    <th style="width:65px;text-align:center">HSN</th>
                    <th style="width:80px;text-align:center">Qty</th>
                    <th style="width:90px;text-align:right">Price</th>
                    <th style="width:70px;text-align:right">Disc</th>
                    <th style="width:100px;text-align:right">GST</th>
                    <th style="width:100px;text-align:right">Total</th>
                </tr>
            </thead>
            <tbody>${itemsHTML}</tbody>
        </table>
    </div>

    <div class="totals-wrap">
        <div>
            <div class="totals-box">
                <div class="total-row"><span style="color:#64748b">Subtotal</span><span style="font-weight:500">₹ ${subtotal.toFixed(2)}</span></div>
                ${doc.discount > 0 ? `<div class="total-row"><span style="color:#64748b">Discount</span><span>−₹ ${Number(doc.discount).toFixed(2)}</span></div>` : ''}
                <div class="total-row"><span style="color:#64748b">CGST (${(Number(items[0]?.tax_pct||5)/2).toFixed(1)}%)</span><span>₹ ${cgst}</span></div>
                <div class="total-row"><span style="color:#64748b">SGST (${(Number(items[0]?.tax_pct||5)/2).toFixed(1)}%)</span><span>₹ ${sgst}</span></div>
                <div class="total-row total-grand"><span>Grand Total</span><span>₹ ${grandTotal.toFixed(2)}</span></div>
            </div>
            <div class="amount-words">Amount in words: ${amountWords}</div>
        </div>
    </div>
    `}

    <div class="footer">
        <div>
            <h4 style="margin:0 0 10px;font-size:13px;font-weight:700">Terms &amp; Conditions</h4>
            <ul class="terms-list">
                <li><strong>Advance Payment:</strong> 50% of total order value to confirm order.</li>
                <li><strong>Fabric In House:</strong> 20% to be paid once dyeing is completed.</li>
                <li><strong>On Completion:</strong> 30% to be paid before delivery/dispatch.</li>
                <li>All quoted rates are valid for 7 days from date of document.</li>
            </ul>
        </div>
        <div class="sign-box">
            <div style="flex-grow:1"></div>
            <div class="sign-line"></div>
            <div style="font-size:11px;font-weight:600;color:#64748b">For Udhayaa Textiles</div>
            <div style="font-size:9px;color:#64748b;margin-top:2px">Authorized Signatory</div>
        </div>
    </div>

    <script>window.onload = () => setTimeout(() => window.print(), 500)</script>
</body>
</html>`;
}
