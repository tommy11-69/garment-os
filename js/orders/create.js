/**
 * create.js — Workflow-First Order Booking Wizard (v7.0)
 *
 * Architecture:
 *  Step 1: Buyer & PO Profile
 *  Step 2: Workflow Type Selection → Product Lines (fields driven by workflow)
 *  Step 3: Pricing — CP (cost price) + SP (selling price) → live margin
 *  Step 4: Review & Launch
 *
 * Workflow types:
 *  default                   — Standard Knits CMT
 *  print_before_stitch       — Print-First / Sublimation
 *  wash_before_stitch        — Enzyme / Garment Wash
 *  stitch_before_embroidery  — Finished Garment Embellishment
 *  direct_fulfillment        — Direct Sourcing / Trading (no fabric, no decoration, free-form sizes)
 *  full_vertical             — Full Vertical Integration (Yarn-to-Garment)
 */

import { orderStore }    from '../stores/OrderStore.js?v=5.2';
import { customerStore } from '../stores/CustomerStore.js?v=5.2';
import { api }           from '../services/api.js?v=5.2';
import {
    STAGE_DEFINITIONS,
    WORKFLOW_ROUTES,
    WORKFLOW_CONFIG,
    getProductWorkflowStages,
    mergeLineItemsToFlatStageData
} from '../production/domain/workflowEngine.js?v=6.0';

// ─── Fabric Sub-types ─────────────────────────────────────────────────────────
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

// ─── Workflow Presets (for picker card UI) ────────────────────────────────────
const WORKFLOW_PRESETS = [
    {
        key:     'default',
        label:   'Standard Knits CMT',
        icon:    'precision_manufacturing',
        color:   '#007AFF',
        pipeline:'Sourcing → Fabric → Cutting → Stitching → Print/Wash → Packing → Dispatch',
        desc:    'Standard cut, make & trim garment manufacturing'
    },
    {
        key:     'full_vertical',
        label:   'Full Vertical Integration (Yarn Dyeing)',
        icon:    'water_drop',
        color:   '#8B5CF6',
        pipeline:'Yarn → Winding → Knitting → Dyeing → Cutting → Stitching → Pack → Dispatch',
        desc:    'Yarn-to-garment manufacturing with in-house knitting & dyeing'
    },
    {
        key:     'print_before_stitch',
        label:   'Print-First / Sublimation',
        icon:    'palette',
        color:   '#AF52DE',
        pipeline:'Sourcing → Fabric → Cutting → Print → Stitching → Packing → Dispatch',
        desc:    'Panels screen-printed or sublimated before sewing'
    },
    {
        key:     'wash_before_stitch',
        label:   'Enzyme / Garment Wash',
        icon:    'waves',
        color:   '#30B0C7',
        pipeline:'Cutting → Stitching → Industrial Wash → Pack → Dispatch',
        desc:    'Garments washed after stitching for enzyme or vintage treatment'
    },
    {
        key:     'stitch_before_embroidery',
        label:   'Finished Garment Embellishment',
        icon:    'auto_fix_high',
        color:   '#FF9500',
        pipeline:'Cutting → Stitching → Embroidery on Assembled → Packing',
        desc:    'Embroidery or heat-transfer applied on fully assembled garments'
    },
    {
        key:     'direct_fulfillment',
        label:   'Direct Sourcing / Trading',
        icon:    'local_shipping',
        color:   '#34C759',
        pipeline:'Procurement → Quality Audit → Dispatch',
        desc:    'Ready-made goods procurement — no in-house cutting or sewing'
    },
    {
        key:     'custom',
        label:   'Custom Route (Stage Picker)',
        icon:    'alt_route',
        color:   '#FF2D55',
        pipeline:'Custom Stage-by-Stage Selection',
        desc:    'Build an exact sequence of factory stages for this specific item'
    }
];

const AVAILABLE_FACTORY_STAGES = [
    { key: 'procurement', label: 'Procurement & Yarn', icon: 'shopping_cart' },
    { key: 'winding',     label: 'Yarn Winding',       icon: 'rotate_right' },
    { key: 'knitting',    label: 'Knitting',           icon: 'grid_on' },
    { key: 'dyeing',      label: 'Dyeing & Compacting',icon: 'water_drop' },
    { key: 'fabric',      label: 'Fabric Inward & QC', icon: 'texture' },
    { key: 'cutting',     label: 'Cutting & Bundles',  icon: 'content_cut' },
    { key: 'print_wash',  label: 'Print & Embroidery', icon: 'palette' },
    { key: 'stitching',   label: 'Stitching Assembly', icon: 'precision_manufacturing' },
    { key: 'packing',     label: 'Finishing & Packing',icon: 'inventory_2' },
    { key: 'dispatch',    label: 'Dispatch & Gate Pass',icon: 'local_shipping' }
];

// ─── Wizard Steps ─────────────────────────────────────────────────────────────
const WIZARD_STEPS = [
    { id: 'co-step-1', title: 'Buyer & PO Profile' },
    { id: 'co-step-2', title: 'Workflow & Products' },
    { id: 'co-step-3', title: 'Pricing' },
    { id: 'co-step-4', title: 'Review & Launch' }
];

// ─── Wizard State ─────────────────────────────────────────────────────────────
let coState = null;

// ─── Default product factory ──────────────────────────────────────────────────
function makeDefaultProduct(n = 1) {
    return {
        id:                   `prod-${Date.now()}-${n}`,
        name:                 '',
        category:             'Adults',
        workflowType:         (coState?.orderWorkflowType) ? coState.orderWorkflowType : 'default',
        customStages:         [],
        qty:                  0,
        sizes:                { XS: 0, S: 0, M: 0, L: 0, XL: 0, XXL: 0, XXXL: 0, XXXXL: 0 },
        freeSizes:            [{ label: 'S', qty: 0 }, { label: 'M', qty: 0 }, { label: 'L', qty: 0 }],
        fabric: {
            type:    '',
            subtype: '',
            gsm:     '',
            dia:     '',
            yarnCount: '',
            yarnBlend: ''
        },
        decorationType:       '',
        decorationPlacement:  '',
        decorationColors:     '',
        sourceSupplier:       '',
        sourceRef:            '',
        sourceColor:          '',
        sourceNotes:          '',
        cp:                   '',  // cost price per pc
        unitPrice:            ''   // selling price per pc (SP)
    };
}

coState = {
    currentIdx:        0,
    priority:          'Normal',
    orderWorkflowType: '',
    costings:          [],
    products:          [makeDefaultProduct(1)]
};

// ─── DOM Helpers ──────────────────────────────────────────────────────────────
const qs  = id  => document.getElementById(id);
const val = id  => (qs(id) ? qs(id).value.trim() : '');
const num = id  => parseFloat(qs(id)?.value) || 0;

// ─── Helper: is workflow that needs fabric? ───────────────────────────────────
function workflowNeedsFabric(wf) {
    return wf !== 'direct_fulfillment';
}
function workflowNeedsDecoration(wf) {
    return wf !== 'direct_fulfillment';
}
function workflowLocksPrint(wf) {
    return wf === 'print_before_stitch';
}
function workflowLocksEmbroidery(wf) {
    return wf === 'stitch_before_embroidery';
}
function workflowIsDirectFulfillment(wf) {
    return wf === 'direct_fulfillment';
}
function workflowIsFullVertical(wf) {
    return wf === 'full_vertical';
}

// ─── DOMContentLoaded Initialization ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    // Default delivery date (+21 days)
    const defDelivery = new Date();
    defDelivery.setDate(defDelivery.getDate() + 21);
    const delInput = qs('co-delivery');
    if (delInput) delInput.value = defDelivery.toISOString().split('T')[0];

    // Load customers
    try {
        await customerStore.loadInitial();
        populateCustomers();
        customerStore.subscribe(() => populateCustomers());
    } catch (e) {
        console.error('Failed to load customers:', e);
    }

    // Load quotations for auto-fill
    try {
        coState.costings = await api.getCostings().catch(() => []);
        populateQuotations();
    } catch (e) {
        console.error('Failed to load costings:', e);
    }

    // Bind advance payment listener
    qs('co-advance-payment')?.addEventListener('input', calculateFinancials);

    // Check for ?edit=ORD-XXXX or ?orderId=ORD-XXXX
    const urlParams = new URLSearchParams(window.location.search);
    const editOrderId = urlParams.get('edit') || urlParams.get('orderId') || urlParams.get('id');

    if (editOrderId) {
        try {
            await loadExistingOrderForEdit(editOrderId);
        } catch (err) {
            console.error('Failed to load order for edit:', err);
            showToast('Failed to load order for editing', 'error');
        }
    } else {
        // Initial renders
        calculateFinancials();
        renderStep();
    }
});

