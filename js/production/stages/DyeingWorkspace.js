/**
 * Garment OS — Production Workspace: Dyeing & Compacting
 * 
 * Tracks the dyeing + compacting process — lot number, shade approval,
 * post-compact GSM & Dia, shrinkage test, colorfastness grading,
 * and the final "Ready for Cutting" gate.
 * Stage colour: #8B5CF6 (violet)
 */

import { STAGE_DEFINITIONS } from '../domain/workflowEngine.js?v=6.0';

export const DyeingWorkspace = {

    render(order, activeProduct, stageData) {
        const sd         = stageData?.dyeing  || {};
        const knitSD     = stageData?.knitting || {};
        const targetQty  = Number(activeProduct?.qty) || Number(order?.qty) || 0;

        // Inherit knitted fabric kg as the input qty for this stage
        const fabricKgDyed     = Number(sd.fabricKgDyed) || Number(knitSD.fabricKgProduced) || 0;
        const shadeApproved    = Boolean(sd.shadeApproved);
        const compactingDone   = Boolean(sd.compactingDone);
        const readyForCutting  = Boolean(sd.readyForCutting);
        const compactedGsm     = Number(sd.compactedGsm) || 0;
        const compactedDia     = Number(sd.compactedDia) || 0;

        // Reference specs from order
        const targetGsm = Number(activeProduct?.fabric?.gsm) || 180;
        const targetDia = Number(activeProduct?.fabric?.dia) || 34;

        const gsmDelta  = compactedGsm > 0 ? Math.abs(compactedGsm - targetGsm) : null;
        const gsmOk     = gsmDelta !== null && gsmDelta <= 5;
        const diaDelta  = compactedDia > 0 ? Math.abs(compactedDia - targetDia) : null;
        const diaOk     = diaDelta !== null && diaDelta <= 1;

        // Gate: can release only when shade approved + compacting done
        const canRelease = shadeApproved && compactingDone;

        const statusColors = {
            'In Progress': 'bg-[#8B5CF6]/15 text-[#8B5CF6]',
            'Compacting':  'bg-[#FF9500]/15 text-[#FF9500]',
            'QC':          'bg-[#0EA5E9]/15 text-[#0EA5E9]',
            'Released':    'bg-[#34C759]/15 text-[#34C759]'
        };
        const statusColor = statusColors[sd.status] || statusColors['In Progress'];

        return `
        <div class="flex flex-col gap-5 animate-fade-in" id="dyeing-workspace-root">

            <!-- Stage Header Banner -->
            <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm">
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div class="flex items-center gap-3">
                        <div class="w-12 h-12 rounded-xl bg-[#8B5CF6]/10 text-[#8B5CF6] flex items-center justify-center">
                            <span class="material-symbols-outlined text-[26px]">water_drop</span>
                        </div>
                        <div>
                            <div class="flex items-center gap-2">
                                <h3 class="text-[18px] font-bold text-on-surface">Dyeing & Compacting</h3>
                                <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold ${statusColor}">
                                    ${sd.status || 'In Progress'}
                                </span>
                            </div>
                            <p class="text-[13px] text-secondary mt-0.5">Shade approval, dyeing lot tracking, compacting QC, shrinkage & colorfastness grading</p>
                        </div>
                    </div>

                    <div class="flex items-center gap-2 w-full sm:w-auto">
                        <button type="button" onclick="window.productionRouter.saveCurrentStage(false)"
                            class="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-outline-variant bg-surface-container-high text-on-surface text-[13px] font-bold hover:bg-surface-variant active-scale transition-apple">
                            Save Progress
                        </button>
                        <button type="button" onclick="window.dyeingWorkspace_releaseGate()"
                            class="flex-1 sm:flex-none px-4 py-2.5 rounded-xl ${canRelease ? 'bg-[#8B5CF6] hover:opacity-90' : 'bg-surface-container-high text-secondary cursor-not-allowed'} text-white text-[13px] font-bold active-scale transition-apple shadow-sm flex items-center justify-center gap-1.5"
                            ${!canRelease ? 'title="Shade approval and compacting must both be marked complete"' : ''}>
                            <span>${canRelease ? 'Release to Cutting' : 'Release (Pending Gate)'}</span>
                            <span class="material-symbols-outlined text-[16px]">${canRelease ? 'arrow_forward' : 'lock'}</span>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Gate Requirements Banner -->
            ${!canRelease ? `
            <div class="bg-[#FF9500]/5 border border-[#FF9500]/20 rounded-xl px-4 py-3 flex items-center gap-3">
                <span class="material-symbols-outlined text-[#FF9500] text-[18px]">lock</span>
                <div class="flex items-center gap-3 flex-wrap text-[13px]">
                    <span class="font-bold text-on-surface">Release Gate:</span>
                    <span class="${shadeApproved ? 'text-[#34C759] font-bold' : 'text-secondary'}">
                        ${shadeApproved ? '✓' : '○'} Shade Approved
                    </span>
                    <span class="text-outline-variant">·</span>
                    <span class="${compactingDone ? 'text-[#34C759] font-bold' : 'text-secondary'}">
                        ${compactingDone ? '✓' : '○'} Compacting Done
                    </span>
                    <span class="text-outline-variant ml-1">— both required to release fabric to Cutting</span>
                </div>
            </div>` : `
            <div class="bg-[#34C759]/5 border border-[#34C759]/20 rounded-xl px-4 py-3 flex items-center gap-3">
                <span class="material-symbols-outlined text-[#34C759] text-[18px]">check_circle</span>
                <span class="text-[13px] font-bold text-[#34C759]">All gate conditions met — fabric ready for release to Cutting</span>
            </div>`}

            <form id="stage-form-dyeing" onsubmit="event.preventDefault(); window.productionRouter.saveCurrentStage(false);">
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">

                    <!-- Left Column: Dyeing Lot + Shade + Compacting -->
                    <div class="flex flex-col gap-5 lg:col-span-2">

                        <!-- Dyeing Lot & Vendor -->
                        <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm">
                            <h4 class="text-[14px] font-bold text-on-surface uppercase tracking-wider mb-4 flex items-center gap-2">
                                <span class="material-symbols-outlined text-[#8B5CF6] text-[18px]">water_drop</span>
                                Dyeing Lot & Vendor
                            </h4>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-[12px] font-bold text-secondary mb-1">Dyeing Lot Number</label>
                                    <input type="text" name="dyeingLotNumber" id="dyeing-lot" value="${sd.dyeingLotNumber || ''}"
                                        placeholder="e.g. DL-2026-447"
                                        class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2.5 text-[14px] text-on-surface font-medium focus:border-[#8B5CF6] outline-none">
                                </div>
                                <div>
                                    <label class="block text-[12px] font-bold text-secondary mb-1">Dyeing Vendor / Processor</label>
                                    <input type="text" name="dyeingVendor" id="dyeing-vendor" value="${sd.dyeingVendor || ''}"
                                        placeholder="e.g. In-House or Vendor Name"
                                        class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2.5 text-[14px] text-on-surface focus:border-[#8B5CF6] outline-none">
                                </div>
                                <div>
                                    <label class="block text-[12px] font-bold text-secondary mb-1">Fabric Kg Sent for Dyeing</label>
                                    <input type="number" name="fabricKgDyed" id="dyeing-kg" value="${fabricKgDyed || ''}"
                                        min="0" step="0.5" placeholder="${fabricKgDyed || '0'}"
                                        class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2.5 text-[15px] font-bold text-on-surface focus:border-[#8B5CF6] outline-none">
                                </div>
                                <div>
                                    <label class="block text-[12px] font-bold text-secondary mb-1">Colour Reference</label>
                                    <input type="text" name="colorReference" id="dyeing-color-ref" value="${sd.colorReference || ''}"
                                        placeholder="e.g. Pantone 19-1664 TCX"
                                        class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2.5 text-[14px] text-on-surface focus:border-[#8B5CF6] outline-none">
                                </div>
                            </div>
                        </div>

                        <!-- Shade Approval -->
                        <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm">
                            <h4 class="text-[14px] font-bold text-on-surface uppercase tracking-wider mb-4 flex items-center gap-2">
                                <span class="material-symbols-outlined text-[#8B5CF6] text-[18px]">palette</span>
                                Shade Approval
                            </h4>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-[12px] font-bold text-secondary mb-1">Lab Dip Reference</label>
                                    <input type="text" name="labDipReference" id="dyeing-lab-dip" value="${sd.labDipReference || ''}"
                                        placeholder="e.g. LD-447-R2"
                                        class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2.5 text-[14px] text-on-surface focus:border-[#8B5CF6] outline-none">
                                </div>

                                <!-- Shade Approved Toggle -->
                                <div class="flex flex-col justify-end">
                                    <label class="block text-[12px] font-bold text-secondary mb-2">Shade Approved by Buyer</label>
                                    <button type="button" id="dyeing-shade-toggle"
                                        onclick="window.dyeingWorkspace_toggleShade()"
                                        class="${shadeApproved
                                            ? 'bg-[#34C759] border-[#34C759] text-white'
                                            : 'bg-surface border-outline-variant text-secondary'
                                        } w-full py-2.5 rounded-xl border-2 font-bold text-[13px] flex items-center justify-center gap-2 transition-all active-scale">
                                        <span class="material-symbols-outlined text-[18px]">${shadeApproved ? 'check_circle' : 'radio_button_unchecked'}</span>
                                        ${shadeApproved ? 'Shade Approved ✓' : 'Mark as Approved'}
                                    </button>
                                    <input type="hidden" name="shadeApproved" id="dyeing-shade-approved" value="${shadeApproved}">
                                </div>
                            </div>
                        </div>

                        <!-- Compacting QC -->
                        <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm">
                            <h4 class="text-[14px] font-bold text-on-surface uppercase tracking-wider mb-4 flex items-center gap-2">
                                <span class="material-symbols-outlined text-[#8B5CF6] text-[18px]">compress</span>
                                Compacting Process & QC Results
                            </h4>

                            <!-- Compacting Done Toggle -->
                            <div class="mb-4">
                                <label class="block text-[12px] font-bold text-secondary mb-2">Compacting Completed</label>
                                <button type="button" id="dyeing-compact-toggle"
                                    onclick="window.dyeingWorkspace_toggleCompacting()"
                                    class="${compactingDone
                                        ? 'bg-[#8B5CF6] border-[#8B5CF6] text-white'
                                        : 'bg-surface border-outline-variant text-secondary'
                                    } px-5 py-2.5 rounded-xl border-2 font-bold text-[13px] flex items-center gap-2 transition-all active-scale">
                                    <span class="material-symbols-outlined text-[18px]">${compactingDone ? 'check_circle' : 'radio_button_unchecked'}</span>
                                    ${compactingDone ? 'Compacting Done ✓' : 'Mark Compacting Done'}
                                </button>
                                <input type="hidden" name="compactingDone" id="dyeing-compacting-done" value="${compactingDone}">
                            </div>

                            <!-- Post-Compact Specs -->
                            <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                                <div>
                                    <label class="block text-[12px] font-bold text-secondary mb-1">Target GSM</label>
                                    <div class="bg-surface-container rounded-xl px-3 py-2.5 border border-outline-variant/40">
                                        <span class="text-[15px] font-bold text-secondary">${targetGsm}</span>
                                    </div>
                                </div>
                                <div>
                                    <label class="block text-[12px] font-bold text-secondary mb-1">Post-Compact GSM *</label>
                                    <input type="number" name="compactedGsm" id="dyeing-compacted-gsm" value="${compactedGsm || ''}"
                                        min="0" placeholder="${targetGsm}"
                                        class="w-full ${compactedGsm > 0 && !gsmOk ? 'border-error' : compactedGsm > 0 ? 'border-[#34C759]' : 'border-outline-variant'} bg-surface-container-lowest border rounded-xl px-3 py-2.5 text-[15px] font-bold text-on-surface focus:border-[#8B5CF6] outline-none">
                                    ${compactedGsm > 0 ? `<p class="text-[10px] mt-0.5 font-bold ${gsmOk ? 'text-[#34C759]' : 'text-error'}">
                                        Δ ${gsmDelta} GSM ${gsmOk ? '✓ OK' : '⚠ Out of spec'}
                                    </p>` : ''}
                                </div>
                                <div>
                                    <label class="block text-[12px] font-bold text-secondary mb-1">Target Dia (in)</label>
                                    <div class="bg-surface-container rounded-xl px-3 py-2.5 border border-outline-variant/40">
                                        <span class="text-[15px] font-bold text-secondary">${targetDia}"</span>
                                    </div>
                                </div>
                                <div>
                                    <label class="block text-[12px] font-bold text-secondary mb-1">Post-Compact Dia (in) *</label>
                                    <input type="number" name="compactedDia" id="dyeing-compacted-dia" value="${compactedDia || ''}"
                                        min="0" step="0.5" placeholder="${targetDia}"
                                        class="w-full ${compactedDia > 0 && !diaOk ? 'border-error' : compactedDia > 0 ? 'border-[#34C759]' : 'border-outline-variant'} bg-surface-container-lowest border rounded-xl px-3 py-2.5 text-[15px] font-bold text-on-surface focus:border-[#8B5CF6] outline-none">
                                    ${compactedDia > 0 ? `<p class="text-[10px] mt-0.5 font-bold ${diaOk ? 'text-[#34C759]' : 'text-error'}">
                                        Δ ${diaDelta}" ${diaOk ? '✓ OK' : '⚠ Out of spec'}
                                    </p>` : ''}
                                </div>
                            </div>

                            <!-- Shrinkage & Colorfastness -->
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                                <div>
                                    <label class="block text-[12px] font-bold text-secondary mb-1">Shrinkage Result (%)</label>
                                    <input type="text" name="shrinkageResult" id="dyeing-shrinkage" value="${sd.shrinkageResult || ''}"
                                        placeholder="e.g. 3.5% warp / 2.8% weft"
                                        class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2.5 text-[14px] text-on-surface focus:border-[#8B5CF6] outline-none">
                                </div>
                                <div>
                                    <label class="block text-[12px] font-bold text-secondary mb-1">Colorfastness Grade</label>
                                    <input type="text" name="colorfastnessGrade" id="dyeing-colorfastness" value="${sd.colorfastnessGrade || ''}"
                                        placeholder="e.g. 4/5 Washing · 4 Rubbing"
                                        class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2.5 text-[14px] text-on-surface focus:border-[#8B5CF6] outline-none">
                                </div>
                            </div>

                            <div class="mt-4">
                                <label class="block text-[12px] font-bold text-secondary mb-1">QC Notes</label>
                                <textarea name="notes" id="dyeing-notes" rows="2"
                                    placeholder="Shade variation, process irregularities, lot split notes..."
                                    class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2.5 text-[13px] text-on-surface focus:border-[#8B5CF6] outline-none resize-none">${sd.notes || ''}</textarea>
                            </div>
                        </div>
                    </div>

                    <!-- Right Column: KPIs & Status -->
                    <div class="flex flex-col gap-5">

                        <!-- KPI Scorecard -->
                        <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm">
                            <h4 class="text-[13px] font-bold text-secondary uppercase tracking-wider mb-3">Dyeing KPIs</h4>
                            <div class="flex flex-col gap-3">
                                <div class="bg-[#8B5CF6]/8 rounded-xl p-3 flex justify-between items-center">
                                    <span class="text-[12px] font-bold text-secondary">Fabric in Dyeing</span>
                                    <strong class="text-[16px] text-[#8B5CF6]">${fabricKgDyed} kg</strong>
                                </div>
                                <div class="${shadeApproved ? 'bg-[#34C759]/8' : 'bg-surface-container'} rounded-xl p-3 flex justify-between items-center">
                                    <span class="text-[12px] font-bold text-secondary">Shade Approval</span>
                                    <strong class="text-[16px] ${shadeApproved ? 'text-[#34C759]' : 'text-error'}">${shadeApproved ? '✓ Approved' : 'Pending'}</strong>
                                </div>
                                <div class="${compactingDone ? 'bg-[#34C759]/8' : 'bg-surface-container'} rounded-xl p-3 flex justify-between items-center">
                                    <span class="text-[12px] font-bold text-secondary">Compacting</span>
                                    <strong class="text-[16px] ${compactingDone ? 'text-[#34C759]' : 'text-secondary'}">${compactingDone ? '✓ Done' : 'Pending'}</strong>
                                </div>
                                <div class="bg-surface-container rounded-xl p-3 flex justify-between items-center">
                                    <span class="text-[12px] font-bold text-secondary">Post-Compact GSM</span>
                                    <strong class="text-[16px] ${gsmDelta !== null && !gsmOk ? 'text-error' : gsmDelta !== null ? 'text-[#34C759]' : 'text-secondary'}">
                                        ${compactedGsm > 0 ? compactedGsm : '—'}
                                    </strong>
                                </div>
                            </div>
                        </div>

                        <!-- Stage Status -->
                        <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm">
                            <h4 class="text-[13px] font-bold text-secondary uppercase tracking-wider mb-3">Stage Status</h4>
                            <select name="status" id="dyeing-status"
                                class="w-full bg-surface border border-outline-variant rounded-xl px-3 py-2.5 text-[14px] font-bold text-on-surface outline-none focus:border-[#8B5CF6]">
                                <option value="In Progress" ${(sd.status || 'In Progress') === 'In Progress' ? 'selected' : ''}>In Progress — Dyeing</option>
                                <option value="Compacting"  ${sd.status === 'Compacting' ? 'selected' : ''}>Compacting — Post-dye Compacting</option>
                                <option value="QC"          ${sd.status === 'QC' ? 'selected' : ''}>QC — Shrinkage & Colorfastness Test</option>
                                <option value="Released"    ${sd.status === 'Released' ? 'selected' : ''}>Released — Ready for Cutting</option>
                            </select>
                        </div>

                        <!-- Next Stage -->
                        <div class="bg-[#FF9500]/5 border border-[#FF9500]/20 rounded-2xl p-4">
                            <div class="flex items-center gap-2 mb-2">
                                <span class="material-symbols-outlined text-[#FF9500] text-[18px]">content_cut</span>
                                <h5 class="text-[13px] font-bold text-[#FF9500]">Next Stage: Fabric Cutting</h5>
                            </div>
                            <p class="text-[12px] text-secondary leading-snug">
                                Compacted, shade-approved fabric proceeds to the cutting table for
                                marker laying, spreading, and precision cutting.
                            </p>
                        </div>
                    </div>
                </div>
            </form>
        </div>`;
    },

    extractFormData() {
        const g = (id) => document.getElementById(id);
        const shadeApproved  = g('dyeing-shade-approved')?.value === 'true';
        const compactingDone = g('dyeing-compacting-done')?.value === 'true';
        return {
            dyeingLotNumber:    g('dyeing-lot')?.value?.trim()              || '',
            dyeingVendor:       g('dyeing-vendor')?.value?.trim()           || '',
            fabricKgDyed:       parseFloat(g('dyeing-kg')?.value)           || 0,
            colorReference:     g('dyeing-color-ref')?.value?.trim()        || '',
            labDipReference:    g('dyeing-lab-dip')?.value?.trim()          || '',
            shadeApproved,
            compactingDone,
            compactedGsm:       parseFloat(g('dyeing-compacted-gsm')?.value) || 0,
            compactedDia:       parseFloat(g('dyeing-compacted-dia')?.value) || 0,
            shrinkageResult:    g('dyeing-shrinkage')?.value?.trim()        || '',
            colorfastnessGrade: g('dyeing-colorfastness')?.value?.trim()    || '',
            readyForCutting:    shadeApproved && compactingDone,
            notes:              g('dyeing-notes')?.value?.trim()            || '',
            status:             g('dyeing-status')?.value                   || 'In Progress'
        };
    }
};

