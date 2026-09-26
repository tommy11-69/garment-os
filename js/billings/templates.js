// js/billings/templates.js — Modular UI Template Generators for the Billings Workbench
import { fmtCurrency, fmtDate } from './calculator.js';
import { renderInvoicePageMarkup, renderPrintableHTMLDocument } from './document-renderer.js';

// Document type metadata
export const BILLING_TYPES = {
    Quotation:      { label: 'Quotations',       icon: 'request_quote',   color: 'text-[#6C63FF]', bg: 'bg-[#6C63FF]/10', contactType: 'customer', statuses: ['Draft','Sent','Converted','Expired','Void'] },
    Sales_Bill:     { label: 'Sales Bills',       icon: 'receipt_long',    color: 'text-[#00B386]', bg: 'bg-[#00B386]/10', contactType: 'customer', statuses: ['Draft','Finalized','Paid','Partially_Paid','Void'] },
    Payment_In:     { label: 'Payments In',       icon: 'payments',        color: 'text-[#0071E3]', bg: 'bg-[#0071E3]/10', contactType: 'customer', statuses: ['Draft','Finalized','Void'] },
    Purchase_Bill:  { label: 'Purchase Bills',    icon: 'local_shipping',  color: 'text-[#FF9F0A]', bg: 'bg-[#FF9F0A]/10', contactType: 'vendor',   statuses: ['Draft','Finalized','Paid','Partially_Paid','Void'] },
    Purchase_Order: { label: 'Purchase Orders',   icon: 'inventory_2',     color: 'text-[#FF6B00]', bg: 'bg-[#FF6B00]/10', contactType: 'vendor',   statuses: ['Draft','Sent','Received','Void'] },
    Payment_Out:    { label: 'Payments Out',      icon: 'outgoing_mail',   color: 'text-[#FF3B30]', bg: 'bg-[#FF3B30]/10', contactType: 'vendor',   statuses: ['Draft','Finalized','Void'] },
};

