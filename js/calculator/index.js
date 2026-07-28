import { api } from '../services/api.js';
import { BottomSheet } from '../components/index.js';
import { TextInput, SelectInput, TextareaInput } from '../components/inputs.js';
import { bindFormValidation } from '../utils/formHandler.js';

// ══════════════════════════════════════════════════════
//  STATE
// ══════════════════════════════════════════════════════
let state = {
    currency: '₹',
    activeTab: 'pp',   // 'pp' | 'order'
    // Per-piece tab
    pp: {
        qty: 0,
        pcsPerKg: 0,
        fabricPriceKg: 0,
        fabricCostPc: 0,   // auto
        printing: 0,
        wages: 0,
        packaging: 0,
        allowances: 0,
        overheads: 0,
        cp: 0,
        sp: null,           // user-entered sp
        profitPct: null,    // user-entered profit %
    },
    // Order Costing tab
    oc: {
        qty: 0,
        fabric: 0,
        acc1: 0, acc2: 0, acc3: 0,
        pattern: 0,
        stitch: 0,
        sublimation: 0,
        overheads: 0,
        printing: 0,
        totalCost: 0,
        cp: 0,
        sp: null,
        profitPct: null,
    }
};

// ══════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════
const $ = (id) => document.getElementById(id);
const num = (id) => parseFloat($(id)?.value) || 0;

function fmt(val) {
    if (val === null || isNaN(val) || val === 0) return '—';
    const sym = state.currency;
    const n = Math.abs(val);
    let s;
    if (n >= 100000) s = (n / 100000).toFixed(2) + 'L';
    else if (n >= 1000) s = (n / 1000).toFixed(1) + 'k';
    else s = n.toFixed(2);
    return (val < 0 ? '−' : '') + sym + s;
}

function fmtFull(val) {
    if (val === null || isNaN(val)) return '—';
    return state.currency + val.toFixed(2);
}

function setEl(id, text) {
    const el = $(id);
    if (el) el.textContent = text;
}

function setProfitBar(barId, labelId, pct) {
    const bar = $(barId);
    const label = $(labelId);
    if (!bar || !label) return;
    const clamped = Math.min(Math.max(pct || 0, 0), 100);
    bar.style.width = clamped + '%';
    if (pct > 0) {
        bar.classList.remove('bg-error');
        bar.classList.add('bg-primary');
        label.textContent = pct.toFixed(1) + '%';
        label.className = 'font-bold profit-positive';
    } else if (pct < 0) {
        bar.classList.add('bg-error');
        bar.classList.remove('bg-primary');
        label.textContent = pct.toFixed(1) + '%';
        label.className = 'font-bold profit-negative';
    } else {
        label.textContent = '—';
        label.className = 'font-bold text-secondary';
    }
}

// ══════════════════════════════════════════════════════
//  CURRENCY
// ══════════════════════════════════════════════════════
window.setCurrency = function(sym) {
    state.currency = sym;
    // Toggle button styles
    $('currency-inr').classList.toggle('active', sym === '₹');
    $('currency-usd').classList.toggle('active', sym === '$');
    $('currency-inr').classList.toggle('text-secondary', sym !== '₹');
    $('currency-usd').classList.toggle('text-secondary', sym !== '$');
    // Update all currency symbols in DOM
    document.querySelectorAll('.curr-sym').forEach(el => el.textContent = sym);
    // Recalculate to refresh display
    calcPP();
    calcOrder();
};

// ══════════════════════════════════════════════════════
//  TAB SWITCHING
// ══════════════════════════════════════════════════════
window.switchTab = function(tab) {
    state.activeTab = tab;
    // Panels
    document.querySelectorAll('.calc-tab-panel').forEach(p => p.classList.remove('active'));
    $('tab-' + tab).classList.add('active');
    // Buttons
    document.querySelectorAll('.calc-tab-btn').forEach(b => {
        b.classList.remove('active');
        b.classList.add('text-secondary');
    });
    const activeBtn = $('tab-' + tab + '-btn');
    activeBtn.classList.add('active');
    activeBtn.classList.remove('text-secondary');

    // Update subtitle & order-level result row
    if (tab === 'pp') {
        $('calc-subtitle').textContent = 'Per-piece cost calculator';
        $('result-order-row').classList.add('hidden');
    } else {
        $('calc-subtitle').textContent = 'Order-level cost calculator';
        $('result-order-row').classList.remove('hidden');
        updateAutoSuggestions();
    }
};

