import { advancedCalculatorStore as store } from '../stores/AdvancedCalculatorStore.js';

/**
 * Helper to update a specific array item
 */
function updateArrayItem(arrayKey, index, updates) {
    const arr = [...store.state[arrayKey]];
    arr[index] = { ...arr[index], ...updates };
    store.update({ [arrayKey]: arr });
}

// ── Rendering Modules ──────────────────────────────────────────────

function renderSizes() {
    const { sizes, totalQty } = store.state;
    let html = `
    <div class="bg-surface dark:bg-slate-900 border border-outline-variant/30 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
        <div class="flex items-center justify-between mb-4">
            <h2 class="text-[16px] font-bold text-on-surface dark:text-slate-100 flex items-center gap-2">
                <span class="material-symbols-outlined text-primary text-[20px]">straighten</span> Size Ratio
            </h2>
            <div class="bg-primary/10 text-primary px-3 py-1 rounded-xl text-[12px] font-bold">
                Total: ${totalQty} pcs
            </div>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            ${sizes.map((s, i) => `
                <div class="bg-surface-variant/30 dark:bg-slate-800 rounded-2xl p-3 flex flex-col gap-1 border border-outline-variant/10 dark:border-slate-700">
                    <div class="flex justify-between items-center">
                        <span class="text-[13px] font-bold">${s.name}</span>
                        <input type="number" class="size-ratio-input w-12 h-6 text-[12px] bg-white dark:bg-slate-900 border-none rounded text-center outline-none p-0" data-idx="${i}" value="${s.ratio}" placeholder="Ratio">
                    </div>
                    <div class="text-[11px] text-secondary text-right mt-1">${s.qty} pcs</div>
                </div>
            `).join('')}
        </div>
        <div class="mt-4 flex items-center justify-between bg-surface-container-low dark:bg-slate-900/50 p-3 rounded-2xl border border-outline-variant/30 dark:border-slate-800">
             <span class="text-[13px] font-semibold text-secondary">Target Order Quantity</span>
             <input type="number" id="adv-target-qty" value="${totalQty}" class="w-24 h-8 text-[14px] font-bold text-right bg-white dark:bg-slate-800 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary/20">
        </div>
    </div>
    `;
    document.getElementById('mod-sizes').innerHTML = html;
    
    // Attach listeners
    document.querySelectorAll('.size-ratio-input').forEach(el => {
        el.addEventListener('input', (e) => {
            const idx = parseInt(e.target.dataset.idx);
            updateArrayItem('sizes', idx, { ratio: parseFloat(e.target.value) || 0 });
            recalcSizes();
        });
    });
    
    document.getElementById('adv-target-qty').addEventListener('input', (e) => {
        store.update({ totalQty: parseInt(e.target.value) || 0 });
        recalcSizes();
    });
}

function recalcSizes() {
    const { sizes, totalQty } = store.state;
    const totalRatio = sizes.reduce((sum, s) => sum + s.ratio, 0);
    const newSizes = sizes.map(s => ({
        ...s,
        qty: totalRatio > 0 ? Math.round((s.ratio / totalRatio) * totalQty) : 0
    }));
    store.update({ sizes: newSizes });
    recalcAll();
}

