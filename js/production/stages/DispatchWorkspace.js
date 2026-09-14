/**
 * Garment OS — Production Hero Hub: Dispatch & Gate Pass Workspace
 * Delivery Challan (DC), Gate Pass, vehicle details, carrier LR tracking, and order fulfillment.
 */

import { STAGE_DEFINITIONS } from '../domain/workflowEngine.js?v=5.5';

export const DispatchWorkspace = {
    render(order, activeProduct, stageData) {
        const dsp = stageData?.dispatch || {};
        const pck = stageData?.packing || {};
        const targetQty = Number(order?.qty) || 0;
        const totalBoxes = Number(dsp.totalBoxesDispatched) || pck.totalCartons || (Array.isArray(pck.cartons) ? pck.cartons.length : 10);
        const dcNumber = dsp.dcNumber || `DC-${order?.id || 'DISP'}-${new Date().getFullYear()}`;
        const gatePass = dsp.gatePassNumber || `GP-${Math.floor(100000 + Math.random() * 900000)}`;
        const status = dsp.status || 'Ready';

        const isDispatched = status === 'In Transit' || status === 'Delivered' || order?.status === 'Dispatched';

        return `
            <div class="flex flex-col gap-5 animate-fade-in" id="dispatch-workspace-root">
                
                <!-- Stage Header Banner -->
                <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm">
                    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div class="flex items-center gap-3">
                            <div class="w-12 h-12 rounded-xl bg-[#30B0C7]/10 text-[#30B0C7] flex items-center justify-center font-bold">
                                <span class="material-symbols-outlined text-[26px]">local_shipping</span>
                            </div>
                            <div>
                                <div class="flex items-center gap-2">
                                    <h3 class="text-[18px] font-bold text-on-surface">Dispatch & Security Gate Pass</h3>
                                    <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold ${isDispatched ? 'bg-[#34C759]/15 text-[#34C759]' : 'bg-[#30B0C7]/15 text-[#30B0C7]'}">
                                        ${isDispatched ? 'Dispatched' : 'Ready for Shipping'}
                                    </span>
                                </div>
                                <p class="text-[13px] text-secondary mt-0.5">Delivery Challan (DC), Gate Pass, vehicle / LR tracking, and order fulfillment</p>
                            </div>
                        </div>

                        <div class="flex items-center gap-2 w-full sm:w-auto">
                            <button type="button" onclick="window.DispatchWorkspaceActions.printDeliveryChallan()" 
                                class="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-outline-variant bg-surface-container-high text-on-surface text-[13px] font-bold hover:bg-surface-variant active-scale transition-apple flex items-center justify-center gap-1.5">
                                <span class="material-symbols-outlined text-[16px]">print</span>
                                <span>Print DC & Gate Pass</span>
                            </button>
                            <button type="button" onclick="window.DispatchWorkspaceActions.confirmDispatch()" 
                                class="flex-1 sm:flex-none px-5 py-2.5 rounded-xl ${isDispatched ? 'bg-[#34C759] text-white' : 'bg-primary text-white'} text-[13px] font-bold hover:opacity-90 active-scale transition-apple shadow-sm flex items-center justify-center gap-1.5">
                                <span class="material-symbols-outlined text-[18px]">${isDispatched ? 'check_circle' : 'send'}</span>
                                <span>${isDispatched ? 'Order Dispatched' : 'Confirm Dispatch'}</span>
                            </button>
                        </div>
                    </div>
                </div>

                <form id="stage-form-dispatch" onsubmit="event.preventDefault(); window.productionRouter.saveCurrentStage(false);">
                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
                        
                        <!-- Left 2 Cols: Shipping Details & Vehicle Tracking -->
                        <div class="flex flex-col gap-5 lg:col-span-2">
                            
                            <!-- Delivery Challan & Documents -->
                            <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm">
                                <h4 class="text-[14px] font-bold text-on-surface uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <span class="material-symbols-outlined text-primary text-[18px]">description</span>
                                    Shipping Documents & Challan
                                </h4>

                                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div>
                                        <label class="block text-[12px] font-bold text-secondary mb-1">Delivery Challan (DC) #</label>
                                        <input type="text" name="dcNumber" value="${dcNumber}" 
                                            class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2.5 text-[14px] font-mono font-bold text-on-surface focus:border-primary outline-none">
                                    </div>

                                    <div>
                                        <label class="block text-[12px] font-bold text-secondary mb-1">Security Gate Pass #</label>
                                        <input type="text" name="gatePassNumber" value="${gatePass}" 
                                            class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2.5 text-[14px] font-mono font-bold text-on-surface focus:border-primary outline-none">
                                    </div>

                                    <div>
                                        <label class="block text-[12px] font-bold text-secondary mb-1">E-Way Bill Number</label>
                                        <input type="text" name="eWayBillNumber" value="${dsp.eWayBillNumber || ''}" 
                                            placeholder="12-digit E-Way Bill"
                                            class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2.5 text-[14px] font-mono text-on-surface focus:border-primary outline-none">
                                    </div>
                                </div>
                            </div>

                            <!-- Logistics & Transporter Details -->
                            <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm">
                                <h4 class="text-[14px] font-bold text-on-surface uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <span class="material-symbols-outlined text-[#30B0C7] text-[18px]">commute</span>
                                    Logistics Carrier & Vehicle Information
                                </h4>

                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label class="block text-[12px] font-bold text-secondary mb-1">Logistics / Transporter Name</label>
                                        <input type="text" name="transporterName" value="${dsp.transporterName || 'VRL Logistics / Professional Couriers'}" 
                                            class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2.5 text-[14px] font-medium text-on-surface focus:border-primary outline-none">
                                    </div>

                                    <div>
                                        <label class="block text-[12px] font-bold text-secondary mb-1">Vehicle Plate Number</label>
                                        <input type="text" name="vehicleNumber" value="${dsp.vehicleNumber || 'TN-38-BX-4921'}" 
                                            placeholder="e.g. TN-38-AA-1234"
                                            class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2.5 text-[14px] font-bold font-mono text-on-surface uppercase focus:border-primary outline-none">
                                    </div>

                                    <div>
                                        <label class="block text-[12px] font-bold text-secondary mb-1">Driver Name & Contact</label>
                                        <div class="flex gap-2">
                                            <input type="text" name="driverName" value="${dsp.driverName || 'R. Suresh'}" 
                                                placeholder="Driver Name"
                                                class="flex-1 bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2.5 text-[14px] font-medium text-on-surface focus:border-primary outline-none">
                                            <input type="text" name="driverPhone" value="${dsp.driverPhone || '9842109842'}" 
                                                placeholder="Phone"
                                                class="w-36 bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2.5 text-[14px] font-medium text-on-surface focus:border-primary outline-none">
                                        </div>
                                    </div>

                                    <div>
                                        <label class="block text-[12px] font-bold text-secondary mb-1">Lorry Receipt (LR) / AWB #</label>
                                        <input type="text" name="trackingOrLrNo" value="${dsp.trackingOrLrNo || 'LR-8920194'}" 
                                            class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2.5 text-[14px] font-mono font-bold text-primary focus:border-primary outline-none">
                                    </div>
                                </div>
                            </div>

                        </div>

                        <!-- Right Column: Shipment Summary & Status -->
                        <div class="flex flex-col gap-5">
                            
                            <!-- Consignment Summary -->
                            <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm">
                                <h4 class="text-[14px] font-bold text-on-surface uppercase tracking-wider mb-4 flex items-center gap-1.5">
                                    <span class="material-symbols-outlined text-primary text-[18px]">inventory</span>
                                    Consignment Summary
                                </h4>

                                <div class="flex flex-col gap-3">
                                    <div class="p-3 rounded-xl bg-surface-container border border-outline-variant/60">
                                        <p class="text-[11px] font-bold text-secondary uppercase">Buyer / Customer</p>
                                        <p class="text-[14px] font-bold text-on-surface mt-0.5">${order?.customerName || order?.customerId || 'Standard Customer'}</p>
                                    </div>

                                    <div class="grid grid-cols-2 gap-3">
                                        <div class="p-3 rounded-xl bg-surface-container border border-outline-variant/60">
                                            <p class="text-[11px] font-bold text-secondary uppercase">Total Boxes</p>
                                            <input type="number" name="totalBoxesDispatched" value="${totalBoxes}" 
                                                class="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-2 py-1 text-[16px] font-extrabold text-on-surface mt-1 outline-none">
                                        </div>

                                        <div class="p-3 rounded-xl bg-surface-container border border-outline-variant/60">
                                            <p class="text-[11px] font-bold text-secondary uppercase">Total Units</p>
                                            <p class="text-[16px] font-extrabold text-primary mt-1">${targetQty.toLocaleString()} pcs</p>
                                        </div>
                                    </div>

                                    <div>
                                        <label class="block text-[12px] font-bold text-secondary mb-1">Dispatch Date</label>
                                        <input type="date" name="dispatchDate" value="${dsp.dispatchDate || new Date().toISOString().split('T')[0]}" 
                                            class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2 text-[13px] font-bold text-on-surface focus:border-primary outline-none">
                                    </div>

                                    <div>
                                        <label class="block text-[12px] font-bold text-secondary mb-1">Shipment Status</label>
                                        <select name="status" id="dispatch-status-select" class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2 text-[13px] font-bold text-on-surface focus:border-primary outline-none">
                                            <option value="Ready" ${status === 'Ready' ? 'selected' : ''}>Ready for Loading</option>
                                            <option value="In Transit" ${status === 'In Transit' ? 'selected' : ''}>In Transit</option>
                                            <option value="Delivered" ${status === 'Delivered' ? 'selected' : ''}>Delivered to Customer</option>
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
        const form = document.getElementById('stage-form-dispatch');
        if (!form) return {};
        const fd = new FormData(form);
        return {
            dcNumber: fd.get('dcNumber') || '',
            gatePassNumber: fd.get('gatePassNumber') || '',
            eWayBillNumber: fd.get('eWayBillNumber') || '',
            transporterName: fd.get('transporterName') || '',
            vehicleNumber: fd.get('vehicleNumber') || '',
            driverName: fd.get('driverName') || '',
            driverPhone: fd.get('driverPhone') || '',
            trackingOrLrNo: fd.get('trackingOrLrNo') || '',
            totalBoxesDispatched: Number(fd.get('totalBoxesDispatched')) || 0,
            dispatchDate: fd.get('dispatchDate') || new Date().toISOString().split('T')[0],
            status: fd.get('status') || 'Ready'
        };
    }
};

if (typeof window !== 'undefined') {
    window.DispatchWorkspaceActions = {
        async confirmDispatch() {
            if (!confirm('Are you sure you want to mark this order as DISPATCHED and generate the Gate Pass?')) {
                return;
            }

            const select = document.getElementById('dispatch-status-select');
            if (select) select.value = 'In Transit';

            // Save and trigger order transition to 'Dispatched'
            await window.productionRouter?.saveCurrentStage(false, 'Dispatched');

            if (window.showToast) window.showToast('Order successfully marked as DISPATCHED! Gate Pass issued.', 'success');
        },

        printDeliveryChallan() {
            const order = window.productionRouter?.activeOrder;
            const stageData = order?.stageData || {};
            const dsp = stageData.dispatch || {};
            const pck = stageData.packing || {};

            const win = window.open('', '_blank');
            win.document.write(`
                <html>
                <head>
                    <title>Delivery Challan & Gate Pass</title>
                    <style>
                        body { font-family: sans-serif; padding: 24px; color: #111; }
                        .header { border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 20px; }
                        .header h1 { margin: 0; font-size: 22px; }
                        .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; font-size: 14px; }
                        .table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px; }
                        .table th, .table td { border: 1px solid #333; padding: 10px; text-align: left; }
                        .table th { background: #f5f5f5; }
                        .signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-top: 60px; text-align: center; font-size: 13px; }
                        .sig-line { border-top: 1px solid #000; padding-top: 8px; font-weight: bold; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>GARMENT OS — DELIVERY CHALLAN & GATE PASS</h1>
                        <p style="margin: 4px 0 0 0; color: #555;">Official Factory Outward Dispatch Document</p>
                    </div>

                    <div class="meta-grid">
                        <div>
                            <p><strong>DC Number:</strong> ${dsp.dcNumber || 'DC-8921'}</p>
                            <p><strong>Gate Pass:</strong> ${dsp.gatePassNumber || 'GP-1092'}</p>
                            <p><strong>Date:</strong> ${dsp.dispatchDate || new Date().toISOString().split('T')[0]}</p>
                            <p><strong>Order PO:</strong> ${order?.id || 'ORD-001'}</p>
                        </div>
                        <div>
                            <p><strong>Consignee / Buyer:</strong> ${order?.customerName || 'Customer'}</p>
                            <p><strong>Carrier:</strong> ${dsp.transporterName || 'Local Transport'}</p>
                            <p><strong>Vehicle Number:</strong> ${dsp.vehicleNumber || 'TN-38-1234'}</p>
                            <p><strong>Driver:</strong> ${dsp.driverName || 'Driver'} (${dsp.driverPhone || 'N/A'})</p>
                        </div>
                    </div>

                    <table class="table">
                        <thead>
                            <tr>
                                <th>Item Description</th>
                                <th>Total Cartons</th>
                                <th>Total Quantity</th>
                                <th>Gross Weight</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><strong>${order?.product || 'Garments'}</strong></td>
                                <td>${dsp.totalBoxesDispatched || pck.totalCartons || 10} Boxes</td>
                                <td><strong>${order?.qty || 500} Pieces</strong></td>
                                <td>${pck.totalGrossWeightKg || 120} KG</td>
                            </tr>
                        </tbody>
                    </table>

                    <div class="signatures">
                        <div class="sig-line">Prepared By (Packing Master)</div>
                        <div class="sig-line">Security Gate Officer (Outward)</div>
                        <div class="sig-line">Carrier / Driver Acknowledgment</div>
                    </div>

                    <script>window.print();</script>
                </body>
                </html>
            `);
            win.document.close();
        }
    };
}
