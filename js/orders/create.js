/**
 * create.js — Industrial Multi-Step Garment Order Booking & Engineering Wizard
 * Features: Multi-product sizing, smart ratio presets, automated BOM fabric estimation,
 * canonical 7-stage routing, live commercial margin gauge, and direct production launching.
 */

import { orderStore } from '../stores/OrderStore.js?v=5.2';
import { customerStore } from '../stores/CustomerStore.js?v=5.2';
import { api } from '../services/api.js?v=5.2';
import { calculateOrderRollup, STAGE_DEFINITIONS, WORKFLOW_ROUTES, normalizeStageKey } from '../production/domain/workflowEngine.js?v=5.5';

// ─── Fabric Sub-types ────────────────────────────────────────────────────────
const FABRIC_SUBTYPES = {
    Cotton: [
        'Single Jersey (100% Combed Cotton)',
        'Double Jersey / Interlock',
        'Pique Knit (Polo)',
        'French Terry (Unbrushed)',
        'Fleece (Brushed Interior)',
        '2x2 / 1x1 Rib Knit',
        'Waffle / Thermal Knit'
    ],
    Polyester: [
        'Dry-fit Micro Polyester',
        'Polyester Interlock',
        'Sports Mesh / Eyelet',
        'Microfiber Tricot',
        'Poly Satin'
    ],
    Blended: [
        'Cotton / Poly Blend (60/40 CVC)',
        'Cotton / Poly Blend (65/35 PC)',
        'Cotton / Elastane / Spandex (95/5)',
        'Poly / Viscose (PV Blend)'
    ],
    Fleece: [
        '3-Thread Heavy Fleece (320 GSM)',
        '2-Thread French Terry (260 GSM)',
        'Brushed Cotton Poly Fleece',
        'Sherpa / Polar Fleece'
    ]
};

// ─── 6 Wizard Steps ──────────────────────────────────────────────────────────
const WIZARD_STEPS = [
    { id: 'co-step-1', title: 'Buyer & PO Profile' },
    { id: 'co-step-2', title: 'Products & Size Matrix' },
    { id: 'co-step-3', title: 'Fabric Sourcing & BOM' },
    { id: 'co-step-4', title: 'Workflow & Embellishment' },
    { id: 'co-step-5', title: 'Commercial Pricing & Margins' },
    { id: 'co-step-6', title: 'Consignee Logistics & Review' }
];

// ─── Wizard State ────────────────────────────────────────────────────────────
let coState = {
    currentIdx: 0,
    workflowType: 'default',
    priority: 'Normal',
    fabricType: 'Cotton',
    fabricSubtype: 'Single Jersey (100% Combed Cotton)',
    decorationType: 'Screen',
    costings: [],
    products: [
        {
            id: 'prod-1',
            name: '100% Cotton Crewneck T-Shirt',
            category: 'Adults',
            qty: 500,
            sizes: { XS: 50, S: 100, M: 150, L: 150, XL: 50, XXL: 0, XXXL: 0, XXXXL: 0 }
        }
    ]
};

// ─── DOM Helpers ─────────────────────────────────────────────────────────────
const qs = id => document.getElementById(id);
const val = id => (qs(id) ? qs(id).value.trim() : '');
const num = id => parseFloat(qs(id)?.value) || 0;

// ─── DOMContentLoaded Initialization ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Set default delivery date (+21 days for realistic production lead-time)
    const defDelivery = new Date();
    defDelivery.setDate(defDelivery.getDate() + 21);
    const delInput = qs('co-delivery');
    if (delInput) delInput.value = defDelivery.toISOString().split('T')[0];

    // 2. Pre-fill default fabric specifications
    coSwitchFabricType('Cotton');

    // 3. Render initial products matrix
    renderProducts();

    // 4. Load customers into dropdown
    try {
        await customerStore.loadInitial();
        populateCustomers();
        customerStore.subscribe(() => populateCustomers());
    } catch (e) {
        console.error("Failed to load customers:", e);
    }

    // 5. Load quotations / costings for auto-fill
    try {
        coState.costings = await api.getCostings().catch(() => []);
        populateQuotations();
    } catch (e) {
        console.error("Failed to load costings:", e);
    }

    // 6. Bind live recalculation listeners
    qs('co-customer')?.addEventListener('change', handleCustomerChange);
    qs('co-fabric-kg')?.addEventListener('input', () => { calculateFabricCosts(); calculateFinancials(); });
    qs('co-fabric-rate')?.addEventListener('input', () => { calculateFabricCosts(); calculateFinancials(); });
    qs('co-gsm')?.addEventListener('input', updateBOMEstimates);
    qs('co-unit-price')?.addEventListener('input', calculateFinancials);
    qs('co-advance-payment')?.addEventListener('input', calculateFinancials);

    // Set initial unit price
    const upInput = qs('co-unit-price');
    if (upInput && !upInput.value) upInput.value = '240';

    // 7. Initial calculations & step render
    updateBOMEstimates();
    calculateFinancials();
    renderStep();
});

// ─── Customers Dropdown ──────────────────────────────────────────────────────
function populateCustomers() {
    const sel = qs('co-customer');
    if (!sel) return;
    const currentVal = sel.value;
    sel.innerHTML = `
        <option value="">Select Customer...</option>
        <option value="NEW_CUSTOMER">+ Create New Customer</option>
    `;
    (customerStore.state.entities || []).forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = `${c.name} (${c.company || 'Buyer'})`;
        sel.appendChild(opt);
    });
    if (currentVal) sel.value = currentVal;
}

