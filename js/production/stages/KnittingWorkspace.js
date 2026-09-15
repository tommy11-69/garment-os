/**
 * Garment OS — Production Workspace: Knitting
 * 
 * Tracks circular knitting machine operations — machine gauge, production rate,
 * fabric kg produced, rolls count, and QC delta (actual vs target GSM & Dia).
 * Stage colour: #0EA5E9 (sky blue)
 */

import { STAGE_DEFINITIONS } from '../domain/workflowEngine.js?v=6.0';

export const KnittingWorkspace = {

    render(order, activeProduct, stageData) {
        const sd        = stageData?.knitting || {};
        const targetQty = Number(activeProduct?.qty) || Number(order?.qty) || 0;

        // Pull target GSM / Dia from per-product fabric spec (if available)
        const targetGsm = Number(sd.targetGsm) || Number(activeProduct?.fabric?.gsm) || 180;
        const targetDia = Number(sd.targetDia) || Number(activeProduct?.fabric?.dia)  || 34;

        const actualGsm       = Number(sd.actualGsm)          || 0;
        const actualDia       = Number(sd.actualDia)           || 0;
        const fabricKgProduced = Number(sd.fabricKgProduced)   || 0;
        const rollsProduced    = Number(sd.rollsProduced)       || 0;
        const defectivePanels  = Number(sd.defectivePanels)    || 0;
        const isQCReleased     = sd.status === 'Released';

        // GSM deviation
        const gsmDelta   = actualGsm > 0 ? Math.abs(actualGsm - targetGsm) : null;
        const gsmOk      = gsmDelta !== null && gsmDelta <= 5;
        const diaDelta   = actualDia > 0 ? Math.abs(actualDia - targetDia) : null;
        const diaOk      = diaDelta !== null && diaDelta <= 1;

        // Production rate estimate
        const estKgRequired = Math.round(targetQty * 0.24);
        const productionPct = estKgRequired > 0
            ? Math.min(100, Math.round((fabricKgProduced / estKgRequired) * 100))
            : 0;

        const knittingStatusColors = {
            'In Progress': 'bg-[#0EA5E9]/15 text-[#0EA5E9]',
            'QC':          'bg-[#FF9500]/15 text-[#FF9500]',
            'Released':    'bg-[#34C759]/15 text-[#34C759]'
        };
        const statusColor = knittingStatusColors[sd.status] || knittingStatusColors['In Progress'];

        return `
        <div class="flex flex-col gap-5 animate-fade-in" id="knitting-workspace-root">

            <!-- Stage Header Banner -->
            <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm">
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div class="flex items-center gap-3">
                        <div class="w-12 h-12 rounded-xl bg-[#0EA5E9]/10 text-[#0EA5E9] flex items-center justify-center">
                            <span class="material-symbols-outlined text-[26px]">grid_on</span>
                        </div>
                        <div>
                            <div class="flex items-center gap-2">
                                <h3 class="text-[18px] font-bold text-on-surface">Circular Knitting</h3>
                                <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold ${statusColor}">
                                    ${sd.status || 'In Progress'}
                                </span>
                            </div>
                            <p class="text-[13px] text-secondary mt-0.5">Machine gauge, fabric kg output, production rate, and GSM & Dia QC verification</p>
                        </div>
                    </div>

                    <div class="flex items-center gap-2 w-full sm:w-auto">
                        <button type="button" onclick="window.productionRouter.saveCurrentStage(false)"
                            class="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-outline-variant bg-surface-container-high text-on-surface text-[13px] font-bold hover:bg-surface-variant active-scale transition-apple">
                            Save Progress
                        </button>
                        <button type="button" onclick="window.productionRouter.saveCurrentStage(true)"
                            class="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-[#0EA5E9] text-white text-[13px] font-bold hover:opacity-90 active-scale transition-apple shadow-sm flex items-center justify-center gap-1.5">
                            <span>Release to Dyeing</span>
                            <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Production Progress Bar -->
            <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 shadow-sm">
                <div class="flex justify-between items-center mb-2">
                    <span class="text-[13px] font-bold text-on-surface">Knitting Progress (${fabricKgProduced} / ${estKgRequired} kg)</span>
                    <span class="text-[13px] font-extrabold text-[#0EA5E9]">${productionPct}%</span>
                </div>
                <div class="w-full h-2.5 bg-surface-variant rounded-full overflow-hidden">
                    <div class="h-full bg-[#0EA5E9] rounded-full transition-all" style="width: ${productionPct}%"></div>
                </div>
                <div class="flex justify-between text-[11px] text-secondary mt-1.5">
                    <span>Grey fabric for ${targetQty.toLocaleString()} pcs</span>
                    <span>${rollsProduced} rolls produced</span>
                </div>
            </div>

            <form id="stage-form-knitting" onsubmit="event.preventDefault(); window.productionRouter.saveCurrentStage(false);">
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">

                    <!-- Left Column: Machine & Output -->
                    <div class="flex flex-col gap-5 lg:col-span-2">

                        <!-- Machine Configuration -->
                        <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm">
                            <h4 class="text-[14px] font-bold text-on-surface uppercase tracking-wider mb-4 flex items-center gap-2">
                                <span class="material-symbols-outlined text-[#0EA5E9] text-[18px]">settings</span>
                                Knitting Machine Configuration
                            </h4>
                            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label class="block text-[12px] font-bold text-secondary mb-1">Machine ID</label>
                                    <input type="text" name="machineId" id="knitting-machine-id" value="${sd.machineId || ''}"
                                        placeholder="e.g. CKM-03"
                                        class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2.5 text-[14px] text-on-surface font-medium focus:border-[#0EA5E9] outline-none">
                                </div>
                                <div>
                                    <label class="block text-[12px] font-bold text-secondary mb-1">Machine Gauge (G)</label>
                                    <select name="machineGauge" id="knitting-gauge"
                                        class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2.5 text-[14px] text-on-surface font-bold focus:border-[#0EA5E9] outline-none">
                                        ${[18, 20, 24, 28, 32, 36, 40].map(g =>
                                            `<option value="${g}" ${(sd.machineGauge || 28) == g ? 'selected' : ''}>${g}G</option>`
                                        ).join('')}
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-[12px] font-bold text-secondary mb-1">Machine Operator</label>
                                    <input type="text" name="machineOperator" id="knitting-operator" value="${sd.machineOperator || ''}"
                                        placeholder="Operator name"
                                        class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2.5 text-[14px] text-on-surface focus:border-[#0EA5E9] outline-none">
                                </div>
                            </div>
                        </div>

                        <!-- Production Output Metrics -->
                        <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm">
                            <h4 class="text-[14px] font-bold text-on-surface uppercase tracking-wider mb-4 flex items-center gap-2">
                                <span class="material-symbols-outlined text-[#0EA5E9] text-[18px]">speed</span>
                                Production Output
                            </h4>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-[12px] font-bold text-secondary mb-1">Fabric Produced (kg)</label>
                                    <input type="number" name="fabricKgProduced" id="knitting-kg-produced" value="${fabricKgProduced || ''}"
                                        min="0" step="0.5" placeholder="${estKgRequired}"
                                        class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2.5 text-[15px] font-bold text-on-surface focus:border-[#0EA5E9] outline-none">
                                </div>
                                <div>
                                    <label class="block text-[12px] font-bold text-secondary mb-1">Rolls Produced</label>
                                    <input type="number" name="rollsProduced" id="knitting-rolls" value="${rollsProduced || ''}"
                                        min="0" placeholder="0"
                                        class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2.5 text-[15px] font-bold text-on-surface focus:border-[#0EA5E9] outline-none">
                                </div>
                                <div>
                                    <label class="block text-[12px] font-bold text-secondary mb-1">Production Rate (kg/hr)</label>
                                    <input type="number" name="productionRateKgHr" id="knitting-rate" value="${sd.productionRateKgHr || ''}"
                                        min="0" step="0.1" placeholder="e.g. 8.5"
                                        class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2.5 text-[14px] text-on-surface focus:border-[#0EA5E9] outline-none">
                                </div>
                                <div>
                                    <label class="block text-[12px] font-bold text-secondary mb-1">Defective Panels Rejected</label>
                                    <input type="number" name="defectivePanels" id="knitting-defects" value="${defectivePanels || ''}"
                                        min="0" placeholder="0"
                                        class="w-full ${defectivePanels > 10 ? 'border-error' : 'border-outline-variant'} bg-surface-container-lowest border rounded-xl px-3 py-2.5 text-[14px] text-on-surface font-bold focus:border-[#0EA5E9] outline-none">
                                </div>
                                <div>
                                    <label class="block text-[12px] font-bold text-secondary mb-1">Shift Date</label>
                                    <input type="date" name="shiftDate" id="knitting-shift-date" value="${sd.shiftDate || ''}"
                                        class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2.5 text-[14px] text-on-surface focus:border-[#0EA5E9] outline-none">
                                </div>
                            </div>
                        </div>

                        <!-- GSM & Dia Quality Check -->
                        <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm">
                            <h4 class="text-[14px] font-bold text-on-surface uppercase tracking-wider mb-4 flex items-center gap-2">
                                <span class="material-symbols-outlined text-[#0EA5E9] text-[18px]">straighten</span>
                                QC: Actual vs. Target Specs
                            </h4>
                            <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <div>
                                    <label class="block text-[12px] font-bold text-secondary mb-1">Target GSM</label>
                                    <div class="bg-surface-container rounded-xl px-3 py-2.5 border border-outline-variant/40">
                                        <span class="text-[15px] font-bold text-secondary">${targetGsm}</span>
                                    </div>
                                </div>
                                <div>
                                    <label class="block text-[12px] font-bold text-secondary mb-1">Actual GSM *</label>
                                    <input type="number" name="actualGsm" id="knitting-gsm" value="${actualGsm || ''}"
                                        min="0" placeholder="${targetGsm}"
                                        class="w-full ${actualGsm > 0 && !gsmOk ? 'border-error' : actualGsm > 0 ? 'border-[#34C759]' : 'border-outline-variant'} bg-surface-container-lowest border rounded-xl px-3 py-2.5 text-[15px] font-bold text-on-surface focus:border-[#0EA5E9] outline-none">
                                    ${actualGsm > 0 ? `<p class="text-[10px] mt-0.5 font-bold ${gsmOk ? 'text-[#34C759]' : 'text-error'}">
                                        Δ ${gsmDelta} GSM ${gsmOk ? '✓ Within ±5' : '⚠ Out of spec'}
                                    </p>` : ''}
                                </div>
                                <div>
                                    <label class="block text-[12px] font-bold text-secondary mb-1">Target Dia (in)</label>
                                    <div class="bg-surface-container rounded-xl px-3 py-2.5 border border-outline-variant/40">
                                        <span class="text-[15px] font-bold text-secondary">${targetDia}"</span>
                                    </div>
                                </div>
                                <div>
                                    <label class="block text-[12px] font-bold text-secondary mb-1">Actual Dia (in) *</label>
                                    <input type="number" name="actualDia" id="knitting-dia" value="${actualDia || ''}"
                                        min="0" step="0.5" placeholder="${targetDia}"
                                        class="w-full ${actualDia > 0 && !diaOk ? 'border-error' : actualDia > 0 ? 'border-[#34C759]' : 'border-outline-variant'} bg-surface-container-lowest border rounded-xl px-3 py-2.5 text-[15px] font-bold text-on-surface focus:border-[#0EA5E9] outline-none">
                                    ${actualDia > 0 ? `<p class="text-[10px] mt-0.5 font-bold ${diaOk ? 'text-[#34C759]' : 'text-error'}">
                                        Δ ${diaDelta}" ${diaOk ? '✓ Within ±1"' : '⚠ Out of spec'}
                                    </p>` : ''}
                                </div>
                            </div>

                            <div class="mt-4">
                                <label class="block text-[12px] font-bold text-secondary mb-1">Notes / QC Observations</label>
                                <textarea name="notes" id="knitting-notes" rows="2"
                                    placeholder="Fabric feel, evenness, structural defects, machine performance..."
                                    class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2.5 text-[13px] text-on-surface focus:border-[#0EA5E9] outline-none resize-none">${sd.notes || ''}</textarea>
                            </div>
                        </div>
                    </div>

                    <!-- Right Column: KPI Panel & Status -->
                    <div class="flex flex-col gap-5">

                        <!-- KPI Scorecard -->
                        <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm">
                            <h4 class="text-[13px] font-bold text-secondary uppercase tracking-wider mb-3">Knitting KPIs</h4>
                            <div class="flex flex-col gap-3">
                                <div class="bg-[#0EA5E9]/8 rounded-xl p-3 flex justify-between items-center">
                                    <span class="text-[12px] font-bold text-secondary">Fabric Output</span>
                                    <strong class="text-[16px] text-[#0EA5E9]">${fabricKgProduced} kg</strong>
                                </div>
                                <div class="bg-surface-container rounded-xl p-3 flex justify-between items-center">
                                    <span class="text-[12px] font-bold text-secondary">Rolls Produced</span>
                                    <strong class="text-[16px] text-on-surface">${rollsProduced}</strong>
                                </div>
                                <div class="bg-surface-container rounded-xl p-3 flex justify-between items-center">
                                    <span class="text-[12px] font-bold text-secondary">GSM Variance</span>
                                    <strong class="text-[16px] ${!gsmOk && gsmDelta !== null ? 'text-error' : gsmDelta !== null ? 'text-[#34C759]' : 'text-secondary'}">
                                        ${gsmDelta !== null ? `Δ${gsmDelta}` : '—'}
                                    </strong>
                                </div>
                                <div class="bg-surface-container rounded-xl p-3 flex justify-between items-center">
                                    <span class="text-[12px] font-bold text-secondary">Defective Panels</span>
                                    <strong class="text-[16px] ${defectivePanels > 10 ? 'text-error' : 'text-on-surface'}">${defectivePanels}</strong>
                                </div>
                            </div>
                        </div>

                        <!-- Stage Status -->
                        <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm">
                            <h4 class="text-[13px] font-bold text-secondary uppercase tracking-wider mb-3">Stage Status</h4>
                            <select name="status" id="knitting-status"
                                class="w-full bg-surface border border-outline-variant rounded-xl px-3 py-2.5 text-[14px] font-bold text-on-surface outline-none focus:border-[#0EA5E9]">
                                <option value="In Progress" ${(sd.status || 'In Progress') === 'In Progress' ? 'selected' : ''}>In Progress — Knitting</option>
                                <option value="QC"          ${sd.status === 'QC' ? 'selected' : ''}>QC — Measuring GSM & Dia</option>
                                <option value="Released"    ${sd.status === 'Released' ? 'selected' : ''}>Released — Ready for Dyeing</option>
                            </select>
                        </div>

                        <!-- Next Stage Info -->
                        <div class="bg-[#8B5CF6]/5 border border-[#8B5CF6]/20 rounded-2xl p-4">
                            <div class="flex items-center gap-2 mb-2">
                                <span class="material-symbols-outlined text-[#8B5CF6] text-[18px]">water_drop</span>
                                <h5 class="text-[13px] font-bold text-[#8B5CF6]">Next Stage: Dyeing & Compacting</h5>
                            </div>
                            <p class="text-[12px] text-secondary leading-snug">
                                Grey fabric rolls are sent for dyeing, shade approval, and compacting
                                to achieve final GSM and dimensional stability before cutting.
                            </p>
                        </div>
                    </div>
                </div>
            </form>
        </div>`;
    },

    extractFormData() {
        const g = (id) => document.getElementById(id);
        return {
            machineId:          g('knitting-machine-id')?.value?.trim()   || '',
            machineGauge:       parseInt(g('knitting-gauge')?.value)       || 28,
            machineOperator:    g('knitting-operator')?.value?.trim()      || '',
            fabricKgProduced:   parseFloat(g('knitting-kg-produced')?.value) || 0,
            rollsProduced:      parseInt(g('knitting-rolls')?.value)       || 0,
            productionRateKgHr: parseFloat(g('knitting-rate')?.value)      || 0,
            actualGsm:          parseFloat(g('knitting-gsm')?.value)       || 0,
            actualDia:          parseFloat(g('knitting-dia')?.value)       || 0,
            defectivePanels:    parseInt(g('knitting-defects')?.value)     || 0,
            shiftDate:          g('knitting-shift-date')?.value            || '',
            notes:              g('knitting-notes')?.value?.trim()         || '',
            status:             g('knitting-status')?.value                || 'In Progress'
        };
    }
};
