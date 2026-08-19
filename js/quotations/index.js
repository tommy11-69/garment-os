import { api } from '../services/api.js';
import { getQuotationsHTML, getQuotationSheetsHTML, getQuotationDetailsContentHTML } from './templates.js';

let currentQuotations = [];
let currentFilter = 'Draft';
let currentSearchQuery = '';
let currentFormItems = []; // holds items added during create
let activeQuotation = null;

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Render Sheets
    const sheetsContainer = document.getElementById('sheets-container');
    if (sheetsContainer) {
        try {
            sheetsContainer.innerHTML = await getQuotationSheetsHTML();
        } catch (e) {
            console.error("Failed to render quotation sheets:", e);
        }
    }
    
    // 2. Load Data
    try {
        await loadQuotations();
    } catch (e) {
        console.error("Failed to load quotations:", e);
    }

    // 3. Bind events
    document.getElementById('quotations-search-input')?.addEventListener('input', (e) => {
        currentSearchQuery = e.target.value.trim().toLowerCase();
        renderQuotations();
    });
});

async function loadQuotations() {
    try {
        currentQuotations = await api.getQuotations();
        renderQuotations();
    } catch (e) {
        console.error("Failed to load quotations:", e);
        window.showToast?.("Failed to load quotations", "error");
    }
}

function renderQuotations() {
    const container = document.getElementById('quotations-list');
    if (!container) return;

    let filtered = currentQuotations;

    // Filter by status
    if (currentFilter) {
        filtered = filtered.filter(q => q.status === currentFilter);
    }

    // Filter by search
    if (currentSearchQuery) {
        filtered = filtered.filter(q => 
            q.customerName.toLowerCase().includes(currentSearchQuery) ||
            q.id.toLowerCase().includes(currentSearchQuery)
        );
    }

    container.innerHTML = getQuotationsHTML(filtered);
}

window.setQuotationFilter = function (filter) {
    currentFilter = filter;
    
    // Update active tab styles
    const tabs = ['Draft', 'Sent', 'Accepted'];
    tabs.forEach(t => {
        const btn = document.getElementById(`tab-${t.toLowerCase()}s`) || document.getElementById(`tab-${t.toLowerCase()}`);
        if (btn) {
            if (t === filter) {
                btn.classList.add('bg-surface-variant', 'text-on-surface');
                btn.classList.remove('text-secondary');
            } else {
                btn.classList.remove('bg-surface-variant', 'text-on-surface');
                btn.classList.add('text-secondary');
            }
        }
    });

    renderQuotations();
};

window.toggleQuotationColumns = function () {
    const showFabric = document.getElementById('quote-toggle-fabric').checked;
    const showColour = document.getElementById('quote-toggle-colour').checked;
    const showTax = document.getElementById('quote-toggle-tax').checked;

    // Show/hide input fields
    const fabricDiv = document.getElementById('div-item-fabric');
    const colourDiv = document.getElementById('div-item-colour');
    if (fabricDiv) {
        if (showFabric) fabricDiv.classList.remove('hidden');
        else fabricDiv.classList.add('hidden');
    }
    if (colourDiv) {
        if (showColour) colourDiv.classList.remove('hidden');
        else colourDiv.classList.add('hidden');
    }

    // Show/hide tax total row
    const taxContainer = document.getElementById('quote-tax-container');
    if (taxContainer) {
        if (showTax) taxContainer.classList.remove('hidden');
        else taxContainer.classList.add('hidden');
    }

    // Re-render table headers
    const thead = document.getElementById('quote-items-thead');
    if (thead) {
        thead.innerHTML = `
        <tr class="bg-surface-variant text-secondary border-b border-outline-variant">
            <th class="p-3 font-semibold text-center" style="width: 50px;">S.No</th>
            <th class="p-3 font-semibold">Item Name</th>
            ${showFabric ? `<th class="p-3 font-semibold">Fabric & Processing</th>` : ''}
            ${showColour ? `<th class="p-3 font-semibold">Colour</th>` : ''}
            <th class="p-3 font-semibold text-right" style="width: 80px;">Quantity</th>
            <th class="p-3 font-semibold text-right" style="width: 100px;">Price/pc</th>
            ${showTax ? `<th class="p-3 font-semibold text-right" style="width: 100px;">Tax/pc</th>` : ''}
            <th class="p-3 font-semibold text-right" style="width: 120px;">Total Amount</th>
            <th class="p-3 text-center" style="width: 50px;"></th>
        </tr>
        `;
    }

    // If item list is already filled, we should recalculate the item totals based on the tax toggle!
    currentFormItems = currentFormItems.map(item => {
        const taxPerPc = showTax ? (item.rate * 0.05) : 0;
        const total = item.qty * (item.rate + taxPerPc);
        return { ...item, taxPerPc, total };
    });

    renderFormItems();
};