function handleCustomerChange(e) {
    if (e.target.value === 'NEW_CUSTOMER') {
        e.target.value = '';
        if (typeof window.openQuickAddCustomer === 'function') {
            window.openQuickAddCustomer(async (newCust) => {
                await customerStore.loadInitial();
                populateCustomers();
                qs('co-customer').value = newCust.id;
                prefillCustomerAddress(newCust.id);
            });
        }
    } else {
        prefillCustomerAddress(e.target.value);
    }
}

function prefillCustomerAddress(customerId) {
    if (!customerId) return;
    const cust = (customerStore.state.entities || []).find(c => c.id === customerId);
    if (cust && cust.shippingAddress) {
        const addrField = qs('co-shipping-address');
        if (addrField && !addrField.value) addrField.value = cust.shippingAddress;
    }
}

// ─── Quotations Autofill ─────────────────────────────────────────────────────
function populateQuotations() {
    const sel = qs('co-quote-select');
    if (!sel) return;
    sel.innerHTML = '<option value="">None (Manual Specs Entry)</option>';
    coState.costings.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = `${c.styleRef || 'Style'} — ₹${c.retailPrice || c.totalCost || 0}/pc (${c.fabricType || 'Fabric'})`;
        sel.appendChild(opt);
    });
}

window.coApplyQuotation = function(costingId) {
    if (!costingId) return;
    const quote = coState.costings.find(c => c.id === costingId);
    if (!quote) return;

    // Pre-fill primary product
    if (coState.products[0]) {
        coState.products[0].name = quote.styleRef || 'Quoted Apparel Item';
    }

    // Pre-fill price
    const upInput = qs('co-unit-price');
    if (upInput) upInput.value = quote.retailPrice || quote.totalCost || 240;

    // Pre-fill GSM
    const gsmInput = qs('co-gsm');
    if (gsmInput && quote.fabricGsm) gsmInput.value = quote.fabricGsm;

    // Re-render
    renderProducts();
    updateBOMEstimates();
    calculateFinancials();
    showToast(`Pre-filled specifications from "${quote.styleRef}"`, 'success');
};

// ─── Priority Toggle ─────────────────────────────────────────────────────────
window.coSetPriority = function(prio) {
    coState.priority = prio;
    const btns = {
        Normal: qs('prio-normal-btn'),
        High:   qs('prio-high-btn'),
        Urgent: qs('prio-urgent-btn')
    };

    Object.entries(btns).forEach(([k, btn]) => {
        if (!btn) return;
        if (k === prio) {
            btn.className = 'py-3 rounded-xl border-2 border-primary bg-primary text-white font-bold text-[13px] transition-all active-scale shadow-xs';
        } else {
            btn.className = 'py-3 rounded-xl border-2 border-outline-variant bg-surface text-secondary font-bold text-[13px] transition-all active-scale';
        }
    });
};

// ─── Products & Multi-Size Matrix Manager ────────────────────────────────────
window.coAddProduct = function() {
    const newIdx = coState.products.length + 1;
    coState.products.push({
        id: `prod-${Date.now()}-${newIdx}`,
        name: `Garment Item #${newIdx}`,
        category: 'Adults',
        qty: 100,
        sizes: { XS: 10, S: 25, M: 35, L: 20, XL: 10, XXL: 0, XXXL: 0, XXXXL: 0 }
    });
    renderProducts();
    updateBOMEstimates();
    calculateFinancials();
};

window.coRemoveProduct = function(idx) {
    if (coState.products.length <= 1) {
        showToast('Order must contain at least one product', 'error');
        return;
    }
    coState.products.splice(idx, 1);
    renderProducts();
    updateBOMEstimates();
    calculateFinancials();
};

window.coUpdateProductField = function(idx, field, value) {
    if (coState.products[idx]) {
        coState.products[idx][field] = value;
    }
};

window.coSetProductCategory = function(idx, category) {
    const prod = coState.products[idx];
    if (!prod) return;
    prod.category = category;
    if (category === 'Adults') {
        prod.sizes = { XS: 0, S: 0, M: 0, L: 0, XL: 0, XXL: 0, XXXL: 0, XXXXL: 0 };
    } else {
        prod.sizes = { '24': 0, '26': 0, '28': 0, '30': 0, '32': 0, '34': 0, '36': 0, '38': 0 };
    }
    window.coApplyRatioPreset(idx, 'even');
};

window.coUpdateProductTargetQty = function(idx, targetVal) {
    const prod = coState.products[idx];
    if (!prod) return;
    prod.qty = parseInt(targetVal) || 0;
    window.coApplyRatioPreset(idx, 'even');
};

window.coUpdateProductSizeCell = function(idx, sizeKey, cellVal) {
    const prod = coState.products[idx];
    if (!prod) return;
    prod.sizes[sizeKey] = parseInt(cellVal) || 0;
    updateProductValidationUI(idx);
    updateBOMEstimates();
    calculateFinancials();
};

