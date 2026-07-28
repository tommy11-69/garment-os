import { api } from '../services/api.js';
import { BottomSheet } from '../components/index.js';
import { TextInput, SelectInput, TextareaInput } from '../components/inputs.js';
import { bindFormValidation } from '../utils/formHandler.js';

// ══════════════════════════════════════════════════════
//  STATE
// ══════════════════════════════════════════════════════
let state = {
    currency: '₹',
    activeTab: 'pp',
    pp: {
        qty: 0, pcsPerKg: 0, fabricPriceKg: 0, wastage: 0,
        fabricCostPc: 0,
        printing: 0, wages: 0, packaging: 0, allowances: 0, overheads: 0,
        cp: 0, sp: null, profitPct: null,
        lastEdited: null,   // 'sp' | 'pct' | null
        garmentType: 'T-Shirt',
    },
    oc: {
        qty: 0, fabric: 0,
        acc1: 0, acc2: 0, acc3: 0, pattern: 0,
        stitch: 0, sublimation: 0, overheads: 0, printing: 0,
        totalCost: 0, cp: 0,
        sp: null, profitPct: null, totalSales: 0, profitDone: 0,
        lastEdited: null,
        garmentType: 'T-Shirt',
    },
    prefs: {
        stitchRate: 25,
        overheadsRate: 2,
    },
};

// ══════════════════════════════════════════════════════
//  PREFERENCES  (persisted to localStorage)
// ══════════════════════════════════════════════════════
function loadPrefs() {
    try {
        const saved = localStorage.getItem('garment_os_calc_prefs');
        if (saved) state.prefs = { ...state.prefs, ...JSON.parse(saved) };
    } catch (_) {}
}
function savePrefs() {
    try {
        localStorage.setItem('garment_os_calc_prefs', JSON.stringify(state.prefs));
    } catch (_) {}
}

// ══════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════
const $ = (id) => document.getElementById(id);
const num = (id) => parseFloat($(id)?.value) || 0;

// Breakdown colours (one per cost category)
const C = {
    fabric:      '#0071E3',
    printing:    '#FF9F0A',
    wages:       '#AF52DE',
    packaging:   '#34C759',
    allowances:  '#FFD60A',
    overheads:   '#8E8E93',
    accessories: '#FF3B30',
    pattern:     '#5856D6',
    sublimation: '#32ADE6',
};

function fmt(val) {
    if (val === null || isNaN(val) || val === 0) return '—';
    const sym = state.currency;
    const n = Math.abs(val);
    let s;
    if (n >= 100000)     s = (n / 100000).toFixed(2) + 'L';
    else if (n >= 1000)  s = (n / 1000).toFixed(1) + 'k';
    else                 s = n.toFixed(2);
    return (val < 0 ? '−' : '') + sym + s;
}

function fmtFull(val) {
    if (val === null || isNaN(val) || val === 0) return '—';
    return state.currency + Math.abs(val).toFixed(2);
}

function setEl(id, text) {
    const el = $(id);
    if (el) el.textContent = text;
}

function setProfitBar(barId, labelId, pct) {
    const bar   = $(barId);
    const label = $(labelId);
    if (!bar || !label) return;
    const clamped = Math.min(Math.max(pct || 0, 0), 100);
    bar.style.width = clamped + '%';
    if (pct > 0) {
        bar.className = 'profit-bar-fill h-full rounded-full bg-primary';
        label.textContent = pct.toFixed(1) + '%';
        label.className = 'font-bold profit-positive';
    } else if (pct < 0) {
        bar.className = 'profit-bar-fill h-full rounded-full bg-error';
        label.textContent = pct.toFixed(1) + '%';
        label.className = 'font-bold profit-negative';
    } else {
        label.textContent = '—';
        label.className = 'font-bold text-secondary';
    }
}

// Set a readonly input value reliably across browsers
function setReadonly(id, val) {
    const el = $(id);
    if (!el) return;
    el.removeAttribute('readonly');
    el.value = val;
    el.setAttribute('readonly', '');
}