window.openCreateQuotationSheet = function () {
    currentFormItems = [];
    document.getElementById('quotation-edit-id').value = '';
    document.getElementById('quote-customer-select').value = '';
    document.getElementById('quote-notes').value = '';
    
    const titleEl = document.getElementById('createQuotationSheet-title');
    if (titleEl) titleEl.textContent = 'New Quotation / Proposal';
    
    // Clear item inputs
    document.getElementById('item-name').value = '';
    document.getElementById('item-fabric').value = '';
    document.getElementById('item-colour').value = '';
    document.getElementById('item-qty').value = '';
    document.getElementById('item-rate').value = '';
    
    document.getElementById('quote-toggle-fabric').checked = false;
    document.getElementById('quote-toggle-colour').checked = false;
    document.getElementById('quote-toggle-tax').checked = true;
    window.toggleQuotationColumns();
    
    window.openSheet('createQuotationSheet');

    const select = document.getElementById('quote-customer-select');
    if (select) {
        select.onchange = (e) => {
            if (e.target.value === 'NEW_CUSTOMER') {
                select.value = '';
                window.openQuickAddCustomer(async (newCust) => {
                    const customers = await api.getCustomers();
                    select.innerHTML = `<option value="">Select Customer</option><option value="NEW_CUSTOMER">+ Create New Customer</option>` + 
                        customers.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
                    select.value = newCust.id;
                });
            }
        };
    }
};

window.editQuotation = async function (id) {
    try {
        const q = await api.getQuotation(id);
        if (!q) return;

        window.closeSheet('quotationDetailsSheet');
        
        currentFormItems = q.items || [];
        document.getElementById('quotation-edit-id').value = q.id;
        document.getElementById('quote-customer-select').value = q.customerId;
        document.getElementById('quote-notes').value = q.notes || '';
        
        document.getElementById('quote-toggle-fabric').checked = q.showFabric || false;
        document.getElementById('quote-toggle-colour').checked = q.showColour || false;
        document.getElementById('quote-toggle-tax').checked = q.showTax !== false;
        
        const titleEl = document.getElementById('createQuotationSheet-title');
        if (titleEl) titleEl.textContent = 'Edit Quotation / Proposal';

        window.toggleQuotationColumns();
        
        // Clear item inputs
        document.getElementById('item-name').value = '';
        document.getElementById('item-fabric').value = '';
        document.getElementById('item-colour').value = '';
        document.getElementById('item-qty').value = '';
        document.getElementById('item-rate').value = '';
        
        window.openSheet('createQuotationSheet');
    } catch (e) {
        console.error(e);
        window.showToast?.("Failed to edit quotation", "error");
    }
};

window.addQuotationItem = function () {
    const nameInput = document.getElementById('item-name');
    const qtyInput = document.getElementById('item-qty');
    const rateInput = document.getElementById('item-rate');

    const name = nameInput.value.trim();
    const qty = parseInt(qtyInput.value);
    const rate = parseFloat(rateInput.value);

    if (!name || isNaN(qty) || qty <= 0 || isNaN(rate) || rate <= 0) {
        window.showToast?.("Please input valid Item Name, Quantity, and Rate.", "error");
        return;
    }

    const showFabric = document.getElementById('quote-toggle-fabric').checked;
    const showColour = document.getElementById('quote-toggle-colour').checked;
    const showTax = document.getElementById('quote-toggle-tax').checked;

    const fabric = showFabric ? document.getElementById('item-fabric').value.trim() : '';
    const colour = showColour ? document.getElementById('item-colour').value.trim() : '';

    const taxPerPc = showTax ? (rate * 0.05) : 0;
    const total = qty * (rate + taxPerPc);

    currentFormItems.push({ name, fabric, colour, qty, rate, taxPerPc, total });

    // Clear item inputs
    nameInput.value = '';
    document.getElementById('item-fabric').value = '';
    document.getElementById('item-colour').value = '';
    qtyInput.value = '';
    rateInput.value = '';

    renderFormItems();
    window.showToast?.("Item added to proposal", "success");
};

