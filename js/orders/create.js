/**
 * create.js — Multi-step Order Creation Wizard
 * Handles all wizard logic, auto-calculations, data collection and save.
 */

import { orderStore } from '../stores/OrderStore.js';
import { customerStore } from '../stores/CustomerStore.js';

// ─── Fabric sub-type options ─────────────────────────────────────────────────
const FABRIC_SUBTYPES = {
    Cotton: [
        'Single Jersey',
        'Double Jersey',
        'Pique (Polo)',
        'French Terry',
        'Fleece',
        'Interlock',
        'Rib',
        'Waffle',
        'Other',
    ],
    Polyester: [
        'Dry-fit / Moisture-wicking',
        'Interlock Polyester',
        'Mesh',
        'Microfiber',
        'Satin',
        'Chiffon',
        'Other',
    ],
};

// ─── Workflow → step sequence mapping ────────────────────────────────────────
// Each entry is an HTML element ID (the <div id="co-step-X">)
const WORKFLOW_STEPS = {
    default:             ['co-step-1', 'co-step-2', 'co-step-3', 'co-step-stitching', 'co-step-printing', 'co-step-ironing', 'co-step-dispatch'],
    print_before_stitch: ['co-step-1', 'co-step-2', 'co-step-3', 'co-step-printing', 'co-step-stitching', 'co-step-ironing', 'co-step-dispatch'],
    wash_before_stitch:  ['co-step-1', 'co-step-2', 'co-step-3', 'co-step-wash', 'co-step-stitching', 'co-step-printing', 'co-step-ironing', 'co-step-dispatch'],
    direct_fulfillment:  ['co-step-1', 'co-step-procurement', 'co-step-dispatch'],
};

const STEP_TITLES = {
    'co-step-1':        'Order Details',
    'co-step-2':        'Fabric',
    'co-step-3':        'Cutting',
    'co-step-wash':     'Wash',
    'co-step-stitching':'Stitching',
    'co-step-printing': 'Printing / Embroidery',
    'co-step-ironing':  'Ironing & Packing',
    'co-step-procurement':'Procurement',
    'co-step-dispatch': 'Dispatch',
};

