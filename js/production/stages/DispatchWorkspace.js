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
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <title>Delivery Challan - ${dsp.dcNumber || 'DC-8921'}</title>
                    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
                    <style>
                        @page { size: A4 portrait; margin: 6mm 8mm; }
                        * { box-sizing: border-box; margin: 0; padding: 0; }
                        body { font-family: 'Inter', sans-serif; font-size: 11px; color: #0f172a; line-height: 1.4; padding: 0; }
                        .top-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 10px; }
                        .banner { display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 10px; margin-bottom: 10px; }
                        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px; }
                        .card { border: 1px solid #e2e8f0; background: #fafafa; border-radius: 6px; padding: 8px 10px; font-size: 10.5px; }
                        .card-label { font-size: 9px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 4px; border-bottom: 1px solid #e2e8f0; padding-bottom: 2px; }
                        table { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 11px; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; }
                        th { background: #f1f5f9; padding: 6px 8px; text-align: left; font-size: 9.5px; font-weight: 700; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; }
                        td { border-bottom: 1px solid #e2e8f0; padding: 8px; }
                        .signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-top: 40px; text-align: center; font-size: 10px; }
                        .sig-line { border-top: 1px solid #0f172a; padding-top: 6px; font-weight: 700; }
                        @media print { body { padding: 0; } }
                    </style>
                </head>
                <body>
                    <div class="top-header">
                        <div style="display:flex;align-items:center;gap:10px;">
                            <img src="/assets/logo-billing.png" alt="Logo" style="height:44px;object-fit:contain;" onerror="this.outerHTML='<div style=\\'font-size:18px;font-weight:800;\\'>UDHAYAA TEXTILES</div>'">
                            <div>
                                <div style="font-size:16px;font-weight:800;">UDHAYAA TEXTILES</div>
                                <div style="font-size:9.5px;color:#64748b;font-weight:600">Garment Manufacturing &amp; Processing Unit</div>
                            </div>
                        </div>
                        <div style="text-align:right;font-size:10px;color:#475569;">
                            <div style="font-weight:600;color:#0f172a">63/A Senthur Nagar, Ellapalayam Road, Erode 638004</div>
                            <div>Phone: +91 77083 33813 · info@udhayaatextiles.com</div>
                            <div><strong style="color:#0f172a;background:#f1f5f9;padding:1px 6px;border:1px solid #cbd5e1;border-radius:4px;">GSTIN: 33ANGPU7147M1ZE</strong></div>
                        </div>
                    </div>

                    <div class="banner">
                        <div style="font-size:13px;font-weight:800;text-transform:uppercase;">DELIVERY CHALLAN &amp; GATE PASS</div>
                        <div><strong>DC #:</strong> ${dsp.dcNumber || 'DC-8921'}</div>
                        <div><strong>Gate Pass:</strong> ${dsp.gatePassNumber || 'GP-1092'}</div>
                        <div><strong>Date:</strong> ${dsp.dispatchDate || new Date().toISOString().split('T')[0]}</div>
                    </div>

                    <div class="grid-2">
                        <div class="card">
                            <div class="card-label">Dispatch &amp; Consignee Details</div>
                            <div style="font-size:12px;font-weight:700;color:#0f172a;margin-bottom:2px">${order?.customerName || 'Customer / Consignee'}</div>
                            <div><strong>Order Ref / PO:</strong> ${order?.id || 'ORD-001'}</div>
                            <div><strong>Dispatch Mode:</strong> ${dsp.dispatchMode || 'Road Transport'}</div>
                        </div>
                        <div class="card">
                            <div class="card-label">Logistics &amp; Transport Info</div>
                            <div><strong>Carrier:</strong> ${dsp.transporterName || 'Local Transport'}</div>
                            <div><strong>Vehicle Number:</strong> ${dsp.vehicleNumber || 'TN-38-1234'}</div>
                            <div><strong>Driver Name &amp; Phone:</strong> ${dsp.driverName || 'Driver'} (${dsp.driverPhone || 'N/A'})</div>
                        </div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th>Item Description</th>
                                <th style="text-align:center">HSN/SAC</th>
                                <th style="text-align:center">Total Cartons</th>
                                <th style="text-align:center">Total Quantity</th>
                                <th style="text-align:right">Gross Weight</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><strong>${order?.product || 'Garments'}</strong></td>
                                <td style="text-align:center;color:#64748b">6109</td>
                                <td style="text-align:center;font-weight:600">${dsp.totalBoxesDispatched || pck.totalCartons || 10} Boxes</td>
                                <td style="text-align:center;font-weight:700">${order?.qty || 500} Pieces</td>
                                <td style="text-align:right;font-weight:600">${pck.totalGrossWeightKg || 120} KG</td>
                            </tr>
                        </tbody>
                    </table>

                    <div style="font-size:9.5px;color:#64748b;margin-bottom:15px;line-height:1.4;">
                        <em>Note: Goods mentioned above are dispatched in good condition and delivered for commercial/job-work supply. Received goods must be verified upon delivery.</em>
                    </div>

                    <div class="signatures">
                        <div class="sig-line">Prepared By (Dispatch Master)</div>
                        <div class="sig-line">Security Gate Officer (Outward)</div>
                        <div class="sig-line">Carrier / Consignee Acknowledgment</div>
                    </div>

                    <script>
                        window.onload = function() {
                            setTimeout(function() { window.print(); }, 400);
                        };
                    </script>
                </body>
                </html>
            `);
            win.document.close();
        }
    };
}