// ══════════════════════════════════════════════════════
//  COST BREAKDOWN VISUAL
// ══════════════════════════════════════════════════════
function renderBreakdown(barId, legendId, containerId, totalLabelId, items) {
    const container = $(containerId);
    const bar       = $(barId);
    const legend    = $(legendId);
    if (!container || !bar || !legend) return;

    const total = items.reduce((s, i) => s + (i.value || 0), 0);
    if (total <= 0) {
        container.classList.add('hidden');
        container.classList.remove('flex');
        return;
    }

    container.classList.remove('hidden');
    container.classList.add('flex');

    if (totalLabelId) setEl(totalLabelId, 'Total ' + fmtFull(total));

    const filtered = items.filter(i => i.value > 0);

    // Stacked bar
    bar.innerHTML = filtered.map((i, idx) => {
        const pct = (i.value / total * 100).toFixed(2);
        const isFirst = idx === 0;
        const isLast  = idx === filtered.length - 1;
        const radius  = isFirst && isLast
            ? 'border-radius:9999px;'
            : isFirst ? 'border-radius:9999px 0 0 9999px;'
            : isLast  ? 'border-radius:0 9999px 9999px 0;'
            : '';
        return `<div style="width:${pct}%;background:${i.color};${radius}height:100%;transition:width .5s cubic-bezier(.34,1.2,.64,1);" title="${i.label}: ${fmtFull(i.value)} (${parseFloat(pct).toFixed(1)}%)"></div>`;
    }).join('');

    // Legend rows
    legend.innerHTML = filtered.map(i => {
        const pct = (i.value / total * 100).toFixed(1);
        return `
        <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5">
                <div class="w-2.5 h-2.5 rounded-sm flex-shrink-0" style="background:${i.color};"></div>
                <span class="text-[13px] font-medium text-on-surface">${i.label}</span>
            </div>
            <div class="flex items-center gap-3">
                <span class="text-[12px] text-secondary tabular-nums">${pct}%</span>
                <span class="text-[13px] font-bold text-on-surface tabular-nums">${fmtFull(i.value)}</span>
            </div>
        </div>`;
    }).join('');
}

// ══════════════════════════════════════════════════════
//  GARMENT TYPE CHIPS
// ══════════════════════════════════════════════════════
window.selectGarmentType = function(btn, tab) {
    const container = tab === 'pp' ? $('pp-garment-chips') : $('oc-garment-chips');
    if (!container) return;
    container.querySelectorAll('.garment-chip').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state[tab].garmentType = btn.dataset.type;
};

// ══════════════════════════════════════════════════════
//  CURRENCY
// ══════════════════════════════════════════════════════
window.setCurrency = function(sym) {
    state.currency = sym;
    $('currency-inr').classList.toggle('active', sym === '₹');
    $('currency-usd').classList.toggle('active', sym === '$');
    $('currency-inr').classList.toggle('text-secondary', sym !== '₹');
    $('currency-usd').classList.toggle('text-secondary', sym !== '$');
    document.querySelectorAll('.curr-sym').forEach(el => el.textContent = sym);
    calcPP();
    calcOrder();
};

// ══════════════════════════════════════════════════════
//  TAB SWITCHING
// ══════════════════════════════════════════════════════
window.switchTab = function(tab) {
    state.activeTab = tab;
    document.querySelectorAll('.calc-tab-panel').forEach(p => p.classList.remove('active'));
    $('tab-' + tab)?.classList.add('active');
    document.querySelectorAll('.calc-tab-btn').forEach(b => {
        b.classList.remove('active');
        b.classList.add('text-secondary');
    });
    const btn = $('tab-' + tab + '-btn');
    btn?.classList.add('active');
    btn?.classList.remove('text-secondary');

    $('calc-subtitle').textContent = tab === 'pp'
        ? 'Per-piece cost calculator'
        : 'Order-level cost calculator';

    updateResultCard();
    if (tab === 'order') updateAutoSuggestions();
};

// ══════════════════════════════════════════════════════
//  SECTION TOGGLES  (class-based, bug-free)
// ══════════════════════════════════════════════════════
window.toggleSection = function(btn) {
    const body = btn.nextElementSibling;
    const icon = btn.querySelector('.expand-icon');
    if (!body) return;

    const isOpen = !body.classList.contains('hidden');
    if (isOpen) {
        body.classList.add('hidden');
        body.style.display = '';
        if (icon) icon.style.transform = '';
    } else {
        body.classList.remove('hidden');
        body.style.display = 'flex';
        body.style.flexDirection = 'column';
        if (icon) icon.style.transform = 'rotate(180deg)';
    }
};

