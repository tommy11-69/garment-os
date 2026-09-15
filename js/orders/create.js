/**
 * create.js — Multi-Product Split Workflow Order Booking Wizard (v6.0)
 *
 * Architecture:
 *  - 4 wizard steps: Buyer & PO | Products & Line Items | Pricing | Review & Launch
 *  - Each product line item owns its own: Fabric spec, Workflow route, Decoration, Unit price
 *  - Saved order includes lineItems[] (new per-product schema) AND flat stageData (legacy compat)
 */

import { orderStore }       from '../stores/OrderStore.js?v=5.2';
import { customerStore }    from '../stores/CustomerStore.js?v=5.2';
import { api }              from '../services/api.js?v=5.2';
import {
    STAGE_DEFINITIONS,
    WORKFLOW_ROUTES,
    normalizeStageKey,
    mergeLineItemsToFlatStageData
} from '../production/domain/workflowEngine.js?v=6.0';

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

// ─── Workflow Presets (for UI card rendering) ─────────────────────────────────
const WORKFLOW_PRESETS = [
    {
        key:      'default',
        label:    'Standard Knits CMT',
        icon:     'precision_manufacturing',
        pipeline: 'Sourcing → Fabric → Cutting → Stitching → Print/Wash → Packing → Dispatch'
    },
    {
        key:      'print_before_stitch',
        label:    'Print-First / Sublimation',
        icon:     'palette',
        pipeline: 'Sourcing → Fabric → Cutting → Print → Stitching → Packing → Dispatch'
    },
    {
        key:      'wash_before_stitch',
        label:    'Garment Enzyme Wash',
        icon:     'water_drop',
        pipeline: 'Cutting → Stitching → Industrial Wash → Print/Pack → Dispatch'
    },
    {
        key:      'stitch_before_embroidery',
        label:    'Finished Garment Embellishment',
        icon:     'auto_fix_high',
        pipeline: 'Cutting → Sewing Assembly → Embroidery on Assembled → Packing'
    },
    {
        key:      'direct_fulfillment',
        label:    'Direct Sourcing / Trading',
        icon:     'local_shipping',
        pipeline: 'Procurement → Quality Audit → Dispatch (no floor cutting/sewing)'
    },
    {
        key:      'full_vertical',
        label:    'Full Vertical Integration',
        icon:     'factory',
        pipeline: 'Yarn Procurement → Winding → Knitting → Dyeing & Compacting → Cutting → Stitching → Pack → Dispatch'
    }
];

// ─── 4 Wizard Steps ──────────────────────────────────────────────────────────
const WIZARD_STEPS = [
    { id: 'co-step-1', title: 'Buyer & PO Profile' },
    { id: 'co-step-2', title: 'Products & Split Workflows' },
    { id: 'co-step-3', title: 'Commercial Pricing' },
    { id: 'co-step-4', title: 'Review & Launch' }
];

// ─── Default product factory ──────────────────────────────────────────────────
function makeDefaultProduct(n = 1) {
    return {
        id:                  `prod-${Date.now()}-${n}`,
        name:                '',
        category:            'Adults',
        qty:                 0,
        sizes:               { XS: 0, S: 0, M: 0, L: 0, XL: 0, XXL: 0, XXXL: 0, XXXXL: 0 },
        fabric: {
            type:       '',
            subtype:    '',
            gsm:        '',
            dia:        '',
            ratePerKg:  ''
        },
        workflowType:         'default',
        decorationType:       '',
        decorationPlacement:  '',
        decorationColors:     '',
        unitPrice:            ''
    };
}

// ─── Wizard State ────────────────────────────────────────────────────────────
let coState = {
    currentIdx: 0,
    priority:   'Normal',
    costings:   [],
    products:   [ makeDefaultProduct(1) ]
};

// Initial default product gets a bell-curve preset on first render
let _initialPresetApplied = false;

// ─── DOM Helpers ─────────────────────────────────────────────────────────────
const qs  = id  => document.getElementById(id);
const val = id  => (qs(id) ? qs(id).value.trim() : '');
const num = id  => parseFloat(qs(id)?.value) || 0;

// ─── DOMContentLoaded Initialization ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Default delivery date (+21 days)
    const defDelivery = new Date();
    defDelivery.setDate(defDelivery.getDate() + 21);
    const delInput = qs('co-delivery');
    if (delInput) delInput.value = defDelivery.toISOString().split('T')[0];

    // 2. Apply bell-curve ratio to first default product so size cells are pre-filled
    applyRatioPresetInternal(0, 'bell');
    _initialPresetApplied = true;

    // 3. Render initial products list
    renderProducts();

    // 4. Load customers
    try {
        await customerStore.loadInitial();
        populateCustomers();
        customerStore.subscribe(() => populateCustomers());
    } catch (e) {
        console.error('Failed to load customers:', e);
    }

    // 5. Load quotations for auto-fill
    try {
        coState.costings = await api.getCostings().catch(() => []);
        populateQuotations();
    } catch (e) {
        console.error('Failed to load costings:', e);
    }

    // 6. Bind advance payment listener (other listeners are inline in rendered HTML)
    qs('co-advance-payment')?.addEventListener('input', calculateFinancials);

    // 7. Initial financials + step render
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

qs('co-customer')?.addEventListener('change', function(e) {
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
});

