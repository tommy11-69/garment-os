/**
 * Garment OS — Production Hero Hub: Cutting Workspace
 * Marker planning, lay count, size ratio cut matrix, scrap %, and bundle ticket generation.
 */

import { STAGE_DEFINITIONS, getProductWorkflowStages } from '../domain/workflowEngine.js?v=5.5';

export const CuttingWorkspace = {
    render(order, activeProduct, stageData) {
        const cut = stageData?.cutting || {};
        const targetQty = Number(activeProduct?.qty) || Number(order?.qty) || 0;

        // Resolve dynamic next stage in this product's workflow
        const stages = getProductWorkflowStages(activeProduct, order?.workflowType);
        const currentIdx = stages.indexOf('cutting');
        const nextStageKey = (currentIdx >= 0 && currentIdx < stages.length - 1) ? stages[currentIdx + 1] : 'stitching';
        const nextDef = STAGE_DEFINITIONS[nextStageKey] || { label: 'Next Stage', shortLabel: 'Next Stage' };
        const nextLabel = nextDef.shortLabel || nextDef.label;
        
        // Size breakdown from product or default standard ratio (S, M, L, XL, XXL)
        const productSizes = activeProduct?.sizes || order?.stageData?.cutting?.cutQuantitiesBySize || {};
        const standardSizes = ['S', 'M', 'L', 'XL', 'XXL'];
        const sizeKeys = Object.keys(productSizes).length > 0 ? Object.keys(productSizes) : standardSizes;
        
        // Calculate planned distribution if not explicitly specified
        const plannedSizes = {};
        const cutSizes = cut.cutQuantitiesBySize || {};
        
        let totalPlanned = 0;
        let totalCut = 0;

        sizeKeys.forEach(sz => {
            const plan = Number(productSizes[sz]) || Math.round(targetQty / sizeKeys.length);
            plannedSizes[sz] = plan;
            totalPlanned += plan;

            const actualCut = cutSizes[sz] !== undefined ? Number(cutSizes[sz]) : plan;
            cutSizes[sz] = actualCut;
            totalCut += actualCut;
        });

        const fabricIssued = Number(cut.fabricIssuedKg) || (stageData?.fabric?.totalKg ? Number(stageData.fabric.totalKg) : Math.round(targetQty * 0.22));
        const scrapKg = Number(cut.scrapFabricKg) || (fabricIssued > 0 ? Number((fabricIssued * 0.08).toFixed(1)) : 0);
        const scrapPct = fabricIssued > 0 ? ((scrapKg / fabricIssued) * 100).toFixed(1) : '8.0';

        // Bundles list
        const bundles = Array.isArray(cut.bundles) && cut.bundles.length > 0 ? cut.bundles : [];

        return `
            <div class="flex flex-col gap-5 animate-fade-in" id="cutting-workspace-root">
                
                <!-- Stage Header Banner -->
                <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm">
                    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div class="flex items-center gap-3">
                            <div class="w-12 h-12 rounded-xl bg-[#FF9500]/10 text-[#FF9500] flex items-center justify-center font-bold">
                                <span class="material-symbols-outlined text-[26px]">content_cut</span>
                            </div>
                            <div>
                                <div class="flex items-center gap-2">
                                    <h3 class="text-[18px] font-bold text-on-surface">Cutting & Bundle Tickets</h3>
                                    <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold ${totalCut >= totalPlanned && totalPlanned > 0 ? 'bg-[#34C759]/15 text-[#34C759]' : 'bg-[#FF9500]/15 text-[#FF9500]'}">
                                        Cut: ${totalCut.toLocaleString()} / ${totalPlanned.toLocaleString()} pcs
                                    </span>
                                </div>
                                <p class="text-[13px] text-secondary mt-0.5">Marker lay planning, size ratio actuals, scrap utilization, and sewing bundle generation</p>
                            </div>
                        </div>

                        <div class="flex items-center gap-2 w-full sm:w-auto">
                            <button type="button" onclick="window.productionRouter.saveCurrentStage(false)" 
                                class="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-outline-variant bg-surface-container-high text-on-surface text-[13px] font-bold hover:bg-surface-variant active-scale transition-apple">
                                Save Cutting Log
                            </button>
                            <button type="button" onclick="window.productionRouter.saveCurrentStage(true)" 
                                class="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-primary text-white text-[13px] font-bold hover:bg-primary-hover active-scale transition-apple shadow-sm flex items-center justify-center gap-1.5">
                                <span>Handoff to ${nextLabel}</span>
                                <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
                            </button>
                        </div>
                    </div>
                </div>

                <form id="stage-form-cutting" onsubmit="event.preventDefault(); window.productionRouter.saveCurrentStage(false);">
                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
                        
                        <!-- Left 2 Cols: Size Ratio Cut Matrix & Marker -->
                        <div class="flex flex-col gap-5 lg:col-span-2">
                            
                            <!-- Size Ratio Breakdown Matrix -->
                            <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm">
                                <div class="flex items-center justify-between mb-4">
                                    <h4 class="text-[14px] font-bold text-on-surface uppercase tracking-wider flex items-center gap-2">
                                        <span class="material-symbols-outlined text-primary text-[18px]">view_column</span>
                                        Size Ratio & Actual Cut Count
                                    </h4>
                                    <div class="text-[12px] font-bold text-secondary">
                                        Total Cut: <span class="text-primary font-extrabold text-[14px]">${totalCut}</span> / ${totalPlanned}
                                    </div>
                                </div>

                                <div class="overflow-x-auto">
                                    <table class="w-full text-left text-[13px]">
                                        <thead>
                                            <tr class="border-b border-outline-variant/60 text-[11px] font-bold text-secondary uppercase tracking-wider">
                                                <th class="pb-2.5">Size</th>
                                                <th class="pb-2.5 text-center">Planned Qty</th>
                                                <th class="pb-2.5 text-center">Actual Cut Pieces</th>
                                                <th class="pb-2.5 text-right">Variance</th>
                                            </tr>
                                        </thead>
                                        <tbody class="divide-y divide-outline-variant/30">
                                            ${sizeKeys.map(sz => {
                                                const plan = plannedSizes[sz] || 0;
                                                const actual = cutSizes[sz] !== undefined ? cutSizes[sz] : plan;
                                                const variance = actual - plan;
                                                return `
                                                    <tr class="hover:bg-surface-container/40">
                                                        <td class="py-3 font-bold text-on-surface">${sz}</td>
                                                        <td class="py-3 text-center text-secondary font-medium">${plan}</td>
                                                        <td class="py-3 text-center">
                                                            <input type="number" name="size_${sz}" value="${actual}" 
                                                                data-size="${sz}"
                                                                class="size-cut-input w-24 bg-surface-container-lowest border border-outline-variant rounded-lg px-2.5 py-1 text-center font-bold text-on-surface focus:border-primary outline-none">
                                                        </td>
                                                        <td class="py-3 text-right font-mono font-bold ${variance >= 0 ? 'text-[#34C759]' : 'text-error'}">
                                                            ${variance > 0 ? `+${variance}` : variance}
                                                        </td>
                                                    </tr>
                                                `;
                                            }).join('')}
                                        </tbody>
                                    </table>
                                </div>

                                <div class="mt-4 pt-3 border-t border-outline-variant/40 flex flex-wrap items-center justify-between gap-2">
                                    <button type="button" onclick="window.CuttingWorkspaceActions.generateBundles()" 
                                        class="px-3.5 py-2 rounded-xl bg-[#FF9500]/10 text-[#FF9500] hover:bg-[#FF9500]/20 text-[12px] font-bold flex items-center gap-1.5 active-scale transition-apple">
                                        <span class="material-symbols-outlined text-[16px]">confirmation_number</span>
                                        <span>Generate 50-Pc Bundles</span>
                                    </button>

                                    <span class="text-[12px] text-secondary">
                                        ${bundles.length > 0 ? `<strong>${bundles.length} bundles</strong> generated and ready for sewing.` : 'No bundles generated yet.'}
                                    </span>
                                </div>
                            </div>

                            <!-- Marker Layout & Fabric Utilization -->
                            <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm">
                                <h4 class="text-[14px] font-bold text-on-surface uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <span class="material-symbols-outlined text-primary text-[18px]">architecture</span>
                                    Marker Layout & Scrap Tracking
                                </h4>

                                <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    <div>
                                        <label class="block text-[12px] font-bold text-secondary mb-1">Marker Length (m)</label>
                                        <input type="number" step="0.1" name="markerLengthMeters" value="${cut.markerLengthMeters || 6.2}" 
                                            class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2 text-[14px] font-bold text-on-surface focus:border-primary outline-none">
                                    </div>

                                    <div>
                                        <label class="block text-[12px] font-bold text-secondary mb-1">Lay Plies Count</label>
                                        <input type="number" name="plyCount" value="${cut.plyCount || 80}" 
                                            class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2 text-[14px] font-bold text-on-surface focus:border-primary outline-none">
                                    </div>

                                    <div>
                                        <label class="block text-[12px] font-bold text-secondary mb-1">Fabric Issued (Kg)</label>
                                        <input type="number" step="0.1" name="fabricIssuedKg" value="${fabricIssued}" 
                                            class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2 text-[14px] font-bold text-on-surface focus:border-primary outline-none">
                                    </div>

                                    <div>
                                        <label class="block text-[12px] font-bold text-secondary mb-1">Scrap End-Bits (Kg)</label>
                                        <div class="flex items-baseline gap-1">
                                            <input type="number" step="0.1" name="scrapFabricKg" value="${scrapKg}" 
                                                class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2 text-[14px] font-bold text-error focus:border-primary outline-none">
                                            <span class="text-[11px] font-bold text-secondary">(${scrapPct}%)</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>

                        <!-- Right Column: Bundles & Supervisor -->
                        <div class="flex flex-col gap-5">
                            
                            <!-- Bundle Tickets Card -->
                            <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm">
                                <div class="flex items-center justify-between mb-3">
                                    <h4 class="text-[14px] font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                                        <span class="material-symbols-outlined text-[#FF9500] text-[18px]">receipt_long</span>
                                        Sewing Bundles
                                    </h4>
                                    <button type="button" onclick="window.CuttingWorkspaceActions.printBundles()" 
                                        class="text-[11px] font-bold text-primary hover:underline flex items-center gap-0.5">
                                        <span class="material-symbols-outlined text-[14px]">print</span>
                                        Print Tickets
                                    </button>
                                </div>

                                <div class="max-h-60 overflow-y-auto flex flex-col gap-2 pr-1" id="bundles-list-container">
                                    ${bundles.length === 0 ? `
                                        <div class="p-5 text-center text-secondary border border-dashed border-outline-variant rounded-xl">
                                            <p class="text-[12px]">Click <strong>Generate Bundles</strong> to build 50-piece tickets with serial numbers for sewing lines.</p>
                                        </div>
                                    ` : bundles.map(b => `
                                        <div class="p-2.5 rounded-xl bg-surface-container border border-outline-variant/60 flex items-center justify-between">
                                            <div>
                                                <span class="text-[12px] font-extrabold text-on-surface">Bundle #${b.bundleNo}</span>
                                                <span class="text-[11px] font-bold px-1.5 py-0.5 rounded bg-surface-container-high text-primary ml-1">${b.size}</span>
                                                <p class="text-[10px] text-secondary font-mono">Pcs ${b.range || '1-50'}</p>
                                            </div>
                                            <span class="text-[13px] font-extrabold text-on-surface font-mono">${b.qty} pcs</span>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>

                            <!-- Supervisor & Status -->
                            <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm">
                                <h4 class="text-[14px] font-bold text-on-surface uppercase tracking-wider mb-3">Floor Supervisor</h4>
                                <div class="flex flex-col gap-3">
                                    <div>
                                        <label class="block text-[12px] font-bold text-secondary mb-1">Cutting Master Name</label>
                                        <input type="text" name="cuttingSupervisor" value="${cut.cuttingSupervisor || 'Master Murugan'}" 
                                            class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2 text-[13px] font-medium text-on-surface focus:border-primary outline-none">
                                    </div>

                                    <div>
                                        <label class="block text-[12px] font-bold text-secondary mb-1">Cutting Status</label>
                                        <select name="status" class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2 text-[13px] font-bold text-on-surface focus:border-primary outline-none">
                                            <option value="In Progress" ${cut.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                                            <option value="Completed" ${cut.status === 'Completed' ? 'selected' : ''}>Completed & Bundled</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                        </div>

                    <!-- ───────────────────────────────────────────────────────── -->
                    <!-- POST-CUTTING: PVA PANEL WASHING (Optional)              -->
                    <!-- ───────────────────────────────────────────────────────── -->
                    <div class="lg:col-span-3">
                        <div class="bg-surface-container-lowest border-2 ${cut.pvaWashEnabled ? 'border-[#0EA5E9]' : 'border-dashed border-outline-variant'} rounded-2xl overflow-hidden transition-all" id="pva-wash-card">

                            <!-- Toggle Header -->
                            <div class="flex items-center justify-between px-5 py-4 ${cut.pvaWashEnabled ? 'bg-[#0EA5E9]/5 border-b border-[#0EA5E9]/20' : 'bg-surface-container/30'}">
                                <div class="flex items-center gap-3">
                                    <div class="w-9 h-9 rounded-xl ${cut.pvaWashEnabled ? 'bg-[#0EA5E9] text-white' : 'bg-surface-container text-secondary'} flex items-center justify-center transition-all">
                                        <span class="material-symbols-outlined text-[18px]">water</span>
                                    </div>
                                    <div>
                                        <h4 class="text-[14px] font-extrabold ${cut.pvaWashEnabled ? 'text-[#0EA5E9]' : 'text-on-surface'}">Post-Cutting: PVA Panel Washing</h4>
                                        <p class="text-[11px] text-secondary">Optional — PVA starch / pre-wash treatment on cut panels before stitching</p>
                                    </div>
                                </div>
                                <button type="button" id="pva-toggle-btn"
                                    onclick="window.cuttingTogglePVA()"
                                    class="${cut.pvaWashEnabled
                                        ? 'bg-[#0EA5E9] border-[#0EA5E9] text-white'
                                        : 'bg-surface border-outline-variant text-secondary'
                                    } px-4 py-2 rounded-xl border-2 text-[12px] font-bold flex items-center gap-1.5 transition-all active-scale shrink-0">
                                    <span class="material-symbols-outlined text-[15px]" id="pva-toggle-icon">${cut.pvaWashEnabled ? 'toggle_on' : 'toggle_off'}</span>
                                    <span id="pva-toggle-label">${cut.pvaWashEnabled ? 'Enabled' : 'Add Wash Step'}</span>
                                </button>
                                <input type="hidden" name="pvaWashEnabled" id="pva-wash-enabled" value="${Boolean(cut.pvaWashEnabled)}">
                            </div>

                            <!-- Collapsible Body -->
                            <div id="pva-wash-body" class="${cut.pvaWashEnabled ? '' : 'hidden'} px-5 py-4">
                                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

                                    <div>
                                        <label class="block text-[11px] font-bold text-secondary uppercase tracking-wider mb-1">Panels Dispatched for Wash</label>
                                        <input type="number" name="pvaPanelsDispatched" id="pva-panels-dispatched"
                                            value="${cut.pvaPanelsDispatched || ''}"
                                            min="0" placeholder="e.g. 500"
                                            class="w-full bg-surface border border-outline-variant rounded-xl px-3 py-2.5 text-[14px] font-bold text-on-surface focus:border-[#0EA5E9] outline-none">
                                    </div>

                                    <div>
                                        <label class="block text-[11px] font-bold text-secondary uppercase tracking-wider mb-1">Wash Vendor / In-House</label>
                                        <input type="text" name="pvaVendorName" id="pva-vendor"
                                            value="${cut.pvaVendorName || ''}"
                                            placeholder="e.g. In-House or Vendor Name"
                                            class="w-full bg-surface border border-outline-variant rounded-xl px-3 py-2.5 text-[13px] text-on-surface focus:border-[#0EA5E9] outline-none">
                                    </div>

                                    <div>
                                        <label class="block text-[11px] font-bold text-secondary uppercase tracking-wider mb-1">Expected Return Date</label>
                                        <input type="date" name="pvaExpectedReturn" id="pva-return-date"
                                            value="${cut.pvaExpectedReturn || ''}"
                                            class="w-full bg-surface border border-outline-variant rounded-xl px-3 py-2.5 text-[13px] text-on-surface focus:border-[#0EA5E9] outline-none">
                                    </div>

                                    <div>
                                        <label class="block text-[11px] font-bold text-secondary uppercase tracking-wider mb-1">Wash Status</label>
                                        <select name="pvaStatus" id="pva-status"
                                            class="w-full bg-surface border border-outline-variant rounded-xl px-3 py-2.5 text-[13px] font-bold text-on-surface focus:border-[#0EA5E9] outline-none">
                                            <option value="Pending"   ${(cut.pvaStatus || 'Pending') === 'Pending'   ? 'selected' : ''}>Pending — Not Yet Dispatched</option>
                                            <option value="Sent"      ${cut.pvaStatus === 'Sent'      ? 'selected' : ''}>Sent for Wash</option>
                                            <option value="Received"  ${cut.pvaStatus === 'Received'  ? 'selected' : ''}>Received Back</option>
                                            <option value="Completed" ${cut.pvaStatus === 'Completed' ? 'selected' : ''}>Wash Completed — Ready for Sewing</option>
                                        </select>
                                    </div>
                                </div>

                                <div class="mt-3">
                                    <label class="block text-[11px] font-bold text-secondary uppercase tracking-wider mb-1">Wash Notes / Instructions</label>
                                    <input type="text" name="pvaNotes" id="pva-notes"
                                        value="${cut.pvaNotes || ''}"
                                        placeholder="e.g. Single wash cycle, no spin-dry, air-dry only — then proceed to stitching"
                                        class="w-full bg-surface border border-outline-variant rounded-xl px-3 py-2.5 text-[13px] text-on-surface focus:border-[#0EA5E9] outline-none">
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
                </form>

            </div>
        `;
    },

    extractFormData() {
        const form = document.getElementById('stage-form-cutting');
        if (!form) return {};
        const fd = new FormData(form);
        
        // Extract size inputs
        const cutQuantitiesBySize = {};
        let actualCutPieces = 0;
        const sizeInputs = form.querySelectorAll('.size-cut-input');
        sizeInputs.forEach(input => {
            const sz = input.dataset.size;
            const val = Number(input.value) || 0;
            cutQuantitiesBySize[sz] = val;
            actualCutPieces += val;
        });

        // Current bundles in memory or DOM
        const bundles = window._cuttingBundlesCache || [];

        return {
            markerLengthMeters: Number(fd.get('markerLengthMeters')) || 0,
            plyCount:           Number(fd.get('plyCount'))            || 0,
            fabricIssuedKg:     Number(fd.get('fabricIssuedKg'))      || 0,
            scrapFabricKg:      Number(fd.get('scrapFabricKg'))       || 0,
            cutQuantitiesBySize,
            actualCutPieces,
            bundles,
            cuttingSupervisor:  fd.get('cuttingSupervisor') || '',
            status:             fd.get('status')            || 'In Progress',
            // Post-Cutting PVA Panel Washing (optional)
            pvaWashEnabled:      fd.get('pvaWashEnabled') === 'true',
            pvaPanelsDispatched: Number(fd.get('pvaPanelsDispatched'))  || 0,
            pvaVendorName:       fd.get('pvaVendorName')?.trim()        || '',
            pvaExpectedReturn:   fd.get('pvaExpectedReturn')            || '',
            pvaStatus:           fd.get('pvaStatus')                    || 'Pending',
            pvaNotes:            fd.get('pvaNotes')?.trim()             || ''
        };
    }
};

// Bundle Generator helper attached to window
if (typeof window !== 'undefined') {
    window.CuttingWorkspaceActions = {
        generateBundles() {
            const form = document.getElementById('stage-form-cutting');
            if (!form) return;
            const sizeInputs = form.querySelectorAll('.size-cut-input');
            const bundles = [];
            let bundleCounter = 1;

            sizeInputs.forEach(input => {
                const sz = input.dataset.size;
                const totalSzQty = Number(input.value) || 0;
                let remaining = totalSzQty;
                let startNo = 1;

                while (remaining > 0) {
                    const bundleQty = Math.min(50, remaining);
                    const endNo = startNo + bundleQty - 1;
                    bundles.push({
                        bundleNo: bundleCounter++,
                        size: sz,
                        range: `${String(startNo).padStart(3, '0')}-${String(endNo).padStart(3, '0')}`,
                        qty: bundleQty
                    });
                    startNo += bundleQty;
                    remaining -= bundleQty;
                }
            });

            window._cuttingBundlesCache = bundles;
            
            // Re-render bundles list
            const container = document.getElementById('bundles-list-container');
            if (container) {
                container.innerHTML = bundles.map(b => `
                    <div class="p-2.5 rounded-xl bg-surface-container border border-outline-variant/60 flex items-center justify-between animate-fade-in">
                        <div>
                            <span class="text-[12px] font-extrabold text-on-surface">Bundle #${b.bundleNo}</span>
                            <span class="text-[11px] font-bold px-1.5 py-0.5 rounded bg-surface-container-high text-primary ml-1">${b.size}</span>
                            <p class="text-[10px] text-secondary font-mono">Pcs ${b.range}</p>
                        </div>
                        <span class="text-[13px] font-extrabold text-on-surface font-mono">${b.qty} pcs</span>
                    </div>
                `).join('');
            }

            if (window.showToast) window.showToast(`Generated ${bundles.length} bundle tickets!`);
        },

        printBundles() {
            const bundles = window._cuttingBundlesCache || [];
            if (bundles.length === 0) {
                if (window.showToast) window.showToast('Please generate bundles first!', 'warning');
                return;
            }

            const win = window.open('', '_blank');
            win.document.write(`
                <html>
                <head>
                    <title>Garment OS - Bundle Tickets</title>
                    <style>
                        body { font-family: sans-serif; padding: 20px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                        th, td { border: 1px solid #ccc; padding: 8px 12px; text-align: left; }
                        th { background: #f0f0f0; }
                    </style>
                </head>
                <body>
                    <h2>Garment OS — Production Bundle Tickets</h2>
                    <p>Generated on ${new Date().toLocaleString()}</p>
                    <table>
                        <tr><th>Bundle #</th><th>Size</th><th>Serial Range</th><th>Pieces</th><th>Sewing Operator</th></tr>
                        ${bundles.map(b => `<tr><td>#${b.bundleNo}</td><td><strong>${b.size}</strong></td><td>${b.range}</td><td>${b.qty}</td><td></td></tr>`).join('')}
                    </table>
                    <script>window.print();</script>
                </body>
                </html>
            `);
            win.document.close();
        }
    };

    // PVA Panel Wash toggle — attached globally for inline onclick
    window.cuttingTogglePVA = function() {
        const hidden   = document.getElementById('pva-wash-enabled');
        const body     = document.getElementById('pva-wash-body');
        const btn      = document.getElementById('pva-toggle-btn');
        const icon     = document.getElementById('pva-toggle-icon');
        const label    = document.getElementById('pva-toggle-label');
        const card     = document.getElementById('pva-wash-card');
        const header   = btn?.closest('[class*="flex items-center justify-between"]');
        if (!hidden) return;

        const isOn = hidden.value === 'true';
        const newOn = !isOn;
        hidden.value = String(newOn);

        // Show / hide body
        body?.classList.toggle('hidden', !newOn);

        // Update button appearance
        if (btn) {
            btn.className = btn.className
                .replace(/bg-\[#0EA5E9\]|bg-surface/g, newOn ? 'bg-[#0EA5E9]' : 'bg-surface')
                .replace(/border-\[#0EA5E9\]|border-outline-variant/g, newOn ? 'border-[#0EA5E9]' : 'border-outline-variant')
                .replace(/text-white|text-secondary/g, newOn ? 'text-white' : 'text-secondary');
        }
        if (icon)  icon.textContent  = newOn ? 'toggle_on' : 'toggle_off';
        if (label) label.textContent = newOn ? 'Enabled' : 'Add Wash Step';

        // Update card border
        if (card) {
            card.className = card.className
                .replace(/border-2 border-\[#0EA5E9\]|border-dashed border-outline-variant/g,
                    newOn ? 'border-2 border-[#0EA5E9]' : 'border-dashed border-outline-variant');
        }
    };
}
