import { api } from '../services/api.js?v=5.2';
import { advancedCalculatorStore as store } from '../stores/AdvancedCalculatorStore.js?v=5.2';

const $ = (id) => document.getElementById(id);
const num = (id) => parseFloat($(id)?.value) || 0;

// ══════════════════════════════════════════════════════
//  INITIALIZATION & RENDER
// ══════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
    try {
        if(typeof window.initTheme==='function') window.initTheme();
        if(typeof window.initNav==='function') {
            await window.initNav();
            setTimeout(() => {
                const chips = document.querySelectorAll('#nav-chips button');
                chips.forEach(c => c.classList.remove('active'));
                const calcBtn = Array.from(chips).find(c => c.textContent.trim() === 'Calculator');
                if (calcBtn) calcBtn.classList.add('active');
            }, 100);
        }
        
        // Check URL for ID (Edit mode)
        const params = new URLSearchParams(window.location.search);
        const id = params.get('id');
        if (id) {
            await loadCosting(id);
            if(params.get('action')==='print') {
                setTimeout(() => window.print(), 500);
            }
        } else {
            renderSizeGrid();
            bindInputs();
            recalcAdvanced();
        }
        
        $('btn-save-draft')?.addEventListener('click', () => saveCosting('draft'));
        $('btn-create-quote')?.addEventListener('click', () => saveCosting('quote'));
        
    } catch(e) {
        console.error('Init Error:', e);
    }
});

// ══════════════════════════════════════════════════════
//  GRID RENDERER
// ══════════════════════════════════════════════════════
function renderSizeGrid() {
    const s = store.state;
    const grid = $('mod-sizes-grid');
    if (!grid) return;
    
    grid.innerHTML = s.sizes.map((sz, idx) => `
        <div class="grid grid-cols-12 gap-2 px-2 py-1 items-center bg-surface-variant/20 dark:bg-slate-800/50 rounded-lg mb-1">
            <div class="col-span-1 text-[12px] font-bold text-on-surface">${sz.name}</div>
            <div class="col-span-2">
                <input type="number" class="calc-input !py-1 !px-2 text-center" value="${sz.qty}" oninput="updateSize(${idx}, 'qty', this.value)">
            </div>
            <div class="col-span-2">
                <input type="number" class="calc-input !py-1 !px-2 text-center" value="${sz.bodyL}" oninput="updateSize(${idx}, 'bodyL', this.value)">
            </div>
            <div class="col-span-2">
                <input type="number" class="calc-input !py-1 !px-2 text-center" value="${sz.chest}" oninput="updateSize(${idx}, 'chest', this.value)">
            </div>
            <div class="col-span-2">
                <input type="number" class="calc-input !py-1 !px-2 text-center" value="${sz.slvL}" oninput="updateSize(${idx}, 'slvL', this.value)">
            </div>
            <div class="col-span-2">
                <input type="number" class="calc-input !py-1 !px-2 text-center" value="${sz.slvDia}" oninput="updateSize(${idx}, 'slvDia', this.value)">
            </div>
            <div class="col-span-1 text-right text-[12px] font-bold text-primary tabular-nums">
                ${sz.weightGms > 0 ? sz.weightGms.toFixed(0) : '0'}
            </div>
        </div>
    `).join('');
}

window.updateSize = function(idx, field, val) {
    const s = store.state;
    const sizes = [...s.sizes];
    sizes[idx] = { ...sizes[idx], [field]: parseFloat(val) || 0 };
    store.update({ sizes });
    window.recalcAdvanced();
};

// ══════════════════════════════════════════════════════
//  CORE ENGINE
// ══════════════════════════════════════════════════════
function bindInputs() {
    const s = store.state;
    // Set UI values from store
    const set = (id, val) => { if($(id)) $(id).value = val || ''; };
    set('adv-client', s.clientName);
    set('adv-garment-type', s.garmentType);
    set('pat-body-m', s.bodyLM);
    set('pat-chest-m', s.chestM);
    set('pat-slv-m', s.slvLM);
    set('pat-dia-m', s.slvDiaM);
    set('pat-gsm', s.gsm);
    set('pat-wastage', s.wastage);
    set('pat-price-kg', s.fabricPriceKg);
    set('u-cmt', s.cmt);
    set('u-cutting', s.cutting);
    set('u-fusing', s.fusing);
    set('u-wages', s.wages);
    set('u-packing', s.packing);
    set('u-printing', s.printing);
    set('u-sublimation', s.sublimation);
    set('u-allowances', s.allowances);
    set('u-overheads', s.overheads);
    set('u-acc1', s.acc1);
    set('u-acc2', s.acc2);
    set('u-acc3', s.acc3);
    set('u-pattern', s.pattern);
    set('adv-profit-pct', s.profitPct);
    
    // CMT Mode UI
    if (s.cmtMode === 'separate') {
        const btn = document.querySelector('button[onclick="setAdvancedCMTMode(\'separate\')"]');
        if (btn) btn.click();
    } else {
        const btn = document.querySelector('button[onclick="setAdvancedCMTMode(\'combined\')"]');
        if (btn) btn.click();
    }
    
    // Attach events
    const ids = ['adv-client', 'adv-garment-type', 'pat-body-m', 'pat-chest-m', 'pat-slv-m', 'pat-dia-m', 'pat-gsm', 'pat-wastage', 'pat-price-kg',
                 'u-cmt', 'u-cutting', 'u-fusing', 'u-wages', 'u-packing', 'u-printing', 'u-sublimation', 'u-allowances', 'u-overheads',
                 'u-acc1', 'u-acc2', 'u-acc3', 'u-pattern', 'adv-profit-pct'];
    
    ids.forEach(id => {
        $(id)?.addEventListener('input', () => window.recalcAdvanced());
    });
}

