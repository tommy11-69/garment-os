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

window.printQuotation = async function (id) {
    try {
        const q = await api.getQuotation(id);
        if (!q) return;

        const showFabric = q.showFabric || false;
        const showColour = q.showColour || false;
        const showTax = q.showTax !== false;

        const subtotal = q.items.reduce((sum, item) => sum + (item.qty * item.rate), 0);
        const tax = q.items.reduce((sum, item) => sum + (item.qty * (item.taxPerPc || 0)), 0);
        
        const itemsHtml = q.items.map((item, idx) => `
        <tr style="border-bottom: 1px solid #ddd;">
            <td style="padding: 10px; text-align: center;">${idx + 1}</td>
            <td style="padding: 10px;">${item.name}</td>
            ${showFabric ? `<td style="padding: 10px;">${item.fabric || '-'}</td>` : ''}
            ${showColour ? `<td style="padding: 10px;">${item.colour || '-'}</td>` : ''}
            <td style="padding: 10px; text-align: right;">${item.qty}</td>
            <td style="padding: 10px; text-align: right;">₹${item.rate.toLocaleString()}</td>
            ${showTax ? `<td style="padding: 10px; text-align: right;">₹${(item.taxPerPc || 0).toLocaleString(undefined, {maximumFractionDigits: 2})}</td>` : ''}
            <td style="padding: 10px; text-align: right;">₹${item.total.toLocaleString()}</td>
        </tr>
        `).join('');

        const headersHtml = `
            <th style="width: 50px; text-align: center;">S.No</th>
            <th>Item Description</th>
            ${showFabric ? `<th>Fabric & Processing</th>` : ''}
            ${showColour ? `<th>Colour</th>` : ''}
            <th style="text-align: right; width: 80px;">Quantity</th>
            <th style="text-align: right; width: 120px;">Price/pc</th>
            ${showTax ? `<th style="text-align: right; width: 120px;">Tax/pc</th>` : ''}
            <th style="text-align: right; width: 150px;">Total Amount</th>
        `;

        const totalsHtml = `
            <tr>
                <td>Subtotal</td>
                <td style="text-align: right;">₹${subtotal.toLocaleString(undefined, {maximumFractionDigits: 2})}</td>
            </tr>
            ${showTax ? `
            <tr>
                <td>Tax (5% GST)</td>
                <td style="text-align: right;">₹${tax.toLocaleString(undefined, {maximumFractionDigits: 2})}</td>
            </tr>
            ` : ''}
            <tr class="grand-total">
                <td><strong>Grand Total</strong></td>
                <td style="text-align: right;"><strong>₹${q.totalAmount.toLocaleString()}</strong></td>
            </tr>
        `;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Quotation_${q.id}</title>
            <style>
                body {
                    font-family: 'Inter', sans-serif;
                    color: #333;
                    margin: 0;
                    padding: 40px;
                }
                .invoice-header {
                    display: flex;
                    justify-content: space-between;
                    border-bottom: 2px solid #333;
                    padding-bottom: 20px;
                    margin-bottom: 30px;
                }
                .invoice-title {
                    font-size: 28px;
                    font-weight: bold;
                    color: #000;
                    margin: 0;
                }
                .meta-table {
                    width: 100%;
                    margin-bottom: 30px;
                }
                .meta-table td {
                    padding: 5px 0;
                    vertical-align: top;
                }
                .items-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 30px;
                }
                .items-table th {
                    background-color: #f5f5f5;
                    border-bottom: 2px solid #ddd;
                    padding: 10px;
                    text-align: left;
                    font-weight: 600;
                }
                .totals-section {
                    margin-left: auto;
                    width: 300px;
                }
                .totals-table {
                    width: 100%;
                    border-collapse: collapse;
                }
                .totals-table td {
                    padding: 8px 0;
                }
                .grand-total {
                    font-size: 18px;
                    font-weight: bold;
                    border-top: 1px solid #333;
                    padding-top: 10px;
                }
                .footer {
                    margin-top: 60px;
                    border-top: 1px solid #ddd;
                    padding-top: 20px;
                    font-size: 12px;
                    color: #777;
                    text-align: center;
                }
                @media print {
                    body {
                        padding: 0;
                    }
                }
            </style>
        </head>
        <body>
            <div class="invoice-header">
                <div>
                    <h1 class="invoice-title">GARMENT OS</h1>
                    <p style="margin: 5px 0 0 0; color: #777;">Sales proposal / Quotation</p>
                </div>
                <div style="text-align: right;">
                    <h2 style="margin: 0; font-size: 20px;">PROPOSAL</h2>
                    <p style="margin: 5px 0 0 0; font-weight: bold;">ID: ${q.id}</p>
                </div>
            </div>

            <table class="meta-table">
                <tr>
                    <td style="width: 50%;">
                        <strong>Prepared For:</strong><br>
                        <span style="font-size: 16px; font-weight: 600;">${q.customerName}</span>
                    </td>
                    <td style="width: 50%; text-align: right;">
                        <strong>Date:</strong> ${q.date}<br>
                        <strong>Status:</strong> ${q.status}
                    </td>
                </tr>
            </table>

            <table class="items-table">
                <thead>
                    <tr>
                        ${headersHtml}
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
            </table>

            <div class="totals-section">
                <table class="totals-table">
                    ${totalsHtml}
                </table>
            </div>

            ${q.notes ? `
            <div style="margin-top: 40px; border-left: 3px solid #333; padding-left: 15px;">
                <strong>Terms & Notes:</strong><br>
                <p style="margin: 5px 0 0 0; font-size: 13px; line-height: 1.5; color: #555;">${q.notes}</p>
            </div>
            ` : ''}

            <div class="footer">
                <p>Thank you for your business!</p>
                <p style="font-size: 10px; margin-top: 5px;">Generated automatically via Garment OS</p>
            </div>

            <script>
                window.onload = function() {
                    window.print();
                    setTimeout(function() { window.close(); }, 500);
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