window.coApplyRatioPreset = function(idx, presetType) {
    const prod = coState.products[idx];
    if (!prod) return;
    const target = prod.qty || 0;
    const isAdults = prod.category === 'Adults';

    if (presetType === 'clear') {
        Object.keys(prod.sizes).forEach(k => { prod.sizes[k] = 0; });
    } else if (presetType === 'even') {
        const activeKeys = isAdults ? ['S', 'M', 'L', 'XL'] : ['28', '30', '32', '34'];
        const perSize = Math.floor(target / activeKeys.length);
        const remainder = target % activeKeys.length;

        Object.keys(prod.sizes).forEach(k => { prod.sizes[k] = 0; });
        activeKeys.forEach((k, i) => {
            prod.sizes[k] = perSize + (i === 0 ? remainder : 0);
        });
    } else if (presetType === 'bell') {
        // Bell Curve 1 : 2 : 2 : 1 (S:M:L:XL or 28:30:32:34)
        const weights = isAdults
            ? { S: 1, M: 2, L: 2, XL: 1 }
            : { '28': 1, '30': 2, '32': 2, '34': 1 };
        const totalWeight = 6;
        const unit = Math.floor(target / totalWeight);

        Object.keys(prod.sizes).forEach(k => { prod.sizes[k] = 0; });
        let allocated = 0;
        Object.entries(weights).forEach(([k, w]) => {
            const count = unit * w;
            prod.sizes[k] = count;
            allocated += count;
        });
        // Remainder goes to M / 30
        const centerKey = isAdults ? 'M' : '30';
        prod.sizes[centerKey] += (target - allocated);
    }

    renderProducts();
    updateBOMEstimates();
    calculateFinancials();
};

function updateProductValidationUI(idx) {
    const prod = coState.products[idx];
    if (!prod) return;
    const currentSum = Object.values(prod.sizes).reduce((sum, v) => sum + (v || 0), 0);
    const isMatch = currentSum === prod.qty;

    const badge = qs(`p-sum-badge-${idx}`);
    if (badge) {
        badge.className = `px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
            isMatch
                ? 'bg-[#008A00]/10 text-[#008A00] border border-[#008A00]/20'
                : 'bg-error/10 text-error border border-error/20'
        }`;
        badge.textContent = `Sum: ${currentSum} / Target: ${prod.qty} pcs`;
    }
}

