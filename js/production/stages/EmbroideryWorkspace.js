/**
 * Garment OS — Production Workspace: Computerized Embroidery
 * Multi-head embroidery machine allocation, DST program stitch counts, thread shade sequences, and needle puncture QC.
 */

import { STAGE_DEFINITIONS, getProductWorkflowStages } from '../domain/workflowEngine.js?v=6.0';

export const EmbroideryWorkspace = {
    render(order, activeProduct, stageData, stageContract = null) {
        const emb = stageData?.embroidery || stageData?.print_wash || {};
        const targetQty = Number(activeProduct?.qty) || Number(order?.qty) || 0;

        // Dynamic Next Stage resolution
        const stages = getProductWorkflowStages(activeProduct, order?.workflowType);
        const currentIdx = stages.indexOf('embroidery');
        const nextStageKey = (currentIdx >= 0 && currentIdx < stages.length - 1) ? stages[currentIdx + 1] : 'packing';
        const nextDef = STAGE_DEFINITIONS[nextStageKey] || { label: 'Next Stage', shortLabel: 'Next Stage' };
        const nextLabel = nextDef.shortLabel || nextDef.label;

        const piecesSent = Number(emb.piecesSent) || Number(emb.panelsDispatched) || targetQty;
        const piecesCompleted = Number(emb.piecesCompleted) || Number(emb.panelsReceived) || 0;
        const rejects = Number(emb.rejectedPieces) || Number(emb.rejectedPanels) || 0;
        const needleBreaks = Number(emb.needleBreaksCount || 0);
        const stitchCount = Number(emb.stitchCount || 14500);
        const machineId = emb.machineId || 'Tajima 20-Head (Line EMB-1)';
        const dstFileName = emb.dstFileName || `${activeProduct?.name || 'EMB-LOGO'}_v1.dst`;

        const completionPct = piecesSent > 0 ? Math.min(100, Math.round((piecesCompleted / piecesSent) * 100)) : 0;
        const rejectRate = piecesCompleted > 0 ? ((rejects / piecesCompleted) * 100).toFixed(1) : '0.0';

        return `
            <div class="flex flex-col gap-5 animate-fade-in" id="embroidery-workspace-root">
                
                <!-- Stage Header Banner -->
                <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm">
                    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div class="flex items-center gap-3">
                            <div class="w-12 h-12 rounded-xl bg-[#FF9500]/10 text-[#FF9500] flex items-center justify-center font-bold">
                                <span class="material-symbols-outlined text-[26px]">auto_fix_high</span>
                            </div>
                            <div>
                                <div class="flex items-center gap-2">
                                    <h3 class="text-[18px] font-bold text-on-surface">Computerized Embroidery</h3>
                                    <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold ${completionPct === 100 ? 'bg-[#34C759]/15 text-[#34C759]' : 'bg-[#FF9500]/15 text-[#FF9500]'}">
                                        Completed: ${piecesCompleted.toLocaleString()} / ${piecesSent.toLocaleString()} pcs
                                    </span>
                                </div>
                                <p class="text-[13px] text-secondary mt-0.5">Multi-head machine setup, DST stitch count tracking, and needle puncture quality inspection</p>
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

                <form id="stage-form-embroidery" onsubmit="event.preventDefault(); window.productionRouter.saveCurrentStage(false);">
                    <!-- Metric Cards Grid -->
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mb-5">
                        <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 shadow-xs">
                            <span class="text-[11px] font-bold text-secondary uppercase tracking-wider block mb-1">Total Pieces Loaded</span>
                            <div class="text-[22px] font-black text-on-surface">${piecesSent.toLocaleString()} <span class="text-[12px] font-normal text-secondary">pcs</span></div>
                        </div>
                        <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 shadow-xs">
                            <span class="text-[11px] font-bold text-secondary uppercase tracking-wider block mb-1">Embroidered Output</span>
                            <div class="text-[22px] font-black text-primary">${piecesCompleted.toLocaleString()} <span class="text-[12px] font-normal text-secondary">pcs</span></div>
                        </div>
                        <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 shadow-xs">
                            <span class="text-[11px] font-bold text-secondary uppercase tracking-wider block mb-1">Needle Breakes Log</span>
                            <div class="text-[22px] font-black ${needleBreaks > 5 ? 'text-error' : 'text-on-surface'}">${needleBreaks} <span class="text-[12px] font-normal text-secondary">incidents</span></div>
                        </div>
                        <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 shadow-xs">
                            <span class="text-[11px] font-bold text-secondary uppercase tracking-wider block mb-1">Embroidery Rejects</span>
                            <div class="text-[22px] font-black ${rejects > 0 ? 'text-error' : 'text-[#34C759]'}">${rejects.toLocaleString()} <span class="text-[12px] font-normal text-secondary">(${rejectRate}%)</span></div>
                        </div>
                    </div>

                    <!-- Machine Program & Stitch Specifications -->
                    <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm mb-5">
                        <div class="flex items-center gap-2 pb-3 border-b border-outline-variant/60 mb-4">
                            <span class="material-symbols-outlined text-[20px] text-primary">precision_manufacturing</span>
                            <h4 class="text-[15px] font-bold text-on-surface">1. Machine Allocation & DST Program Specifications</h4>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label class="block text-[12px] font-bold text-secondary mb-1.5">Machine / Head Group</label>
                                <input type="text" name="machineId" value="${machineId}" class="w-full bg-surface-container border border-outline-variant rounded-xl px-3.5 py-2.5 text-[13px] font-medium text-on-surface outline-none focus:border-primary">
                            </div>
                            <div>
                                <label class="block text-[12px] font-bold text-secondary mb-1.5">DST Program File</label>
                                <input type="text" name="dstFileName" value="${dstFileName}" class="w-full bg-surface-container border border-outline-variant rounded-xl px-3.5 py-2.5 text-[13px] font-mono text-on-surface outline-none focus:border-primary">
                            </div>
                            <div>
                                <label class="block text-[12px] font-bold text-secondary mb-1.5">Program Stitch Count / Piece</label>
                                <input type="number" name="stitchCount" value="${stitchCount}" class="w-full bg-surface-container border border-outline-variant rounded-xl px-3.5 py-2.5 text-[13px] font-medium text-on-surface outline-none focus:border-primary">
                            </div>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                            <div>
                                <label class="block text-[12px] font-bold text-secondary mb-1.5">Thread Specification & Shade Codes</label>
                                <input type="text" name="threadSpecs" value="${emb.threadSpecs || '100% Trilobal Polyester (Rayon Finish #40)'}" class="w-full bg-surface-container border border-outline-variant rounded-xl px-3.5 py-2.5 text-[13px] font-medium text-on-surface outline-none focus:border-primary">
                            </div>
                            <div>
                                <label class="block text-[12px] font-bold text-secondary mb-1.5">Backing Stabilizer Paper</label>
                                <input type="text" name="backingPaper" value="${emb.backingPaper || 'Tear-Away Non-Woven 45 GSM'}" class="w-full bg-surface-container border border-outline-variant rounded-xl px-3.5 py-2.5 text-[13px] font-medium text-on-surface outline-none focus:border-primary">
                            </div>
                        </div>
                    </div>

                    <!-- Production Execution & Quality Check -->
                    <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm">
                        <div class="flex items-center gap-2 pb-3 border-b border-outline-variant/60 mb-4">
                            <span class="material-symbols-outlined text-[20px] text-primary">fact_check</span>
                            <h4 class="text-[15px] font-bold text-on-surface">2. Shift Production Output & Needle Log</h4>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label class="block text-[12px] font-bold text-secondary mb-1.5">Pieces Loaded onto Framing</label>
                                <input type="number" name="piecesSent" value="${piecesSent}" class="w-full bg-surface-container border border-outline-variant rounded-xl px-3.5 py-2.5 text-[13px] font-medium text-on-surface outline-none focus:border-primary">
                            </div>
                            <div>
                                <label class="block text-[12px] font-bold text-secondary mb-1.5">Good Finished Pieces</label>
                                <input type="number" name="piecesCompleted" value="${piecesCompleted}" class="w-full bg-surface-container border border-outline-variant rounded-xl px-3.5 py-2.5 text-[13px] font-medium text-on-surface outline-none focus:border-primary">
                            </div>
                            <div>
                                <label class="block text-[12px] font-bold text-secondary mb-1.5">Rejects / Needle Holes</label>
                                <input type="number" name="rejectedPieces" value="${rejects}" class="w-full bg-surface-container border border-outline-variant rounded-xl px-3.5 py-2.5 text-[13px] font-medium text-error outline-none focus:border-error">
                            </div>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                            <div>
                                <label class="block text-[12px] font-bold text-secondary mb-1.5">Needle Breakages Count</label>
                                <input type="number" name="needleBreaksCount" value="${needleBreaks}" class="w-full bg-surface-container border border-outline-variant rounded-xl px-3.5 py-2.5 text-[13px] font-medium text-on-surface outline-none focus:border-primary">
                            </div>
                            <div>
                                <label class="block text-[12px] font-bold text-secondary mb-1.5">Supervisor / Machine Operator</label>
                                <input type="text" name="operatorName" value="${emb.operatorName || ''}" placeholder="Operator Name" class="w-full bg-surface-container border border-outline-variant rounded-xl px-3.5 py-2.5 text-[13px] font-medium text-on-surface outline-none focus:border-primary">
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        `;
    },

    extractFormData() {
        const form = document.getElementById('stage-form-embroidery');
        if (!form) return {};
        const fd = new FormData(form);

        return {
            machineId:          fd.get('machineId') || '',
            dstFileName:        fd.get('dstFileName') || '',
            stitchCount:        Number(fd.get('stitchCount')) || 0,
            threadSpecs:        fd.get('threadSpecs') || '',
            backingPaper:       fd.get('backingPaper') || '',
            piecesSent:         Number(fd.get('piecesSent')) || 0,
            piecesCompleted:    Number(fd.get('piecesCompleted')) || 0,
            actualGoodOutput:   Number(fd.get('piecesCompleted')) || 0,
            rejectedPieces:     Number(fd.get('rejectedPieces')) || 0,
            needleBreaksCount:  Number(fd.get('needleBreaksCount')) || 0,
            operatorName:       fd.get('operatorName') || '',
            status:             (Number(fd.get('piecesCompleted')) >= Number(fd.get('piecesSent')) && Number(fd.get('piecesSent')) > 0) ? 'Completed' : 'In Progress'
        };
    }
};
