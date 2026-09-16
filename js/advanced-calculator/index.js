// js/advanced-calculator/index.js
import { api } from '../services/api.js?v=5.2';
import { advancedCalculatorStore as store } from '../stores/AdvancedCalculatorStore.js?v=5.2';

const $ = (id) => document.getElementById(id);
const num = (id) => parseFloat($(id)?.value) || 0;

// Colors for Breakdown Bar
const C = {
    fabric: '#0071E3',       // Apple Blue
    cmt: '#FF9F0A',          // Amber / Orange
    printing: '#AF52DE',     // Purple
    accessories: '#34C759',  // Green
    overheads: '#5856D6'     // Indigo
};

// ══════════════════════════════════════════════════════
//  INITIALIZATION
// ══════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
    try {
        if (typeof window.initTheme === 'function') window.initTheme();

        // Check URL for ID (Edit Mode or Print)
        const params = new URLSearchParams(window.location.search);
        const id = params.get('id');
        
        if (id) {
            await loadCostingById(id);
            if (params.get('action') === 'print') {
                setTimeout(() => window.print(), 500);
            }
        } else {
            // Check session storage draft
            restoreDraftSession();
            renderSizeGrid();
            syncFormFromStore();
            recalcAdvanced();
        }

        // Global events
        bindGlobalEvents();

    } catch (err) {
        console.error('Advanced Calculator Init Error:', err);
    }
});

function bindGlobalEvents() {
    $('adv-client')?.addEventListener('input', (e) => {
        store.update({ clientName: e.target.value });
    });
    $('adv-garment-name')?.addEventListener('input', (e) => {
        store.update({ garmentName: e.target.value });
    });
}

// ══════════════════════════════════════════════════════
//  MEASUREMENT UNIT TOGGLE (cm vs inches)
// ══════════════════════════════════════════════════════
window.setMeasurementUnit = function(newUnit) {
    const s = store.state;
    const oldUnit = s.unit || 'cm';
    if (oldUnit === newUnit) return;

    const isToInches = newUnit === 'in';
    const factor = isToInches ? (1 / 2.54) : 2.54;

    const newSizes = s.sizes.map(sz => ({
        ...sz,
        bodyL: sz.bodyL > 0 ? parseFloat((sz.bodyL * factor).toFixed(1)) : 0,
        chest: sz.chest > 0 ? parseFloat((sz.chest * factor).toFixed(1)) : 0,
        slvL: sz.slvL > 0 ? parseFloat((sz.slvL * factor).toFixed(1)) : 0,
        slvDia: sz.slvDia > 0 ? parseFloat((sz.slvDia * factor).toFixed(1)) : 0,
    }));

    const newBodyLM = s.bodyLM > 0 ? parseFloat((s.bodyLM * factor).toFixed(1)) : 0;
    const newChestM = s.chestM > 0 ? parseFloat((s.chestM * factor).toFixed(1)) : 0;
    const newSlvLM = s.slvLM > 0 ? parseFloat((s.slvLM * factor).toFixed(1)) : 0;
    const newSlvDiaM = s.slvDiaM > 0 ? parseFloat((s.slvDiaM * factor).toFixed(1)) : 0;

    store.update({
        unit: newUnit,
        sizes: newSizes,
        bodyLM: newBodyLM,
        chestM: newChestM,
        slvLM: newSlvLM,
        slvDiaM: newSlvDiaM
    });

    // Update UI buttons
    document.querySelectorAll('.unit-toggle-btn').forEach(b => {
        const isCmBtn = b.textContent.trim() === 'cm';
        b.classList.toggle('active', (isCmBtn && newUnit === 'cm') || (!isCmBtn && newUnit === 'in'));
    });

    const sub = $('unit-subtitle');
    if (sub) sub.textContent = `Dimensions in ${newUnit === 'in' ? 'inches (in)' : 'centimeters (cm)'}. Fabric weight is calculated per size individually.`;

    const marginBodyEl = $('pat-margin-body');
    const marginChestEl = $('pat-margin-chest');
    const marginSlvEl = $('pat-margin-slv');
    const marginDiaEl = $('pat-margin-dia');
    if (marginBodyEl) marginBodyEl.value = newBodyLM > 0 ? newBodyLM : '';
    if (marginChestEl) marginChestEl.value = newChestM > 0 ? newChestM : '';
    if (marginSlvEl) marginSlvEl.value = newSlvLM > 0 ? newSlvLM : '';
    if (marginDiaEl) marginDiaEl.value = newSlvDiaM > 0 ? newSlvDiaM : '';

    renderSizeGrid();
    recalcAdvanced();
};