window.removeQuotationItem = function (index) {
    currentFormItems.splice(index, 1);
    renderFormItems();
};

function renderFormItems() {
    const tbody = document.getElementById('quote-items-tbody');
    if (!tbody) return;

    const showFabric = document.getElementById('quote-toggle-fabric') ? document.getElementById('quote-toggle-fabric').checked : false;
    const showColour = document.getElementById('quote-toggle-colour') ? document.getElementById('quote-toggle-colour').checked : false;
    const showTax = document.getElementById('quote-toggle-tax') ? document.getElementById('quote-toggle-tax').checked : true;

    if (currentFormItems.length === 0) {
        const colSpan = 5 + (showFabric ? 1 : 0) + (showColour ? 1 : 0) + (showTax ? 1 : 0);
        tbody.innerHTML = `<tr><td colspan="${colSpan}" class="p-4 text-center text-secondary italic">No items added yet.</td></tr>`;
    } else {
        tbody.innerHTML = currentFormItems.map((item, idx) => `
        <tr class="border-b border-outline-variant/30">
            <td class="p-3 text-center text-secondary">${idx + 1}</td>
            <td class="p-3 text-[13px] font-medium text-on-surface">${item.name}</td>
            ${showFabric ? `<td class="p-3 text-secondary">${item.fabric || '-'}</td>` : ''}
            ${showColour ? `<td class="p-3 text-secondary">${item.colour || '-'}</td>` : ''}
            <td class="p-3 text-right text-secondary">${item.qty}</td>
            <td class="p-3 text-right text-secondary">₹${item.rate.toLocaleString()}</td>
            ${showTax ? `<td class="p-3 text-right text-secondary">₹${(item.taxPerPc || 0).toLocaleString(undefined, {maximumFractionDigits: 2})}</td>` : ''}
            <td class="p-3 text-right font-semibold text-on-surface">₹${item.total.toLocaleString()}</td>
            <td class="p-3 text-center">
                <button type="button" onclick="window.removeQuotationItem(${idx})" class="text-error active-scale transition-apple">
                    <span class="material-symbols-outlined text-[18px]">delete</span>
                </button>
            </td>
        </tr>
        `).join('');
    }

    // Update totals
    const subtotal = currentFormItems.reduce((sum, item) => sum + (item.qty * item.rate), 0);
    const tax = currentFormItems.reduce((sum, item) => sum + (item.qty * (item.taxPerPc || 0)), 0);
    const grandTotal = subtotal + tax;

    document.getElementById('quote-subtotal').textContent = `₹${subtotal.toLocaleString(undefined, {maximumFractionDigits: 2})}`;
    document.getElementById('quote-tax').textContent = `₹${tax.toLocaleString(undefined, {maximumFractionDigits: 2})}`;
    document.getElementById('quote-grandtotal').textContent = `₹${grandTotal.toLocaleString(undefined, {maximumFractionDigits: 2})}`;
}

window.saveQuotationForm = async function () {
    const customerSelect = document.getElementById('quote-customer-select');
    const customerId = customerSelect.value;
    const customerName = customerSelect.options[customerSelect.selectedIndex]?.text;
    const notes = document.getElementById('quote-notes').value.trim();
    
    const showFabric = document.getElementById('quote-toggle-fabric').checked;
    const showColour = document.getElementById('quote-toggle-colour').checked;
    const showTax = document.getElementById('quote-toggle-tax').checked;

    if (!customerId) {
        window.showToast?.("Please select a customer.", "error");
        return;
    }

    if (currentFormItems.length === 0) {
        window.showToast?.("Please add at least one item.", "error");
        return;
    }

    const subtotal = currentFormItems.reduce((sum, item) => sum + (item.qty * item.rate), 0);
    const tax = currentFormItems.reduce((sum, item) => sum + (item.qty * (item.taxPerPc || 0)), 0);
    const grandTotal = subtotal + tax;

    const data = {
        customerId,
        customerName,
        showFabric,
        showColour,
        showTax,
        items: currentFormItems,
        totalAmount: grandTotal,
        notes
    };

    const editId = document.getElementById('quotation-edit-id').value;
    if (editId) {
        data.id = editId;
    }

    try {
        window.showToast?.("Saving quotation...", "info");
        await api.saveQuotation(data);
        window.closeSheet('createQuotationSheet');
        await loadQuotations();
        window.showToast?.("Quotation saved successfully", "success");
    } catch (e) {
        console.error(e);
        window.showToast?.("Failed to save quotation", "error");
    }
};