// ─── State ────────────────────────────────────────────────────────────────────
let coState = {
    workflowType: 'default',
    currentIdx: 0,      // index into WORKFLOW_STEPS[workflowType]
    fabricType: 'Cotton',
    printType: 'Printing',
    printSubtype: 'DTF',
    products: [
        {
            name: '',
            category: 'Adults',
            qty: 0,
            sizes: {
                XS: 0, S: 0, M: 0, L: 0, XL: 0, XXL: 0, XXXL: 0, XXXXL: 0
            }
        }
    ]
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const qs = id => document.getElementById(id);
const val = id => (qs(id) ? qs(id).value.trim() : '');
const num = id => parseFloat(qs(id)?.value) || 0;

function steps() { return WORKFLOW_STEPS[coState.workflowType]; }
function totalSteps() { return steps().length; }
function currentStepId() { return steps()[coState.currentIdx]; }

// ─── Products List Management ────────────────────────────────────────────────
window.coAddProduct = function() {
    coState.products.push({
        name: '',
        category: 'Adults',
        qty: 0,
        sizes: {
            XS: 0, S: 0, M: 0, L: 0, XL: 0, XXL: 0, XXXL: 0, XXXXL: 0
        }
    });
    renderProducts();
};

window.coRemoveProduct = function(idx) {
    if (coState.products.length <= 1) return;
    coState.products.splice(idx, 1);
    renderProducts();
    coCalcFabric();
};

window.coUpdateProduct = function(idx, field, value) {
    if (coState.products[idx]) {
        coState.products[idx][field] = value;
        updateHiddenProductFields();
    }
};

window.coSetProductCategory = function(idx, category) {
    const prod = coState.products[idx];
    if (!prod) return;
    prod.category = category;
    
    // Reset/initialize sizes
    if (category === 'Adults') {
        prod.sizes = { XS: 0, S: 0, M: 0, L: 0, XL: 0, XXL: 0, XXXL: 0, XXXXL: 0 };
    } else {
        prod.sizes = { '24': 0, '26': 0, '28': 0, '30': 0, '32': 0, '34': 0, '36': 0, '38': 0 };
    }
    prod.qty = 0;
    
    renderProducts();
    coCalcFabric();
};

window.coUpdateProductQty = function(idx, val) {
    const prod = coState.products[idx];
    if (prod) {
        prod.qty = parseInt(val) || 0;
        updateHiddenProductFields();
        coCalcFabric();
    }
};

window.coUpdateProductSize = function(idx, size, val) {
    const prod = coState.products[idx];
    if (!prod) return;
    prod.sizes[size] = val;
    
    // Recalculate sizes sum
    const currentSum = Object.values(prod.sizes).reduce((sum, v) => sum + v, 0);
    
    // Update matching badge/text in stitching step
    const badge = qs(`stitch-sum-badge-${idx}`);
    const msg = qs(`stitch-msg-${idx}`);
    if (badge) badge.textContent = `Sum: ${currentSum} / Target: ${prod.qty}`;
    
    if (badge && msg) {
        if (currentSum !== prod.qty) {
            badge.className = 'px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-600';
            msg.textContent = `Sum (${currentSum}) must match target qty (${prod.qty})`;
            msg.className = 'text-[12px] font-semibold text-red-500 mt-1 block';
        } else {
            badge.className = 'px-2 py-0.5 rounded text-[11px] font-bold bg-green-100 text-[#008A00]';
            msg.textContent = `Size breakdown matches quantity`;
            msg.className = 'text-[12px] font-semibold text-[#008A00] mt-1 block';
        }
    }
};

function updateHiddenProductFields() {
    const totalQty = coState.products.reduce((sum, p) => sum + p.qty, 0);
    const names = coState.products.map(p => p.name || 'Unnamed Product').join(', ');
    
    const qtyInput = qs('co-qty');
    if (qtyInput) qtyInput.value = totalQty;
    
    const prodInput = qs('co-product');
    if (prodInput) prodInput.value = names;
}

function renderProducts() {
    const container = qs('co-products-container');
    if (!container) return;
    
    container.innerHTML = coState.products.map((prod, idx) => `
        <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 flex flex-col gap-3 relative" data-product-idx="${idx}">
            <div class="flex justify-between items-center">
                <h4 class="text-[14px] font-bold text-on-surface">Product #${idx + 1}</h4>
                ${idx > 0 ? `<button type="button" onclick="window.coRemoveProduct(${idx})" class="text-red-500 text-[13px] font-semibold">Remove</button>` : ''}
            </div>
            <div class="flex flex-col gap-1.5">
                <label class="text-[12px] font-semibold text-secondary uppercase tracking-wider">Product Name *</label>
                <input type="text" class="prod-name-input w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-[15px] text-on-surface outline-none focus:ring-2 focus:ring-primary/20" placeholder="e.g. Cotton T-Shirt" value="${prod.name || ''}" oninput="window.coUpdateProduct(${idx}, 'name', this.value)">
            </div>
            
            <div class="grid grid-cols-2 gap-3">
                <div class="flex flex-col gap-1.5">
                    <label class="text-[12px] font-semibold text-secondary uppercase tracking-wider">Size Category *</label>
                    <select class="w-full bg-surface border border-outline-variant rounded-xl px-3 py-2.5 text-[14px] text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-apple" onchange="window.coSetProductCategory(${idx}, this.value)">
                        <option value="Adults" ${prod.category === 'Adults' ? 'selected' : ''}>Adults (XS-4XL)</option>
                        <option value="Kids" ${prod.category === 'Kids' ? 'selected' : ''}>Kids (24-38)</option>
                    </select>
                </div>
                <div class="flex flex-col gap-1.5">
                    <label class="text-[12px] font-semibold text-secondary uppercase tracking-wider">Quantity (pcs) *</label>
                    <input type="number" min="1" placeholder="0" class="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-[15px] text-on-surface outline-none focus:ring-2 focus:ring-primary/20" value="${prod.qty || ''}" oninput="window.coUpdateProductQty(${idx}, this.value)">
                </div>
            </div>
        </div>
    `).join('');
    
    updateHiddenProductFields();
}

window.populateStitchingSizes = function() {
    const container = qs('co-stitching-sizes-container');
    if (!container) return;
    
    container.innerHTML = coState.products.map((p, idx) => {
        const sizeKeys = p.category === 'Adults'
            ? ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'XXXXL']
            : ['24', '26', '28', '30', '32', '34', '36', '38'];

        const sizesHtml = sizeKeys.map(sz => {
            const val = p.sizes[sz] || 0;
            return `
                <div class="flex flex-col items-center gap-1 bg-surface rounded-lg p-2 border border-outline-variant/35">
                    <span class="text-[10px] font-bold text-secondary">${sz}</span>
                    <input type="number" min="0" placeholder="0" class="w-full text-center font-bold text-[13px] bg-transparent border-0 p-0 focus:ring-0 outline-none" value="${val || ''}" oninput="window.coUpdateProductSize(${idx}, '${sz}', parseInt(this.value) || 0)">
                </div>
            `;
        }).join('');

        const currentSum = Object.values(p.sizes).reduce((sum, v) => sum + v, 0);
        const isMatch = currentSum === p.qty;

        return `
            <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 flex flex-col gap-3">
                <div class="flex justify-between items-center pb-2 border-b border-outline-variant/30">
                    <div>
                        <h4 class="text-[14px] font-bold text-on-surface">${p.name || 'Unnamed Product'}</h4>
                        <p class="text-[11px] text-secondary capitalize">${p.category} Category</p>
                    </div>
                    <span id="stitch-sum-badge-${idx}" class="px-2 py-0.5 rounded text-[11px] font-bold ${isMatch ? 'bg-green-100 text-[#008A00]' : 'bg-red-100 text-red-600'}">
                        Sum: ${currentSum} / Target: ${p.qty}
                    </span>
                </div>
                
                <div class="grid grid-cols-4 gap-2">
                    ${sizesHtml}
                </div>
                <span id="stitch-msg-${idx}" class="text-[12px] font-semibold ${isMatch ? 'text-[#008A00]' : 'text-red-500'} mt-1 block">
                    ${isMatch ? 'Size breakdown matches quantity' : `Sum (${currentSum}) must match target qty (${p.qty})`}
                </span>
            </div>
        `;
    }).join('');
};

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    // Set default delivery date (1 month ahead)
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    qs('co-delivery').value = nextMonth.toISOString().split('T')[0];

    // Initialize products list rendering
    renderProducts();

    // Load customers
    await customerStore.loadInitial();
    populateCustomers();

    customerStore.subscribe(() => populateCustomers());

    qs('co-customer').addEventListener('change', e => {
        if (e.target.value === 'NEW_CUSTOMER') {
            e.target.value = '';
            window.openQuickAddCustomer?.(async (newCust) => {
                await customerStore.loadInitial();
                populateCustomers();
                qs('co-customer').value = newCust.id;
            });
        }
    });

    // Fabric: init sub-types + live calculations
    coSwitchFabricType('Cotton');
    qs('co-fabric-kg')?.addEventListener('input', coCalcFabric);
    qs('co-fabric-rate')?.addEventListener('input', coCalcFabric);
    qs('co-qty')?.addEventListener('input', coCalcFabric);
    qs('co-pcs-kg-override')?.addEventListener('input', coCalcFabric);

    // Print type: default selection
    coSelectPrintType('Printing');
    coSelectPrintSubtype('DTF');

    // Render first step
    renderStep();
});