function renderFabrics() {
    const { components } = store.state;
    let html = `
    <div class="bg-surface dark:bg-slate-900 border border-outline-variant/30 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
        <div class="flex items-center justify-between mb-4">
            <h2 class="text-[16px] font-bold text-on-surface dark:text-slate-100 flex items-center gap-2">
                <span class="material-symbols-outlined text-[#0071E3] text-[20px]">layers</span> Multi-Fabric BOM
            </h2>
            <button id="btn-add-fabric" class="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors">
                <span class="material-symbols-outlined text-[20px]">add</span>
            </button>
        </div>
        <div class="flex flex-col gap-4">
            ${components.map((c, i) => `
                <div class="bg-surface-variant/20 dark:bg-slate-800/50 rounded-2xl p-4 border border-outline-variant/30 dark:border-slate-700 relative group">
                    ${components.length > 1 ? `
                    <button class="btn-remove-fabric absolute top-3 right-3 w-6 h-6 rounded-full bg-error/10 text-error flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" data-idx="${i}">
                        <span class="material-symbols-outlined text-[14px]">close</span>
                    </button>` : ''}
                    
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3 pr-8">
                        <div>
                            <label class="text-[10px] uppercase font-bold text-secondary tracking-wider block mb-1">Component Name</label>
                            <input type="text" class="fabric-inp w-full bg-white dark:bg-slate-800 border-none rounded-xl text-[13px] p-2 outline-none" data-field="name" data-idx="${i}" value="${c.name}">
                        </div>
                        <div>
                            <label class="text-[10px] uppercase font-bold text-secondary tracking-wider block mb-1">Price / kg (₹)</label>
                            <input type="number" class="fabric-inp w-full bg-white dark:bg-slate-800 border-none rounded-xl text-[13px] p-2 outline-none" data-field="fabricPriceKg" data-idx="${i}" value="${c.fabricPriceKg}">
                        </div>
                        <div>
                            <label class="text-[10px] uppercase font-bold text-secondary tracking-wider block mb-1">Fabric GSM</label>
                            <input type="number" class="fabric-inp w-full bg-white dark:bg-slate-800 border-none rounded-xl text-[13px] p-2 outline-none" data-field="gsm" data-idx="${i}" value="${c.gsm}">
                        </div>
                        <div>
                            <label class="text-[10px] uppercase font-bold text-secondary tracking-wider block mb-1">Wastage %</label>
                            <input type="number" class="fabric-inp w-full bg-white dark:bg-slate-800 border-none rounded-xl text-[13px] p-2 outline-none" data-field="wastage" data-idx="${i}" value="${c.wastage}">
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-4 gap-2 mb-3 bg-white dark:bg-slate-900 rounded-xl p-2 border border-outline-variant/10 dark:border-slate-700">
                        <div class="col-span-4 text-[11px] font-bold text-secondary mb-1">Base Pattern Dimensions (inches)</div>
                        <div><input type="number" class="fabric-inp w-full border-none rounded bg-surface-variant/30 dark:bg-slate-800 text-[12px] p-1.5 text-center" placeholder="Body L" data-field="bodyL" data-idx="${i}" value="${c.bodyL || ''}"></div>
                        <div><input type="number" class="fabric-inp w-full border-none rounded bg-surface-variant/30 dark:bg-slate-800 text-[12px] p-1.5 text-center" placeholder="Body +M" data-field="bodyLM" data-idx="${i}" value="${c.bodyLM || ''}"></div>
                        <div><input type="number" class="fabric-inp w-full border-none rounded bg-surface-variant/30 dark:bg-slate-800 text-[12px] p-1.5 text-center" placeholder="Chest W" data-field="chest" data-idx="${i}" value="${c.chest || ''}"></div>
                        <div><input type="number" class="fabric-inp w-full border-none rounded bg-surface-variant/30 dark:bg-slate-800 text-[12px] p-1.5 text-center" placeholder="Chest +M" data-field="chestM" data-idx="${i}" value="${c.chestM || ''}"></div>
                        <div><input type="number" class="fabric-inp w-full border-none rounded bg-surface-variant/30 dark:bg-slate-800 text-[12px] p-1.5 text-center" placeholder="Slv L" data-field="slvL" data-idx="${i}" value="${c.slvL || ''}"></div>
                        <div><input type="number" class="fabric-inp w-full border-none rounded bg-surface-variant/30 dark:bg-slate-800 text-[12px] p-1.5 text-center" placeholder="Slv +M" data-field="slvLM" data-idx="${i}" value="${c.slvLM || ''}"></div>
                        <div><input type="number" class="fabric-inp w-full border-none rounded bg-surface-variant/30 dark:bg-slate-800 text-[12px] p-1.5 text-center" placeholder="Slv Dia" data-field="slvDia" data-idx="${i}" value="${c.slvDia || ''}"></div>
                        <div><input type="number" class="fabric-inp w-full border-none rounded bg-surface-variant/30 dark:bg-slate-800 text-[12px] p-1.5 text-center" placeholder="Dia +M" data-field="slvDiaM" data-idx="${i}" value="${c.slvDiaM || ''}"></div>
                    </div>
                    
                    <div class="flex items-center justify-between mt-2 pt-2 border-t border-outline-variant/20 dark:border-slate-700">
                        <div class="text-[12px] text-secondary">Est. Wt: <span id="fab-wt-${i}" class="font-bold text-on-surface dark:text-slate-200">${c.weightGms?.toFixed(1) || 0} gms</span></div>
                        <div id="fab-cost-${i}" class="text-[14px] font-bold text-[#0071E3]">₹${c.costPc?.toFixed(2) || '0.00'} / pc</div>
                    </div>
                </div>
            `).join('')}
        </div>
    </div>
    `;
    document.getElementById('mod-fabrics').innerHTML = html;
    
    document.getElementById('btn-add-fabric').addEventListener('click', () => {
        const components = [...store.state.components, {
            id: 'c' + Date.now(), name: 'New Component', fabricPriceKg: 0, wastage: 5,
            bodyL: 0, bodyLM: 0, chest: 0, chestM: 0, slvL: 0, slvLM: 0, slvDia: 0, slvDiaM: 0,
            gsm: 0, weightGms: 0, costPc: 0
        }];
        store.update({ components });
        renderFabrics();
        recalcAll();
    });
    
    document.querySelectorAll('.btn-remove-fabric').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.currentTarget.dataset.idx);
            const components = store.state.components.filter((_, i) => i !== idx);
            store.update({ components });
            renderFabrics();
            recalcAll();
        });
    });

    document.querySelectorAll('.fabric-inp').forEach(inp => {
        inp.addEventListener('input', (e) => {
            const idx = parseInt(e.target.dataset.idx);
            const field = e.target.dataset.field;
            let val = e.target.value;
            if (field !== 'name') val = parseFloat(val) || 0;
            updateArrayItem('components', idx, { [field]: val });
            recalcAll();
        });
    });
}