window.openQuotationDetails = async function (id) {
    try {
        const q = await api.getQuotation(id);
        if (!q) return;
        activeQuotation = q;
        
        const container = document.getElementById('quotationDetailsSheet-inner-content');
        if (container) {
            container.innerHTML = getQuotationDetailsContentHTML(q);
        }
        window.openSheet('quotationDetailsSheet');
    } catch (e) {
        console.error(e);
        window.showToast?.("Failed to load details", "error");
    }
};

window.changeQuotationStatus = async function (id, newStatus) {
    try {
        window.showToast?.(`Updating status to ${newStatus}...`, "info");
        await api.updateQuotationStatus(id, newStatus);
        
        // Refresh details
        await window.openQuotationDetails(id);
        await loadQuotations();
        window.showToast?.(`Status updated to ${newStatus}`, "success");
    } catch (e) {
        console.error(e);
        window.showToast?.("Failed to update status", "error");
    }
};

window.deleteQuotation = function (id) {
    window.showConfirmation({
        title: "Delete Quotation",
        message: "Are you sure you want to permanently delete this quotation proposal?",
        confirmText: "Delete",
        onConfirm: async () => {
            try {
                window.showToast?.("Deleting quotation...", "info");
                await api.deleteQuotation(id);
                window.closeSheet('quotationDetailsSheet');
                await loadQuotations();
                window.showToast?.("Quotation deleted", "success");
            } catch (e) {
                console.error(e);
                window.showToast?.("Failed to delete quotation", "error");
            }
        }
    });
};

function numberToWords(num) {
    if (num === 0) return 'Zero Rupees only';
    const a = ['','One ','Two ','Three ','Four ', 'Five ','Six ','Seven ','Eight ','Nine ','Ten ','Eleven ','Twelve ','Thirteen ','Fourteen ','Fifteen ','Sixteen ','Seventeen ','Eighteen ','Nineteen '];
    const b = ['', '', 'Twenty','Thirty','Forty','Fifty', 'Sixty','Seventy','Eighty','Ninety'];

    const numStr = num.toString();
    if (numStr.length > 9) return 'Overflow'; // Max 99 Crores

    const n = ('000000000' + numStr).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return ''; 

    let str = '';
    str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
    str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
    str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
    str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
    str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
    
    return str.trim() + ' Rupees only';
}