function prefillCustomerAddress(customerId) {
    if (!customerId) return;
    const cust = (customerStore.state.entities || []).find(c => c.id === customerId);
    if (cust?.shippingAddress) {
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

    const prod = coState.products[0];
    if (!prod) return;

    if (quote.styleRef)    prod.name = quote.styleRef;
    if (quote.fabricGsm)   prod.fabric.gsm = Number(quote.fabricGsm);
    if (quote.fabricType)  prod.fabric.type = quote.fabricType;
    if (quote.retailPrice || quote.totalCost) {
        prod.unitPrice = Number(quote.retailPrice || quote.totalCost) || prod.unitPrice;
    }

    renderProducts();
    calculateFinancials();
    showToast(`Pre-filled specs from "${quote.styleRef}"`, 'success');
};

// ─── Priority Toggle ─────────────────────────────────────────────────────────
window.coSetPriority = function(prio) {
    coState.priority = prio;
    const active   = 'py-3 rounded-xl border-2 border-primary bg-primary text-white font-bold text-[13px] transition-all active-scale shadow-xs';
    const inactive = 'py-3 rounded-xl border-2 border-outline-variant bg-surface text-secondary font-bold text-[13px] transition-all active-scale';
    qs('prio-normal-btn') && (qs('prio-normal-btn').className = prio === 'Normal' ? active : inactive);
    qs('prio-high-btn')   && (qs('prio-high-btn').className   = prio === 'High'   ? active : inactive);
    qs('prio-urgent-btn') && (qs('prio-urgent-btn').className = prio === 'Urgent' ? active : inactive);
};

// ─── Automated BOM Estimator per product ─────────────────────────────────────
function computeProductBOM(prod) {
    const qty            = prod.qty || 0;
    const isFleece       = prod.fabric.type === 'Fleece';
    const avgConsumption = isFleece ? 0.65 : 0.24;       // kg per pc
    const netKg          = qty * avgConsumption;
    const grossKg        = Math.round(netKg * 1.05 * 10) / 10;   // +5% buffer
    const rolls          = Math.ceil(grossKg / 20);               // 20 kg rolls
    const fabricCost     = Math.round(grossKg * (Number(prod.fabric.ratePerKg) || 0));

    return { avgConsumption, netKg: Math.round(netKg * 10) / 10, grossKg, rolls, fabricCost };
}

// ─── Product card: per-product fabric type switch ────────────────────────────
window.coSwitchProductFabricType = function(idx, type) {
    const prod = coState.products[idx];
    if (!prod) return;

    prod.fabric.type    = type;
    prod.fabric.subtype = (FABRIC_SUBTYPES[type] || [])[0] || '';
    prod.fabric.gsm     = type === 'Fleece' ? 280 : type === 'Polyester' ? 160 : 180;

    renderProducts();
    calculateFinancials();
};

// ─── Product card: fabric field updates ─────────────────────────────────────
window.coUpdateProductFabricField = function(idx, field, value) {
    const prod = coState.products[idx];
    if (!prod) return;
    prod.fabric[field] = (field === 'subtype') ? value : (parseFloat(value) || 0);
    // Update BOM display without re-rendering whole list
    updateProductBOMDisplay(idx);
    calculateFinancials();
};

function updateProductBOMDisplay(idx) {
    const prod = coState.products[idx];
    if (!prod) return;
    const bom = computeProductBOM(prod);
    const set = (id, val) => { const el = qs(id); if (el) el.textContent = val; };
    set(`bom-consumption-${idx}`, `${bom.avgConsumption} kg`);
    set(`bom-gross-${idx}`,       `${bom.grossKg} kg`);
    set(`bom-rolls-${idx}`,       `${bom.rolls}`);
    set(`bom-cost-${idx}`,        `₹${bom.fabricCost.toLocaleString('en-IN')}`);
}

// ─── Product card: workflow selection ────────────────────────────────────────
window.coSelectProductWorkflow = function(idx, wfKey) {
    const prod = coState.products[idx];
    if (!prod) return;
    prod.workflowType = wfKey;
    renderProducts();
};

// ─── Product card: decoration type selection ─────────────────────────────────
window.coSelectProductDecType = function(idx, type) {
    const prod = coState.products[idx];
    if (!prod) return;
    prod.decorationType = type;
    renderProducts();
};

// ─── Product card: generic field update ──────────────────────────────────────
window.coUpdateProductField = function(idx, field, value) {
    const prod = coState.products[idx];
    if (!prod) return;
    prod[field] = value;
};

// ─── Product list management ─────────────────────────────────────────────────
window.coAddProduct = function() {
    const newIdx = coState.products.length + 1;
    const p = makeDefaultProduct(newIdx);
    coState.products.push(p);
    renderProducts();
    calculateFinancials();
};

window.coRemoveProduct = function(idx) {
    if (coState.products.length <= 1) {
        showToast('Order must contain at least one product', 'error');
        return;
    }
    coState.products.splice(idx, 1);
    renderProducts();
    calculateFinancials();
};

// ─── Product sizing ───────────────────────────────────────────────────────────
window.coSetProductCategory = function(idx, category) {
    const prod = coState.products[idx];
    if (!prod) return;
    prod.category = category;
    if (category === 'Adults') {
        prod.sizes = { XS: 0, S: 0, M: 0, L: 0, XL: 0, XXL: 0, XXXL: 0, XXXXL: 0 };
        applyRatioPresetInternal(idx, 'even');
    } else if (category === 'Kids') {
        prod.sizes = { '24': 0, '26': 0, '28': 0, '30': 0, '32': 0, '34': 0, '36': 0, '38': 0 };
        applyRatioPresetInternal(idx, 'even');
    } else {
        prod.category = 'General';
        prod.sizes = { 'Free Size': prod.qty || 0 };
    }
    renderProducts();
    calculateFinancials();
};

window.coUpdateProductTargetQty = function(idx, targetVal) {
    const prod = coState.products[idx];
    if (!prod) return;
    prod.qty = parseInt(targetVal) || 0;

    if (prod.category === 'General') {
        prod.sizes = { 'Free Size': prod.qty };
        const genDisplay = qs(`general-qty-display-${idx}`);
        if (genDisplay) genDisplay.textContent = `${prod.qty} pcs`;
    } else {
        applyRatioPresetInternal(idx, 'even');
        const isAdults = prod.category === 'Adults';
        const sizeKeys = isAdults
            ? ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'XXXXL']
            : ['24', '26', '28', '30', '32', '34', '36', '38'];
        sizeKeys.forEach(sz => {
            const input = qs(`size-input-${idx}-${sz}`);
            if (input) input.value = prod.sizes[sz] || '';
        });
    }

    const totalQty = coState.products.reduce((s, p) => s + (p.qty || 0), 0);
    const totalPcsEl = qs('co-header-total-pcs');
    if (totalPcsEl) totalPcsEl.textContent = `${totalQty.toLocaleString()} pcs total`;

    updateProductSumBadge(idx);
    updateProductBOMDisplay(idx);
    calculateFinancials();
};

window.coUpdateProductSizeCell = function(idx, sizeKey, cellVal) {
    const prod = coState.products[idx];
    if (!prod) return;
    prod.sizes[sizeKey] = parseInt(cellVal) || 0;
    updateProductSumBadge(idx);
    updateProductBOMDisplay(idx);
    calculateFinancials();
};

// Internal ratio preset logic (not exposed to window)
function applyRatioPresetInternal(idx, presetType) {
    const prod = coState.products[idx];
    if (!prod) return;
    const target = prod.qty || 0;
    if (prod.category === 'General') {
        prod.sizes = { 'Free Size': target };
        return;
    }
    const isAdults = prod.category === 'Adults';

    if (presetType === 'clear') {
        Object.keys(prod.sizes).forEach(k => { prod.sizes[k] = 0; });
        return;
    }

    if (presetType === 'even') {
        const activeKeys = isAdults ? ['S', 'M', 'L', 'XL'] : ['28', '30', '32', '34'];
        const perSize    = Math.floor(target / activeKeys.length);
        const remainder  = target % activeKeys.length;
        Object.keys(prod.sizes).forEach(k => { prod.sizes[k] = 0; });
        activeKeys.forEach((k, i) => { prod.sizes[k] = perSize + (i === 0 ? remainder : 0); });
        return;
    }

    if (presetType === 'bell') {
        const weights = isAdults
            ? { S: 1, M: 2, L: 2, XL: 1 }
            : { '28': 1, '30': 2, '32': 2, '34': 1 };
        const totalWeight = 6;
        const unit        = Math.floor(target / totalWeight);
        Object.keys(prod.sizes).forEach(k => { prod.sizes[k] = 0; });
        let allocated = 0;
        Object.entries(weights).forEach(([k, w]) => {
            prod.sizes[k] = unit * w;
            allocated += unit * w;
        });
        const centerKey = isAdults ? 'M' : '30';
        prod.sizes[centerKey] += (target - allocated);
    }
}