function populateCustomers() {
    const sel = qs('co-customer');
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = `
        <option value="">Select Customer...</option>
        <option value="NEW_CUSTOMER">+ Create New Customer</option>
    `;
    customerStore.state.entities.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        sel.appendChild(opt);
    });
    if (current) sel.value = current;
}

// ─── Workflow Selection ───────────────────────────────────────────────────────
window.coSelectWorkflow = function(type) {
    coState.workflowType = type;
    document.querySelectorAll('.workflow-card').forEach(card => {
        card.classList.toggle('selected', card.dataset.wf === type);
    });
};

// ─── Fabric Type Toggle ───────────────────────────────────────────────────────
window.coSwitchFabricType = function(type) {
    coState.fabricType = type;

    // Button styles
    const btnCotton = qs('ft-btn-cotton');
    const btnPoly   = qs('ft-btn-poly');
    if (type === 'Cotton') {
        btnCotton.className = 'flex-1 py-3 rounded-xl border-2 border-primary bg-primary text-white font-semibold text-[15px] transition-all active-scale';
        btnPoly.className   = 'flex-1 py-3 rounded-xl border-2 border-outline-variant bg-surface-container-lowest text-secondary font-semibold text-[15px] transition-all active-scale';
    } else {
        btnPoly.className   = 'flex-1 py-3 rounded-xl border-2 border-primary bg-primary text-white font-semibold text-[15px] transition-all active-scale';
        btnCotton.className = 'flex-1 py-3 rounded-xl border-2 border-outline-variant bg-surface-container-lowest text-secondary font-semibold text-[15px] transition-all active-scale';
    }

    // Populate sub-types
    const subtypeSel = qs('co-fabric-subtype');
    subtypeSel.innerHTML = FABRIC_SUBTYPES[type].map(s => `<option>${s}</option>`).join('');
    coCalcFabric();
};