window.recalcAdvanced = function() {
    const s = store.state;
    
    // 1. Read Globals
    const bodyLM = num('pat-body-m');
    const chestM = num('pat-chest-m');
    const slvLM = num('pat-slv-m');
    const slvDiaM = num('pat-dia-m');
    const gsm = num('pat-gsm');
    const wastage = num('pat-wastage');
    const priceKg = num('pat-price-kg');
    
    // 2. Calculate weight for each size
    let totalQty = 0;
    let totalKgs = 0;
    const newSizes = s.sizes.map(sz => {
        let weightGms = 0;
        if (gsm > 0 && (sz.bodyL > 0 || sz.chest > 0)) {
            const bodyGms = (sz.bodyL + bodyLM) * (sz.chest + chestM) * 2 * gsm / 10000;
            const slvGms = (sz.slvL + slvLM) * (sz.slvDia + slvDiaM) * 2 * gsm / 10000;
            weightGms = bodyGms + slvGms;
        }
        totalQty += sz.qty;
        totalKgs += (weightGms * sz.qty) / 1000;
        return { ...sz, weightGms };
    });
    
    // Apply wastage to total Kgs
    const totalFabricKgs = totalKgs * (1 + wastage/100);
    const avgWeightGms = totalQty > 0 ? (totalKgs * 1000) / totalQty : 0;
    const pcsPerKg = avgWeightGms > 0 ? 1000 / avgWeightGms : 0;
    const totalFabricCost = totalFabricKgs * priceKg;
    const fabricCostPc = totalQty > 0 ? totalFabricCost / totalQty : 0;
    
    // 3. Read other cost factors
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
    const profitPct = num('adv-profit-pct');
    const clientName = $('adv-client')?.value || '';
    const garmentType = $('adv-garment-type')?.value || 'Garment';
    
    // Costing
    const cmtTotalPc = mode === 'combined' ? cmt : (cutting + fusing + wages + packing);
    const printingTotalPc = printing + sublimation;
    const allowancesTotalPc = allowances + overheads;
    const lumpSumTotal = acc1 + acc2 + acc3 + pattern;
    const lumpSumPc = totalQty > 0 ? lumpSumTotal / totalQty : 0;
    
    const cpPc = fabricCostPc + cmtTotalPc + printingTotalPc + allowancesTotalPc + lumpSumPc;
    const totalCost = cpPc * totalQty;
    
    const spPc = cpPc * (1 + profitPct/100);
    const totalSales = spPc * totalQty;
    const profitDone = totalSales - totalCost;
    
    store.update({
        clientName, garmentType,
        sizes: newSizes, totalQty,
        bodyLM, chestM, slvLM, slvDiaM, gsm, wastage, fabricPriceKg: priceKg,
        totalFabricKgs, avgWeightGms, pcsPerKg, fabricCostPc,
        cmt, cutting, fusing, wages, packing,
        printing, sublimation, allowances, overheads,
        acc1, acc2, acc3, pattern, profitPct,
        cpPc, totalCost, spPc, totalSales, profitDone
    });
    
    updateUI();
};

function updateUI() {
    const s = store.state;
    renderSizeGrid(); // re-render grid to update weights
    
    if ($('adv-total-qty')) $('adv-total-qty').textContent = s.totalQty;
    if ($('res-total-kgs')) $('res-total-kgs').textContent = s.totalFabricKgs.toFixed(2) + ' kg';
    if ($('res-fab-cost-pc')) $('res-fab-cost-pc').textContent = s.currency + s.fabricCostPc.toFixed(2);
    
    if ($('adv-total-cost')) $('adv-total-cost').textContent = s.currency + (s.totalCost > 0 ? s.totalCost.toFixed(2) : '0.00');
    if ($('adv-cost-pc')) $('adv-cost-pc').textContent = s.currency + (s.cpPc > 0 ? s.cpPc.toFixed(2) : '0.00');
    if ($('adv-sp-pc')) $('adv-sp-pc').textContent = s.currency + (s.spPc > 0 ? s.spPc.toFixed(2) : '0.00');
}