function renderProducts() {
    const container = qs('co-products-container');
    if (!container) return;

    container.innerHTML = coState.products.map((prod, idx) => {
        const isAdults = prod.category === 'Adults';
        const sizeKeys = isAdults
            ? ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'XXXXL']
            : ['24', '26', '28', '30', '32', '34', '36', '38'];

        const currentSum = Object.values(prod.sizes).reduce((sum, v) => sum + (v || 0), 0);
        const isMatch = currentSum === prod.qty;

        const sizeInputsHtml = sizeKeys.map(sz => `
            <div class="flex flex-col items-center gap-1 bg-surface-container/60 rounded-xl p-2 border border-outline-variant/40">
                <span class="text-[10px] font-bold text-secondary uppercase">${sz}</span>
                <input type="number" min="0" placeholder="0" 
                    value="${prod.sizes[sz] || ''}"
                    oninput="window.coUpdateProductSizeCell(${idx}, '${sz}', this.value)"
                    class="w-full text-center font-bold text-[14px] bg-transparent border-0 p-0 focus:ring-0 outline-none text-on-surface">
            </div>
        `).join('');

        return `
            <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm flex flex-col gap-4">
                <div class="flex justify-between items-center pb-2 border-b border-outline-variant/40">
                    <div class="flex items-center gap-2">
                        <span class="w-6 h-6 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center">#${idx + 1}</span>
                        <h4 class="text-[15px] font-bold text-on-surface">Product Line Specification</h4>
                    </div>
                    <div class="flex items-center gap-2">
                        <span id="p-sum-badge-${idx}" class="px-2.5 py-0.5 rounded-full text-[11px] font-bold ${isMatch ? 'bg-[#008A00]/10 text-[#008A00] border border-[#008A00]/20' : 'bg-error/10 text-error border border-error/20'}">
                            Sum: ${currentSum} / Target: ${prod.qty} pcs
                        </span>
                        ${coState.products.length > 1 ? `
                            <button type="button" onclick="window.coRemoveProduct(${idx})" class="text-error hover:bg-error/10 p-1.5 rounded-lg active-scale transition-apple" title="Remove Product">
                                <span class="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                        ` : ''}
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div class="sm:col-span-2 flex flex-col gap-1.5">
                        <label class="text-[12px] font-bold text-secondary uppercase tracking-wider">Garment Product Style Name *</label>
                        <input type="text" value="${prod.name || ''}" placeholder="e.g. Combed Cotton Crewneck T-Shirt"
                            oninput="window.coUpdateProductField(${idx}, 'name', this.value)"
                            class="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-[14px] font-semibold text-on-surface outline-none focus:ring-2 focus:ring-primary/20">
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-[12px] font-bold text-secondary uppercase tracking-wider">Category</label>
                        <select onchange="window.coSetProductCategory(${idx}, this.value)"
                            class="w-full bg-surface border border-outline-variant rounded-xl px-3 py-2.5 text-[14px] font-semibold text-on-surface outline-none focus:ring-2 focus:ring-primary/20">
                            <option value="Adults" ${isAdults ? 'selected' : ''}>Adults (XS to 4XL)</option>
                            <option value="Kids" ${!isAdults ? 'selected' : ''}>Kids (24 to 38)</option>
                        </select>
                    </div>
                </div>

                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pt-1">
                    <div class="flex items-center gap-3 w-full sm:w-auto">
                        <div class="flex flex-col gap-1">
                            <label class="text-[11px] font-bold text-secondary uppercase tracking-wider">Target Line Qty *</label>
                            <input type="number" min="1" value="${prod.qty || ''}" placeholder="0"
                                oninput="window.coUpdateProductTargetQty(${idx}, this.value)"
                                class="w-32 bg-surface border border-outline-variant rounded-xl px-3 py-1.5 text-[15px] font-extrabold text-primary outline-none focus:ring-2 focus:ring-primary/20">
                        </div>
                    </div>

                    <!-- Quick Ratio Presets -->
                    <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                        <span class="text-[10px] font-bold text-secondary uppercase mr-1">Ratio Presets:</span>
                        <button type="button" onclick="window.coApplyRatioPreset(${idx}, 'even')" class="ratio-btn px-2.5 py-1 rounded-lg border border-outline-variant text-[11px] font-bold text-secondary bg-surface">
                            Even Split
                        </button>
                        <button type="button" onclick="window.coApplyRatioPreset(${idx}, 'bell')" class="ratio-btn px-2.5 py-1 rounded-lg border border-outline-variant text-[11px] font-bold text-secondary bg-surface">
                            Bell Curve (1:2:2:1)
                        </button>
                        <button type="button" onclick="window.coApplyRatioPreset(${idx}, 'clear')" class="ratio-btn px-2.5 py-1 rounded-lg border border-outline-variant text-[11px] font-bold text-error bg-surface">
                            Clear
                        </button>
                    </div>
                </div>

                <!-- Size Matrix Input Grid -->
                <div class="grid grid-cols-4 sm:grid-cols-8 gap-2 pt-1">
                    ${sizeInputsHtml}
                </div>
            </div>
        `;
    }).join('');

    const totalQty = coState.products.reduce((sum, p) => sum + (p.qty || 0), 0);
    const headerQty = qs('co-header-total-pcs');
    if (headerQty) headerQty.textContent = `${totalQty.toLocaleString()} pcs total`;
}

// ─── Fabric & Automated BOM Calculation ──────────────────────────────────────
window.coSwitchFabricType = function(type) {
    coState.fabricType = type;

    const btns = {
        Cotton:    qs('ft-btn-cotton'),
        Polyester: qs('ft-btn-poly'),
        Blended:   qs('ft-btn-blend'),
        Fleece:    qs('ft-btn-fleece')
    };

    Object.entries(btns).forEach(([k, btn]) => {
        if (!btn) return;
        if (k === type) {
            btn.className = 'py-2.5 rounded-xl border-2 border-primary bg-primary text-white font-bold text-[13px] transition-all active-scale shadow-xs';
        } else {
            btn.className = 'py-2.5 rounded-xl border-2 border-outline-variant bg-surface text-secondary font-bold text-[13px] transition-all active-scale';
        }
    });

    // Populate subtypes
    const subtypeSel = qs('co-fabric-subtype');
    if (subtypeSel) {
        subtypeSel.innerHTML = (FABRIC_SUBTYPES[type] || []).map(s => `<option value="${s}">${s}</option>`).join('');
    }

    // Adjust benchmark GSM defaults
    const gsmInput = qs('co-gsm');
    if (gsmInput) {
        if (type === 'Fleece') gsmInput.value = '280';
        else if (type === 'Polyester') gsmInput.value = '160';
        else gsmInput.value = '180';
    }

    updateBOMEstimates();
    calculateFinancials();
};

function updateBOMEstimates() {
    const totalQty = coState.products.reduce((sum, p) => sum + (p.qty || 0), 0);
    const isFleece = coState.fabricType === 'Fleece';
    const avgConsumption = isFleece ? 0.65 : 0.24; // kg per pc

    const netFabricKg = Math.round(totalQty * avgConsumption * 10) / 10;
    const grossFabricKg = Math.round(netFabricKg * 1.05 * 10) / 10; // +5% buffer
    const estRolls = Math.ceil(grossFabricKg / 20); // 20kg rolls
    const pcsPerKg = grossFabricKg > 0 ? (totalQty / grossFabricKg).toFixed(2) : '-';

    const elConsumption = qs('bom-auto-consumption');
    const elGrossKg     = qs('bom-auto-gross-kg');
    const elRolls       = qs('bom-auto-rolls');
    const elPcsKg       = qs('co-pcs-kg-display');

    if (elConsumption) elConsumption.textContent = `${avgConsumption} kg`;
    if (elGrossKg) elGrossKg.textContent = `${grossFabricKg} kg`;
    if (elRolls) elRolls.textContent = `${estRolls} Rolls`;
    if (elPcsKg) elPcsKg.textContent = pcsPerKg;

    // If fabric weight input is currently empty, auto-populate gross kg
    const fabricKgInput = qs('co-fabric-kg');
    if (fabricKgInput && !fabricKgInput.value && grossFabricKg > 0) {
        fabricKgInput.value = grossFabricKg;
    }

    calculateFabricCosts();
    renderTrimsChecklist(totalQty);
}

window.coApplyAutoFabricKg = function() {
    const totalQty = coState.products.reduce((sum, p) => sum + (p.qty || 0), 0);
    const isFleece = coState.fabricType === 'Fleece';
    const avgConsumption = isFleece ? 0.65 : 0.24;
    const grossFabricKg = Math.round(totalQty * avgConsumption * 1.05 * 10) / 10;

    const fabricKgInput = qs('co-fabric-kg');
    if (fabricKgInput) {
        fabricKgInput.value = grossFabricKg;
        calculateFabricCosts();
        calculateFinancials();
        showToast(`Applied ${grossFabricKg} kg gross fabric requirement`, 'success');
    }
};

function calculateFabricCosts() {
    const kg = num('co-fabric-kg');
    const rate = num('co-fabric-rate');
    const totalCost = kg * rate;
    const display = qs('co-fabric-total-cost');
    if (display) display.textContent = `₹${Math.round(totalCost).toLocaleString('en-IN')}`;
}

function renderTrimsChecklist(totalQty) {
    const container = qs('co-trims-preview');
    if (!container) return;

    const cones = Math.ceil(totalQty / 150);
    const cartons = Math.ceil(totalQty / 50);

    container.innerHTML = `
        <div class="p-2 rounded-lg bg-surface-container/60 border border-outline-variant/30 flex justify-between">
            <span class="text-secondary">Sewing Thread:</span>
            <strong class="text-on-surface">${cones} Cones</strong>
        </div>
        <div class="p-2 rounded-lg bg-surface-container/60 border border-outline-variant/30 flex justify-between">
            <span class="text-secondary">Woven Brand Labels:</span>
            <strong class="text-on-surface">${totalQty} pcs</strong>
        </div>
        <div class="p-2 rounded-lg bg-surface-container/60 border border-outline-variant/30 flex justify-between">
            <span class="text-secondary">Wash Care Labels:</span>
            <strong class="text-on-surface">${totalQty} pcs</strong>
        </div>
        <div class="p-2 rounded-lg bg-surface-container/60 border border-outline-variant/30 flex justify-between">
            <span class="text-secondary">Hangtags &amp; Barbs:</span>
            <strong class="text-on-surface">${totalQty} pcs</strong>
        </div>
        <div class="p-2 rounded-lg bg-surface-container/60 border border-outline-variant/30 flex justify-between">
            <span class="text-secondary">Self-Seal Polybags:</span>
            <strong class="text-on-surface">${totalQty} pcs</strong>
        </div>
        <div class="p-2 rounded-lg bg-surface-container/60 border border-outline-variant/30 flex justify-between">
            <span class="text-secondary">Master Cartons (7-ply):</span>
            <strong class="text-on-surface">${cartons} Boxes</strong>
        </div>
    `;
}

// ─── Workflow & Decoration Selection ─────────────────────────────────────────
window.coSelectWorkflow = function(type) {
    coState.workflowType = type;
    document.querySelectorAll('.workflow-card').forEach(card => {
        card.classList.toggle('selected', card.dataset.wf === type);
    });
};

window.coSelectDecType = function(type) {
    coState.decorationType = type;
    const btns = {
        Screen:     qs('dec-btn-screen'),
        DTF:        qs('dec-btn-dtf'),
        Embroidery: qs('dec-btn-embroidery'),
        None:       qs('dec-btn-none')
    };

    Object.entries(btns).forEach(([k, btn]) => {
        if (!btn) return;
        if (k === type) {
            btn.className = 'py-2.5 rounded-xl border-2 border-primary bg-primary text-white font-bold text-[12px] transition-all shadow-xs';
        } else {
            btn.className = 'py-2.5 rounded-xl border-2 border-outline-variant bg-surface text-secondary font-bold text-[12px] transition-all';
        }
    });

    const detailsPanel = qs('dec-details-panel');
    if (detailsPanel) {
        detailsPanel.classList.toggle('hidden', type === 'None');
    }
};

// ─── Commercial Financials & Margin Ledger ───────────────────────────────────
function calculateFinancials() {
    const totalQty = coState.products.reduce((sum, p) => sum + (p.qty || 0), 0);
    const unitPrice = num('co-unit-price');
    const grandRevenue = totalQty * unitPrice;

    // Production cost calculation
    const fabricKg = num('co-fabric-kg');
    const fabricRate = num('co-fabric-rate');
    const fabricCost = fabricKg * fabricRate;
    const trimsCost = totalQty * 18; // ~₹18 per pc
    const cmtCost = totalQty * 45;   // ~₹45 per pc cutting & sewing
    const estimatedCost = Math.round(fabricCost + trimsCost + cmtCost);

    const grossProfit = grandRevenue - estimatedCost;
    const marginPct = grandRevenue > 0 ? Math.round((grossProfit / grandRevenue) * 100) : 0;

    // Update Step 5 displays
    const elGrandTotal = qs('co-calc-grand-total');
    if (elGrandTotal) elGrandTotal.textContent = `₹${Math.round(grandRevenue).toLocaleString('en-IN')}`;

    const elRev = qs('calc-revenue-display');
    const elCost = qs('calc-cost-display');
    const elProfit = qs('calc-profit-display');
    const elMarginBadge = qs('co-margin-badge');
    const elMarginBar = qs('co-margin-progress-bar');

    if (elRev) elRev.textContent = `₹${Math.round(grandRevenue).toLocaleString('en-IN')}`;
    if (elCost) elCost.textContent = `₹${Math.round(estimatedCost).toLocaleString('en-IN')}`;
    if (elProfit) {
        elProfit.textContent = `₹${Math.round(grossProfit).toLocaleString('en-IN')}`;
        elProfit.className = `text-[15px] font-extrabold ${grossProfit >= 0 ? 'text-[#008A00]' : 'text-error'} mt-0.5`;
    }

    if (elMarginBadge) {
        let badgeCls = 'bg-[#008A00]/10 text-[#008A00] border-[#008A00]/20';
        let barBg = 'bg-[#008A00]';
        if (marginPct < 18) {
            badgeCls = 'bg-error/10 text-error border-error/20';
            barBg = 'bg-error';
        } else if (marginPct < 26) {
            badgeCls = 'bg-[#FF9500]/10 text-[#FF9500] border-[#FF9500]/20';
            barBg = 'bg-[#FF9500]';
        }
        elMarginBadge.className = `px-2.5 py-0.5 rounded-full text-[12px] font-extrabold border ${badgeCls}`;
        elMarginBadge.textContent = `${marginPct}% Gross Margin`;
        if (elMarginBar) {
            elMarginBar.className = `h-full ${barBg} transition-all duration-300`;
            elMarginBar.style.width = `${Math.min(100, Math.max(5, marginPct))}%`;
        }
    }

    // Update bottom persistent KPI deck
    const barQty = qs('bar-total-qty');
    const barVal = qs('bar-total-val');
    const barKg = qs('bar-fabric-kg');
    const barMargin = qs('bar-margin-pct');

    if (barQty) barQty.textContent = totalQty.toLocaleString();
    if (barVal) barVal.textContent = `₹${Math.round(grandRevenue).toLocaleString('en-IN')}`;
    if (barKg) barKg.textContent = `${fabricKg} kg`;
    if (barMargin) {
        barMargin.textContent = `${marginPct}%`;
        barMargin.className = `text-[15px] font-extrabold ${marginPct >= 26 ? 'text-[#008A00]' : marginPct >= 18 ? 'text-[#FF9500]' : 'text-error'}`;
    }
}

// ─── Wizard Step Navigation ──────────────────────────────────────────────────
window.coJumpToStep = function(targetIdx) {
    if (targetIdx > coState.currentIdx && !validateCurrentStep()) return;
    coState.currentIdx = targetIdx;
    renderStep();
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.coGoNext = function() {
    if (!validateCurrentStep()) return;
    if (coState.currentIdx < WIZARD_STEPS.length - 1) {
        coState.currentIdx++;
        renderStep();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
};

window.coGoBack = function() {
    if (coState.currentIdx > 0) {
        coState.currentIdx--;
        renderStep();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
};

function renderStep() {
    const idx = coState.currentIdx;
    const total = WIZARD_STEPS.length;
    const step = WIZARD_STEPS[idx];

    // Show only active step div
    WIZARD_STEPS.forEach((s, i) => {
        const el = qs(s.id);
        if (el) el.classList.toggle('hidden', i !== idx);
    });

    // Top progress bar
    const progressPct = ((idx + 1) / total) * 100;
    const pBar = qs('co-progress-bar');
    if (pBar) pBar.style.width = `${progressPct}%`;

    // Step label in header
    const label = qs('co-step-label');
    if (label) label.textContent = `Step ${idx + 1} of ${total} — ${step.title}`;

    // Stepper pills
    WIZARD_STEPS.forEach((s, i) => {
        const pill = qs(`pill-step-${i}`);
        if (!pill) return;
        if (i === idx) {
            pill.className = 'stepper-pill active px-3 py-1.5 rounded-xl text-[12px] font-bold flex items-center gap-1.5 border';
            pill.querySelector('span:first-child').className = 'w-4 h-4 rounded-full bg-white text-primary text-[10px] font-black flex items-center justify-center';
        } else if (i < idx) {
            pill.className = 'stepper-pill completed px-3 py-1.5 rounded-xl text-[12px] font-bold flex items-center gap-1.5 border';
            pill.querySelector('span:first-child').className = 'w-4 h-4 rounded-full bg-[#008A00] text-white text-[10px] font-black flex items-center justify-center';
            pill.querySelector('span:first-child').textContent = '✓';
        } else {
            pill.className = 'stepper-pill upcoming px-3 py-1.5 rounded-xl text-[12px] font-bold flex items-center gap-1.5 border';
            pill.querySelector('span:first-child').className = 'w-4 h-4 rounded-full bg-surface-variant text-secondary text-[10px] font-black flex items-center justify-center';
            pill.querySelector('span:first-child').textContent = `${i + 1}`;
        }
    });

    // Back / Next buttons
    qs('co-btn-back')?.classList.toggle('hidden', idx === 0);
    const isLast = idx === total - 1;
    qs('co-btn-next')?.classList.toggle('hidden', isLast);
    qs('co-header-save-btn')?.classList.toggle('hidden', !isLast);

    // Build Step 6 executive review summary
    if (idx === 5) buildExecutiveSummary();
}

function validateCurrentStep() {
    const idx = coState.currentIdx;

    if (idx === 0) {
        if (!val('co-customer')) { showToast('Please select a customer/buyer', 'error'); return false; }
        if (!val('co-delivery')) { showToast('Please select target delivery deadline', 'error'); return false; }
    }

    if (idx === 1) {
        const totalQty = coState.products.reduce((sum, p) => sum + (p.qty || 0), 0);
        if (totalQty <= 0) { showToast('Order total quantity must be greater than zero', 'error'); return false; }
        for (let i = 0; i < coState.products.length; i++) {
            const p = coState.products[i];
            if (!p.name.trim()) { showToast(`Please enter a name for Product #${i + 1}`, 'error'); return false; }
            const sum = Object.values(p.sizes).reduce((s, v) => s + (v || 0), 0);
            if (sum !== p.qty) {
                showToast(`Size breakdown sum (${sum}) for "${p.name}" must equal target quantity (${p.qty} pcs)`, 'error');
                return false;
            }
        }
    }

    if (idx === 2) {
        if (num('co-fabric-kg') <= 0) { showToast('Please enter fabric weight in kg', 'error'); return false; }
        if (num('co-gsm') <= 0) { showToast('Please enter fabric GSM', 'error'); return false; }
    }

    if (idx === 4) {
        if (num('co-unit-price') <= 0) { showToast('Please enter quoted selling unit price', 'error'); return false; }
    }

    return true;
}