function renderTrims() {
    const { trims } = store.state;
    let html = `
    <div class="bg-surface dark:bg-slate-900 border border-outline-variant/30 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
        <div class="flex items-center justify-between mb-4">
            <h2 class="text-[16px] font-bold text-on-surface dark:text-slate-100 flex items-center gap-2">
                <span class="material-symbols-outlined text-[#FF3B30] text-[20px]">category</span> Trims & BOM
            </h2>
            <button id="btn-add-trim" class="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors">
                <span class="material-symbols-outlined text-[20px]">add</span>
            </button>
        </div>
        <div class="flex flex-col gap-2">
            <!-- Header -->
            <div class="grid grid-cols-12 gap-2 px-2 pb-1 border-b border-outline-variant/20 dark:border-slate-800">
                <div class="col-span-4 text-[10px] font-bold text-secondary uppercase">Item Name</div>
                <div class="col-span-3 text-[10px] font-bold text-secondary uppercase text-center">Cons / pc</div>
                <div class="col-span-3 text-[10px] font-bold text-secondary uppercase text-right">Rate (₹)</div>
                <div class="col-span-2 text-[10px] font-bold text-secondary uppercase text-right">Cost</div>
            </div>
            ${trims.map((t, i) => `
                <div class="grid grid-cols-12 gap-2 items-center bg-surface-variant/20 dark:bg-slate-800/40 p-2 rounded-xl group relative">
                    <button class="btn-remove-trim absolute -left-2 -top-2 w-5 h-5 rounded-full bg-error text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10" data-idx="${i}">
                        <span class="material-symbols-outlined text-[12px]">close</span>
                    </button>
                    <div class="col-span-4">
                        <input type="text" class="trim-inp w-full bg-white dark:bg-slate-900 border-none rounded-lg text-[12px] p-1.5 outline-none" data-field="name" data-idx="${i}" value="${t.name}">
                    </div>
                    <div class="col-span-3">
                        <input type="number" class="trim-inp w-full bg-white dark:bg-slate-900 border-none rounded-lg text-[12px] p-1.5 text-center outline-none" data-field="cons" data-idx="${i}" value="${t.cons}" placeholder="e.g. 1.2">
                    </div>
                    <div class="col-span-3">
                        <input type="number" class="trim-inp w-full bg-white dark:bg-slate-900 border-none rounded-lg text-[12px] p-1.5 text-right outline-none" data-field="rate" data-idx="${i}" value="${t.rate}">
                    </div>
                    <div class="col-span-2 text-right pr-1">
                        <span id="trim-cost-${i}" class="text-[13px] font-bold text-on-surface dark:text-slate-200">₹${t.costPc?.toFixed(2) || '0.00'}</span>
                    </div>
                </div>
            `).join('')}
        </div>
    </div>
    `;
    document.getElementById('mod-trims').innerHTML = html;
    
    document.getElementById('btn-add-trim').addEventListener('click', () => {
        const trims = [...store.state.trims, {
            id: 't' + Date.now(), name: 'New Item', unit: 'pc', cons: 1, rate: 0, costPc: 0
        }];
        store.update({ trims });
        renderTrims();
        recalcAll();
    });
    
    document.querySelectorAll('.btn-remove-trim').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.currentTarget.dataset.idx);
            const trims = store.state.trims.filter((_, i) => i !== idx);
            store.update({ trims });
            renderTrims();
            recalcAll();
        });
    });

    document.querySelectorAll('.trim-inp').forEach(inp => {
        inp.addEventListener('input', (e) => {
            const idx = parseInt(e.target.dataset.idx);
            const field = e.target.dataset.field;
            let val = e.target.value;
            if (field !== 'name') val = parseFloat(val) || 0;
            updateArrayItem('trims', idx, { [field]: val });
            recalcAll();
        });
    });
}