// ─── Load Existing Order for Editing ─────────────────────────────────────────
async function loadExistingOrderForEdit(orderId) {
    let order = null;
    try {
        order = await api.getOrderById(orderId);
    } catch (e) {
        const all = await api.getOrders().catch(() => []);
        order = all.find(o => o.id === orderId);
    }

    if (!order) {
        showToast(`Order "${orderId}" not found`, 'error');
        calculateFinancials();
        renderStep();
        return;
    }

    coState.editingOrderId = orderId;
    coState.editingOrder   = order;

    // Update Header / UI Title
    const titleEl = qs('co-page-title');
    if (titleEl) titleEl.textContent = `Edit Apparel Order (${orderId})`;
    document.title = `Garment OS - Edit Order ${orderId}`;

    const saveHeaderBtn = qs('co-header-save-btn');
    if (saveHeaderBtn) {
        saveHeaderBtn.innerHTML = `<span class="material-symbols-outlined text-[16px]">save</span> <span>Save Changes</span>`;
    }

    // Set Priority
    coState.priority = order.priority || 'Normal';
    window.coSetPriority(coState.priority);

    // Set Workflow Type
    const wf = order.orderWorkflowType || order.workflowType || (order.products?.[0]?.workflowType) || 'default';
    coState.orderWorkflowType = wf;

    // Reconstruct Products array
    if (Array.isArray(order.products) && order.products.length > 0) {
        coState.products = order.products.map((p, i) => {
            const def = makeDefaultProduct(i + 1);
            const sizes = (typeof p.sizes === 'object' && p.sizes !== null) ? { ...def.sizes, ...p.sizes } : def.sizes;
            const freeSizes = Array.isArray(p.freeSizes) && p.freeSizes.length > 0
                ? p.freeSizes
                : (typeof p.sizes === 'object' && p.sizes !== null && Object.keys(p.sizes).length > 0
                    ? Object.entries(p.sizes).map(([label, qty]) => ({ label, qty: Number(qty) || 0 }))
                    : def.freeSizes);

            const pQty = Number(p.qty) || 0;
            const pCp = p.cp !== undefined && p.cp !== null && p.cp !== '' ? p.cp : (order.qty ? Math.round((order.incurredCost || 0) / order.qty) : '');
            const pSp = p.unitPrice !== undefined && p.unitPrice !== null && p.unitPrice !== '' ? p.unitPrice : (order.qty ? Math.round((order.value || 0) / order.qty) : '');

            return {
                id: p.id || `prod-${Date.now()}-${i + 1}`,
                name: p.name || order.product || '',
                category: p.category || 'Adults',
                workflowType: p.workflowType || wf,
                customStages: Array.isArray(p.customStages) ? p.customStages : [],
                qty: pQty,
                sizes,
                freeSizes,
                fabric: {
                    type: p.fabric?.type || (typeof order.fabric === 'string' ? order.fabric.split(' ')[0] : '') || 'Cotton',
                    subtype: p.fabric?.subtype || p.fabric?.subType || '',
                    gsm: p.fabric?.gsm || '',
                    dia: p.fabric?.dia || '',
                    yarnCount: p.fabric?.yarnCount || '',
                    yarnBlend: p.fabric?.yarnBlend || ''
                },
                decorationType: p.decorationType || '',
                decorationPlacement: p.decorationPlacement || '',
                decorationColors: p.decorationColors || '',
                sourceSupplier: p.sourceSupplier || '',
                sourceRef: p.sourceRef || '',
                sourceColor: p.sourceColor || '',
                sourceNotes: p.sourceNotes || '',
                cp: pCp,
                unitPrice: pSp
            };
        });
    } else {
        const def = makeDefaultProduct(1);
        const sizes = (typeof order.sizes === 'object' && order.sizes !== null)
            ? { ...def.sizes, ...order.sizes }
            : def.sizes;
        const freeSizes = (typeof order.sizes === 'object' && order.sizes !== null && Object.keys(order.sizes).length > 0)
            ? Object.entries(order.sizes).map(([label, qty]) => ({ label, qty: Number(qty) || 0 }))
            : (typeof order.sizes === 'string' && order.sizes.trim()
                ? order.sizes.split(',').map(s => {
                    const parts = s.trim().split(':');
                    return { label: parts[0]?.trim() || 'S', qty: Number(parts[1]?.trim()) || 0 };
                })
                : def.freeSizes);

        const oQty = Number(order.qty) || 0;
        const oVal = Number(order.value) || 0;
        const oCost = Number(order.incurredCost) || 0;
        const unitPrice = oQty > 0 ? Number((oVal / oQty).toFixed(2)) : '';
        const cp = oQty > 0 ? Number((oCost / oQty).toFixed(2)) : '';

        coState.products = [{
            id: `prod-${Date.now()}-1`,
            name: order.product || '',
            category: 'Adults',
            workflowType: order.workflowType || wf,
            customStages: Array.isArray(order.customStages) ? order.customStages : [],
            qty: oQty,
            sizes,
            freeSizes,
            fabric: {
                type: (typeof order.fabric === 'string' ? order.fabric.split(' ')[0] : '') || 'Cotton',
                subtype: '',
                gsm: '',
                dia: '',
                yarnCount: '',
                yarnBlend: ''
            },
            decorationType: '',
            decorationPlacement: '',
            decorationColors: '',
            sourceSupplier: '',
            sourceRef: '',
            sourceColor: '',
            sourceNotes: '',
            cp,
            unitPrice
        }];
    }

    // Pre-fill Step 1 inputs
    const custSel = qs('co-customer');
    if (custSel) {
        custSel.value = order.customerId || '';
    }
    const poInput = qs('co-customer-po');
    if (poInput) poInput.value = order.customerPO || order.poNumber || '';

    const delInput = qs('co-delivery');
    if (delInput && order.deliveryDate) delInput.value = order.deliveryDate;

    const termsInput = qs('co-payment-terms');
    if (termsInput && order.paymentTerms) termsInput.value = order.paymentTerms;

    const notesInput = qs('co-order-notes');
    if (notesInput && (order.notes || order.instructions)) notesInput.value = order.notes || order.instructions;

    const advInput = qs('co-advance-payment');
    if (advInput && order.paymentReceived !== undefined) advInput.value = order.paymentReceived;

    renderWorkflowPicker();
    renderProducts();
    calculateFinancials();
    renderStep();
    showToast(`Loaded order ${orderId} for editing`, 'info');
}

// ─── Customers Dropdown ───────────────────────────────────────────────────────
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
        const addrField = qs('co-order-notes');
        if (addrField && !addrField.value) addrField.value = cust.shippingAddress;
    }
}

// ─── Quotations Autofill ──────────────────────────────────────────────────────
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

    if (quote.styleRef)   prod.name = quote.styleRef;
    if (quote.fabricGsm)  prod.fabric.gsm = Number(quote.fabricGsm);
    if (quote.fabricType) prod.fabric.type = quote.fabricType;
    if (quote.retailPrice || quote.totalCost) {
        prod.unitPrice = Number(quote.retailPrice || quote.totalCost) || prod.unitPrice;
    }

    renderProducts();
    calculateFinancials();
    showToast(`Pre-filled specs from "${quote.styleRef}"`, 'success');
};

// ─── Priority Toggle ──────────────────────────────────────────────────────────
window.coSetPriority = function(prio) {
    coState.priority = prio;
    const active   = 'py-3 rounded-xl border-2 border-primary bg-primary text-white font-bold text-[13px] transition-all active-scale shadow-xs';
    const inactive = 'py-3 rounded-xl border-2 border-outline-variant bg-surface text-secondary font-bold text-[13px] transition-all active-scale';
    qs('prio-normal-btn') && (qs('prio-normal-btn').className = prio === 'Normal' ? active : inactive);
    qs('prio-high-btn')   && (qs('prio-high-btn').className   = prio === 'High'   ? active : inactive);
    qs('prio-urgent-btn') && (qs('prio-urgent-btn').className = prio === 'Urgent' ? active : inactive);
};

// ─── Workflow Type Picker ─────────────────────────────────────────────────────
window.coSelectOrderWorkflow = function(wfKey) {
    const prevWf = coState.orderWorkflowType;
    coState.orderWorkflowType = wfKey;

    // Apply to products that matched previous global workflow or were default
    coState.products.forEach(prod => {
        if (!prod.workflowType || prod.workflowType === 'default' || prod.workflowType === prevWf) {
            prod.workflowType = wfKey;
        }
        if (workflowLocksPrint(wfKey)) {
            prod.decorationType = 'Screen';
        } else if (workflowLocksEmbroidery(wfKey)) {
            prod.decorationType = 'Embroidery';
        }
    });

    renderWorkflowPicker();
    renderProducts();
    calculateFinancials();
};

window.coSetProductWorkflow = function(idx, wfKey) {
    const prod = coState.products[idx];
    if (!prod) return;
    prod.workflowType = wfKey;
    if (wfKey === 'custom' && (!prod.customStages || prod.customStages.length === 0)) {
        prod.customStages = ['procurement', 'fabric', 'cutting', 'stitching', 'packing', 'dispatch'];
    }
    if (workflowLocksPrint(wfKey)) prod.decorationType = 'Screen';
    if (workflowLocksEmbroidery(wfKey)) prod.decorationType = 'Embroidery';
    renderProducts();
    calculateFinancials();
    const wfInfo = WORKFLOW_PRESETS.find(w => w.key === wfKey);
    if (window.showToast) {
        window.showToast(`Updated "${prod.name || `Product #${idx + 1}`}" workflow to ${wfInfo?.label || wfKey}`, 'info');
    }
};

window.coToggleProductCustomStage = function(idx, stageKey) {
    const prod = coState.products[idx];
    if (!prod) return;
    if (!Array.isArray(prod.customStages)) prod.customStages = [];
    const sIdx = prod.customStages.indexOf(stageKey);
    if (sIdx >= 0) {
        if (prod.customStages.length > 1) {
            prod.customStages.splice(sIdx, 1);
        } else {
            showToast('At least one production stage is required', 'error');
            return;
        }
    } else {
        prod.customStages.push(stageKey);
        const ALL_ORDER = ['procurement', 'winding', 'knitting', 'dyeing', 'fabric', 'cutting', 'print_wash', 'stitching', 'packing', 'dispatch'];
        prod.customStages.sort((a, b) => ALL_ORDER.indexOf(a) - ALL_ORDER.indexOf(b));
    }
    renderProducts();
};

function renderWorkflowPicker() {
    const container = qs('co-workflow-picker');
    if (!container) return;

    const selected = coState.orderWorkflowType;

    container.innerHTML = `
        <div class="bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant shadow-sm">
            <div class="flex items-center gap-2 mb-1">
                <span class="material-symbols-outlined text-[22px] text-primary">route</span>
                <h2 class="text-[18px] font-extrabold text-on-surface">Select Production Workflow</h2>
            </div>
            <p class="text-[13px] text-secondary mb-4">Choose how this order will be produced. This controls which fields appear for your products.</p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                ${WORKFLOW_PRESETS.map(wf => {
                    const isSelected = selected === wf.key;
                    return `
                    <button type="button"
                        onclick="window.coSelectOrderWorkflow('${wf.key}')"
                        class="text-left p-4 rounded-2xl border-2 transition-all active-scale ${isSelected
                            ? 'border-primary bg-primary/5 shadow-sm'
                            : 'border-outline-variant bg-surface hover:border-primary/40 hover:bg-surface-container'
                        }">
                        <div class="flex items-start justify-between gap-2">
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center gap-2 mb-1">
                                    <div class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style="background: ${wf.color}20;">
                                        <span class="material-symbols-outlined text-[16px]" style="color:${wf.color}">${wf.icon}</span>
                                    </div>
                                    <h5 class="text-[13px] font-extrabold ${isSelected ? 'text-primary' : 'text-on-surface'} leading-snug">${wf.label}</h5>
                                </div>
                                <p class="text-[11px] text-secondary mb-1.5">${wf.desc}</p>
                                <p class="text-[10px] font-mono text-secondary/70 leading-snug">${wf.pipeline}</p>
                            </div>
                            <div class="shrink-0 mt-1">
                                ${isSelected
                                    ? `<span class="material-symbols-outlined text-primary text-[22px]">check_circle</span>`
                                    : `<span class="w-5 h-5 rounded-full border-2 border-outline-variant block mt-0.5"></span>`
                                }
                            </div>
                        </div>
                    </button>`;
                }).join('')}
            </div>
        </div>
    `;
}

