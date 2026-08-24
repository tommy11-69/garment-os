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

        // Fetch full customer details if available
        let customerInfo = {
            name: q.customerName,
            gst: "N/A",
            address: "",
            city: ""
        };
        
        if (q.customerId) {
            const cust = await api.getCustomer(q.customerId);
            if (cust) {
                customerInfo.name = cust.name || q.customerName;
                customerInfo.gst = cust.gst || "N/A";
                customerInfo.address = cust.address || "";
                customerInfo.city = cust.city || "";
            }
        }

        // Calculate totals
        const totalQty = q.items.reduce((sum, item) => sum + item.qty, 0);
        const subtotal = q.items.reduce((sum, item) => sum + (item.qty * item.rate), 0);
        const tax = q.items.reduce((sum, item) => sum + (item.qty * (item.taxPerPc || 0)), 0);
        const grandTotal = subtotal + tax;

        const amountInWords = numberToWords(Math.round(grandTotal));

        // HSN is hardcoded to 6109
        const itemsHtml = q.items.map((item, idx) => {
            const gstAmount = item.qty * (item.taxPerPc || 0);
            const gstPercent = (item.rate > 0 && item.taxPerPc > 0) ? ((item.taxPerPc / item.rate) * 100).toFixed(1) : "0.0";
            return `
            <tr class="item-row">
                <td class="text-center text-secondary">${idx + 1}</td>
                <td class="font-medium">${item.name}</td>
                <td class="text-center text-secondary">6109</td>
                <td class="text-center">${item.qty}</td>
                <td class="text-right">₹ ${(item.rate).toFixed(1)}</td>
                <td class="text-right text-secondary">₹ ${gstAmount.toFixed(1)} (${gstPercent}%)</td>
                <td class="text-right font-semibold">₹ ${(item.total).toFixed(1)}</td>
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
            <title>Quotation_${q.id}</title>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
            <style>
                @page { size: A4; margin: 12mm 15mm; }
                body {
                    font-family: 'Inter', sans-serif;
                    font-size: 12px;
                    color: #1e293b;
                    margin: 0;
                    padding: 0;
                    background: #fff;
                    line-height: 1.5;
                }
                * { box-sizing: border-box; }
                
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .text-left { text-align: left; }
                .font-medium { font-weight: 500; }
                .font-semibold { font-weight: 600; }
                .font-bold { font-weight: 700; }
                .text-secondary { color: #64748b; }
                .text-primary { color: #0f172a; }
                
                .header-section {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    border-bottom: 2px solid #e2e8f0;
                    padding-bottom: 20px;
                    margin-bottom: 30px;
                }
                .logo-container {
                    width: 90px;
                }
                .logo-container img {
                    max-width: 100%;
                    height: auto;
                }
                .company-details {
                    text-align: right;
                }
                .company-name {
                    font-size: 24px;
                    font-weight: 800;
                    color: #0f172a;
                    margin-bottom: 4px;
                    letter-spacing: -0.5px;
                }
                
                .doc-title-container {
                    margin-bottom: 30px;
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                }
                .doc-title {
                    font-size: 28px;
                    font-weight: 800;
                    color: #0f172a;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }
                
                .grid-2 {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 30px;
                    margin-bottom: 30px;
                }
                
                .info-box {
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    padding: 15px;
                }
                .info-label {
                    font-size: 10px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    color: #64748b;
                    font-weight: 600;
                    margin-bottom: 8px;
                }
                
                .table-container {
                    margin-bottom: 30px;
                    border-radius: 8px;
                    overflow: hidden;
                    border: 1px solid #e2e8f0;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                }
                th {
                    background: #f8fafc;
                    padding: 12px 10px;
                    font-size: 11px;
                    font-weight: 600;
                    color: #475569;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    border-bottom: 2px solid #e2e8f0;
                }
                td {
                    padding: 12px 10px;
                    border-bottom: 1px solid #e2e8f0;
                }
                .item-row:last-child td {
                    border-bottom: none;
                }
                
                .totals-container {
                    display: flex;
                    justify-content: flex-end;
                    margin-bottom: 40px;
                }
                .totals-box {
                    width: 320px;
                    background: #f8fafc;
                    border-radius: 8px;
                    padding: 20px;
                    border: 1px solid #e2e8f0;
                }
                .total-row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 10px;
                    font-size: 13px;
                }
                .total-row.grand {
                    border-top: 2px solid #e2e8f0;
                    padding-top: 15px;
                    margin-top: 10px;
                    margin-bottom: 0;
                    font-size: 18px;
                    font-weight: 800;
                    color: #0f172a;
                }
                
                .footer-grid {
                    display: grid;
                    grid-template-columns: 2fr 1fr;
                    gap: 40px;
                    border-top: 2px solid #e2e8f0;
                    padding-top: 30px;
                }
                .footer-box h4 {
                    font-size: 13px;
                    color: #0f172a;
                    margin: 0 0 10px 0;
                    font-weight: 700;
                }
                
                .terms-list {
                    padding-left: 15px;
                    margin: 0;
                    color: #475569;
                    font-size: 11px;
                }
                .terms-list li {
                    margin-bottom: 6px;
                }
                
                .sign-box {
                    text-align: center;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }
                .sign-line {
                    width: 100%;
                    border-bottom: 1px solid #cbd5e1;
                    margin-top: 60px;
                    margin-bottom: 10px;
                }
                .sign-text {
                    font-size: 11px;
                    font-weight: 600;
                    color: #64748b;
                }
                
                .amount-words {
                    font-style: italic;
                    color: #64748b;
                    margin-top: 10px;
                    text-align: right;
                }
            </style>
        </head>
        <body>
            
            <div class="header-section">
                <div class="logo-container">
                    <img src="/assets/logo-primary.webp" alt="Udhayaa Textiles Logo" onerror="this.outerHTML='<div style=\\'font-size:32px; font-weight:800; color:#0f172a;\\'>UDHAYAA</div>'"/>
                </div>
                <div class="company-details">
                    <div class="company-name" style="white-space: nowrap;">
                        <span style="color:#0f172a;">Udhayaa </span>
                        <span style="color:#FF6B00;">Textiles</span>
                    </div>
                    <div class="text-secondary">63/A Senthur Nagar, Ellapalayam Road</div>
                    <div class="text-secondary">Periyasemur, Erode, Tamil Nadu 638004</div>
                    <div class="text-secondary" style="margin-top: 4px;">Phone: +91 77083 33813</div>
                    <div class="text-secondary">Email: info@udhayaatextiles.com</div>
                </div>
            </div>
            
            <div class="doc-title-container">
                <div class="doc-title">Proforma Invoice</div>
                <div class="text-right">
                    <div class="font-semibold text-primary" style="font-size: 14px;">Quotation #: ${q.id}</div>
                    <div class="text-secondary">Date: ${q.date}</div>
                    <div class="text-secondary">Valid For: 7 Days</div>
                </div>
            </div>
            
            <div class="grid-2">
                <div class="info-box">
                    <div class="info-label">Estimate For</div>
                    <div class="font-bold text-primary" style="font-size: 15px; margin-bottom: 4px;">${customerInfo.name}</div>
                    <div class="text-secondary">GST: ${customerInfo.gst}</div>
                    ${customerInfo.address ? `<div class="text-secondary">${customerInfo.address}</div>` : ''}
                    ${customerInfo.city ? `<div class="text-secondary">${customerInfo.city}</div>` : ''}
                </div>
                
                <div class="info-box" style="background: transparent; border-color: transparent; padding: 0;">
                    <div class="info-box" style="height: 100%;">
                        <div class="info-label">Bank Details</div>
                        <div class="text-primary font-medium" style="margin-bottom: 2px;">Indian Overseas Bank</div>
                        <div class="text-secondary">Branch: Erode Periasemur</div>
                        <div class="text-secondary">A/C Name: Udhayaa Textiles</div>
                        <div class="text-primary font-bold" style="margin-top: 6px;">A/C No: 134601000036234</div>
                        <div class="text-primary font-bold">IFSC: IOBA0001346</div>
                        <div class="text-primary font-bold">UPI Id: info.udhayaatextiles-2@okhdfcbank</div>
                    </div>
                </div>
            </div>
            
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th style="width: 40px;" class="text-center">#</th>
                            <th class="text-left">Item Description</th>
                            <th style="width: 80px;" class="text-center">HSN</th>
                            <th style="width: 70px;" class="text-center">Qty</th>
                            <th style="width: 100px;" class="text-right">Price</th>
                            <th style="width: 120px;" class="text-right">GST</th>
                            <th style="width: 120px;" class="text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                </table>
            </div>
            
            <div class="totals-container">
                <div>
                    <div class="totals-box">
                        <div class="total-row">
                            <span class="text-secondary">Subtotal</span>
                            <span class="font-medium">₹ ${subtotal.toFixed(2)}</span>
                        </div>
                        <div class="total-row">
                            <span class="text-secondary">CGST (2.5%)</span>
                            <span class="font-medium">₹ ${cgst}</span>
                        </div>
                        <div class="total-row">
                            <span class="text-secondary">SGST (2.5%)</span>
                            <span class="font-medium">₹ ${sgst}</span>
                        </div>
                        <div class="total-row grand">
                            <span>Total</span>
                            <span>₹ ${grandTotal.toFixed(2)}</span>
                        </div>
                    </div>
                    <div class="amount-words">Amount in words: ${amountInWords}</div>
                </div>
            </div>
            
            <div class="footer-grid">
                <div class="footer-box">
                    <h4>Terms & Conditions</h4>
                    <ul class="terms-list">
                        <li><strong>Advance Payment:</strong> 50% of the total order value to be paid in advance to confirm the order.</li>
                        <li><strong>Fabric In House:</strong> 20% to be paid once dyeing is completed.</li>
                        <li><strong>On Completion:</strong> 30% to be paid after order completion, before delivery/dispatch.</li>
                        <li>All quoted rates are valid for 7 days from the date of quotation.</li>
                    </ul>
                </div>
                
                <div class="sign-box">
                    <div style="flex-grow: 1;"></div>
                    <div class="sign-line"></div>
                    <div class="sign-text">For Udhayaa Textiles</div>
                    <div class="sign-text" style="font-weight: 400; font-size: 9px; margin-top: 2px;">Authorized Signatory</div>
                </div>
            </div>
            
            <script>
                window.onload = function() {
                    // Give images a moment to load before printing
                    setTimeout(function() {
                        window.print();
                    }, 500);
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
