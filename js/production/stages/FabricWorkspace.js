/**
 * Garment OS — Production Hero Hub: Fabric Workspace
 * Fabric lot receipt, roll tally, GSM, Dia, shrinkage, 4-point inspection, and cutting release.
 */

import { STAGE_DEFINITIONS } from '../domain/workflowEngine.js?v=5.5';

export const FabricWorkspace = {
    render(order, activeProduct, stageData) {
        const fab = stageData?.fabric || {};
        const targetQty = Number(activeProduct?.qty) || Number(order?.qty) || 0;
        
        const totalKg = Number(fab.totalKg) || (targetQty > 0 ? Math.round(targetQty * 0.22) : 100);
        const rollsReceived = Number(fab.rollsReceived) || (totalKg > 0 ? Math.max(1, Math.round(totalKg / 24)) : 4);
        const gsm = Number(fab.gsm) || 180;
        const dia = Number(fab.dia) || 72;
        const lotNumber = fab.lotNumber || `LOT-${order?.id || 'FAB'}-01`;
        const inspectionScore = fab.inspectionScore || 'Pass';
        const isReady = Boolean(fab.readyForCutting);

        // Yield estimate: 1 kg gives ~4.5 t-shirts (1 / 0.22)
        const estYieldPieces = totalKg > 0 ? Math.round(totalKg / 0.22) : targetQty;
        const yieldRatio = totalKg > 0 ? (estYieldPieces / totalKg).toFixed(1) : '4.5';

        return `
            <div class="flex flex-col gap-5 animate-fade-in" id="fabric-workspace-root">
                
                <!-- Stage Header Banner -->
                <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm">
                    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div class="flex items-center gap-3">
                            <div class="w-12 h-12 rounded-xl bg-[#007AFF]/10 text-[#007AFF] flex items-center justify-center font-bold">
                                <span class="material-symbols-outlined text-[26px]">texture</span>
                            </div>
                            <div>
                                <div class="flex items-center gap-2">
                                    <h3 class="text-[18px] font-bold text-on-surface">Fabric Inward & Quality Inspection</h3>
                                    <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold ${inspectionScore === 'Pass' ? 'bg-[#34C759]/15 text-[#34C759]' : 'bg-orange-500/15 text-orange-500'}">
                                        QC: ${inspectionScore}
                                    </span>
                                </div>
                                <p class="text-[13px] text-secondary mt-0.5">Roll audit, GSM & Dia verification, shrinkage test, and cutting release approval</p>
                            </div>
                        </div>

                        <div class="flex items-center gap-2 w-full sm:w-auto">
                            <button type="button" onclick="window.productionRouter.saveCurrentStage(false)" 
                                class="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-outline-variant bg-surface-container-high text-on-surface text-[13px] font-bold hover:bg-surface-variant active-scale transition-apple">
                                Save Inspection
                            </button>
                            <button type="button" onclick="window.productionRouter.saveCurrentStage(true)" 
                                class="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-primary text-white text-[13px] font-bold hover:bg-primary-hover active-scale transition-apple shadow-sm flex items-center justify-center gap-1.5">
                                <span>Release to Cutting</span>
                                <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
                            </button>
                        </div>
                    </div>
                </div>

                <form id="stage-form-fabric" onsubmit="event.preventDefault(); window.productionRouter.saveCurrentStage(false);">
                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
                        
                        <!-- Left Column: Lot & Technical Specs -->
                        <div class="flex flex-col gap-5 lg:col-span-2">
                            
                            <!-- Lot & Weight Metrics -->
                            <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm">
                                <h4 class="text-[14px] font-bold text-on-surface uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <span class="material-symbols-outlined text-primary text-[18px]">inventory</span>
                                    Fabric Lot & Roll Metrics
                                </h4>

                                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div>
                                        <label class="block text-[12px] font-bold text-secondary mb-1">Dyeing Lot Number</label>
                                        <input type="text" name="lotNumber" value="${lotNumber}" 
                                            placeholder="e.g. LOT-4029"
                                            class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2.5 text-[14px] text-on-surface font-medium focus:border-primary outline-none">
                                    </div>

                                    <div>
                                        <label class="block text-[12px] font-bold text-secondary mb-1">Rolls Received</label>
                                        <div class="flex items-baseline gap-1">
                                            <input type="number" name="rollsReceived" value="${rollsReceived}" 
                                                class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2.5 text-[15px] font-extrabold text-on-surface focus:border-primary outline-none">
                                            <span class="text-[13px] font-bold text-secondary">Rolls</span>
                                        </div>
                                    </div>

                                    <div>
                                        <label class="block text-[12px] font-bold text-secondary mb-1">Total Net Weight</label>
                                        <div class="flex items-baseline gap-1">
                                            <input type="number" step="0.1" name="totalKg" value="${totalKg}" 
                                                class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2.5 text-[15px] font-extrabold text-primary focus:border-primary outline-none">
                                            <span class="text-[13px] font-bold text-secondary">Kg</span>
                                        </div>
                                    </div>
                                </div>

                                <!-- Yield Banner -->
                                <div class="mt-4 p-3.5 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between">
                                    <div class="flex items-center gap-2">
                                        <span class="material-symbols-outlined text-primary text-[20px]">calculate</span>
                                        <div>
                                            <p class="text-[13px] font-bold text-on-surface">Calculated Fabric Yield</p>
                                            <p class="text-[11px] text-secondary">Average ${yieldRatio} pcs / kg based on 100% Cotton Single Jersey</p>
                                        </div>
                                    </div>
                                    <div class="text-right">
                                        <span class="text-[18px] font-extrabold text-primary">~${estYieldPieces.toLocaleString()}</span>
                                        <span class="text-[11px] font-bold text-secondary block">Max Garment Yield</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Fabric Technical Specifications -->
                            <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm">
                                <h4 class="text-[14px] font-bold text-on-surface uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <span class="material-symbols-outlined text-[#007AFF] text-[18px]">straighten</span>
                                    Technical Parameters & QC Tests
                                </h4>

                                <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    <div>
                                        <label class="block text-[12px] font-bold text-secondary mb-1">Fabric GSM</label>
                                        <input type="number" name="gsm" value="${gsm}" 
                                            class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2.5 text-[14px] font-bold text-on-surface focus:border-primary outline-none">
                                    </div>

                                    <div>
                                        <label class="block text-[12px] font-bold text-secondary mb-1">Dia / Width (Inches)</label>
                                        <input type="number" name="dia" value="${dia}" 
                                            class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2.5 text-[14px] font-bold text-on-surface focus:border-primary outline-none">
                                    </div>

                                    <div>
                                        <label class="block text-[12px] font-bold text-secondary mb-1">Shrinkage %</label>
                                        <input type="text" name="shrinkagePercentage" value="${fab.shrinkagePercentage || '3-4%'}" 
                                            placeholder="e.g. 3.5%"
                                            class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2.5 text-[14px] font-bold text-on-surface focus:border-primary outline-none">
                                    </div>

                                    <div>
                                        <label class="block text-[12px] font-bold text-secondary mb-1">Color / Shade</label>
                                        <input type="text" name="colorShade" value="${fab.colorShade || 'Navy Blue (Shade A)'}" 
                                            class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2.5 text-[14px] font-bold text-on-surface focus:border-primary outline-none">
                                    </div>
                                </div>
                            </div>

                        </div>

                        <!-- Right Column: Inspection & Release -->
                        <div class="flex flex-col gap-5">
                            
                            <!-- 4-Point Inspection -->
                            <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm">
                                <h4 class="text-[14px] font-bold text-on-surface uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <span class="material-symbols-outlined text-[#34C759] text-[18px]">verified</span>
                                    4-Point Inspection & Shade
                                </h4>

                                <div class="flex flex-col gap-4">
                                    <div>
                                        <label class="block text-[12px] font-bold text-secondary mb-1">Lab Dip / Shade Status</label>
                                        <select name="labDipStatus" class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2.5 text-[13px] font-bold text-on-surface focus:border-primary outline-none">
                                            <option value="Approved" ${fab.labDipStatus === 'Approved' ? 'selected' : ''}>Approved by Customer</option>
                                            <option value="Pending" ${fab.labDipStatus === 'Pending' ? 'selected' : ''}>Pending Approval</option>
                                            <option value="Rejected" ${fab.labDipStatus === 'Rejected' ? 'selected' : ''}>Rejected / Re-dye</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label class="block text-[12px] font-bold text-secondary mb-1">Defects Count (Holes/Lines)</label>
                                        <input type="number" name="fabricDefectsCount" value="${fab.fabricDefectsCount || 0}" 
                                            class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2 text-[14px] font-bold text-on-surface focus:border-primary outline-none">
                                    </div>

                                    <div>
                                        <label class="block text-[12px] font-bold text-secondary mb-1">Overall Inspection Score</label>
                                        <select name="inspectionScore" class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2.5 text-[13px] font-bold text-on-surface focus:border-primary outline-none">
                                            <option value="Pass" ${inspectionScore === 'Pass' ? 'selected' : ''}>Pass (Release to Cut)</option>
                                            <option value="Hold" ${inspectionScore === 'Hold' ? 'selected' : ''}>Hold for Relaxation</option>
                                            <option value="Reject" ${inspectionScore === 'Reject' ? 'selected' : ''}>Reject (Return to Mill)</option>
                                        </select>
                                    </div>

                                    <label class="flex items-center gap-3 p-3 rounded-xl bg-surface-container border border-outline-variant/60 cursor-pointer hover:bg-surface-variant transition-apple">
                                        <input type="checkbox" name="readyForCutting" ${isReady || inspectionScore === 'Pass' ? 'checked' : ''} class="w-5 h-5 rounded text-primary focus:ring-primary">
                                        <div>
                                            <p class="text-[13px] font-bold text-on-surface">Relaxed & Ready for Cutting</p>
                                            <p class="text-[11px] text-secondary">24h fabric relaxation period observed</p>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            <!-- Fabric Notes -->
                            <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm">
                                <h4 class="text-[14px] font-bold text-on-surface uppercase tracking-wider mb-2">Remarks & Shade Notes</h4>
                                <textarea name="notes" rows="2" placeholder="Shade variance, torque/skewness notes..."
                                    class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl p-3 text-[13px] text-on-surface font-medium focus:border-primary outline-none">${fab.notes || ''}</textarea>
                            </div>

                        </div>

                    </div>
                </form>

            </div>
        `;
    },

    extractFormData() {
        const form = document.getElementById('stage-form-fabric');
        if (!form) return {};
        const fd = new FormData(form);
        return {
            lotNumber: fd.get('lotNumber') || '',
            rollsReceived: Number(fd.get('rollsReceived')) || 0,
            totalKg: Number(fd.get('totalKg')) || 0,
            gsm: Number(fd.get('gsm')) || 180,
            dia: Number(fd.get('dia')) || 72,
            shrinkagePercentage: fd.get('shrinkagePercentage') || '',
            colorShade: fd.get('colorShade') || '',
            labDipStatus: fd.get('labDipStatus') || 'Approved',
            fabricDefectsCount: Number(fd.get('fabricDefectsCount')) || 0,
            inspectionScore: fd.get('inspectionScore') || 'Pass',
            readyForCutting: Boolean(fd.get('readyForCutting')),
            notes: fd.get('notes') || ''
        };
    }
};