// ─── Product card: fabric type switch ────────────────────────────────────────
window.coSwitchProductFabricType = function(idx, type) {
    const prod = coState.products[idx];
    if (!prod) return;
    prod.fabric.type    = type;
    prod.fabric.subtype = (FABRIC_SUBTYPES[type] || [])[0] || '';
    prod.fabric.gsm     = type === 'Fleece' ? 280 : type === 'Polyester' ? 160 : 180;
    renderProducts();
};

// ─── Product card: fabric field update ───────────────────────────────────────
window.coUpdateProductFabricField = function(idx, field, value) {
    const prod = coState.products[idx];
    if (!prod) return;
    prod.fabric[field] = (field === 'subtype') ? value : (parseFloat(value) || value || '');
};

// ─── Product card: decoration ─────────────────────────────────────────────────
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

// ─── Product card: source field update ────────────────────────────────────────
window.coUpdateProductSourceField = function(idx, field, value) {
    const prod = coState.products[idx];
    if (!prod) return;
    prod[field] = value;
};

// ─── Product list management ──────────────────────────────────────────────────
window.coAddProduct = function() {
    const newIdx = coState.products.length + 1;
    const p = makeDefaultProduct(newIdx);
    // Auto-lock decoration for certain workflows
    const wf = coState.orderWorkflowType || 'default';
    p.workflowType = wf;
    if (workflowLocksPrint(wf)) p.decorationType = 'Screen';
    if (workflowLocksEmbroidery(wf)) p.decorationType = 'Embroidery';
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

// ─── Standard Sizing ──────────────────────────────────────────────────────────
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

    updateProductSumBadge(idx);
    calculateFinancials();
};

window.coUpdateProductSizeCell = function(idx, sizeKey, cellVal) {
    const prod = coState.products[idx];
    if (!prod) return;
    prod.sizes[sizeKey] = parseInt(cellVal) || 0;
    prod.qty = Object.values(prod.sizes).reduce((s, v) => s + (v || 0), 0);
    const tqInput = qs(`target-qty-${idx}`);
    if (tqInput) tqInput.value = prod.qty || '';
    updateProductSumBadge(idx);
    calculateFinancials();
};

// ─── Free-form Sizes (Direct Fulfillment) ─────────────────────────────────────
window.coAddFreeSizeRow = function(idx) {
    const prod = coState.products[idx];
    if (!prod) return;
    prod.freeSizes.push({ label: '', qty: 0 });
    renderProductFreeSize(idx);
    calculateFinancials();
};

window.coRemoveFreeSizeRow = function(idx, rowIdx) {
    const prod = coState.products[idx];
    if (!prod || prod.freeSizes.length <= 1) return;
    prod.freeSizes.splice(rowIdx, 1);
    renderProductFreeSize(idx);
    syncFreeSizeTotal(idx);
    calculateFinancials();
};

window.coUpdateFreeSizeLabel = function(idx, rowIdx, label) {
    const prod = coState.products[idx];
    if (!prod || !prod.freeSizes[rowIdx]) return;
    prod.freeSizes[rowIdx].label = label;
};

window.coUpdateFreeSizeQty = function(idx, rowIdx, qtyVal) {
    const prod = coState.products[idx];
    if (!prod || !prod.freeSizes[rowIdx]) return;
    prod.freeSizes[rowIdx].qty = parseInt(qtyVal) || 0;
    syncFreeSizeTotal(idx);
    calculateFinancials();
};

function syncFreeSizeTotal(idx) {
    const prod = coState.products[idx];
    if (!prod) return;
    prod.qty = prod.freeSizes.reduce((s, r) => s + (r.qty || 0), 0);
    const badge = qs(`p-sum-badge-${idx}`);
    if (badge) badge.textContent = `${prod.qty} pcs total`;
    calculateFinancials();
}

function renderProductFreeSize(idx) {
    const prod = coState.products[idx];
    const container = qs(`free-size-rows-${idx}`);
    if (!prod || !container) return;
    container.innerHTML = prod.freeSizes.map((row, rowIdx) => `
        <div class="flex items-center gap-2" id="free-row-${idx}-${rowIdx}">
            <input type="text" value="${row.label || ''}" placeholder="Size label (e.g. M, 40, L)"
                oninput="window.coUpdateFreeSizeLabel(${idx}, ${rowIdx}, this.value)"
                class="flex-1 bg-surface border border-outline-variant rounded-xl px-3 py-2 text-[13px] font-semibold text-on-surface outline-none focus:ring-2 focus:ring-primary/20">
            <input type="number" min="0" value="${row.qty || ''}" placeholder="Qty"
                oninput="window.coUpdateFreeSizeQty(${idx}, ${rowIdx}, this.value)"
                class="w-24 text-center bg-surface border border-outline-variant rounded-xl px-3 py-2 text-[14px] font-extrabold text-primary outline-none focus:ring-2 focus:ring-primary/20">
            ${prod.freeSizes.length > 1 ? `
            <button type="button" onclick="window.coRemoveFreeSizeRow(${idx}, ${rowIdx})"
                class="text-error hover:bg-error/10 p-2 rounded-lg active-scale transition-apple shrink-0" title="Remove size">
                <span class="material-symbols-outlined text-[17px]">close</span>
            </button>` : '<div class="w-9"></div>'}
        </div>
    `).join('');
}

// ─── Ratio Presets ────────────────────────────────────────────────────────────
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
    const isGeneral  = prod.category === 'General';
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

