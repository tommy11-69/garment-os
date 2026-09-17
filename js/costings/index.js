import { api } from '../services/api.js?v=5.2';

const $ = (id) => document.getElementById(id);

async function loadCostings() {
    const listEl = $('costings-list');
    const emptyState = $('empty-state');
    const loadingState = $('loading-state');

    if (!listEl || !emptyState || !loadingState) return;

    listEl.classList.add('hidden');
    emptyState.classList.add('hidden');
    loadingState.classList.remove('hidden');

    try {
        const costings = await api.getCostings();

        loadingState.classList.add('hidden');

        if (!costings || costings.length === 0 || costings.error) {
            emptyState.classList.remove('hidden');
            return;
        }

        listEl.classList.remove('hidden');
        listEl.innerHTML = costings.map(c => {
            const date = new Date(c.createdAt || c.date).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric'
            });
            const cp = c.totalUnitCost || 0;
            const sp = c.retailPrice || 0;
            const profit = (cp > 0 && sp > 0) ? (((sp - cp) / cp) * 100).toFixed(1) + '%' : '—';
            const profitClass = (cp > 0 && sp > 0 && (sp - cp) >= 0) ? 'text-[#34C759]' : 'text-error';

            return `
                <div class="costing-card p-4 flex flex-col gap-3" onclick="openCosting('${c.id}')">
                    <div class="flex justify-between items-start">
                        <div>
                            <h3 class="text-[16px] font-bold text-on-surface dark:text-white">${c.clientId || 'Unnamed Client'}</h3>
                            <p class="text-[13px] text-secondary dark:text-slate-400">${c.styleRef || 'Garment'}</p>
                        </div>
                        <div class="flex items-center gap-1.5" onclick="event.stopPropagation()">
                            <span class="text-[11px] text-secondary dark:text-slate-400 bg-surface-container-high dark:bg-slate-800/90 px-2 py-1 rounded-md font-medium border border-transparent dark:border-slate-700/50">
                                ${date}
                            </span>
                            <button type="button" onclick="printCosting('${c.id}')" title="Print Costing" class="w-7 h-7 rounded-full bg-primary/10 dark:bg-primary/20 hover:bg-primary/20 flex items-center justify-center text-primary dark:text-blue-400 active-scale transition-apple">
                                <span class="material-symbols-outlined text-[16px]">print</span>
                            </button>
                        </div>
                    </div>
                    <div class="grid grid-cols-3 gap-2 mt-1 pt-3 border-t border-outline-variant/30 dark:border-slate-800">
                        <div>
                            <p class="text-[10px] font-semibold text-secondary dark:text-slate-400 uppercase tracking-wider mb-0.5">CP/pc</p>
                            <p class="text-[14px] font-bold text-on-surface dark:text-slate-100">₹${cp.toFixed(2)}</p>
                        </div>
                        <div>
                            <p class="text-[10px] font-semibold text-secondary dark:text-slate-400 uppercase tracking-wider mb-0.5">SP/pc</p>
                            <p class="text-[14px] font-bold text-primary dark:text-blue-400">₹${sp > 0 ? sp.toFixed(2) : '—'}</p>
                        </div>
                        <div>
                            <p class="text-[10px] font-semibold text-secondary dark:text-slate-400 uppercase tracking-wider mb-0.5">Margin</p>
                            <p class="text-[14px] font-bold ${profitClass}">${profit}</p>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

    } catch (err) {
        console.error('Failed to load costings:', err);
        loadingState.classList.add('hidden');
        emptyState.classList.remove('hidden');
        window.showToast?.('Could not load costings', 'error');
    }
}

// Navigate to calculator with all saved inputs loaded
window.navigateToCalculator = function(c, autoPrint = false) {
    let uState = {};
    if (c.uData && typeof c.uData === 'object') {
        uState = { ...c.uData };
    } else if (typeof c.uData === 'string' && c.uData) {
        try { uState = JSON.parse(c.uData); } catch (_) {}
    }

    // Default fallbacks from top-level properties if not in uData
    if (!uState.garmentType) uState.garmentType = c.styleRef || c.garmentType || 'T-Shirt';
    if (!uState.cp && !uState.cpPc) uState.cp = c.totalUnitCost || 0;
    if (!uState.sp && !uState.spPc) uState.sp = c.retailPrice || 0;
    if (uState.profitPct === undefined || uState.profitPct === null) uState.profitPct = c.profitPct;
    if (!uState.lastEdited && (uState.sp || uState.spPc || c.retailPrice)) uState.lastEdited = 'sp-pc';

    const draft = {
        sharedClient: c.clientId || uState.clientName || '',
        autoPrint: !!autoPrint,
        u: uState
    };

    sessionStorage.setItem('gos_calc_v2_draft', JSON.stringify(draft));
    
    // Close sheet if open
    window.closeSheet?.('costingDetailSheet');
    
    const isAdv = c.mode === 'advanced' || uState.mode === 'advanced';
    const targetPage = isAdv ? 'advanced-calculator.html' : 'calculator.html';

    setTimeout(() => {
        const dest = autoPrint ? `${targetPage}?id=${c.id}&action=print` : `${targetPage}?id=${c.id}`;
        window.location.href = dest;
    }, 200);
};

// Print a saved costing by navigating to the calculator
window.printCosting = async function(id) {
    try {
        window.showToast?.('Opening calculator for print...', 'info');
        const c = await api.getCostingById(id);
        if (!c || c.error) {
            window.showToast?.('Costing not found', 'error');
            return;
        }
        window.navigateToCalculator(c, true);
    } catch (e) {
        console.error(e);
        window.showToast?.('Failed to open costing for print', 'error');
    }
};

// ── Detail Sheet HTML Builder ──────────────────────────────────────
function buildDetailHTML(c, sheetId) {
    // Resolve uData — could be parsed JSON or raw object from API
    let u = {};
    if (c.uData && typeof c.uData === 'object') {
        u = c.uData;
    } else if (typeof c.uData === 'string' && c.uData) {
        try { u = JSON.parse(c.uData); } catch (_) {}
    }

    const hasUData = u && Object.keys(u).length > 2;

    const rs = (v) => v > 0 ? '₹' + Number(v).toFixed(2) : '—';
    const qty = parseFloat(u.qty ?? u.totalQty ?? c.qty ?? 0);
    const cp  = parseFloat(u.cp ?? u.cpPc ?? c.totalUnitCost ?? 0);
    const sp  = parseFloat(u.sp ?? u.spPc ?? c.retailPrice ?? 0);
    const profitPct = (cp > 0 && sp > 0) ? (((sp - cp) / cp) * 100) : null;
    const profitAmt = sp > 0 ? (sp - cp) : null;
    const profitColor = (profitPct !== null && profitPct >= 0) ? '#34C759' : '#FF3B30';
    const dateStr = new Date(c.createdAt || c.date || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

    // ── Helper: a two-column field row
    const fieldRow = (label, val, sub = '') => `
        <div class="flex justify-between items-center py-3 border-b border-outline-variant/15 dark:border-slate-800/80 last:border-0">
            <span class="text-[13px] text-secondary dark:text-slate-400 font-medium tracking-wide">${label}</span>
            <div class="text-right">
                <span class="text-[14px] font-bold text-on-surface dark:text-slate-100">${val}</span>
                ${sub ? `<span class="text-[11px] text-secondary dark:text-slate-400 ml-1 font-medium">${sub}</span>` : ''}
            </div>
        </div>`;

    // ── Helper: section card wrapper
    const card = (icon, title, color, body) => `
        <div class="bg-white dark:bg-slate-900 border border-outline-variant/30 dark:border-slate-800 rounded-[20px] overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] flex-shrink-0">
            <div class="flex items-center gap-2 px-5 py-3.5 border-b border-outline-variant/15 dark:border-slate-800" style="background: ${color}14;">
                <span class="material-symbols-outlined text-[18px]" style="color:${color};">${icon}</span>
                <h3 class="text-[13px] font-bold uppercase tracking-widest" style="color:${color};">${title}</h3>
            </div>
            <div class="px-5 pb-2 pt-1 text-on-surface dark:text-slate-100">${body}</div>
        </div>`;

    // ── 1. Order Summary Card
    const savedTotalProfit = (u.profitDone !== undefined && u.profitDone !== null && u.profitDone !== 0) ? parseFloat(u.profitDone) : ((c.profitDone !== undefined && c.profitDone !== null && c.profitDone !== 0) ? parseFloat(c.profitDone) : null);
    const profitPc   = sp > 0 ? (sp - cp) : null;
    const totalProfit = savedTotalProfit !== null ? savedTotalProfit : ((profitPc !== null && qty > 0) ? profitPc * qty : null);
    const summaryCard = card('analytics', 'Order Summary', '#0071E3', `
        <div class="grid grid-cols-2 gap-2 py-3">
            <div class="bg-blue-50/70 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40 rounded-xl p-3 text-center">
                <p class="text-[10px] font-semibold text-secondary dark:text-slate-400 uppercase tracking-wider mb-1">CP / pc</p>
                <p class="text-[15px] font-bold text-on-surface dark:text-white">${rs(cp)}</p>
            </div>
            <div class="bg-blue-50/40 dark:bg-blue-950/30 border border-blue-100/60 dark:border-blue-900/30 rounded-xl p-3 text-center">
                <p class="text-[10px] font-semibold text-secondary dark:text-slate-400 uppercase tracking-wider mb-1">SP / pc</p>
                <p class="text-[15px] font-bold text-primary dark:text-blue-400">${sp > 0 ? rs(sp) : '—'}</p>
            </div>
            <div class="rounded-xl p-3 text-center border" style="background:${profitColor}14; border-color:${profitColor}28;">
                <p class="text-[10px] font-semibold text-secondary dark:text-slate-400 uppercase tracking-wider mb-1">Profit / pc</p>
                <p class="text-[15px] font-bold" style="color:${profitColor};">${profitPc !== null ? rs(profitPc) : '—'}</p>
            </div>
            <div class="rounded-xl p-3 text-center border" style="background:${profitColor}10; border-color:${profitColor}20;">
                <p class="text-[10px] font-semibold text-secondary dark:text-slate-400 uppercase tracking-wider mb-1">Total Profit</p>
                <p class="text-[15px] font-bold" style="color:${profitColor};">${totalProfit !== null ? '₹' + Math.abs(totalProfit).toLocaleString('en-IN', {maximumFractionDigits:0}) : '—'}</p>
            </div>
        </div>
    `);


    if (!hasUData) {
        // ── Fallback for old records without uData
        const materialsHTML = (c.materials || []).map(m => fieldRow(m.name, rs(m.cost || 0))).join('') ||
            '<p class="text-[13px] text-secondary py-3 text-center">No detailed breakdown saved.<br>Re-save from the calculator to see full details.</p>';
        const fallbackCard = card('receipt_long', 'Cost Breakdown', '#8E8E93', materialsHTML);
        return `${summaryCard}${fallbackCard}`;
    }

    if (u.mode === 'advanced' || c.mode === 'advanced') {
        // ── Advanced Calculator Detailed View ──
        
        // 1. Size Ratios & Yield
        let sizeBody = '';
        if (u.sizes && u.sizes.length) {
            sizeBody = u.sizes.map(s => {
                const yieldStr = s.weightGms > 0 ? ` (${s.weightGms.toFixed(1)}g · ${(1000 / s.weightGms).toFixed(1)} p/kg)` : '';
                return fieldRow(`${s.name}${s.ratio !== undefined && s.ratio !== null && s.ratio !== '' ? ` (Ratio: ${s.ratio})` : ''}`, `${s.qty} pcs${yieldStr}`);
            }).join('');
            sizeBody += fieldRow('Total Order Qty', `${u.totalQty || qty} pcs`);
            if (u.pcsPerKg > 0 || u.avgWeightGms > 0) {
                const avgYield = u.pcsPerKg || (u.avgWeightGms > 0 ? 1000 / u.avgWeightGms : 0);
                sizeBody += fieldRow('Average Yield', `${avgYield.toFixed(2)} pcs/kg (${(u.avgWeightGms || (1000 / avgYield)).toFixed(1)} g/pc)`);
            }
        }
        const sizeCard = sizeBody ? card('straighten', 'Size Matrix & Yield', '#FF9F0A', sizeBody) : '';
        
        // 2. Multi-Fabric / Standard Fabric Engine
        let fabricBody = '';
        if (u.components && u.components.length) {
            u.components.forEach(comp => {
                const compYield = comp.pcsPerKg || (comp.weightGms > 0 ? (1000 / comp.weightGms) : 0);
                fabricBody += `
                <div class="py-3 border-b border-outline-variant/15 dark:border-slate-800/80 last:border-0">
                    <div class="flex justify-between items-center mb-1">
                        <span class="text-[13px] font-bold text-on-surface dark:text-slate-100">${comp.name}</span>
                        <span class="text-[14px] font-bold text-[#0071E3] dark:text-blue-400">${rs(comp.costPc)} / pc</span>
                    </div>
                    <div class="text-[11px] text-secondary dark:text-slate-400 font-medium flex justify-between">
                        <span>Price: ${rs(comp.fabricPriceKg)}/kg</span>
                        <span>Wt: ${comp.weightGms?.toFixed(1) || 0} gms</span>
                        <span>Yield: ${compYield > 0 ? compYield.toFixed(2) + ' p/kg' : '—'}</span>
                    </div>
                </div>`;
            });
            const totalFab = u.components.reduce((acc, comp) => acc + (comp.costPc || 0), 0);
            fabricBody += fieldRow('Total Fabric / pc', rs(totalFab));
        } else if (u.totalFabricKg > 0 || u.fabricCostPc > 0 || u.fabricPriceKg > 0) {
            const advYield = u.pcsPerKg || (u.avgWeightGms > 0 ? (1000 / u.avgWeightGms) : 0);
            fabricBody = [
                u.gsm > 0 ? fieldRow('Fabric GSM', `${u.gsm} gsm`) : '',
                u.fabricPriceKg > 0 ? fieldRow('Fabric Price / kg', rs(u.fabricPriceKg)) : '',
                advYield > 0 ? fieldRow('Avg Yield (Pcs / kg)', advYield.toFixed(2) + ' pcs/kg') : '',
                u.avgWeightGms > 0 ? fieldRow('Avg Weight / pc', u.avgWeightGms.toFixed(1) + ' gms') : '',
                u.totalFabricKg > 0 ? fieldRow('Total Fabric Required', u.totalFabricKg.toFixed(2) + ' kg') : '',
                u.wastage > 0 ? fieldRow('Cutting Wastage', u.wastage + '%') : '',
                fieldRow('Fabric Cost / pc', rs(u.fabricCostPc)),
                u.totalFabricCost > 0 ? fieldRow('Total Fabric Cost', rs(u.totalFabricCost)) : ''
            ].filter(Boolean).join('');
        }
        const fabricCard = fabricBody ? card('layers', 'Fabric Specification', '#0071E3', fabricBody) : '';

        // 3. Trims Engine
        let trimsBody = '';
        if (u.trims && u.trims.length) {
            u.trims.forEach(trim => {
                trimsBody += fieldRow(`${trim.name} (${trim.cons} @ ${rs(trim.rate)})`, rs(trim.costPc));
            });
            const totalTrims = u.trims.reduce((acc, trim) => acc + (trim.costPc || 0), 0);
            trimsBody += fieldRow('Total Trims / pc', rs(totalTrims));
        }
        const trimsCard = trimsBody ? card('category', 'Trims BOM', '#FF3B30', trimsBody) : '';

        // 4. VAS & CMT
        const vasBody = [
            u.cmt > 0 ? fieldRow('CMT', rs(u.cmt)) : '',
            u.washing > 0 ? fieldRow('Washing', rs(u.washing)) : '',
            u.embroidery > 0 ? fieldRow('Embroidery', rs(u.embroidery)) : '',
            u.printing > 0 ? fieldRow('Printing', rs(u.printing)) : '',
            u.freight > 0 ? fieldRow('Freight/Logistics', rs(u.freight)) : '',
            u.other > 0 ? fieldRow('Other', rs(u.other)) : '',
        ].filter(Boolean).join('');
        const totalVAS = (u.cmt||0) + (u.washing||0) + (u.embroidery||0) + (u.printing||0) + (u.freight||0) + (u.other||0);
        const vasCard = vasBody ? card('precision_manufacturing', `CMT & VAS (Total: ${rs(totalVAS)})`, '#AF52DE', vasBody) : '';

        return `${summaryCard}${sizeCard}${fabricCard}${trimsCard}${vasCard}`;
    }

    // ── 1.5 Pattern & Fabric Weight Card
    const hasPattern = u.weightGms > 0;
    const patternYield = (u.pcsPerKg > 0) ? u.pcsPerKg : (u.weightGms > 0 ? (1000 / u.weightGms) : 0);
    const patternBody = hasPattern ? [
        fieldRow('Body + Margins (in)', `${u.bodyL||0} + ${u.bodyLM||0}`, `Chest: ${u.chest||0} + ${u.chestM||0}`),
        fieldRow('Sleeve + Margins (in)', `${u.slvL||0} + ${u.slvLM||0}`, `Dia: ${u.slvDia||0} + ${u.slvDiaM||0}`),
        fieldRow('Fabric GSM', u.gsm ? u.gsm + ' gsm' : '—'),
        fieldRow('Weight / pc', u.weightGms ? u.weightGms.toFixed(1) + ' gms' : '—'),
        patternYield > 0 ? fieldRow('Yield (Pcs / kg)', patternYield.toFixed(2) + ' pcs/kg') : ''
    ].filter(Boolean).join('') : '';
    const patternCard = hasPattern ? card('straighten', 'Pattern & Fabric Weight', '#5856D6', patternBody) : '';

    // ── 2. Fabric Card
    const fabricYield = (u.pcsPerKg > 0) ? u.pcsPerKg : (u.weightGms > 0 ? (1000 / u.weightGms) : 0);
    const fabricBody = [
        u.fabricPriceKg > 0 ? fieldRow('Fabric Price / kg', rs(u.fabricPriceKg)) : '',
        fabricYield > 0 ? fieldRow('Yield (Pcs / kg)', fabricYield.toFixed(2) + ' pcs/kg') : '',
        u.wastage > 0 ? fieldRow('Wastage', u.wastage + '%') : '',
        fieldRow('Fabric Cost / pc', rs(u.fabricCostPc)),
        qty > 0 && u.fabricCostPc > 0 ? fieldRow('Total Fabric Cost', rs(u.fabricCostPc * qty), `(${qty} pcs)`) : '',
    ].filter(Boolean).join('');
    const fabricCard = u.fabricCostPc > 0 ? card('bolt', 'Fabric', '#0071E3', fabricBody) : '';

    // ── 3. CMT Card
    const isSeparateCMT = u.cmtMode === 'separate';
    let cmtBody = '';
    if (isSeparateCMT) {
        cmtBody = [
            u.cutting > 0 ? fieldRow('Cutting / pc', rs(u.cutting)) : '',
            u.fusing > 0 ? fieldRow('Fusing / pc', rs(u.fusing)) : '',
            u.wages > 0 ? fieldRow('Wages / pc', rs(u.wages)) : '',
            u.packing > 0 ? fieldRow('Packing / pc', rs(u.packing)) : '',
        ].filter(Boolean).join('');
        const cmtTotal = (u.cutting||0)+(u.fusing||0)+(u.wages||0)+(u.packing||0);
        if (cmtTotal > 0) cmtBody += fieldRow('CMT Total / pc', rs(cmtTotal));
    } else {
        cmtBody = u.cmt > 0 ? fieldRow('CMT Rate / pc', rs(u.cmt)) : '';
    }
    const cmtTotal = isSeparateCMT
        ? (u.cutting||0)+(u.fusing||0)+(u.wages||0)+(u.packing||0)
        : (u.cmt||0);
    const cmtCard = cmtTotal > 0 ? card('content_cut', `CMT (${isSeparateCMT ? 'Separate' : 'Combined'})`, '#AF52DE', cmtBody) : '';

    // ── 4. Printing & Sublimation Card
    const printBody = [
        u.printing > 0 ? fieldRow('Printing / pc', rs(u.printing)) : '',
        u.sublimation > 0 ? fieldRow('Sublimation / pc', rs(u.sublimation)) : '',
        (u.printing > 0 || u.sublimation > 0) ? fieldRow('Total Printing / pc', rs((u.printing||0)+(u.sublimation||0))) : '',
    ].filter(Boolean).join('');
    const printCard = (u.printing > 0 || u.sublimation > 0) ? card('print', 'Printing & Sublimation', '#FF9F0A', printBody) : '';

    // ── 5. Allowances & Overheads Card
    const allowBody = [
        u.allowances > 0 ? fieldRow('Allowances / pc', rs(u.allowances)) : '',
        u.overheads > 0 ? fieldRow('Overheads / pc', rs(u.overheads)) : '',
        (u.allowances > 0 || u.overheads > 0) ? fieldRow('Total / pc', rs((u.allowances||0)+(u.overheads||0))) : '',
    ].filter(Boolean).join('');
    const allowCard = (u.allowances > 0 || u.overheads > 0) ? card('percent', 'Allowances & Overheads', '#FFD60A', allowBody) : '';

    // ── 6. Accessories Card
    const lumpSum = (u.acc1||0)+(u.acc2||0)+(u.acc3||0)+(u.pattern||0);
    const lumpPerPc = qty > 0 ? lumpSum / qty : 0;
    const accBody = [
        u.acc1 > 0 ? fieldRow('Accessory 1 (order total)', rs(u.acc1)) : '',
        u.acc2 > 0 ? fieldRow('Accessory 2 (order total)', rs(u.acc2)) : '',
        u.acc3 > 0 ? fieldRow('Accessory 3 (order total)', rs(u.acc3)) : '',
        u.pattern > 0 ? fieldRow('Pattern (order total)', rs(u.pattern)) : '',
        lumpSum > 0 ? fieldRow('Total Lump Sum', rs(lumpSum)) : '',
        lumpPerPc > 0 ? fieldRow('Per Piece (derived)', rs(lumpPerPc), `÷ ${qty} pcs`) : '',
    ].filter(Boolean).join('');
    const accCard = lumpSum > 0 ? card('category', 'Accessories & Pattern', '#FF3B30', accBody) : '';

    // ── 7. Visual Cost Breakdown Bar
    const items = [
        { label: 'Fabric', value: (u.fabricCostPc||0) * qty, color: '#0071E3' },
        { label: 'CMT', value: cmtTotal * qty, color: '#AF52DE' },
        { label: 'Printing', value: ((u.printing||0)+(u.sublimation||0)) * qty, color: '#FF9F0A' },
        { label: 'Allow.', value: ((u.allowances||0)+(u.overheads||0)) * qty, color: '#FFD60A' },
        { label: 'Accessories', value: lumpSum, color: '#FF3B30' },
    ].filter(i => i.value > 0);
    const totalCostAll = items.reduce((s, i) => s + i.value, 0);
    const barHTML = items.map((i, idx) => {
        const pct = (i.value / totalCostAll * 100).toFixed(2);
        const isFirst = idx === 0, isLast = idx === items.length - 1;
        const radius = isFirst && isLast ? '9999px' : isFirst ? '9999px 0 0 9999px' : isLast ? '0 9999px 9999px 0' : '0';
        return `<div title="${i.label}: ₹${i.value.toFixed(2)} (${parseFloat(pct).toFixed(1)}%)" style="width:${pct}%;background:${i.color};border-radius:${radius};height:100%;"></div>`;
    }).join('');
    const legendHTML = items.map(i => {
        const pct = (i.value / totalCostAll * 100).toFixed(1);
        return `<div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
                <div class="w-2.5 h-2.5 rounded-sm flex-shrink-0" style="background:${i.color};"></div>
                <span class="text-[12px] text-on-surface dark:text-slate-200">${i.label}</span>
            </div>
            <div class="flex items-center gap-3">
                <span class="text-[11px] text-secondary dark:text-slate-400">${pct}%</span>
                <span class="text-[12px] font-bold text-on-surface dark:text-slate-100">₹${i.value.toFixed(2)}</span>
            </div>
        </div>`;
    }).join('');
    const breakdownCard = totalCostAll > 0 ? card('bar_chart', 'Cost Breakdown', '#5856D6', `
        <div class="py-3">
            <div style="height:10px;display:flex;border-radius:9999px;overflow:hidden;margin-bottom:12px;">${barHTML}</div>
            <div class="flex flex-col gap-2">${legendHTML}</div>
        </div>
    `) : '';

    return `${summaryCard}${patternCard}${fabricCard}${cmtCard}${printCard}${allowCard}${accCard}${breakdownCard}`;
}

// ── Open Costing Sheet ─────────────────────────────────────────────
window.openCosting = async function(id) {
    try {
        window.showToast?.('Loading costing details...', 'info');
        const c = await api.getCostingById(id);
        
        if (c && !c.error) {
            // Clean up any old costing sheets from DOM
            const existing = document.getElementById('costingDetailSheet-overlay');
            if (existing) existing.parentElement.remove();

            const sheetId = 'costingDetailSheet';
            const dateStr = new Date(c.createdAt || c.date || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

            const container = document.createElement('div');
            container.innerHTML = `
                <div id="${sheetId}-overlay" class="bottom-sheet-overlay"></div>
                <div id="${sheetId}-content" class="bottom-sheet-content flex flex-col bg-white dark:bg-slate-900 text-on-surface dark:text-slate-100" style="height:88vh;max-height:88vh;">
                    <div class="sheet-handle"></div>

                    <!-- Header -->
                    <div class="px-4 pb-3 pt-1 flex justify-between items-start border-b border-outline-variant/30 dark:border-slate-800 flex-shrink-0">
                        <div class="flex-1 min-w-0">
                            <h2 class="text-[18px] font-bold text-on-surface dark:text-white truncate">${c.clientId || 'Unnamed Client'}</h2>
                            <p class="text-[12px] text-secondary dark:text-slate-400">${c.styleRef || 'Garment'} &bull; ${dateStr} &bull; <span class="font-medium text-primary dark:text-blue-400">${c.status || 'Saved'}</span></p>
                        </div>
                        <div class="flex items-center gap-2 flex-shrink-0 ml-3">
                            <button type="button" id="costing-print-btn" title="Print / Export PDF"
                                class="w-8 h-8 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary dark:text-blue-400 active-scale transition-apple hover:bg-primary/20">
                                <span class="material-symbols-outlined text-[18px]">print</span>
                            </button>
                            <button type="button" id="costing-delete-btn" title="Delete"
                                class="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 dark:text-red-400 active-scale transition-apple hover:bg-red-500/20">
                                <span class="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                            <button type="button" id="costing-close-x"
                                class="w-8 h-8 rounded-full bg-surface-variant dark:bg-slate-800 flex items-center justify-center text-secondary dark:text-slate-300 active-scale transition-apple hover:bg-surface-variant/80">
                                <span class="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>
                    </div>

                    <!-- Scrollable Body -->
                    <div class="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-4 bg-[#f4f5f7] dark:bg-slate-950">
                        ${buildDetailHTML(c, sheetId)}
                    </div>

                    <!-- Footer Actions -->
                    <div class="p-4 border-t border-outline-variant/30 dark:border-slate-800 bg-white dark:bg-slate-900 safe-bottom flex gap-3 flex-shrink-0">
                        <button type="button" id="costing-close-btn"
                            class="flex-1 bg-surface-container-high dark:bg-slate-800 text-on-surface dark:text-slate-200 font-semibold py-3.5 rounded-xl active-scale transition-apple text-[14px]">
                            Close
                        </button>
                        <button type="button" id="costing-print-footer-btn"
                            class="flex-1 bg-primary/10 dark:bg-primary/20 text-primary dark:text-blue-400 font-semibold py-3.5 rounded-xl active-scale transition-apple flex items-center justify-center gap-1.5 text-[14px]">
                            <span class="material-symbols-outlined text-[16px]">print</span>
                            Print / PDF
                        </button>
                        <button type="button" id="costing-edit-btn"
                            class="flex-[1.2] bg-primary text-white font-semibold py-3.5 rounded-xl shadow-sm active-scale transition-apple flex items-center justify-center gap-1.5 text-[14px]">
                            <span class="material-symbols-outlined text-[16px]">edit</span>
                            Edit
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(container);

            const cleanup = () => {
                window.closeSheet(sheetId);
                setTimeout(() => container.remove(), 400);
            };

            container.querySelector(`#${sheetId}-overlay`).onclick = cleanup;
            container.querySelector('#costing-close-x').onclick = cleanup;
            container.querySelector('#costing-close-btn').onclick = cleanup;
            container.querySelector('#costing-print-btn').onclick = () => window.navigateToCalculator(c, true);
            container.querySelector('#costing-print-footer-btn').onclick = () => window.navigateToCalculator(c, true);
            container.querySelector('#costing-edit-btn').onclick = () => window.navigateToCalculator(c, false);

            container.querySelector('#costing-delete-btn').onclick = async () => {
                const confirmed = confirm('Are you sure you want to delete this costing?');
                if (!confirmed) return;
                try {
                    window.showToast?.('Deleting costing...', 'info');
                    await api.deleteCosting(c.id);
                    window.showToast?.('Costing deleted successfully', 'success');
                    cleanup();
                    loadCostings();
                } catch (err) {
                    console.error(err);
                    window.showToast?.('Error deleting costing', 'error');
                }
            };

            requestAnimationFrame(() => window.openSheet(sheetId));

        } else {
            window.showToast?.('Costing not found', 'error');
        }
    } catch(err) {
        console.error(err);
        window.showToast?.('Error loading costing details', 'error');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    loadCostings();
});