// ─── Fabric Live Calculations ─────────────────────────────────────────────────
function coCalcFabric() {
    const qty      = num('co-qty');
    const fabricKg = num('co-fabric-kg');
    const rate     = num('co-fabric-rate');
    const override = num('co-pcs-kg-override');

    const autoPcsPerKg = fabricKg > 0 ? qty / fabricKg : 0;
    const pcsPerKg     = override > 0 ? override : autoPcsPerKg;

    const display = qs('co-pcs-kg-display');
    if (display) display.textContent = pcsPerKg > 0 ? pcsPerKg.toFixed(2) : '-';

    const totalCost = qs('co-fabric-total-cost');
    if (totalCost) totalCost.textContent = `Rs. ${(fabricKg * rate).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

// ─── Cutting Size Sum Validator ───────────────────────────────────────────────
window.coUpdateCutSum = function() {
    const sizes = ['xs','s','m','l','xl','xxl','xxxl'];
    const total = sizes.reduce((sum, s) => sum + (parseInt(qs(`cut-${s}`)?.value) || 0), 0);
    const orderQty = num('co-qty');

    const badge = qs('cut-sum-badge');
    const msg   = qs('cut-validation-msg');
    const icon  = qs('cut-val-icon');
    const text  = qs('cut-val-text');

    if (badge) badge.textContent = `Total: ${total}`;

    if (orderQty > 0 && total !== orderQty) {
        if (badge) {
            badge.className = 'px-2.5 py-1 rounded-lg text-[12px] font-bold bg-red-100 text-red-600';
        }
        if (msg)  msg.className  = 'flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 border border-red-200';
        if (icon) { icon.textContent = 'warning'; icon.className = 'material-symbols-outlined text-[16px] text-red-600'; }
        if (text) { text.textContent = `Sum (${total}) doesn't match order qty (${orderQty})`; text.className = 'text-[13px] font-semibold text-red-600'; }
    } else if (total > 0 && total === orderQty) {
        if (badge) {
            badge.className = 'px-2.5 py-1 rounded-lg text-[12px] font-bold bg-green-100 text-[#008A00]';
        }
        if (msg)  msg.className  = 'flex items-center gap-2 px-3 py-2 rounded-xl bg-green-50 border border-green-200';
        if (icon) { icon.textContent = 'check_circle'; icon.className = 'material-symbols-outlined text-[16px] text-[#008A00]'; }
        if (text) { text.textContent = `Size breakdown matches order qty`; text.className = 'text-[13px] font-semibold text-[#008A00]'; }
    } else {
        if (badge) badge.className = 'px-2.5 py-1 rounded-lg text-[12px] font-bold bg-surface-variant text-secondary';
        if (msg)  msg.classList.add('hidden');
        return;
    }
    if (msg) msg.classList.remove('hidden');
};

// ─── Printing Type + Sub-type ─────────────────────────────────────────────────
window.coSelectPrintType = function(type) {
    coState.printType = type;
    const isPrinting = type === 'Printing';

    const btnP = qs('pt-btn-printing');
    const btnE = qs('pt-btn-embroidery');
    if (btnP) btnP.className = `flex-1 py-2.5 rounded-lg text-[14px] font-bold transition-all ${isPrinting ? 'bg-primary text-white' : 'text-secondary'}`;
    if (btnE) btnE.className = `flex-1 py-2.5 rounded-lg text-[14px] font-semibold transition-all ${!isPrinting ? 'bg-primary text-white' : 'text-secondary'}`;

    qs('co-print-subtype-section')?.classList.toggle('hidden', !isPrinting);
    qs('co-print-notes-section')?.classList.toggle('hidden', !isPrinting);
    const embSec = qs('co-embroidery-section');
    if (embSec) embSec.className = isPrinting ? 'hidden flex-col gap-1.5' : 'flex flex-col gap-1.5';
};

