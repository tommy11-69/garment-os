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
                ${isVoid ? `
                <button type="button" onclick="window.deleteBillingVoid('${doc.id}')"
                    class="w-full bg-error/10 text-error font-semibold py-3 rounded-xl active-scale text-[14px]">
                    <span class="flex items-center justify-center gap-1">
                        <span class="material-symbols-outlined text-[16px]">delete_forever</span> Delete Permanently
                    </span>
                </button>
                ` : isDraft ? `
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

// ── Print Template ─────────────────────────────────────────────────────

const BILLING_LOGO_DATA_URI = "data:image/png;base64,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TvOUfzIl6deaGUGFvHK5ZNNWBRgRAm+RZDKpGTNmnFrl0tXVZZ6SN52dnfrwww8Vi8U0efJkFRePrYdoO46jjo4OrV+/Xo8++qgee+wxtbW1maf9k2AwqDlVcV3X5FdAo791xGkReJxA4C2TTCY1c+bMU3dcjmbk29vb9c4776i/v191dXUqKysr6LNkM9XX16dt27bpN7/5jb7//e/r+eef18DA0NvQBoNBNTY26ksXLtHyyF75zrT3/Wgi8DiBwFvoZOTT6bR27tw5qmvVu7q69N5772n//v2qqKhQMpn07JTN4OCg9u/fr1deeUVr167Vo48+mtGUjE58uD1z5kzdcsst+perLlL03f975oebjCYCjxMIvKWKi4s1d+5cRaNR7d27V21tbaO2+2Rvb6+2bt2qjRs3ynEcFRcXK5FIKBQ6w9N5RtHAwIAOHDig1157TT//+c/1yCOPDGsL5kgkoubmZt1+++265ZZblOg7Kr3xJIGH5xB4iyUSCTU3N6u2tlb79u3TkSNHMpp6yIVUKqUDBw5ow4YN2rFjhxzHkd/vVzQaVTQaNU/PO8dxdPz4cX388cd644039MQTT+jhhx/W008/rdbWVvP0TxWLxbRw4ULdcccdWrNmjbsvfutuAg9PYj/4caCvr0+vv/66fvCDH+iPf/zjsIKWK8XFxVq+fLkuueQStbS0qKamRpWVlUokEuapOeM4jnp6enT48GHt3btXH3zwgf70pz/11VdfzXgq5iS/36/S0lKtWLFCt956qy655JL/+Hxh21+kH10l9R03v60w2A8eJxD4cSKVSmn79u1au3atnn32We3atWvUrub/UTQaVVNTk5YsWaLFixdrxowZmjBhgkpKSlRaWqpEIqFAIGB+W0YGBwd1/PhxHTt2TK2trTp8+LB27typTZs2acOGDXrvvfcynob5R6FQSPX19brssst08803q7m5+ZMnEHh4FIEfZ1pbW/XMM8/oiSee0JtvvlnQm5PC4bBqa2s1c+ZMTZs2TU1NTaqrq1NJSYlisZii0agikYgCgYD8fr8CgYB8Pp/S6bRSqZQGBwc1ODiovr4+dXV1qa2tTfv27dPHH3+szZs36/3339eePXtG9NlDPB7X/Pnzdf311+v6669XaWmpeQqBh2cR+HFocHBQ27dv17p16/TMM89o27Zt6unpMU8riGAwqLKyMlVUVGjixIkqLi5WJBJROBxWOBxWIBDQwMCAent71dPTo56eHrW3t2v//v06dOhQzjY+C4VCmjx5spYvX66vfOUrWrly5acv+STw8CgCP451dXXpz3/+s9atW6fXX39de/fuzWoKwyaBQEDl5eU6++yzdfnll+uKK65QTU2NedonEXh4FIEf59LptA4cOKBnn31WL7zwgt599139/e9/H3cPtPD7/Uomk5ozZ44+97nP6dprr9XcuXPN006PwMOjCDykEytODh06pN/97nd67rnntGnTJu3evVvHj3skWnkSCAQ0YcIETZs2TYsXL9aVV16pFStWKBgMmqd+OgIPjyLw+ATHcdTa2qrf//73p67oR3sN/WgIhUKqqqrSzJkztWzZMl188cVauHBhdg9OIfDwKAKPT9XZ2am33npLr7zyiv72t7/po48+0r59+9Ta2qpUKmWe7nknP8CtqalRY2OjzjvvPK1evVqzZ88e2cNSCDw8isBjSM6Jh1+88cYbevXVV7Vx40bt2bNHra2tamtrU3d3t/ktnvGPUW9oaND8+fO1dOlStbS0qKqqyjw9OwQeHkXgMSzpdFqHDx/WW2+9pQ8++EBbtmzRrl27dPTo0VPB7+zsHNHa82z5fD6Fw2GVlZWd+qqqqtK8efN0zjnnqKWlRZWVlea3jRyBh0cReIxIKpXSkSNHtHnzZm3ZskVbt27VRx99pI6ODh0/fvy0XyOd3vH7/YrFYioqKlJRUZFisZji8bhKSkpO3Th18quxsTGv2yFIBB7eReCRUyf3fzlw4IAOHjyogwcP6tChQ6f++uDBg+rs7NTg4OCpu1FTqdQnvtLptHw+nwKBwCe+gsGgQqGQEomEKisrVVVVdep/q6urVV9fr9ra2uGtgMkFAg+PIvAYValUSp2dnert7VVvb6/6+vrU19f3ib8eGBhQIBBQJBJRJBJRNBpVOBxWNBpVPB5XaWmpu4ujVxB4eBSBB0aKwMOjPmVzDQDAWEfgAcBSBB4ALEXgAcBSBB4ALEXgAcBSBB4ALEXgAcBSBB4ALEXgAcBSBB4ALEXgAcBSBB4ALEXgAcBSBB4ALEXgAcBSBB4ALEXgAcBSBB4ALEXgAcBSBB4ALEXgAcBSBB4ALEXgAcBSBB4ALEXgAcBSBB4ALEXgAcBSBB4ALEXgAcBSBB4ALEXgAcBSBB4ALEXgAcBSBB4ALEXgAcBSBB4ALEXgAcBSBB4ALEXgAcBSBB4ALEXgAcBSBB4ALEXgAcBSBB4ALEXgAcBSBB4ALEXgAcBSBB4ALEXgAcBSBB4ALEXgAcBSBB4ALEXgAcBSBB4ALEXgAcBSBB7IBccxjxSQI3npj4OCIfDASKXTUmrQPFo4jiOlBsyjGIcIPDAS6UGpr8tbgR8ckHqOmUcxDhF4YCR6jkn7N7vTIl7Rf1w6ukvq6zZHMM4QeCBb6ZR0+CPpvRfNkcIa6JH2vS/tfN1bv3gw6gg8MFzplNTdKu36m/TmU9Ku180zCu/ox9JffiJ99JrUedidSsK443McT338D+ROX7d0cKvU1WqOZMmRnLTU3yMd2i598P/cgHr1A81gWKqeLZ11mVQ9S4omJJ9Pks88MzvRpDRpthQtNkfgEQQe9jr4ofSb+6WtfzZHsuM4UnpAGux3r+LHEp9fCkUlf/BE5HOg9jPStd+TJjebI/AIAg977d8s/epuafMfzBHkQt1Z0g0/kurnmyPwCObgAcBSBB4ALEXgAcBSBB4ALEXgAcBSrKKBvdr2SK/+H2nPO+YIcmHiFOm826SKRnMEHkHgAcBSTNEAgKUIPABYisADgKUIPABYisADgKUIPABYisADgKUIPABYisADgKUIPABYisADgKUIPABYisADgKUIPABYisADgKUIPABYisADgKUIPABYisADgKUIPABYisADgKUIPABYisADgKUIPABYisADgKUIPABYisADgKUIPABYisADgKUIPABYisADgKUIPABYisADgKUIPABYisADgKUIPABYisADgKUIPABYisADgKUIPABYisADgKUIPABYisADgKUIPABY6v8Dacx18wwDfdMAAAAASUVORK5CYII=";

export function getPrintHTML(doc, contactInfo = {}) {
    const meta = BILLING_TYPES[doc.transaction_type] || BILLING_TYPES.Quotation;
    const items = doc.items || [];
    const subtotal = doc.subtotal || 0;
    const taxTotal = doc.tax_total || 0;
    const grandTotal = doc.grand_total || 0;

    function numberToWords(num) {
        if (num === 0) return 'Zero Rupees Only';
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
        return str.trim() + ' Rupees Only';
    }

    const amountWords = numberToWords(Math.round(grandTotal));
    const cgst = (taxTotal / 2).toFixed(2);
    const sgst = (taxTotal / 2).toFixed(2);

    const itemsHTML = items.map((item, i) => {
        const gstPct = item.tax_pct || 5;
        const taxAmt = item.tax_amount || (item.row_total * (gstPct / 100)) || 0;
        return `
        <tr>
            <td style="text-align:center;color:#64748b;font-weight:600">${i+1}</td>
            <td style="font-weight:600;color:#0f172a">${item.item_name || 'Item'}${item.description ? `<div style="color:#64748b;font-size:9.5px;font-weight:normal;margin-top:1px">${item.description}</div>` : ''}</td>
            <td style="text-align:center;color:#64748b">6109</td>
            <td style="text-align:center;font-weight:600">${item.quantity} <span style="font-size:9.5px;color:#64748b">${item.unit || 'pcs'}</span></td>
            <td style="text-align:right">₹ ${Number(item.unit_price || 0).toFixed(2)}</td>
            ${item.discount_pct > 0 ? `<td style="text-align:right;color:#64748b">${item.discount_pct}%</td>` : '<td style="text-align:center;color:#94a3b8">—</td>'}
            <td style="text-align:right;color:#475569">₹ ${Number(taxAmt).toFixed(2)} <span style="font-size:9.5px;color:#64748b">(${gstPct}%)</span></td>
            <td style="text-align:right;font-weight:700;color:#0f172a">₹ ${Number(item.row_total || 0).toFixed(2)}</td>
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
    <meta charset="utf-8">
    <title>${docTitle} - ${doc.invoice_number}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        @page {
            size: A4 portrait;
            margin: 6mm 8mm;
        }
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        html, body {
            background: #ffffff;
            color: #0f172a;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 10.5px;
            line-height: 1.35;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        .page-container {
            width: 100%;
            max-width: 100%;
            margin: 0 auto;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            min-height: 98vh;
        }
        
        /* Header Block */
        .top-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 8px;
            margin-bottom: 8px;
        }
        .company-brand {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .company-logo {
            height: 48px;
            width: auto;
            max-width: 130px;
            object-fit: contain;
        }
        .company-info-text {
            text-align: right;
            font-size: 10px;
            color: #475569;
            line-height: 1.3;
        }
        .company-title {
            font-size: 17px;
            font-weight: 800;
            color: #0f172a;
            letter-spacing: -0.3px;
        }
        .gst-badge {
            display: inline-block;
            font-weight: 700;
            color: #0f172a;
            background: #f1f5f9;
            padding: 1px 6px;
            border-radius: 4px;
            border: 1px solid #cbd5e1;
            margin-top: 2px;
            font-size: 10px;
        }

        /* Document Banner */
        .doc-banner {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 6px 10px;
            margin-bottom: 8px;
        }
        .doc-type-title {
            font-size: 14px;
            font-weight: 800;
            color: #0f172a;
            letter-spacing: 0.5px;
            text-transform: uppercase;
        }
        .doc-meta-item {
            font-size: 10.5px;
            color: #334155;
        }
        .doc-meta-item strong {
            color: #0f172a;
            font-weight: 700;
        }

        /* 2-Column Info Cards */
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            margin-bottom: 8px;
        }
        .info-card {
            border: 1px solid #e2e8f0;
            background: #fafafa;
            border-radius: 6px;
            padding: 7px 10px;
            font-size: 10px;
            line-height: 1.35;
        }
        .card-label {
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #64748b;
            margin-bottom: 3px;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 2px;
        }
        .card-name {
            font-size: 12px;
            font-weight: 700;
            color: #0f172a;
            margin-bottom: 2px;
        }

        /* Table */
        .table-wrap {
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            overflow: hidden;
            margin-bottom: 8px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
        }
        th {
            background: #f1f5f9;
            color: #334155;
            font-weight: 700;
            text-transform: uppercase;
            font-size: 9px;
            letter-spacing: 0.3px;
            padding: 5px 6px;
            border-bottom: 1px solid #cbd5e1;
            text-align: left;
        }
        td {
            padding: 5px 6px;
            border-bottom: 1px solid #e2e8f0;
            color: #1e293b;
            vertical-align: middle;
        }
        tr:last-child td {
            border-bottom: none;
        }

        /* Summary & Totals */
        .summary-grid {
            display: grid;
            grid-template-columns: 1.25fr 1fr;
            gap: 10px;
            align-items: flex-start;
            margin-bottom: 8px;
        }
        .amount-words-box {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 8px;
            font-size: 10px;
        }
        .totals-card {
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 6px 10px;
        }
        .totals-row {
            display: flex;
            justify-content: space-between;
            font-size: 10.5px;
            margin-bottom: 3px;
            color: #475569;
        }
        .totals-row.grand {
            border-top: 1.5px solid #0f172a;
            margin-top: 4px;
            padding-top: 4px;
            margin-bottom: 0;
            font-size: 13px;
            font-weight: 800;
            color: #0f172a;
        }

        /* Footer & Signatures */
        .footer-section {
            display: grid;
            grid-template-columns: 1.4fr 1fr;
            gap: 12px;
            border-top: 1px solid #cbd5e1;
            padding-top: 6px;
            margin-top: auto;
        }
        .terms-box h4 {
            font-size: 10px;
            font-weight: 700;
            color: #0f172a;
            margin-bottom: 3px;
            text-transform: uppercase;
        }
        .terms-box ul {
            padding-left: 12px;
            font-size: 9px;
            color: #475569;
            line-height: 1.3;
        }
        .sign-card {
            text-align: center;
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
            align-items: center;
        }
        .sign-line {
            width: 100%;
            border-bottom: 1px solid #0f172a;
            margin-top: 24px;
            margin-bottom: 3px;
        }

        @media print {
            body { padding: 0; }
            .no-print { display: none !important; }
            tr, .info-card, .totals-card, .footer-section {
                page-break-inside: avoid;
            }
        }
    </style>
</head>
<body>
    <div class="page-container">
        <!-- Top Header with Logo & Company GSTIN -->
        <div>
            <div class="top-header">
                <div class="company-brand">
                    <img src="${BILLING_LOGO_DATA_URI}" alt="Logo" class="company-logo" 
                        onerror="this.src='/assets/logo-billing.png'; this.onerror=null;">
                    <div>
                        <div class="company-title">UDHAYAA TEXTILES</div>
                        <div style="font-size:9.5px;color:#64748b;font-weight:600">Garment Manufacturing &amp; Processing Unit</div>
                    </div>
                </div>
                <div class="company-info-text">
                    <div style="font-weight:600;color:#0f172a">63/A Senthur Nagar, Ellapalayam Road</div>
                    <div>Periyasemur, Erode, Tamil Nadu 638004</div>
                    <div>Phone: +91 77083 33813 · Email: info@udhayaatextiles.com</div>
                    <div><span class="gst-badge">GSTIN: 33ANGPU7147M1ZE</span></div>
                </div>
            </div>

            <!-- Document Ribbon -->
            <div class="doc-banner">
                <div class="doc-type-title">${docTitle}</div>
                <div class="doc-meta-item"><strong>Doc #:</strong> ${doc.invoice_number || 'N/A'}</div>
                <div class="doc-meta-item"><strong>Date:</strong> ${doc.date || ''}</div>
                ${doc.due_date ? `<div class="doc-meta-item"><strong>Due Date:</strong> ${doc.due_date}</div>` : ''}
                <div class="doc-meta-item"><strong>Place of Supply:</strong> 33-Tamil Nadu</div>
            </div>

            <!-- Billed To & Bank Details Grid -->
            <div class="info-grid">
                <div class="info-card">
                    <div class="card-label">${meta.contactType === 'vendor' ? (isPayment ? 'Paid To Vendor' : 'Vendor Details') : (isPayment ? 'Received From Customer' : 'Bill To (Buyer)')}</div>
                    <div class="card-name">${doc.contact_name || 'Cash / Counter Customer'}</div>
                    ${doc.contact_gstin ? `<div style="font-weight:600;color:#0f172a">GSTIN: <span style="font-family:monospace">${doc.contact_gstin}</span></div>` : ''}
                    ${contactInfo.address ? `<div>${contactInfo.address}</div>` : ''}
                    ${contactInfo.city ? `<div>${contactInfo.city}</div>` : ''}
                    ${contactInfo.phone ? `<div>Phone: ${contactInfo.phone}</div>` : ''}
                    ${contactInfo.email ? `<div>Email: ${contactInfo.email}</div>` : ''}
                </div>
                <div class="info-card">
                    <div class="card-label">Bank &amp; Remittance Details</div>
                    <div style="font-weight:700;color:#0f172a;margin-bottom:1px">Indian Overseas Bank</div>
                    <div>Branch: Erode Periasemur | A/C Name: Udhayaa Textiles</div>
                    <div style="font-weight:700;color:#0f172a;margin-top:2px">A/C No: <span style="font-family:monospace">134601000036234</span></div>
                    <div style="font-weight:700;color:#0f172a">IFSC: <span style="font-family:monospace">IOBA0001346</span></div>
                    <div style="font-weight:600;color:#2563eb">UPI ID: info.udhayaatextiles-2@okhdfcbank</div>
                </div>
            </div>

            ${isPayment ? `
            <!-- Payment Document Block -->
            <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; padding:12px; margin-bottom:8px;">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0; padding-bottom:8px; margin-bottom:8px;">
                    <div>
                        <div style="font-size:9.5px; text-transform:uppercase; color:#64748b; font-weight:700;">Voucher Type</div>
                        <div style="font-size:14px; font-weight:800; color:#0f172a;">${doc.transaction_type === 'Payment_In' ? 'Payment Received' : 'Payment Outflow'}</div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-size:9.5px; text-transform:uppercase; color:#64748b; font-weight:700;">Voucher Amount</div>
                        <div style="font-size:20px; font-weight:800; color:${doc.transaction_type === 'Payment_In' ? '#008A00' : '#dc2626'};">₹ ${grandTotal.toFixed(2)}</div>
                    </div>
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                    <div>
                        <div style="font-size:9px; text-transform:uppercase; color:#64748b; font-weight:700;">Amount in Words</div>
                        <div style="font-weight:600; color:#1e293b; margin-top:2px;">${amountWords}</div>
                    </div>
                    <div>
                        <div style="font-size:9px; text-transform:uppercase; color:#64748b; font-weight:700;">Linked Document / Ref</div>
                        <div style="font-weight:600; color:#1e293b; margin-top:2px;">${doc.linked_bill_id || 'Direct Payment Voucher'}</div>
                    </div>
                    ${doc.notes ? `
                    <div style="grid-column: span 2; border-top:1px dashed #cbd5e1; padding-top:6px;">
                        <div style="font-size:9px; text-transform:uppercase; color:#64748b; font-weight:700;">Notes &amp; Particulars</div>
                        <div style="font-weight:500; color:#334155; margin-top:2px;">${doc.notes}</div>
                    </div>` : ''}
                </div>
            </div>
            ` : `
            <!-- Items Table -->
            <div class="table-wrap">
                <table>
                    <thead>
                        <tr>
                            <th style="width:28px;text-align:center">#</th>
                            <th>Description</th>
                            <th style="width:55px;text-align:center">HSN</th>
                            <th style="width:65px;text-align:center">Qty</th>
                            <th style="width:75px;text-align:right">Rate</th>
                            <th style="width:50px;text-align:center">Disc</th>
                            <th style="width:85px;text-align:right">Tax</th>
                            <th style="width:90px;text-align:right">Total Amount</th>
                        </tr>
                    </thead>
                    <tbody>${itemsHTML}</tbody>
                </table>
            </div>

            <!-- Summary & Totals -->
            <div class="summary-grid">
                <div class="amount-words-box">
                    <div style="font-size:9px;text-transform:uppercase;color:#64748b;font-weight:700;margin-bottom:2px">Amount in Words:</div>
                    <div style="font-weight:700;color:#0f172a;font-style:italic">${amountWords}</div>
                    <div style="font-size:9px;color:#64748b;margin-top:6px;border-top:1px dashed #cbd5e1;padding-top:4px">
                        Tax Summary: CGST (2.5%): ₹${cgst} | SGST (2.5%): ₹${sgst} | Total Tax: ₹${Number(taxTotal).toFixed(2)}
                    </div>
                </div>
                <div class="totals-card">
                    <div class="totals-row"><span>Subtotal (Taxable Value):</span><span style="font-weight:600">₹ ${subtotal.toFixed(2)}</span></div>
                    ${doc.discount > 0 ? `<div class="totals-row"><span>Discount:</span><span style="color:#dc2626">−₹ ${Number(doc.discount).toFixed(2)}</span></div>` : ''}
                    <div class="totals-row"><span>CGST (2.5%):</span><span>₹ ${cgst}</span></div>
                    <div class="totals-row"><span>SGST (2.5%):</span><span>₹ ${sgst}</span></div>
                    <div class="totals-row grand"><span>Total Amount:</span><span>₹ ${grandTotal.toFixed(2)}</span></div>
                </div>
            </div>
            `}
        </div>

        <!-- Terms & Conditions + Authorized Signatory Footer -->
        <div class="footer-section">
            <div class="terms-box">
                <h4>Terms &amp; Conditions</h4>
                <ul>
                    <li>Payment: 50% advance to confirm order; 20% on dyeing; 30% prior to dispatch.</li>
                    <li>Goods once sold will not be taken back or exchanged without prior approval.</li>
                    <li>Disputes if any are subject to Erode jurisdiction only.</li>
                    <li>All rates valid for 7 days from document generation date.</li>
                </ul>
            </div>
            <div class="sign-card">
                <div class="sign-line"></div>
                <div style="font-size:10px;font-weight:700;color:#0f172a">For UDHAYAA TEXTILES</div>
                <div style="font-size:8.5px;color:#64748b">Authorized Signatory</div>
            </div>
        </div>
    </div>

    <script>
        window.onload = function() {
            setTimeout(function() { window.print(); }, 400);
        };
    </script>
</body>
</html>`;
}