export const STATUS_BADGE = {
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

export { fmtCurrency, fmtDate };

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

// ── Document Card ──────────────────────────────────────────────────────
export function getBillingCardHTML(doc, isSelected = false) {
    const meta = BILLING_TYPES[doc.transaction_type] || BILLING_TYPES.Quotation;
    const badgeClass = STATUS_BADGE[doc.status] || 'bg-surface-variant text-secondary';
    const displayStatus = (doc.status || 'Draft').replace('_', ' ');
    const balance = (doc.grand_total || 0) - (doc.amount_paid || 0);
    const isPayment = doc.transaction_type === 'Payment_In' || doc.transaction_type === 'Payment_Out';

    return `
    <div onclick="window.selectBillingDoc('${doc.id}')"
         class="billing-card bg-surface-container-lowest border ${isSelected ? 'border-primary ring-2 ring-primary/20 shadow-md' : 'border-outline-variant/50'} rounded-2xl p-4 active-scale transition-all cursor-pointer">
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
                    <div class="text-[12px] text-secondary mt-0.5 flex items-center gap-2">
                        <span>${fmtDate(doc.date)}</span>
                        ${doc.order_id ? `<span class="text-primary font-mono text-[11px] bg-primary/10 px-1.5 py-0.2 rounded">Order Linked</span>` : ''}
                    </div>
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
        Payment_In: 'AG-PIN',
        Purchase_Bill: 'AG-PBI',
        Purchase_Order: 'AG-PO',
        Payment_Out: 'AG-POT'
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

// ── Create / Edit Sheet HTML ───────────────────────────────────────────
export function getCreateSheetHTML(type, contacts, inventoryItems, linkedBills = [], nextSerial = '') {
    const meta = BILLING_TYPES[type] || BILLING_TYPES.Quotation;
    const isPayment = type === 'Payment_In' || type === 'Payment_Out';
    const today = new Date().toISOString().split('T')[0];

    const contactOptions = contacts.map(c => 
        `<option value="${c.id}" data-gstin="${c.gst || c.gstin || c.gstNumber || c.taxId || ''}" data-state="${c.state || ''}">${c.name}${c.company ? ` (${c.company})` : ''}</option>`
    ).join('');

    const linkedBillOptions = linkedBills.length > 0 ? 
        linkedBills.map(b => `<option value="${b.id}">${b.invoice_number} — ${fmtCurrency(b.grand_total - (b.amount_paid||0))} due</option>`).join('') : 
        '<option value="">None (standalone payment)</option>';

    const inventoryOptions = inventoryItems.map(i =>
        `<option value="${i.id}" data-price="${i.costPrice || 0}" data-name="${i.name}" data-hsn="${i.hsn || '6109'}">${i.name} (${i.sku || 'SKU'}) — Stock: ${i.quantity} ${i.unit}</option>`
    ).join('');

    const taxOptions = [0, 5, 12, 18, 28].map(r =>
        `<option value="${r}" ${r === 5 ? 'selected' : ''}>${r}% GST</option>`
    ).join('');

    return `
    <div id="billingCreateSheet-overlay" class="bottom-sheet-overlay" onclick="window.closeBillingCreateSheet()"></div>
    <div id="billingCreateSheet-content" class="bottom-sheet-content flex flex-col" style="height: 95vh; max-height: 95vh;">
        <div class="sheet-handle"></div>
        
        <!-- Header -->
        <div class="px-lg pb-md pt-sm flex justify-between items-center border-b border-outline-variant/30 flex-shrink-0">
            <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl ${meta.bg} flex items-center justify-center">
                    <span class="material-symbols-outlined text-[18px] ${meta.color}">${meta.icon}</span>
                </div>
                <div>
                    <h2 id="billingCreateSheet-title" class="text-[18px] font-bold text-on-surface">New ${meta.label.slice(0,-1)}</h2>
                    <p id="billingCreateSheet-subtext" class="text-[12px] text-secondary font-mono">${nextSerial ? `Doc No: ${nextSerial}` : 'Auto-assigned'}</p>
                </div>
            </div>
            <button type="button" onclick="window.closeBillingCreateSheet()" class="w-9 h-9 rounded-full bg-surface-variant flex items-center justify-center active-scale">
                <span class="material-symbols-outlined text-[20px] text-secondary">close</span>
            </button>
        </div>

        <!-- Form Body -->
        <div class="flex-1 overflow-y-auto p-lg flex flex-col gap-4 bg-background">
            <input type="hidden" id="billing-edit-id" value="">
            <input type="hidden" id="billing-type" value="${type}">
            <input type="hidden" id="billing-order-id" value="">

            <!-- Contact & Place of Supply -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                    <label class="text-[13px] font-semibold text-on-surface mb-1.5 block">${meta.contactType === 'vendor' ? 'Vendor' : 'Customer'} *</label>
                    <select id="billing-contact-select" onchange="window.onContactSelectChange()"
                        class="w-full bg-surface border border-outline-variant rounded-xl px-4 py-3 text-[14px] text-on-surface focus:ring-2 focus:ring-primary/20 outline-none">
                        <option value="">Select ${meta.contactType === 'vendor' ? 'vendor' : 'customer'}...</option>
                        ${contactOptions}
                    </select>
                    <div id="billing-contact-info" class="mt-1 text-[12px] text-primary font-mono hidden"></div>
                </div>
                <div>
                    <label class="text-[13px] font-semibold text-on-surface mb-1.5 block">Place of Supply *</label>
                    <input type="text" id="billing-place-of-supply" value="33-Tamil Nadu" placeholder="e.g. 33-Tamil Nadu"
                        class="w-full bg-surface border border-outline-variant rounded-xl px-4 py-3 text-[14px] text-on-surface focus:ring-2 focus:ring-primary/20 outline-none">
                </div>
            </div>

            <!-- Date & Due Date -->
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="text-[13px] font-semibold text-on-surface mb-1.5 block">Date *</label>
                    <input type="date" id="billing-date" value="${today}" class="w-full bg-surface border border-outline-variant rounded-xl px-4 py-3 text-[14px] text-on-surface focus:ring-2 focus:ring-primary/20 outline-none">
                </div>
                <div>
                    <label class="text-[13px] font-semibold text-on-surface mb-1.5 block">${isPayment ? 'Payment Reference' : 'Due Date'}</label>
                    <input type="${isPayment ? 'text' : 'date'}" id="billing-due-date" placeholder="${isPayment ? 'Cheque / UTR / Cash' : ''}" 
                        class="w-full bg-surface border border-outline-variant rounded-xl px-4 py-3 text-[14px] text-on-surface focus:ring-2 focus:ring-primary/20 outline-none">
                </div>
            </div>

            ${isPayment ? `
            <!-- Payment Amount & Linked Bill -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                    <label class="text-[13px] font-semibold text-on-surface mb-1.5 block">Payment Amount (₹) *</label>
                    <input type="number" id="billing-payment-amount" min="0" step="0.01" placeholder="0.00" 
                        class="w-full bg-surface border border-outline-variant rounded-xl px-4 py-3 text-[15px] font-bold text-on-surface focus:ring-2 focus:ring-primary/20 outline-none">
                </div>
                <div>
                    <label class="text-[13px] font-semibold text-on-surface mb-1.5 block">Link to ${type === 'Payment_In' ? 'Sales Bill' : 'Purchase Bill'}</label>
                    <select id="billing-linked-bill" class="w-full bg-surface border border-outline-variant rounded-xl px-4 py-3 text-[14px] text-on-surface focus:ring-2 focus:ring-primary/20 outline-none">
                        ${linkedBillOptions}
                    </select>
                </div>
            </div>
            ` : `
            <!-- Line Items Editor -->
            <div>
                <div class="flex items-center justify-between mb-2">
                    <label class="text-[14px] font-bold text-on-surface">Line Items</label>
                    <span class="text-[12px] text-secondary">Add items below</span>
                </div>

                <!-- Item Input Sub-form -->
                <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-3 flex flex-col gap-3 mb-3 shadow-sm">
                    <input type="hidden" id="billing-item-edit-index" value="-1">
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div>
                            <input type="text" id="billing-item-name" placeholder="Item name / description *"
                                class="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:ring-2 focus:ring-primary/20 outline-none">
                        </div>
                        <div>
                            <select id="billing-item-inventory" onchange="window.onInventoryItemSelect()"
                                class="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:ring-2 focus:ring-primary/20 outline-none">
                                <option value="">Select Inventory SKU (optional)...</option>
                                ${inventoryOptions}
                            </select>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        <div>
                            <label class="text-[11px] text-secondary mb-1 block">HSN/SAC</label>
                            <input type="text" id="billing-item-hsn" value="6109" placeholder="6109"
                                class="w-full bg-surface border border-outline-variant rounded-lg px-2.5 py-1.5 text-[13px] text-on-surface font-mono outline-none">
                        </div>
                        <div>
                            <label class="text-[11px] text-secondary mb-1 block">Qty</label>
                            <input type="number" id="billing-item-qty" min="0.01" step="1" placeholder="1" 
                                class="w-full bg-surface border border-outline-variant rounded-lg px-2.5 py-1.5 text-[13px] text-on-surface outline-none">
                        </div>
                        <div>
                            <label class="text-[11px] text-secondary mb-1 block">Rate (₹)</label>
                            <input type="number" id="billing-item-price" min="0" step="0.01" placeholder="0.00" 
                                class="w-full bg-surface border border-outline-variant rounded-lg px-2.5 py-1.5 text-[13px] text-on-surface outline-none">
                        </div>
                        <div>
                            <label class="text-[11px] text-secondary mb-1 block">Disc %</label>
                            <input type="number" id="billing-item-discount" min="0" max="100" step="0.01" placeholder="0" 
                                class="w-full bg-surface border border-outline-variant rounded-lg px-2.5 py-1.5 text-[13px] text-on-surface outline-none">
                        </div>
                        <div>
                            <label class="text-[11px] text-secondary mb-1 block">GST %</label>
                            <select id="billing-item-tax"
                                class="w-full bg-surface border border-outline-variant rounded-lg px-2 py-1.5 text-[13px] text-on-surface outline-none">
                                ${taxOptions}
                            </select>
                        </div>
                    </div>

                    <div class="flex gap-2">
                        <button type="button" id="billing-item-submit-btn" onclick="window.addBillingItem()"
                            class="flex-1 bg-primary text-white font-semibold py-2 rounded-lg text-[13px] active-scale flex items-center justify-center gap-1">
                            <span class="material-symbols-outlined text-[16px]">add_circle</span> Add Item
                        </button>
                        <button type="button" id="billing-item-cancel-edit-btn" onclick="window.cancelEditBillingItem()"
                            class="hidden px-4 bg-surface-variant text-secondary font-semibold py-2 rounded-lg text-[13px] active-scale">
                            Cancel
                        </button>
                    </div>
                </div>

                <!-- Added Items List Container -->
                <div id="billing-items-list" class="flex flex-col gap-2">
                    <div id="billing-items-empty" class="text-[13px] text-secondary italic text-center py-3 bg-surface-container-lowest border border-dashed border-outline-variant rounded-xl">
                        No items added yet. Fill the inputs above to add line items.
                    </div>
                </div>
            </div>

            <!-- Financial Summary Box -->
            <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 flex flex-col gap-2">
                <div class="flex justify-between text-[13px] text-secondary">
                    <span>Gross Subtotal</span><span id="billing-display-subtotal" class="font-medium text-on-surface">₹0.00</span>
                </div>
                <div class="flex justify-between text-[13px] text-secondary">
                    <span>Total Discount</span><span id="billing-display-discount" class="font-medium text-error">−₹0.00</span>
                </div>
                <div class="flex justify-between text-[13px] text-secondary">
                    <span>Total GST</span><span id="billing-display-tax" class="font-medium text-on-surface">₹0.00</span>
                </div>
                <div class="flex justify-between text-[13px] text-secondary">
                    <span>Round Off</span><span id="billing-display-roundoff" class="font-medium text-on-surface">₹0.00</span>
                </div>
                <div class="flex justify-between text-[16px] font-bold text-on-surface border-t border-outline-variant/30 pt-2.5 mt-1">
                    <span>Grand Total</span><span id="billing-display-grand" class="text-primary font-bold">₹0.00</span>
                </div>
            </div>
            `}

            <!-- Notes -->
            <div>
                <label class="text-[13px] font-semibold text-on-surface mb-1.5 block">Notes / Terms</label>
                <textarea id="billing-notes" rows="2" placeholder="Delivery terms, special remarks..."
                    class="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-[14px] text-on-surface focus:ring-2 focus:ring-primary/20 outline-none resize-none"></textarea>
            </div>
        </div>

        <!-- Action Footer -->
        <div class="p-4 border-t border-outline-variant/30 bg-surface-container-lowest safe-bottom flex gap-3 flex-shrink-0">
            <button type="button" onclick="window.closeBillingCreateSheet()"
                class="flex-1 bg-surface-container-high text-on-surface font-semibold py-3.5 rounded-xl active-scale">Cancel</button>
            <button type="button" onclick="window.saveBillingDraft()"
                class="flex-1 bg-surface-variant text-on-surface font-semibold py-3.5 rounded-xl active-scale">Save Draft</button>
            <button type="button" onclick="window.saveBillingAndFinalize()"
                class="flex-1 bg-primary text-white font-semibold py-3.5 rounded-xl shadow-sm active-scale">
                ${isPayment ? 'Confirm Payment' : 'Save & Finalize'}
            </button>
        </div>
    </div>`;
}

// ── Detail & Live Preview Sheet HTML ──────────────────────────────────
export function getBillingDetailsHTML(doc, contactInfo = {}) {
    const meta = BILLING_TYPES[doc.transaction_type] || BILLING_TYPES.Quotation;
    const isQuotation = doc.transaction_type === 'Quotation';
    const isSalesBill = doc.transaction_type === 'Sales_Bill';
    const isDraft = doc.status === 'Draft' || doc.status === 'Sent';
    const isVoid = doc.status === 'Void';
    const isPayment = doc.transaction_type === 'Payment_In' || doc.transaction_type === 'Payment_Out';

    const canvasMarkup = renderInvoicePageMarkup(doc, contactInfo);

    return `
    <div class="flex flex-col gap-4 p-md">
        <!-- Top Toolbar with Actions -->
        <div class="flex flex-wrap items-center justify-between gap-3 bg-surface-container-lowest border border-outline-variant/50 rounded-2xl p-4">
            <div>
                <div class="text-[12px] text-secondary font-mono">${doc.invoice_number}</div>
                <div class="text-[18px] font-bold text-on-surface">${doc.contact_name}</div>
            </div>
            <div class="flex items-center gap-2 flex-wrap">
                <button type="button" onclick="window.printBillingDoc('${doc.id}')"
                    class="bg-primary text-white font-semibold px-4 py-2 rounded-xl active-scale text-[13px] flex items-center gap-1.5 shadow-sm">
                    <span class="material-symbols-outlined text-[17px]">print</span> Print / PDF
                </button>
                <button type="button" onclick="window.duplicateBillingDoc('${doc.id}')"
                    class="bg-surface-variant text-on-surface font-semibold px-3 py-2 rounded-xl active-scale text-[13px] flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-[17px]">content_copy</span> Duplicate
                </button>
                ${!isVoid && isDraft ? `
                <button type="button" onclick="window.finalizeBillingDoc('${doc.id}')"
                    class="bg-[#00B386] text-white font-semibold px-3.5 py-2 rounded-xl active-scale text-[13px] flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-[17px]">check_circle</span> Finalize
                </button>
                <button type="button" onclick="window.editBillingDoc('${doc.id}')"
                    class="bg-surface-container-high text-on-surface font-semibold px-3 py-2 rounded-xl active-scale text-[13px] flex items-center gap-1">
                    <span class="material-symbols-outlined text-[17px]">edit</span> Edit
                </button>
                ` : ''}
                ${isQuotation && !isVoid && doc.status !== 'Converted' ? `
                <button type="button" onclick="window.convertBillingToInvoice('${doc.id}')"
                    class="bg-[#6C63FF] text-white font-semibold px-3.5 py-2 rounded-xl active-scale text-[13px] flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-[17px]">receipt_long</span> Convert to Bill
                </button>
                ` : ''}
                ${(isSalesBill || doc.transaction_type === 'Purchase_Bill') && (doc.status === 'Finalized' || doc.status === 'Partially_Paid') ? `
                <button type="button" onclick="window.recordPaymentForBill('${doc.id}', '${doc.transaction_type}')"
                    class="bg-[#00B386] text-white font-semibold px-3.5 py-2 rounded-xl active-scale text-[13px] flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-[17px]">payments</span> Record Payment
                </button>
                ` : ''}
                ${!isVoid ? `
                <button type="button" onclick="window.voidBillingDoc('${doc.id}')"
                    class="bg-error/10 text-error font-semibold px-3 py-2 rounded-xl active-scale text-[13px] flex items-center gap-1">
                    <span class="material-symbols-outlined text-[17px]">block</span> Void
                </button>
                ` : `
                <button type="button" onclick="window.deleteBillingVoid('${doc.id}')"
                    class="bg-error text-white font-semibold px-3 py-2 rounded-xl active-scale text-[13px] flex items-center gap-1">
                    <span class="material-symbols-outlined text-[17px]">delete_forever</span> Delete
                </button>
                `}
            </div>
        </div>

        <!-- Embedded Live WYSIWYG Document Canvas -->
        <div class="invoice-viewport border border-outline-variant/40 rounded-2xl overflow-x-auto shadow-inner">
            ${canvasMarkup}
        </div>
    </div>`;
}

// ── Print Generator Wrapper ───────────────────────────────────────────
export function getPrintHTML(doc, contactInfo = {}) {
    return renderPrintableHTMLDocument(doc, contactInfo);
}