// ══════════════════════════════════════════════════════
//  SECTION TOGGLES
// ══════════════════════════════════════════════════════
window.toggleSection = function(btn) {
    const body = btn.nextElementSibling;
    const icon = btn.querySelector('.expand-icon');
    if (!body) return;
    const isOpen = body.style.display !== 'none' && body.style.display !== '';
    body.style.display = isOpen ? 'none' : 'flex';
    body.style.flexDirection = 'column';
    if (icon) icon.style.transform = isOpen ? '' : 'rotate(180deg)';
};

// ══════════════════════════════════════════════════════
//  PER-PIECE CALCULATOR (Tab 1)
// ══════════════════════════════════════════════════════
window.calcPP = function() {
    const qty = num('pp-qty');
    const pcsPerKg = num('pp-pcs-per-kg');
    const fabricPriceKg = num('pp-fabric-price-kg');
    const printing = num('pp-printing');
    const wages = num('pp-wages');
    const packaging = num('pp-packaging');
    const allowances = num('pp-allowances');
    const overheads = num('pp-overheads');

    // Sync pcs-per-kg field
    if ($('pp-pcs-per-kg-2')) {
        $('pp-pcs-per-kg-2').value = pcsPerKg || '';
    }

    // Fabric cost per pc = price per kg / pcs per kg
    const fabricCostPc = (pcsPerKg > 0) ? (fabricPriceKg / pcsPerKg) : 0;
    if ($('pp-fabric-cost-pc')) {
        $('pp-fabric-cost-pc').value = fabricCostPc > 0 ? fabricCostPc.toFixed(2) : '';
    }

    // Total kg required
    const totalKg = (pcsPerKg > 0 && qty > 0) ? (qty / pcsPerKg) : 0;
    const kgInfo = $('pp-kg-info');
    const kgVal = $('pp-kg-val');
    if (kgInfo && kgVal) {
        if (totalKg > 0) {
            kgInfo.classList.remove('hidden');
            kgVal.textContent = totalKg.toFixed(2) + ' kg';
        } else {
            kgInfo.classList.add('hidden');
        }
    }

    // CP per piece
    const cp = fabricCostPc + printing + wages + packaging + allowances + overheads;
    state.pp.cp = cp;
    state.pp.fabricCostPc = fabricCostPc;

    // Update badges
    const fabricBadge = $('pp-fabric-badge');
    if (fabricBadge) {
        if (fabricCostPc > 0) {
            fabricBadge.textContent = fmtFull(fabricCostPc);
            fabricBadge.classList.remove('hidden');
        } else {
            fabricBadge.classList.add('hidden');
        }
    }
    const otherCosts = printing + wages + packaging + allowances + overheads;
    const otherBadge = $('pp-othercosts-badge');
    if (otherBadge) {
        if (otherCosts > 0) {
            otherBadge.textContent = fmtFull(otherCosts);
            otherBadge.classList.remove('hidden');
        } else {
            otherBadge.classList.add('hidden');
        }
    }

    // Recompute SP / profit depending on which field is driving
    recomputePPResults(cp);
    updateResultCard();
};

