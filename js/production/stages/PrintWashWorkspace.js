/**
 * Garment OS — Production Hero Hub: Print, Embroidery & Wash Workspace
 * Embellishment specs, strike-off approval, panel outward/inward tally, and reject tracking.
 */

import { STAGE_DEFINITIONS } from '../domain/workflowEngine.js?v=5.5';

export const PrintWashWorkspace = {
    render(order, activeProduct, stageData) {
        const pw = stageData?.print_wash || {};
        const targetQty = Number(activeProduct?.qty) || Number(order?.qty) || 0;

        const technique = pw.technique || 'Screen Print';
        const panelsSent = Number(pw.panelsDispatched) || targetQty;
        const panelsReceived = Number(pw.panelsReceived) || 0;
        const rejects = Number(pw.rejectedPanels) || 0;
        const pending = Math.max(0, panelsSent - panelsReceived);
        const completionPct = panelsSent > 0 ? Math.min(100, Math.round((panelsReceived / panelsSent) * 100)) : 0;
        const rejectRate = panelsReceived > 0 ? ((rejects / panelsReceived) * 100).toFixed(1) : '0.0';

        const strikeOffApproved = Boolean(pw.strikeOffApproved);

        return `
            <div class="flex flex-col gap-5 animate-fade-in" id="print-wash-workspace-root">
                
                <!-- Stage Header Banner -->
                <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm">
                    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div class="flex items-center gap-3">
                            <div class="w-12 h-12 rounded-xl bg-[#AF52DE]/10 text-[#AF52DE] flex items-center justify-center font-bold">
                                <span class="material-symbols-outlined text-[26px]">palette</span>
                            </div>
                            <div>
                                <div class="flex items-center gap-2">
                                    <h3 class="text-[18px] font-bold text-on-surface">Print, Embroidery & Wash</h3>
                                    <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold ${completionPct === 100 ? 'bg-[#34C759]/15 text-[#34C759]' : 'bg-[#AF52DE]/15 text-[#AF52DE]'}">
                                        Received: ${panelsReceived.toLocaleString()} / ${panelsSent.toLocaleString()}
                                    </span>
                                </div>
                                <p class="text-[13px] text-secondary mt-0.5">Embellishment strike-off approval, panel outward dispatch, and quality inspection</p>
                            </div>
                        </div>

                        <div class="flex items-center gap-2 w-full sm:w-auto">
                            <button type="button" onclick="window.productionRouter.saveCurrentStage(false)" 
                                class="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-outline-variant bg-surface-container-high text-on-surface text-[13px] font-bold hover:bg-surface-variant active-scale transition-apple">
                                Save Progress
                            </button>
                            <button type="button" onclick="window.productionRouter.saveCurrentStage(true)" 
                                class="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-primary text-white text-[13px] font-bold hover:bg-primary-hover active-scale transition-apple shadow-sm flex items-center justify-center gap-1.5">
                                <span>Advance to Next Stage</span>
                                <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
                            </button>
                        </div>
                    </div>
                </div>

                <form id="stage-form-print-wash" onsubmit="event.preventDefault(); window.productionRouter.saveCurrentStage(false);">
                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
                        
                        <!-- Left 2 Cols: Technique & Panel Tally -->
                        <div class="flex flex-col gap-5 lg:col-span-2">
                            
                            <!-- Technique Specifications Card -->
                            <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm">
                                <h4 class="text-[14px] font-bold text-on-surface uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <span class="material-symbols-outlined text-primary text-[18px]">brush</span>
                                    Process & Vendor Assignment
                                </h4>

                                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                                    <div>
                                        <label class="block text-[12px] font-bold text-secondary mb-1">Process Technique</label>
                                        <select name="technique" class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2.5 text-[13px] font-bold text-on-surface focus:border-primary outline-none">
                                            <option value="Screen Print" ${technique === 'Screen Print' ? 'selected' : ''}>Screen Print</option>
                                            <option value="DTF Print" ${technique === 'DTF Print' ? 'selected' : ''}>Direct to Film (DTF)</option>
                                            <option value="Embroidery" ${technique === 'Embroidery' ? 'selected' : ''}>Computer Embroidery</option>
                                            <option value="Bio-Wash" ${technique === 'Bio-Wash' ? 'selected' : ''}>Bio-Polish / Silicone Wash</option>
                                            <option value="Garment Dye" ${technique === 'Garment Dye' ? 'selected' : ''}>Garment Pigment Dye</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label class="block text-[12px] font-bold text-secondary mb-1">Ink / Stitch Type</label>
                                        <input type="text" name="subType" value="${pw.subType || 'Plastisol Non-PVC'}" 
                                            placeholder="e.g. Plastisol / High Density"
                                            class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2.5 text-[14px] font-medium text-on-surface focus:border-primary outline-none">
                                    </div>

                                    <div>
                                        <label class="block text-[12px] font-bold text-secondary mb-1">Jobwork Vendor Name</label>
                                        <input type="text" name="processorVendorName" value="${pw.processorVendorName || 'Sri Krishna Prints'}" 
                                            class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2.5 text-[14px] font-medium text-on-surface focus:border-primary outline-none">
                                    </div>
                                </div>

                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-[12px] font-bold text-secondary mb-1">Outward DC Number</label>
                                        <input type="text" name="dcNumber" value="${pw.dcNumber || `DC-OUT-${order?.id || 'PRN'}`}" 
                                            class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2 text-[14px] font-mono font-bold text-on-surface focus:border-primary outline-none">
                                    </div>

                                    <div>
                                        <label class="block text-[12px] font-bold text-secondary mb-1">Expected Return Date</label>
                                        <input type="date" name="expectedReturnDate" value="${pw.expectedReturnDate || ''}" 
                                            class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2 text-[14px] font-medium text-on-surface focus:border-primary outline-none">
                                    </div>
                                </div>
                            </div>

                            <!-- Panel Reconciliation Matrix -->
                            <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm">
                                <div class="flex items-center justify-between mb-4">
                                    <h4 class="text-[14px] font-bold text-on-surface uppercase tracking-wider flex items-center gap-2">
                                        <span class="material-symbols-outlined text-[#AF52DE] text-[18px]">sync_alt</span>
                                        Panel Outward vs Inward Reconciliation
                                    </h4>
                                    <span class="text-[12px] font-bold text-[#AF52DE]">${completionPct}% Panels Inward</span>
                                </div>

                                <!-- Progress Bar -->
                                <div class="w-full h-2.5 bg-surface-variant rounded-full overflow-hidden mb-4">
                                    <div class="h-full bg-[#AF52DE] rounded-full transition-apple" style="width: ${completionPct}%"></div>
                                </div>

                                <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
                                    <div class="p-3.5 rounded-xl bg-surface-container border border-outline-variant/60">
                                        <p class="text-[11px] font-bold text-secondary uppercase">Dispatched Out</p>
                                        <input type="number" name="panelsDispatched" value="${panelsSent}" 
                                            class="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-2.5 py-1 text-[16px] font-extrabold text-on-surface mt-1 focus:border-primary outline-none">
                                    </div>

                                    <div class="p-3.5 rounded-xl bg-surface-container border border-outline-variant/60">
                                        <p class="text-[11px] font-bold text-secondary uppercase">Received Inward</p>
                                        <input type="number" name="panelsReceived" value="${panelsReceived}" 
                                            class="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-2.5 py-1 text-[16px] font-extrabold text-primary mt-1 focus:border-primary outline-none">
                                    </div>

                                    <div class="p-3.5 rounded-xl bg-surface-container border border-outline-variant/60">
                                        <p class="text-[11px] font-bold text-secondary uppercase">Rejects / Misprint</p>
                                        <div class="flex items-baseline gap-1 mt-1">
                                            <input type="number" name="rejectedPanels" value="${rejects}" 
                                                class="w-20 bg-surface-container-lowest border border-outline-variant rounded-lg px-2 py-1 text-[16px] font-extrabold text-error focus:border-primary outline-none">
                                            <span class="text-[11px] font-bold text-secondary">(${rejectRate}%)</span>
                                        </div>
                                    </div>

                                    <div class="p-3.5 rounded-xl bg-surface-container border border-outline-variant/60">
                                        <p class="text-[11px] font-bold text-secondary uppercase">Pending</p>
                                        <p class="text-[20px] font-extrabold ${pending > 0 ? 'text-orange-500' : 'text-[#34C759]'} mt-1">
                                            ${pending.toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            </div>

                        </div>

                        <!-- Right Column: Strike-off Approval & Sample Photo -->
                        <div class="flex flex-col gap-5">
                            
                            <!-- Strike-off Approval Card -->
                            <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm">
                                <h4 class="text-[14px] font-bold text-on-surface uppercase tracking-wider mb-4 flex items-center gap-1.5">
                                    <span class="material-symbols-outlined text-[#34C759] text-[18px]">verified</span>
                                    Strike-Off Approval
                                </h4>

                                <div class="flex flex-col gap-4">
                                    <label class="flex items-center gap-3 p-3.5 rounded-xl ${strikeOffApproved ? 'bg-[#34C759]/10 border border-[#34C759]/30' : 'bg-surface-container border border-outline-variant/60'} cursor-pointer hover:bg-surface-variant transition-apple">
                                        <input type="checkbox" name="strikeOffApproved" ${strikeOffApproved ? 'checked' : ''} class="w-5 h-5 rounded text-primary focus:ring-primary">
                                        <div>
                                            <p class="text-[13px] font-bold text-on-surface">Strike-Off Signoff</p>
                                            <p class="text-[11px] text-secondary">Sample approved by Buyer/Merchandiser</p>
                                        </div>
                                    </label>

                                    <div>
                                        <label class="block text-[12px] font-bold text-secondary mb-1">Approved Sample Photo URL</label>
                                        <input type="text" name="strikeOffPhotoUrl" value="${pw.strikeOffPhotoUrl || ''}" 
                                            placeholder="https://... or sample reference"
                                            class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2 text-[12px] text-on-surface font-medium focus:border-primary outline-none">
                                    </div>

                                    <div>
                                        <label class="block text-[12px] font-bold text-secondary mb-1">Workflow Status</label>
                                        <select name="status" class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2 text-[13px] font-bold text-on-surface focus:border-primary outline-none">
                                            <option value="In Progress" ${pw.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                                            <option value="Dispatched" ${pw.status === 'Dispatched' ? 'selected' : ''}>Panels Dispatched</option>
                                            <option value="Received" ${pw.status === 'Received' ? 'selected' : ''}>Panels Inward Received</option>
                                            <option value="QC Complete" ${pw.status === 'QC Complete' ? 'selected' : ''}>QC Approved</option>
                                        </select>
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
        const form = document.getElementById('stage-form-print-wash');
        if (!form) return {};
        const fd = new FormData(form);
        return {
            technique: fd.get('technique') || 'Screen Print',
            subType: fd.get('subType') || '',
            processorVendorName: fd.get('processorVendorName') || '',
            dcNumber: fd.get('dcNumber') || '',
            expectedReturnDate: fd.get('expectedReturnDate') || '',
            panelsDispatched: Number(fd.get('panelsDispatched')) || 0,
            panelsReceived: Number(fd.get('panelsReceived')) || 0,
            rejectedPanels: Number(fd.get('rejectedPanels')) || 0,
            strikeOffApproved: Boolean(fd.get('strikeOffApproved')),
            strikeOffPhotoUrl: fd.get('strikeOffPhotoUrl') || '',
            status: fd.get('status') || 'In Progress'
        };
    }
};
