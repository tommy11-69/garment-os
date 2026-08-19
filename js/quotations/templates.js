import { SelectInput, TextInput, TextareaInput } from '../components/inputs.js';
import { BottomSheet } from '../components/index.js';
import { api } from '../services/api.js';

export function getQuotationsHTML(quotations) {
    if (!quotations || quotations.length === 0) {
        return `<div class="p-8 text-center text-secondary">
            <span class="material-symbols-outlined text-[48px] mb-2 opacity-50">inbox</span>
            <p>No quotations found.</p>
        </div>`;
    }
    return quotations.map(q => {
        let statusColor = "bg-yellow-500/10 text-yellow-600";
        if (q.status === 'Sent') statusColor = "bg-blue-500/10 text-blue-600";
        if (q.status === 'Accepted') statusColor = "bg-green-500/10 text-green-600";
        if (q.status === 'Rejected') statusColor = "bg-red-500/10 text-red-600";

        return `
        <div onclick="window.openQuotationDetails('${q.id}')" class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-lg flex flex-col gap-md active-scale transition-apple cursor-pointer shadow-sm">
            <div class="flex justify-between items-start">
                <div>
                    <h3 class="text-[17px] font-bold text-on-surface mb-0.5">${q.customerName}</h3>
                    <p class="text-[13px] text-secondary">ID: ${q.id} • Date: ${q.date}</p>
                </div>
                <span class="inline-flex px-2.5 py-1 rounded-full text-[12px] font-semibold ${statusColor}">${q.status}</span>
            </div>
            
            <div class="flex justify-between items-center pt-xs border-t border-outline-variant/30">
                <span class="text-[13px] text-secondary font-medium">${q.items ? q.items.length : 0} items</span>
                <span class="text-[16px] font-bold text-on-surface">₹${q.totalAmount ? q.totalAmount.toLocaleString() : '0.00'}</span>
            </div>
        </div>
        `;
    }).join('');
}

