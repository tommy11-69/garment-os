/**
 * Garment OS — Production Hero Hub: Overview Workspace
 * Real-time operational pulse across all running orders and department bottlenecks.
 */

import { STAGE_DEFINITIONS, calculateOrderRollup, getWorkflowBadgeInfo, getProductWorkflowStages, normalizeStageKey } from '../domain/workflowEngine.js?v=6.0';

export const OverviewWorkspace = {
    render(orders, activeOrderId, onSelectOrder, onSelectStage) {
        const activeOrders = orders.filter(o => !['Delivered', 'Closed', 'Archived'].includes(o.status));
        
        // Calculate factory-wide metrics
        let totalPieces = 0;
        let bottleneckCount = 0;
        let dueThisWeekCount = 0;
        let overdueCount = 0;
        const now = Date.now();
        const stageWorkloads = {
            procurement: 0,
            winding: 0,
            knitting: 0,
            dyeing: 0,
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
                if (days < 0) overdueCount++;
                else if (days <= 7) dueThisWeekCount++;
            }

            if (Array.isArray(o.products) && o.products.length > 0) {
                o.products.forEach(p => {
                    const pWorkflow = getProductWorkflowStages(p, o.workflowType);
                    const pStageKey = normalizeStageKey(p.status || p.currentStage || pWorkflow[0]);
                    if (stageWorkloads[pStageKey] !== undefined) {
                        stageWorkloads[pStageKey]++;
                    }
                });
            } else {
                const currentKey = roll.activeStageKey;
                if (stageWorkloads[currentKey] !== undefined) {
                    stageWorkloads[currentKey]++;
                }
            }
        });

        // 3 Pipeline Zones
        const zoneSourcing = [
            { key: 'procurement', label: 'Procurement', icon: 'shopping_cart', count: stageWorkloads.procurement, color: 'text-[#5856D6]', bg: 'bg-[#5856D6]/10' },
            { key: 'winding', label: 'Winding', icon: 'rotate_right', count: stageWorkloads.winding, color: 'text-[#FF6B35]', bg: 'bg-[#FF6B35]/10' },
            { key: 'knitting', label: 'Knitting', icon: 'grid_on', count: stageWorkloads.knitting, color: 'text-[#0EA5E9]', bg: 'bg-[#0EA5E9]/10' },
            { key: 'dyeing', label: 'Dyeing', icon: 'water_drop', count: stageWorkloads.dyeing, color: 'text-[#8B5CF6]', bg: 'bg-[#8B5CF6]/10' }
        ];

        const zonePreAssembly = [
            { key: 'fabric', label: 'Fabric Inward', icon: 'texture', count: stageWorkloads.fabric, color: 'text-[#007AFF]', bg: 'bg-[#007AFF]/10' },
            { key: 'cutting', label: 'Cutting Floor', icon: 'content_cut', count: stageWorkloads.cutting, color: 'text-[#FF9500]', bg: 'bg-[#FF9500]/10' },
            { key: 'print_wash', label: 'Print / Wash', icon: 'palette', count: stageWorkloads.print_wash, color: 'text-[#AF52DE]', bg: 'bg-[#AF52DE]/10' }
        ];

        const zoneAssembly = [
            { key: 'stitching', label: 'Stitching Lines', icon: 'precision_manufacturing', count: stageWorkloads.stitching, color: 'text-[#34C759]', bg: 'bg-[#34C759]/10' },
            { key: 'packing', label: 'Finishing & Pack', icon: 'inventory_2', count: stageWorkloads.packing, color: 'text-[#FF2D55]', bg: 'bg-[#FF2D55]/10' },
            { key: 'dispatch', label: 'Dispatch Dock', icon: 'local_shipping', count: stageWorkloads.dispatch, color: 'text-[#30B0C7]', bg: 'bg-[#30B0C7]/10' }
        ];

        const renderStagePill = (s) => `
            <button type="button" onclick="window.productionRouter.switchStage('${s.key}')" 
                class="flex-1 min-w-[100px] p-2.5 rounded-xl border border-outline-variant/60 dark:border-slate-800 hover:border-primary flex flex-col items-center justify-center gap-1 active-scale transition-apple text-center ${s.count > 0 ? 'bg-surface-container-lowest dark:bg-slate-850 shadow-xs' : 'bg-surface-container-low/40 dark:bg-slate-900/40 opacity-70'}">
                <div class="flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-[18px] ${s.color}">${s.icon}</span>
                    <span class="text-[13px] font-black ${s.count > 0 ? s.color : 'text-secondary dark:text-slate-500'}">${s.count}</span>
                </div>
                <span class="text-[11px] font-bold text-on-surface dark:text-slate-200 truncate w-full">${s.label}</span>
            </button>
        `;

        return `
            <div class="flex flex-col gap-4 animate-fade-in">
                
                <!-- Operational Factory KPIs -->
                <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div class="bg-surface-container-lowest dark:bg-slate-900 border border-outline-variant dark:border-slate-800 rounded-2xl p-3.5 shadow-xs">
                        <div class="flex items-center justify-between">
                            <span class="text-[11px] font-bold text-secondary dark:text-slate-400 uppercase tracking-wider">Active Floor Orders</span>
                            <span class="material-symbols-outlined text-primary text-[20px]">assignment</span>
                        </div>
                        <div class="flex items-baseline gap-2 mt-1.5">
                            <h3 class="text-[26px] font-extrabold text-on-surface dark:text-white leading-none">${activeOrders.length}</h3>
                            <span class="text-[12px] text-secondary dark:text-slate-400 font-medium">in production</span>
                        </div>
                    </div>

                    <div class="bg-surface-container-lowest dark:bg-slate-900 border border-outline-variant dark:border-slate-800 rounded-2xl p-3.5 shadow-xs">
                        <div class="flex items-center justify-between">
                            <span class="text-[11px] font-bold text-secondary dark:text-slate-400 uppercase tracking-wider">Total Pieces Queued</span>
                            <span class="material-symbols-outlined text-blue-500 text-[20px]">layers</span>
                        </div>
                        <div class="flex items-baseline gap-2 mt-1.5">
                            <h3 class="text-[26px] font-extrabold text-primary dark:text-blue-400 leading-none">${totalPieces.toLocaleString()}</h3>
                            <span class="text-[12px] text-secondary dark:text-slate-400 font-medium">units active</span>
                        </div>
                    </div>

                    <div class="bg-surface-container-lowest dark:bg-slate-900 border border-outline-variant dark:border-slate-800 rounded-2xl p-3.5 shadow-xs">
                        <div class="flex items-center justify-between">
                            <span class="text-[11px] font-bold text-secondary dark:text-slate-400 uppercase tracking-wider">Bottleneck Alerts</span>
                            <span class="material-symbols-outlined ${bottleneckCount > 0 ? 'text-error animate-pulse' : 'text-[#34C759]'} text-[20px]">warning</span>
                        </div>
                        <div class="flex items-baseline gap-2 mt-1.5">
                            <h3 class="text-[26px] font-extrabold ${bottleneckCount > 0 ? 'text-error' : 'text-[#34C759]'} leading-none">${bottleneckCount}</h3>
                            <span class="text-[12px] ${bottleneckCount > 0 ? 'text-error font-bold' : 'text-secondary dark:text-slate-400'} font-medium">
                                ${bottleneckCount > 0 ? 'Urgent attention' : 'Floor running clean'}
                            </span>
                        </div>
                    </div>

                    <div class="bg-surface-container-lowest dark:bg-slate-900 border border-outline-variant dark:border-slate-800 rounded-2xl p-3.5 shadow-xs">
                        <div class="flex items-center justify-between">
                            <span class="text-[11px] font-bold text-secondary dark:text-slate-400 uppercase tracking-wider">Delivery Schedule</span>
                            <span class="material-symbols-outlined text-orange-500 text-[20px]">schedule</span>
                        </div>
                        <div class="flex items-baseline gap-2 mt-1.5">
                            <h3 class="text-[26px] font-extrabold ${overdueCount > 0 ? 'text-error' : 'text-orange-500'} leading-none">${dueThisWeekCount + overdueCount}</h3>
                            <span class="text-[12px] text-secondary dark:text-slate-400 font-medium">
                                ${overdueCount > 0 ? `<strong class="text-error font-bold">${overdueCount} overdue</strong>` : 'Due within 7 days'}
                            </span>
                        </div>
                    </div>
                </div>

                <!-- 3-Phase Interactive Factory Pipeline Funnel -->
                <div class="bg-surface-container-lowest dark:bg-slate-900 border border-outline-variant dark:border-slate-800 rounded-2xl p-4 shadow-xs">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-3">
                        <div class="flex items-center gap-2">
                            <span class="material-symbols-outlined text-primary text-[18px]">account_tree</span>
                            <h4 class="text-[13px] font-extrabold text-on-surface dark:text-white uppercase tracking-wider">Interactive Department Funnel</h4>
                        </div>
                        <span class="text-[11px] text-secondary dark:text-slate-400">Click any department to jump directly into its operational station</span>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                        
                        <!-- Phase 1: Yarn & Sourcing -->
                        <div class="bg-surface-container-low/50 dark:bg-slate-850/50 border border-outline-variant/40 dark:border-slate-800 rounded-2xl p-3 flex flex-col gap-2">
                            <div class="flex items-center justify-between">
                                <span class="text-[11px] font-extrabold text-secondary dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                    <span>🧵</span> Phase 1 • Yarn & Sourcing
                                </span>
                                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-variant dark:bg-slate-700 text-secondary dark:text-slate-300">
                                    ${zoneSourcing.reduce((acc, s) => acc + s.count, 0)} queued
                                </span>
                            </div>
                            <div class="grid grid-cols-2 gap-2">
                                ${zoneSourcing.map(renderStagePill).join('')}
                            </div>
                        </div>

                        <!-- Phase 2: Cutting & Prep -->
                        <div class="bg-surface-container-low/50 dark:bg-slate-850/50 border border-outline-variant/40 dark:border-slate-800 rounded-2xl p-3 flex flex-col gap-2">
                            <div class="flex items-center justify-between">
                                <span class="text-[11px] font-extrabold text-secondary dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                    <span>✂️</span> Phase 2 • Prep & Cutting
                                </span>
                                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-variant dark:bg-slate-700 text-secondary dark:text-slate-300">
                                    ${zonePreAssembly.reduce((acc, s) => acc + s.count, 0)} queued
                                </span>
                            </div>
                            <div class="grid grid-cols-3 gap-2">
                                ${zonePreAssembly.map(renderStagePill).join('')}
                            </div>
                        </div>

                        <!-- Phase 3: Assembly & Fulfillment -->
                        <div class="bg-surface-container-low/50 dark:bg-slate-850/50 border border-outline-variant/40 dark:border-slate-800 rounded-2xl p-3 flex flex-col gap-2">
                            <div class="flex items-center justify-between">
                                <span class="text-[11px] font-extrabold text-secondary dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                    <span>🪡</span> Phase 3 • Assembly & Ship
                                </span>
                                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-variant dark:bg-slate-700 text-secondary dark:text-slate-300">
                                    ${zoneAssembly.reduce((acc, s) => acc + s.count, 0)} queued
                                </span>
                            </div>
                            <div class="grid grid-cols-3 gap-2">
                                ${zoneAssembly.map(renderStagePill).join('')}
                            </div>
                        </div>

                    </div>
                </div>

                <!-- Active Floor Queue -->
                <div class="bg-surface-container-lowest dark:bg-slate-900 border border-outline-variant dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col gap-3">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <span class="material-symbols-outlined text-primary text-[18px]">table_rows</span>
                            <h4 class="text-[13px] font-extrabold text-on-surface dark:text-white uppercase tracking-wider">Active Factory Floor Orders</h4>
                        </div>
                        <span class="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-primary/10 dark:bg-primary/20 text-primary dark:text-blue-400">
                            ${activeOrders.length} Running Orders
                        </span>
                    </div>

                    <div class="flex flex-col gap-2.5">
                        ${activeOrders.length === 0 ? `
                            <div class="p-8 text-center text-secondary dark:text-slate-400">
                                <span class="material-symbols-outlined text-[40px] opacity-40 mb-2">precision_manufacturing</span>
                                <p class="text-[14px] font-medium">No active production orders on the floor.</p>
                            </div>
                        ` : activeOrders.map(ord => {
                            const roll = calculateOrderRollup(ord);
                            const isSelected = String(ord.id) === String(activeOrderId);
                            
                            // Calculate delivery urgency
                            let deliveryHtml = '';
                            if (ord.deliveryDate) {
                                const diffDays = Math.ceil((new Date(ord.deliveryDate).getTime() - now) / (1000 * 60 * 60 * 24));
                                if (diffDays < 0) {
                                    deliveryHtml = `<span class="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-error/10 text-error border border-error/20">Overdue by ${Math.abs(diffDays)}d</span>`;
                                } else if (diffDays <= 3) {
                                    deliveryHtml = `<span class="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-orange-500/10 text-orange-500 border border-orange-500/20">Due in ${diffDays}d</span>`;
                                } else {
                                    deliveryHtml = `<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-surface-variant dark:bg-slate-800 text-secondary dark:text-slate-400">Due: ${ord.deliveryDate}</span>`;
                                }
                            }

                            const productsList = Array.isArray(ord.products) && ord.products.length > 0
                                ? ord.products
                                : [{ name: ord.product || 'Apparel Item', workflowType: ord.workflowType || 'default' }];

                            const wfBadgesHtml = productsList.map(p => {
                                const pWf = p.workflowType || ord.workflowType || 'default';
                                const wfInfo = getWorkflowBadgeInfo(pWf);
                                const pWorkflow = getProductWorkflowStages(p, ord.workflowType);
                                const pStageKey = normalizeStageKey(p.status || p.currentStage || pWorkflow[0]);
                                const pStageDef = STAGE_DEFINITIONS[pStageKey] || { label: p.status || pStageKey, icon: 'bolt' };
                                return `
                                    <span class="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-md ${wfInfo.bgColor} ${wfInfo.color} border ${wfInfo.borderColor}">
                                        <span class="material-symbols-outlined text-[11px]">${wfInfo.icon}</span>
                                        ${p.name ? `<span class="truncate max-w-[110px]">${p.name}:</span>` : ''}
                                        <span>${wfInfo.shortLabel || wfInfo.label}</span>
                                        <span class="opacity-40">•</span>
                                        <span class="uppercase tracking-wider font-mono">${pStageDef.shortLabel || pStageDef.label}</span>
                                    </span>
                                `;
                            }).join(' ');

                            return `
                                <div onclick="window.productionRouter.switchOrder('${ord.id}', '${roll.activeStageKey}')"
                                    class="p-3 sm:p-3.5 rounded-2xl border ${isSelected ? 'border-primary ring-2 ring-primary/20 bg-primary/5 dark:bg-primary/10' : 'border-outline-variant/60 dark:border-slate-800 hover:border-primary bg-surface dark:bg-slate-850'} flex flex-col md:flex-row justify-between items-start md:items-center gap-3 cursor-pointer active-scale transition-apple shadow-xs">
                                    
                                    <!-- Order Left Details -->
                                    <div class="min-w-0 flex-1">
                                        <div class="flex items-center gap-2 flex-wrap">
                                            <span class="font-mono text-[12px] font-extrabold text-primary dark:text-blue-400 bg-primary/10 dark:bg-primary/20 px-2 py-0.5 rounded-md uppercase">
                                                #${ord.id}
                                            </span>
                                            <span class="text-[14px] font-extrabold text-on-surface dark:text-white truncate">
                                                ${ord.customerName || ord.customerId || 'Customer'}
                                            </span>
                                            <span class="text-secondary dark:text-slate-500 text-[12px]">•</span>
                                            <span class="text-[12px] font-extrabold text-on-surface dark:text-slate-200">
                                                ${(roll.totalOrderQty || ord.qty || 0).toLocaleString()} pcs
                                            </span>
                                            ${deliveryHtml}
                                            ${roll.isBottleneck ? '<span class="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-error/10 text-error">Bottleneck Risk</span>' : ''}
                                        </div>
                                        
                                        <!-- Product line chips with stage -->
                                        <div class="flex items-center gap-1.5 flex-wrap mt-1.5">
                                            ${wfBadgesHtml}
                                        </div>
                                    </div>

                                    <!-- Right Progress & Action -->
                                    <div class="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-outline-variant/40 dark:border-slate-800">
                                        <div class="flex flex-col items-start md:items-end min-w-[130px]">
                                            <div class="flex items-center gap-1.5">
                                                <span class="material-symbols-outlined text-[15px] ${roll.activeStageDef.color}">${roll.activeStageDef.icon || 'bolt'}</span>
                                                <span class="text-[12px] font-extrabold text-on-surface dark:text-white">${roll.activeStageDef.label}</span>
                                            </div>
                                            <div class="w-32 h-1.5 bg-surface-variant dark:bg-slate-700 rounded-full overflow-hidden mt-1">
                                                <div class="h-full bg-primary rounded-full transition-apple" style="width:${roll.overallPercentage}%"></div>
                                            </div>
                                            <span class="text-[10px] text-secondary dark:text-slate-400 font-mono font-bold mt-0.5">${roll.overallPercentage}% Finished</span>
                                        </div>

                                        <button type="button" class="px-3.5 py-1.5 rounded-xl bg-primary text-white text-[12px] font-bold flex items-center gap-1.5 shrink-0 shadow-xs active-scale hover:bg-primary/90">
                                            <span>Enter Station</span>
                                            <span class="material-symbols-outlined text-[15px]">arrow_forward</span>
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