// ─── Product Card Renderer ────────────────────────────────────────────────────
function renderProductCard(prod, idx) {
    const prodWf     = prod.workflowType || coState.orderWorkflowType || 'default';
    const isDirect   = workflowIsDirectFulfillment(prodWf);
    const isFullVert = workflowIsFullVertical(prodWf);
    const isCustom   = prodWf === 'custom';
    const needsFab   = isCustom ? (prod.customStages?.includes('fabric') || prod.customStages?.includes('cutting') || prod.customStages?.includes('knitting')) : workflowNeedsFabric(prodWf);
    const needsDec   = isCustom ? (prod.customStages?.includes('print_wash')) : workflowNeedsDecoration(prodWf);
    const lockPrint  = workflowLocksPrint(prodWf);
    const lockEmb    = workflowLocksEmbroidery(prodWf);

    const activeWfPreset = WORKFLOW_PRESETS.find(w => w.key === prodWf) || {
        key: prodWf,
        label: prodWf === 'custom' ? 'Custom Route' : prodWf,
        color: '#007AFF',
        icon: 'alt_route',
        pipeline: 'Custom Route'
    };

    const isGeneral = prod.category === 'General';
    const isAdults  = prod.category === 'Adults';
    const sizeKeys  = isAdults
        ? ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'XXXXL']
        : ['24', '26', '28', '30', '32', '34', '36', '38'];

    const currentSum = Object.values(prod.sizes).reduce((s, v) => s + (v || 0), 0);
    const totalForBadge = isDirect
        ? prod.freeSizes.reduce((s, r) => s + (r.qty || 0), 0)
        : (isGeneral ? prod.qty : currentSum);
    const isMatch = isDirect ? true : (isGeneral ? prod.qty > 0 : currentSum === prod.qty);

    // ── Section A: Sizing ──────────────────────────────────────────────────────
    let sizingHtml = '';

    if (isDirect) {
        // Free-form size rows
        const rowsHtml = prod.freeSizes.map((row, rowIdx) => `
            <div class="flex items-center gap-2" id="free-row-${idx}-${rowIdx}">
                <input type="text" value="${row.label || ''}" placeholder="Size label (e.g. M, 40, Free Size)"
                    oninput="window.coUpdateFreeSizeLabel(${idx}, ${rowIdx}, this.value)"
                    class="flex-1 bg-surface border border-outline-variant rounded-xl px-3 py-2 text-[13px] font-semibold text-on-surface outline-none focus:ring-2 focus:ring-primary/20">
                <input type="number" min="0" value="${row.qty || ''}" placeholder="Qty"
                    oninput="window.coUpdateFreeSizeQty(${idx}, ${rowIdx}, this.value)"
                    class="w-24 text-center bg-surface border border-outline-variant rounded-xl px-3 py-2 text-[14px] font-extrabold text-primary outline-none focus:ring-2 focus:ring-primary/20">
                ${prod.freeSizes.length > 1 ? `
                <button type="button" onclick="window.coRemoveFreeSizeRow(${idx}, ${rowIdx})"
                    class="text-error hover:bg-error/10 p-2 rounded-lg active-scale transition-apple shrink-0" title="Remove">
                    <span class="material-symbols-outlined text-[17px]">close</span>
                </button>` : '<div class="w-9"></div>'}
            </div>
        `).join('');

        sizingHtml = `
        <div class="px-5 py-4 flex flex-col gap-3 border-b border-outline-variant/40" style="border-left: 3px solid #34C759; padding-left: 1.5rem;">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                    <span class="material-symbols-outlined text-[17px] text-[#34C759]">straighten</span>
                    <h4 class="text-[12px] font-extrabold text-[#34C759] uppercase tracking-widest">Sizes & Quantity</h4>
                </div>
                <span id="p-sum-badge-${idx}" class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/20">
                    ${totalForBadge} pcs total
                </span>
            </div>
            <p class="text-[11px] text-secondary -mt-1">Enter each size and its quantity. Add as many size rows as needed.</p>
            <div class="flex flex-col gap-2" id="free-size-rows-${idx}">
                ${rowsHtml}
            </div>
            <button type="button" onclick="window.coAddFreeSizeRow(${idx})"
                class="flex items-center gap-1.5 text-primary font-bold text-[12px] py-2 px-3 rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 active-scale transition-all w-max">
                <span class="material-symbols-outlined text-[16px]">add</span>
                Add Size Row
            </button>
        </div>`;

    } else {
        // Standard size grid
        const sizeInputsHtml = isGeneral ? `
            <div class="col-span-full bg-surface-container/50 border border-outline-variant/60 rounded-xl p-3.5 flex items-center justify-between">
                <div class="flex items-center gap-2.5">
                    <div class="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <span class="material-symbols-outlined text-[20px]">layers</span>
                    </div>
                    <div>
                        <p class="text-[13px] font-bold text-on-surface">General / Free Size Quantity</p>
                        <p class="text-[11px] text-secondary">Single batch without size distribution.</p>
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

        sizingHtml = `
        <div class="px-5 py-4 flex flex-col gap-3 border-b border-outline-variant/40 card-section-sizing pl-6">
            <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-[17px] text-[#FF9500]">straighten</span>
                <h4 class="text-[12px] font-extrabold text-[#FF9500] uppercase tracking-widest">Sizing & Quantity</h4>
            </div>
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div class="flex items-center gap-3 flex-wrap">
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
                            General
                        </button>
                    </div>
                    <div class="flex items-center gap-2">
                        <label class="text-[10px] font-bold text-secondary uppercase whitespace-nowrap">Target Qty</label>
                        <input type="number" min="1" value="${prod.qty || ''}" placeholder="0"
                            id="target-qty-${idx}"
                            oninput="window.coUpdateProductTargetQty(${idx}, this.value)"
                            class="w-24 bg-surface border border-outline-variant rounded-xl px-3 py-1.5 text-[15px] font-extrabold text-primary outline-none focus:ring-2 focus:ring-primary/20 text-center">
                    </div>
                </div>
                ${!isGeneral ? `
                <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                    <span class="text-[10px] font-bold text-secondary uppercase mr-1 whitespace-nowrap">Presets:</span>
                    <button type="button" onclick="window.coApplyRatioPreset(${idx}, 'even')"  class="ratio-btn px-2.5 py-1 rounded-lg border border-outline-variant text-[11px] font-bold text-secondary bg-surface whitespace-nowrap">Even Split</button>
                    <button type="button" onclick="window.coApplyRatioPreset(${idx}, 'bell')"  class="ratio-btn px-2.5 py-1 rounded-lg border border-outline-variant text-[11px] font-bold text-secondary bg-surface whitespace-nowrap">Bell Curve</button>
                    <button type="button" onclick="window.coApplyRatioPreset(${idx}, 'clear')" class="ratio-btn px-2.5 py-1 rounded-lg border border-outline-variant text-[11px] font-bold text-error   bg-surface whitespace-nowrap">Clear</button>
                </div>` : ''}
            </div>
            <div class="${isGeneral ? 'grid grid-cols-1' : 'grid grid-cols-4 sm:grid-cols-8 gap-2'}">
                ${sizeInputsHtml}
            </div>
            ${!isGeneral ? `
            <div id="p-sum-badge-${idx}" class="self-start px-2.5 py-1 rounded-full text-[11px] font-bold ${isMatch ? 'bg-[#008A00]/10 text-[#008A00] border border-[#008A00]/20' : 'bg-error/10 text-error border border-error/20'}">
                ${currentSum} / ${prod.qty} pcs
            </div>` : ''}
        </div>`;
    }

    // ── Section B: Fabric & Material (optional, hidden for direct) ─────────────
    let fabricHtml = '';
    if (needsFab) {
        const fabricTypeBtns = ['Cotton', 'Polyester', 'Blended', 'Fleece'].map(ft => {
            const isActive = prod.fabric.type === ft;
            const label    = ft === 'Blended' ? 'Poly Blend' : ft === 'Fleece' ? 'Fleece/FT' : ft;
            return `<button type="button" onclick="window.coSwitchProductFabricType(${idx}, '${ft}')"
                class="${isActive ? 'border-primary bg-primary text-white shadow-sm' : 'border-outline-variant bg-surface text-secondary'}
                py-2 rounded-xl border-2 font-bold text-[12px] transition-all active-scale">
                ${label}
            </button>`;
        }).join('');

        const subtypeOptions = (FABRIC_SUBTYPES[prod.fabric.type] || []).map(s =>
            `<option value="${s}" ${prod.fabric.subtype === s ? 'selected' : ''}>${s}</option>`
        ).join('');

        const yarnFieldsHtml = isFullVert ? `
            <div class="grid grid-cols-2 gap-3 pt-2 border-t border-outline-variant/30">
                <div class="flex flex-col gap-1">
                    <label class="text-[10px] font-bold text-secondary uppercase tracking-wider">Yarn Count (Ne)</label>
                    <input type="text" value="${prod.fabric.yarnCount || ''}" placeholder="e.g. 30s, 40s"
                        oninput="window.coUpdateProductFabricField(${idx}, 'yarnCount', this.value)"
                        class="w-full bg-surface border border-outline-variant rounded-xl px-3 py-2 text-[13px] text-on-surface outline-none focus:ring-2 focus:ring-primary/20">
                </div>
                <div class="flex flex-col gap-1">
                    <label class="text-[10px] font-bold text-secondary uppercase tracking-wider">Yarn Blend %</label>
                    <input type="text" value="${prod.fabric.yarnBlend || ''}" placeholder="e.g. 60/40 CVC"
                        oninput="window.coUpdateProductFabricField(${idx}, 'yarnBlend', this.value)"
                        class="w-full bg-surface border border-outline-variant rounded-xl px-3 py-2 text-[13px] text-on-surface outline-none focus:ring-2 focus:ring-primary/20">
                </div>
            </div>` : '';

        fabricHtml = `
        <div class="px-5 py-4 flex flex-col gap-3 border-b border-outline-variant/40 card-section-fabric pl-6 bg-surface/30">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                    <span class="material-symbols-outlined text-[17px] text-[#007AFF]">texture</span>
                    <h4 class="text-[12px] font-extrabold text-[#007AFF] uppercase tracking-widest">Fabric & Material</h4>
                </div>
                <span class="text-[10px] font-bold text-secondary bg-surface-container px-2 py-0.5 rounded-full border border-outline-variant/60">Optional</span>
            </div>
            <div class="grid grid-cols-4 gap-2">${fabricTypeBtns}</div>
            ${prod.fabric.type ? `
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div class="flex flex-col gap-1">
                    <label class="text-[10px] font-bold text-secondary uppercase tracking-wider">Knit Construction</label>
                    <select onchange="window.coUpdateProductFabricField(${idx}, 'subtype', this.value)"
                        class="w-full bg-surface border border-outline-variant rounded-xl px-3 py-2 text-[13px] font-semibold text-on-surface outline-none focus:ring-2 focus:ring-primary/20">
                        ${subtypeOptions || '<option>Select type first</option>'}
                    </select>
                </div>
                <div class="flex flex-col gap-1">
                    <label class="text-[10px] font-bold text-secondary uppercase tracking-wider">GSM (Weight)</label>
                    <input type="number" value="${prod.fabric.gsm || ''}" placeholder="e.g. 180"
                        oninput="window.coUpdateProductFabricField(${idx}, 'gsm', this.value)"
                        class="w-full bg-surface border border-outline-variant rounded-xl px-3 py-2 text-[14px] font-bold text-on-surface outline-none focus:ring-2 focus:ring-primary/20">
                </div>
                <div class="flex flex-col gap-1">
                    <label class="text-[10px] font-bold text-secondary uppercase tracking-wider">Knitting Dia (inches)</label>
                    <input type="number" value="${prod.fabric.dia || ''}" placeholder="e.g. 34"
                        oninput="window.coUpdateProductFabricField(${idx}, 'dia', this.value)"
                        class="w-full bg-surface border border-outline-variant rounded-xl px-3 py-2 text-[14px] text-on-surface outline-none focus:ring-2 focus:ring-primary/20">
                </div>
            </div>
            ${yarnFieldsHtml}` : `
            <p class="text-[12px] text-secondary italic">Select a fabric type above to enter specifications.</p>`}
        </div>`;
    }

    // ── Section C: Decoration / Embellishment ──────────────────────────────────
    let decorationHtml = '';
    if (needsDec) {
        const decTypes = [
            { key: 'Screen',     label: 'Screen Print' },
            { key: 'DTF',        label: 'DTF / Heat Transfer' },
            { key: 'Sublimation',label: 'Sublimation' },
            { key: 'Embroidery', label: 'Embroidery' },
            { key: 'None',       label: 'Plain / Solid' }
        ];

        let decBtns = '';
        if (lockPrint) {
            decBtns = decTypes.filter(d => d.key !== 'None' && d.key !== 'Embroidery').map(({ key, label }) => {
                const isActive = prod.decorationType === key;
                return `<button type="button" onclick="window.coSelectProductDecType(${idx}, '${key}')"
                    class="${isActive ? 'border-primary bg-primary text-white shadow-sm' : 'border-outline-variant bg-surface text-secondary'}
                    py-2 rounded-xl border-2 font-bold text-[11px] transition-all active-scale">${label}</button>`;
            }).join('');
        } else if (lockEmb) {
            decBtns = `<button type="button" class="border-primary bg-primary text-white py-2 rounded-xl border-2 font-bold text-[11px] col-span-2">Embroidery (Required)</button>`;
        } else {
            decBtns = decTypes.map(({ key, label }) => {
                const isActive = prod.decorationType === key;
                return `<button type="button" onclick="window.coSelectProductDecType(${idx}, '${key}')"
                    class="${isActive ? 'border-primary bg-primary text-white shadow-sm' : 'border-outline-variant bg-surface text-secondary'}
                    py-2 rounded-xl border-2 font-bold text-[11px] transition-all active-scale">${label}</button>`;
            }).join('');
        }

        const decDetailsHtml = (prod.decorationType && prod.decorationType !== 'None') ? `
            <div class="grid grid-cols-2 gap-3 mt-2">
                <div class="flex flex-col gap-1">
                    <label class="text-[10px] font-bold text-secondary uppercase tracking-wider">Placement</label>
                    <input type="text" value="${prod.decorationPlacement || ''}" placeholder="e.g. Center Chest 10×10"
                        oninput="window.coUpdateProductField(${idx}, 'decorationPlacement', this.value)"
                        class="w-full bg-surface border border-outline-variant rounded-xl px-3 py-2 text-[13px] text-on-surface outline-none focus:ring-2 focus:ring-primary/20">
                </div>
                <div class="flex flex-col gap-1">
                    <label class="text-[10px] font-bold text-secondary uppercase tracking-wider">${prod.decorationType === 'Embroidery' ? 'Stitch Count' : 'Colors'}</label>
                    <input type="text" value="${prod.decorationColors || ''}" placeholder="${prod.decorationType === 'Embroidery' ? 'e.g. 15,000 stitches' : 'e.g. 3 Colors Plastisol'}"
                        oninput="window.coUpdateProductField(${idx}, 'decorationColors', this.value)"
                        class="w-full bg-surface border border-outline-variant rounded-xl px-3 py-2 text-[13px] text-on-surface outline-none focus:ring-2 focus:ring-primary/20">
                </div>
            </div>
        ` : (!prod.decorationType ? '<p class="text-[11px] text-secondary italic mt-2">Select decoration type above.</p>' : '<p class="text-[11px] text-secondary italic mt-2">Plain / solid — no decoration.</p>');

        const lockNote = lockPrint
            ? `<span class="text-[10px] font-bold bg-[#AF52DE]/10 text-[#AF52DE] px-2 py-0.5 rounded-full border border-[#AF52DE]/20">Print workflow — select print type</span>`
            : lockEmb
                ? `<span class="text-[10px] font-bold bg-[#FF9500]/10 text-[#FF9500] px-2 py-0.5 rounded-full border border-[#FF9500]/20">Embellishment workflow — embroidery required</span>`
                : `<span class="text-[10px] font-bold text-secondary bg-surface-container px-2 py-0.5 rounded-full border border-outline-variant/60">Optional</span>`;

        decorationHtml = `
        <div class="px-5 py-4 flex flex-col gap-3 card-section-workflow pl-6">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                    <span class="material-symbols-outlined text-[17px] text-[#5856D6]">auto_fix_high</span>
                    <h4 class="text-[12px] font-extrabold text-[#5856D6] uppercase tracking-widest">Decoration / Embellishment</h4>
                </div>
                ${lockNote}
            </div>
            <div class="grid grid-cols-${lockEmb ? '1' : lockPrint ? '3' : '5'} gap-2">
                ${decBtns}
            </div>
            ${decDetailsHtml}
        </div>`;
    }

    // ── Section D: Sourcing Spec (Direct Fulfillment only) ─────────────────────
    let sourcingHtml = '';
    if (isDirect) {
        sourcingHtml = `
        <div class="px-5 py-4 flex flex-col gap-3" style="border-left: 3px solid #34C759; padding-left: 1.5rem;">
            <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-[17px] text-[#34C759]">storefront</span>
                <h4 class="text-[12px] font-extrabold text-[#34C759] uppercase tracking-widest">Sourcing Details</h4>
                <span class="text-[10px] font-bold text-secondary bg-surface-container px-2 py-0.5 rounded-full border border-outline-variant/60 ml-auto">Optional</span>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div class="flex flex-col gap-1">
                    <label class="text-[10px] font-bold text-secondary uppercase tracking-wider">Supplier / Source Name</label>
                    <input type="text" value="${prod.sourceSupplier || ''}" placeholder="e.g. Tiruppur Exports Pvt Ltd"
                        oninput="window.coUpdateProductSourceField(${idx}, 'sourceSupplier', this.value)"
                        class="w-full bg-surface border border-outline-variant rounded-xl px-3 py-2 text-[13px] text-on-surface outline-none focus:ring-2 focus:ring-primary/20">
                </div>
                <div class="flex flex-col gap-1">
                    <label class="text-[10px] font-bold text-secondary uppercase tracking-wider">Product Ref # / Catalog Code</label>
                    <input type="text" value="${prod.sourceRef || ''}" placeholder="e.g. CAT-2026-001"
                        oninput="window.coUpdateProductSourceField(${idx}, 'sourceRef', this.value)"
                        class="w-full bg-surface border border-outline-variant rounded-xl px-3 py-2 text-[13px] text-on-surface outline-none focus:ring-2 focus:ring-primary/20">
                </div>
                <div class="flex flex-col gap-1">
                    <label class="text-[10px] font-bold text-secondary uppercase tracking-wider">Color / Finish</label>
                    <input type="text" value="${prod.sourceColor || ''}" placeholder="e.g. Navy Blue, S.No 420"
                        oninput="window.coUpdateProductSourceField(${idx}, 'sourceColor', this.value)"
                        class="w-full bg-surface border border-outline-variant rounded-xl px-3 py-2 text-[13px] text-on-surface outline-none focus:ring-2 focus:ring-primary/20">
                </div>
                <div class="flex flex-col gap-1">
                    <label class="text-[10px] font-bold text-secondary uppercase tracking-wider">Notes</label>
                    <input type="text" value="${prod.sourceNotes || ''}" placeholder="e.g. Pre-packed, hangtag required"
                        oninput="window.coUpdateProductSourceField(${idx}, 'sourceNotes', this.value)"
                        class="w-full bg-surface border border-outline-variant rounded-xl px-3 py-2 text-[13px] text-on-surface outline-none focus:ring-2 focus:ring-primary/20">
                </div>
            </div>
        </div>`;
    }

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
                ${!isDirect ? `
                <span id="p-sum-badge-${idx}" class="px-2.5 py-1 rounded-full text-[11px] font-bold ${isMatch ? 'bg-[#008A00]/10 text-[#008A00] border border-[#008A00]/20' : 'bg-error/10 text-error border border-error/20'}">
                    ${isGeneral ? `${prod.qty || 0} pcs (General)` : `${currentSum} / ${prod.qty} pcs`}
                </span>` : ''}
                ${coState.products.length > 1 ? `
                    <button type="button" onclick="window.coRemoveProduct(${idx})"
                        class="text-error hover:bg-error/10 p-1.5 rounded-lg active-scale transition-apple" title="Remove Product">
                        <span class="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                ` : ''}
            </div>
        </div>

        <!-- ── Per-Product Workflow Route Selector Bar ────────────────────── -->
        <div class="px-5 py-3.5 bg-surface-container/30 border-b border-outline-variant/50 flex flex-col gap-2.5">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div class="flex items-center gap-2.5 flex-wrap">
                    <div class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-2xs" style="background: ${activeWfPreset.color}18;">
                        <span class="material-symbols-outlined text-[16px]" style="color:${activeWfPreset.color}">${activeWfPreset.icon}</span>
                    </div>
                    <div>
                        <div class="flex items-center gap-2 flex-wrap">
                            <span class="text-[11px] font-extrabold uppercase tracking-wider text-secondary">Workflow:</span>
                            <span class="text-[12px] font-extrabold px-2.5 py-0.5 rounded-md flex items-center gap-1 shadow-2xs" style="background: ${activeWfPreset.color}15; color: ${activeWfPreset.color}; border: 1px solid ${activeWfPreset.color}35;">
                                ${activeWfPreset.label}
                            </span>
                            ${prodWf !== (coState.orderWorkflowType || 'default') ? '<span class="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">Custom for this product</span>' : ''}
                        </div>
                    </div>
                </div>

                <!-- Inline Workflow Preset Dropdown -->
                <div class="flex items-center gap-2 self-start sm:self-auto bg-surface-container/60 px-3 py-1.5 rounded-xl border border-outline-variant/60">
                    <span class="material-symbols-outlined text-[16px] text-secondary">alt_route</span>
                    <label class="text-[11px] font-bold text-secondary whitespace-nowrap">Change Route:</label>
                    <select onchange="window.coSetProductWorkflow(${idx}, this.value)"
                        class="bg-surface border border-outline-variant rounded-lg px-2 py-1 text-[12px] font-bold text-on-surface outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer">
                        ${WORKFLOW_PRESETS.map(w => `
                            <option value="${w.key}" ${w.key === prodWf ? 'selected' : ''}>
                                ${w.label}
                            </option>
                        `).join('')}
                    </select>
                </div>
            </div>

            <!-- Pipeline Flow Preview or Custom Stage Toggles -->
            ${!isCustom ? `
                <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[11px] text-secondary/80 font-mono py-1">
                    <span class="text-[10px] font-bold text-secondary uppercase tracking-wider shrink-0 font-sans">Pipeline:</span>
                    ${(WORKFLOW_ROUTES[prodWf] || WORKFLOW_ROUTES.default).map((stKey, sIdx, arr) => `
                        <span class="px-2 py-0.5 rounded bg-surface border border-outline-variant/60 text-on-surface text-[10px] font-bold shrink-0">
                            ${STAGE_DEFINITIONS[stKey]?.shortLabel || STAGE_DEFINITIONS[stKey]?.label || stKey}
                        </span>
                        ${sIdx < arr.length - 1 ? '<span class="text-secondary/50 text-[10px]">→</span>' : ''}
                    `).join('')}
                </div>
            ` : `
                <div class="flex flex-col gap-2 pt-2 border-t border-outline-variant/30">
                    <div class="flex items-center justify-between">
                        <span class="text-[11px] font-bold text-secondary uppercase tracking-wider">Select Factory Stages For This Product:</span>
                        <span class="text-[11px] font-bold text-primary">${(prod.customStages || []).length} stages active</span>
                    </div>
                    <div class="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                        ${AVAILABLE_FACTORY_STAGES.map(st => {
                            const isChecked = (prod.customStages || []).includes(st.key);
                            return `
                                <button type="button" onclick="window.coToggleProductCustomStage(${idx}, '${st.key}')"
                                    class="p-2 rounded-xl border text-left flex items-center gap-1.5 transition-all text-[11px] font-bold ${
                                        isChecked
                                            ? 'border-primary bg-primary/10 text-primary shadow-2xs'
                                            : 'border-outline-variant bg-surface text-secondary hover:border-outline'
                                    }">
                                    <span class="material-symbols-outlined text-[15px]">${isChecked ? 'check_box' : 'check_box_outline_blank'}</span>
                                    <span class="truncate">${st.label}</span>
                                </button>
                            `;
                        }).join('')}
                    </div>
                </div>
            `}
        </div>

        ${sizingHtml}
        ${fabricHtml}
        ${decorationHtml}
        ${sourcingHtml}
    </div>`;
}

function renderProducts() {
    const container = qs('co-products-container');
    if (!container) return;

    const wf = coState.orderWorkflowType;
    if (!wf) {
        container.innerHTML = `
            <div class="text-center py-8 text-secondary">
                <span class="material-symbols-outlined text-[40px] block mb-2 opacity-40">route</span>
                <p class="text-[14px] font-semibold">Select a workflow type above to add products</p>
            </div>`;
        return;
    }

    container.innerHTML = coState.products.map((p, i) => renderProductCard(p, i)).join('');

    const totalQty = coState.orderWorkflowType === 'direct_fulfillment'
        ? coState.products.reduce((s, p) => s + p.freeSizes.reduce((ss, r) => ss + (r.qty || 0), 0), 0)
        : coState.products.reduce((s, p) => s + (p.qty || 0), 0);

    const el = qs('co-header-total-pcs');
    if (el) el.textContent = `${totalQty.toLocaleString()} pcs total`;
}

// ─── Step 3: Pricing Table ────────────────────────────────────────────────────
function renderPricingTable() {
    const container = qs('co-pricing-table');
    if (!container) return;
    const wf = coState.orderWorkflowType;

    container.innerHTML = coState.products.map((prod, idx) => {
        const prodWf   = prod.workflowType || wf || 'default';
        const isDirect = workflowIsDirectFulfillment(prodWf);
        const qty      = isDirect
            ? prod.freeSizes.reduce((s, r) => s + (r.qty || 0), 0)
            : (prod.qty || 0);
        const cp       = Number(prod.cp) || 0;
        const sp       = Number(prod.unitPrice) || 0;
        const margin   = sp > 0 ? Math.round(((sp - cp) / sp) * 100) : 0;
        const marginCls = margin >= 26 ? 'text-[#008A00]' : margin >= 18 ? 'text-[#FF9500]' : margin >= 0 ? 'text-error' : 'text-error';
        const lineRev  = qty * sp;
        const lineProfit = qty * (sp - cp);

        // Subtitle details
        const wfPreset = WORKFLOW_PRESETS.find(w => w.key === prodWf);
        let subtitleParts = [`${qty.toLocaleString()} pcs`];
        if (wfPreset) subtitleParts.push(wfPreset.label);
        if (!isDirect && prod.fabric.type) subtitleParts.push(`${prod.fabric.type}${prod.fabric.gsm ? ' ' + prod.fabric.gsm + ' GSM' : ''}`);
        if (prod.decorationType && prod.decorationType !== 'None') subtitleParts.push(prod.decorationType);
        if (isDirect && prod.sourceSupplier) subtitleParts.push(prod.sourceSupplier);

        return `
        <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 flex flex-col gap-4">
            <div class="flex items-start gap-3">
                <span class="w-7 h-7 rounded-full bg-primary/10 text-primary text-[12px] font-extrabold flex items-center justify-center shrink-0 mt-0.5">${idx + 1}</span>
                <div class="flex-1 min-w-0">
                    <p class="text-[15px] font-bold text-on-surface truncate">${prod.name || `Product #${idx + 1}`}</p>
                    <p class="text-[12px] text-secondary mt-0.5">${subtitleParts.join(' · ')}</p>
                </div>
                <div class="shrink-0 text-right">
                    <span class="text-[10px] font-bold text-secondary uppercase block">Margin</span>
                    <span class="text-[18px] font-extrabold ${marginCls}" id="pricing-margin-${idx}">${sp > 0 ? margin + '%' : '—'}</span>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div class="flex flex-col gap-1">
                    <label class="text-[11px] font-bold text-secondary uppercase tracking-wider">CP — Cost Price (₹/pc)</label>
                    <div class="relative">
                        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-secondary font-bold text-[13px]">₹</span>
                        <input type="number" value="${prod.cp || ''}" step="0.5" placeholder="Your cost..."
                            oninput="window.coUpdateProductField(${idx}, 'cp', parseFloat(this.value)||0); window.calculateFinancials();"
                            class="w-full bg-surface border border-outline-variant rounded-xl pl-8 pr-3 py-2.5 text-[16px] font-extrabold text-on-surface outline-none focus:ring-2 focus:ring-primary/20">
                    </div>
                </div>
                <div class="flex flex-col gap-1">
                    <label class="text-[11px] font-bold text-secondary uppercase tracking-wider">SP — Selling Price (₹/pc)</label>
                    <div class="relative">
                        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-secondary font-bold text-[13px]">₹</span>
                        <input type="number" value="${prod.unitPrice || ''}" step="0.5" placeholder="Your quote to buyer..."
                            oninput="window.coUpdateProductField(${idx}, 'unitPrice', parseFloat(this.value)||0); window.calculateFinancials();"
                            class="w-full bg-surface border border-outline-variant rounded-xl pl-8 pr-3 py-2.5 text-[16px] font-extrabold text-primary outline-none focus:ring-2 focus:ring-primary/20">
                    </div>
                </div>
            </div>
            <div class="grid grid-cols-3 gap-2 pt-3 border-t border-outline-variant/30 text-center">
                <div>
                    <span class="text-[10px] font-bold text-secondary uppercase block">Line Revenue</span>
                    <strong id="line-rev-${idx}" class="text-[14px] text-primary">₹${Math.round(lineRev).toLocaleString('en-IN')}</strong>
                </div>
                <div>
                    <span class="text-[10px] font-bold text-secondary uppercase block">Line Cost</span>
                    <strong id="line-cost-${idx}" class="text-[14px] text-secondary">₹${Math.round(qty * cp).toLocaleString('en-IN')}</strong>
                </div>
                <div>
                    <span class="text-[10px] font-bold text-secondary uppercase block">Line Profit</span>
                    <strong id="line-profit-${idx}" class="text-[14px] ${lineProfit >= 0 ? 'text-[#008A00]' : 'text-error'}">₹${Math.round(lineProfit).toLocaleString('en-IN')}</strong>
                </div>
            </div>
        </div>`;
    }).join('');
}

// ─── Financials Calculator ─────────────────────────────────────────────────────
function calculateFinancials() {
    const wf = coState.orderWorkflowType;

    let grandRevenue  = 0;
    let totalCost     = 0;
    let totalQty      = 0;

    coState.products.forEach((prod, idx) => {
        const isDirect = workflowIsDirectFulfillment(prod.workflowType || wf);
        const qty   = isDirect
            ? prod.freeSizes.reduce((s, r) => s + (r.qty || 0), 0)
            : (prod.qty || 0);
        const sp    = Number(prod.unitPrice) || 0;
        const cp    = Number(prod.cp) || 0;
        const lineRev    = qty * sp;
        const lineCost   = qty * cp;
        const lineProfit = qty * (sp - cp);
        const margin = sp > 0 ? Math.round(((sp - cp) / sp) * 100) : 0;

        grandRevenue += lineRev;
        totalCost    += lineCost;
        totalQty     += qty;

        // Update pricing table row displays (if rendered)
        const set = (id, text) => { const el = qs(id); if (el) el.textContent = text; };
        set(`line-rev-${idx}`,    `₹${Math.round(lineRev).toLocaleString('en-IN')}`);
        set(`line-cost-${idx}`,   `₹${Math.round(lineCost).toLocaleString('en-IN')}`);
        set(`line-profit-${idx}`, `₹${Math.round(lineProfit).toLocaleString('en-IN')}`);
        const marginEl = qs(`pricing-margin-${idx}`);
        if (marginEl) {
            marginEl.textContent = sp > 0 ? `${margin}%` : '—';
            marginEl.className = `text-[18px] font-extrabold ${margin >= 26 ? 'text-[#008A00]' : margin >= 18 ? 'text-[#FF9500]' : 'text-error'}`;
        }
    });

    const grossProfit = grandRevenue - totalCost;
    const marginPct   = grandRevenue > 0 ? Math.round((grossProfit / grandRevenue) * 100) : 0;

    const set = (id, text) => { const el = qs(id); if (el) el.textContent = text; };
    set('pricing-total-qty',   `${totalQty.toLocaleString()} pcs`);
    set('co-calc-grand-total', `₹${Math.round(grandRevenue).toLocaleString('en-IN')}`);
    set('calc-cost-display',   `₹${Math.round(totalCost).toLocaleString('en-IN')}`);

    const profitEl = qs('calc-profit-display');
    if (profitEl) {
        profitEl.textContent = `₹${Math.round(grossProfit).toLocaleString('en-IN')}`;
        profitEl.className   = `text-[18px] font-extrabold ${grossProfit >= 0 ? 'text-[#008A00]' : 'text-error'}`;
    }

    // Margin health gauge
    let badgeCls = 'bg-[#008A00]/10 text-[#008A00] border-[#008A00]/20';
    let barBg    = 'bg-[#008A00]';
    if (marginPct < 18) { badgeCls = 'bg-error/10 text-error border-error/20'; barBg = 'bg-error'; }
    else if (marginPct < 26) { badgeCls = 'bg-[#FF9500]/10 text-[#FF9500] border-[#FF9500]/20'; barBg = 'bg-[#FF9500]'; }

    const marginBadge = qs('co-margin-badge');
    if (marginBadge) {
        marginBadge.className   = `px-2.5 py-0.5 rounded-full text-[12px] font-extrabold border ${badgeCls}`;
        marginBadge.textContent = grandRevenue > 0 ? `${marginPct}% Gross Margin` : '— Margin';
    }
    const marginBar = qs('co-margin-progress-bar');
    if (marginBar) {
        marginBar.className = `h-full ${barBg} transition-all duration-300`;
        marginBar.style.width = `${Math.min(100, Math.max(2, marginPct))}%`;
    }

    // Bottom KPI bar
    set('bar-total-qty', totalQty.toLocaleString());
    set('bar-total-val', `₹${Math.round(grandRevenue).toLocaleString('en-IN')}`);

    const barMarginEl = qs('bar-margin-pct');
    if (barMarginEl) {
        barMarginEl.textContent = grandRevenue > 0 ? `${marginPct}%` : '—';
        barMarginEl.className   = `text-[15px] font-extrabold ${
            marginPct >= 26 ? 'text-[#008A00]' : marginPct >= 18 ? 'text-[#FF9500]' : 'text-error'
        }`;
    }
}
window.calculateFinancials = calculateFinancials;

// ─── Step 4: Per-product Workflow Pipeline Visualizer ─────────────────────────
function buildWorkflowSummary() {
    const container = qs('co-workflow-summary');
    if (!container) return;

    container.innerHTML = `
        <div class="bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant shadow-sm">
            <div class="flex items-center gap-2 mb-3">
                <span class="material-symbols-outlined text-[20px] text-[#5856D6]">account_tree</span>
                <h3 class="text-[14px] font-bold text-on-surface uppercase tracking-wider">Production Pipeline</h3>
            </div>
            <div class="flex flex-col gap-4">
                ${coState.products.map((prod, idx) => {
                    const prodWf = prod.workflowType || coState.orderWorkflowType || 'default';
                    const stages = getProductWorkflowStages(prod, coState.orderWorkflowType);
                    const wfInfo = WORKFLOW_CONFIG[prodWf] || WORKFLOW_PRESETS.find(w => w.key === prodWf) || { label: prodWf, color: '#5856D6' };
                    const stagePills = stages.map((stageKey, i) => {
                        const def    = STAGE_DEFINITIONS[stageKey] || { label: stageKey, shortLabel: stageKey, icon: 'circle', color: 'text-primary', bgColor: 'bg-primary/10', borderColor: 'border-primary/20' };
                        const isLast = i === stages.length - 1;
                        return `<div class="flex items-center gap-1">
                            <div class="flex flex-col items-center gap-0.5">
                                <div class="w-8 h-8 rounded-full ${def.bgColor} ${def.borderColor} border flex items-center justify-center shrink-0">
                                    <span class="material-symbols-outlined text-[13px] ${def.color}">${def.icon}</span>
                                </div>
                                <span class="text-[8px] font-bold text-secondary uppercase whitespace-nowrap">${def.shortLabel || def.label}</span>
                            </div>
                            ${!isLast ? `<span class="text-outline-variant/70 text-[12px] mb-4">→</span>` : ''}
                        </div>`;
                    }).join('');

                    const isDirect = workflowIsDirectFulfillment(prodWf);
                    const qty = isDirect
                        ? prod.freeSizes.reduce((s, r) => s + (r.qty || 0), 0)
                        : (prod.qty || 0);

                    return `
                    <div class="bg-surface-container/40 rounded-xl p-3 border border-outline-variant/50">
                        <div class="flex items-center gap-2 mb-2.5 flex-wrap">
                            <span class="w-5 h-5 rounded-full bg-primary text-white text-[10px] font-extrabold flex items-center justify-center shrink-0">${idx + 1}</span>
                            <span class="text-[13px] font-bold text-on-surface">${prod.name || `Product #${idx+1}`}</span>
                            <span class="text-[11px] text-secondary font-semibold">• ${qty.toLocaleString()} pcs</span>
                            <span class="ml-auto px-2.5 py-0.5 rounded-full text-[10px] font-extrabold" style="background: ${wfInfo.color}18; color: ${wfInfo.color}; border: 1px solid ${wfInfo.color}35;">
                                ${wfInfo.label}
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

// ─── Step 4: Executive Summary ─────────────────────────────────────────────────
function buildExecutiveSummary() {
    const container = qs('co-executive-summary');
    if (!container) return;

    const wf        = coState.orderWorkflowType;
    const isDirect  = workflowIsDirectFulfillment(wf);
    const customerSel  = qs('co-customer');
    const customerName = customerSel?.options[customerSel.selectedIndex]?.text?.split(' (')[0] || 'Direct Buyer';

    let totalQty = 0;
    let grandRevenue = 0;
    let totalCost = 0;

    coState.products.forEach(p => {
        const qty  = isDirect ? p.freeSizes.reduce((s, r) => s + (r.qty || 0), 0) : (p.qty || 0);
        const sp   = Number(p.unitPrice) || 0;
        const cp   = Number(p.cp) || 0;
        totalQty      += qty;
        grandRevenue  += qty * sp;
        totalCost     += qty * cp;
    });

    const profit    = grandRevenue - totalCost;
    const marginPct = grandRevenue > 0 ? Math.round((profit / grandRevenue) * 100) : 0;

    container.innerHTML = `
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-3 border-b border-outline-variant/40">
            <div>
                <span class="text-secondary text-[11px] font-bold uppercase block">Buyer & Reference</span>
                <p class="font-bold text-on-surface text-[15px]">${customerName}</p>
                <p class="text-secondary text-[12px]">PO #: ${val('co-customer-po') || 'Internal Release'}</p>
            </div>
            <div>
                <span class="text-secondary text-[11px] font-bold uppercase block">Delivery & Priority</span>
                <p class="font-bold text-on-surface">${val('co-delivery')} · <span class="text-primary font-extrabold uppercase">${coState.priority}</span></p>
                <p class="text-secondary text-[12px]">${coState.products.length} product line${coState.products.length > 1 ? 's' : ''} · ${WORKFLOW_PRESETS.find(w => w.key === wf)?.label || wf}</p>
            </div>
        </div>

        <div class="py-2 border-b border-outline-variant/40">
            <span class="text-secondary text-[11px] font-bold uppercase block mb-1">Product Lines</span>
            ${coState.products.map(p => {
                const qty = isDirect ? p.freeSizes.reduce((s, r) => s + (r.qty || 0), 0) : (p.qty || 0);
                return `
                <div class="flex justify-between items-center py-1 text-[13px]">
                    <span class="font-semibold text-on-surface">${p.name || 'Unnamed'}</span>
                    <div class="flex items-center gap-3">
                        <span class="text-secondary text-[11px]">${qty.toLocaleString()} pcs</span>
                        <strong class="text-primary">CP ₹${p.cp || 0} / SP ₹${p.unitPrice || 0}</strong>
                    </div>
                </div>`;
            }).join('')}
        </div>

        <div class="grid grid-cols-3 gap-2 py-3 text-center bg-surface-container/40 rounded-xl p-2.5">
            <div>
                <span class="text-secondary text-[10px] font-bold uppercase block">Total Revenue</span>
                <strong class="text-[16px] text-primary">₹${Math.round(grandRevenue).toLocaleString('en-IN')}</strong>
            </div>
            <div>
                <span class="text-secondary text-[10px] font-bold uppercase block">Total Cost</span>
                <strong class="text-[16px] text-secondary">₹${Math.round(totalCost).toLocaleString('en-IN')}</strong>
            </div>
            <div>
                <span class="text-secondary text-[10px] font-bold uppercase block">Gross Profit</span>
                <strong class="text-[16px] ${profit >= 0 ? 'text-[#008A00]' : 'text-error'}">₹${Math.round(profit).toLocaleString('en-IN')} (${marginPct}%)</strong>
            </div>
        </div>`;
}

// ─── Wizard Navigation ─────────────────────────────────────────────────────────
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

    // Show only active step
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
            pill.className = 'stepper-pill upcoming px-3 py-1.5 rounded-xl text-[12px] font-bold flex items-center gap-1.5 border border-transparent';
            if (numSpan) { numSpan.className = 'w-4 h-4 rounded-full bg-surface-variant text-secondary text-[10px] font-black flex items-center justify-center'; numSpan.textContent = `${i + 1}`; }
        }
    });

    // Nav buttons
    qs('co-btn-back')?.classList.toggle('hidden', idx === 0);
    const isLast = idx === total - 1;
    qs('co-btn-next')?.classList.toggle('hidden', isLast);
    qs('co-header-save-btn')?.classList.toggle('hidden', !isLast);

    // Step-specific renders
    if (idx === 1) {
        renderWorkflowPicker();
        renderProducts();
    }
    if (idx === 2) renderPricingTable();
    if (idx === 3) { buildWorkflowSummary(); buildExecutiveSummary(); }
}