export async function getQuotationSheetsHTML() {
    let customers = [];
    try {
        customers = await api.getCustomers();
    } catch (e) {
        console.error("Failed to fetch customers for quotations:", e);
    }
    const customerOptions = [
        {label: 'Select Customer', value: ''},
        {label: '+ Create New Customer', value: 'NEW_CUSTOMER'},
        ...customers.map(c => ({label: c.name, value: c.id}))
    ];

    // Create / Edit Quotation Bottom Sheet
    const createQuotationContent = `
    <form id="create-quotation-form" onsubmit="event.preventDefault();" class="flex flex-col gap-5">
        <input type="hidden" id="quotation-edit-id" value="">
        
        <div>
            ${SelectInput({ label: 'Select Customer *', id: 'quote-customer-select', options: customerOptions })}
        </div>

        <!-- Optional Column Toggles -->
        <div class="bg-surface-variant/35 p-4 rounded-xl border border-outline-variant flex flex-col gap-3">
            <span class="text-[13px] font-semibold text-secondary">Configuration Options</span>
            <div class="flex gap-4 items-center flex-wrap">
                <label class="flex items-center gap-2 text-[14px] font-semibold text-on-surface cursor-pointer select-none">
                    <input type="checkbox" id="quote-toggle-fabric" onchange="window.toggleQuotationColumns()" class="rounded border-outline-variant text-primary focus:ring-primary">
                    Fabric & Processing
                </label>
                <label class="flex items-center gap-2 text-[14px] font-semibold text-on-surface cursor-pointer select-none">
                    <input type="checkbox" id="quote-toggle-colour" onchange="window.toggleQuotationColumns()" class="rounded border-outline-variant text-primary focus:ring-primary">
                    Colour
                </label>
                <label class="flex items-center gap-2 text-[14px] font-semibold text-on-surface cursor-pointer select-none">
                    <input type="checkbox" id="quote-toggle-tax" checked onchange="window.toggleQuotationColumns()" class="rounded border-outline-variant text-primary focus:ring-primary">
                    Include GST (5%)
                </label>
            </div>
        </div>
        
        <div class="border-t border-outline-variant/30 pt-4">
            <h3 class="text-[16px] font-bold text-on-surface mb-3 flex items-center gap-2">
                <span class="material-symbols-outlined text-[20px] text-primary">local_mall</span>
                Items
            </h3>
            
            <!-- Items Added Table -->
            <div class="bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden mb-4 overflow-x-auto">
                <table class="w-full text-left border-collapse text-[13px] min-w-[500px]">
                    <thead id="quote-items-thead">
                        <!-- Will be dynamically updated by toggleQuotationColumns() -->
                    </thead>
                    <tbody id="quote-items-tbody">
                        <tr>
                            <td colspan="9" class="p-4 text-center text-secondary italic">No items added yet.</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            
            <!-- Add Item Section -->
            <div class="bg-surface-variant/20 p-4 rounded-2xl border border-outline-variant flex flex-col gap-3">
                <h4 class="text-[14px] font-semibold text-on-surface">Add Item</h4>
                <div class="flex flex-col gap-3">
                    ${TextInput({ label: 'Item Name *', id: 'item-name', placeholder: 'e.g. Organic Cotton Tee' })}
                    
                    <div id="div-item-fabric" class="hidden">
                        ${TextInput({ label: 'Fabric & Processing', id: 'item-fabric', placeholder: 'e.g. 100% Cotton Jersey, Dyed' })}
                    </div>
                    <div id="div-item-colour" class="hidden">
                        ${TextInput({ label: 'Colour', id: 'item-colour', placeholder: 'e.g. Navy Blue' })}
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                        ${TextInput({ label: 'Quantity *', id: 'item-qty', type: 'number', placeholder: '0' })}
                        ${TextInput({ label: 'Price/pc (₹) *', id: 'item-rate', type: 'number', placeholder: '0' })}
                    </div>
                    <button type="button" onclick="window.addQuotationItem()" class="w-full py-3 bg-primary/10 text-primary text-[14px] font-semibold rounded-xl active-scale transition-apple">
                        + Add Item to Proposal
                    </button>
                </div>
            </div>
        </div>

        <div class="border-t border-outline-variant/30 pt-4 flex flex-col gap-3">
            <div class="flex justify-between items-center text-[14px] text-secondary">
                <span>Subtotal</span>
                <span id="quote-subtotal">₹0.00</span>
            </div>
            <div id="quote-tax-container" class="flex justify-between items-center text-[14px] text-secondary">
                <span>Tax (5% GST)</span>
                <span id="quote-tax">₹0.00</span>
            </div>
            <div class="flex justify-between items-center border-t border-outline-variant/30 pt-2 text-[16px] font-bold text-on-surface">
                <span>Grand Total</span>
                <span id="quote-grandtotal">₹0.00</span>
            </div>
        </div>

        <div>
            ${TextareaInput({ label: 'Notes / Comments', id: 'quote-notes', placeholder: 'Add terms or additional info...' })}
        </div>
    </form>
    `;

    const createFooter = `
    <button onclick="closeSheet('createQuotationSheet')" class="flex-1 bg-surface-container-high text-on-surface font-semibold text-[15px] py-3.5 rounded-xl active-scale transition-apple">
        Cancel
    </button>
    <button onclick="window.saveQuotationForm()" class="flex-1 bg-primary text-white font-semibold text-[15px] py-3.5 rounded-xl active-scale transition-apple shadow-sm">
        Save Quotation
    </button>
    `;

    // View Details Sheet
    const detailsContent = `
    <div id="quotationDetailsSheet-inner-content" class="flex flex-col gap-5">
        <!-- Will be loaded dynamically -->
    </div>
    `;

    const detailsFooter = `
    <button onclick="closeSheet('quotationDetailsSheet')" class="flex-1 bg-surface-container-high text-on-surface font-semibold text-[15px] py-3.5 rounded-xl active-scale transition-apple">
        Close
    </button>
    `;

    return `
    ${BottomSheet({ id: 'createQuotationSheet', title: 'New Quotation / Proposal', content: createQuotationContent, footerContent: createFooter, height: '90vh' })}
    ${BottomSheet({ id: 'quotationDetailsSheet', title: 'Quotation Details', content: detailsContent, footerContent: detailsFooter, height: '85vh' })}
    `;
}