// ══════════════════════════════════════════════════════
//  SIZE-SPECIFIC PATTERN GRID RENDERER (NO DUPLICATES)
// ══════════════════════════════════════════════════════
function renderSizeGrid() {
    const container = $('sizes-grid-container');
    if (!container) return;

    const s = store.state;
    const uLabel = (s.unit || 'cm') === 'in' ? 'in' : 'cm';

    // Desktop/Tablet Header + Rows
    let html = `
        <div class="hidden sm:grid grid-cols-12 gap-2 px-3 py-2 text-[11px] font-bold text-secondary dark:text-slate-400 uppercase tracking-wider border-b border-outline-variant/30 dark:border-slate-800">
            <div class="col-span-2">Size</div>
            <div class="col-span-2">Qty (pcs)</div>
            <div class="col-span-2">Body L (${uLabel})</div>
            <div class="col-span-2">Chest (${uLabel})</div>
            <div class="col-span-1">Slv L</div>
            <div class="col-span-1">Dia</div>
            <div class="col-span-1 text-right">Wt/pc</div>
            <div class="col-span-1 text-right">Act</div>
        </div>
    `;

    s.sizes.forEach((sz, idx) => {
        html += `
            <!-- Desktop / Tablet Row (sm:grid) -->
            <div class="hidden sm:grid grid-cols-12 gap-2 px-3 py-2 items-center bg-surface-container-lowest/70 dark:bg-slate-800/40 hover:bg-surface-container-lowest dark:hover:bg-slate-800/70 rounded-2xl border border-outline-variant/20 dark:border-slate-800/80 transition-colors" data-size-id="${sz.id}">
                <div class="col-span-2">
                    <input type="text" class="calc-input !h-9 text-[13px] font-bold" value="${sz.name || ''}" 
                           oninput="onSizePropChange(${idx}, 'name', this.value)" placeholder="Size">
                </div>
                <div class="col-span-2">
                    <input type="number" min="0" class="calc-input !h-9 text-[13px] font-bold text-center" value="${sz.qty > 0 ? sz.qty : ''}" 
                           oninput="onSizePropChange(${idx}, 'qty', this.value)" placeholder="0">
                </div>
                <div class="col-span-2">
                    <input type="number" min="0" step="0.1" class="calc-input !h-9 text-[13px] text-center" value="${sz.bodyL > 0 ? sz.bodyL : ''}" 
                           oninput="onSizePropChange(${idx}, 'bodyL', this.value)" placeholder="70">
                </div>
                <div class="col-span-2">
                    <input type="number" min="0" step="0.1" class="calc-input !h-9 text-[13px] text-center" value="${sz.chest > 0 ? sz.chest : ''}" 
                           oninput="onSizePropChange(${idx}, 'chest', this.value)" placeholder="54">
                </div>
                <div class="col-span-1">
                    <input type="number" min="0" step="0.1" class="calc-input !h-9 text-[13px] text-center !px-1" value="${sz.slvL > 0 ? sz.slvL : ''}" 
                           oninput="onSizePropChange(${idx}, 'slvL', this.value)" placeholder="22">
                </div>
                <div class="col-span-1">
                    <input type="number" min="0" step="0.1" class="calc-input !h-9 text-[13px] text-center !px-1" value="${sz.slvDia > 0 ? sz.slvDia : ''}" 
                           oninput="onSizePropChange(${idx}, 'slvDia', this.value)" placeholder="18">
                </div>
                <div class="col-span-1 text-right">
                    <span id="sz-wt-desktop-${idx}" class="text-[13px] font-bold text-primary dark:text-blue-400 tabular-nums">
                        ${sz.weightGms > 0 ? sz.weightGms.toFixed(1) : '0.0'}g
                    </span>
                </div>
                <div class="col-span-1 text-right">
                    <button type="button" onclick="removeSizeRow(${idx})" class="w-8 h-8 rounded-lg hover:bg-error/10 text-secondary hover:text-error flex items-center justify-center transition-colors ml-auto" title="Remove Size">
                        <span class="material-symbols-outlined text-[16px]">close</span>
                    </button>
                </div>
            </div>

            <!-- Mobile Card View (< sm:) -->
            <div class="flex sm:hidden flex-col gap-3 bg-surface-container-lowest/90 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-outline-variant/25 dark:border-slate-800 shadow-sm" data-size-id-mobile="${sz.id}">
                <div class="flex justify-between items-center">
                    <div class="flex items-center gap-2">
                        <input type="text" class="calc-input !h-8 !w-20 text-[13px] font-bold" value="${sz.name || ''}" 
                               oninput="onSizePropChange(${idx}, 'name', this.value)" placeholder="Size">
                        <span class="text-[11px] text-secondary font-medium">Qty:</span>
                        <input type="number" min="0" class="calc-input !h-8 !w-24 text-[13px] font-bold text-center" value="${sz.qty > 0 ? sz.qty : ''}" 
                               oninput="onSizePropChange(${idx}, 'qty', this.value)" placeholder="0">
                    </div>
                    <div class="flex items-center gap-1.5">
                        <span id="sz-wt-mobile-${idx}" class="text-[12px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                            ${sz.weightGms > 0 ? sz.weightGms.toFixed(1) : '0.0'} gms
                        </span>
                        <button type="button" onclick="removeSizeRow(${idx})" class="w-7 h-7 rounded-lg text-secondary hover:text-error flex items-center justify-center" title="Delete">
                            <span class="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                    </div>
                </div>

                <div class="grid grid-cols-4 gap-2 pt-1 border-t border-outline-variant/15 text-center">
                    <div>
                        <span class="text-[10px] text-secondary block mb-1">Body L (${uLabel})</span>
                        <input type="number" min="0" step="0.1" class="calc-input !h-8 text-[12px] text-center !px-1" value="${sz.bodyL > 0 ? sz.bodyL : ''}" 
                               oninput="onSizePropChange(${idx}, 'bodyL', this.value)" placeholder="70">
                    </div>
                    <div>
                        <span class="text-[10px] text-secondary block mb-1">Chest (${uLabel})</span>
                        <input type="number" min="0" step="0.1" class="calc-input !h-8 text-[12px] text-center !px-1" value="${sz.chest > 0 ? sz.chest : ''}" 
                               oninput="onSizePropChange(${idx}, 'chest', this.value)" placeholder="54">
                    </div>
                    <div>
                        <span class="text-[10px] text-secondary block mb-1">Slv L (${uLabel})</span>
                        <input type="number" min="0" step="0.1" class="calc-input !h-8 text-[12px] text-center !px-1" value="${sz.slvL > 0 ? sz.slvL : ''}" 
                               oninput="onSizePropChange(${idx}, 'slvL', this.value)" placeholder="22">
                    </div>
                    <div>
                        <span class="text-[10px] text-secondary block mb-1">Slv Dia (${uLabel})</span>
                        <input type="number" min="0" step="0.1" class="calc-input !h-8 text-[12px] text-center !px-1" value="${sz.slvDia > 0 ? sz.slvDia : ''}" 
                               oninput="onSizePropChange(${idx}, 'slvDia', this.value)" placeholder="18">
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// Targeted handler without destroying input focus!
window.onSizePropChange = function(index, prop, val) {
    const s = store.state;
    if (!s.sizes[index]) return;

    if (prop === 'name') {
        s.sizes[index].name = val;
    } else {
        s.sizes[index][prop] = parseFloat(val) || 0;
    }

    recalcAdvanced(false); // don't re-render entire grid to keep cursor focus
};

window.addNewSizeRow = function() {
    const s = store.state;
    const standardSizes = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'];
    const existingNames = s.sizes.map(x => x.name.toUpperCase());
    const nextName = standardSizes.find(n => !existingNames.includes(n)) || `Size ${s.sizes.length + 1}`;

    const unit = s.unit || 'cm';
    const isInches = unit === 'in';
    const lastSize = s.sizes[s.sizes.length - 1] || { bodyL: 0, chest: 0, slvL: 0, slvDia: 0 };

    store.addSize(nextName, {
        qty: 0,
        bodyL: lastSize.bodyL > 0 ? lastSize.bodyL + (isInches ? 0.8 : 2) : 0,
        chest: lastSize.chest > 0 ? lastSize.chest + (isInches ? 0.8 : 2) : 0,
        slvL: lastSize.slvL > 0 ? lastSize.slvL + (isInches ? 0.4 : 1) : 0,
        slvDia: lastSize.slvDia > 0 ? lastSize.slvDia + (isInches ? 0.2 : 0.5) : 0
    });

    renderSizeGrid();
    recalcAdvanced();
};

window.removeSizeRow = function(idx) {
    store.removeSize(idx);
    renderSizeGrid();
    recalcAdvanced();
};

window.toggleAllowancesDrawer = function() {
    const drawer = $('allowances-drawer');
    const icon = $('allowances-drawer-icon');
    if (!drawer) return;
    const isHidden = drawer.classList.contains('hidden');
    if (isHidden) {
        drawer.classList.remove('hidden');
        drawer.classList.add('grid');
        if (icon) icon.style.transform = 'rotate(180deg)';
    } else {
        drawer.classList.remove('grid');
        drawer.classList.add('hidden');
        if (icon) icon.style.transform = 'rotate(0deg)';
    }
};

window.onGlobalParamChange = function() {
    recalcAdvanced(false);
};

// ══════════════════════════════════════════════════════
//  CORE CALCULATION ENGINE
// ══════════════════════════════════════════════════════
window.recalcAdvanced = function(updateGridDOM = true) {
    const s = store.state;
    const unit = s.unit || 'cm';
    const unitMult = unit === 'in' ? 2.54 : 1.0;

    // 1. Read Global Specs
    const gsm = num('adv-gsm') || s.gsm;
    const fabricPriceKg = num('adv-fabric-price-kg') || s.fabricPriceKg;
    const wastage = num('adv-wastage') || s.wastage;

    const bodyLM = num('pat-margin-body') || s.bodyLM;
    const chestM = num('pat-margin-chest') || s.chestM;
    const slvLM = num('pat-margin-slv') || s.slvLM;
    const slvDiaM = num('pat-margin-dia') || s.slvDiaM;

    // 2. Individual Size Calculations (converting inches to cm if unit === 'in')
    let totalQty = 0;
    let baseTotalFabricKg = 0;

    s.sizes.forEach((sz, idx) => {
        let weightGms = 0;
        if (gsm > 0 && (sz.bodyL > 0 || sz.chest > 0)) {
            const bodyL_cm = (sz.bodyL + bodyLM) * unitMult;
            const chest_cm = (sz.chest + chestM) * unitMult;
            const bodyGms = bodyL_cm * chest_cm * 2 * gsm / 10000;

            const slvL_cm = (sz.slvL + slvLM) * unitMult;
            const slvDia_cm = (sz.slvDia + slvDiaM) * unitMult;
            const slvGms = slvL_cm * slvDia_cm * 2 * gsm / 10000;

            weightGms = bodyGms + slvGms;
        }

        const sizeFabricKg = (weightGms * sz.qty) / 1000;
        sz.weightGms = weightGms;
        sz.totalKg = sizeFabricKg;

        totalQty += sz.qty;
        baseTotalFabricKg += sizeFabricKg;

        // In-place live element update without cursor disruption
        const dtEl = $(`sz-wt-desktop-${idx}`);
        if (dtEl) dtEl.textContent = (weightGms > 0 ? weightGms.toFixed(1) : '0.0') + 'g';
        const mbEl = $(`sz-wt-mobile-${idx}`);
        if (mbEl) mbEl.textContent = (weightGms > 0 ? weightGms.toFixed(1) : '0.0') + ' gms';
    });

    // Total Fabric Required (with Wastage)
    const totalFabricKg = baseTotalFabricKg * (1 + wastage / 100);
    const avgWeightGms = totalQty > 0 ? (baseTotalFabricKg * 1000) / totalQty : 0;
    const pcsPerKg = avgWeightGms > 0 ? 1000 / avgWeightGms : 0;
    const totalFabricCost = totalFabricKg * fabricPriceKg;
    const fabricCostPc = totalQty > 0 ? totalFabricCost / totalQty : 0;

    // 3. Read Cost Modules
    const mode = s.cmtMode;
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

    const cmtTotalPc = mode === 'combined' ? cmt : (cutting + fusing + wages + packing);
    const printingTotalPc = printing + sublimation;
    const allowancesTotalPc = allowances + overheads;
    const lumpSumTotal = acc1 + acc2 + acc3 + pattern;
    const lumpSumPc = totalQty > 0 ? lumpSumTotal / totalQty : 0;

    // Total Cost Price (CP)
    const cpPc = fabricCostPc + cmtTotalPc + printingTotalPc + allowancesTotalPc + lumpSumPc;
    const totalCost = cpPc * totalQty;

    // 4. Selling Price (SP) & Profit Calculations
    let spPc = s.spPc;
    let profitPct = s.profitPct;
    const lastEdited = s.lastEdited || 'pct';

    if (lastEdited === 'pct') {
        spPc = cpPc * (1 + profitPct / 100);
    } else if (lastEdited === 'sp-pc') {
        profitPct = cpPc > 0 ? ((spPc - cpPc) / cpPc) * 100 : 0;
    } else if (lastEdited === 'sp-total') {
        const totalSP = num('u-sp-total');
        spPc = totalQty > 0 ? totalSP / totalQty : 0;
        profitPct = cpPc > 0 ? ((spPc - cpPc) / cpPc) * 100 : 0;
    }

    const totalSales = (spPc || 0) * totalQty;
    const profitDone = totalSales - totalCost;

    // Update Store
    store.update({
        totalQty,
        bodyLM, chestM, slvLM, slvDiaM,
        gsm, fabricPriceKg, wastage,
        totalFabricKg, avgWeightGms, pcsPerKg, fabricCostPc, totalFabricCost,
        cmt, cutting, fusing, wages, packing,
        printing, sublimation, allowances, overheads,
        acc1, acc2, acc3, pattern,
        cpPc, totalCost, spPc, totalSales, profitPct, profitDone
    });

    // Update UI elements
    updateAggregatedUI();
};

function updateAggregatedUI() {
    const s = store.state;
    const sym = s.currency || '₹';

    // Grid badge
    if ($('grid-total-qty')) $('grid-total-qty').textContent = s.totalQty;

    // Fabric Rollup
    if ($('res-total-fabric-kg')) $('res-total-fabric-kg').textContent = s.totalFabricKg.toFixed(2) + ' kg';
    if ($('res-avg-wt-gms')) $('res-avg-wt-gms').textContent = s.avgWeightGms.toFixed(1) + ' gms';
    if ($('res-fabric-cost-pc')) $('res-fabric-cost-pc').textContent = sym + s.fabricCostPc.toFixed(2) + ' /pc';
    if ($('res-fabric-cost-total')) $('res-fabric-cost-total').textContent = sym + s.totalFabricCost.toFixed(2);

    // SP inputs sync if not currently active
    const spPcInput = $('u-sp-pc');
    const spTotInput = $('u-sp-total');
    const profInput = $('u-profit-pct');

    if (spPcInput && document.activeElement !== spPcInput) {
        spPcInput.value = s.spPc > 0 ? s.spPc.toFixed(2) : '';
    }
    if (spTotInput && document.activeElement !== spTotInput) {
        spTotInput.value = s.totalSales > 0 ? s.totalSales.toFixed(2) : '';
    }
    if (profInput && document.activeElement !== profInput) {
        profInput.value = (s.profitPct !== null && s.profitPct !== undefined) ? s.profitPct.toFixed(1) : '';
    }

    // Profit Bar & Label
    const bar = $('u-profit-bar');
    const lbl = $('u-margin-label');
    if (bar && lbl) {
        const pct = s.profitPct || 0;
        const clampedWidth = Math.max(0, Math.min(100, pct));
        bar.style.width = clampedWidth + '%';
        lbl.textContent = `${pct.toFixed(1)}% (${sym}${s.profitDone.toFixed(0)} total profit)`;
        
        if (pct < 0) {
            bar.classList.remove('bg-primary', 'bg-[#34C759]');
            bar.classList.add('bg-error');
            lbl.className = 'font-bold text-error';
        } else if (pct >= 25) {
            bar.classList.remove('bg-error', 'bg-primary');
            bar.classList.add('bg-[#34C759]');
            lbl.className = 'font-bold text-[#34C759]';
        } else {
            bar.classList.remove('bg-error', 'bg-[#34C759]');
            bar.classList.add('bg-primary');
            lbl.className = 'font-bold text-primary';
        }
    }

    // Floating Dynamic Island Bottom Bar
    if ($('result-cp')) $('result-cp').textContent = sym + (s.cpPc > 0 ? s.cpPc.toFixed(2) : '0.00');
    if ($('result-sp')) $('result-sp').textContent = sym + (s.spPc > 0 ? s.spPc.toFixed(2) : '0.00');
    if ($('result-profit-pct')) {
        const pVal = s.profitPct || 0;
        $('result-profit-pct').textContent = pVal.toFixed(1) + '%';
        $('result-profit-pct').className = `text-[19px] font-bold transition-all duration-300 ${pVal >= 0 ? 'text-[#34C759]' : 'text-error'}`;
    }
    if ($('result-total-cost')) $('result-total-cost').textContent = sym + (s.totalCost > 0 ? s.totalCost.toFixed(2) : '0.00');
    if ($('result-total-sales')) $('result-total-sales').textContent = sym + (s.totalSales > 0 ? s.totalSales.toFixed(2) : '0.00');
    if ($('result-profit-done')) {
        $('result-profit-done').textContent = sym + s.profitDone.toFixed(2);
        $('result-profit-done').className = `text-[12px] font-bold ${s.profitDone >= 0 ? 'text-[#34C759]' : 'text-error'}`;
    }

    // Breakdown Visualizer
    renderBreakdown();
}

// ══════════════════════════════════════════════════════
//  DUAL INPUT TWO-WAY FIELD SYNCHRONIZER
// ══════════════════════════════════════════════════════
window.syncField = function(pcId, totalId, source) {
    const s = store.state;
    const qty = s.totalQty || 1;
    const pcEl = $(pcId);
    const totalEl = $(totalId);

    if (!pcEl || !totalEl) return;

    if (source === 'pc') {
        const val = parseFloat(pcEl.value) || 0;
        totalEl.value = (val > 0 && qty > 0) ? (val * qty).toFixed(2) : '';
    } else {
        const total = parseFloat(totalEl.value) || 0;
        pcEl.value = (total > 0 && qty > 0) ? (total / qty).toFixed(2) : '';
    }

    recalcAdvanced();
};

// ══════════════════════════════════════════════════════
//  3-WAY SELLING PRICE & PROFIT REACTIVITY
// ══════════════════════════════════════════════════════
window.onUSPChange = function(field) {
    const s = store.state;
    store.update({ lastEdited: field });

    if (field === 'pct') {
        const pct = parseFloat($('u-profit-pct')?.value) || 0;
        store.update({ profitPct: pct });
    } else if (field === 'sp-pc') {
        const sp = parseFloat($('u-sp-pc')?.value) || 0;
        store.update({ spPc: sp });
    } else if (field === 'sp-total') {
        const totalSP = parseFloat($('u-sp-total')?.value) || 0;
        const sp = s.totalQty > 0 ? totalSP / s.totalQty : 0;
        store.update({ spPc: sp });
    }

    recalcAdvanced();
};

// ══════════════════════════════════════════════════════
//  VISUAL COST BREAKDOWN BAR & LEGEND
// ══════════════════════════════════════════════════════
function renderBreakdown() {
    const barEl = $('u-breakdown-bar');
    const legendEl = $('u-breakdown-legend');
    const wrapEl = $('u-breakdown');
    const totalEl = $('u-breakdown-total');

    if (!barEl || !legendEl || !wrapEl) return;

    const s = store.state;
    const sym = s.currency || '₹';
    const totalCost = s.totalCost || 0;

    if (totalCost <= 0) {
        wrapEl.classList.add('hidden');
        wrapEl.classList.remove('flex');
        return;
    }

    wrapEl.classList.remove('hidden');
    wrapEl.classList.add('flex');
    if (totalEl) totalEl.textContent = `${sym}${totalCost.toFixed(2)} total cost`;

    const cmtTotal = s.cmtMode === 'combined' ? (s.cmt * s.totalQty) : ((s.cutting + s.fusing + s.wages + s.packing) * s.totalQty);
    const printingTotal = (s.printing + s.sublimation) * s.totalQty;
    const accTotal = s.acc1 + s.acc2 + s.acc3 + s.pattern;
    const allowTotal = (s.allowances + s.overheads) * s.totalQty;

    const segments = [
        { label: 'Fabric', val: s.totalFabricCost, color: C.fabric },
        { label: 'Making / CMT', val: cmtTotal, color: C.cmt },
        { label: 'Printing & Sub', val: printingTotal, color: C.printing },
        { label: 'Accessories & Pattern', val: accTotal, color: C.accessories },
        { label: 'Allowances & Overheads', val: allowTotal, color: C.overheads }
    ].filter(x => x.val > 0);

    // Render multi-segment bar
    barEl.innerHTML = segments.map(seg => {
        const pct = ((seg.val / totalCost) * 100).toFixed(1);
        return `<div style="width:${pct}%;background:${seg.color}" title="${seg.label}: ${pct}%" class="h-full transition-all"></div>`;
    }).join('');

    // Render legend
    legendEl.innerHTML = segments.map(seg => {
        const pct = ((seg.val / totalCost) * 100).toFixed(1);
        const costPc = s.totalQty > 0 ? (seg.val / s.totalQty).toFixed(2) : '0.00';
        return `
            <div class="flex items-center justify-between text-[13px]">
                <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full" style="background:${seg.color}"></span>
                    <span class="font-medium text-on-surface dark:text-slate-200">${seg.label}</span>
                </div>
                <div class="flex items-center gap-2">
                    <span class="font-bold text-on-surface dark:text-slate-100">${sym}${costPc}/pc</span>
                    <span class="text-[11px] font-semibold text-secondary dark:text-slate-400 bg-surface-container-high dark:bg-slate-800 px-1.5 py-0.5 rounded">${pct}%</span>
                </div>
            </div>
        `;
    }).join('');
}

// ══════════════════════════════════════════════════════
//  CONTROLS: CMT MODE, GARMENTS, CURRENCY, RESET
// ══════════════════════════════════════════════════════
window.toggleSection = function(btn) {
    const body = btn.nextElementSibling;
    const icon = btn.querySelector('.expand-icon');
    if (!body) return;
    const isOpen = !body.style.display || body.style.display === 'none';
    body.style.display = isOpen ? 'flex' : 'none';
    if (icon) icon.style.transform = isOpen ? 'rotate(180deg)' : 'rotate(0deg)';
};

window.setCMTMode = function(mode) {
    document.querySelectorAll('.cmt-toggle-btn').forEach(b => {
        b.classList.remove('active', 'bg-primary', 'text-white');
        b.classList.add('text-secondary', 'bg-surface', 'dark:bg-slate-700');
    });
    event.target.classList.add('active', 'bg-primary', 'text-white');
    event.target.classList.remove('text-secondary', 'bg-surface', 'dark:bg-slate-700');

    $('cmt-combined').style.display = mode === 'combined' ? 'block' : 'none';
    $('cmt-separate').style.display = mode === 'separate' ? 'flex' : 'none';

    store.update({ cmtMode: mode });
    recalcAdvanced();
};

window.selectGarmentType = function(btn) {
    document.querySelectorAll('#adv-garment-chips .garment-chip').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const type = btn.dataset.type;
    store.update({ garmentType: type });
    if ($('adv-garment-name') && !$('adv-garment-name').value) {
        $('adv-garment-name').value = `${type}`;
    }
};

window.setCurrency = function(sym) {
    document.querySelectorAll('.currency-btn').forEach(b => {
        b.classList.toggle('active', b.textContent.trim() === sym);
    });
    document.querySelectorAll('.curr-sym').forEach(el => {
        el.textContent = sym;
    });
    store.update({ currency: sym });
    recalcAdvanced();
};

window.resetCalculator = function() {
    if (!confirm('Reset all values to default?')) return;
    store.reset();
    renderSizeGrid();
    syncFormFromStore();
    recalcAdvanced();
    if (window.showToast) window.showToast('Calculator reset', 'info');
};

function syncFormFromStore() {
    const s = store.state;
    const setVal = (id, v) => {
        if ($(id)) {
            $(id).value = (v !== undefined && v !== null && v !== '' && v !== 0 && !isNaN(Number(v))) ? Number(v) : (typeof v === 'string' ? v : '');
        }
    };

    setVal('adv-client', s.clientName);
    setVal('adv-garment-name', s.garmentName);
    setVal('adv-gsm', s.gsm);
    setVal('adv-fabric-price-kg', s.fabricPriceKg);
    setVal('adv-wastage', s.wastage);

    setVal('pat-margin-body', s.bodyLM);
    setVal('pat-margin-chest', s.chestM);
    setVal('pat-margin-slv', s.slvLM);
    setVal('pat-margin-dia', s.slvDiaM);

    setVal('u-cmt', s.cmt);
    setVal('u-cutting', s.cutting);
    setVal('u-fusing', s.fusing);
    setVal('u-wages', s.wages);
    setVal('u-packing', s.packing);

    setVal('u-printing', s.printing);
    setVal('u-sublimation', s.sublimation);
    setVal('u-allowances', s.allowances);
    setVal('u-overheads', s.overheads);

    setVal('u-acc1', s.acc1);
    setVal('u-acc2', s.acc2);
    setVal('u-acc3', s.acc3);
    setVal('u-pattern', s.pattern);

    setVal('u-profit-pct', s.profitPct);
}

// ══════════════════════════════════════════════════════
//  SAVE, LOAD & QUOTE PREVIEW
// ══════════════════════════════════════════════════════
window.saveCosting = async function(status = 'saved') {
    const s = store.state;
    const clientName = $('adv-client')?.value?.trim() || s.clientName;
    if (!clientName) {
        window.showToast?.('Please enter a Client / Buyer Name', 'error');
        $('adv-client')?.focus();
        return;
    }
    if (s.totalQty <= 0) {
        window.showToast?.('Total quantity must be greater than 0', 'error');
        return;
    }

    const btn = $('btn-save-draft');
    const originalText = btn ? btn.textContent : '';
    if (btn) btn.textContent = 'Saving...';

    try {
        const materials = [
            { name: 'Fabric Cost/pc', unit: 'per pc', cost: s.fabricCostPc || 0 },
            { name: 'Fabric Price/kg', unit: 'per kg', cost: s.fabricPriceKg || 0 },
            { name: 'Avg Pcs/kg', unit: 'count', cost: s.pcsPerKg || 0 },
            { name: 'Wastage', unit: '%', cost: s.wastage || 0 },
            { name: 'CMT', unit: 'per pc', cost: s.cmtMode === 'combined' ? (s.cmt || 0) : ((s.cutting || 0) + (s.fusing || 0) + (s.wages || 0) + (s.packing || 0)) },
            { name: 'Printing', unit: 'per pc', cost: (s.printing || 0) + (s.sublimation || 0) },
            { name: 'Accessories', unit: 'lump', cost: (s.acc1 || 0) + (s.acc2 || 0) + (s.acc3 || 0) + (s.pattern || 0) },
            { name: 'Overheads & Allow', unit: 'per pc', cost: (s.allowances || 0) + (s.overheads || 0) }
        ].filter(m => m.cost > 0);

        const params = new URLSearchParams(window.location.search);
        const editId = params.get('id');

        const payload = {
            id: editId || 'adv_' + Date.now(),
            date: new Date().toISOString(),
            styleRef: s.garmentName || s.garmentType,
            clientId: clientName,
            clientName: clientName,
            garmentType: s.garmentType,
            currency: s.currency || '₹',
            mode: 'advanced',
            qty: s.totalQty || 0,
            pcsPerKg: s.pcsPerKg || 0,
            weightGms: s.avgWeightGms || 0,
            fabricPriceKg: s.fabricPriceKg || 0,
            wastage: s.wastage || 0,
            fabricCostPc: s.fabricCostPc || 0,
            bodyL: s.sizes?.[0]?.bodyL || 0,
            bodyLM: s.bodyLM || 0,
            chest: s.sizes?.[0]?.chest || 0,
            chestM: s.chestM || 0,
            slvL: s.sizes?.[0]?.slvL || 0,
            slvLM: s.slvLM || 0,
            slvDia: s.sizes?.[0]?.slvDia || 0,
            slvDiaM: s.slvDiaM || 0,
            gsm: s.gsm || 0,
            cmtMode: s.cmtMode || 'combined',
            cmt: s.cmt || 0,
            cutting: s.cutting || 0,
            fusing: s.fusing || 0,
            wages: s.wages || 0,
            packing: s.packing || 0,
            printing: s.printing || 0,
            sublimation: s.sublimation || 0,
            allowances: s.allowances || 0,
            overheads: s.overheads || 0,
            acc1: s.acc1 || 0,
            acc2: s.acc2 || 0,
            acc3: s.acc3 || 0,
            pattern: s.pattern || 0,
            totalCost: s.totalCost || 0,
            profitPct: s.profitPct || 0,
            totalSales: s.totalSales || 0,
            profitDone: s.profitDone || 0,
            patternCalcOpen: 1,
            totalUnitCost: s.cpPc || 0,
            retailPrice: s.spPc || 0,
            status: status,
            materials: materials,
            uData: { ...s, clientName }
        };

        if (editId) {
            await api.updateCosting(editId, payload);
        } else {
            await api.saveCosting(payload);
        }

        window.showToast?.(`Costing successfully ${editId ? 'updated' : 'saved'}!`, 'success');

        // Save active draft to session too
        sessionStorage.setItem('gos_calc_v2_draft', JSON.stringify({
            sharedClient: clientName,
            mode: 'advanced',
            u: payload.uData
        }));

    } catch (err) {
        console.error('Save Costing Error:', err);
        window.showToast?.('Failed to save costing: ' + (err.message || 'Unknown error'), 'error');
    } finally {
        if (btn) btn.textContent = originalText;
    }
};

async function loadCostingById(id) {
    try {
        window.showToast?.('Loading saved costing...', 'info');
        const c = await api.getCostingById(id);
        if (!c || c.error) throw new Error(c?.error || 'Costing not found');

        let u = {};
        if (c.uData && typeof c.uData === 'object') {
            u = { ...c.uData };
        } else if (typeof c.uData === 'string' && c.uData) {
            try { u = JSON.parse(c.uData); } catch (_) {}
        }

        const parsedSizes = u.sizes && Array.isArray(u.sizes) && u.sizes.length ? u.sizes.map(sz => ({
            ...sz,
            qty: parseFloat(sz.qty) || 0,
            bodyL: parseFloat(sz.bodyL) || 0,
            chest: parseFloat(sz.chest) || 0,
            slvL: parseFloat(sz.slvL) || 0,
            slvDia: parseFloat(sz.slvDia) || 0,
            weightGms: parseFloat(sz.weightGms) || 0,
            totalKg: parseFloat(sz.totalKg) || 0,
        })) : store.state.sizes;

        store.update({
            clientName: c.clientId || c.clientName || u.clientName || '',
            garmentName: c.styleRef || u.garmentName || '',
            garmentType: c.garmentType || u.garmentType || 'T-Shirt',
            currency: c.currency || u.currency || '₹',
            sizes: parsedSizes,
            gsm: parseFloat(u.gsm ?? c.gsm ?? 0),
            fabricPriceKg: parseFloat(u.fabricPriceKg ?? c.fabricPriceKg ?? 0),
            wastage: parseFloat(u.wastage ?? c.wastage ?? 0),
            cmtMode: u.cmtMode || c.cmtMode || 'combined',
            cmt: parseFloat(u.cmt ?? c.cmt ?? 0),
            cutting: parseFloat(u.cutting ?? c.cutting ?? 0),
            fusing: parseFloat(u.fusing ?? c.fusing ?? 0),
            wages: parseFloat(u.wages ?? c.wages ?? 0),
            packing: parseFloat(u.packing ?? c.packing ?? 0),
            printing: parseFloat(u.printing ?? c.printing ?? 0),
            sublimation: parseFloat(u.sublimation ?? c.sublimation ?? 0),
            acc1: parseFloat(u.acc1 ?? c.acc1 ?? 0),
            acc2: parseFloat(u.acc2 ?? c.acc2 ?? 0),
            acc3: parseFloat(u.acc3 ?? c.acc3 ?? 0),
            pattern: parseFloat(u.pattern ?? c.pattern ?? 0),
            allowances: parseFloat(u.allowances ?? c.allowances ?? 0),
            overheads: parseFloat(u.overheads ?? c.overheads ?? 0),
            profitPct: parseFloat(u.profitPct ?? c.profitPct ?? 0),
            spPc: parseFloat(u.spPc ?? c.retailPrice ?? 0),
            cpPc: parseFloat(u.cpPc ?? c.totalUnitCost ?? 0)
        });

        renderSizeGrid();
        syncFormFromStore();
        recalcAdvanced();
        window.showToast?.('Costing loaded', 'success');

    } catch (e) {
        console.error('Error loading costing:', e);
        window.showToast?.('Could not load costing', 'error');
    }
}

function restoreDraftSession() {
    try {
        const raw = sessionStorage.getItem('gos_calc_v2_draft');
        if (!raw) return;
        const d = JSON.parse(raw);
        if (d && d.u) {
            store.update(d.u);
            if (d.sharedClient) store.update({ clientName: d.sharedClient });
        }
    } catch (_) {}
}

window.openQuotePreview = function() {
    window.print();
};