function renderVAS() {
    const s = store.state;
    let html = `
    <div class="bg-surface dark:bg-slate-900 border border-outline-variant/30 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
        <h2 class="text-[16px] font-bold text-on-surface dark:text-slate-100 flex items-center gap-2 mb-4">
            <span class="material-symbols-outlined text-[#AF52DE] text-[20px]">precision_manufacturing</span> CMT & Value Adds
        </h2>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
                <label class="text-[11px] font-semibold text-secondary block mb-1">CMT Total / pc</label>
                <div class="relative">
                    <span class="absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-[13px]">₹</span>
                    <input type="number" id="adv-cmt" value="${s.cmt}" class="w-full bg-surface-variant/30 dark:bg-slate-800 border-none rounded-xl pl-7 py-2.5 text-[14px] font-semibold outline-none focus:ring-2 focus:ring-primary/20">
                </div>
            </div>
            <div>
                <label class="text-[11px] font-semibold text-secondary block mb-1">Washing / pc</label>
                <div class="relative">
                    <span class="absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-[13px]">₹</span>
                    <input type="number" id="adv-washing" value="${s.washing}" class="w-full bg-surface-variant/30 dark:bg-slate-800 border-none rounded-xl pl-7 py-2.5 text-[14px] font-semibold outline-none focus:ring-2 focus:ring-primary/20">
                </div>
            </div>
            <div>
                <label class="text-[11px] font-semibold text-secondary block mb-1">Embroidery / pc</label>
                <div class="relative">
                    <span class="absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-[13px]">₹</span>
                    <input type="number" id="adv-emb" value="${s.embroidery}" class="w-full bg-surface-variant/30 dark:bg-slate-800 border-none rounded-xl pl-7 py-2.5 text-[14px] font-semibold outline-none focus:ring-2 focus:ring-primary/20">
                </div>
            </div>
            <div>
                <label class="text-[11px] font-semibold text-secondary block mb-1">Printing / pc</label>
                <div class="relative">
                    <span class="absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-[13px]">₹</span>
                    <input type="number" id="adv-printing" value="${s.printing}" class="w-full bg-surface-variant/30 dark:bg-slate-800 border-none rounded-xl pl-7 py-2.5 text-[14px] font-semibold outline-none focus:ring-2 focus:ring-primary/20">
                </div>
            </div>
            <div>
                <label class="text-[11px] font-semibold text-secondary block mb-1">Freight/Logistics / pc</label>
                <div class="relative">
                    <span class="absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-[13px]">₹</span>
                    <input type="number" id="adv-freight" value="${s.freight}" class="w-full bg-surface-variant/30 dark:bg-slate-800 border-none rounded-xl pl-7 py-2.5 text-[14px] font-semibold outline-none focus:ring-2 focus:ring-primary/20">
                </div>
            </div>
            <div>
                <label class="text-[11px] font-semibold text-secondary block mb-1">Other / pc</label>
                <div class="relative">
                    <span class="absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-[13px]">₹</span>
                    <input type="number" id="adv-other" value="${s.other}" class="w-full bg-surface-variant/30 dark:bg-slate-800 border-none rounded-xl pl-7 py-2.5 text-[14px] font-semibold outline-none focus:ring-2 focus:ring-primary/20">
                </div>
            </div>
        </div>
    </div>
    `;
    document.getElementById('mod-vas').innerHTML = html;
    
    const bind = (id, field) => {
        document.getElementById(id).addEventListener('input', (e) => {
            store.update({ [field]: parseFloat(e.target.value) || 0 });
            recalcAll();
        });
    };
    
    bind('adv-cmt', 'cmt');
    bind('adv-washing', 'washing');
    bind('adv-emb', 'embroidery');
    bind('adv-printing', 'printing');
    bind('adv-freight', 'freight');
    bind('adv-other', 'other');
}

// ── Master Calculation ──────────────────────────────────────────────