// ══════════════════════════════════════════════════════
//  PER-PIECE CALCULATOR
// ══════════════════════════════════════════════════════
window.calcPP = function() {
    const qty            = num('pp-qty');
    const pcsPerKg       = num('pp-pcs-per-kg');
    const fabricPriceKg  = num('pp-fabric-price-kg');
    const wastage        = num('pp-wastage');   // %
    const printing       = num('pp-printing');
    const wages          = num('pp-wages');
    const packaging      = num('pp-packaging');
    const allowances     = num('pp-allowances');
    const overheads      = num('pp-overheads');

    // Fabric cost per pc with wastage buffer
    const baseFabric   = pcsPerKg > 0 ? fabricPriceKg / pcsPerKg : 0;
    const fabricCostPc = baseFabric * (1 + wastage / 100);
    setReadonly('pp-fabric-cost-pc', fabricCostPc > 0 ? fabricCostPc.toFixed(2) : '');

    // Total fabric required
    const totalKg = pcsPerKg > 0 && qty > 0 ? qty / pcsPerKg : 0;
    const kgInfo = $('pp-kg-info');
    if (kgInfo) {
        if (totalKg > 0) {
            kgInfo.classList.remove('hidden');
            setEl('pp-kg-val', totalKg.toFixed(2) + ' kg');
        } else {
            kgInfo.classList.add('hidden');
        }
    }

    // CP per piece
    const cp = fabricCostPc + printing + wages + packaging + allowances + overheads;

    // Persist to state
    Object.assign(state.pp, { qty, pcsPerKg, fabricPriceKg, wastage, fabricCostPc, printing, wages, packaging, allowances, overheads, cp });

    // Section header badges
    const fabricBadge = $('pp-fabric-badge');
    if (fabricBadge) {
        if (fabricCostPc > 0) { fabricBadge.textContent = fmtFull(fabricCostPc); fabricBadge.classList.remove('hidden'); }
        else fabricBadge.classList.add('hidden');
    }
    const other      = printing + wages + packaging + allowances + overheads;
    const otherBadge = $('pp-othercosts-badge');
    if (otherBadge) {
        if (other > 0) { otherBadge.textContent = fmtFull(other); otherBadge.classList.remove('hidden'); }
        else otherBadge.classList.add('hidden');
    }

    // Cost breakdown visual
    renderBreakdown('pp-breakdown-bar', 'pp-breakdown-legend', 'pp-breakdown', 'pp-breakdown-total', [
        { label: 'Fabric',     value: fabricCostPc, color: C.fabric },
        { label: 'Printing',   value: printing,     color: C.printing },
        { label: 'Wages',      value: wages,        color: C.wages },
        { label: 'Packaging',  value: packaging,    color: C.packaging },
        { label: 'Allowances', value: allowances,   color: C.allowances },
        { label: 'Overheads',  value: overheads,    color: C.overheads },
    ]);

    recomputePPResults(cp);
    updatePPSummaryRow();
    updateResultCard();
};