function recomputePPResults(cp) {
    const spInput = $('pp-sp');
    const pctInput = $('pp-profit-pct');
    if (!spInput || !pctInput) return;

    const userSP = parseFloat(spInput.value);
    const userPct = parseFloat(pctInput.value);

    if (!isNaN(userSP) && spInput.value !== '') {
        // SP is driving → compute profit %
        const pct = cp > 0 ? ((userSP - cp) / cp * 100) : 0;
        state.pp.sp = userSP;
        state.pp.profitPct = pct;
        if (isNaN(userPct) || pctInput.dataset.driving !== 'true') {
            pctInput.value = pct.toFixed(1);
        }
        setProfitBar('pp-profit-bar', 'pp-margin-label', pct);
    } else if (!isNaN(userPct) && pctInput.value !== '') {
        // Profit % is driving → compute SP
        const sp = cp > 0 ? cp + (cp * userPct / 100) : 0;
        state.pp.sp = sp;
        state.pp.profitPct = userPct;
        if (isNaN(userSP) || spInput.dataset.driving !== 'true') {
            spInput.value = sp > 0 ? sp.toFixed(2) : '';
        }
        setProfitBar('pp-profit-bar', 'pp-margin-label', userPct);
    } else {
        // Neither set — show default 33% if cp > 0
        if (cp > 0) {
            const defaultSP = cp + (cp * 33 / 100);
            state.pp.sp = defaultSP;
            state.pp.profitPct = 33;
            pctInput.placeholder = '33';
        } else {
            state.pp.sp = null;
            state.pp.profitPct = null;
        }
        setProfitBar('pp-profit-bar', 'pp-margin-label', state.pp.profitPct);
    }
}

window.onPPSpChange = function() {
    const spInput = $('pp-sp');
    const pctInput = $('pp-profit-pct');
    if (spInput && pctInput) {
        spInput.dataset.driving = 'true';
        pctInput.dataset.driving = 'false';
        pctInput.value = '';
    }
    calcPP();
};

window.onPPProfitPctChange = function() {
    const spInput = $('pp-sp');
    const pctInput = $('pp-profit-pct');
    if (spInput && pctInput) {
        pctInput.dataset.driving = 'true';
        spInput.dataset.driving = 'false';
        spInput.value = '';
    }
    calcPP();
};

// ══════════════════════════════════════════════════════
//  ORDER COSTING CALCULATOR (Tab 2)
// ══════════════════════════════════════════════════════
window.calcOrder = function() {
    const qty = num('oc-qty');
    const fabric = num('oc-fabric');
    const acc1 = num('oc-acc1');
    const acc2 = num('oc-acc2');
    const acc3 = num('oc-acc3');
    const pattern = num('oc-pattern');
    const stitch = num('oc-stitch');
    const sublimation = num('oc-sublimation');
    const overheads = num('oc-overheads');
    const printing = num('oc-printing');

    const totalCost = fabric + acc1 + acc2 + acc3 + pattern + stitch + sublimation + overheads + printing;
    const cp = qty > 0 ? totalCost / qty : 0;

    state.oc.qty = qty;
    state.oc.totalCost = totalCost;
    state.oc.cp = cp;

    updateAutoSuggestions();
    recomputeOCResults(cp, qty, totalCost);
    updateResultCard();
};

function updateAutoSuggestions() {
    const qty = num('oc-qty');
    // Stitching: ₹25 × qty
    const stitchDefault = Math.round(25 * qty);
    const stitchHint = $('oc-stitch-hint');
    const stitchBtn = $('oc-stitch-auto-btn');
    if (qty > 0 && stitchHint && stitchBtn) {
        stitchHint.classList.remove('hidden');
        stitchHint.textContent = `Suggested: ${state.currency}25 × ${qty} = ${state.currency}${stitchDefault.toLocaleString()}. Tap "Auto" to apply.`;
        stitchBtn.textContent = `Auto: ${state.currency}25 × qty`;
        stitchBtn.classList.remove('hidden');
    } else if (stitchHint) {
        stitchHint.classList.add('hidden');
        if (stitchBtn) stitchBtn.classList.add('hidden');
    }

    // Overheads: ₹2 × qty
    const ohDefault = Math.round(2 * qty);
    const ohHint = $('oc-oh-hint');
    const ohBtn = $('oc-oh-auto-btn');
    if (qty > 0 && ohHint && ohBtn) {
        ohHint.classList.remove('hidden');
        ohHint.textContent = `Suggested: ${state.currency}2 × ${qty} = ${state.currency}${ohDefault.toLocaleString()}. Tap "Auto" to apply.`;
        ohBtn.textContent = `Auto: ${state.currency}2 × qty`;
        ohBtn.classList.remove('hidden');
    } else if (ohHint) {
        ohHint.classList.add('hidden');
        if (ohBtn) ohBtn.classList.add('hidden');
    }
}

