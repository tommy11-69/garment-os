/**
 * Garment OS — Production Hero Hub: Finishing & Packing Workspace
 * Thread trimming, steam ironing, master carton packing matrix, gross weight, and box labels.
 */

import { STAGE_DEFINITIONS } from '../domain/workflowEngine.js?v=5.5';

export const PackingWorkspace = {
    render(order, activeProduct, stageData) {
        const pck = stageData?.packing || {};
        const targetQty = Number(activeProduct?.qty) || Number(order?.qty) || 0;

        const cartons = Array.isArray(pck.cartons) && pck.cartons.length > 0 
            ? pck.cartons 
            : [];

        let totalPackedPcs = cartons.reduce((sum, c) => sum + (Number(c.totalPcs) || 0), 0);
        let totalGrossWeight = cartons.reduce((sum, c) => sum + (Number(c.grossWeightKg) || 0), 0);

        if (cartons.length === 0 && targetQty > 0) {
            // Default sample cartons for preview
            const boxCount = Math.max(1, Math.ceil(targetQty / 60));
            totalPackedPcs = targetQty;
            totalGrossWeight = Number((targetQty * 0.24).toFixed(1));
        }

        const packPct = targetQty > 0 ? Math.min(100, Math.round((totalPackedPcs / targetQty) * 100)) : 0;
        const ironed = Number(pck.steamIronedCount) || totalPackedPcs;
        const polybagged = Number(pck.polybaggedCount) || totalPackedPcs;

        return `
            <div class="flex flex-col gap-5 animate-fade-in" id="packing-workspace-root">
                
                <!-- Stage Header Banner -->
                <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm">
                    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div class="flex items-center gap-3">
                            <div class="w-12 h-12 rounded-xl bg-[#FF2D55]/10 text-[#FF2D55] flex items-center justify-center font-bold">
                                <span class="material-symbols-outlined text-[26px]">inventory_2</span>
                            </div>
                            <div>
                                <div class="flex items-center gap-2">
                                    <h3 class="text-[18px] font-bold text-on-surface">Finishing & Master Carton Packing</h3>
                                    <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold ${packPct >= 100 ? 'bg-[#34C759]/15 text-[#34C759]' : 'bg-[#FF2D55]/15 text-[#FF2D55]'}">
                                        Packed: ${totalPackedPcs.toLocaleString()} / ${targetQty.toLocaleString()} pcs (${packPct}%)
                                    </span>
                                </div>
                                <p class="text-[13px] text-secondary mt-0.5">Trimming, steam pressing, carton packing matrix, gross weight, and shipping labels</p>
                            </div>
                        </div>

                        <div class="flex items-center gap-2 w-full sm:w-auto">
                            <button type="button" onclick="window.productionRouter.saveCurrentStage(false)" 
                                class="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-outline-variant bg-surface-container-high text-on-surface text-[13px] font-bold hover:bg-surface-variant active-scale transition-apple">
                                Save Packing Log
                            </button>
                            <button type="button" onclick="window.productionRouter.saveCurrentStage(true)" 
                                class="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-primary text-white text-[13px] font-bold hover:bg-primary-hover active-scale transition-apple shadow-sm flex items-center justify-center gap-1.5">
                                <span>Move to Dispatch</span>
                                <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
                            </button>
                        </div>
                    </div>
                </div>

                <form id="stage-form-packing" onsubmit="event.preventDefault(); window.productionRouter.saveCurrentStage(false);">
                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
                        
                        <!-- Left 2 Cols: Master Carton Packing Matrix -->
                        <div class="flex flex-col gap-5 lg:col-span-2">
                            
                            <!-- Master Carton Table -->
                            <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm">
                                <div class="flex items-center justify-between mb-4">
                                    <h4 class="text-[14px] font-bold text-on-surface uppercase tracking-wider flex items-center gap-2">
                                        <span class="material-symbols-outlined text-primary text-[18px]">package_2</span>
                                        Master Carton Packing Matrix
                                    </h4>
                                    <div class="flex items-center gap-2">
                                        <button type="button" onclick="window.PackingWorkspaceActions.autoGenerateCartons()" 
                                            class="px-3 py-1.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 text-[12px] font-bold active-scale transition-apple">
                                            Auto-Pack 60 Pcs/Carton
                                        </button>
                                        <button type="button" onclick="window.PackingWorkspaceActions.printLabels()" 
                                            class="px-3 py-1.5 rounded-xl bg-[#FF2D55]/10 text-[#FF2D55] hover:bg-[#FF2D55]/20 text-[12px] font-bold flex items-center gap-1 active-scale transition-apple">
                                            <span class="material-symbols-outlined text-[14px]">print</span>
                                            Box Labels
                                        </button>
                                    </div>
                                </div>

                                <div class="overflow-x-auto">
                                    <table class="w-full text-left text-[13px]">
                                        <thead>
                                            <tr class="border-b border-outline-variant/60 text-[11px] font-bold text-secondary uppercase">
                                                <th class="pb-2.5">Carton #</th>
                                                <th class="pb-2.5">Box Barcode</th>
                                                <th class="pb-2.5">Size Breakdown</th>
                                                <th class="pb-2.5 text-center">Pieces</th>
                                                <th class="pb-2.5 text-right">Gross Wt (Kg)</th>
                                            </tr>
                                        </thead>
                                        <tbody class="divide-y divide-outline-variant/30" id="cartons-table-body">
                                            ${cartons.length === 0 ? `
                                                <tr id="empty-cartons-row">
                                                    <td colspan="5" class="py-8 text-center text-secondary">
                                                        <span class="material-symbols-outlined text-[32px] opacity-40 mb-1">inventory_2</span>
                                                        <p class="text-[13px]">No cartons logged yet. Click <strong>Auto-Pack 60 Pcs/Carton</strong> or add boxes manually.</p>
                                                    </td>
                                                </tr>
                                            ` : cartons.map((c, idx) => `
                                                <tr class="hover:bg-surface-container/40">
                                                    <td class="py-3 font-extrabold text-on-surface">Box #${c.cartonNo || (idx + 1)}</td>
                                                    <td class="py-3 font-mono text-[12px] text-secondary">${c.boxBarcode || `BX-${order?.id || '001'}-${idx + 1}`}</td>
                                                    <td class="py-3 text-[12px] text-on-surface font-medium">
                                                        ${typeof c.sizes === 'object' ? Object.entries(c.sizes).map(([sz, q]) => `${sz}:${q}`).join(', ') : 'Mixed'}
                                                    </td>
                                                    <td class="py-3 text-center font-bold text-primary">${c.totalPcs}</td>
                                                    <td class="py-3 text-right font-mono font-bold text-on-surface">${c.grossWeightKg} kg</td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>

                                <div class="mt-4 pt-3 border-t border-outline-variant/40 flex items-center justify-between text-[13px]">
                                    <span class="text-secondary font-medium">
                                        Total Cartons: <strong class="text-on-surface" id="total-cartons-count">${cartons.length}</strong>
                                    </span>
                                    <div class="flex items-center gap-4">
                                        <span class="text-secondary">Gross Weight: <strong class="text-on-surface font-mono" id="total-gross-weight">${totalGrossWeight} kg</strong></span>
                                        <span class="text-secondary">Packed: <strong class="text-primary font-mono" id="total-packed-pcs">${totalPackedPcs} pcs</strong></span>
                                    </div>
                                </div>
                            </div>

                        </div>

                        <!-- Right Column: Finishing Checklist -->
                        <div class="flex flex-col gap-5">
                            
                            <!-- Finishing Checklist -->
                            <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm">
                                <h4 class="text-[14px] font-bold text-on-surface uppercase tracking-wider mb-4 flex items-center gap-1.5">
                                    <span class="material-symbols-outlined text-[#34C759] text-[18px]">fact_check</span>
                                    Finishing Quality Checklist
                                </h4>

                                <div class="flex flex-col gap-3">
                                    <label class="flex items-center justify-between p-3 rounded-xl bg-surface-container border border-outline-variant/60 cursor-pointer hover:bg-surface-variant transition-apple">
                                        <div>
                                            <p class="text-[13px] font-bold text-on-surface">100% Thread Trimming</p>
                                            <p class="text-[11px] text-secondary">No loose threads or long tails</p>
                                        </div>
                                        <input type="checkbox" name="trimmingChecked" checked class="w-5 h-5 rounded text-primary focus:ring-primary">
                                    </label>

                                    <div>
                                        <label class="block text-[12px] font-bold text-secondary mb-1">Steam Ironed Pieces</label>
                                        <input type="number" name="steamIronedCount" value="${ironed}" 
                                            class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2 text-[14px] font-bold text-on-surface focus:border-primary outline-none">
                                    </div>

                                    <div>
                                        <label class="block text-[12px] font-bold text-secondary mb-1">Individually Polybagged</label>
                                        <input type="number" name="polybaggedCount" value="${polybagged}" 
                                            class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2 text-[14px] font-bold text-on-surface focus:border-primary outline-none">
                                    </div>
                                </div>
                            </div>

                            <!-- Stage Status -->
                            <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm">
                                <label class="block text-[12px] font-bold text-secondary mb-1">Packing Status</label>
                                <select name="status" class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2 text-[13px] font-bold text-on-surface focus:border-primary outline-none">
                                    <option value="Packing" ${pck.status === 'Packing' ? 'selected' : ''}>Packing in Progress</option>
                                    <option value="Cartons Ready" ${pck.status === 'Cartons Ready' ? 'selected' : ''}>Cartons Ready & Weighted</option>
                                    <option value="Sealed" ${pck.status === 'Sealed' ? 'selected' : ''}>Sealed & Strapped for Dispatch</option>
                                </select>
                            </div>

                        </div>

                    </div>
                </form>

            </div>
        `;
    },

    extractFormData() {
        const form = document.getElementById('stage-form-packing');
        if (!form) return {};
        const fd = new FormData(form);

        const cartons = window._packingCartonsCache || [];
        const totalGross = cartons.reduce((sum, c) => sum + (Number(c.grossWeightKg) || 0), 0);

        return {
            trimmingChecked: Boolean(fd.get('trimmingChecked')),
            steamIronedCount: Number(fd.get('steamIronedCount')) || 0,
            polybaggedCount: Number(fd.get('polybaggedCount')) || 0,
            cartons,
            totalCartons: cartons.length,
            totalGrossWeightKg: Number(totalGross.toFixed(1)),
            labelsPrinted: true,
            status: fd.get('status') || 'Cartons Ready'
        };
    }
};

if (typeof window !== 'undefined') {
    window.PackingWorkspaceActions = {
        autoGenerateCartons() {
            const order = window.productionRouter?.activeOrder;
            const targetQty = Number(order?.qty) || 500;
            const boxCapacity = 60;
            const numBoxes = Math.ceil(targetQty / boxCapacity);
            const cartons = [];
            let remaining = targetQty;

            for (let i = 1; i <= numBoxes; i++) {
                const pcsInBox = Math.min(boxCapacity, remaining);
                const grossKg = Number((pcsInBox * 0.24 + 1.2).toFixed(1)); // fabric weight + carton tare
                cartons.push({
                    cartonNo: i,
                    boxBarcode: `BX-${order?.id || 'ORD'}-${String(i).padStart(2, '0')}`,
                    sizes: { 'S': Math.round(pcsInBox * 0.2), 'M': Math.round(pcsInBox * 0.4), 'L': Math.round(pcsInBox * 0.4) },
                    totalPcs: pcsInBox,
                    grossWeightKg: grossKg
                });
                remaining -= pcsInBox;
            }

            window._packingCartonsCache = cartons;

            // Update UI
            const tbody = document.getElementById('cartons-table-body');
            if (tbody) {
                tbody.innerHTML = cartons.map(c => `
                    <tr class="hover:bg-surface-container/40 animate-fade-in">
                        <td class="py-3 font-extrabold text-on-surface">Box #${c.cartonNo}</td>
                        <td class="py-3 font-mono text-[12px] text-secondary">${c.boxBarcode}</td>
                        <td class="py-3 text-[12px] text-on-surface font-medium">S:${c.sizes.S}, M:${c.sizes.M}, L:${c.sizes.L}</td>
                        <td class="py-3 text-center font-bold text-primary">${c.totalPcs}</td>
                        <td class="py-3 text-right font-mono font-bold text-on-surface">${c.grossWeightKg} kg</td>
                    </tr>
                `).join('');
            }

            const totalGross = cartons.reduce((sum, c) => sum + c.grossWeightKg, 0);
            const countElem = document.getElementById('total-cartons-count');
            if (countElem) countElem.textContent = cartons.length;
            const wtElem = document.getElementById('total-gross-weight');
            if (wtElem) wtElem.textContent = `${totalGross.toFixed(1)} kg`;
            const pcsElem = document.getElementById('total-packed-pcs');
            if (pcsElem) pcsElem.textContent = `${targetQty} pcs`;

            if (window.showToast) window.showToast(`Packed ${targetQty} pieces into ${cartons.length} master cartons!`);
        },

        printLabels() {
            const cartons = window._packingCartonsCache || [];
            const order = window.productionRouter?.activeOrder;
            if (cartons.length === 0) {
                if (window.showToast) window.showToast('Please pack cartons first!', 'warning');
                return;
            }

            const win = window.open('', '_blank');
            win.document.write(`
                <html>
                <head>
                    <title>Garment OS - Shipping Box Labels</title>
                    <style>
                        body { font-family: sans-serif; padding: 20px; }
                        .label-box { border: 2px solid #000; padding: 16px; margin-bottom: 24px; page-break-after: always; width: 400px; }
                        .title { font-size: 18px; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 8px; margin-bottom: 10px; }
                        .row { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 14px; }
                        .barcode { text-align: center; margin-top: 15px; font-family: monospace; font-size: 18px; font-weight: bold; }
                    </style>
                </head>
                <body>
                    ${cartons.map(c => `
                        <div class="label-box">
                            <div class="title">GARMENT OS SHIPPING LABEL</div>
                            <div class="row"><span>Buyer:</span><strong>${order?.customerName || 'Customer'}</strong></div>
                            <div class="row"><span>Order PO:</span><strong>${order?.id || 'ORD-001'}</strong></div>
                            <div class="row"><span>Carton:</span><strong>Box #${c.cartonNo} of ${cartons.length}</strong></div>
                            <div class="row"><span>Pieces:</span><strong>${c.totalPcs} pcs</strong></div>
                            <div class="row"><span>Gross Weight:</span><strong>${c.grossWeightKg} KG</strong></div>
                            <div class="barcode">|||| | ||||| |||| ||||<br>${c.boxBarcode}</div>
                        </div>
                    `).join('')}
                    <script>window.print();</script>
                </body>
                </html>
            `);
            win.document.close();
        }
    };
}
