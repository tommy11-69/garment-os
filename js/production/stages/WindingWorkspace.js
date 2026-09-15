/**
 * Garment OS — Production Workspace: Yarn Winding
 * 
 * Tracks yarn winding operations — machine allocation, cone count,
 * yarn count / ticket, tension setting, and breakage logging.
 * Stage colour: #FF6B35 (orange-red)
 */

import { STAGE_DEFINITIONS } from '../domain/workflowEngine.js?v=6.0';

export const WindingWorkspace = {

    render(order, activeProduct, stageData) {
        const sd         = stageData?.winding || {};
        const targetQty  = Number(activeProduct?.qty) || Number(order?.qty) || 0;

        // Estimate yarn kg needed (0.22 kg/pc average)
        const estYarnKg      = Math.round(targetQty * 0.24);
        const yarnKgLoaded   = Number(sd.yarnKgLoaded)   || estYarnKg;
        const coneCount      = Number(sd.coneCount)       || 0;
        const breakageCount  = Number(sd.breakageCount)   || 0;
        const isCompleted    = sd.status === 'Completed';

        // Estimated cones: average 2.0 kg per cone
        const estCones = yarnKgLoaded > 0 ? Math.ceil(yarnKgLoaded / 2.0) : 0;
        const kgPerCone = coneCount > 0 ? (yarnKgLoaded / coneCount).toFixed(2) : '—';

        return `
        <div class="flex flex-col gap-5 animate-fade-in" id="winding-workspace-root">

            <!-- Stage Header Banner -->
            <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm">
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div class="flex items-center gap-3">
                        <div class="w-12 h-12 rounded-xl bg-[#FF6B35]/10 text-[#FF6B35] flex items-center justify-center">
                            <span class="material-symbols-outlined text-[26px]">rotate_right</span>
                        </div>
                        <div>
                            <div class="flex items-center gap-2">
                                <h3 class="text-[18px] font-bold text-on-surface">Yarn Winding Operations</h3>
                                <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold ${isCompleted ? 'bg-[#34C759]/15 text-[#34C759]' : 'bg-[#FF6B35]/15 text-[#FF6B35]'}">
                                    ${sd.status || 'In Progress'}
                                </span>
                            </div>
                            <p class="text-[13px] text-secondary mt-0.5">Machine allocation, yarn cone winding, tension setup and breakage logging</p>
                        </div>
                    </div>

                    <div class="flex items-center gap-2 w-full sm:w-auto">
                        <button type="button" onclick="window.productionRouter.saveCurrentStage(false)"
                            class="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-outline-variant bg-surface-container-high text-on-surface text-[13px] font-bold hover:bg-surface-variant active-scale transition-apple">
                            Save Progress
                        </button>
                        <button type="button" onclick="window.productionRouter.saveCurrentStage(true)"
                            class="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-[#FF6B35] text-white text-[13px] font-bold hover:opacity-90 active-scale transition-apple shadow-sm flex items-center justify-center gap-1.5">
                            <span>Release to Knitting</span>
                            <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Order Context Strip -->
            <div class="bg-[#FF6B35]/5 border border-[#FF6B35]/20 rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap">
                <span class="material-symbols-outlined text-[#FF6B35] text-[16px]">info</span>
                <span class="text-[13px] text-on-surface font-medium">
                    Target: <strong>${targetQty.toLocaleString()} pcs</strong>
                </span>
                <span class="text-outline-variant">·</span>
                <span class="text-[13px] text-on-surface font-medium">
                    Fabric Spec: <strong>${activeProduct?.fabric?.type || 'Cotton'} ${activeProduct?.fabric?.gsm || 180} GSM</strong>
                </span>
                <span class="text-outline-variant">·</span>
                <span class="text-[13px] text-on-surface font-medium">
                    Est. Yarn Required: <strong>${estYarnKg} kg</strong>
                </span>
                <span class="text-outline-variant">·</span>
                <span class="text-[13px] text-on-surface font-medium">
                    Est. Cones: <strong>≈${estCones} cones</strong> @ 2 kg/cone
                </span>
            </div>

            <form id="stage-form-winding" onsubmit="event.preventDefault(); window.productionRouter.saveCurrentStage(false);">
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">

                    <!-- Left Column: Machine & Yarn Specs -->
                    <div class="flex flex-col gap-5 lg:col-span-2">

                        <!-- Machine Configuration -->
                        <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm">
                            <h4 class="text-[14px] font-bold text-on-surface uppercase tracking-wider mb-4 flex items-center gap-2">
                                <span class="material-symbols-outlined text-[#FF6B35] text-[18px]">settings</span>
                                Machine & Operator Assignment
                            </h4>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-[12px] font-bold text-secondary mb-1">Winding Machine ID</label>
                                    <input type="text" name="machineId" id="winding-machine-id" value="${sd.machineId || ''}"
                                        placeholder="e.g. WM-01"
                                        class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2.5 text-[14px] text-on-surface font-medium focus:border-[#FF6B35] outline-none">
                                </div>
                                <div>
                                    <label class="block text-[12px] font-bold text-secondary mb-1">Machine Type</label>
                                    <select name="machineType" id="winding-machine-type"
                                        class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2.5 text-[14px] text-on-surface focus:border-[#FF6B35] outline-none">
                                        <option value="Auto-cone" ${sd.machineType === 'Auto-cone' ? 'selected' : ''}>Auto-cone (Schlafhorst / Murata)</option>
                                        <option value="Precision Winder" ${sd.machineType === 'Precision Winder' ? 'selected' : ''}>Precision Winder</option>
                                        <option value="Pirn Winder" ${sd.machineType === 'Pirn Winder' ? 'selected' : ''}>Pirn / Bobbin Winder</option>
                                        <option value="Manual" ${sd.machineType === 'Manual' ? 'selected' : ''}>Manual / Handheld</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-[12px] font-bold text-secondary mb-1">Supervisor Name</label>
                                    <input type="text" name="supervisorName" id="winding-supervisor" value="${sd.supervisorName || ''}"
                                        placeholder="Shift supervisor"
                                        class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2.5 text-[14px] text-on-surface focus:border-[#FF6B35] outline-none">
                                </div>
                                <div>
                                    <label class="block text-[12px] font-bold text-secondary mb-1">Shift Date</label>
                                    <input type="date" name="shiftDate" id="winding-shift-date" value="${sd.shiftDate || ''}"
                                        class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2.5 text-[14px] text-on-surface focus:border-[#FF6B35] outline-none">
                                </div>
                            </div>
                        </div>

                        <!-- Yarn Specs & Cone Metrics -->
                        <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm">
                            <h4 class="text-[14px] font-bold text-on-surface uppercase tracking-wider mb-4 flex items-center gap-2">
                                <span class="material-symbols-outlined text-[#FF6B35] text-[18px]">rotate_right</span>
                                Yarn Count & Cone Metrics
                            </h4>
                            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label class="block text-[12px] font-bold text-secondary mb-1">Yarn Count / Ticket</label>
                                    <input type="text" name="yarnCount" id="winding-yarn-count" value="${sd.yarnCount || ''}"
                                        placeholder="e.g. 30/1 Combed, 40/2"
                                        class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2.5 text-[14px] text-on-surface focus:border-[#FF6B35] outline-none">
                                </div>
                                <div>
                                    <label class="block text-[12px] font-bold text-secondary mb-1">Yarn Loaded (kg)</label>
                                    <input type="number" name="yarnKgLoaded" id="winding-yarn-kg" value="${yarnKgLoaded || ''}"
                                        min="0" step="0.5" placeholder="${estYarnKg}"
                                        oninput="document.getElementById('winding-kg-per-cone').textContent = 
                                            (this.value > 0 && document.getElementById('winding-cone-count').value > 0)
                                            ? (this.value / document.getElementById('winding-cone-count').value).toFixed(2) + ' kg/cone' : '—'"
                                        class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2.5 text-[14px] text-on-surface font-bold focus:border-[#FF6B35] outline-none">
                                </div>
                                <div>
                                    <label class="block text-[12px] font-bold text-secondary mb-1">Cones Wound</label>
                                    <input type="number" name="coneCount" id="winding-cone-count" value="${coneCount || ''}"
                                        min="0" placeholder="${estCones}"
                                        oninput="document.getElementById('winding-kg-per-cone').textContent = 
                                            (this.value > 0 && document.getElementById('winding-yarn-kg').value > 0)
                                            ? (document.getElementById('winding-yarn-kg').value / this.value).toFixed(2) + ' kg/cone' : '—'"
                                        class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2.5 text-[14px] text-on-surface font-bold focus:border-[#FF6B35] outline-none">
                                </div>
                                <div>
                                    <label class="block text-[12px] font-bold text-secondary mb-1">Tension Setting (cN)</label>
                                    <input type="text" name="tensionSetting" id="winding-tension" value="${sd.tensionSetting || ''}"
                                        placeholder="e.g. 12 cN"
                                        class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2.5 text-[14px] text-on-surface focus:border-[#FF6B35] outline-none">
                                </div>
                                <div>
                                    <label class="block text-[12px] font-bold text-secondary mb-1">Yarn Breakages (count)</label>
                                    <input type="number" name="breakageCount" id="winding-breakage" value="${breakageCount || ''}"
                                        min="0" placeholder="0"
                                        class="w-full ${breakageCount > 5 ? 'border-error' : 'border-outline-variant'} bg-surface-container-lowest border rounded-xl px-3 py-2.5 text-[14px] text-on-surface font-bold focus:border-[#FF6B35] outline-none">
                                    ${breakageCount > 5 ? '<p class="text-[11px] text-error mt-0.5">High breakage — check yarn quality & tension</p>' : ''}
                                </div>
                                <div>
                                    <label class="block text-[12px] font-bold text-secondary mb-1">Avg. kg per Cone</label>
                                    <div class="bg-surface-container rounded-xl px-3 py-2.5 border border-outline-variant/40">
                                        <span id="winding-kg-per-cone" class="text-[15px] font-bold text-[#FF6B35]">${kgPerCone} kg/cone</span>
                                    </div>
                                </div>
                            </div>

                            <div class="mt-4">
                                <label class="block text-[12px] font-bold text-secondary mb-1">Notes / Observations</label>
                                <textarea name="notes" id="winding-notes" rows="2"
                                    placeholder="Any winding irregularities, machine downtime, yarn lot issues..."
                                    class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2.5 text-[13px] text-on-surface focus:border-[#FF6B35] outline-none resize-none">${sd.notes || ''}</textarea>
                            </div>
                        </div>
                    </div>

                    <!-- Right Column: KPI Cards & Status -->
                    <div class="flex flex-col gap-5">

                        <!-- Live KPI Cards -->
                        <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm">
                            <h4 class="text-[13px] font-bold text-secondary uppercase tracking-wider mb-3">Winding KPIs</h4>
                            <div class="flex flex-col gap-3">
                                <div class="bg-[#FF6B35]/8 rounded-xl p-3 flex justify-between items-center">
                                    <span class="text-[12px] font-bold text-secondary">Yarn Loaded</span>
                                    <strong class="text-[16px] text-[#FF6B35]">${yarnKgLoaded} kg</strong>
                                </div>
                                <div class="bg-surface-container rounded-xl p-3 flex justify-between items-center">
                                    <span class="text-[12px] font-bold text-secondary">Cones Produced</span>
                                    <strong class="text-[16px] text-on-surface">${coneCount || '—'}</strong>
                                </div>
                                <div class="bg-surface-container rounded-xl p-3 flex justify-between items-center">
                                    <span class="text-[12px] font-bold text-secondary">Breakages</span>
                                    <strong class="text-[16px] ${breakageCount > 5 ? 'text-error' : 'text-on-surface'}">${breakageCount}</strong>
                                </div>
                                <div class="bg-surface-container rounded-xl p-3 flex justify-between items-center">
                                    <span class="text-[12px] font-bold text-secondary">Efficiency (cone fill)</span>
                                    <strong class="text-[16px] text-on-surface">${kgPerCone}</strong>
                                </div>
                            </div>
                        </div>

                        <!-- Stage Status -->
                        <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm">
                            <h4 class="text-[13px] font-bold text-secondary uppercase tracking-wider mb-3">Stage Status</h4>
                            <select name="status" id="winding-status"
                                class="w-full bg-surface border border-outline-variant rounded-xl px-3 py-2.5 text-[14px] font-bold text-on-surface outline-none focus:border-[#FF6B35]">
                                <option value="In Progress" ${(sd.status || 'In Progress') === 'In Progress' ? 'selected' : ''}>In Progress</option>
                                <option value="Completed"   ${sd.status === 'Completed' ? 'selected' : ''}>Completed — Ready for Knitting</option>
                            </select>
                        </div>

                        <!-- Next Stage Info -->
                        <div class="bg-[#0EA5E9]/5 border border-[#0EA5E9]/20 rounded-2xl p-4">
                            <div class="flex items-center gap-2 mb-2">
                                <span class="material-symbols-outlined text-[#0EA5E9] text-[18px]">grid_on</span>
                                <h5 class="text-[13px] font-bold text-[#0EA5E9]">Next Stage: Knitting</h5>
                            </div>
                            <p class="text-[12px] text-secondary leading-snug">
                                Once winding is complete, cones will be loaded onto circular knitting machines
                                to produce greige (undyed) fabric rolls.
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
            machineId:      g('winding-machine-id')?.value?.trim()  || '',
            machineType:    g('winding-machine-type')?.value         || '',
            yarnCount:      g('winding-yarn-count')?.value?.trim()   || '',
            yarnKgLoaded:   parseFloat(g('winding-yarn-kg')?.value)  || 0,
            coneCount:      parseInt(g('winding-cone-count')?.value) || 0,
            tensionSetting: g('winding-tension')?.value?.trim()      || '',
            breakageCount:  parseInt(g('winding-breakage')?.value)   || 0,
            supervisorName: g('winding-supervisor')?.value?.trim()   || '',
            shiftDate:      g('winding-shift-date')?.value           || '',
            notes:          g('winding-notes')?.value?.trim()        || '',
            status:         g('winding-status')?.value               || 'In Progress'
        };
    }
};
