/**
 * Garment OS — Production Hero Hub: Procurement Workspace
 * Supplier POs, yarn inward, trims receipt, and supplier challan tracking.
 */

import { STAGE_DEFINITIONS, getProductWorkflowStages } from '../domain/workflowEngine.js?v=5.5';

export const ProcurementWorkspace = {
    render(order, activeProduct, stageData) {
        const proc = stageData?.procurement || {};
        const targetQty = Number(activeProduct?.qty) || Number(order?.qty) || 0;
        
        // Resolve dynamic next stage in this product's workflow
        const stages = getProductWorkflowStages(activeProduct, order?.workflowType);
        const currentIdx = stages.indexOf('procurement');
        const nextStageKey = (currentIdx >= 0 && currentIdx < stages.length - 1) ? stages[currentIdx + 1] : 'fabric';
        const nextDef = STAGE_DEFINITIONS[nextStageKey] || { label: 'Next Stage', shortLabel: 'Next Stage' };
        const nextLabel = nextDef.shortLabel || nextDef.label;

        // Calculate estimated yarn required (approx 200g per t-shirt / garment average if not specified)
        const estimatedYarnNeededKg = Math.round(targetQty * 0.22);
        const yarnOrdered = Number(proc.yarnKgOrdered) || estimatedYarnNeededKg;
        const yarnReceived = Number(proc.yarnKgReceived) || 0;
        const yarnPending = Math.max(0, yarnOrdered - yarnReceived);
        const yarnPct = yarnOrdered > 0 ? Math.min(100, Math.round((yarnReceived / yarnOrdered) * 100)) : 0;

        const isFullyReceived = yarnReceived >= yarnOrdered && yarnOrdered > 0 && proc.trimsReceived;

        return `
            <div class="flex flex-col gap-5 animate-fade-in" id="procurement-workspace-root">
                
                <!-- Stage Header Banner -->
                <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm">
                    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div class="flex items-center gap-3">
                            <div class="w-12 h-12 rounded-xl bg-[#5856D6]/10 text-[#5856D6] flex items-center justify-center font-bold">
                                <span class="material-symbols-outlined text-[26px]">shopping_cart</span>
                            </div>
                            <div>
                                <div class="flex items-center gap-2">
                                    <h3 class="text-[18px] font-bold text-on-surface">Procurement & Sourcing</h3>
                                    <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold ${isFullyReceived ? 'bg-[#34C759]/15 text-[#34C759]' : 'bg-[#5856D6]/15 text-[#5856D6]'}">
                                        ${proc.status || 'Pending'}
                                    </span>
                                </div>
                                <p class="text-[13px] text-secondary mt-0.5">Supplier purchase orders, yarn inward, and raw material accessories</p>
                            </div>
                        </div>

                        <div class="flex items-center gap-2 w-full sm:w-auto">
                            <button type="button" onclick="window.productionRouter.saveCurrentStage(false)" 
                                class="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-outline-variant bg-surface-container-high text-on-surface text-[13px] font-bold hover:bg-surface-variant active-scale transition-apple">
                                Save Progress
                            </button>
                            <button type="button" onclick="window.productionRouter.saveCurrentStage(true)" 
                                class="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-primary text-white text-[13px] font-bold hover:bg-primary-hover active-scale transition-apple shadow-sm flex items-center justify-center gap-1.5">
                                <span>Release to ${nextLabel}</span>
                                <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
                            </button>
                        </div>
                    </div>
                </div>

                <form id="stage-form-procurement" onsubmit="event.preventDefault(); window.productionRouter.saveCurrentStage(false);">
                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
                        
                        <!-- Left Column: Supplier & PO Meta -->
                        <div class="flex flex-col gap-5 lg:col-span-2">
                            
                            <!-- Supplier PO Card -->
                            <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm">
                                <h4 class="text-[14px] font-bold text-on-surface uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <span class="material-symbols-outlined text-primary text-[18px]">storefront</span>
                                    Supplier & Purchase Order
                                </h4>

                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-[12px] font-bold text-secondary mb-1">Spinning Mill / Yarn Supplier</label>
                                        <input type="text" name="supplierName" value="${proc.supplierName || 'Vardhman Textiles / KPR Mill'}" 
                                            placeholder="e.g. Vardhman Textiles"
                                            class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2.5 text-[14px] text-on-surface font-medium focus:border-primary focus:ring-1 focus:ring-primary outline-none">
                                    </div>

                                    <div>
                                        <label class="block text-[12px] font-bold text-secondary mb-1">Purchase Order (PO) Number</label>
                                        <input type="text" name="poNumber" value="${proc.poNumber || `PO-${order?.id || 'NEW'}-YARN`}" 
                                            placeholder="e.g. PO-8921"
                                            class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2.5 text-[14px] text-on-surface font-medium focus:border-primary focus:ring-1 focus:ring-primary outline-none">
                                    </div>

                                    <div>
                                        <label class="block text-[12px] font-bold text-secondary mb-1">Supplier Delivery Challan #</label>
                                        <input type="text" name="challanNumber" value="${proc.challanNumber || ''}" 
                                            placeholder="e.g. DC-98412"
                                            class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2.5 text-[14px] text-on-surface font-medium focus:border-primary focus:ring-1 focus:ring-primary outline-none">
                                    </div>

                                    <div>
                                        <label class="block text-[12px] font-bold text-secondary mb-1">Expected Inward Date</label>
                                        <input type="date" name="expectedArrival" value="${proc.expectedArrival || ''}" 
                                            class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2.5 text-[14px] text-on-surface font-medium focus:border-primary focus:ring-1 focus:ring-primary outline-none">
                                    </div>
                                </div>
                            </div>

                            <!-- Yarn Inward Weight Card -->
                            <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm">
                                <div class="flex items-center justify-between mb-4">
                                    <h4 class="text-[14px] font-bold text-on-surface uppercase tracking-wider flex items-center gap-2">
                                        <span class="material-symbols-outlined text-[#5856D6] text-[18px]">scale</span>
                                        Yarn Weight Inward Tally
                                    </h4>
                                    <span class="text-[12px] font-bold text-[#5856D6]">${yarnPct}% Inward Received</span>
                                </div>

                                <!-- Progress bar -->
                                <div class="w-full h-2.5 bg-surface-variant rounded-full overflow-hidden mb-4">
                                    <div class="h-full bg-[#5856D6] rounded-full transition-apple" style="width: ${yarnPct}%"></div>
                                </div>

                                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                                    <div class="p-3.5 rounded-xl bg-surface-container border border-outline-variant/60">
                                        <p class="text-[11px] font-bold text-secondary uppercase">Ordered Yarn</p>
                                        <div class="flex items-baseline gap-1 mt-1">
                                            <input type="number" step="0.1" name="yarnKgOrdered" value="${yarnOrdered}" 
                                                class="w-24 bg-surface-container-lowest border border-outline-variant rounded-lg px-2 py-1 text-[16px] font-extrabold text-on-surface text-right focus:border-primary outline-none">
                                            <span class="text-[13px] font-bold text-secondary">Kg</span>
                                        </div>
                                    </div>

                                    <div class="p-3.5 rounded-xl bg-surface-container border border-outline-variant/60">
                                        <p class="text-[11px] font-bold text-secondary uppercase">Actual Received</p>
                                        <div class="flex items-baseline gap-1 mt-1">
                                            <input type="number" step="0.1" name="yarnKgReceived" value="${yarnReceived}" 
                                                class="w-24 bg-surface-container-lowest border border-outline-variant rounded-lg px-2 py-1 text-[16px] font-extrabold text-primary text-right focus:border-primary outline-none">
                                            <span class="text-[13px] font-bold text-secondary">Kg</span>
                                        </div>
                                    </div>

                                    <div class="p-3.5 rounded-xl bg-surface-container border border-outline-variant/60">
                                        <p class="text-[11px] font-bold text-secondary uppercase">Balance Pending</p>
                                        <div class="flex items-baseline gap-1 mt-1">
                                            <span class="text-[20px] font-extrabold ${yarnPending > 0 ? 'text-error' : 'text-[#34C759]'}">${yarnPending.toFixed(1)}</span>
                                            <span class="text-[13px] font-bold text-secondary">Kg</span>
                                        </div>
                                    </div>
                                </div>

                                <div class="text-[12px] text-secondary bg-surface-container-high/40 p-3 rounded-xl border border-outline-variant/30 flex items-center gap-2">
                                    <span class="material-symbols-outlined text-[16px] text-primary">info</span>
                                    <span>Target garments: <strong>${targetQty.toLocaleString()} units</strong>. Estimated fabric consumption: ~220g / piece.</span>
                                </div>
                            </div>

                        </div>

                        <!-- Right Column: Trims Checklist & Notes -->
                        <div class="flex flex-col gap-5">
                            
                            <!-- Trims & Accessories Checklist -->
                            <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm">
                                <h4 class="text-[14px] font-bold text-on-surface uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <span class="material-symbols-outlined text-orange-500 text-[18px]">check_circle</span>
                                    Trims & Accessories Inward
                                </h4>

                                <div class="flex flex-col gap-3">
                                    <label class="flex items-center justify-between p-3 rounded-xl bg-surface-container border border-outline-variant/60 cursor-pointer hover:bg-surface-variant transition-apple">
                                        <div>
                                            <p class="text-[13px] font-bold text-on-surface">Brand & Size Labels</p>
                                            <p class="text-[11px] text-secondary">Woven Main label + Size pips</p>
                                        </div>
                                        <input type="checkbox" name="trimsLabels" checked class="w-5 h-5 rounded text-primary focus:ring-primary">
                                    </label>

                                    <label class="flex items-center justify-between p-3 rounded-xl bg-surface-container border border-outline-variant/60 cursor-pointer hover:bg-surface-variant transition-apple">
                                        <div>
                                            <p class="text-[13px] font-bold text-on-surface">Wash Care Labels</p>
                                            <p class="text-[11px] text-secondary">Taffeta/Satin printed wash instructions</p>
                                        </div>
                                        <input type="checkbox" name="trimsWashCare" checked class="w-5 h-5 rounded text-primary focus:ring-primary">
                                    </label>

                                    <label class="flex items-center justify-between p-3 rounded-xl bg-surface-container border border-outline-variant/60 cursor-pointer hover:bg-surface-variant transition-apple">
                                        <div>
                                            <p class="text-[13px] font-bold text-on-surface">Hangtags & Barcodes</p>
                                            <p class="text-[11px] text-secondary">Retail price tag & wax thread lock</p>
                                        </div>
                                        <input type="checkbox" name="trimsHangtags" ${proc.trimsReceived ? 'checked' : ''} class="w-5 h-5 rounded text-primary focus:ring-primary">
                                    </label>

                                    <label class="flex items-center justify-between p-3 rounded-xl bg-surface-container border border-outline-variant/60 cursor-pointer hover:bg-surface-variant transition-apple">
                                        <div>
                                            <p class="text-[13px] font-bold text-on-surface">Polybags & Master Cartons</p>
                                            <p class="text-[11px] text-secondary">Individual self-adhesive polybags</p>
                                        </div>
                                        <input type="checkbox" name="trimsPolybags" ${proc.trimsReceived ? 'checked' : ''} class="w-5 h-5 rounded text-primary focus:ring-primary">
                                    </label>
                                </div>
                            </div>

                            <!-- Notes & Status Card -->
                            <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm">
                                <h4 class="text-[14px] font-bold text-on-surface uppercase tracking-wider mb-3">Procurement Notes</h4>
                                <textarea name="notes" rows="3" placeholder="Add sourcing notes, shade lot details, or supplier remarks..."
                                    class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl p-3 text-[13px] text-on-surface font-medium focus:border-primary outline-none">${proc.notes || ''}</textarea>

                                <div class="mt-4">
                                    <label class="block text-[12px] font-bold text-secondary mb-1">Stage Status</label>
                                    <select name="status" class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2 text-[13px] font-bold text-on-surface focus:border-primary outline-none">
                                        <option value="Pending" ${proc.status === 'Pending' ? 'selected' : ''}>Pending</option>
                                        <option value="Partially Received" ${proc.status === 'Partially Received' ? 'selected' : ''}>Partially Received</option>
                                        <option value="Received" ${proc.status === 'Received' || isFullyReceived ? 'selected' : ''}>Received & Approved</option>
                                    </select>
                                </div>
                            </div>

                        </div>

                    </div>
                </form>

            </div>
        `;
    },

    extractFormData() {
        const form = document.getElementById('stage-form-procurement');
        if (!form) return {};
        const fd = new FormData(form);
        return {
            supplierName: fd.get('supplierName') || '',
            poNumber: fd.get('poNumber') || '',
            challanNumber: fd.get('challanNumber') || '',
            expectedArrival: fd.get('expectedArrival') || '',
            yarnKgOrdered: Number(fd.get('yarnKgOrdered')) || 0,
            yarnKgReceived: Number(fd.get('yarnKgReceived')) || 0,
            trimsOrdered: true,
            trimsReceived: Boolean(fd.get('trimsHangtags') && fd.get('trimsPolybags')),
            notes: fd.get('notes') || '',
            status: fd.get('status') || 'Pending'
        };
    }
};