window.applyStitchDefault = function() {
    const qty = num('oc-qty');
    if (qty > 0) {
        $('oc-stitch').value = Math.round(25 * qty);
        calcOrder();
        if (window.showToast) window.showToast('Stitching set to ₹25 × qty', 'info');
    }
};

window.applyOverheadsDefault = function() {
    const qty = num('oc-qty');
    if (qty > 0) {
        $('oc-overheads').value = Math.round(2 * qty);
        calcOrder();
        if (window.showToast) window.showToast('Overheads set to ₹2 × qty', 'info');
    }
};

function recomputeOCResults(cp, qty, totalCost) {
    const spInput = $('oc-sp');
    const pctInput = $('oc-profit-pct');
    if (!spInput || !pctInput) return;

    const userSP = parseFloat(spInput.value);
    const userPct = parseFloat(pctInput.value);

    let sp = null;
    let profitPct = null;

    if (!isNaN(userSP) && spInput.value !== '') {
        sp = userSP;
        profitPct = cp > 0 ? ((userSP - cp) / cp * 100) : 0;
        if (isNaN(userPct) || pctInput.dataset.driving !== 'true') {
            pctInput.value = profitPct.toFixed(1);
        }
    } else if (!isNaN(userPct) && pctInput.value !== '') {
        profitPct = userPct;
        sp = cp > 0 ? cp + (cp * userPct / 100) : 0;
        if (isNaN(userSP) || spInput.dataset.driving !== 'true') {
            spInput.value = sp > 0 ? sp.toFixed(2) : '';
        }
    } else {
        if (cp > 0) {
            profitPct = 30;
            sp = cp + (cp * 30 / 100);
            pctInput.placeholder = '30';
        }
    }

    state.oc.sp = sp;
    state.oc.profitPct = profitPct;

    // Total sales & profit
    const totalSales = (sp && qty) ? sp * qty : 0;
    const profitDone = totalSales - totalCost;

    state.oc.totalSales = totalSales;
    state.oc.profitDone = profitDone;

    // Update detailed row
    setEl('result-total-cost', totalCost > 0 ? fmt(totalCost) : '—');
    setEl('result-total-sales', totalSales > 0 ? fmt(totalSales) : '—');
    const profitEl = $('result-profit-done');
    if (profitEl) {
        if (profitDone > 0) {
            profitEl.textContent = fmt(profitDone);
            profitEl.className = 'text-[15px] font-bold text-[#008A00]';
        } else if (profitDone < 0) {
            profitEl.textContent = '−' + fmt(Math.abs(profitDone));
            profitEl.className = 'text-[15px] font-bold text-error';
        } else {
            profitEl.textContent = '—';
            profitEl.className = 'text-[15px] font-bold text-secondary';
        }
    }

    setProfitBar('oc-profit-bar', 'oc-margin-label', profitPct);
}

window.onOCSPChange = function() {
    const spInput = $('oc-sp');
    const pctInput = $('oc-profit-pct');
    if (spInput && pctInput) {
        spInput.dataset.driving = 'true';
        pctInput.dataset.driving = 'false';
        pctInput.value = '';
    }
    calcOrder();
};

window.onOCProfitPctChange = function() {
    const spInput = $('oc-sp');
    const pctInput = $('oc-profit-pct');
    if (spInput && pctInput) {
        pctInput.dataset.driving = 'true';
        spInput.dataset.driving = 'false';
        spInput.value = '';
    }
    calcOrder();
};