window.printQuotation = async function (id) {
    try {
        const q = await api.getQuotation(id);
        if (!q) return;

        // Calculate totals
        const totalQty = q.items.reduce((sum, item) => sum + item.qty, 0);
        const subtotal = q.items.reduce((sum, item) => sum + (item.qty * item.rate), 0);
        const tax = q.items.reduce((sum, item) => sum + (item.qty * (item.taxPerPc || 0)), 0);
        const grandTotal = subtotal + tax;

        const amountInWords = numberToWords(Math.round(grandTotal));

        // HSN is hardcoded to 6109 per the screenshot since we don't collect it yet
        const itemsHtml = q.items.map((item, idx) => {
            const gstAmount = item.qty * (item.taxPerPc || 0);
            const gstPercent = (item.rate > 0 && item.taxPerPc > 0) ? ((item.taxPerPc / item.rate) * 100).toFixed(1) : "0.0";
            return `
            <tr>
                <td class="text-center">${idx + 1}</td>
                <td>${item.name}</td>
                <td class="text-center">6109</td>
                <td class="text-right">${item.qty}</td>
                <td class="text-right">₹ ${(item.rate).toFixed(1)}</td>
                <td class="text-right">₹ ${gstAmount.toFixed(1)} (${gstPercent}%)</td>
                <td class="text-right">₹ ${(item.total).toFixed(1)}</td>
            </tr>
            `;
        }).join('');

        const cgst = (tax / 2).toFixed(1);
        const sgst = (tax / 2).toFixed(1);

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Proforma_Invoice_${q.id}</title>
            <style>
                @page { size: A4; margin: 10mm; }
                body {
                    font-family: Arial, sans-serif;
                    font-size: 11px;
                    color: #000;
                    margin: 0;
                    padding: 0;
                }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .text-bold { font-weight: bold; }
                
                table {
                    width: 100%;
                    border-collapse: collapse;
                }
                td, th {
                    border: 1px solid #000;
                    padding: 4px;
                    vertical-align: top;
                }
                
                .header-container {
                    border: 1px solid #000;
                    border-bottom: none;
                }
                .page-title {
                    text-align: center;
                    font-size: 14px;
                    font-weight: bold;
                    margin: 10px 0;
                }
                
                .company-header {
                    display: flex;
                    justify-content: space-between;
                    padding: 10px;
                }
                .logo-placeholder {
                    width: 60px;
                    height: 60px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 32px;
                    font-weight: bold;
                    color: #FF8C00;
                }
                .logo-placeholder span:first-child { color: #000; font-size: 40px; margin-right: -10px; z-index: 10; }
                
                .company-details {
                    text-align: right;
                    line-height: 1.3;
                }
                .company-name {
                    font-size: 16px;
                    font-weight: bold;
                    margin-bottom: 2px;
                }
                
                .meta-table td {
                    width: 50%;
                }
                .meta-title {
                    font-weight: bold;
                    border-bottom: 1px solid #000;
                    padding-bottom: 2px;
                    margin-bottom: 4px;
                    display: block;
                }
                
                .items-table th {
                    text-align: center;
                    font-weight: bold;
                }
                .items-table td {
                    padding: 4px 6px;
                }
                
                .summary-table {
                    border-top: none;
                }
                
                .tax-breakdown th, .tax-breakdown td {
                    text-align: right;
                }
                .tax-breakdown th:first-child, .tax-breakdown td:first-child {
                    text-align: left;
                }
                
                .footer-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr 1fr;
                }
                .footer-grid > div {
                    border: 1px solid #000;
                    border-top: none;
                    border-right: none;
                    padding: 8px;
                }
                .footer-grid > div:last-child {
                    border-right: 1px solid #000;
                }
                
                .qr-placeholder {
                    width: 70px;
                    height: 70px;
                    background: #f0f0f0;
                    border: 1px solid #ccc;
                    display: inline-block;
                    margin-right: 10px;
                    margin-top: 5px;
                }
            </style>
        </head>
        <body>
            <div class="page-title">Proforma Invoice</div>
            
            <div class="header-container">
                <div class="company-header">
                    <div class="logo-placeholder">
                        <span>U</span><span>T</span>
                    </div>
                    <div class="company-details">
                        <div class="company-name">Udhayaa Textiles</div>
                        <div>63/A Senthur Nagar, Ellapalayam Road, Periyasemur, Erode</div>
                        <div>Phone no.: 7708333813 Email: info.udhayaatextiles@gmail.com</div>
                        <div>State: 33-Tamil Nadu</div>
                        <div style="font-size: 9px; margin-top: 4px;">TERMS AND CONDITION: All rates quoted are valid for 7 days</div>
                    </div>
                </div>
            </div>
            
            <table class="meta-table">
                <tr>
                    <td>
                        <span class="meta-title">Estimate For</span>
                        <div class="text-bold">${q.customerName}</div>
                        <div>ABN: 53 528 564 753</div>
                        <div>45 Rothon drive, rochdale south - 4123, Brisbane</div>
                    </td>
                    <td>
                        <span class="meta-title text-right" style="display:block;">Estimate Details</span>
                        <div class="text-right">Estimate No.: ${q.id}</div>
                        <div class="text-right">Date: ${q.date}</div>
                    </td>
                </tr>
            </table>
            
            <table class="items-table" style="border-top: none;">
                <tr>
                    <th style="width: 30px;">#</th>
                    <th>Item Name</th>
                    <th style="width: 60px;">HSN/ SAC</th>
                    <th style="width: 60px;">Quantity</th>
                    <th style="width: 70px;">Price/ Unit</th>
                    <th style="width: 100px;">GST</th>
                    <th style="width: 80px;">Amount</th>
                </tr>
                ${itemsHtml}
                <tr class="text-bold" style="background-color: #f9f9f9;">
                    <td colspan="3">Total</td>
                    <td class="text-right">${totalQty}</td>
                    <td></td>
                    <td class="text-right">₹ ${tax.toFixed(1)}</td>
                    <td class="text-right">₹ ${grandTotal.toFixed(1)}</td>
                </tr>
            </table>
            
            <table class="summary-table" style="border-top: none;">
                <tr>
                    <td style="width: 50%; border-right: 1px solid #000; border-bottom: none; vertical-align: top;">
                        <div class="text-center text-bold" style="border-bottom: 1px solid #000; margin: -4px -4px 4px -4px; padding: 4px;">Estimate order Amount In Words</div>
                        <div class="text-center" style="margin: 10px 0;">${amountInWords}</div>
                        
                        <table class="tax-breakdown" style="width: 100%; border: none; margin-top: 15px;">
                            <tr>
                                <th style="border:none; border-bottom: 1px solid #000; border-top: 1px solid #000;">Tax type</th>
                                <th style="border:none; border-bottom: 1px solid #000; border-top: 1px solid #000;">Taxable amount</th>
                                <th style="border:none; border-bottom: 1px solid #000; border-top: 1px solid #000;">Rate</th>
                                <th style="border:none; border-bottom: 1px solid #000; border-top: 1px solid #000;">Tax amount</th>
                            </tr>
                            <tr>
                                <td style="border:none;">SGST</td>
                                <td style="border:none;">₹ ${subtotal.toFixed(1)}</td>
                                <td style="border:none;">2.5%</td>
                                <td style="border:none;">₹ ${sgst}</td>
                            </tr>
                            <tr>
                                <td style="border:none;">CGST</td>
                                <td style="border:none;">₹ ${subtotal.toFixed(1)}</td>
                                <td style="border:none;">2.5%</td>
                                <td style="border:none;">₹ ${cgst}</td>
                            </tr>
                        </table>
                    </td>
                    <td style="width: 50%; padding: 0;">
                        <table style="width: 100%; border: none; height: 100%;">
                            <tr>
                                <td colspan="2" class="text-bold" style="border: none; border-bottom: 1px solid #000; padding: 4px;">Amounts</td>
                            </tr>
                            <tr>
                                <td style="border: none; padding: 10px 4px;">Sub Total</td>
                                <td class="text-right" style="border: none; padding: 10px 4px;">₹ ${subtotal.toFixed(1)}</td>
                            </tr>
                            <tr>
                                <td class="text-bold" style="border: none; border-top: 1px solid #000; padding: 10px 4px;">Total</td>
                                <td class="text-right text-bold" style="border: none; border-top: 1px solid #000; padding: 10px 4px;">₹ ${grandTotal.toFixed(1)}</td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
            
            <div class="footer-grid">
                <div>
                    <div class="text-bold">Bank Details</div>
                    <div style="display: flex; margin-top: 5px;">
                        <div class="qr-placeholder">
                            <div style="width: 100%; height: 100%; display: flex; align-items:center; justify-content:center; flex-direction:column; color:#888;">
                                <div style="font-size:10px;">[QR CODE]</div>
                            </div>
                        </div>
                        <div style="font-size: 9px; line-height: 1.4;">
                            Name: Indian Overseas Bank, Erode Periasemur<br>
                            Account No.: 134601000036234<br>
                            IFSC code: IOBA0001346<br>
                            Account Holder's Name: Udhayaa Textiles
                        </div>
                    </div>
                    <div style="margin-top: 5px; color:#00a368; font-size:9px; font-weight:bold; border: 1px solid #00a368; display:inline-block; padding:1px 3px; border-radius:2px;">UPI CLICK TO PAY</div>
                </div>
                <div>
                    <div class="text-bold">Terms and conditions</div>
                    <div style="font-size: 9px; line-height: 1.4; margin-top: 5px;">
                        Terms & Conditions<br><br>
                        - Quotation Validity: All quoted rates are valid for 7 days from the date of quotation.<br><br>
                        - Payment Terms:<br><br>
                        1. Advance: 50% of the total order value to be paid in advance to confirm the order.<br><br>
                        2. FABRIC IN HOUSE: 20% to be paid once dyeing is completed.<br><br>
                        3. On Completion: 30% to be paid after order completion, before delivery/dispatch.
                    </div>
                </div>
                <div style="text-align: center; display: flex; flex-direction: column; justify-content: space-between;">
                    <div class="text-right">For: Udhayaa Textiles</div>
                    <div style="margin: 20px auto; width: 120px; height: 40px; background: #e0e0e0; display:flex; align-items:center; justify-content:center; font-family: 'Brush Script MT', cursive; font-size: 20px; color: #444;">N.Udhayaa.</div>
                    <div class="text-bold text-right" style="font-size: 10px;">Authorized Signatory</div>
                </div>
            </div>
            
            <script>
                window.onload = function() {
                    window.print();
                    // window.close() is handled manually by user now to prevent premature closing if print dialog is cancelled
                }
            </script>
        </body>
        </html>
        `);
        printWindow.document.close();
    } catch (e) {
        console.error(e);
        window.showToast?.("Failed to generate PDF", "error");
    }
};