window.coSelectPrintSubtype = function(subtype) {
    coState.printSubtype = subtype;
    const map = { DTF: 'ps-btn-dtf', Sublimation: 'ps-btn-sublimation', 'Screen Printing': 'ps-btn-screen' };
    Object.entries(map).forEach(([s, id]) => {
        const btn = qs(id);
        if (!btn) return;
        const isActive = s === subtype;
        btn.className = `print-subtype-btn flex items-center gap-3 p-4 rounded-xl border-2 text-left w-full transition-all ${
            isActive
                ? 'bg-primary text-white border-primary'
                : 'bg-surface-container-lowest border-outline-variant text-on-surface'
        }`;
        // Fix icon and sub-text colours
        const sub = btn.querySelector('p:last-child');
        if (sub) sub.className = isActive ? 'text-[12px] opacity-80' : 'text-[12px] text-secondary';
    });
};

// ─── Step Navigation ──────────────────────────────────────────────────────────
function renderStep() {
    // Hide all wizard steps
    document.querySelectorAll('.wizard-step').forEach(el => el.classList.add('hidden'));

    // Show current
    qs(currentStepId())?.classList.remove('hidden');

    const idx   = coState.currentIdx;
    const total = totalSteps();

    // Progress bar
    const pct = (idx / (total - 1)) * 100;
    if (qs('co-progress-bar')) qs('co-progress-bar').style.width = `${pct}%`;

    // Step label
    if (qs('co-step-label')) qs('co-step-label').textContent = `Step ${idx + 1} of ${total} — ${STEP_TITLES[currentStepId()]}`;

    // Back / Next / Save buttons
    qs('co-btn-back')?.classList.toggle('hidden', idx === 0);

    const isLast = idx === total - 1;
    qs('co-btn-next')?.classList.toggle('hidden', isLast);
    qs('co-save-btn')?.classList.toggle('hidden', !isLast);

    // Carry values into Cutting step
    if (currentStepId() === 'co-step-3') populateCuttingCarryValues();

    // Populate sizes in Stitching step
    if (currentStepId() === 'co-step-stitching') window.populateStitchingSizes();

    // Build summary on last step
    if (currentStepId() === 'co-step-dispatch') buildSummary();
}

window.coGoNext = function() {
    if (!validateCurrentStep()) return;
    if (coState.currentIdx < totalSteps() - 1) {
        coState.currentIdx++;
        renderStep();
        window.scrollTo(0, 0);
    }
};

window.coGoBack = function() {
    if (coState.currentIdx > 0) {
        coState.currentIdx--;
        renderStep();
        window.scrollTo(0, 0);
    }
};

// ─── Step Validation ──────────────────────────────────────────────────────────
function validateCurrentStep() {
    const id = currentStepId();

    if (id === 'co-step-1') {
        if (!val('co-customer'))  { showToast('Please select a customer', 'error'); return false; }
        if (coState.products.length === 0) { showToast('Please add at least one product', 'error'); return false; }
        for (let i = 0; i < coState.products.length; i++) {
            const p = coState.products[i];
            if (!p.name.trim()) { showToast(`Please enter a name for Product #${i + 1}`, 'error'); return false; }
            if (p.qty <= 0) { showToast(`Please enter a quantity greater than 0 for ${p.name || 'Product #' + (i + 1)}`, 'error'); return false; }
        }
    }

    if (id === 'co-step-2') {
        if (num('co-gsm') <= 0)        { showToast('Please enter GSM', 'error'); return false; }
        if (num('co-fabric-kg') <= 0)  { showToast('Please enter fabric weight in kg', 'error'); return false; }
    }

    if (id === 'co-step-stitching') {
        for (let i = 0; i < coState.products.length; i++) {
            const p = coState.products[i];
            const currentSum = Object.values(p.sizes).reduce((sum, v) => sum + v, 0);
            if (currentSum !== p.qty) {
                showToast(`Size breakdown sum (${currentSum}) for "${p.name || 'Product #' + (i + 1)}" must match target quantity (${p.qty})`, 'error');
                return false;
            }
        }
    }

    if (id === 'co-step-procurement') {
        if (!val('co-vendor-name')) { showToast('Please enter a vendor name', 'error'); return false; }
        if (num('co-purchase-cost') <= 0) { showToast('Please enter purchase cost', 'error'); return false; }
    }

    return true;
}

