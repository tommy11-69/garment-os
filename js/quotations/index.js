import { api } from '../services/api.js?v=5.2';
import { getQuotationsHTML, getQuotationSheetsHTML, getQuotationDetailsContentHTML } from './templates.js?v=5.2';

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

        const cgst = (tax / 2).toFixed(2);
        const sgst = (tax / 2).toFixed(2);

        const QUOTE_LOGO_DATA_URI = "data:image/png;base64,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TvOUfzIl6deaGUGFvHK5ZNNWBRgRAm+RZDKpGTNmnFrl0tXVZZ6SN52dnfrwww8Vi8U0efJkFRePrYdoO46jjo4OrV+/Xo8++qgee+wxtbW1maf9k2AwqDlVcV3X5FdAo791xGkReJxA4C2TTCY1c+bMU3dcjmbk29vb9c4776i/v191dXUqKysr6LNkM9XX16dt27bpN7/5jb7//e/r+eef18DA0NvQBoNBNTY26ksXLtHyyF75zrT3/Wgi8DiBwFvoZOTT6bR27tw5qmvVu7q69N5772n//v2qqKhQMpn07JTN4OCg9u/fr1deeUVr167Vo48+mtGUjE58uD1z5kzdcsst+perLlL03f975oebjCYCjxMIvKWKi4s1d+5cRaNR7d27V21tbaO2+2Rvb6+2bt2qjRs3ynEcFRcXK5FIKBQ6w9N5RtHAwIAOHDig1157TT//+c/1yCOPDGsL5kgkoubmZt1+++265ZZblOg7Kr3xJIGH5xB4iyUSCTU3N6u2tlb79u3TkSNHMpp6yIVUKqUDBw5ow4YN2rFjhxzHkd/vVzQaVTQaNU/PO8dxdPz4cX388cd644039MQTT+jhhx/W008/rdbWVvP0TxWLxbRw4ULdcccdWrNmjbsvfutuAg9PYj/4caCvr0+vv/66fvCDH+iPf/zjsIKWK8XFxVq+fLkuueQStbS0qKamRpWVlUokEuapOeM4jnp6enT48GHt3btXH3zwgf70pz/11VdfzXgq5iS/36/S0lKtWLFCt956qy655JL/+Hxh21+kH10l9R03v60w2A8eJxD4cSKVSmn79u1au3atnn32We3atWvUrub/UTQaVVNTk5YsWaLFixdrxowZmjBhgkpKSlRaWqpEIqFAIGB+W0YGBwd1/PhxHTt2TK2trTp8+LB27typTZs2acOGDXrvvfcynob5R6FQSPX19brssst08803q7m5+ZMnEHh4FIEfZ1pbW/XMM8/oiSee0JtvvlnQm5PC4bBqa2s1c+ZMTZs2TU1NTaqrq1NJSYlisZii0agikYgCgYD8fr8CgYB8Pp/S6bRSqZQGBwc1ODiovr4+dXV1qa2tTfv27dPHH3+szZs36/3339eePXtG9NlDPB7X/Pnzdf311+v6669XaWmpeQqBh2cR+HFocHBQ27dv17p16/TMM89o27Zt6unpMU8riGAwqLKyMlVUVGjixIkqLi5WJBJROBxWOBxWIBDQwMCAent71dPTo56eHrW3t2v//v06dOhQzjY+C4VCmjx5spYvX66vfOUrWrly5acv+STw8CgCP451dXXpz3/+s9atW6fXX39de/fuzWoKwyaBQEDl5eU6++yzdfnll+uKK65QTU2NedonEXh4FIEf59LptA4cOKBnn31WL7zwgt599139/e9/H3cPtPD7/Uomk5ozZ44+97nP6dprr9XcuXPN006PwMOjCDykEytODh06pN/97nd67rnntGnTJu3evVvHj3skWnkSCAQ0YcIETZs2TYsXL9aVV16pFStWKBgMmqd+OgIPjyLw+ATHcdTa2qrf//73p67oR3sN/WgIhUKqqqrSzJkztWzZMl188cVauHBhdg9OIfDwKAKPT9XZ2am33npLr7zyiv72t7/po48+0r59+9Ta2qpUKmWe7nknP8CtqalRY2OjzjvvPK1evVqzZ88e2cNSCDw8isBjSM6Jh1+88cYbevXVV7Vx40bt2bNHra2tamtrU3d3t/ktnvGPUW9oaND8+fO1dOlStbS0qKqqyjw9OwQeHkXgMSzpdFqHDx/WW2+9pQ8++EBbtmzRrl27dPTo0VPB7+zsHNHa82z5fD6Fw2GVlZWd+qqqqtK8efN0zjnnqKWlRZWVlea3jRyBh0cReIxIKpXSkSNHtHnzZm3ZskVbt27VRx99pI6ODh0/fvy0XyOd3vH7/YrFYioqKlJRUZFisZji8bhKSkpO3Th18quxsTGv2yFIBB7eReCRUyf3fzlw4IAOHjyogwcP6tChQ6f++uDBg+rs7NTg4OCpu1FTqdQnvtLptHw+nwKBwCe+gsGgQqGQEomEKisrVVVVdep/q6urVV9fr9ra2uGtgMkFAg+PIvAYValUSp2dnert7VVvb6/6+vrU19f3ib8eGBhQIBBQJBJRJBJRNBpVOBxWNBpVPB5XaWmpu4ujVxB4eBSBB0aKwMOjPmVzDQDAWEfgAcBSBB4ALEXgAcBSBB4ALEXgAcBSBB4ALEXgAcBSBB4ALEXgAcBSBB4ALEXgAcBSBB4ALEXgAcBSBB4ALEXgAcBSBB4ALEXgAcBSBB4ALEXgAcBSBB4ALEXgAcBSBB4ALEXgAcBSBB4ALEXgAcBSBB4ALEXgAcBSBB4ALEXgAcBSBB4ALEXgAcBSBB4ALEXgAcBSBB4ALEXgAcBSBB4ALEXgAcBSBB4ALEXgAcBSBB4ALEXgAcBSBB4ALEXgAcBSBB4ALEXgAcBSBB4ALEXgAcBSBB4ALEXgAcBSBB4ALEXgAcBSBB7IBccxjxSQI3npj4OCIfDASKXTUmrQPFo4jiOlBsyjGIcIPDAS6UGpr8tbgR8ckHqOmUcxDhF4YCR6jkn7N7vTIl7Rf1w6ukvq6zZHMM4QeCBb6ZR0+CPpvRfNkcIa6JH2vS/tfN1bv3gw6gg8MFzplNTdKu36m/TmU9Ku180zCu/ox9JffiJ99JrUedidSsK443McT338D+ROX7d0cKvU1WqOZMmRnLTU3yMd2i598P/cgHr1A81gWKqeLZ11mVQ9S4omJJ9Pks88MzvRpDRpthQtNkfgEQQe9jr4ofSb+6WtfzZHsuM4UnpAGux3r+LHEp9fCkUlf/BE5HOg9jPStd+TJjebI/AIAg977d8s/epuafMfzBHkQt1Z0g0/kurnmyPwCObgAcBSBB4ALEXgAcBSBB4ALEXgAcBSrKKBvdr2SK/+H2nPO+YIcmHiFOm826SKRnMEHkHgAcBSTNEAgKUIPABYisADgKUIPABYisADgKUIPABYisADgKUIPABYisADgKUIPABYisADgKUIPABYisADgKUIPABYisADgKUIPABYisADgKUIPABYisADgKUIPABYisADgKUIPABYisADgKUIPABYisADgKUIPABYisADgKUIPABYisADgKUIPABYisADgKUIPABYisADgKUIPABYisADgKUIPABYisADgKUIPABYisADgKUIPABYisADgKUIPABY6v8Dacx18wwDfdMAAAAASUVORK5CYII=";

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Quotation_${q.id}</title>
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
                <div>
                    <!-- Top Header with Logo & Company GSTIN -->
                    <div class="top-header">
                        <div class="company-brand">
                            <img src="${QUOTE_LOGO_DATA_URI}" alt="Logo" class="company-logo" 
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
                        <div class="doc-type-title">PROFORMA INVOICE / ESTIMATE</div>
                        <div class="doc-meta-item"><strong>Quote #:</strong> ${q.id}</div>
                        <div class="doc-meta-item"><strong>Date:</strong> ${q.date || ''}</div>
                        <div class="doc-meta-item"><strong>Validity:</strong> 7 Days</div>
                        <div class="doc-meta-item"><strong>Place of Supply:</strong> 33-Tamil Nadu</div>
                    </div>

                    <!-- Estimate For & Bank Details Grid -->
                    <div class="info-grid">
                        <div class="info-card">
                            <div class="card-label">Estimate For (Buyer / Customer)</div>
                            <div class="card-name">${customerInfo.name || 'Valued Customer'}</div>
                            ${customerInfo.gst && customerInfo.gst !== 'N/A' ? `<div style="font-weight:600;color:#0f172a">GSTIN: <span style="font-family:monospace">${customerInfo.gst}</span></div>` : ''}
                            ${customerInfo.address ? `<div>${customerInfo.address}</div>` : ''}
                            ${customerInfo.city ? `<div>${customerInfo.city}</div>` : ''}
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

                    <!-- Items Table -->
                    <div class="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th style="width:28px;text-align:center">#</th>
                                    <th>Item Description</th>
                                    <th style="width:55px;text-align:center">HSN</th>
                                    <th style="width:65px;text-align:center">Qty</th>
                                    <th style="width:75px;text-align:right">Price</th>
                                    <th style="width:85px;text-align:right">GST</th>
                                    <th style="width:90px;text-align:right">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${itemsHtml}
                            </tbody>
                        </table>
                    </div>

                    <!-- Summary & Totals -->
                    <div class="summary-grid">
                        <div class="amount-words-box">
                            <div style="font-size:9px;text-transform:uppercase;color:#64748b;font-weight:700;margin-bottom:2px">Amount in Words:</div>
                            <div style="font-weight:700;color:#0f172a;font-style:italic">${amountInWords}</div>
                            <div style="font-size:9px;color:#64748b;margin-top:6px;border-top:1px dashed #cbd5e1;padding-top:4px">
                                Total Items: ${q.items?.length || 0} | Total Quantity: ${totalQty} pcs
                            </div>
                        </div>
                        <div class="totals-card">
                            <div class="totals-row"><span>Subtotal:</span><span style="font-weight:600">₹ ${subtotal.toFixed(2)}</span></div>
                            <div class="totals-row"><span>CGST (2.5%):</span><span>₹ ${cgst}</span></div>
                            <div class="totals-row"><span>SGST (2.5%):</span><span>₹ ${sgst}</span></div>
                            <div class="totals-row grand"><span>Grand Total:</span><span>₹ ${grandTotal.toFixed(2)}</span></div>
                        </div>
                    </div>
                </div>

                <!-- Footer -->
                <div class="footer-section">
                    <div class="terms-box">
                        <h4>Terms &amp; Conditions</h4>
                        <ul>
                            <li><strong>Advance Payment:</strong> 50% advance to confirm order.</li>
                            <li><strong>Fabric In House:</strong> 20% on completion of dyeing stage.</li>
                            <li><strong>On Completion:</strong> 30% balance prior to delivery/dispatch.</li>
                            <li>Quoted rates valid for 7 days from date of document.</li>
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
        </html>
        `);
        printWindow.document.close();
    } catch (e) {
        console.error(e);
        window.showToast?.("Failed to generate PDF", "error");
    }
};
