/**
 * Garment OS — Production Workspace: Screen & Digital Printing
 * Embellishment strike-off approvals, screen mesh specs, ink curing temps, panel outward/inward tally, and reject tracking.
 */

import { STAGE_DEFINITIONS, getProductWorkflowStages } from '../domain/workflowEngine.js?v=6.0';

export const PrintingWorkspace = {
    render(order, activeProduct, stageData, stageContract = null) {
        const pw = stageData?.printing || stageData?.print_wash || {};
        const targetQty = Number(activeProduct?.qty) || Number(order?.qty) || 0;

        // Dynamic Next Stage resolution
        const stages = getProductWorkflowStages(activeProduct, order?.workflowType);
        const currentIdx = stages.indexOf('printing') !== -1 ? stages.indexOf('printing') : stages.indexOf('print_wash');
        const nextStageKey = (currentIdx >= 0 && currentIdx < stages.length - 1) ? stages[currentIdx + 1] : 'stitching';
        const nextDef = STAGE_DEFINITIONS[nextStageKey] || { label: 'Next Stage', shortLabel: 'Next Stage' };
        const nextLabel = nextDef.shortLabel || nextDef.label;

        const printMethod = pw.printMethod || pw.technique || 'Screen Print (Plastisol)';
        const panelsSent = Number(pw.panelsDispatched) || targetQty;
        const panelsReceived = Number(pw.panelsReceived) || 0;
        const rejects = Number(pw.rejectedPanels) || 0;
        const pending = Math.max(0, panelsSent - panelsReceived);
        const completionPct = panelsSent > 0 ? Math.min(100, Math.round((panelsReceived / panelsSent) * 100)) : 0;
        const rejectRate = panelsReceived > 0 ? ((rejects / panelsReceived) * 100).toFixed(1) : '0.0';

        const strikeOffApproved = Boolean(pw.strikeOffApproved);
        const curingTemp = Number(pw.curingTempC || 160);
        const screenCount = Number(pw.screenCount || 4);

        return `
            <div class="flex flex-col gap-5 animate-fade-in" id="printing-workspace-root">
                
                <!-- Stage Header Banner -->
                <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm">
                    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div class="flex items-center gap-3">
                            <div class="w-12 h-12 rounded-xl bg-[#AF52DE]/10 text-[#AF52DE] flex items-center justify-center font-bold">
                                <span class="material-symbols-outlined text-[26px]">palette</span>
                            </div>
                            <div>
                                <div class="flex items-center gap-2">
                                    <h3 class="text-[18px] font-bold text-on-surface">Screen & Digital Printing</h3>
                                    <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold ${completionPct === 100 ? 'bg-[#34C759]/15 text-[#34C759]' : 'bg-[#AF52DE]/15 text-[#AF52DE]'}">
                                        Received: ${panelsReceived.toLocaleString()} / ${panelsSent.toLocaleString()} panels
                                    </span>
                                </div>
                                <p class="text-[13px] text-secondary mt-0.5">Strike-off approvals, ink formulations, tunnel curing, and panel reject tracking</p>
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

                <form id="stage-form-printing" onsubmit="event.preventDefault(); window.productionRouter.saveCurrentStage(false);">
                    <!-- Metric Cards Grid -->
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mb-5">
                        <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 shadow-xs">
                            <span class="text-[11px] font-bold text-secondary uppercase tracking-wider block mb-1">Panels Dispatched</span>
                            <div class="text-[22px] font-black text-on-surface">${panelsSent.toLocaleString()} <span class="text-[12px] font-normal text-secondary">pcs</span></div>
                        </div>
                        <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 shadow-xs">
                            <span class="text-[11px] font-bold text-secondary uppercase tracking-wider block mb-1">Panels Received</span>
                            <div class="text-[22px] font-black text-primary">${panelsReceived.toLocaleString()} <span class="text-[12px] font-normal text-secondary">pcs</span></div>
                        </div>
                        <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 shadow-xs">
                            <span class="text-[11px] font-bold text-secondary uppercase tracking-wider block mb-1">Print Rejects</span>
                            <div class="text-[22px] font-black ${rejects > 0 ? 'text-error' : 'text-on-surface'}">${rejects.toLocaleString()} <span class="text-[12px] font-normal text-secondary">(${rejectRate}%)</span></div>
                        </div>
                        <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 shadow-xs">
                            <span class="text-[11px] font-bold text-secondary uppercase tracking-wider block mb-1">Pending Floor Balance</span>
                            <div class="text-[22px] font-black ${pending > 0 ? 'text-orange-500' : 'text-[#34C759]'}">${pending.toLocaleString()} <span class="text-[12px] font-normal text-secondary">pcs</span></div>
                        </div>
                    </div>

                    <!-- Strike-Off Physical Approval Card -->
                    <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm mb-5">
                        <div class="flex items-center justify-between pb-3 border-b border-outline-variant/60 mb-4">
                            <div class="flex items-center gap-2">
                                <span class="material-symbols-outlined text-[20px] text-primary">verified</span>
                                <h4 class="text-[15px] font-bold text-on-surface">1. Physical Strike-Off Quality Gate</h4>
                            </div>
                            <span class="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${strikeOffApproved ? 'bg-[#34C759]/15 text-[#34C759]' : 'bg-orange-500/15 text-orange-600'}">
                                ${strikeOffApproved ? 'APPROVED FOR BULK' : 'APPROVAL PENDING'}
                            </span>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label class="block text-[12px] font-bold text-secondary mb-1.5">Print Method / Ink Type</label>
                                <select name="printMethod" class="w-full bg-surface-container border border-outline-variant rounded-xl px-3.5 py-2.5 text-[13px] font-medium text-on-surface outline-none focus:border-primary">
                                    <option value="Screen Print (Plastisol)" ${printMethod.includes('Plastisol') ? 'selected' : ''}>Screen Print (Plastisol)</option>
                                    <option value="Screen Print (Water-Based)" ${printMethod.includes('Water') ? 'selected' : ''}>Screen Print (Water-Based / Discharge)</option>
                                    <option value="Direct to Film (DTF)" ${printMethod.includes('DTF') ? 'selected' : ''}>Direct to Film (DTF)</option>
                                    <option value="Sublimation Heat Transfer" ${printMethod.includes('Sublimation') ? 'selected' : ''}>Sublimation Heat Transfer</option>
                                    <option value="High-Density Silicone" ${printMethod.includes('Silicone') ? 'selected' : ''}>High-Density Silicone Print</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-[12px] font-bold text-secondary mb-1.5">Screen / Color Count</label>
                                <input type="number" name="screenCount" value="${screenCount}" min="1" max="12" class="w-full bg-surface-container border border-outline-variant rounded-xl px-3.5 py-2.5 text-[13px] font-medium text-on-surface outline-none focus:border-primary">
                            </div>
                            <div>
                                <label class="block text-[12px] font-bold text-secondary mb-1.5">Tunnel Oven Curing Temp (°C)</label>
                                <input type="number" name="curingTempC" value="${curingTemp}" class="w-full bg-surface-container border border-outline-variant rounded-xl px-3.5 py-2.5 text-[13px] font-medium text-on-surface outline-none focus:border-primary">
                            </div>
                        </div>

                        <div class="mt-4 pt-3 border-t border-outline-variant/40 flex items-center justify-between">
                            <label class="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" name="strikeOffApproved" value="true" ${strikeOffApproved ? 'checked' : ''} class="w-4 h-4 rounded text-primary focus:ring-primary">
                                <span class="text-[13px] font-bold text-on-surface">Buyer Swatch / First Panel Strike-Off Approved</span>
                            </label>
                            <span class="text-[11px] text-secondary">Requires visual confirmation before bulk run</span>
                        </div>
                    </div>

                    <!-- Panel Tally & Reject Logging -->
                    <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm">
                        <div class="flex items-center gap-2 pb-3 border-b border-outline-variant/60 mb-4">
                            <span class="material-symbols-outlined text-[20px] text-primary">local_shipping</span>
                            <h4 class="text-[15px] font-bold text-on-surface">2. Outward / Inward Panel Logistics & Rejects</h4>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label class="block text-[12px] font-bold text-secondary mb-1.5">Panels Sent to Print Floor</label>
                                <input type="number" name="panelsDispatched" value="${panelsSent}" class="w-full bg-surface-container border border-outline-variant rounded-xl px-3.5 py-2.5 text-[13px] font-medium text-on-surface outline-none focus:border-primary">
                            </div>
                            <div>
                                <label class="block text-[12px] font-bold text-secondary mb-1.5">Good Panels Received Back</label>
                                <input type="number" name="panelsReceived" value="${panelsReceived}" class="w-full bg-surface-container border border-outline-variant rounded-xl px-3.5 py-2.5 text-[13px] font-medium text-on-surface outline-none focus:border-primary">
                            </div>
                            <div>
                                <label class="block text-[12px] font-bold text-secondary mb-1.5">Print Rejects (Misprint / Bleed)</label>
                                <input type="number" name="rejectedPanels" value="${rejects}" class="w-full bg-surface-container border border-outline-variant rounded-xl px-3.5 py-2.5 text-[13px] font-medium text-error outline-none focus:border-error">
                            </div>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                            <div>
                                <label class="block text-[12px] font-bold text-secondary mb-1.5">Printing Table / Processor Name</label>
                                <input type="text" name="processorVendorName" value="${pw.processorVendorName || 'In-House Screen Table 1'}" class="w-full bg-surface-container border border-outline-variant rounded-xl px-3.5 py-2.5 text-[13px] font-medium text-on-surface outline-none focus:border-primary">
                            </div>
                            <div>
                                <label class="block text-[12px] font-bold text-secondary mb-1.5">Delivery Challan (DC) / Lot Reference</label>
                                <input type="text" name="dcNumber" value="${pw.dcNumber || ''}" placeholder="DC-PRNT-2026-XXXX" class="w-full bg-surface-container border border-outline-variant rounded-xl px-3.5 py-2.5 text-[13px] font-medium text-on-surface outline-none focus:border-primary">
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        `;
    },

    extractFormData() {
        const form = document.getElementById('stage-form-printing');
        if (!form) return {};
        const fd = new FormData(form);

        return {
            printMethod:         fd.get('printMethod') || 'Screen Print',
            screenCount:         Number(fd.get('screenCount')) || 1,
            curingTempC:         Number(fd.get('curingTempC')) || 160,
            strikeOffApproved:   fd.get('strikeOffApproved') === 'true' || form.querySelector('input[name="strikeOffApproved"]')?.checked === true,
            panelsDispatched:    Number(fd.get('panelsDispatched')) || 0,
            panelsReceived:      Number(fd.get('panelsReceived')) || 0,
            actualGoodOutput:    Number(fd.get('panelsReceived')) || 0,
            rejectedPanels:      Number(fd.get('rejectedPanels')) || 0,
            processorVendorName: fd.get('processorVendorName') || '',
            dcNumber:            fd.get('dcNumber') || '',
            status:              (Number(fd.get('panelsReceived')) >= Number(fd.get('panelsDispatched')) && Number(fd.get('panelsDispatched')) > 0) ? 'Completed' : 'In Progress'
        };
    }
};