// ─── Cutting carry ────────────────────────────────────────────────────────────
function populateCuttingCarryValues() {
    const container = qs('co-cutting-summary-container');
    if (!container) return;
    
    container.innerHTML = coState.products.map(p => {
        const sizeKeys = p.category === 'Adults'
            ? ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'XXXXL']
            : ['24', '26', '28', '30', '32', '34', '36', '38'];
            
        const sizesHtml = sizeKeys.map(k => `
            <div class="text-center bg-surface p-2 rounded-lg border border-outline-variant/40">
                <span class="text-[10px] font-bold text-secondary uppercase leading-none">${k}</span>
                <p class="text-[13px] font-bold text-on-surface mt-1">${p.sizes[k] || 0}</p>
            </div>
        `).join('');
        
        return `
            <div class="border-b border-outline-variant/40 last:border-0 pb-3 mb-3 last:pb-0 last:mb-0">
                <div class="flex justify-between items-center mb-2">
                    <span class="text-[14px] font-bold text-on-surface">${p.name}</span>
                    <span class="text-[12px] font-bold text-primary">${p.qty} pcs (${p.category})</span>
                </div>
                <div class="grid grid-cols-4 gap-2">
                    ${sizesHtml}
                </div>
            </div>
        `;
    }).join('');
}

// ─── Summary builder ──────────────────────────────────────────────────────────
function buildSummary() {
    const container = qs('co-summary-content');
    if (!container) return;

    const customerSel = qs('co-customer');
    const customerName = customerSel?.options[customerSel.selectedIndex]?.text || '-';
    const fabricKg = num('co-fabric-kg');
    const override = num('co-pcs-kg-override');
    const pcsKg    = override > 0 ? override : (fabricKg > 0 ? num('co-qty') / fabricKg : 0);

    const rows = [
        ['Customer', customerName],
        ['Products', coState.products.map(p => `${p.name} (${p.qty} pcs)`).join(', ')],
        ['Total Qty', `${num('co-qty')} pcs`],
        ['Delivery', val('co-delivery') || 'Not set'],
        ['Workflow', coState.workflowType.replace(/_/g, ' ')],
    ];

    if (coState.workflowType === 'direct_fulfillment') {
        rows.push(['Vendor', val('co-vendor-name') || '-']);
        rows.push(['Purchase Cost', `Rs. ${num('co-purchase-cost')}`]);
    } else {
        rows.push(['Fabric', `${coState.fabricType} - ${val('co-fabric-subtype')}, ${num('co-gsm')} GSM`]);
        rows.push(['Fabric Kg', `${fabricKg} kg @ Rs.${num('co-fabric-rate')}/kg`]);
        rows.push(['Pcs/Kg', pcsKg > 0 ? pcsKg.toFixed(2) : '-']);
        rows.push(['Decoration', coState.printType === 'Printing' ? `${coState.printSubtype}` : 'Embroidery']);
    }

    container.innerHTML = rows.map(([k, v]) => `
        <div class="flex justify-between items-center py-1 border-b border-outline-variant/40 last:border-0">
            <span class="text-secondary font-medium">${k}</span>
            <span class="font-semibold text-on-surface text-right max-w-[55%]">${v}</span>
        </div>
    `).join('');
}