export function getQuotationDetailsContentHTML(q) {
    let statusColor = "bg-yellow-500/10 text-yellow-600";
    if (q.status === 'Sent') statusColor = "bg-blue-500/10 text-blue-600";
    if (q.status === 'Accepted') statusColor = "bg-green-500/10 text-green-600";
    if (q.status === 'Rejected') statusColor = "bg-red-500/10 text-red-600";

    const showFabric = q.showFabric || false;
    const showColour = q.showColour || false;
    const showTax = q.showTax !== false; // defaults to true

    const itemsRows = q.items.map((item, idx) => `
    <tr class="border-b border-outline-variant/30">
        <td class="p-3 text-center text-secondary">${idx + 1}</td>
        <td class="p-3 font-medium text-[14px] text-on-surface">${item.name}</td>
        ${showFabric ? `<td class="p-3 text-secondary">${item.fabric || '-'}</td>` : ''}
        ${showColour ? `<td class="p-3 text-secondary">${item.colour || '-'}</td>` : ''}
        <td class="p-3 text-right text-secondary">${item.qty}</td>
        <td class="p-3 text-right text-secondary">₹${item.rate.toLocaleString()}</td>
        ${showTax ? `<td class="p-3 text-right text-secondary">₹${(item.taxPerPc || 0).toLocaleString(undefined, {maximumFractionDigits: 2})}</td>` : ''}
        <td class="p-3 text-right font-semibold text-on-surface">₹${item.total.toLocaleString()}</td>
    </tr>
    `).join('');

    const subtotal = q.items.reduce((sum, item) => sum + (item.qty * item.rate), 0);
    const tax = q.items.reduce((sum, item) => sum + (item.qty * (item.taxPerPc || 0)), 0);

    return `
    <div class="flex flex-col gap-4">
        <div class="flex justify-between items-center bg-surface-container-lowest p-md rounded-2xl border border-outline-variant shadow-sm">
            <div>
                <span class="text-[13px] text-secondary">Status</span>
                <div class="mt-1 font-semibold"><span class="inline-flex px-2.5 py-1 rounded-full text-[12px] font-semibold ${statusColor}">${q.status}</span></div>
            </div>
            <div class="text-right">
                <span class="text-[13px] text-secondary">Total Amount</span>
                <div class="text-[18px] font-bold text-on-surface mt-1">₹${q.totalAmount.toLocaleString()}</div>
            </div>
        </div>

        <div class="flex flex-col gap-1.5">
            <span class="text-[12px] font-bold uppercase tracking-wider text-secondary">Customer</span>
            <div class="text-[16px] font-semibold text-on-surface">${q.customerName}</div>
        </div>

        <div class="flex flex-col gap-1.5">
            <span class="text-[12px] font-bold uppercase tracking-wider text-secondary">Proposal Date</span>
            <div class="text-[14px] text-on-surface">${q.date}</div>
        </div>

        <div class="border-t border-outline-variant/30 pt-4">
            <span class="text-[12px] font-bold uppercase tracking-wider text-secondary block mb-2">Proposal Items</span>
            <div class="bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden overflow-x-auto">
                <table class="w-full text-left border-collapse text-[13px] min-w-[600px]">
                    <thead>
                        <tr class="bg-surface-variant text-secondary border-b border-outline-variant">
                            <th class="p-3 font-semibold text-center" style="width: 50px;">S.No</th>
                            <th class="p-3 font-semibold">Item Name</th>
                            ${showFabric ? `<th class="p-3 font-semibold">Fabric & Processing</th>` : ''}
                            ${showColour ? `<th class="p-3 font-semibold">Colour</th>` : ''}
                            <th class="p-3 font-semibold text-right">Quantity</th>
                            <th class="p-3 font-semibold text-right">Price/pc</th>
                            ${showTax ? `<th class="p-3 font-semibold text-right">Tax/pc</th>` : ''}
                            <th class="p-3 font-semibold text-right">Total Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsRows}
                    </tbody>
                </table>
            </div>
        </div>

        <div class="flex flex-col gap-2 border-t border-outline-variant/30 pt-4">
            <div class="flex justify-between items-center text-[13px] text-secondary">
                <span>Subtotal</span>
                <span>₹${subtotal.toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
            </div>
            ${showTax ? `
            <div class="flex justify-between items-center text-[13px] text-secondary">
                <span>Tax (5% GST)</span>
                <span>₹${tax.toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
            </div>
            ` : ''}
            <div class="flex justify-between items-center text-[15px] font-bold text-on-surface pt-1 border-t border-outline-variant/30">
                <span>Total Proposal Value</span>
                <span>₹${q.totalAmount.toLocaleString()}</span>
            </div>
        </div>

        ${q.notes ? `
        <div class="border-t border-outline-variant/30 pt-4">
            <span class="text-[12px] font-bold uppercase tracking-wider text-secondary block mb-1">Notes / Terms</span>
            <p class="text-[14px] text-on-surface bg-surface-variant/30 p-3 rounded-xl border border-outline-variant/50">${q.notes}</p>
        </div>
        ` : ''}

        <!-- Status Transition Actions -->
        <div class="flex flex-col gap-3 border-t border-outline-variant/30 pt-5 mt-3">
            <span class="text-[12px] font-bold uppercase tracking-wider text-secondary">Actions</span>
            <div class="grid grid-cols-2 gap-3">
                ${q.status === 'Draft' ? `
                <button onclick="window.changeQuotationStatus('${q.id}', 'Sent')" class="py-3 bg-primary text-white font-semibold text-[14px] rounded-xl active-scale transition-apple shadow-sm flex items-center justify-center gap-2">
                    <span class="material-symbols-outlined text-[18px]">send</span> Mark as Sent
                </button>
                ` : ''}
                ${q.status === 'Sent' ? `
                <button onclick="window.changeQuotationStatus('${q.id}', 'Accepted')" class="py-3 bg-success-container text-success font-semibold text-[14px] rounded-xl active-scale transition-apple flex items-center justify-center gap-2">
                    <span class="material-symbols-outlined text-[18px]">check_circle</span> Accept Proposal
                </button>
                <button onclick="window.changeQuotationStatus('${q.id}', 'Rejected')" class="py-3 bg-error/10 text-error font-semibold text-[14px] rounded-xl active-scale transition-apple flex items-center justify-center gap-2">
                    <span class="material-symbols-outlined text-[18px]">cancel</span> Reject
                </button>
                ` : ''}
                
                <button onclick="window.printQuotation('${q.id}')" class="py-3 bg-primary/10 text-primary font-semibold text-[14px] rounded-xl active-scale transition-apple flex items-center justify-center gap-2 col-span-2 shadow-sm">
                    <span class="material-symbols-outlined text-[18px]">print</span> Print / Export PDF
                </button>
                <button onclick="window.editQuotation('${q.id}')" class="py-3 bg-primary/10 text-primary font-semibold text-[14px] rounded-xl active-scale transition-apple flex items-center justify-center gap-2 col-span-2 shadow-sm">
                    <span class="material-symbols-outlined text-[18px]">edit</span> Edit Proposal
                </button>
                <button onclick="window.deleteQuotation('${q.id}')" class="py-3 bg-error/10 text-error font-semibold text-[14px] rounded-xl active-scale transition-apple flex items-center justify-center gap-2 col-span-2">
                    <span class="material-symbols-outlined text-[18px]">delete</span> Delete Proposal
                </button>
            </div>
        </div>
    </div>
    `;
}
