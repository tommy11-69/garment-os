/**
 * Garment OS — Production Hero Hub: Stitching & Assembly Workspace
 * Sewing line allocation, hourly output targets, inline defect audit, and repair tracking.
 */

import { STAGE_DEFINITIONS } from '../domain/workflowEngine.js?v=5.5';

export const StitchingWorkspace = {
    render(order, activeProduct, stageData) {
        const st = stageData?.stitching || {};
        const targetQty = Number(activeProduct?.qty) || Number(order?.qty) || 0;

        const lineId = st.lineId || 'Sewing Line 1';
        const dailyTarget = Number(st.dailyTarget) || Math.min(targetQty, 400);
        const completed = Number(st.completedPieces) || 0;
        const progressPct = targetQty > 0 ? Math.min(100, Math.round((completed / targetQty) * 100)) : 0;

        const defects = st.defects || {
            skipStitch: 0,
            unevenSeam: 0,
            brokenStitch: 0,
            oilStain: 0,
            measurementDeviation: 0
        };
        const repaired = Number(st.repairedPieces) || 0;
        const rejected = Number(st.rejectedPieces) || 0;

        const hourlyLogs = Array.isArray(st.hourlyLogs) && st.hourlyLogs.length > 0 
            ? st.hourlyLogs 
            : [
                { hour: '09:00 - 10:00', target: 50, output: 45 },
                { hour: '10:00 - 11:00', target: 50, output: 52 },
                { hour: '11:00 - 12:00', target: 50, output: 48 },
                { hour: '12:00 - 01:00', target: 50, output: 50 }
            ];

        return `
            <div class="flex flex-col gap-5 animate-fade-in" id="stitching-workspace-root">
                
                <!-- Stage Header Banner -->
                <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm">
                    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div class="flex items-center gap-3">
                            <div class="w-12 h-12 rounded-xl bg-[#34C759]/10 text-[#34C759] flex items-center justify-center font-bold">
                                <span class="material-symbols-outlined text-[26px]">precision_manufacturing</span>
                            </div>
                            <div>
                                <div class="flex items-center gap-2">
                                    <h3 class="text-[18px] font-bold text-on-surface">Stitching & Assembly</h3>
                                    <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold ${completed >= targetQty && targetQty > 0 ? 'bg-[#34C759]/15 text-[#34C759]' : 'bg-primary/15 text-primary'}">
                                        Assembled: ${completed.toLocaleString()} / ${targetQty.toLocaleString()} pcs (${progressPct}%)
                                    </span>
                                </div>
                                <p class="text-[13px] text-secondary mt-0.5">Sewing line allocation, hourly output targets, inline defect audit, and repair tracking</p>
                            </div>
                        </div>

                        <div class="flex items-center gap-2 w-full sm:w-auto">
                            <button type="button" onclick="window.productionRouter.saveCurrentStage(false)" 
                                class="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-outline-variant bg-surface-container-high text-on-surface text-[13px] font-bold hover:bg-surface-variant active-scale transition-apple">
                                Save Shift Log
                            </button>
                            <button type="button" onclick="window.productionRouter.saveCurrentStage(true)" 
                                class="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-primary text-white text-[13px] font-bold hover:bg-primary-hover active-scale transition-apple shadow-sm flex items-center justify-center gap-1.5">
                                <span>Send to Packing</span>
                                <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
                            </button>
                        </div>
                    </div>
                </div>

                <form id="stage-form-stitching" onsubmit="event.preventDefault(); window.productionRouter.saveCurrentStage(false);">
                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
                        
                        <!-- Left 2 Cols: Sewing Line & Hourly Output -->
                        <div class="flex flex-col gap-5 lg:col-span-2">
                            
                            <!-- Sewing Line Status & Progress Bar -->
                            <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm">
                                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                                    <div class="flex items-center gap-3">
                                        <div>
                                            <label class="block text-[11px] font-bold text-secondary uppercase">Assigned Line</label>
                                            <select name="lineId" class="bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-1.5 text-[14px] font-bold text-on-surface focus:border-primary outline-none mt-0.5">
                                                <option value="Sewing Line 1" ${lineId === 'Sewing Line 1' ? 'selected' : ''}>Sewing Line 1 (Polo / Collar)</option>
                                                <option value="Sewing Line 2" ${lineId === 'Sewing Line 2' ? 'selected' : ''}>Sewing Line 2 (Round Neck Tees)</option>
                                                <option value="Sewing Line 3" ${lineId === 'Sewing Line 3' ? 'selected' : ''}>Sewing Line 3 (Hoodies / Fleece)</option>
                                                <option value="External Contractor" ${lineId === 'External Contractor' ? 'selected' : ''}>External Jobwork Subcontractor</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label class="block text-[11px] font-bold text-secondary uppercase">Line Master</label>
                                            <input type="text" name="supervisorName" value="${st.supervisorName || 'M. Selvam'}" 
                                                class="bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-1.5 text-[14px] font-medium text-on-surface focus:border-primary outline-none mt-0.5">
                                        </div>
                                    </div>

                                    <div class="flex items-center gap-2">
                                        <button type="button" onclick="window.StitchingWorkspaceActions.quickAddPieces(50)" 
                                            class="px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-[12px] font-bold hover:bg-primary/20 active-scale transition-apple">
                                            + 50 Pcs
                                        </button>
                                        <button type="button" onclick="window.StitchingWorkspaceActions.quickAddPieces(100)" 
                                            class="px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-[12px] font-bold hover:bg-primary/20 active-scale transition-apple">
                                            + 100 Pcs
                                        </button>
                                    </div>
                                </div>

                                <!-- Progress Bar -->
                                <div class="w-full h-3 bg-surface-variant rounded-full overflow-hidden mb-3">
                                    <div id="stitching-progress-fill" class="h-full bg-[#34C759] rounded-full transition-apple" style="width: ${progressPct}%"></div>
                                </div>

                                <div class="grid grid-cols-3 gap-4 text-center pt-2">
                                    <div class="p-2.5 rounded-xl bg-surface-container border border-outline-variant/60">
                                        <p class="text-[11px] font-bold text-secondary uppercase">Target Pcs</p>
                                        <p class="text-[18px] font-extrabold text-on-surface mt-0.5">${targetQty.toLocaleString()}</p>
                                    </div>
                                    <div class="p-2.5 rounded-xl bg-surface-container border border-outline-variant/60">
                                        <p class="text-[11px] font-bold text-secondary uppercase">Completed</p>
                                        <div class="flex items-center justify-center gap-1 mt-0.5">
                                            <input type="number" id="completedPiecesInput" name="completedPieces" value="${completed}" 
                                                class="w-24 bg-surface-container-lowest border border-outline-variant rounded-lg px-2 py-0.5 text-center text-[18px] font-extrabold text-[#34C759] focus:border-primary outline-none">
                                        </div>
                                    </div>
                                    <div class="p-2.5 rounded-xl bg-surface-container border border-outline-variant/60">
                                        <p class="text-[11px] font-bold text-secondary uppercase">Balance</p>
                                        <p id="stitching-balance-display" class="text-[18px] font-extrabold text-orange-500 mt-0.5">${Math.max(0, targetQty - completed).toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>

                            <!-- Hourly Production Log -->
                            <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm">
                                <div class="flex items-center justify-between mb-3">
                                    <h4 class="text-[14px] font-bold text-on-surface uppercase tracking-wider flex items-center gap-2">
                                        <span class="material-symbols-outlined text-primary text-[18px]">schedule</span>
                                        Hourly Output Log (Today)
                                    </h4>
                                    <span class="text-[12px] font-bold text-secondary">Target: ${dailyTarget} pcs / day</span>
                                </div>

                                <div class="overflow-x-auto">
                                    <table class="w-full text-left text-[13px]">
                                        <thead>
                                            <tr class="border-b border-outline-variant/60 text-[11px] font-bold text-secondary uppercase">
                                                <th class="pb-2">Time Window</th>
                                                <th class="pb-2 text-center">Target</th>
                                                <th class="pb-2 text-center">Output</th>
                                                <th class="pb-2 text-right">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody class="divide-y divide-outline-variant/30" id="hourly-logs-table-body">
                                            ${hourlyLogs.map((log, idx) => `
                                                <tr class="hover:bg-surface-container/40">
                                                    <td class="py-2.5 font-bold text-on-surface font-mono">${log.hour}</td>
                                                    <td class="py-2.5 text-center text-secondary">${log.target} pcs</td>
                                                    <td class="py-2.5 text-center font-bold text-on-surface">
                                                        <input type="number" value="${log.output}" 
                                                            data-idx="${idx}"
                                                            class="hourly-output-input w-20 bg-surface-container-lowest border border-outline-variant rounded-lg px-2 py-0.5 text-center font-bold text-on-surface focus:border-primary outline-none">
                                                    </td>
                                                    <td class="py-2.5 text-right font-bold text-[11px]">
                                                        ${log.output >= log.target 
                                                            ? '<span class="text-[#34C759] bg-[#34C759]/10 px-2 py-0.5 rounded">Met</span>' 
                                                            : '<span class="text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded">Behind</span>'}
                                                    </td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                        </div>

                        <!-- Right Column: Inline QC Defect Counter -->
                        <div class="flex flex-col gap-5">
                            
                            <!-- Inline Quality Control -->
                            <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm">
                                <h4 class="text-[14px] font-bold text-on-surface uppercase tracking-wider mb-4 flex items-center gap-1.5">
                                    <span class="material-symbols-outlined text-error text-[18px]">bug_report</span>
                                    Inline Sewing Defects
                                </h4>

                                <div class="flex flex-col gap-3">
                                    <div class="flex items-center justify-between p-2.5 rounded-xl bg-surface-container border border-outline-variant/60">
                                        <span class="text-[13px] font-medium text-on-surface">Skip Stitches</span>
                                        <input type="number" name="defect_skipStitch" value="${defects.skipStitch || 0}" 
                                            class="w-16 bg-surface-container-lowest border border-outline-variant rounded-lg px-2 py-1 text-center font-bold text-error outline-none">
                                    </div>

                                    <div class="flex items-center justify-between p-2.5 rounded-xl bg-surface-container border border-outline-variant/60">
                                        <span class="text-[13px] font-medium text-on-surface">Uneven / Puckered Seam</span>
                                        <input type="number" name="defect_unevenSeam" value="${defects.unevenSeam || 0}" 
                                            class="w-16 bg-surface-container-lowest border border-outline-variant rounded-lg px-2 py-1 text-center font-bold text-error outline-none">
                                    </div>

                                    <div class="flex items-center justify-between p-2.5 rounded-xl bg-surface-container border border-outline-variant/60">
                                        <span class="text-[13px] font-medium text-on-surface">Broken Thread</span>
                                        <input type="number" name="defect_brokenStitch" value="${defects.brokenStitch || 0}" 
                                            class="w-16 bg-surface-container-lowest border border-outline-variant rounded-lg px-2 py-1 text-center font-bold text-error outline-none">
                                    </div>

                                    <div class="flex items-center justify-between p-2.5 rounded-xl bg-surface-container border border-outline-variant/60">
                                        <span class="text-[13px] font-medium text-on-surface">Oil Stains</span>
                                        <input type="number" name="defect_oilStain" value="${defects.oilStain || 0}" 
                                            class="w-16 bg-surface-container-lowest border border-outline-variant rounded-lg px-2 py-1 text-center font-bold text-error outline-none">
                                    </div>
                                </div>

                                <div class="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-outline-variant/40">
                                    <div>
                                        <label class="block text-[11px] font-bold text-secondary uppercase mb-1">Repaired Pcs</label>
                                        <input type="number" name="repairedPieces" value="${repaired}" 
                                            class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-2.5 py-1.5 text-center font-bold text-[#34C759] outline-none">
                                    </div>
                                    <div>
                                        <label class="block text-[11px] font-bold text-secondary uppercase mb-1">Scrapped Pcs</label>
                                        <input type="number" name="rejectedPieces" value="${rejected}" 
                                            class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-2.5 py-1.5 text-center font-bold text-error outline-none">
                                    </div>
                                </div>
                            </div>

                            <!-- Stage Status -->
                            <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm">
                                <label class="block text-[12px] font-bold text-secondary mb-1">Sewing Status</label>
                                <select name="status" class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2 text-[13px] font-bold text-on-surface focus:border-primary outline-none">
                                    <option value="In Progress" ${st.status === 'In Progress' ? 'selected' : ''}>In Progress (Running)</option>
                                    <option value="Allocated" ${st.status === 'Allocated' ? 'selected' : ''}>Allocated to Line</option>
                                    <option value="Completed" ${st.status === 'Completed' ? 'selected' : ''}>Assembly Completed</option>
                                </select>
                            </div>

                        </div>

                    </div>
                </form>

            </div>
        `;
    },

    extractFormData() {
        const form = document.getElementById('stage-form-stitching');
        if (!form) return {};
        const fd = new FormData(form);

        // Hourly logs
        const hourlyInputs = form.querySelectorAll('.hourly-output-input');
        const hourlyLogs = [];
        hourlyInputs.forEach(input => {
            const tr = input.closest('tr');
            const hour = tr.querySelector('td:first-child')?.textContent || '';
            const output = Number(input.value) || 0;
            hourlyLogs.push({ hour, target: 50, output });
        });

        return {
            lineId: fd.get('lineId') || 'Sewing Line 1',
            supervisorName: fd.get('supervisorName') || '',
            dailyTarget: Number(fd.get('dailyTarget')) || 400,
            completedPieces: Number(fd.get('completedPieces')) || 0,
            hourlyLogs,
            defects: {
                skipStitch: Number(fd.get('defect_skipStitch')) || 0,
                unevenSeam: Number(fd.get('defect_unevenSeam')) || 0,
                brokenStitch: Number(fd.get('defect_brokenStitch')) || 0,
                oilStain: Number(fd.get('defect_oilStain')) || 0,
                measurementDeviation: 0
            },
            repairedPieces: Number(fd.get('repairedPieces')) || 0,
            rejectedPieces: Number(fd.get('rejectedPieces')) || 0,
            status: fd.get('status') || 'In Progress'
        };
    }
};

if (typeof window !== 'undefined') {
    window.StitchingWorkspaceActions = {
        quickAddPieces(addQty) {
            const input = document.getElementById('completedPiecesInput');
            if (!input) return;
            const current = Number(input.value) || 0;
            input.value = current + addQty;

            // Trigger visual progress update
            const totalTarget = Number(window.productionRouter?.activeOrder?.qty) || 1;
            const newPct = Math.min(100, Math.round(((current + addQty) / totalTarget) * 100));
            const fill = document.getElementById('stitching-progress-fill');
            if (fill) fill.style.width = `${newPct}%`;

            const bal = document.getElementById('stitching-balance-display');
            if (bal) bal.textContent = Math.max(0, totalTarget - (current + addQty)).toLocaleString();

            if (window.showToast) window.showToast(`Logged +${addQty} pieces completed!`);
        }
    };
}