// ─── Save Order ───────────────────────────────────────────────────────────────
window.coSaveOrder = async function() {
    if (!validateCurrentStep()) return;

    const fabricKg = num('co-fabric-kg');
    const override = num('co-pcs-kg-override');
    const pcsKg    = override > 0 ? override : (fabricKg > 0 ? num('co-qty') / fabricKg : 0);

    // Initial stages for all products
    const productsData = coState.products.map(p => ({
        id: `prod-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
        name: p.name.trim(),
        category: p.category,
        qty: p.qty,
        status: coState.workflowType === 'direct_fulfillment' ? 'Procurement' : 'Fabric', // Each product starts at the first stage
        sizes: { ...p.sizes }
    }));

    const isDirect = coState.workflowType === 'direct_fulfillment';
    
    const stageData = isDirect ? {
        procurement: {
            vendorName: val('co-vendor-name'),
            purchaseCost: num('co-purchase-cost'),
            expectedArrival: val('co-arrival-date'),
        },
        dispatch: {
            courier:      val('co-dispatch-courier'),
            trackingNo:   val('co-dispatch-tracking'),
            boxes:        num('co-dispatch-boxes'),
            dispatchDate: val('co-dispatch-date'),
        }
    } : {
        fabric: {
            type:          coState.fabricType,
            subType:       val('co-fabric-subtype'),
            gsm:           num('co-gsm'),
            dia:           num('co-dia'),
            totalKg:       fabricKg,
            ratePerKg:     num('co-fabric-rate'),
            totalCost:     fabricKg * num('co-fabric-rate'),
            pcsPerKg:      pcsKg,
        },
        cutting: {
            totalKg:    fabricKg,
            pcsPerKg:   pcsKg,
            totalQty:   num('co-qty'),
            // Consolidated size breakdown across all products for backward compatibility
            sizes: coState.products.reduce((acc, p) => {
                Object.entries(p.sizes).forEach(([sz, val]) => {
                    acc[sz] = (acc[sz] || 0) + val;
                });
                return acc;
            }, {}),
        },
        wash: coState.workflowType === 'wash_before_stitch' ? {
            type:  val('co-wash-type'),
            notes: val('co-wash-notes'),
        } : null,
        stitching: {
            notes:           val('co-stitch-notes'),
            expectedDate:    val('co-stitch-date'),
        },
        printing: {
            type:            coState.printType,
            printingSubType: coState.printType === 'Printing' ? coState.printSubtype : null,
            notes:           coState.printType === 'Printing' ? val('co-print-notes') : val('co-embroidery-notes'),
        },
        ironingPacking: {
            notes:        val('co-iron-notes'),
            expectedDate: val('co-iron-date'),
        },
        dispatch: {
            courier:      val('co-dispatch-courier'),
            trackingNo:   val('co-dispatch-tracking'),
            boxes:        num('co-dispatch-boxes'),
            dispatchDate: val('co-dispatch-date'),
        },
    };

    // Build the phases array ordered by workflow
    const phaseLabels = {
        'co-step-2':        'Fabric',
        'co-step-3':        'Cutting',
        'co-step-wash':     'Wash',
        'co-step-stitching':'Stitching',
        'co-step-printing': 'Printing/Embroidery',
        'co-step-ironing':  'Ironing & Packing',
        'co-step-procurement': 'Procurement',
        'co-step-dispatch': 'Dispatch',
    };
    const phases = steps()
        .filter(s => s !== 'co-step-1')
        .map(s => ({ name: phaseLabels[s] || s, completed: false }));

    const orderData = {
        customerId:   val('co-customer'),
        customerName: qs('co-customer')?.options[qs('co-customer').selectedIndex]?.text || '',
        product:      val('co-product'),
        qty:          num('co-qty'),
        deliveryDate: val('co-delivery'),
        workflowType: coState.workflowType,
        stageData,
        phases,
        status:       coState.workflowType === 'direct_fulfillment' ? 'Procurement' : 'Fabric',
        progress:     0,
        incurredCost: coState.workflowType === 'direct_fulfillment' ? num('co-purchase-cost') : 0,
        paymentStatus: 'Unpaid',
        paymentReceived: 0,
        tasks: [],
        timeline: [],
        expenses: [],
        activityLog: [],
        products:     productsData // Save the list of products with their individual stages
    };

    try {
        const saveBtn = qs('co-save-btn');
        if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving...'; }

        await orderStore.create(orderData);

        showToast('Order created successfully!', 'success');
        setTimeout(() => { window.location.href = 'orders.html'; }, 1000);
    } catch (err) {
        console.error('Failed to save order:', err);
        showToast('Failed to save order', 'error');
        const saveBtn = qs('co-save-btn');
        if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save Order'; }
    }
};

// ─── Toast ────────────────────────────────────────────────────────────────────
function showToast(message, type = 'info') {
    const container = qs('toast-container');
    if (!container) return;

    const isError   = type === 'error';
    const isSuccess = type === 'success';
    const bg = isError ? 'bg-red-600 text-white' : isSuccess ? 'bg-[#008A00] text-white' : 'bg-surface-container-high text-on-surface';
    const icon = isError ? 'error' : isSuccess ? 'check_circle' : 'info';

    const t = document.createElement('div');
    t.className = `${bg} px-4 py-3 rounded-xl shadow-lg text-[14px] font-medium flex items-center gap-2 transform transition-all translate-y-[-20px] opacity-0 pointer-events-auto`;
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