function recalcAll() {
    const s = store.state;
    
    // 1. Calculate Multi-Fabric Cost
    const updatedComponents = s.components.map(c => {
        let weightGms = 0;
        let costPc = 0;
        
        if (c.gsm > 0) {
            const bodyGms = (c.bodyL + c.bodyLM) * (c.chest + c.chestM) * 2 * c.gsm / 10000;
            const slvGms = (c.slvL + c.slvLM) * (c.slvDia + c.slvDiaM) * 2 * c.gsm / 10000;
            weightGms = bodyGms + slvGms;
        }
        
        if (weightGms > 0 && c.fabricPriceKg > 0) {
            const kgPerPc = weightGms / 1000;
            const baseCost = kgPerPc * c.fabricPriceKg;
            costPc = baseCost * (1 + c.wastage / 100);
        }
        return { ...c, weightGms, costPc };
    });
    
    // 2. Calculate Trims Cost
    const updatedTrims = s.trims.map(t => {
        const costPc = t.cons * t.rate;
        return { ...t, costPc };
    });
    
    // 3. Aggregate Total Cost Price (CP)
    const totalFabricPc = updatedComponents.reduce((sum, c) => sum + c.costPc, 0);
    const totalTrimsPc = updatedTrims.reduce((sum, t) => sum + t.costPc, 0);
    const totalVASPc = s.cmt + s.washing + s.embroidery + s.printing + s.freight + s.other;
    
    const cpPc = totalFabricPc + totalTrimsPc + totalVASPc;
    const totalCost = cpPc * s.totalQty;
    
    // 4. Selling Price (SP)
    const spPc = cpPc / (1 - (s.profitPct / 100));
    const totalSales = spPc * s.totalQty;
    const profitDone = totalSales - totalCost;
    
    // Apply updates quietly without infinite loops
    store.state = {
        ...s,
        components: updatedComponents,
        trims: updatedTrims,
        cpPc, totalCost, spPc, totalSales, profitDone
    };
    
    updateUIOutputs();
}

function updateUIOutputs() {
    const s = store.state;
    
    // Re-render only if strictly needed, but to avoid focus loss, we will just 
    // update the specific result spans in the DOM directly.
    s.components.forEach((c, i) => {
        const wtEl = document.getElementById(`fab-wt-${i}`);
        const costEl = document.getElementById(`fab-cost-${i}`);
        if (wtEl) wtEl.textContent = `${c.weightGms.toFixed(1)} gms`;
        if (costEl) costEl.textContent = `₹${c.costPc.toFixed(2)} / pc`;
    });
    
    s.trims.forEach((t, i) => {
        const costEl = document.getElementById(`trim-cost-${i}`);
        if (costEl) costEl.textContent = `₹${t.costPc.toFixed(2)}`;
    });
    
    document.getElementById('adv-total-cost').textContent = `₹${s.totalCost.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}`;
    document.getElementById('adv-cost-pc').textContent = `₹${s.cpPc.toFixed(2)}`;
    document.getElementById('adv-sp-pc').textContent = `₹${s.spPc.toFixed(2)}`;
}

// ── Initialization & Subscriptions ─────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    renderSizes();
    renderFabrics();
    renderTrims();
    renderVAS();
    recalcAll();
    
    document.getElementById('adv-profit-pct').addEventListener('input', (e) => {
        store.update({ profitPct: parseFloat(e.target.value) || 0 });
        recalcAll();
        // Skip re-rendering everything if just updating profit
        const s = store.state;
        document.getElementById('adv-sp-pc').textContent = `₹${s.spPc.toFixed(2)}`;
    });
    
    document.getElementById('adv-client').addEventListener('input', (e) => store.state.clientName = e.target.value);
    document.getElementById('adv-garment-type').addEventListener('input', (e) => store.state.garmentType = e.target.value);
    
    document.getElementById('btn-save-draft').addEventListener('click', saveAdvancedCosting);
});

async function saveAdvancedCosting() {
    window.startSubtleLoading?.();
    const btn = document.getElementById('btn-save-draft');
    btn.disabled = true;
    btn.textContent = 'Saving...';
    
    const s = store.state;
    const payload = {
        id: 'adv_' + Date.now().toString(),
        styleRef: s.garmentType,
        clientId: s.clientName,
        clientName: s.clientName,
        garmentType: s.garmentType,
        currency: s.currency,
        mode: 'advanced', // critical for the backend & viewer sheet
        totalUnitCost: s.cpPc,
        retailPrice: s.spPc,
        status: 'Draft',
        uData: s, // Store massive JSON state entirely
    };
    
    try {
        const { api } = await import('/js/services/api.js');
        await api.saveCosting(payload);
        window.showToast?.('Advanced Costing Saved!', 'success');
        setTimeout(() => window.location.href = 'costings.html', 800);
    } catch (e) {
        console.error(e);
        window.showToast?.('Failed to save costing', 'error');
        btn.disabled = false;
        btn.textContent = 'Save Draft';
    } finally {
        window.finishSubtleLoading?.();
    }
}