// ─── Validation ────────────────────────────────────────────────────────────────
function validateCurrentStep() {
    const idx = coState.currentIdx;
    const wf  = coState.orderWorkflowType;
    const isDirect = workflowIsDirectFulfillment(wf);

    // Step 1
    if (idx === 0) {
        if (!val('co-customer')) { showToast('Please select a customer / buyer', 'error'); return false; }
        if (!val('co-delivery')) { showToast('Please select a target delivery deadline', 'error'); return false; }
    }

    // Step 2
    if (idx === 1) {
        if (!coState.orderWorkflowType) { showToast('Please select a production workflow type', 'error'); return false; }

        for (let i = 0; i < coState.products.length; i++) {
            const p = coState.products[i];
            if (!p.name.trim()) { showToast(`Please enter a name for Product #${i + 1}`, 'error'); return false; }

            if (isDirect) {
                const totalFS = p.freeSizes.reduce((s, r) => s + (r.qty || 0), 0);
                if (totalFS <= 0) { showToast(`Please enter size quantities for "${p.name || 'Product #' + (i+1)}"`, 'error'); return false; }
            } else {
                if (p.category === 'General') {
                    if (!p.qty || p.qty <= 0) {
                        showToast(`Please enter a valid quantity for Product #${i + 1} — "${p.name}"`, 'error');
                        return false;
                    }
                } else {
                    const sizeSum = Object.values(p.sizes).reduce((s, v) => s + (v || 0), 0);
                    if (sizeSum <= 0) {
                        showToast(`Please enter size breakdown for "${p.name || 'Product #' + (i+1)}"`, 'error');
                        return false;
                    }
                    if (sizeSum !== p.qty && p.qty > 0) {
                        showToast(`Size breakdown sum (${sizeSum}) for "${p.name}" must equal target qty (${p.qty} pcs)`, 'error');
                        return false;
                    }
                    // Sync qty from sizes if target was 0
                    if (p.qty === 0) p.qty = sizeSum;
                }
            }
        }

        // Sync total
        const totalQty = isDirect
            ? coState.products.reduce((s, p) => s + p.freeSizes.reduce((ss, r) => ss + (r.qty || 0), 0), 0)
            : coState.products.reduce((s, p) => s + (p.qty || 0), 0);
        if (totalQty <= 0) { showToast('Order total quantity must be greater than zero', 'error'); return false; }
    }

    // Step 3
    if (idx === 2) {
        for (let i = 0; i < coState.products.length; i++) {
            const p = coState.products[i];
            if (!p.unitPrice || Number(p.unitPrice) <= 0) {
                showToast(`Please enter a selling price (SP) for Product #${i + 1} — "${p.name}"`, 'error');
                return false;
            }
        }
    }

    return true;
}