// ─── Toggle helpers (called inline by buttons) ────────────────────────────────

window.dyeingWorkspace_toggleShade = function() {
    const hidden = document.getElementById('dyeing-shade-approved');
    const btn    = document.getElementById('dyeing-shade-toggle');
    if (!hidden || !btn) return;
    const newVal = hidden.value !== 'true';
    hidden.value = String(newVal);
    btn.className = `${newVal
        ? 'bg-[#34C759] border-[#34C759] text-white'
        : 'bg-surface border-outline-variant text-secondary'
    } w-full py-2.5 rounded-xl border-2 font-bold text-[13px] flex items-center justify-center gap-2 transition-all active-scale`;
    btn.innerHTML = `<span class="material-symbols-outlined text-[18px]">${newVal ? 'check_circle' : 'radio_button_unchecked'}</span>${newVal ? 'Shade Approved ✓' : 'Mark as Approved'}`;
    _dyeingUpdateGate();
};

window.dyeingWorkspace_toggleCompacting = function() {
    const hidden = document.getElementById('dyeing-compacting-done');
    const btn    = document.getElementById('dyeing-compact-toggle');
    if (!hidden || !btn) return;
    const newVal = hidden.value !== 'true';
    hidden.value = String(newVal);
    btn.className = `${newVal
        ? 'bg-[#8B5CF6] border-[#8B5CF6] text-white'
        : 'bg-surface border-outline-variant text-secondary'
    } px-5 py-2.5 rounded-xl border-2 font-bold text-[13px] flex items-center gap-2 transition-all active-scale`;
    btn.innerHTML = `<span class="material-symbols-outlined text-[18px]">${newVal ? 'check_circle' : 'radio_button_unchecked'}</span>${newVal ? 'Compacting Done ✓' : 'Mark Compacting Done'}`;
    _dyeingUpdateGate();
};