// ══════════════════════════════════════════════════════
//  SAVE / LOAD
// ══════════════════════════════════════════════════════
async function saveCosting(status) {
    const s = store.state;
    if (!s.clientName) {
        if(window.showToast) window.showToast('Client Name is required', 'error');
        return;
    }
    if (s.totalQty <= 0) {
        if(window.showToast) window.showToast('Total Quantity must be greater than 0', 'error');
        return;
    }

    const btnDraft = $('btn-save-draft');
    const btnQuote = $('btn-create-quote');
    const oTextDraft = btnDraft ? btnDraft.textContent : '';
    const oTextQuote = btnQuote ? btnQuote.textContent : '';

    if (btnDraft) btnDraft.textContent = 'Saving...';
    if (btnQuote) btnQuote.textContent = 'Saving...';

    try {
        // Build Materials array for Costing List view (matching old calculator)
        const materials = [
            { name: 'Fabric Cost/pc',  unit: 'per pc', cost: s.fabricCostPc  || 0 },
            { name: 'Fabric Price/kg', unit: 'per kg', cost: s.fabricPriceKg || 0 },
            { name: 'Avg Pcs per kg',  unit: 'count',  cost: s.pcsPerKg      || 0 },
            { name: 'Wastage',         unit: '%',       cost: s.wastage       || 0 },
            { name: 'CMT (combined)',  unit: 'per pc',  cost: s.cmtMode === 'combined' ? (s.cmt    || 0) : 0 },
            { name: 'Cutting',         unit: 'per pc',  cost: s.cmtMode === 'separate' ? (s.cutting|| 0) : 0 },
            { name: 'Fusing',          unit: 'per pc',  cost: s.cmtMode === 'separate' ? (s.fusing || 0) : 0 },
            { name: 'Wages',           unit: 'per pc',  cost: s.cmtMode === 'separate' ? (s.wages  || 0) : 0 },
            { name: 'Packing',         unit: 'per pc',  cost: s.cmtMode === 'separate' ? (s.packing|| 0) : 0 },
            { name: 'Printing',        unit: 'per pc',  cost: s.printing     || 0 },
            { name: 'Sublimation',     unit: 'per pc',  cost: s.sublimation  || 0 },
            { name: 'Allowances',      unit: 'per pc',  cost: s.allowances   || 0 },
            { name: 'Overheads',       unit: 'per pc',  cost: s.overheads    || 0 },
            { name: 'Accessory 1',     unit: 'lump',    cost: s.acc1         || 0 },
            { name: 'Accessory 2',     unit: 'lump',    cost: s.acc2         || 0 },
            { name: 'Accessory 3',     unit: 'lump',    cost: s.acc3         || 0 },
            { name: 'Pattern',         unit: 'lump',    cost: s.pattern      || 0 },
        ].filter(m => m.cost > 0);

        const params = new URLSearchParams(window.location.search);
        const editId = params.get('id');

        const payload = {
            id: editId || 'adv_' + Date.now(),
            date: new Date().toISOString(),
            styleRef: s.garmentType,
            clientId: s.clientName,
            clientName: s.clientName,
            garmentType: s.garmentType,
            currency: s.currency,
            mode: 'advanced', // size-by-size
            qty: s.totalQty,
            totalUnitCost: s.cpPc,
            retailPrice: s.spPc,
            totalCost: s.totalCost,
            profitPct: s.profitPct,
            totalSales: s.totalSales,
            profitDone: s.profitDone,
            status: status,
            materials: materials,
            // Full store state for exact restore
            uData: { ...s }
        };

        if (editId) {
            await api.put(`/costings/${editId}`, payload);
            if(window.showToast) window.showToast('Costing updated successfully!', 'success');
        } else {
            await api.post('/costings', payload);
            if(window.showToast) window.showToast('Costing saved successfully!', 'success');
            setTimeout(() => {
                window.location.href = `costings.html`;
            }, 1000);
        }
    } catch (error) {
        console.error('Save failed:', error);
        if(window.showToast) window.showToast('Failed to save. Check console.', 'error');
    } finally {
        if (btnDraft) btnDraft.textContent = oTextDraft;
        if (btnQuote) btnQuote.textContent = oTextQuote;
    }
}

async function loadCosting(id) {
    try {
        const item = await api.get(`/costings/${id}`);
        if (!item || !item.uData) throw new Error('Costing not found or invalid format');
        
        store.update(item.uData);
        
        const delBtn = $('btn-delete');
        if (delBtn) {
            delBtn.classList.remove('hidden');
            delBtn.onclick = async () => {
                if (confirm('Delete this costing?')) {
                    await api.delete(`/costings/${id}`);
                    window.location.href = 'costings.html';
                }
            };
        }
        
        bindInputs();
        window.recalcAdvanced();
        
    } catch (e) {
        console.error('Load error:', e);
        if(window.showToast) window.showToast('Error loading costing', 'error');
    }
}
