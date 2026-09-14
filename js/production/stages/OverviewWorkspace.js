/**
 * Garment OS — Production Hero Hub: Overview Workspace
 * Real-time operational pulse across all running orders and department bottlenecks.
 */

import { STAGE_DEFINITIONS, calculateOrderRollup } from '../domain/workflowEngine.js?v=5.5';

export const OverviewWorkspace = {
    render(orders, activeOrderId, onSelectOrder, onSelectStage) {
        const activeOrders = orders.filter(o => !['Delivered', 'Closed', 'Archived'].includes(o.status));
        
        // Calculate factory-wide metrics
        let totalPieces = 0;
        let bottleneckCount = 0;
        let dueThisWeekCount = 0;
        const now = Date.now();
        const stageWorkloads = {
            procurement: 0,
            fabric: 0,
            cutting: 0,
            print_wash: 0,
            stitching: 0,
            packing: 0,
            dispatch: 0
        };

        activeOrders.forEach(o => {
            const roll = calculateOrderRollup(o);
            totalPieces += roll.totalOrderQty;
            if (roll.isBottleneck) bottleneckCount++;
            
            if (o.deliveryDate) {
                const days = (new Date(o.deliveryDate).getTime() - now) / (1000 * 60 * 60 * 24);
                if (days >= 0 && days <= 7) dueThisWeekCount++;
            }

            const currentKey = roll.activeStageKey;
            if (stageWorkloads[currentKey] !== undefined) {
                stageWorkloads[currentKey]++;
            }
        });

        const stagesList = [
            { key: 'procurement', label: 'Procurement', icon: 'shopping_cart', count: stageWorkloads.procurement, color: 'text-[#5856D6]', bg: 'bg-[#5856D6]/10' },
            { key: 'fabric', label: 'Fabric', icon: 'texture', count: stageWorkloads.fabric, color: 'text-[#007AFF]', bg: 'bg-[#007AFF]/10' },
            { key: 'cutting', label: 'Cutting', icon: 'content_cut', count: stageWorkloads.cutting, color: 'text-[#FF9500]', bg: 'bg-[#FF9500]/10' },
            { key: 'print_wash', label: 'Print / Wash', icon: 'palette', count: stageWorkloads.print_wash, color: 'text-[#AF52DE]', bg: 'bg-[#AF52DE]/10' },
            { key: 'stitching', label: 'Stitching', icon: 'precision_manufacturing', count: stageWorkloads.stitching, color: 'text-[#34C759]', bg: 'bg-[#34C759]/10' },
            { key: 'packing', label: 'Packing', icon: 'inventory_2', count: stageWorkloads.packing, color: 'text-[#FF2D55]', bg: 'bg-[#FF2D55]/10' },
            { key: 'dispatch', label: 'Dispatch', icon: 'local_shipping', count: stageWorkloads.dispatch, color: 'text-[#30B0C7]', bg: 'bg-[#30B0C7]/10' }
        ];

        return `
            <div class="flex flex-col gap-5 animate-fade-in">
                
                <!-- Operational Factory KPIs -->
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 shadow-sm">
                        <p class="text-[11px] font-bold text-secondary uppercase tracking-wider">Active Orders</p>
                        <h3 class="text-[26px] font-extrabold text-on-surface mt-1">${activeOrders.length}</h3>
                        <p class="text-[12px] text-secondary mt-0.5">In factory pipeline</p>
                    </div>

                    <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 shadow-sm">
                        <p class="text-[11px] font-bold text-secondary uppercase tracking-wider">Pieces in Production</p>
                        <h3 class="text-[26px] font-extrabold text-primary mt-1">${totalPieces.toLocaleString()}</h3>
                        <p class="text-[12px] text-secondary mt-0.5">Total units queued</p>
                    </div>

                    <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 shadow-sm">
                        <p class="text-[11px] font-bold text-secondary uppercase tracking-wider">Bottlenecks</p>
                        <h3 class="text-[26px] font-extrabold ${bottleneckCount > 0 ? 'text-error' : 'text-[#34C759]'} mt-1">${bottleneckCount}</h3>
                        <p class="text-[12px] text-secondary mt-0.5">${bottleneckCount > 0 ? 'Urgent floor attention' : 'Floor running smooth'}</p>
                    </div>

                    <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 shadow-sm">
                        <p class="text-[11px] font-bold text-secondary uppercase tracking-wider">Due This Week</p>
                        <h3 class="text-[26px] font-extrabold text-orange-500 mt-1">${dueThisWeekCount}</h3>
                        <p class="text-[12px] text-secondary mt-0.5">Upcoming deliveries</p>
                    </div>
                </div>

                <!-- Department Workload Grid -->
                <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 shadow-sm">
                    <div class="flex items-center justify-between mb-3">
                        <h4 class="text-[14px] font-bold text-on-surface uppercase tracking-wider">Department Workloads</h4>
                        <span class="text-[12px] text-secondary">Orders queued</span>
                    </div>
                    <div class="grid grid-cols-2 sm:grid-cols-7 gap-2">
                        ${stagesList.map(s => `
                            <button onclick="window.productionRouter.switchStage('${s.key}')" 
                                class="p-3 rounded-xl border border-outline-variant/60 hover:border-primary flex flex-col items-center justify-center gap-1 active-scale transition-apple text-center ${s.count > 0 ? 'bg-surface-container-lowest' : 'opacity-60'}">
                                <span class="material-symbols-outlined text-[20px] ${s.color}">${s.icon}</span>
                                <span class="text-[11px] font-bold text-on-surface truncate w-full">${s.label}</span>
                                <span class="text-[14px] font-extrabold ${s.color}">${s.count}</span>
                            </button>
                        `).join('')}
                    </div>
                </div>

                <!-- Active Floor Queue -->
                <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 shadow-sm">
                    <div class="flex items-center justify-between mb-3">
                        <h4 class="text-[14px] font-bold text-on-surface uppercase tracking-wider">Active Factory Floor Orders</h4>
                        <span class="text-[12px] text-secondary">${activeOrders.length} running</span>
                    </div>

                    <div class="flex flex-col gap-3">
                        ${activeOrders.length === 0 ? `
                            <div class="p-8 text-center text-secondary">
                                <span class="material-symbols-outlined text-[40px] opacity-40 mb-2">precision_manufacturing</span>
                                <p class="text-[14px] font-medium">No active production orders.</p>
                            </div>
                        ` : activeOrders.map(ord => {
                            const roll = calculateOrderRollup(ord);
                            const isSelected = ord.id === activeOrderId;
                            const isOverdue = ord.deliveryDate && new Date(ord.deliveryDate).getTime() < now;

                            return `
                                <div onclick="window.productionRouter.switchOrder('${ord.id}', '${roll.activeStageKey}')"
                                    class="p-4 rounded-xl border ${isSelected ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'border-outline-variant/60 hover:border-primary'} flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 cursor-pointer active-scale transition-apple">
                                    <div class="min-w-0 pr-2">
                                        <div class="flex items-center gap-2 flex-wrap">
                                            <span class="text-[12px] font-mono font-bold text-primary uppercase">${ord.id}</span>
                                            <span class="text-[12px] text-secondary">•</span>
                                            <span class="text-[13px] font-semibold text-on-surface">${ord.customerName || ord.customerId}</span>
                                            ${isOverdue ? '<span class="text-[10px] font-bold px-2 py-0.5 rounded bg-error/10 text-error">Overdue</span>' : ''}
                                        </div>
                                        <h5 class="text-[15px] font-bold text-on-surface truncate mt-0.5">${ord.product || 'Apparel Order'}</h5>
                                        <p class="text-[12px] text-secondary mt-0.5">${roll.totalOrderQty} pcs • Promised: ${ord.deliveryDate || 'Not set'}</p>
                                    </div>

                                    <div class="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                                        <div class="flex flex-col items-end min-w-[120px]">
                                            <div class="flex items-center gap-1.5">
                                                <span class="w-2 h-2 rounded-full ${roll.activeStageDef.color.replace('text-', 'bg-')}"></span>
                                                <span class="text-[12px] font-bold text-on-surface">${roll.activeStageDef.label}</span>
                                            </div>
                                            <div class="w-28 h-1.5 bg-surface-variant rounded-full overflow-hidden mt-1.5">
                                                <div class="h-full bg-primary rounded-full" style="width:${roll.overallPercentage}%"></div>
                                            </div>
                                            <span class="text-[10px] text-secondary font-medium mt-0.5">${roll.overallPercentage}% Complete</span>
                                        </div>

                                        <button class="px-3 py-1.5 rounded-lg bg-primary text-white text-[12px] font-bold flex items-center gap-1 shrink-0 shadow-xs">
                                            <span>Floor</span>
                                            <span class="material-symbols-outlined text-[14px]">arrow_forward</span>
                                        </button>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>

            </div>
        `;
    }
};