function _dyeingUpdateGate() {
    const shadeOk    = document.getElementById('dyeing-shade-approved')?.value === 'true';
    const compactOk  = document.getElementById('dyeing-compacting-done')?.value === 'true';
    const canRelease = shadeOk && compactOk;
    const releaseBtn = document.querySelector('[onclick="window.dyeingWorkspace_releaseGate()"]');
    if (!releaseBtn) return;
    if (canRelease) {
        releaseBtn.className = releaseBtn.className.replace('bg-surface-container-high text-secondary cursor-not-allowed', 'bg-[#8B5CF6] hover:opacity-90 text-white');
        releaseBtn.innerHTML = '<span>Release to Cutting</span><span class="material-symbols-outlined text-[16px]">arrow_forward</span>';
        releaseBtn.removeAttribute('title');
    } else {
        releaseBtn.className = releaseBtn.className.replace('bg-[#8B5CF6] hover:opacity-90 text-white', 'bg-surface-container-high text-secondary cursor-not-allowed');
        releaseBtn.innerHTML = '<span>Release (Pending Gate)</span><span class="material-symbols-outlined text-[16px]">lock</span>';
        releaseBtn.title = 'Shade approval and compacting must both be marked complete';
    }
}

window.dyeingWorkspace_releaseGate = function() {
    const shadeOk   = document.getElementById('dyeing-shade-approved')?.value === 'true';
    const compactOk = document.getElementById('dyeing-compacting-done')?.value === 'true';
    if (!shadeOk || !compactOk) {
        if (window.showToast) window.showToast('Complete shade approval and compacting before releasing to Cutting', 'warning');
        return;
    }
    window.productionRouter.saveCurrentStage(true);
};
