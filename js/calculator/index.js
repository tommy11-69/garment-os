import { api } from '../services/api.js';
import { BottomSheet } from '../components/index.js';
import { TextInput, SelectInput, TextareaInput } from '../components/inputs.js';
import { bindFormValidation } from '../utils/formHandler.js';
import { calculatorStore } from '../stores/CalculatorStore.js';

// ══════════════════════════════════════════════════════
//  STATE
// ══════════════════════════════════════════════════════
const state = new Proxy({}, {
    get: (target, prop) => calculatorStore.state[prop],
    set: (target, prop, value) => { calculatorStore.setState({ [prop]: value }); return true; }
});

// ══════════════════════════════════════════════════════
//  PREFERENCES  (persisted to localStorage)
// ══════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════
//  SESSION PERSISTENCE  (Phase 3)
// ══════════════════════════════════════════════════════
const SESSION_KEY = 'gos_calc_v2_draft';

function saveSession() {
    try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({
            sharedClient: $('shared-client')?.value || '',
            u: state.u
        }));
    } catch (_) {}
}

function restoreSession() {
    try {
        const raw = sessionStorage.getItem(SESSION_KEY);
        if (!raw) return;
        const d = JSON.parse(raw);

        if ($('shared-client') && d.sharedClient) $('shared-client').value = d.sharedClient;
        
        if (d.u) {
            calculatorStore.updateU(d.u);
            const u = d.u;
            
            // Restore garment chip
            if (u.garmentType) {
                const chips = document.querySelectorAll('#shared-garment-chips .garment-chip');
                chips.forEach(b => b.classList.toggle('active', b.dataset.type === u.garmentType));
            }
            
            // Rehydrate DOM inputs from state
            const setVal = (id, v) => { const el = $(id); if (el && v) el.value = v; };
            setVal('u-qty', u.qty);
            setVal('u-pcs-per-kg', u.pcsPerKg);
            setVal('u-fabric-price-kg', u.fabricPriceKg);
            setVal('u-wastage', u.wastage);
            setVal('u-cmt', u.cmt);
            setVal('u-cutting', u.cutting);
            setVal('u-fusing', u.fusing);
            setVal('u-wages', u.wages);
            setVal('u-packing', u.packing);
            setVal('u-printing', u.printing);
            setVal('u-sublimation', u.sublimation);
            setVal('u-allowances', u.allowances);
            setVal('u-overheads', u.overheads);
            setVal('u-acc1', u.acc1);
            setVal('u-acc2', u.acc2);
            setVal('u-acc3', u.acc3);
            setVal('u-pattern', u.pattern);
            
            // SP fields
            if (u.sp) {
                if (u.lastEdited === 'sp-pc') setVal('u-sp-pc', u.sp);
                else if (u.lastEdited === 'sp-total' && u.qty > 0) setVal('u-sp-total', u.sp * u.qty);
                else setVal('u-sp-pc', u.sp);
            }
            
            if (u.cmtMode === 'separate') {
                const btn = document.querySelector('button[onclick="setCMTMode(\'separate\')"]');
                if (btn) btn.click();
            } else {
                const btn = document.querySelector('button[onclick="setCMTMode(\'combined\')"]');
                if (btn) btn.click();
            }
            
            window.updateAllTotals();
            window.calcUnified();
        }
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
//  GARMENT TYPE CHIPS  (Phase 2: single shared chip set)
// ══════════════════════════════════════════════════════
window.selectGarmentType = function(btn) {
    const container = $('shared-garment-chips');
    if (container) {
        container.querySelectorAll('.garment-chip').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    }
    calculatorStore.updateU({ garmentType: btn.dataset.type });
    saveSession();
};



// ══════════════════════════════════════════════════════
//  CMT MODE SWITCHING
// ══════════════════════════════════════════════════════
window.setCMTMode = function(mode) {
    calculatorStore.updateU({ cmtMode: mode });
    
    // Toggle active buttons
    document.querySelectorAll('.cmt-toggle-btn').forEach(b => {
        b.classList.remove('active', 'bg-primary', 'text-white');
        b.classList.add('text-secondary', 'bg-surface');
    });
    const activeBtn = document.querySelector(`button[onclick="setCMTMode('${mode}')"]`);
    if (activeBtn) {
        activeBtn.classList.add('active', 'bg-primary', 'text-white');
        activeBtn.classList.remove('text-secondary', 'bg-surface');
    }

    // Show/hide fields
    const combinedEl = $('cmt-combined');
    const separateEl = $('cmt-separate');
    
    if (mode === 'combined') {
        if (combinedEl) combinedEl.style.display = 'block';
        if (separateEl) separateEl.style.display = 'none';
        // Clear separate inputs & state
        ['u-cutting', 'u-fusing', 'u-wages', 'u-packing'].forEach(id => { if ($(id)) $(id).value = ''; });
        calculatorStore.updateU({ cutting: 0, fusing: 0, wages: 0, packing: 0 });
    } else {
        if (combinedEl) combinedEl.style.display = 'none';
        if (separateEl) separateEl.style.display = 'block';
        // Clear combined input & state
        if ($('u-cmt')) $('u-cmt').value = '';
        calculatorStore.updateU({ cmt: 0 });
    }
    
    window.calcUnified();
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
//  UNIFIED CALCULATOR ENGINE
// ══════════════════════════════════════════════════════
window.calcUnified = function() {
    const qty = num('u-qty') || num('shared-qty');
    const pcsPerKg = num('u-pcs-per-kg');
    const fabricPriceKg = num('u-fabric-price-kg');
    const wastage = num('u-wastage');
    
    const mode = state.u.cmtMode;
    const cmt = num('u-cmt');
    const cutting = num('u-cutting');
    const fusing = num('u-fusing');
    const wages = num('u-wages');
    const packing = num('u-packing');
    
    const printing = num('u-printing');
    const sublimation = num('u-sublimation');
    const allowances = num('u-allowances');
    const overheads = num('u-overheads');
    
    const acc1 = num('u-acc1');
    const acc2 = num('u-acc2');
    const acc3 = num('u-acc3');
    const pattern = num('u-pattern');

    // Fabric Calculations
    let fabricCostPc = 0;
    const pcEl = $('u-fabric-cost-pc');
    const totalEl = $('u-fabric-cost-total');
    
    if (pcsPerKg > 0 && fabricPriceKg > 0) {
        const baseFabricPc = fabricPriceKg / pcsPerKg;
        fabricCostPc = baseFabricPc * (1 + wastage / 100);
        if (pcEl && document.activeElement !== pcEl) {
            pcEl.value = fabricCostPc > 0 ? fabricCostPc.toFixed(2) : '';
        }
        const totalFabricCost = qty > 0 ? fabricCostPc * qty : 0;
        if (totalEl && document.activeElement !== totalEl) {
            totalEl.value = totalFabricCost > 0 ? totalFabricCost.toFixed(2) : '';
        }
    } else {
        // Fallback to manual entry when price/kg or pcs/kg are not both set
        if (totalEl && document.activeElement === totalEl) {
            const totalVal = parseFloat(totalEl.value) || 0;
            fabricCostPc = qty > 0 ? totalVal / qty : 0;
            if (pcEl) pcEl.value = fabricCostPc > 0 ? fabricCostPc.toFixed(2) : '';
        } else {
            fabricCostPc = parseFloat(pcEl?.value) || 0;
            const totalFabricCost = qty > 0 ? fabricCostPc * qty : 0;
            if (totalEl && document.activeElement !== totalEl) {
                totalEl.value = totalFabricCost > 0 ? totalFabricCost.toFixed(2) : '';
            }
        }
    }
    
    const totalKg = pcsPerKg > 0 && qty > 0 ? qty / pcsPerKg : 0;
    const kgInfo = $('u-kg-info');
    if (kgInfo) {
        if (totalKg > 0) {
            kgInfo.classList.remove('hidden');
            setEl('u-kg-val', totalKg.toFixed(2) + ' kg');
        } else {
            kgInfo.classList.add('hidden');
        }
    }

    // Costing
    const cmtTotalPc = mode === 'combined' ? cmt : (cutting + fusing + wages + packing);
    const printingTotalPc = printing + sublimation;
    const allowancesTotalPc = allowances + overheads;
    const accTotalPc = (qty > 0) ? (acc1 + acc2 + acc3 + pattern) / qty : 0; // Access. are typically lump sum, converting to per pc
    
    // Convert lump sum accessories to per-piece for CP calculation, or treat them as per-piece? 
    // Let's assume acc1-3, pattern are lump sum for the order as per old order costing.
    const lumpSumTotal = acc1 + acc2 + acc3 + pattern;
    const lumpSumPc = qty > 0 ? lumpSumTotal / qty : 0;
    
    const cpPc = fabricCostPc + cmtTotalPc + printingTotalPc + allowancesTotalPc + lumpSumPc;
    const totalCost = cpPc * qty;

    calculatorStore.updateU({ 
        qty, pcsPerKg, fabricPriceKg, wastage, fabricCostPc,
        cmt, cutting, fusing, wages, packing,
        printing, sublimation, allowances, overheads,
        acc1, acc2, acc3, pattern,
        cp: cpPc, totalCost 
    });

    // Breakdown
    renderBreakdown('u-breakdown-bar', 'u-breakdown-legend', 'u-breakdown', 'u-breakdown-total', [
        { label: 'Fabric', value: fabricCostPc * qty, color: C.fabric },
        { label: 'CMT', value: cmtTotalPc * qty, color: C.wages },
        { label: 'Printing/Sub', value: printingTotalPc * qty, color: C.printing },
        { label: 'Accessories', value: lumpSumTotal, color: C.accessories },
        { label: 'Allow/Overheads', value: allowancesTotalPc * qty, color: C.overheads },
    ]);
    
    recomputeSP();
    updateResultCard();
    saveSession();
};

function recomputeSP() {
    const cpPc = state.u.cp || 0;
    const qty = state.u.qty || 0;
    
    const spPcInput = $('u-sp-pc');
    const spTotalInput = $('u-sp-total');
    const pctInput = $('u-profit-pct');
    
    if (!spPcInput || !spTotalInput || !pctInput) return;
    
    const last = state.u.lastEdited;
    let userSpPc = parseFloat(spPcInput.value);
    let userSpTotal = parseFloat(spTotalInput.value);
    let userPct = parseFloat(pctInput.value);
    
    let finalSpPc = null;
    let finalPct = null;
    let finalTotalSales = 0;
    
    if (last === 'sp-pc' && !isNaN(userSpPc) && spPcInput.value !== '') {
        finalSpPc = userSpPc;
        finalPct = cpPc > 0 ? (finalSpPc - cpPc) / cpPc * 100 : 0;
        pctInput.value = finalPct.toFixed(1);
        if (qty > 0) spTotalInput.value = (finalSpPc * qty).toFixed(2);
    } else if (last === 'sp-total' && !isNaN(userSpTotal) && spTotalInput.value !== '') {
        finalSpPc = qty > 0 ? userSpTotal / qty : 0;
        finalPct = cpPc > 0 ? (finalSpPc - cpPc) / cpPc * 100 : 0;
        pctInput.value = finalPct.toFixed(1);
        if (finalSpPc > 0) spPcInput.value = finalSpPc.toFixed(2);
    } else if (last === 'pct' && !isNaN(userPct) && pctInput.value !== '') {
        finalPct = userPct;
        finalSpPc = cpPc > 0 ? cpPc * (1 + userPct / 100) : 0;
        spPcInput.value = finalSpPc > 0 ? finalSpPc.toFixed(2) : '';
        if (qty > 0) spTotalInput.value = (finalSpPc * qty).toFixed(2);
    } else {
        if (cpPc > 0) {
            finalPct = 33;
            finalSpPc = cpPc * 1.33;
            pctInput.placeholder = '33';
            spPcInput.placeholder = finalSpPc.toFixed(2);
            if (qty > 0) spTotalInput.placeholder = (finalSpPc * qty).toFixed(2);
        } else {
            pctInput.placeholder = '';
            spPcInput.placeholder = '';
            spTotalInput.placeholder = '';
        }
    }
    
    finalTotalSales = finalSpPc && qty ? finalSpPc * qty : 0;
    const profitDone = finalTotalSales - (cpPc * qty);
    
    calculatorStore.updateU({ 
        sp: finalSpPc, 
        profitPct: finalPct,
        totalSales: finalTotalSales,
        profitDone: profitDone
    });
    
    setProfitBar('u-profit-bar', 'u-margin-label', finalPct);
}


window.syncField = function(pcId, totalId, editedField) {
    const pcEl = $(pcId);
    const totalEl = $(totalId);
    const qty = num('shared-qty') || num('u-qty');

    if (qty > 0) {
        if (editedField === 'pc') {
            const val = parseFloat(pcEl.value);
            if (!isNaN(val)) totalEl.value = (val * qty).toFixed(2);
            else totalEl.value = '';
        } else if (editedField === 'total') {
            const val = parseFloat(totalEl.value);
            if (!isNaN(val)) pcEl.value = (val / qty).toFixed(2);
            else pcEl.value = '';
        }
    }
    
    window.calcUnified();
};

window.updateAllTotals = function() {
    const qty = num('shared-qty') || num('u-qty');
    const pairs = [
        ['u-cmt', 'u-cmt-total'],
        ['u-cutting', 'u-cutting-total'],
        ['u-fusing', 'u-fusing-total'],
        ['u-wages', 'u-wages-total'],
        ['u-packing', 'u-packing-total'],
        ['u-printing', 'u-printing-total'],
        ['u-sublimation', 'u-sublimation-total'],
        ['u-allowances', 'u-allowances-total'],
        ['u-overheads', 'u-overheads-total']
    ];
    
    pairs.forEach(([pcId, totalId]) => {
        const pcEl = $(pcId);
        const totalEl = $(totalId);
        if (pcEl && totalEl) {
            const val = parseFloat(pcEl.value);
            if (!isNaN(val) && qty > 0) {
                totalEl.value = (val * qty).toFixed(2);
            } else {
                totalEl.value = '';
            }
        }
    });
};


window.onFabricOverride = function(type) {
    const qty = num('shared-qty') || num('u-qty');
    const priceKg = num('u-fabric-price-kg');
    const wastage = num('u-wastage');
    
    let targetPc = NaN;
    
    if (type === 'pc') {
        targetPc = parseFloat($('u-fabric-cost-pc').value);
        if (qty > 0 && !isNaN(targetPc)) {
            $('u-fabric-cost-total').value = (targetPc * qty).toFixed(2);
        } else if (isNaN(targetPc)) {
            $('u-fabric-cost-total').value = '';
        }
    } else if (type === 'total') {
        const targetTotal = parseFloat($('u-fabric-cost-total').value);
        if (qty > 0 && !isNaN(targetTotal)) {
            targetPc = targetTotal / qty;
            $('u-fabric-cost-pc').value = targetPc.toFixed(2);
        } else if (isNaN(targetTotal)) {
            $('u-fabric-cost-pc').value = '';
        }
    }
    
    if (!isNaN(targetPc) && targetPc > 0 && priceKg > 0) {
        const pcsPerKg = (priceKg / targetPc) * (1 + wastage / 100);
        $('u-pcs-per-kg').value = Number(pcsPerKg.toFixed(4));
    }
    
    window.calcUnified();
};

window.onUSPChange = function(type) {
    calculatorStore.updateU({ lastEdited: type });
    // clear other fields
    const spPc = $('u-sp-pc'), spTotal = $('u-sp-total'), pct = $('u-profit-pct');
    if (type === 'sp-pc') { if (spTotal) spTotal.value = ''; if (pct) pct.value = ''; }
    else if (type === 'sp-total') { if (spPc) spPc.value = ''; if (pct) pct.value = ''; }
    else if (type === 'pct') { if (spPc) spPc.value = ''; if (spTotal) spTotal.value = ''; }
    
    window.calcUnified();
};

window.onSharedQtyChange = function() {
    const val = $('shared-qty')?.value || '';
    const qt = $('u-qty');
    if (qt) qt.value = val;
    window.updateAllTotals();
    window.calcUnified();
};

// ══════════════════════════════════════════════════════
//  RESULT CARD  (floating)
// ══════════════════════════════════════════════════════
function updateResultCard() {
    const s = state.u;
    const cp = s.cp || 0;
    const sp = s.sp;
    const profitPct = s.profitPct;
    const qty = s.qty || 0;

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
    
    // Update summary row
    const row = $('result-summary-row');
    if (row) {
        if (qty > 0 && cp > 0) {
            row.classList.remove('hidden');
            setEl('result-total-cost', fmt(s.totalCost));
            setEl('result-total-sales', s.totalSales > 0 ? fmt(s.totalSales) : '—');
            const profitEl = $('result-profit-done');
            if (profitEl) {
                if (s.totalSales > 0) {
                    profitEl.textContent = s.profitDone >= 0 ? fmt(s.profitDone) : '−' + fmt(Math.abs(s.profitDone));
                    profitEl.className = 'text-[13px] font-bold ' + (s.profitDone >= 0 ? 'text-[#008A00]' : 'text-error');
                } else {
                    profitEl.textContent = '—';
                    profitEl.className = 'text-[13px] font-bold text-secondary';
                }
            }
        } else {
            row.classList.add('hidden');
        }
    }
}

// ══════════════════════════════════════════════════════
//  RESET
// ══════════════════════════════════════════════════════
window.resetCalc = function() {
    document.querySelectorAll('#unified-calc-form input').forEach(el => {
        if (!el.disabled) {
            const ro = el.hasAttribute('readonly');
            if (ro) el.removeAttribute('readonly');
            el.value = '';
            if (ro) el.setAttribute('readonly', '');
        }
    });

    calculatorStore.resetCalculator();

    ['result-cp','result-sp','result-profit-pct','result-total-cost','result-total-sales','result-profit-done'].forEach(id => setEl(id, '—'));
    const bar = $('u-profit-bar');
    if(bar) bar.style.width = '0%';
    setEl('u-margin-label', '—');
    const label = $('u-margin-label');
    if(label) label.className = 'font-bold text-secondary';
    $('u-kg-info')?.classList.add('hidden');
    $('result-summary-row')?.classList.add('hidden');
    $('u-breakdown')?.classList.add('hidden');
    
    [$('shared-client'), $('u-qty')].forEach(el => { if (el) el.value = ''; });

    try { sessionStorage.removeItem(SESSION_KEY); } catch (_) {}
    window.showToast?.('Calculator cleared', 'info');
};

// ══════════════════════════════════════════════════════
//  SAVE DRAFT
// ══════════════════════════════════════════════════════
window.openSaveDraft = function() {
    const client = $('shared-client')?.value ||
        (state.activeTab === 'order' ? $('oc-client')?.value : $('pp-client')?.value);
    const styleInput = $('save-style');
    if (styleInput && client && !styleInput.value) styleInput.value = client;
    window.openSheet('saveCostSheet');
};

// ══════════════════════════════════════════════════════
//  QUOTE PREVIEW
// ══════════════════════════════════════════════════════
window.openQuotePreview = function() {
    const s       = state.u;
    const client  = $('shared-client')?.value || '—';
    const qty     = num('shared-qty') || s.qty;
    if (s.cp <= 0) {
        window.showToast?.('Fill in costs first', 'error');
        return;
    }

    const totalRev    = s.sp && s.qty ? s.sp * s.qty : null;
    const totalProfit = totalRev ? totalRev - s.totalCost : null;

    const body = $('quote-preview-body');
    if (!body) return;

    body.innerHTML = `
        <div class="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-2xl p-5 mb-4">
            <div class="flex justify-between items-start mb-5">
                <div>
                    <p class="text-[11px] font-semibold text-secondary uppercase tracking-wider mb-1">Costing</p>
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
    const s      = state.u;
    const client = $('shared-client')?.value || '—';

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

window.downloadQuotePDF = function() {
    const s       = state.u;
    const client  = $('shared-client')?.value || 'Valued Customer';
    const garment = s.garmentType || 'Garment';
    const qty     = s.qty || 0;
    
    const quoteNo = 'QT-' + Math.floor(100000 + Math.random() * 900000);
    const dateStr = new Date().toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' });
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        window.showToast?.('Please allow popups to download PDF', 'error');
        return;
    }
    
    const accsTotal = (s.acc1 || 0) + (s.acc2 || 0) + (s.acc3 || 0);
    const cmtTotal = s.cmtMode === 'combined' ? (s.cmt || 0) : ((s.cutting || 0) + (s.fusing || 0) + (s.wages || 0) + (s.packing || 0));
    
    const breakdownHTML = `
            <tr>
                <td style="padding: 12px 10px; border-bottom: 1px solid #E5E7EB;">Fabric Cost</td>
                <td style="padding: 12px 10px; border-bottom: 1px solid #E5E7EB; text-align: right;">${fmtFull(s.fabricCostPc)}/pc</td>
                <td style="padding: 12px 10px; border-bottom: 1px solid #E5E7EB; text-align: right;">${qty > 0 ? fmtFull(s.fabricCostPc * qty) : '—'}</td>
            </tr>
            <tr>
                <td style="padding: 12px 10px; border-bottom: 1px solid #E5E7EB;">Making / CMT</td>
                <td style="padding: 12px 10px; border-bottom: 1px solid #E5E7EB; text-align: right;">${fmtFull(cmtTotal)}/pc</td>
                <td style="padding: 12px 10px; border-bottom: 1px solid #E5E7EB; text-align: right;">${qty > 0 ? fmtFull(cmtTotal * qty) : '—'}</td>
            </tr>
            <tr>
                <td style="padding: 12px 10px; border-bottom: 1px solid #E5E7EB;">Printing & Sublimation</td>
                <td style="padding: 12px 10px; border-bottom: 1px solid #E5E7EB; text-align: right;">${fmtFull((s.printing || 0) + (s.sublimation || 0))}/pc</td>
                <td style="padding: 12px 10px; border-bottom: 1px solid #E5E7EB; text-align: right;">${qty > 0 ? fmtFull(((s.printing || 0) + (s.sublimation || 0)) * qty) : '—'}</td>
            </tr>
            <tr>
                <td style="padding: 12px 10px; border-bottom: 1px solid #E5E7EB;">Accessories & Pattern</td>
                <td style="padding: 12px 10px; border-bottom: 1px solid #E5E7EB; text-align: right;">${qty > 0 ? fmtFull((accsTotal + (s.pattern||0)) / qty) : '—'}/pc</td>
                <td style="padding: 12px 10px; border-bottom: 1px solid #E5E7EB; text-align: right;">${fmtFull(accsTotal + (s.pattern||0))}</td>
            </tr>
            <tr>
                <td style="padding: 12px 10px; border-bottom: 1px solid #E5E7EB;">Allowances & Overheads</td>
                <td style="padding: 12px 10px; border-bottom: 1px solid #E5E7EB; text-align: right;">${fmtFull((s.allowances || 0) + (s.overheads || 0))}/pc</td>
                <td style="padding: 12px 10px; border-bottom: 1px solid #E5E7EB; text-align: right;">${qty > 0 ? fmtFull(((s.allowances || 0) + (s.overheads || 0)) * qty) : '—'}</td>
            </tr>
        `;

    const totalCostVal = s.totalCost;
    const totalSalesVal = s.totalSales;
    const totalProfitVal = s.profitDone;

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Garment OS - Costing Quote ${quoteNo}</title>
            <style>
                body { font-family: 'Inter', system-ui, sans-serif; color: #1F2937; padding: 40px; line-height: 1.5; }
                .header { display: flex; justify-content: space-between; border-bottom: 2px solid #E5E7EB; padding-bottom: 20px; margin-bottom: 30px; }
                .title { font-size: 26px; font-weight: bold; color: #0071E3; margin: 0; }
                .subtitle { font-size: 14px; color: #6B7280; margin: 5px 0 0 0; }
                .info-grid { display: grid; grid-template-cols: 1fr 1fr; gap: 40px; margin-bottom: 30px; }
                .info-section h3 { font-size: 14px; text-transform: uppercase; color: #6B7280; margin-bottom: 10px; border-bottom: 1px solid #F3F4F6; padding-bottom: 5px; }
                .info-section p { margin: 4px 0; font-size: 15px; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
                th { background-color: #F9FAFB; padding: 12px 10px; text-align: left; font-size: 13px; font-weight: 600; color: #4B5563; border-bottom: 1px solid #E5E7EB; }
                .summary-box { background: #F9FAFB; border-radius: 12px; padding: 20px; display: grid; grid-template-cols: repeat(3, 1fr); gap: 20px; margin-bottom: 30px; }
                .summary-card { text-align: center; }
                .summary-card p { margin: 0; font-size: 11px; text-transform: uppercase; color: #6B7280; font-weight: 600; }
                .summary-card h4 { margin: 5px 0 0 0; font-size: 20px; font-weight: bold; color: #111827; }
                .footer { text-align: center; font-size: 12px; color: #9CA3AF; border-top: 1px solid #E5E7EB; padding-top: 20px; margin-top: 50px; }
                @media print {
                    body { padding: 0; }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div>
                    <h1 class="title">GARMENT OS</h1>
                    <p class="subtitle">Official Costing &amp; Style Quotation</p>
                </div>
                <div style="text-align: right;">
                    <h2 style="margin: 0; font-size: 18px; color: #111827;">Costing Quote</h2>
                    <p style="margin: 5px 0 0 0; font-size: 14px; color: #4B5563;"><strong>Quote No:</strong> ${quoteNo}</p>
                    <p style="margin: 3px 0 0 0; font-size: 14px; color: #4B5563;"><strong>Date:</strong> ${dateStr}</p>
                </div>
            </div>

            <div class="info-grid">
                <div class="info-section">
                    <h3>Client &amp; Job Description</h3>
                    <p><strong>Client / Brand:</strong> ${client}</p>
                    <p><strong>Garment Category:</strong> ${garment}</p>
                    <p><strong>Total Quantity:</strong> ${qty > 0 ? qty.toLocaleString() + ' pcs' : 'Not Specified'}</p>
                </div>
                <div class="info-section">
                    <h3>Calculation Parameters</h3>
                    <p><strong>Calculation Mode:</strong> Unified</p>
                    <p><strong>Currency:</strong> INR (₹)</p>
                    <p><strong>Status:</strong> Draft Quotation</p>
                </div>
            </div>

            <h3 style="font-size: 15px; text-transform: uppercase; color: #6B7280; margin-bottom: 15px; border-bottom: 1px solid #F3F4F6; padding-bottom: 5px;">Cost Breakdown</h3>
            <table>
                <thead>
                    <tr>
                        <th style="width: 50%;">Cost Component</th>
                        <th style="width: 25%; text-align: right;">Cost / Piece</th>
                        <th style="width: 25%; text-align: right;">Total Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${breakdownHTML}
                    <tr style="font-weight: bold; background-color: #F9FAFB;">
                        <td style="padding: 12px 10px; border-top: 2px solid #D1D5DB;">Total Unit Cost (CP)</td>
                        <td style="padding: 12px 10px; border-top: 2px solid #D1D5DB; text-align: right;">${fmtFull(s.cp)}/pc</td>
                        <td style="padding: 12px 10px; border-top: 2px solid #D1D5DB; text-align: right;">${fmtFull(totalCostVal)}</td>
                    </tr>
                </tbody>
            </table>

            <h3 style="font-size: 15px; text-transform: uppercase; color: #6B7280; margin-bottom: 15px; border-bottom: 1px solid #F3F4F6; padding-bottom: 5px;">Pricing &amp; Margins Summary</h3>
            
            <h4 style="margin: 0 0 10px 0; font-size: 13px; text-transform: uppercase; color: #4B5563; font-weight: 600;">Per Unit Metrics</h4>
            <div class="summary-box" style="margin-bottom: 20px;">
                <div class="summary-card">
                    <p>Unit Cost (CP)</p>
                    <h4>${fmtFull(s.cp)}</h4>
                </div>
                <div class="summary-card">
                    <p>Suggested Unit SP</p>
                    <h4>${s.sp ? fmtFull(s.sp) : '—'}</h4>
                </div>
                <div class="summary-card">
                    <p>Unit Profit / Margin</p>
                    <h4 style="color: #0071E3;">${s.sp ? fmtFull(s.sp - s.cp) : '—'} <span style="font-size: 13px; font-weight: normal; color: #6B7280;">(${s.profitPct !== null ? s.profitPct.toFixed(1) + '%' : '—'})</span></h4>
                </div>
            </div>

            <h4 style="margin: 0 0 10px 0; font-size: 13px; text-transform: uppercase; color: #4B5563; font-weight: 600;">Grand Totals (${qty > 0 ? qty.toLocaleString() : '1'} pcs)</h4>
            <div class="summary-box" style="margin-bottom: 40px;">
                <div class="summary-card">
                    <p>Total Cost Amount</p>
                    <h4>${fmtFull(totalCostVal)}</h4>
                </div>
                <div class="summary-card">
                    <p>Total Sales Value</p>
                    <h4>${totalSalesVal ? fmtFull(totalSalesVal) : '—'}</h4>
                </div>
                <div class="summary-card">
                    <p>Total Net Profit</p>
                    <h4 style="color: #34C759;">${totalProfitVal !== null ? fmtFull(totalProfitVal) : '—'}</h4>
                </div>
            </div>

            <div class="footer">
                <p>This is a computer-generated costing quotation generated by Garment OS.</p>
                <p>&copy; 2026 Garment OS. All rights reserved.</p>
            </div>
            
            <script>
                window.onload = function() {
                    window.print();
                };
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
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
    const updates = {};
    if (!isNaN(sr) && sr > 0) updates.stitchRate = sr;
    if (!isNaN(or) && or > 0) updates.overheadsRate = or;
    calculatorStore.updatePrefs(updates);
    updateAutoSuggestions();
    window.closeSheet('ratesEditorSheet');
    window.showToast?.('Default rates updated', 'success');
};

// ══════════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════════
async function initModule() {
    const sheetsContainer = $('sheets-container');
    if (!sheetsContainer) return;

    let customers = [];
    try {
        customers = await api.getCustomers();
    } catch (e) {
        console.error("Failed to load customers for calculator:", e);
    }
    const customerOptions = [
        {label: 'Select Client...', value: ''},
        {label: '+ Create New Customer', value: 'NEW_CUSTOMER'},
        ...customers.map(c => ({label: c.name, value: c.id}))
    ];

    // ── Save Draft sheet ──
    const saveCostContent = `
        ${TextInput({ label:'Style Name / Reference', id:'save-style', placeholder:'e.g. SS24-TS-01', required:true })}
        ${SelectInput({ label:'Client / Brand', id:'save-client', options:customerOptions })}
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
        <button onclick="downloadQuotePDF()" class="w-full bg-primary text-on-primary font-bold text-[15px] py-3.5 rounded-2xl active-scale transition-apple shadow-sm flex items-center justify-center gap-2">
            <span class="material-symbols-outlined text-[18px]">picture_as_pdf</span> Download PDF Quote
        </button>
        
        <div class="flex gap-2 w-full mt-2">
            <button onclick="copyQuoteToClipboard()" class="flex-grow bg-surface-container-high text-on-surface font-bold text-[14px] py-3 rounded-xl active-scale transition-apple flex items-center justify-center gap-1.5">
                <span class="material-symbols-outlined text-[17px]">content_copy</span> Copy
            </button>
            <button onclick="shareQuoteViaWhatsApp()" class="flex-grow bg-[#25D366] text-white font-bold text-[14px] py-3 rounded-xl active-scale transition-apple flex items-center justify-center gap-1.5">
                <span class="material-symbols-outlined text-[17px]">share</span> WhatsApp
            </button>
            <button onclick="convertToOrder()" class="flex-grow bg-surface-container-high text-on-surface font-bold text-[14px] py-3 rounded-xl active-scale transition-apple flex items-center justify-center gap-1.5">
                <span class="material-symbols-outlined text-[17px]">shopping_cart</span> Order
            </button>
            <button onclick="openSaveDraft(); window.closeSheet('quotePreviewSheet');" class="flex-grow bg-surface-container-high text-on-surface font-bold text-[14px] py-3 rounded-xl active-scale transition-apple flex items-center justify-center gap-1.5">
                <span class="material-symbols-outlined text-[17px]">save</span> Save
            </button>
        </div>
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

    const clientSelect = $('save-client');
    if (clientSelect) {
        clientSelect.addEventListener('change', (e) => {
            if (e.target.value === 'NEW_CUSTOMER') {
                clientSelect.value = '';
                window.openQuickAddCustomer(async (newCust) => {
                    let updatedCustomers = [];
                    try {
                        updatedCustomers = await api.getCustomers();
                    } catch (e) {
                        console.error(e);
                    }
                    clientSelect.innerHTML = `<option value="">Select Client...</option><option value="NEW_CUSTOMER">+ Create New Customer</option>` + 
                        updatedCustomers.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
                    clientSelect.value = newCust.id;
                });
            }
        });
    }

    bindFormValidation('saveCostSheet-content', 'save-cost-submit');

    $('save-cost-submit')?.addEventListener('click', async () => {
        const styleRef = $('save-style')?.value;
        const clientId = $('save-client')?.value;
        const status   = $('save-status')?.value;
        const s = state.u;
        const client = $('shared-client')?.value || '';

        await api.saveCosting({
            styleRef: styleRef || client,
            clientId,
            totalUnitCost: s.cp  || 0,
            retailPrice:   s.sp  || 0,
            status, currency: state.currency,
            mode: 'unified',
            garmentType: s.garmentType,
        });

        window.closeSheet('saveCostSheet');
        window.showToast?.(`Costing saved as ${status}`, 'success');
    });

    // Phase 3: restore session after DOM + sheets are ready
    restoreSession();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initModule);
} else {
    initModule();
}


// ══════════════════════════════════════════════════════
//  WHATSAPP SHARE  (Phase 5)
// ══════════════════════════════════════════════════════
window.shareQuoteViaWhatsApp = function() {
    const s      = state.u;
    const client = $('shared-client')?.value || '—';
    const qty    = num('shared-qty') || s.qty;

    const lines = [
        '📊 *Garment OS Costing Quote*',
        `👔 *Client:* ${client}`,
        `👕 *Garment:* ${s.garmentType}`,
        qty > 0 ? `📦 *Qty:* ${qty.toLocaleString()} pcs` : '',
        `💰 *Cost Price (CP):* ${fmtFull(s.cp)}/pc`,
        s.sp ? `🏷 *Selling Price (SP):* ${fmtFull(s.sp)}/pc` : '',
        s.profitPct !== null ? `📈 *Profit Margin:* ${s.profitPct.toFixed(1)}%` : '',
        s.totalCost > 0 ? `💼 *Total Order Cost:* ${fmt(s.totalCost)}` : '',
        s.totalSales > 0 ? `💵 *Total Revenue:* ${fmt(s.totalSales)}` : '',
        '',
        '_Generated by Garment OS_',
    ].filter(Boolean).join('\n');

    const url = 'https://wa.me/?text=' + encodeURIComponent(lines);
    window.open(url, '_blank');
};

// ══════════════════════════════════════════════════════
//  CONVERT TO ORDER  (Phase 5 — passes draft state)
// ══════════════════════════════════════════════════════
window.convertToOrder = function() {
    const s      = state.u;
    const client = $('shared-client')?.value || '';
    try {
        sessionStorage.setItem('gos_order_draft', JSON.stringify({
            client,
            garmentType: s.garmentType,
            qty: num('shared-qty') || s.qty,
            cp: s.cp,
            sp: s.sp,
        }));
    } catch (_) {}
    window.closeSheet?.('quotePreviewSheet');
    window.showToast?.('Opening Order page with your costing…', 'success');
    setTimeout(() => {
        window.location.href = 'orders.html?from=costing';
    }, 900);
};