// ─── Step 6 Executive Audit Summary ──────────────────────────────────────────
function buildExecutiveSummary() {
    const container = qs('co-executive-summary');
    if (!container) return;

    const customerSel = qs('co-customer');
    const customerName = customerSel?.options[customerSel.selectedIndex]?.text || 'Direct Buyer';
    const totalQty = coState.products.reduce((sum, p) => sum + (p.qty || 0), 0);
    const unitPrice = num('co-unit-price');
    const grandRevenue = totalQty * unitPrice;
    const fabricKg = num('co-fabric-kg');
    const fabricRate = num('co-fabric-rate');
    const fabricCost = fabricKg * fabricRate;
    const estCost = Math.round(fabricCost + (totalQty * 18) + (totalQty * 45));
    const profit = grandRevenue - estCost;
    const marginPct = grandRevenue > 0 ? Math.round((profit / grandRevenue) * 100) : 0;

    container.innerHTML = `
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-3 border-b border-outline-variant/40">
            <div>
                <span class="text-secondary text-[11px] font-bold uppercase block">Buyer &amp; Reference</span>
                <p class="font-bold text-on-surface text-[15px]">${customerName}</p>
                <p class="text-secondary text-[12px]">PO #: ${val('co-customer-po') || 'Internal Release'}</p>
            </div>
            <div>
                <span class="text-secondary text-[11px] font-bold uppercase block">Delivery Target &amp; Priority</span>
                <p class="font-bold text-on-surface">${val('co-delivery')} • <span class="text-primary font-extrabold uppercase">${coState.priority}</span></p>
                <p class="text-secondary text-[12px]">Route: ${coState.workflowType.replace(/_/g, ' ')}</p>
            </div>
        </div>

        <div class="py-2 border-b border-outline-variant/40">
            <span class="text-secondary text-[11px] font-bold uppercase block mb-1">Product Lines &amp; Size Breakdown</span>
            ${coState.products.map(p => `
                <div class="flex justify-between items-center py-1 text-[13px]">
                    <span class="font-semibold text-on-surface">${p.name} (${p.category})</span>
                    <strong class="text-primary">${p.qty} pcs</strong>
                </div>
            `).join('')}
        </div>

        <div class="grid grid-cols-3 gap-2 py-3 border-b border-outline-variant/40 text-center bg-surface-container/40 rounded-xl p-2.5">
            <div>
                <span class="text-secondary text-[10px] font-bold uppercase block">Quoted Revenue</span>
                <strong class="text-[16px] text-on-surface">₹${Math.round(grandRevenue).toLocaleString('en-IN')}</strong>
            </div>
            <div>
                <span class="text-secondary text-[10px] font-bold uppercase block">Direct Cost</span>
                <strong class="text-[16px] text-secondary">₹${Math.round(estCost).toLocaleString('en-IN')}</strong>
            </div>
            <div>
                <span class="text-secondary text-[10px] font-bold uppercase block">Projected Profit</span>
                <strong class="text-[16px] ${profit >= 0 ? 'text-[#008A00]' : 'text-error'}">₹${Math.round(profit).toLocaleString('en-IN')} (${marginPct}%)</strong>
            </div>
        </div>

        <div class="pt-2 text-[12px]">
            <span class="text-secondary text-[11px] font-bold uppercase block">Fabric &amp; Decoration Specs</span>
            <p class="text-on-surface mt-0.5">${coState.fabricType} — ${val('co-fabric-subtype')}, ${num('co-gsm')} GSM (${fabricKg} kg)</p>
            <p class="text-secondary mt-0.5">Decoration: ${coState.decorationType} • Placement: ${val('co-dec-placement') || 'Chest'}</p>
        </div>
    `;
}