window.coApplyRatioPreset = function(idx, presetType) {
    applyRatioPresetInternal(idx, presetType);
    renderProducts();
    calculateFinancials();
};

function updateProductSumBadge(idx) {
    const prod = coState.products[idx];
    if (!prod) return;
    const isGeneral = prod.category === 'General';
    const currentSum = Object.values(prod.sizes).reduce((s, v) => s + (v || 0), 0);
    const isMatch    = isGeneral ? (prod.qty > 0) : (currentSum === prod.qty);
    const badge      = qs(`p-sum-badge-${idx}`);
    if (badge) {
        badge.className = `px-2.5 py-1 rounded-full text-[11px] font-bold ${
            isMatch
                ? 'bg-[#008A00]/10 text-[#008A00] border border-[#008A00]/20'
                : 'bg-error/10 text-error border border-error/20'
        }`;
        badge.textContent = isGeneral ? `${prod.qty || 0} pcs (General)` : `${currentSum} / ${prod.qty} pcs`;
    }
}

// ─── Product Card Renderer ───────────────────────────────────────────────────
function renderProductCard(prod, idx) {
    const isGeneral = prod.category === 'General';
    const isAdults  = prod.category === 'Adults';
    const sizeKeys  = isAdults
        ? ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'XXXXL']
        : ['24', '26', '28', '30', '32', '34', '36', '38'];

    const currentSum = Object.values(prod.sizes).reduce((s, v) => s + (v || 0), 0);
    const isMatch    = isGeneral ? (prod.qty > 0) : (currentSum === prod.qty);
    const bom        = computeProductBOM(prod);

    // Size inputs
    const sizeInputsHtml = isGeneral ? `
        <div class="col-span-full bg-surface-container/50 border border-outline-variant/60 rounded-xl p-3.5 flex items-center justify-between">
            <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <span class="material-symbols-outlined text-[20px]">layers</span>
                </div>
                <div>
                    <p class="text-[13px] font-bold text-on-surface">General / Free Size Quantity</p>
                    <p class="text-[11px] text-secondary">Single batch volume without size distribution matrix.</p>
                </div>
            </div>
            <div class="text-right">
                <span class="text-[10px] font-bold text-secondary uppercase block">Batch Total</span>
                <span id="general-qty-display-${idx}" class="text-[15px] font-extrabold text-primary">${prod.qty || 0} pcs</span>
            </div>
        </div>
    ` : sizeKeys.map(sz => `
        <div class="flex flex-col items-center gap-1 bg-surface-container/60 rounded-xl p-2 border border-outline-variant/40">
            <span class="text-[10px] font-bold text-secondary uppercase">${sz}</span>
            <input type="number" min="0" placeholder="0" value="${prod.sizes[sz] || ''}"
                id="size-input-${idx}-${sz}"
                oninput="window.coUpdateProductSizeCell(${idx}, '${sz}', this.value)"
                class="w-full text-center font-bold text-[14px] bg-transparent border-0 p-0 focus:ring-0 outline-none text-on-surface">
        </div>
    `).join('');

    // Fabric type buttons
    const fabricTypeBtns = ['Cotton', 'Polyester', 'Blended', 'Fleece'].map(ft => {
        const isActive = prod.fabric.type === ft;
        const label    = ft === 'Blended' ? 'Poly Blend' : ft === 'Fleece' ? 'Fleece/FT' : ft;
        return `<button type="button" onclick="window.coSwitchProductFabricType(${idx}, '${ft}')"
            class="${isActive ? 'border-primary bg-primary text-white shadow-sm' : 'border-outline-variant bg-surface text-secondary'} 
            py-2 rounded-xl border-2 font-bold text-[12px] transition-all active-scale">
            ${label}
        </button>`;
    }).join('');

    // Fabric subtype options
    const subtypeOptions = (FABRIC_SUBTYPES[prod.fabric.type] || []).map(s =>
        `<option value="${s}" ${prod.fabric.subtype === s ? 'selected' : ''}>${s}</option>`
    ).join('');

    // Workflow preset cards (compact 2-col grid)
    const workflowCards = WORKFLOW_PRESETS.map(wf => {
        const isSelected = prod.workflowType === wf.key;
        return `
        <div class="${isSelected
                ? 'border-primary bg-primary/5 shadow-sm'
                : 'border-outline-variant bg-surface-container-lowest hover:border-primary/40'}
            workflow-item-card cursor-pointer rounded-xl p-3 border-2 transition-all"
            onclick="window.coSelectProductWorkflow(${idx}, '${wf.key}')">
            <div class="flex items-start justify-between gap-2">
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-1.5 mb-0.5">
                        <span class="material-symbols-outlined text-[14px] ${isSelected ? 'text-primary' : 'text-secondary'}">${wf.icon}</span>
                        <h5 class="text-[12px] font-extrabold ${isSelected ? 'text-primary' : 'text-on-surface'} leading-snug">${wf.label}</h5>
                    </div>
                    <p class="text-[10px] text-secondary leading-snug">${wf.pipeline}</p>
                </div>
                ${isSelected
                    ? `<span class="material-symbols-outlined text-primary text-[18px] shrink-0 mt-0.5">check_circle</span>`
                    : `<span class="w-4 h-4 rounded-full border-2 border-outline-variant shrink-0 mt-1"></span>`
                }
            </div>
        </div>`;
    }).join('');

    // Decoration type buttons
    const decTypes = [
        { key: 'Screen', label: 'Screen Print' },
        { key: 'DTF', label: 'DTF Heat Transfer' },
        { key: 'Embroidery', label: 'Embroidery' },
        { key: 'None', label: 'Plain / Solid' }
    ];
    const decBtns = decTypes.map(({ key, label }) => {
        const isActive = prod.decorationType === key;
        return `<button type="button" onclick="window.coSelectProductDecType(${idx}, '${key}')"
            class="${isActive ? 'border-primary bg-primary text-white shadow-sm' : 'border-outline-variant bg-surface text-secondary'}
            py-2 rounded-xl border-2 font-bold text-[11px] transition-all active-scale">
            ${label}
        </button>`;
    }).join('');

    const decDetailsHtml = prod.decorationType !== 'None' ? `
        <div class="grid grid-cols-2 gap-3 mt-2">
            <div class="flex flex-col gap-1">
                <label class="text-[10px] font-bold text-secondary uppercase tracking-wider">Placement</label>
                <input type="text" value="${prod.decorationPlacement || 'Center Chest'}" placeholder="e.g. Center Chest 10×10"
                    oninput="window.coUpdateProductField(${idx}, 'decorationPlacement', this.value)"
                    class="w-full bg-surface border border-outline-variant rounded-xl px-3 py-2 text-[13px] text-on-surface outline-none focus:ring-2 focus:ring-primary/20">
            </div>
            <div class="flex flex-col gap-1">
                <label class="text-[10px] font-bold text-secondary uppercase tracking-wider">Colors / Stitches</label>
                <input type="text" value="${prod.decorationColors || '2 Colors'}" placeholder="e.g. 3 Colors Plastisol"
                    oninput="window.coUpdateProductField(${idx}, 'decorationColors', this.value)"
                    class="w-full bg-surface border border-outline-variant rounded-xl px-3 py-2 text-[13px] text-on-surface outline-none focus:ring-2 focus:ring-primary/20">
            </div>
        </div>
    ` : `<p class="text-[11px] text-secondary italic mt-2">No decoration — plain solid garment.</p>`;

    return `
    <div class="bg-surface-container-lowest border-2 border-outline-variant rounded-2xl shadow-sm overflow-hidden transition-all" id="product-card-${idx}">

        <!-- ── Card Header ──────────────────────────────────────────────── -->
        <div class="flex justify-between items-center px-5 py-4 bg-surface-container border-b border-outline-variant/60">
            <div class="flex items-center gap-3 flex-1 min-w-0">
                <span class="w-7 h-7 rounded-full bg-primary text-white text-[12px] font-extrabold flex items-center justify-center shrink-0">${idx + 1}</span>
                <input type="text" value="${prod.name || ''}" placeholder="Enter product / style name..."
                    oninput="window.coUpdateProductField(${idx}, 'name', this.value)"
                    class="flex-1 bg-transparent border-0 p-0 text-[15px] font-bold text-on-surface outline-none focus:ring-0 placeholder:text-secondary/50 min-w-0">
            </div>
            <div class="flex items-center gap-2 shrink-0 ml-3">
                <span id="p-sum-badge-${idx}" class="px-2.5 py-1 rounded-full text-[11px] font-bold ${isMatch ? 'bg-[#008A00]/10 text-[#008A00] border border-[#008A00]/20' : 'bg-error/10 text-error border border-error/20'}">
                    ${isGeneral ? `${prod.qty || 0} pcs (General)` : `${currentSum} / ${prod.qty} pcs`}
                </span>
                ${coState.products.length > 1 ? `
                    <button type="button" onclick="window.coRemoveProduct(${idx})"
                        class="text-error hover:bg-error/10 p-1.5 rounded-lg active-scale transition-apple" title="Remove Product">
                        <span class="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                ` : ''}
            </div>
        </div>

        <!-- ── Section A: Sizing ─────────────────────────────────────────── -->
        <div class="px-5 py-4 flex flex-col gap-3 border-b border-outline-variant/40 card-section-sizing pl-6">
            <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-[17px] text-[#FF9500]">straighten</span>
                <h4 class="text-[12px] font-extrabold text-[#FF9500] uppercase tracking-widest">Sizing &amp; Quantity</h4>
            </div>

            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div class="flex items-center gap-3 flex-wrap">
                    <!-- Category toggle -->
                    <div class="flex rounded-xl border border-outline-variant overflow-hidden text-[12px] font-bold">
                        <button type="button" onclick="window.coSetProductCategory(${idx}, 'Adults')"
                            class="${isAdults ? 'bg-primary text-white' : 'bg-surface text-secondary hover:bg-surface-variant'} px-3 py-1.5 transition-all">
                            Adults
                        </button>
                        <button type="button" onclick="window.coSetProductCategory(${idx}, 'Kids')"
                            class="${prod.category === 'Kids' ? 'bg-primary text-white' : 'bg-surface text-secondary hover:bg-surface-variant'} px-3 py-1.5 transition-all border-l border-outline-variant">
                            Kids
                        </button>
                        <button type="button" onclick="window.coSetProductCategory(${idx}, 'General')"
                            class="${isGeneral ? 'bg-primary text-white' : 'bg-surface text-secondary hover:bg-surface-variant'} px-3 py-1.5 transition-all border-l border-outline-variant">
                            General (No Sizes)
                        </button>
                    </div>
                    <!-- Target qty -->
                    <div class="flex items-center gap-2">
                        <label class="text-[10px] font-bold text-secondary uppercase whitespace-nowrap">Target Qty</label>
                        <input type="number" min="1" value="${prod.qty || ''}" placeholder="0"
                            id="target-qty-${idx}"
                            oninput="window.coUpdateProductTargetQty(${idx}, this.value)"
                            class="w-24 bg-surface border border-outline-variant rounded-xl px-3 py-1.5 text-[15px] font-extrabold text-primary outline-none focus:ring-2 focus:ring-primary/20 text-center">
                    </div>
                </div>
                ${!isGeneral ? `
                <!-- Ratio presets -->
                <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                    <span class="text-[10px] font-bold text-secondary uppercase mr-1 whitespace-nowrap">Presets:</span>
                    <button type="button" onclick="window.coApplyRatioPreset(${idx}, 'even')"  class="ratio-btn px-2.5 py-1 rounded-lg border border-outline-variant text-[11px] font-bold text-secondary bg-surface whitespace-nowrap">Even Split</button>
                    <button type="button" onclick="window.coApplyRatioPreset(${idx}, 'bell')"  class="ratio-btn px-2.5 py-1 rounded-lg border border-outline-variant text-[11px] font-bold text-secondary bg-surface whitespace-nowrap">Bell Curve</button>
                    <button type="button" onclick="window.coApplyRatioPreset(${idx}, 'clear')" class="ratio-btn px-2.5 py-1 rounded-lg border border-outline-variant text-[11px] font-bold text-error   bg-surface whitespace-nowrap">Clear</button>
                </div>
                ` : ''}
            </div>

            <!-- Size grid -->
            <div class="${isGeneral ? 'grid grid-cols-1' : 'grid grid-cols-4 sm:grid-cols-8 gap-2'}">
                ${sizeInputsHtml}
            </div>
        </div>

        <!-- ── Section B: Fabric & Material ─────────────────────────────── -->
        <div class="px-5 py-4 flex flex-col gap-3 border-b border-outline-variant/40 card-section-fabric pl-6 bg-surface/30">
            <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-[17px] text-[#007AFF]">texture</span>
                <h4 class="text-[12px] font-extrabold text-[#007AFF] uppercase tracking-widest">Fabric &amp; Material</h4>
            </div>

            <!-- Fiber type -->
            <div class="grid grid-cols-4 gap-2">
                ${fabricTypeBtns}
            </div>

            <!-- Subtype + GSM + Dia -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div class="flex flex-col gap-1">
                    <label class="text-[10px] font-bold text-secondary uppercase tracking-wider">Knit Construction</label>
                    <select onchange="window.coUpdateProductFabricField(${idx}, 'subtype', this.value)"
                        class="w-full bg-surface border border-outline-variant rounded-xl px-3 py-2 text-[13px] font-semibold text-on-surface outline-none focus:ring-2 focus:ring-primary/20">
                        ${subtypeOptions}
                    </select>
                </div>
                <div class="flex flex-col gap-1">
                    <label class="text-[10px] font-bold text-secondary uppercase tracking-wider">GSM (Weight) *</label>
                    <input type="number" value="${prod.fabric.gsm || 180}" placeholder="e.g. 180"
                        oninput="window.coUpdateProductFabricField(${idx}, 'gsm', this.value)"
                        class="w-full bg-surface border border-outline-variant rounded-xl px-3 py-2 text-[14px] font-bold text-on-surface outline-none focus:ring-2 focus:ring-primary/20">
                </div>
                <div class="flex flex-col gap-1">
                    <label class="text-[10px] font-bold text-secondary uppercase tracking-wider">Knitting Dia (inches)</label>
                    <input type="number" value="${prod.fabric.dia || 34}" placeholder="e.g. 34"
                        oninput="window.coUpdateProductFabricField(${idx}, 'dia', this.value)"
                        class="w-full bg-surface border border-outline-variant rounded-xl px-3 py-2 text-[14px] text-on-surface outline-none focus:ring-2 focus:ring-primary/20">
                </div>
            </div>

            <!-- Rate + Auto BOM mini-card -->
            <div class="flex flex-col sm:flex-row gap-3 items-stretch">
                <div class="flex flex-col gap-1 sm:w-44 shrink-0">
                    <label class="text-[10px] font-bold text-secondary uppercase tracking-wider">Fabric Rate (₹/kg)</label>
                    <div class="relative">
                        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-secondary font-bold text-[13px]">₹</span>
                        <input type="number" value="${prod.fabric.ratePerKg || 380}" placeholder="380"
                            oninput="window.coUpdateProductFabricField(${idx}, 'ratePerKg', this.value)"
                            class="w-full bg-surface border border-outline-variant rounded-xl pl-8 pr-3 py-2 text-[14px] font-bold text-on-surface outline-none focus:ring-2 focus:ring-primary/20">
                    </div>
                </div>
                <!-- BOM output -->
                <div class="flex-1 bg-gradient-to-r from-primary/5 to-blue-50 border border-primary/20 rounded-xl p-3">
                    <div class="flex items-center gap-1.5 mb-2">
                        <span class="material-symbols-outlined text-[14px] text-primary">calculate</span>
                        <span class="text-[10px] font-extrabold text-primary uppercase tracking-wider">Auto BOM Estimate (+5% Cutting Buffer)</span>
                    </div>
                    <div class="grid grid-cols-4 gap-2 text-center">
                        <div>
                            <span class="text-[9px] font-bold text-secondary uppercase block">Per Pc</span>
                            <strong id="bom-consumption-${idx}" class="text-[13px] text-on-surface">${bom.avgConsumption} kg</strong>
                        </div>
                        <div>
                            <span class="text-[9px] font-bold text-secondary uppercase block">Gross +5%</span>
                            <strong id="bom-gross-${idx}" class="text-[13px] text-primary">${bom.grossKg} kg</strong>
                        </div>
                        <div>
                            <span class="text-[9px] font-bold text-secondary uppercase block">Est. 20kg Rolls</span>
                            <strong id="bom-rolls-${idx}" class="text-[13px] text-on-surface">${bom.rolls}</strong>
                        </div>
                        <div>
                            <span class="text-[9px] font-bold text-secondary uppercase block">Fabric Cost</span>
                            <strong id="bom-cost-${idx}" class="text-[12px] text-[#008A00]">₹${bom.fabricCost.toLocaleString('en-IN')}</strong>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- ── Section C: Production Workflow ──────────────────────────── -->
        <div class="px-5 py-4 flex flex-col gap-3 card-section-workflow pl-6">
            <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-[17px] text-[#5856D6]">route</span>
                <h4 class="text-[12px] font-extrabold text-[#5856D6] uppercase tracking-widest">Production Workflow</h4>
            </div>

            <!-- Workflow preset grid -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                ${workflowCards}
            </div>

            <!-- Decoration -->
            <div class="pt-3 border-t border-outline-variant/40">
                <h5 class="text-[10px] font-bold text-secondary uppercase tracking-wider mb-2">Decoration / Embellishment</h5>
                <div class="grid grid-cols-4 gap-2">
                    ${decBtns}
                </div>
                ${decDetailsHtml}
            </div>
        </div>
    </div>`;
}

function renderProducts() {
    const container = qs('co-products-container');
    if (!container) return;
    container.innerHTML = coState.products.map((p, i) => renderProductCard(p, i)).join('');

    const totalQty = coState.products.reduce((s, p) => s + (p.qty || 0), 0);
    const el = qs('co-header-total-pcs');
    if (el) el.textContent = `${totalQty.toLocaleString()} pcs total`;
}

// ─── Step 3: Per-product Pricing Table ───────────────────────────────────────
function renderPricingTable() {
    const container = qs('co-pricing-table');
    if (!container) return;

    container.innerHTML = coState.products.map((prod, idx) => {
        const lineTotal = (prod.qty || 0) * (prod.unitPrice || 0);
        const bom       = computeProductBOM(prod);
        return `
        <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div class="flex items-center gap-3 flex-1 min-w-0">
                <span class="w-7 h-7 rounded-full bg-primary/10 text-primary text-[12px] font-extrabold flex items-center justify-center shrink-0">${idx + 1}</span>
                <div class="min-w-0">
                    <p class="text-[14px] font-bold text-on-surface truncate">${prod.name || `Product #${idx + 1}`}</p>
                    <div class="flex items-center gap-2 flex-wrap mt-0.5">
                        <span class="text-[11px] text-secondary">${(prod.qty || 0).toLocaleString()} pcs</span>
                        <span class="text-outline-variant">·</span>
                        <span class="text-[11px] text-secondary">${prod.fabric.type} ${prod.fabric.gsm} GSM</span>
                        <span class="text-outline-variant">·</span>
                        <span class="text-[11px] font-bold text-[#5856D6]">${prod.workflowType.replace(/_/g, ' ')}</span>
                        <span class="text-outline-variant">·</span>
                        <span class="text-[11px] text-secondary">Fabric Cost: ₹${bom.fabricCost.toLocaleString('en-IN')}</span>
                    </div>
                </div>
            </div>
            <div class="flex items-center gap-4 shrink-0">
                <div class="flex flex-col gap-0.5">
                    <label class="text-[10px] font-bold text-secondary uppercase">Unit Price (₹/pc) *</label>
                    <div class="relative">
                        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-secondary font-bold text-[12px]">₹</span>
                        <input type="number" value="${prod.unitPrice || ''}" step="0.5" placeholder="e.g. 240"
                            oninput="window.coUpdateProductField(${idx}, 'unitPrice', parseFloat(this.value) || 0); calculateFinancials();"
                            class="w-32 bg-surface border border-outline-variant rounded-xl pl-7 pr-3 py-2.5 text-[16px] font-extrabold text-on-surface outline-none focus:ring-2 focus:ring-primary/20">
                    </div>
                </div>
                <div class="flex flex-col gap-0.5 text-right min-w-[80px]">
                    <span class="text-[10px] font-bold text-secondary uppercase">Line Total</span>
                    <span id="line-total-${idx}" class="text-[16px] font-extrabold text-primary">₹${Math.round(lineTotal).toLocaleString('en-IN')}</span>
                </div>
            </div>
        </div>`;
    }).join('');
}

// ─── Commercial Financials ────────────────────────────────────────────────────
function calculateFinancials() {
    let grandRevenue   = 0;
    let totalFabricCost = 0;
    let totalQty        = 0;

    coState.products.forEach((prod, idx) => {
        const qty       = prod.qty || 0;
        const unitPrice = Number(prod.unitPrice) || 0;
        const lineTotal = qty * unitPrice;
        grandRevenue   += lineTotal;
        totalQty       += qty;

        const bom = computeProductBOM(prod);
        totalFabricCost += bom.fabricCost;

        // Update line total in pricing table (if visible)
        const ltEl = qs(`line-total-${idx}`);
        if (ltEl) ltEl.textContent = `₹${Math.round(lineTotal).toLocaleString('en-IN')}`;
    });

    const trimsCost    = totalQty * 18;   // ₹18 per pc
    const cmtCost      = totalQty * 45;   // ₹45 per pc CMT
    const estimatedCost = Math.round(totalFabricCost + trimsCost + cmtCost);
    const grossProfit   = grandRevenue - estimatedCost;
    const marginPct     = grandRevenue > 0 ? Math.round((grossProfit / grandRevenue) * 100) : 0;

    // Step 3 pricing displays
    const set = (id, text) => { const el = qs(id); if (el) el.textContent = text; };
    set('pricing-total-qty',   `${totalQty.toLocaleString()} pcs`);
    set('co-calc-grand-total', `₹${Math.round(grandRevenue).toLocaleString('en-IN')}`);
    set('calc-cost-display',   `₹${Math.round(estimatedCost).toLocaleString('en-IN')}`);

    const profitEl = qs('calc-profit-display');
    if (profitEl) {
        profitEl.textContent = `₹${Math.round(grossProfit).toLocaleString('en-IN')}`;
        profitEl.className   = `text-[18px] font-extrabold ${grossProfit >= 0 ? 'text-[#008A00]' : 'text-error'}`;
    }

    // Margin gauge
    let badgeCls = 'bg-[#008A00]/10 text-[#008A00] border-[#008A00]/20';
    let barBg    = 'bg-[#008A00]';
    if (marginPct < 18) {
        badgeCls = 'bg-error/10 text-error border-error/20';
        barBg    = 'bg-error';
    } else if (marginPct < 26) {
        badgeCls = 'bg-[#FF9500]/10 text-[#FF9500] border-[#FF9500]/20';
        barBg    = 'bg-[#FF9500]';
    }
    const marginBadge = qs('co-margin-badge');
    if (marginBadge) {
        marginBadge.className   = `px-2.5 py-0.5 rounded-full text-[12px] font-extrabold border ${badgeCls}`;
        marginBadge.textContent = `${marginPct}% Gross Margin`;
    }
    const marginBar = qs('co-margin-progress-bar');
    if (marginBar) {
        marginBar.className = `h-full ${barBg} transition-all duration-300`;
        marginBar.style.width = `${Math.min(100, Math.max(2, marginPct))}%`;
    }

    // Bottom KPI bar
    set('bar-total-qty',  totalQty.toLocaleString());
    set('bar-total-val',  `₹${Math.round(grandRevenue).toLocaleString('en-IN')}`);

    const totalBOMkg = coState.products.reduce((s, p) => s + computeProductBOM(p).grossKg, 0);
    set('bar-fabric-kg', `${Math.round(totalBOMkg * 10) / 10} kg`);

    const barMarginEl = qs('bar-margin-pct');
    if (barMarginEl) {
        barMarginEl.textContent = `${marginPct}%`;
        barMarginEl.className   = `text-[15px] font-extrabold ${
            marginPct >= 26 ? 'text-[#008A00]' : marginPct >= 18 ? 'text-[#FF9500]' : 'text-error'
        }`;
    }
}
// Expose for inline oninput on pricing table
window.calculateFinancials = calculateFinancials;

// ─── Step 4: Per-product Workflow Pipeline Visualizer ────────────────────────
function buildWorkflowSummary() {
    const container = qs('co-workflow-summary');
    if (!container) return;

    container.innerHTML = `
        <div class="bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant shadow-sm">
            <div class="flex items-center gap-2 mb-3">
                <span class="material-symbols-outlined text-[20px] text-[#5856D6]">account_tree</span>
                <h3 class="text-[14px] font-bold text-on-surface uppercase tracking-wider">Per-Product Production Pipelines</h3>
            </div>
            <div class="flex flex-col gap-4">
                ${coState.products.map((prod, idx) => {
                    const stages = WORKFLOW_ROUTES[prod.workflowType] || WORKFLOW_ROUTES.default;
                    const stagePills = stages.map((stageKey, i) => {
                        const def    = STAGE_DEFINITIONS[stageKey];
                        const isLast = i === stages.length - 1;
                        return `<div class="flex items-center gap-1">
                            <div class="flex flex-col items-center gap-0.5">
                                <div class="w-8 h-8 rounded-full ${def.bgColor} ${def.borderColor} border flex items-center justify-center shrink-0">
                                    <span class="material-symbols-outlined text-[13px] ${def.color}">${def.icon}</span>
                                </div>
                                <span class="text-[8px] font-bold text-secondary uppercase whitespace-nowrap">${def.shortLabel}</span>
                            </div>
                            ${!isLast ? `<span class="text-outline-variant/70 text-[12px] mb-4">→</span>` : ''}
                        </div>`;
                    }).join('');

                    return `
                    <div class="bg-surface-container/40 rounded-xl p-3 border border-outline-variant/50">
                        <div class="flex items-center gap-2 mb-2.5">
                            <span class="w-5 h-5 rounded-full bg-primary text-white text-[10px] font-extrabold flex items-center justify-center shrink-0">${idx + 1}</span>
                            <span class="text-[13px] font-bold text-on-surface">${prod.name || `Product #${idx+1}`}</span>
                            <span class="text-[11px] text-secondary">${(prod.qty||0).toLocaleString()} pcs</span>
                            <span class="ml-auto px-2 py-0.5 rounded-full bg-[#5856D6]/10 text-[#5856D6] text-[10px] font-bold border border-[#5856D6]/20">
                                ${prod.workflowType.replace(/_/g, ' ')}
                            </span>
                        </div>
                        <div class="flex items-start gap-1 overflow-x-auto no-scrollbar pb-0.5">
                            ${stagePills}
                        </div>
                    </div>`;
                }).join('')}
            </div>
        </div>`;
}

// ─── Step 4: Executive Summary ────────────────────────────────────────────────
function buildExecutiveSummary() {
    const container = qs('co-executive-summary');
    if (!container) return;

    const customerSel   = qs('co-customer');
    const customerName  = customerSel?.options[customerSel.selectedIndex]?.text || 'Direct Buyer';
    const totalQty      = coState.products.reduce((s, p) => s + (p.qty || 0), 0);
    let   grandRevenue  = 0;
    let   totalFabricCost = 0;
    coState.products.forEach(p => {
        grandRevenue    += (p.qty || 0) * (Number(p.unitPrice) || 0);
        totalFabricCost += computeProductBOM(p).fabricCost;
    });
    const estimatedCost = Math.round(totalFabricCost + totalQty * 18 + totalQty * 45);
    const profit        = grandRevenue - estimatedCost;
    const marginPct     = grandRevenue > 0 ? Math.round((profit / grandRevenue) * 100) : 0;

    container.innerHTML = `
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-3 border-b border-outline-variant/40">
            <div>
                <span class="text-secondary text-[11px] font-bold uppercase block">Buyer &amp; Reference</span>
                <p class="font-bold text-on-surface text-[15px]">${customerName}</p>
                <p class="text-secondary text-[12px]">PO #: ${val('co-customer-po') || 'Internal Release'}</p>
            </div>
            <div>
                <span class="text-secondary text-[11px] font-bold uppercase block">Delivery Target &amp; Priority</span>
                <p class="font-bold text-on-surface">${val('co-delivery')} · <span class="text-primary font-extrabold uppercase">${coState.priority}</span></p>
                <p class="text-secondary text-[12px]">${coState.products.length} product line${coState.products.length > 1 ? 's' : ''} · ${coState.products.length} workflow${coState.products.length > 1 ? 's' : ''}</p>
            </div>
        </div>

        <div class="py-2 border-b border-outline-variant/40">
            <span class="text-secondary text-[11px] font-bold uppercase block mb-1">Product Lines</span>
            ${coState.products.map(p => `
                <div class="flex justify-between items-center py-1 text-[13px]">
                    <span class="font-semibold text-on-surface">${p.name} (${p.category})</span>
                    <div class="flex items-center gap-3">
                        <span class="text-secondary text-[11px]">${p.fabric.type} ${p.fabric.gsm}gsm · ${p.workflowType.replace(/_/g,' ')}</span>
                        <strong class="text-primary">${(p.qty||0).toLocaleString()} pcs @ ₹${p.unitPrice||0}/pc</strong>
                    </div>
                </div>
            `).join('')}
        </div>

        <div class="grid grid-cols-3 gap-2 py-3 text-center bg-surface-container/40 rounded-xl p-2.5">
            <div>
                <span class="text-secondary text-[10px] font-bold uppercase block">Quoted Revenue</span>
                <strong class="text-[16px] text-on-surface">₹${Math.round(grandRevenue).toLocaleString('en-IN')}</strong>
            </div>
            <div>
                <span class="text-secondary text-[10px] font-bold uppercase block">Direct Cost</span>
                <strong class="text-[16px] text-secondary">₹${Math.round(estimatedCost).toLocaleString('en-IN')}</strong>
            </div>
            <div>
                <span class="text-secondary text-[10px] font-bold uppercase block">Gross Profit</span>
                <strong class="text-[16px] ${profit >= 0 ? 'text-[#008A00]' : 'text-error'}">₹${Math.round(profit).toLocaleString('en-IN')} (${marginPct}%)</strong>
            </div>
        </div>`;
}

// ─── Wizard Navigation ────────────────────────────────────────────────────────
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
    const idx   = coState.currentIdx;
    const total = WIZARD_STEPS.length;
    const step  = WIZARD_STEPS[idx];

    // Show only active step div
    WIZARD_STEPS.forEach((s, i) => {
        const el = qs(s.id);
        if (el) el.classList.toggle('hidden', i !== idx);
    });

    // Progress bar
    const pBar = qs('co-progress-bar');
    if (pBar) pBar.style.width = `${((idx + 1) / total) * 100}%`;

    // Step label
    const labelEl = qs('co-step-label');
    if (labelEl) labelEl.textContent = `Step ${idx + 1} of ${total} — ${step.title}`;

    // Stepper pills
    WIZARD_STEPS.forEach((s, i) => {
        const pill = qs(`pill-step-${i}`);
        if (!pill) return;
        const numSpan = pill.querySelector('span:first-child');
        if (i === idx) {
            pill.className = 'stepper-pill active px-3 py-1.5 rounded-xl text-[12px] font-bold flex items-center gap-1.5 border';
            if (numSpan) { numSpan.className = 'w-4 h-4 rounded-full bg-white text-primary text-[10px] font-black flex items-center justify-center'; numSpan.textContent = `${i + 1}`; }
        } else if (i < idx) {
            pill.className = 'stepper-pill completed px-3 py-1.5 rounded-xl text-[12px] font-bold flex items-center gap-1.5 border';
            if (numSpan) { numSpan.className = 'w-4 h-4 rounded-full bg-[#008A00] text-white text-[10px] font-black flex items-center justify-center'; numSpan.textContent = '✓'; }
        } else {
            pill.className = 'stepper-pill upcoming px-3 py-1.5 rounded-xl text-[12px] font-bold flex items-center gap-1.5 border';
            if (numSpan) { numSpan.className = 'w-4 h-4 rounded-full bg-surface-variant text-secondary text-[10px] font-black flex items-center justify-center'; numSpan.textContent = `${i + 1}`; }
        }
    });

    // Back / Next / Save button visibility
    qs('co-btn-back')?.classList.toggle('hidden', idx === 0);
    const isLast = idx === total - 1;
    qs('co-btn-next')?.classList.toggle('hidden', isLast);
    qs('co-header-save-btn')?.classList.toggle('hidden', !isLast);

    // Step-specific renders
    if (idx === 2) renderPricingTable();
    if (idx === 3) { buildWorkflowSummary(); buildExecutiveSummary(); }
}

// ─── Validation ───────────────────────────────────────────────────────────────
function validateCurrentStep() {
    const idx = coState.currentIdx;

    // Step 1: Buyer & PO
    if (idx === 0) {
        if (!val('co-customer')) { showToast('Please select a customer / buyer', 'error'); return false; }
        if (!val('co-delivery')) { showToast('Please select a target delivery deadline', 'error'); return false; }
    }

    // Step 2: Products & Line Items
    if (idx === 1) {
        const totalQty = coState.products.reduce((s, p) => s + (p.qty || 0), 0);
        if (totalQty <= 0) { showToast('Order total quantity must be greater than zero', 'error'); return false; }

        for (let i = 0; i < coState.products.length; i++) {
            const p = coState.products[i];
            if (!p.name.trim()) { showToast(`Please enter a name for Product #${i + 1}`, 'error'); return false; }
            if (p.category === 'General') {
                if (!p.qty || p.qty <= 0) {
                    showToast(`Please enter a valid quantity for Product #${i + 1} — "${p.name}"`, 'error');
                    return false;
                }
            } else {
                const sizeSum = Object.values(p.sizes).reduce((s, v) => s + (v || 0), 0);
                if (sizeSum !== p.qty) {
                    showToast(`Size breakdown sum (${sizeSum}) for "${p.name}" must equal target qty (${p.qty} pcs)`, 'error');
                    return false;
                }
            }
            if (!p.fabric.gsm || p.fabric.gsm <= 0) {
                showToast(`Please enter fabric GSM for Product #${i + 1} — "${p.name}"`, 'error');
                return false;
            }
        }
    }

    // Step 3: Pricing
    if (idx === 2) {
        for (let i = 0; i < coState.products.length; i++) {
            const p = coState.products[i];
            if (!p.unitPrice || p.unitPrice <= 0) {
                showToast(`Please enter a unit price for Product #${i + 1} — "${p.name}"`, 'error');
                return false;
            }
        }
    }

    return true;
}

// ─── Order Save Engine ────────────────────────────────────────────────────────
window.coSaveOrder = async function(launchOption = 'orders_tower') {
    if (!validateCurrentStep()) return;

    const totalQty    = coState.products.reduce((s, p) => s + (p.qty || 0), 0);
    let   grandRevenue  = 0;
    let   totalFabricCost = 0;

    // Build per-product lineItems[]
    const lineItems = coState.products.map(prod => {
        const bom    = computeProductBOM(prod);
        const stages = WORKFLOW_ROUTES[prod.workflowType] || WORKFLOW_ROUTES.default;

        grandRevenue    += (prod.qty || 0) * (Number(prod.unitPrice) || 0);
        totalFabricCost += bom.fabricCost;

        return {
            productId:      prod.id,
            productName:    prod.name.trim(),
            workflowType:   prod.workflowType,
            workflowStages: stages,
            stageData: {
                procurement: {
                    status: 'Allotted'
                },
                fabric: {
                    type:      prod.fabric.type,
                    subType:   prod.fabric.subtype,
                    gsm:       Number(prod.fabric.gsm) || 0,
                    dia:       Number(prod.fabric.dia)  || 0,
                    totalKg:   bom.grossKg,
                    ratePerKg: Number(prod.fabric.ratePerKg) || 0,
                    totalCost: bom.fabricCost,
                    pcsPerKg:  bom.grossKg > 0 ? Math.round((prod.qty / bom.grossKg) * 100) / 100 : 0
                },
                cutting: {
                    totalQty: prod.qty,
                    sizes:    { ...prod.sizes }
                },
                print_wash: {
                    type:      prod.decorationType,
                    placement: prod.decorationPlacement || '',
                    colors:    prod.decorationColors    || ''
                },
                stitching: { notes: 'Standard sewing line assembly' },
                packing:   { notes: val('co-packaging-notes') || 'Standard export polybag packaging. 50 pcs/ctn' },
                dispatch:  { shippingAddress: val('co-shipping-address'), dispatchDate: val('co-delivery') }
            }
        };
    });

    const estimatedCost   = Math.round(totalFabricCost + totalQty * 18 + totalQty * 45);
    const advancePayment  = num('co-advance-payment');
    const isFullyPaid     = advancePayment >= grandRevenue && grandRevenue > 0;
    const isPartial       = advancePayment > 0 && !isFullyPaid;
    const pmtStatus       = isFullyPaid ? 'Paid' : isPartial ? 'Partially Paid' : 'Unpaid';

    // Backward-compat flat stageData (merged from all line items)
    const flatStageData = mergeLineItemsToFlatStageData(lineItems);

    // Enriched products array
    const productsData = coState.products.map(prod => {
        const stages = WORKFLOW_ROUTES[prod.workflowType] || WORKFLOW_ROUTES.default;
        const initialStageKey = stages[0] || 'procurement';
        const initialDef = STAGE_DEFINITIONS[initialStageKey] || { label: 'Procurement' };
        return {
            id:                  prod.id,
            name:                prod.name.trim(),
            category:            prod.category,
            qty:                 prod.qty,
            unitPrice:           Number(prod.unitPrice) || 0,
            status:              initialDef.label,
            workflowType:        prod.workflowType,
            sizes:               { ...prod.sizes },
            fabric:              { ...prod.fabric },
            decorationType:      prod.decorationType,
            decorationPlacement: prod.decorationPlacement || '',
            decorationColors:    prod.decorationColors    || ''
        };
    });

    const primaryProd = coState.products[0];
    const primaryStages = WORKFLOW_ROUTES[primaryProd?.workflowType] || WORKFLOW_ROUTES.default;
    const initialStageKey = primaryStages[0] || 'procurement';
    const initialDef = STAGE_DEFINITIONS[initialStageKey] || { label: 'Procurement' };

    const orderData = {
        customerId:          val('co-customer'),
        customerName:        qs('co-customer')?.options[qs('co-customer').selectedIndex]?.text?.split(' (')[0] || '',
        customerPO:          val('co-customer-po') || '',
        product:             coState.products.map(p => p.name).join(', '),
        qty:                 totalQty,
        value:               grandRevenue,
        incurredCost:        estimatedCost,
        deliveryDate:        val('co-delivery'),
        priority:            coState.priority,
        workflowType:        primaryProd?.workflowType || 'default',
        status:              initialDef.label,
        progressPercentage:  0,
        progressLabel:       `${initialDef.label} Phase`,
        paymentStatus:       pmtStatus,
        paymentReceived:     advancePayment,
        paymentTerms:        val('co-payment-terms'),
        notes:               val('co-packaging-notes'),
        shippingAddress:     val('co-shipping-address'),
        fabric:              coState.products.map(p => `${p.fabric.type} ${p.fabric.gsm}gsm`).join(' / '),
        stageData:           flatStageData,   // ← backward compat for production workspaces
        lineItems:           lineItems,        // ← new per-product schema
        products:            productsData,
        timeline: [{
            status: 'Order Released to Factory',
            date:   new Date().toISOString(),
            user:   'Merchandiser'
        }]
    };

    try {
        const saveBtn = qs('co-header-save-btn');
        if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving...'; }

        const createdOrder = await orderStore.create(orderData);
        const orderId      = createdOrder?.id || orderData.id;

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
        console.error('Failed to save order:', err);
        showToast('Failed to save order. Please check required fields.', 'error');
        const saveBtn = qs('co-header-save-btn');
        if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save Order'; }
    }
};

// ─── Toast Notifications ──────────────────────────────────────────────────────
function showToast(message, type = 'info') {
    const container = qs('toast-container');
    if (!container) return;

    const isError   = type === 'error';
    const isSuccess = type === 'success';
    const bg   = isError ? 'bg-red-600 text-white' : isSuccess ? 'bg-[#008A00] text-white' : 'bg-surface-container-high text-on-surface';
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
        }, 3200);
    });
}