// ─── Save Order ────────────────────────────────────────────────────────────────
window.coSaveOrder = async function(launchOption = 'orders_tower') {
    if (!validateCurrentStep()) return;

    const wf = coState.orderWorkflowType;
    const isDirect = workflowIsDirectFulfillment(wf);

    let grandRevenue = 0;
    let totalCost    = 0;
    let totalQty     = 0;

    const lineItems = coState.products.map(prod => {
        const prodWf       = prod.workflowType || wf || 'default';
        const isProdDirect = workflowIsDirectFulfillment(prodWf);
        const qty          = isProdDirect ? prod.freeSizes.reduce((s, r) => s + (r.qty || 0), 0) : (prod.qty || 0);
        const sp           = Number(prod.unitPrice) || 0;
        const cp           = Number(prod.cp) || 0;
        const stages       = getProductWorkflowStages(prod, wf);

        grandRevenue += qty * sp;
        totalCost    += qty * cp;
        totalQty     += qty;

        // Build sizes object from freeSizes for direct, or standard sizes
        const sizesMap = isProdDirect
            ? prod.freeSizes.reduce((acc, r) => { if (r.label) acc[r.label] = r.qty || 0; return acc; }, {})
            : { ...prod.sizes };

        return {
            productId:      prod.id,
            productName:    prod.name.trim(),
            workflowType:   prodWf,
            customStages:   Array.isArray(prod.customStages) ? prod.customStages : [],
            workflowStages: stages,
            stageData: {
                procurement: { status: 'Allotted' },
                ...(!isProdDirect && prod.fabric.type ? {
                    fabric: {
                        type:      prod.fabric.type,
                        subType:   prod.fabric.subtype,
                        gsm:       Number(prod.fabric.gsm) || 0,
                        dia:       Number(prod.fabric.dia)  || 0,
                        ...(workflowIsFullVertical(prodWf) ? {
                            yarnCount: prod.fabric.yarnCount || '',
                            yarnBlend: prod.fabric.yarnBlend || ''
                        } : {})
                    }
                } : {}),
                cutting: { totalQty: qty, sizes: sizesMap },
                print_wash: {
                    type:      prod.decorationType  || '',
                    placement: prod.decorationPlacement || '',
                    colors:    prod.decorationColors    || ''
                },
                stitching: { notes: 'Standard sewing line assembly' },
                packing:   { notes: val('co-order-notes') || 'Standard export polybag packaging.' },
                dispatch:  { dispatchDate: val('co-delivery') }
            }
        };
    });

    const flatStageData = mergeLineItemsToFlatStageData(lineItems);
    const stages        = WORKFLOW_ROUTES[wf] || WORKFLOW_ROUTES.default;
    const initialStage  = stages[0] || 'procurement';
    const initialDef    = STAGE_DEFINITIONS[initialStage] || { label: 'Procurement' };

    const productsData = coState.products.map(prod => {
        const prodWf       = prod.workflowType || wf || 'default';
        const isProdDirect = workflowIsDirectFulfillment(prodWf);
        const qty          = isProdDirect ? prod.freeSizes.reduce((s, r) => s + (r.qty || 0), 0) : (prod.qty || 0);
        const sizesMap     = isProdDirect
            ? prod.freeSizes.reduce((acc, r) => { if (r.label) acc[r.label] = r.qty || 0; return acc; }, {})
            : { ...prod.sizes };
        return {
            id:                  prod.id,
            name:                prod.name.trim(),
            category:            isProdDirect ? 'General' : prod.category,
            qty,
            cp:                  Number(prod.cp) || 0,
            unitPrice:           Number(prod.unitPrice) || 0,
            status:              initialDef.label,
            workflowType:        prodWf,
            customStages:        Array.isArray(prod.customStages) ? prod.customStages : [],
            sizes:               sizesMap,
            fabric:              { ...prod.fabric },
            decorationType:      prod.decorationType      || '',
            decorationPlacement: prod.decorationPlacement || '',
            decorationColors:    prod.decorationColors    || '',
            sourceSupplier:      prod.sourceSupplier      || '',
            sourceRef:           prod.sourceRef           || '',
            sourceColor:         prod.sourceColor         || '',
            sourceNotes:         prod.sourceNotes         || ''
        };
    });

    const advancePayment = num('co-advance-payment');
    const isFullyPaid    = advancePayment >= grandRevenue && grandRevenue > 0;
    const isPartial      = advancePayment > 0 && !isFullyPaid;
    const pmtStatus      = isFullyPaid ? 'Paid' : isPartial ? 'Partially Paid' : 'Unpaid';

    const orderData = {
        customerId:         val('co-customer'),
        customerName:       qs('co-customer')?.options[qs('co-customer').selectedIndex]?.text?.split(' (')[0] || '',
        customerPO:         val('co-customer-po') || '',
        product:            coState.products.map(p => p.name).filter(Boolean).join(', '),
        qty:                totalQty,
        value:              grandRevenue,
        incurredCost:       totalCost,
        deliveryDate:       val('co-delivery'),
        priority:           coState.priority,
        orderWorkflowType:  wf,
        workflowType:       wf,
        status:             initialDef.label,
        progressPercentage: 0,
        progressLabel:      `${initialDef.label} Phase`,
        paymentStatus:      pmtStatus,
        paymentReceived:    advancePayment,
        paymentTerms:       val('co-payment-terms'),
        notes:              val('co-order-notes'),
        fabric:             coState.products.map(p => p.fabric.type ? `${p.fabric.type}${p.fabric.gsm ? ' ' + p.fabric.gsm + 'gsm' : ''}` : '').filter(Boolean).join(' / '),
        stageData:          flatStageData,
        lineItems,
        products:           productsData,
        timeline: [{
            status: 'Order Released to Factory',
            date:   new Date().toISOString(),
            user:   'Merchandiser'
        }]
    };

    try {
        const saveBtn = qs('co-header-save-btn');
        if (saveBtn) { 
            saveBtn.disabled = true; 
            saveBtn.textContent = coState.editingOrderId ? 'Saving Changes...' : 'Saving...'; 
        }

        if (coState.editingOrderId) {
            // Edit Mode: Update existing order
            const existing = coState.editingOrder || {};
            const updatedOrderData = {
                ...existing,
                ...orderData,
                id: coState.editingOrderId,
                updatedAt: new Date().toISOString(),
                timeline: [
                    {
                        status: 'Order Details Updated via Wizard',
                        date:   new Date().toISOString(),
                        user:   'Merchandiser'
                    },
                    ...(Array.isArray(existing.timeline) ? existing.timeline : [])
                ]
            };

            // Preserve current progress and status if order has already started production
            if (existing.status && existing.status !== 'Draft') {
                updatedOrderData.status = existing.status;
                updatedOrderData.progressPercentage = existing.progressPercentage;
                updatedOrderData.progressLabel = existing.progressLabel;
            }

            await orderStore.updateOrder(coState.editingOrderId, updatedOrderData);
            showToast(`Order ${coState.editingOrderId} successfully updated!`, 'success');

            setTimeout(() => {
                if (launchOption === 'launch_floor') {
                    window.location.href = `production.html?orderId=${coState.editingOrderId}&stage=${initialStage}`;
                } else if (launchOption === 'print_traveler') {
                    window.location.href = `orders.html?orderId=${coState.editingOrderId}&print=traveler`;
                } else {
                    window.location.href = `orders.html?orderId=${coState.editingOrderId}`;
                }
            }, 700);
            return;
        }

        // Create Mode: Create new order
        const createdOrder = await orderStore.create(orderData);
        const orderId      = createdOrder?.id || orderData.id;

        showToast('Apparel order successfully booked!', 'success');

        setTimeout(() => {
            if (launchOption === 'launch_floor' && orderId) {
                window.location.href = `production.html?orderId=${orderId}&stage=${initialStage}`;
            } else if (launchOption === 'print_traveler' && orderId) {
                window.location.href = `orders.html?orderId=${orderId}&print=traveler`;
            } else {
                window.location.href = 'orders.html';
            }
        }, 800);
    } catch (err) {
        console.error('Failed to save order:', err);
        showToast(coState.editingOrderId ? 'Failed to update order. Please check required fields.' : 'Failed to save order. Please check required fields.', 'error');
        const saveBtn = qs('co-header-save-btn');
        if (saveBtn) { 
            saveBtn.disabled = false; 
            saveBtn.textContent = coState.editingOrderId ? 'Save Changes' : 'Save Order'; 
        }
    }
};

// ─── Toast Notifications ───────────────────────────────────────────────────────
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