// Bidirectional SP ↔ Profit % (uses lastEdited instead of dataset.driving)
function recomputePPResults(cp) {
    const spInput  = $('pp-sp');
    const pctInput = $('pp-profit-pct');
    if (!spInput || !pctInput) return;

    const userSP  = parseFloat(spInput.value);
    const userPct = parseFloat(pctInput.value);
    const last    = state.pp.lastEdited;

    if (last === 'sp' && !isNaN(userSP) && spInput.value !== '') {
        const pct = cp > 0 ? (userSP - cp) / cp * 100 : 0;
        state.pp.sp = userSP;
        state.pp.profitPct = pct;
        pctInput.value = pct.toFixed(1);
        setProfitBar('pp-profit-bar', 'pp-margin-label', pct);
    } else if (last === 'pct' && !isNaN(userPct) && pctInput.value !== '') {
        const sp = cp > 0 ? cp * (1 + userPct / 100) : 0;
        state.pp.sp = sp;
        state.pp.profitPct = userPct;
        spInput.value = sp > 0 ? sp.toFixed(2) : '';
        setProfitBar('pp-profit-bar', 'pp-margin-label', userPct);
    } else {
        // Default suggestion (not locked in)
        if (cp > 0) {
            state.pp.sp = cp * 1.33;
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
    state.pp.lastEdited = 'sp';
    // Clear the other field so it can be recalculated
    const pctInput = $('pp-profit-pct');
    if (pctInput) pctInput.value = '';
    calcPP();
};

window.onPPProfitPctChange = function() {
    state.pp.lastEdited = 'pct';
    const spInput = $('pp-sp');
    if (spInput) spInput.value = '';
    calcPP();
};

// Show totals row in result card when qty is filled (Per Piece tab)
function updatePPSummaryRow() {
    if (state.activeTab !== 'pp') return;
    const s   = state.pp;
    const row = $('result-summary-row');
    if (!row) return;

    if (s.qty > 0 && s.cp > 0) {
        row.classList.remove('hidden');
        setEl('result-col1-label', 'Fabric Total');
        setEl('result-total-cost', fmt(s.fabricCostPc * s.qty));

        const revenue = (s.sp || 0) * s.qty;
        setEl('result-total-sales', revenue > 0 ? fmt(revenue) : '—');

        const profit    = revenue - s.cp * s.qty;
        const profitEl  = $('result-profit-done');
        if (profitEl) {
            if (revenue > 0) {
                profitEl.textContent = profit >= 0 ? fmt(profit) : '−' + fmt(Math.abs(profit));
                profitEl.className = 'text-[13px] font-bold ' + (profit >= 0 ? 'text-[#008A00]' : 'text-error');
            } else {
                profitEl.textContent = '—';
                profitEl.className = 'text-[13px] font-bold text-secondary';
            }
        }
    } else {
        row.classList.add('hidden');
    }
}

// ══════════════════════════════════════════════════════
//  ORDER COSTING CALCULATOR
// ══════════════════════════════════════════════════════
window.calcOrder = function() {
    const qty         = num('oc-qty');
    const fabric      = num('oc-fabric');
    const acc1        = num('oc-acc1');
    const acc2        = num('oc-acc2');
    const acc3        = num('oc-acc3');
    const pattern     = num('oc-pattern');
    const stitch      = num('oc-stitch');
    const sublimation = num('oc-sublimation');
    const overheads   = num('oc-overheads');
    const printing    = num('oc-printing');

    const totalCost = fabric + acc1 + acc2 + acc3 + pattern + stitch + sublimation + overheads + printing;
    const cp        = qty > 0 ? totalCost / qty : 0;

    Object.assign(state.oc, { qty, fabric, acc1, acc2, acc3, pattern, stitch, sublimation, overheads, printing, totalCost, cp });

    // Cost breakdown visual
    renderBreakdown('oc-breakdown-bar', 'oc-breakdown-legend', 'oc-breakdown', 'oc-breakdown-total', [
        { label: 'Fabric',      value: fabric,              color: C.fabric },
        { label: 'Accessories', value: acc1 + acc2 + acc3,  color: C.accessories },
        { label: 'Pattern',     value: pattern,             color: C.pattern },
        { label: 'Stitching',   value: stitch,              color: C.wages },
        { label: 'Sublimation', value: sublimation,         color: C.sublimation },
        { label: 'Overheads',   value: overheads,           color: C.overheads },
        { label: 'Printing',    value: printing,            color: C.printing },
    ]);

    updateAutoSuggestions();
    recomputeOCResults(cp, qty, totalCost);
    updateResultCard();
};

function updateAutoSuggestions() {
    const qty  = num('oc-qty');
    const sr   = state.prefs.stitchRate;
    const or   = state.prefs.overheadsRate;
    const sym  = state.currency;

    const stitchHint = $('oc-stitch-hint');
    const stitchBtn  = $('oc-stitch-auto-btn');
    const ohHint     = $('oc-oh-hint');
    const ohBtn      = $('oc-oh-auto-btn');

    if (qty > 0) {
        const sd = Math.round(sr * qty);
        const od = Math.round(or * qty);
        if (stitchHint) { stitchHint.classList.remove('hidden'); stitchHint.textContent = `Suggested: ${sym}${sr} × ${qty.toLocaleString()} = ${sym}${sd.toLocaleString()}`; }
        if (stitchBtn)  { stitchBtn.classList.remove('hidden');  stitchBtn.textContent  = `Auto (${sym}${sr}/pc)`; }
        if (ohHint)     { ohHint.classList.remove('hidden');     ohHint.textContent     = `Suggested: ${sym}${or} × ${qty.toLocaleString()} = ${sym}${od.toLocaleString()}`; }
        if (ohBtn)      { ohBtn.classList.remove('hidden');      ohBtn.textContent      = `Auto (${sym}${or}/pc)`; }
    } else {
        [stitchHint, stitchBtn, ohHint, ohBtn].forEach(el => el?.classList.add('hidden'));
    }
}

window.applyStitchDefault = function() {
    const qty = num('oc-qty');
    if (qty > 0) {
        $('oc-stitch').value = Math.round(state.prefs.stitchRate * qty);
        calcOrder();
        window.showToast?.(`Stitching auto-filled at ${state.currency}${state.prefs.stitchRate}/pc`, 'info');
    }
};

window.applyOverheadsDefault = function() {
    const qty = num('oc-qty');
    if (qty > 0) {
        $('oc-overheads').value = Math.round(state.prefs.overheadsRate * qty);
        calcOrder();
        window.showToast?.(`Overheads auto-filled at ${state.currency}${state.prefs.overheadsRate}/pc`, 'info');
    }
};

function recomputeOCResults(cp, qty, totalCost) {
    const spInput  = $('oc-sp');
    const pctInput = $('oc-profit-pct');
    if (!spInput || !pctInput) return;

    const userSP  = parseFloat(spInput.value);
    const userPct = parseFloat(pctInput.value);
    const last    = state.oc.lastEdited;

    let sp = null, profitPct = null;

    if (last === 'sp' && !isNaN(userSP) && spInput.value !== '') {
        sp = userSP;
        profitPct = cp > 0 ? (userSP - cp) / cp * 100 : 0;
        pctInput.value = profitPct.toFixed(1);
    } else if (last === 'pct' && !isNaN(userPct) && pctInput.value !== '') {
        profitPct = userPct;
        sp = cp > 0 ? cp * (1 + userPct / 100) : 0;
        spInput.value = sp > 0 ? sp.toFixed(2) : '';
    } else {
        if (cp > 0) { profitPct = 30; sp = cp * 1.30; pctInput.placeholder = '30'; }
    }

    state.oc.sp = sp;
    state.oc.profitPct = profitPct;

    const totalSales = sp && qty ? sp * qty : 0;
    const profitDone = totalSales - totalCost;
    state.oc.totalSales = totalSales;
    state.oc.profitDone = profitDone;

    // Update summary row (always visible for order tab)
    if (state.activeTab === 'order') {
        const row = $('result-summary-row');
        if (row) row.classList.toggle('hidden', totalCost === 0);
        setEl('result-col1-label', 'Total Cost');
        setEl('result-total-cost',  totalCost  > 0 ? fmt(totalCost)  : '—');
        setEl('result-total-sales', totalSales > 0 ? fmt(totalSales) : '—');
        const profitEl = $('result-profit-done');
        if (profitEl) {
            if (totalSales > 0) {
                profitEl.textContent = profitDone >= 0 ? fmt(profitDone) : '−' + fmt(Math.abs(profitDone));
                profitEl.className = 'text-[13px] font-bold ' + (profitDone >= 0 ? 'text-[#008A00]' : 'text-error');
            } else {
                profitEl.textContent = '—';
                profitEl.className = 'text-[13px] font-bold text-secondary';
            }
        }
    }

    setProfitBar('oc-profit-bar', 'oc-margin-label', profitPct);
}

window.onOCSPChange = function() {
    state.oc.lastEdited = 'sp';
    const pctInput = $('oc-profit-pct');
    if (pctInput) pctInput.value = '';
    calcOrder();
};

window.onOCProfitPctChange = function() {
    state.oc.lastEdited = 'pct';
    const spInput = $('oc-sp');
    if (spInput) spInput.value = '';
    calcOrder();
};

// ══════════════════════════════════════════════════════
//  RESULT CARD  (floating)
// ══════════════════════════════════════════════════════
function updateResultCard() {
    const s         = state.activeTab === 'order' ? state.oc : state.pp;
    const cp        = s.cp || 0;
    const sp        = s.sp;
    const profitPct = s.profitPct;

    const cpEl = $('result-cp');
    if (cpEl) {
        const newVal = cp > 0 ? fmtFull(cp) : '—';
        if (cpEl.textContent !== newVal) {
            cpEl.textContent = newVal;
            cpEl.classList.remove('result-chip');
            void cpEl.offsetWidth;
            cpEl.classList.add('result-chip');
        }
    }

    const spEl = $('result-sp');
    if (spEl) spEl.textContent = sp && sp > 0 ? fmtFull(sp) : '—';

    const pctEl = $('result-profit-pct');
    if (pctEl) {
        if (profitPct !== null && !isNaN(profitPct)) {
            pctEl.textContent = profitPct.toFixed(1) + '%';
            pctEl.className = 'text-[19px] font-bold transition-all duration-300 ' + (profitPct >= 0 ? 'profit-positive' : 'profit-negative');
        } else {
            pctEl.textContent = '—';
            pctEl.className = 'text-[19px] font-bold transition-all duration-300 text-secondary';
        }
    }
}

// ══════════════════════════════════════════════════════
//  RESET  (properly clears readonly fields too)
// ══════════════════════════════════════════════════════
window.resetCalc = function() {
    // Clear all inputs including readonly ones
    document.querySelectorAll('#tab-pp input, #tab-order input').forEach(el => {
        if (!el.disabled) {
            const ro = el.hasAttribute('readonly');
            if (ro) el.removeAttribute('readonly');
            el.value = '';
            if (ro) el.setAttribute('readonly', '');
        }
    });

    // Reset state (preserve garmentType and prefs)
    state.pp = { ...state.pp, qty:0, pcsPerKg:0, fabricPriceKg:0, wastage:0, fabricCostPc:0, printing:0, wages:0, packaging:0, allowances:0, overheads:0, cp:0, sp:null, profitPct:null, lastEdited:null };
    state.oc = { ...state.oc, qty:0, fabric:0, acc1:0, acc2:0, acc3:0, pattern:0, stitch:0, sublimation:0, overheads:0, printing:0, totalCost:0, cp:0, sp:null, profitPct:null, lastEdited:null };

    // Reset UI indicators
    ['result-cp','result-sp','result-profit-pct','result-total-cost','result-total-sales','result-profit-done'].forEach(id => setEl(id, '—'));
    $('pp-profit-bar').style.width = '0%';
    $('oc-profit-bar').style.width = '0%';
    setEl('pp-margin-label', '—'); $('pp-margin-label').className = 'font-bold text-secondary';
    setEl('oc-margin-label', '—'); $('oc-margin-label').className = 'font-bold text-secondary';
    $('pp-kg-info')?.classList.add('hidden');
    $('result-summary-row')?.classList.add('hidden');
    $('pp-breakdown')?.classList.add('hidden');
    $('oc-breakdown')?.classList.add('hidden');
    $('pp-fabric-badge')?.classList.add('hidden');
    $('pp-othercosts-badge')?.classList.add('hidden');

    window.showToast?.('Calculator cleared', 'info');
};

// ══════════════════════════════════════════════════════
//  SAVE DRAFT  (pre-fills style name from client field)
// ══════════════════════════════════════════════════════
window.openSaveDraft = function() {
    const client = state.activeTab === 'order' ? $('oc-client')?.value : $('pp-client')?.value;
    const styleInput = $('save-style');
    if (styleInput && client && !styleInput.value) styleInput.value = client;
    window.openSheet('saveCostSheet');
};

// ══════════════════════════════════════════════════════
//  QUOTE PREVIEW
// ══════════════════════════════════════════════════════
window.openQuotePreview = function() {
    const isOrder = state.activeTab === 'order';
    const s       = isOrder ? state.oc : state.pp;
    const client  = (isOrder ? $('oc-client')?.value : $('pp-client')?.value) || '—';

    if (s.cp <= 0) {
        window.showToast?.('Fill in costs first', 'error');
        return;
    }

    const modeLabel   = isOrder ? 'Order Costing' : 'Per Piece';
    const totalRev    = s.sp && s.qty ? s.sp * s.qty : null;
    const totalProfit = totalRev ? totalRev - (isOrder ? s.totalCost : s.cp * s.qty) : null;

    const body = $('quote-preview-body');
    if (!body) return;

    body.innerHTML = `
        <div class="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-2xl p-5 mb-4">
            <div class="flex justify-between items-start mb-5">
                <div>
                    <p class="text-[11px] font-semibold text-secondary uppercase tracking-wider mb-1">${modeLabel}</p>
                    <h2 class="text-[20px] font-bold text-on-surface leading-tight">${client !== '—' ? client : s.garmentType}</h2>
                    <p class="text-[13px] text-secondary mt-0.5">${s.qty > 0 ? s.qty.toLocaleString() + ' pcs · ' : ''}${s.garmentType}</p>
                </div>
                <div class="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                    <span class="material-symbols-outlined text-primary text-[24px]">receipt_long</span>
                </div>
            </div>
            <div class="grid grid-cols-3 gap-2">
                <div class="bg-white/60 rounded-xl p-3 text-center">
                    <p class="text-[10px] font-semibold text-secondary uppercase tracking-wider mb-1">CP / pc</p>
                    <p class="text-[15px] font-bold text-on-surface">${fmtFull(s.cp)}</p>
                </div>
                <div class="bg-primary/15 rounded-xl p-3 text-center">
                    <p class="text-[10px] font-semibold text-secondary uppercase tracking-wider mb-1">SP / pc</p>
                    <p class="text-[15px] font-bold text-primary">${s.sp ? fmtFull(s.sp) : '—'}</p>
                </div>
                <div class="bg-white/60 rounded-xl p-3 text-center">
                    <p class="text-[10px] font-semibold text-secondary uppercase tracking-wider mb-1">Profit</p>
                    <p class="text-[15px] font-bold ${(s.profitPct || 0) >= 0 ? 'profit-positive' : 'profit-negative'}">${s.profitPct !== null ? s.profitPct.toFixed(1) + '%' : '—'}</p>
                </div>
            </div>
        </div>

        ${totalRev || totalProfit ? `
        <div class="grid grid-cols-2 gap-3 mb-4">
            <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-3.5">
                <p class="text-[11px] font-semibold text-secondary uppercase mb-1">Total Revenue</p>
                <p class="text-[16px] font-bold text-on-surface">${totalRev ? fmt(totalRev) : '—'}</p>
            </div>
            <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-3.5">
                <p class="text-[11px] font-semibold text-secondary uppercase mb-1">Total Profit</p>
                <p class="text-[16px] font-bold ${(totalProfit || 0) >= 0 ? 'profit-positive' : 'profit-negative'}">${totalProfit !== null ? fmt(Math.abs(totalProfit)) : '—'}</p>
            </div>
        </div>` : ''}

        <p class="text-[11px] text-secondary text-center">
            Generated by Garment OS · ${new Date().toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
        </p>
        <div class="h-6"></div>
    `;

    window.openSheet('quotePreviewSheet');
};

window.copyQuoteToClipboard = function() {
    const s      = state.activeTab === 'order' ? state.oc : state.pp;
    const client = (state.activeTab === 'order' ? $('oc-client')?.value : $('pp-client')?.value) || '—';

    const lines = [
        '📋 Garment OS Quote',
        `Client: ${client}`,
        `Garment: ${s.garmentType}`,
        s.qty > 0 ? `Qty: ${s.qty.toLocaleString()} pcs` : '',
        `CP/pc: ${fmtFull(s.cp)}`,
        `SP/pc: ${s.sp ? fmtFull(s.sp) : 'Not set'}`,
        `Profit: ${s.profitPct !== null ? s.profitPct.toFixed(1) + '%' : 'Not set'}`,
    ].filter(Boolean).join('\n');

    navigator.clipboard.writeText(lines)
        .then(() => window.showToast?.('Quote copied!', 'success'))
        .catch(() => window.showToast?.('Could not copy — select manually', 'error'));
};

// ══════════════════════════════════════════════════════
//  RATES EDITOR  (editable stitching & overhead rates)
// ══════════════════════════════════════════════════════
window.openRatesEditor = function() {
    const sr = state.prefs.stitchRate;
    const or = state.prefs.overheadsRate;

    // Inject current rates into the sheet inputs
    const stitchInput = $('rates-stitch');
    const ohInput     = $('rates-oh');
    if (stitchInput) stitchInput.value = sr;
    if (ohInput)     ohInput.value     = or;

    window.openSheet('ratesEditorSheet');
};

window.saveRates = function() {
    const sr = parseFloat($('rates-stitch')?.value);
    const or = parseFloat($('rates-oh')?.value);
    if (!isNaN(sr) && sr > 0) state.prefs.stitchRate = sr;
    if (!isNaN(or) && or > 0) state.prefs.overheadsRate = or;
    savePrefs();
    updateAutoSuggestions();
    window.closeSheet('ratesEditorSheet');
    window.showToast?.('Default rates updated', 'success');
};

// ══════════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
    loadPrefs();

    const sheetsContainer = $('sheets-container');
    if (!sheetsContainer) return;

    // ── Save Draft sheet ──
    const saveCostContent = `
        ${TextInput({ label:'Style Name / Reference', id:'save-style', placeholder:'e.g. SS24-TS-01', required:true })}
        ${SelectInput({ label:'Client / Brand', id:'save-client', options:[{label:'Select Client...'},{label:'Everlane Corp.',value:'c-001'},{label:'Patagonia',value:'c-002'}] })}
        ${SelectInput({ label:'Save As', id:'save-status', options:[{label:'Draft',value:'Draft'},{label:'Quote (send to client)',value:'Quoted'}] })}
        ${TextareaInput({ label:'Notes', id:'save-notes', rows:2 })}
        <div class="h-10"></div>
    `;
    const saveCostFooter = `
        <button id="save-cost-submit" class="w-full bg-primary text-on-primary font-bold text-[16px] py-4 rounded-2xl active-scale transition-apple shadow-sm">
            Save Costing
        </button>
    `;

    // ── Quote Preview sheet ──
    const quoteContent = `<div id="quote-preview-body" class="min-h-[180px]"><div class="p-8 text-center text-secondary text-[14px]">Fill in costs to preview</div></div>`;
    const quoteFooter  = `
        <button onclick="copyQuoteToClipboard()" class="flex-1 bg-surface-container-high text-on-surface font-bold text-[15px] py-3.5 rounded-2xl active-scale transition-apple flex items-center justify-center gap-2">
            <span class="material-symbols-outlined text-[18px]">content_copy</span> Copy
        </button>
        <button onclick="openSaveDraft(); window.closeSheet('quotePreviewSheet');" class="flex-1 bg-primary text-on-primary font-bold text-[15px] py-3.5 rounded-2xl active-scale transition-apple shadow-sm flex items-center justify-center gap-2">
            <span class="material-symbols-outlined text-[18px]">save</span> Save
        </button>
    `;

    // ── Rates Editor sheet ──
    const ratesContent = `
        <p class="text-[13px] text-secondary mb-4">These per-piece rates are used as defaults when you tap "Auto" in Order Costing.</p>
        <div class="flex flex-col gap-4">
            <div>
                <label class="field-label">Stitching Rate / pc</label>
                <div class="relative">
                    <span class="curr-sym absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary text-[15px] font-semibold">₹</span>
                    <input id="rates-stitch" type="number" min="1" step="0.5" class="calc-input w-full pl-8" placeholder="25">
                </div>
            </div>
            <div>
                <label class="field-label">Overheads Rate / pc</label>
                <div class="relative">
                    <span class="curr-sym absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary text-[15px] font-semibold">₹</span>
                    <input id="rates-oh" type="number" min="0.5" step="0.5" class="calc-input w-full pl-8" placeholder="2">
                </div>
            </div>
        </div>
        <div class="h-10"></div>
    `;
    const ratesFooter = `
        <button onclick="saveRates()" class="w-full bg-primary text-on-primary font-bold text-[16px] py-4 rounded-2xl active-scale transition-apple shadow-sm">
            Save Rates
        </button>
    `;

    sheetsContainer.innerHTML = [
        BottomSheet({ id:'saveCostSheet',     title:'Save Costing',   content:saveCostContent, footerContent:saveCostFooter, isForm:true }),
        BottomSheet({ id:'quotePreviewSheet', title:'Quote Preview',  content:quoteContent,    footerContent:quoteFooter }),
        BottomSheet({ id:'ratesEditorSheet',  title:'Default Rates',  content:ratesContent,    footerContent:ratesFooter }),
    ].join('');

    bindFormValidation('saveCostSheet-content', 'save-cost-submit');

    $('save-cost-submit')?.addEventListener('click', async () => {
        const styleRef = $('save-style')?.value;
        const clientId = $('save-client')?.value;
        const status   = $('save-status')?.value;
        const s = state.activeTab === 'order' ? state.oc : state.pp;

        await api.saveCosting({
            styleRef, clientId,
            totalUnitCost: s.cp  || 0,
            retailPrice:   s.sp  || 0,
            status, currency: state.currency,
            mode: state.activeTab,
            garmentType: s.garmentType,
        });

        window.closeSheet('saveCostSheet');
        window.showToast?.(`Costing saved as ${status}`, 'success');
    });
});
