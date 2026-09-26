/**
 * Garment OS — Production Workspace: Industrial Garment Washing
 * Wet processing recipes, enzyme/bio-wash bath parameters, hydro-extraction, and dimensional shrinkage QC.
 */

import { STAGE_DEFINITIONS, getProductWorkflowStages } from '../domain/workflowEngine.js?v=6.0';

export const WashingWorkspace = {
    render(order, activeProduct, stageData, stageContract = null) {
        const wash = stageData?.garment_wash || stageData?.wash || stageData?.print_wash || {};
        const targetQty = Number(activeProduct?.qty) || Number(order?.qty) || 0;

        // Dynamic Next Stage resolution
        const stages = getProductWorkflowStages(activeProduct, order?.workflowType);
        const currentIdx = stages.indexOf('garment_wash') !== -1 ? stages.indexOf('garment_wash') : stages.indexOf('wash');
        const nextStageKey = (currentIdx >= 0 && currentIdx < stages.length - 1) ? stages[currentIdx + 1] : 'packing';
        const nextDef = STAGE_DEFINITIONS[nextStageKey] || { label: 'Next Stage', shortLabel: 'Next Stage' };
        const nextLabel = nextDef.shortLabel || nextDef.label;

        const garmentsSent = Number(wash.garmentsSent) || Number(wash.panelsDispatched) || targetQty;
        const garmentsWashed = Number(wash.garmentsWashed) || Number(wash.panelsReceived) || 0;
        const washRejects = Number(wash.washRejects) || Number(wash.rejectedPanels) || 0;
        const pending = Math.max(0, garmentsSent - garmentsWashed);
        const completionPct = garmentsSent > 0 ? Math.min(100, Math.round((garmentsWashed / garmentsSent) * 100)) : 0;
        const rejectRate = garmentsWashed > 0 ? ((washRejects / garmentsWashed) * 100).toFixed(1) : '0.0';

        const washRecipe = wash.washRecipe || 'Bio-Polish + Silicone Softener Wash';
        const liquorRatio = wash.liquorRatio || '1:10';
        const washTempC = Number(wash.washTempC || 55);
        const cycleTimeMin = Number(wash.cycleTimeMin || 45);
        const postWashShrinkage = wash.postWashShrinkage || '3.2% Length / 2.5% Width';
        const measurementApproved = Boolean(wash.measurementApproved);

        return `
            <div class="flex flex-col gap-5 animate-fade-in" id="washing-workspace-root">
                
                <!-- Stage Header Banner -->
                <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm">
                    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div class="flex items-center gap-3">
                            <div class="w-12 h-12 rounded-xl bg-[#30B0C7]/10 text-[#30B0C7] flex items-center justify-center font-bold">
                                <span class="material-symbols-outlined text-[26px]">waves</span>
                            </div>
                            <div>
                                <div class="flex items-center gap-2">
                                    <h3 class="text-[18px] font-bold text-on-surface">Industrial Garment Washing</h3>
                                    <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold ${completionPct === 100 ? 'bg-[#34C759]/15 text-[#34C759]' : 'bg-[#30B0C7]/15 text-[#30B0C7]'}">
                                        Washed: ${garmentsWashed.toLocaleString()} / ${garmentsSent.toLocaleString()} pcs
                                    </span>
                                </div>
                                <p class="text-[13px] text-secondary mt-0.5">Enzyme & silicone softening, hydro-tumbler drying, and post-wash shrinkage audit</p>
                            </div>
                        </div>

                        <div class="flex items-center gap-2 w-full sm:w-auto">
                            <button type="button" onclick="window.productionRouter.saveCurrentStage(false)" 
                                class="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-outline-variant bg-surface-container-high text-on-surface text-[13px] font-bold hover:bg-surface-variant active-scale transition-apple">
                                Save Progress
                            </button>
                            <button type="button" onclick="window.productionRouter.saveCurrentStage(true)" 
                                class="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-primary text-white text-[13px] font-bold hover:bg-primary-hover active-scale transition-apple shadow-sm flex items-center justify-center gap-1.5">
                                <span>Advance to ${nextLabel}</span>
                                <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
                            </button>
                        </div>
                    </div>
                </div>

                <form id="stage-form-washing" onsubmit="event.preventDefault(); window.productionRouter.saveCurrentStage(false);">
                    <!-- Metric Cards Grid -->
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mb-5">
                        <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 shadow-xs">
                            <span class="text-[11px] font-bold text-secondary uppercase tracking-wider block mb-1">Loaded for Washing</span>
                            <div class="text-[22px] font-black text-on-surface">${garmentsSent.toLocaleString()} <span class="text-[12px] font-normal text-secondary">pcs</span></div>
                        </div>
                        <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 shadow-xs">
                            <span class="text-[11px] font-bold text-secondary uppercase tracking-wider block mb-1">Washed & Dried Output</span>
                            <div class="text-[22px] font-black text-primary">${garmentsWashed.toLocaleString()} <span class="text-[12px] font-normal text-secondary">pcs</span></div>
                        </div>
                        <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 shadow-xs">
                            <span class="text-[11px] font-bold text-secondary uppercase tracking-wider block mb-1">Wash Rejects / Tears</span>
                            <div class="text-[22px] font-black ${washRejects > 0 ? 'text-error' : 'text-on-surface'}">${washRejects.toLocaleString()} <span class="text-[12px] font-normal text-secondary">(${rejectRate}%)</span></div>
                        </div>
                        <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 shadow-xs">
                            <span class="text-[11px] font-bold text-secondary uppercase tracking-wider block mb-1">Remaining in Tumble Bath</span>
                            <div class="text-[22px] font-black ${pending > 0 ? 'text-orange-500' : 'text-[#34C759]'}">${pending.toLocaleString()} <span class="text-[12px] font-normal text-secondary">pcs</span></div>
                        </div>
                    </div>

                    <!-- Washing Recipe & Chemical Formulation -->
                    <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm mb-5">
                        <div class="flex items-center gap-2 pb-3 border-b border-outline-variant/60 mb-4">
                            <span class="material-symbols-outlined text-[20px] text-primary">science</span>
                            <h4 class="text-[15px] font-bold text-on-surface">1. Wash Recipe & Machine Bath Parameters</h4>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label class="block text-[12px] font-bold text-secondary mb-1.5">Wash Process / Recipe Type</label>
                                <select name="washRecipe" class="w-full bg-surface-container border border-outline-variant rounded-xl px-3.5 py-2.5 text-[13px] font-medium text-on-surface outline-none focus:border-primary">
                                    <option value="Bio-Polish + Silicone Softener Wash" ${washRecipe.includes('Bio') ? 'selected' : ''}>Bio-Polish + Silicone Softener Wash</option>
                                    <option value="Enzyme Stone Wash" ${washRecipe.includes('Stone') ? 'selected' : ''}>Enzyme Stone Wash</option>
                                    <option value="Acid Wash / Marble Finish" ${washRecipe.includes('Acid') ? 'selected' : ''}>Acid Wash / Marble Finish</option>
                                    <option value="Vintage Mineral Dye Wash" ${washRecipe.includes('Mineral') ? 'selected' : ''}>Vintage Mineral Dye Wash</option>
                                    <option value="Normal Softener Rinsing" ${washRecipe.includes('Normal') ? 'selected' : ''}>Normal Softener Rinsing</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-[12px] font-bold text-secondary mb-1.5">Liquor Ratio (Material : Water)</label>
                                <input type="text" name="liquorRatio" value="${liquorRatio}" class="w-full bg-surface-container border border-outline-variant rounded-xl px-3.5 py-2.5 text-[13px] font-medium text-on-surface outline-none focus:border-primary">
                            </div>
                            <div>
                                <label class="block text-[12px] font-bold text-secondary mb-1.5">Bath Temperature (°C)</label>
                                <input type="number" name="washTempC" value="${washTempC}" class="w-full bg-surface-container border border-outline-variant rounded-xl px-3.5 py-2.5 text-[13px] font-medium text-on-surface outline-none focus:border-primary">
                            </div>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                            <div>
                                <label class="block text-[12px] font-bold text-secondary mb-1.5">Tumbler Cycle Duration (Minutes)</label>
                                <input type="number" name="cycleTimeMin" value="${cycleTimeMin}" class="w-full bg-surface-container border border-outline-variant rounded-xl px-3.5 py-2.5 text-[13px] font-medium text-on-surface outline-none focus:border-primary">
                            </div>
                            <div>
                                <label class="block text-[12px] font-bold text-secondary mb-1.5">Washing Unit / Processor</label>
                                <input type="text" name="washVendorName" value="${wash.washVendorName || 'In-House Washing Tumbler A'}" class="w-full bg-surface-container border border-outline-variant rounded-xl px-3.5 py-2.5 text-[13px] font-medium text-on-surface outline-none focus:border-primary">
                            </div>
                        </div>
                    </div>

                    <!-- Post-Wash Dimensional Stability & Measurement QC -->
                    <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm">
                        <div class="flex items-center justify-between pb-3 border-b border-outline-variant/60 mb-4">
                            <div class="flex items-center gap-2">
                                <span class="material-symbols-outlined text-[20px] text-primary">straighten</span>
                                <h4 class="text-[15px] font-bold text-on-surface">2. Post-Wash Dimensional Stability & Audit</h4>
                            </div>
                            <span class="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${measurementApproved ? 'bg-[#34C759]/15 text-[#34C759]' : 'bg-orange-500/15 text-orange-600'}">
                                ${measurementApproved ? 'SPECS PASSED' : 'MEASUREMENT PENDING'}
                            </span>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label class="block text-[12px] font-bold text-secondary mb-1.5">Garments Sent into Washer</label>
                                <input type="number" name="garmentsSent" value="${garmentsSent}" class="w-full bg-surface-container border border-outline-variant rounded-xl px-3.5 py-2.5 text-[13px] font-medium text-on-surface outline-none focus:border-primary">
                            </div>
                            <div>
                                <label class="block text-[12px] font-bold text-secondary mb-1.5">Good Finished Washed Garments</label>
                                <input type="number" name="garmentsWashed" value="${garmentsWashed}" class="w-full bg-surface-container border border-outline-variant rounded-xl px-3.5 py-2.5 text-[13px] font-medium text-on-surface outline-none focus:border-primary">
                            </div>
                            <div>
                                <label class="block text-[12px] font-bold text-secondary mb-1.5">Wash Rejects (Holes / Seam Tears)</label>
                                <input type="number" name="washRejects" value="${washRejects}" class="w-full bg-surface-container border border-outline-variant rounded-xl px-3.5 py-2.5 text-[13px] font-medium text-error outline-none focus:border-error">
                            </div>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                            <div>
                                <label class="block text-[12px] font-bold text-secondary mb-1.5">Tested Shrinkage / Growth Spec</label>
                                <input type="text" name="postWashShrinkage" value="${postWashShrinkage}" placeholder="e.g. 3.0% Length / 2.0% Width" class="w-full bg-surface-container border border-outline-variant rounded-xl px-3.5 py-2.5 text-[13px] font-medium text-on-surface outline-none focus:border-primary">
                            </div>
                            <div class="flex items-end">
                                <label class="flex items-center gap-2 cursor-pointer pb-3">
                                    <input type="checkbox" name="measurementApproved" value="true" ${measurementApproved ? 'checked' : ''} class="w-4 h-4 rounded text-primary focus:ring-primary">
                                    <span class="text-[13px] font-bold text-on-surface">Post-Wash Measurement Table Matches Spec Tolerance</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        `;
    },

    extractFormData() {
        const form = document.getElementById('stage-form-washing');
        if (!form) return {};
        const fd = new FormData(form);

        return {
            washRecipe:           fd.get('washRecipe') || 'Enzyme Wash',
            liquorRatio:          fd.get('liquorRatio') || '1:10',
            washTempC:            Number(fd.get('washTempC')) || 55,
            cycleTimeMin:         Number(fd.get('cycleTimeMin')) || 45,
            washVendorName:       fd.get('washVendorName') || '',
            garmentsSent:         Number(fd.get('garmentsSent')) || 0,
            garmentsWashed:       Number(fd.get('garmentsWashed')) || 0,
            actualGoodOutput:     Number(fd.get('garmentsWashed')) || 0,
            washRejects:          Number(fd.get('washRejects')) || 0,
            postWashShrinkage:    fd.get('postWashShrinkage') || '',
            measurementApproved:  fd.get('measurementApproved') === 'true' || form.querySelector('input[name="measurementApproved"]')?.checked === true,
            status:               (Number(fd.get('garmentsWashed')) >= Number(fd.get('garmentsSent')) && Number(fd.get('garmentsSent')) > 0) ? 'Completed' : 'In Progress'
        };
    }
};