// ─── Order Save Engine ───────────────────────────────────────────────────────
window.coSaveOrder = async function(launchOption = 'orders_tower') {
    if (!validateCurrentStep()) return;

    const totalQty = coState.products.reduce((sum, p) => sum + (p.qty || 0), 0);
    const unitPrice = num('co-unit-price');
    const grandRevenue = totalQty * unitPrice;

    const fabricKg = num('co-fabric-kg');
    const fabricRate = num('co-fabric-rate');
    const fabricCost = fabricKg * fabricRate;
    const estimatedCost = Math.round(fabricCost + (totalQty * 18) + (totalQty * 45));

    const advancePayment = num('co-advance-payment');
    const isFullyPaid = advancePayment >= grandRevenue && grandRevenue > 0;
    const isPartial = advancePayment > 0 && !isFullyPaid;
    const pmtStatus = isFullyPaid ? 'Paid' : isPartial ? 'Partially Paid' : 'Unpaid';

    // Products data with individual status initialized to the first operational stage
    const productsData = coState.products.map(p => ({
        id: p.id || `prod-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
        name: p.name.trim(),
        category: p.category,
        qty: p.qty,
        status: coState.workflowType === 'direct_fulfillment' ? 'Procurement' : 'Fabric',
        workflowType: coState.workflowType,
        sizes: { ...p.sizes }
    }));

    // Comprehensive 7-stage manufacturing metadata
    const stageData = {
        procurement: {
            vendorName: val('co-customer-po') || 'Standard Sourcing',
            purchaseCost: estimatedCost,
            expectedArrival: val('co-delivery'),
            status: 'Allotted'
        },
        fabric: {
            type: coState.fabricType,
            subType: val('co-fabric-subtype'),
            gsm: num('co-gsm'),
            dia: num('co-dia'),
            totalKg: fabricKg,
            ratePerKg: fabricRate,
            totalCost: fabricCost,
            pcsPerKg: fabricKg > 0 ? (totalQty / fabricKg) : 0
        },
        cutting: {
            totalKg: fabricKg,
            totalQty: totalQty,
            sizes: coState.products.reduce((acc, p) => {
                Object.entries(p.sizes).forEach(([sz, val]) => {
                    acc[sz] = (acc[sz] || 0) + (val || 0);
                });
                return acc;
            }, {})
        },
        print_wash: {
            type: coState.decorationType,
            placement: val('co-dec-placement') || 'Chest',
            colors: val('co-dec-colors') || '2 Colors',
            notes: val('co-dec-placement')
        },
        stitching: {
            expectedDate: val('co-delivery'),
            notes: 'Standard sewing line assembly'
        },
        packing: {
            notes: val('co-packaging-notes') || 'Standard export polybag packaging. 50 pcs/ctn',
            expectedDate: val('co-delivery')
        },
        dispatch: {
            shippingAddress: val('co-shipping-address'),
            dispatchDate: val('co-delivery')
        }
    };

    const orderData = {
        customerId: val('co-customer'),
        customerName: qs('co-customer')?.options[qs('co-customer').selectedIndex]?.text?.split(' (')[0] || '',
        customerPO: val('co-customer-po') || '',
        product: coState.products.map(p => p.name).join(', '),
        qty: totalQty,
        unitPrice: unitPrice,
        value: grandRevenue,
        incurredCost: estimatedCost,
        deliveryDate: val('co-delivery'),
        priority: coState.priority,
        workflowType: coState.workflowType,
        status: coState.workflowType === 'direct_fulfillment' ? 'Procurement' : 'Fabric',
        progressPercentage: 10,
        progressLabel: 'Fabric Inward Phase',
        paymentStatus: pmtStatus,
        paymentReceived: advancePayment,
        paymentTerms: val('co-payment-terms'),
        notes: val('co-packaging-notes'),
        shippingAddress: val('co-shipping-address'),
        fabric: `${coState.fabricType} — ${val('co-fabric-subtype')}, ${num('co-gsm')} GSM`,
        stageData: stageData,
        products: productsData,
        timeline: [
            {
                status: 'Order Released to Factory',
                date: new Date().toISOString(),
                user: 'Merchandiser'
            }
        ]
    };

    try {
        const headerSaveBtn = qs('co-header-save-btn');
        if (headerSaveBtn) { headerSaveBtn.disabled = true; headerSaveBtn.textContent = 'Saving...'; }

        const createdOrder = await orderStore.create(orderData);
        const orderId = createdOrder?.id || orderData.id;

        showToast('Apparel order successfully booked!', 'success');

        setTimeout(() => {
            if (launchOption === 'launch_floor' && orderId) {
                window.location.href = `production.html?orderId=${orderId}&stage=fabric`;
            } else if (launchOption === 'print_traveler' && orderId) {
                window.location.href = `orders.html?orderId=${orderId}&print=traveler`;
            } else {
                window.location.href = 'orders.html';
            }
        }, 800);
    } catch (err) {
        console.error("Failed to save order:", err);
        showToast('Failed to save order. Please check required fields.', 'error');
        const headerSaveBtn = qs('co-header-save-btn');
        if (headerSaveBtn) { headerSaveBtn.disabled = false; headerSaveBtn.textContent = 'Save Order'; }
    }
};

// ─── Toast Notifications ─────────────────────────────────────────────────────
function showToast(message, type = 'info') {
    const container = qs('toast-container');
    if (!container) return;

    const isError   = type === 'error';
    const isSuccess = type === 'success';
    const bg = isError ? 'bg-red-600 text-white' : isSuccess ? 'bg-[#008A00] text-white' : 'bg-surface-container-high text-on-surface';
    const icon = isError ? 'error' : isSuccess ? 'check_circle' : 'info';

    const t = document.createElement('div');
    t.className = `${bg} px-4 py-3 rounded-xl shadow-lg text-[14px] font-bold flex items-center gap-2 transform transition-all translate-y-[-20px] opacity-0 pointer-events-auto`;
    t.innerHTML = `<span class="material-symbols-outlined text-[18px]">${icon}</span> ${message}`;
    container.appendChild(t);

    requestAnimationFrame(() => {
        t.classList.remove('translate-y-[-20px]', 'opacity-0');
        setTimeout(() => {
            t.classList.add('opacity-0', 'translate-y-[-20px]');
            setTimeout(() => t.remove(), 300);
        }, 3000);
    });
}