// ══════════════════════════════════════════════════════
//  RESULT CARD
// ══════════════════════════════════════════════════════
function updateResultCard() {
    const isOrder = state.activeTab === 'order';
    const s = isOrder ? state.oc : state.pp;
    const cp = s.cp || 0;
    const sp = s.sp;
    const profitPct = s.profitPct;

    const cpEl = $('result-cp');
    const spEl = $('result-sp');
    const pctEl = $('result-profit-pct');

    if (cpEl) {
        cpEl.textContent = cp > 0 ? fmtFull(cp) : '—';
        if (cp > 0) cpEl.classList.add('result-chip');
    }
    if (spEl) {
        spEl.textContent = (sp && sp > 0) ? fmtFull(sp) : '—';
    }
    if (pctEl) {
        if (profitPct !== null && !isNaN(profitPct)) {
            pctEl.textContent = profitPct.toFixed(1) + '%';
            pctEl.className = 'text-[20px] font-bold transition-all duration-300 ' + (profitPct >= 0 ? 'profit-positive' : 'profit-negative');
        } else {
            pctEl.textContent = '—';
            pctEl.className = 'text-[20px] font-bold transition-all duration-300 text-secondary';
        }
    }
}

// ══════════════════════════════════════════════════════
//  RESET
// ══════════════════════════════════════════════════════
window.resetCalc = function() {
    document.querySelectorAll('#tab-pp input[type=number], #tab-order input[type=number]').forEach(el => {
        if (!el.readOnly && !el.disabled) el.value = '';
    });
    ['result-cp', 'result-sp', 'result-profit-pct', 'result-total-cost', 'result-total-sales', 'result-profit-done'].forEach(id => setEl(id, '—'));
    $('pp-profit-bar').style.width = '0%';
    $('oc-profit-bar').style.width = '0%';
    $('pp-fabric-cost-pc').value = '';
    $('pp-kg-info')?.classList.add('hidden');
    if (window.showToast) window.showToast('Calculator cleared', 'info');
};

// ══════════════════════════════════════════════════════
//  SHEETS (Save Draft / Generate Quote)
// ══════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
    const sheetsContainer = document.getElementById('sheets-container');

    const saveCostContent = `
        ${TextInput({ label: 'Style Name / Reference', id: 'save-style', placeholder: 'e.g. SS24-TS-01', required: true })}
        ${SelectInput({ label: 'Client / Brand', id: 'save-client', options: [{label: 'Select Client...'}, {label: 'Everlane Corp.', value: 'c-001'}, {label: 'Patagonia', value: 'c-002'}] })}
        ${SelectInput({ label: 'Save As', id: 'save-status', options: [{label: 'Draft', value: 'Draft'}, {label: 'Quote (send to client)', value: 'Quoted'}] })}
        ${TextareaInput({ label: 'Notes', id: 'save-notes', rows: 2 })}
        <div class="h-10"></div>
    `;
    const saveCostFooter = `
        <button id="save-cost-submit" class="w-full bg-primary text-on-primary font-bold text-[16px] py-4 rounded-2xl active-scale transition-apple shadow-sm disabled:opacity-50">
            Save Costing
        </button>
    `;

    sheetsContainer.innerHTML = [
        BottomSheet({ id: 'saveCostSheet', title: 'Save Costing', content: saveCostContent, footerContent: saveCostFooter, isForm: true })
    ].join('');

    bindFormValidation('saveCostSheet-content', 'save-cost-submit');

    document.getElementById('save-cost-submit')?.addEventListener('click', async () => {
        const styleRef = document.getElementById('save-style')?.value;
        const clientId = document.getElementById('save-client')?.value;
        const status = document.getElementById('save-status')?.value;
        const s = state.activeTab === 'order' ? state.oc : state.pp;

        await api.saveCosting({
            styleRef,
            clientId,
            totalUnitCost: s.cp || 0,
            retailPrice: s.sp || 0,
            status,
            currency: state.currency,
            mode: state.activeTab
        });

        window.closeSheet('saveCostSheet');
        window.showToast(`Costing saved as ${status}`, 'success');
    });

    // Open sections by default
    document.querySelectorAll('.section-body').forEach(body => {
        body.style.display = 'flex';
        body.style.flexDirection = 'column';
    });
    document.querySelectorAll('.expand-icon').forEach(icon => {
        icon.style.transform = 'rotate(180deg)';
    });
});
