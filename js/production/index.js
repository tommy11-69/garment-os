/**
 * Garment OS — Production Single Page Application Router & Hero Hub
 * 
 * Orchestrates 11 dedicated operational workspaces:
 * 0. Overview | 1. Procurement | 2. Winding* | 3. Knitting* | 4. Dyeing*
 * 5. Fabric | 6. Cutting | 7. Print/Wash | 8. Stitching | 9. Packing | 10. Dispatch
 * (* Full Vertical Integration workflow only)
 */

import { api } from '../services/api.js?v=5.5';
import { 
    STAGE_DEFINITIONS, 
    STAGE_KEYS, 
    getProductWorkflowStages, 
    normalizeStageKey, 
    calculateOrderRollup,
    getWorkflowBadgeInfo
} from './domain/workflowEngine.js?v=6.0';
import { hydrateStageData } from './domain/stageSchemas.js?v=5.5';

import { OverviewWorkspace }      from './stages/OverviewWorkspace.js?v=5.5';
import { ProcurementWorkspace }   from './stages/ProcurementWorkspace.js?v=5.5';
import { WindingWorkspace }       from './stages/WindingWorkspace.js?v=6.0';
import { KnittingWorkspace }      from './stages/KnittingWorkspace.js?v=6.0';
import { DyeingWorkspace }        from './stages/DyeingWorkspace.js?v=6.0';
import { FabricWorkspace }        from './stages/FabricWorkspace.js?v=5.5';
import { CuttingWorkspace }       from './stages/CuttingWorkspace.js?v=5.5';
import { PrintWashWorkspace }     from './stages/PrintWashWorkspace.js?v=5.5';
import { StitchingWorkspace }     from './stages/StitchingWorkspace.js?v=5.5';
import { PackingWorkspace }       from './stages/PackingWorkspace.js?v=5.5';
import { DispatchWorkspace }      from './stages/DispatchWorkspace.js?v=5.5';

function escapeHtml(str) {
    return String(str || '').replace(/[&<>'"]/g, tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
    }[tag] || tag));
}

class ProductionApp {
    constructor() {
        this.orders = [];
        this.activeOrderId = null;
        this.activeOrder = null;
        this.activeStage = 'overview';
        this.activeProductIndex = 0;
        this.isLoading = false;

        this.workspaces = {
            overview:     OverviewWorkspace,
            procurement:  ProcurementWorkspace,
            winding:      WindingWorkspace,
            knitting:     KnittingWorkspace,
            dyeing:       DyeingWorkspace,
            fabric:       FabricWorkspace,
            cutting:      CuttingWorkspace,
            print_wash:   PrintWashWorkspace,
            stitching:    StitchingWorkspace,
            packing:      PackingWorkspace,
            dispatch:     DispatchWorkspace
        };
    }

    async init() {
        try {
            this.readQueryParams();
            await this.loadOrders();
            this.renderOrderTrigger();
            this.syncCurrentOrder();
            if (this.activeOrderId && (!new URLSearchParams(window.location.search).get('stage') || this.activeStage === 'overview')) {
                const activeProd = this.getActiveProduct();
                if (activeProd) {
                    const workflow = getProductWorkflowStages(activeProd, this.activeOrder?.workflowType);
                    const prodStageKey = normalizeStageKey(activeProd.status || activeProd.currentStage || workflow[0]);
                    this.activeStage = workflow.includes(prodStageKey) ? prodStageKey : (workflow[0] || 'procurement');
                }
            }
            this.render();

            // Wire instant search input for order picker modal
            const searchInput = document.getElementById('order-picker-search-input');
            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    this.renderOrderPickerList(e.target.value);
                });
            }

            // Keyboard shortcut: ESC to close order picker modal
            window.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.closeOrderPicker();
                }
            });

            window.addEventListener('popstate', () => {
                this.readQueryParams();
                this.syncCurrentOrder();
                this.render();
            });
        } catch (err) {
            console.error('[ProductionApp] Failed to initialize:', err);
            const container = document.getElementById('production-workspace-container');
            if (container) {
                container.innerHTML = `
                    <div class="p-8 text-center text-error">
                        <span class="material-symbols-outlined text-[40px] mb-2">error</span>
                        <p class="text-[16px] font-bold">Failed to load Production Floor</p>
                        <p class="text-[13px] text-secondary mt-1">${err.message}</p>
                    </div>
                `;
            }
        }
    }

    readQueryParams() {
        const params = new URLSearchParams(window.location.search);
        this.activeOrderId = params.get('orderId') || null;
        this.activeStage = params.get('stage') || 'overview';
        this.activeProductIndex = parseInt(params.get('productId') || '0', 10);
    }

    updateQueryParams() {
        const params = new URLSearchParams();
        if (this.activeOrderId) params.set('orderId', this.activeOrderId);
        if (this.activeStage && this.activeStage !== 'overview') params.set('stage', this.activeStage);
        if (this.activeProductIndex > 0) params.set('productId', this.activeProductIndex);

        const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
        window.history.pushState({}, '', newUrl);
    }

    async loadOrders() {
        const res = await api.getOrders();
        this.orders = Array.isArray(res) ? res : (res?.data || []);
    }

    syncCurrentOrder() {
        if (!this.activeOrderId) {
            this.activeOrder = null;
            return;
        }

        const found = this.orders.find(o => String(o.id) === String(this.activeOrderId));
        if (found) {
            // Ensure stageData is hydrated
            found.stageData = hydrateStageData(found.stageData);
            if (Array.isArray(found.products)) {
                found.products.forEach(p => {
                    if (!p.stageData) p.stageData = {};
                });
            }
            this.activeOrder = found;
        } else {
            this.activeOrder = null;
            this.activeStage = 'overview';
        }
    }

    renderOrderTrigger() {
        const label = document.getElementById('order-picker-trigger-label');
        const icon = document.getElementById('order-picker-trigger-icon');
        if (!label) return;

        if (this.activeOrder) {
            const ord = this.activeOrder;
            const buyer = ord.customerName || ord.customerId || 'Customer';
            const pcs = ord.qty || 0;
            label.textContent = `#${ord.id} • ${buyer} (${pcs} pcs)`;
            if (icon) icon.textContent = 'inventory_2';
        } else {
            label.textContent = '🏢 Floor Overview (All Orders)';
            if (icon) icon.textContent = 'storefront';
        }
    }

    openOrderPicker() {
        const modal = document.getElementById('order-picker-modal');
        const panel = document.getElementById('order-picker-modal-panel');
        const input = document.getElementById('order-picker-search-input');
        if (!modal) return;

        modal.classList.remove('opacity-0', 'pointer-events-none');
        if (panel) {
            panel.classList.remove('scale-95');
            panel.classList.add('scale-100');
        }

        if (input) {
            input.value = '';
            setTimeout(() => input.focus(), 50);
        }

        this.renderOrderPickerList('');
    }

    closeOrderPicker() {
        const modal = document.getElementById('order-picker-modal');
        const panel = document.getElementById('order-picker-modal-panel');
        if (!modal) return;

        modal.classList.add('opacity-0', 'pointer-events-none');
        if (panel) {
            panel.classList.remove('scale-100');
            panel.classList.add('scale-95');
        }
    }

    renderOrderPickerList(filterText = '') {
        const list = document.getElementById('order-picker-list');
        if (!list) return;

        const q = (filterText || '').trim().toLowerCase();
        const activeOrders = this.orders.filter(o => !['Delivered', 'Closed', 'Archived'].includes(o.status));

        const filtered = activeOrders.filter(o => {
            if (!q) return true;
            const idMatch = String(o.id || '').toLowerCase().includes(q);
            const custMatch = String(o.customerName || o.customerId || '').toLowerCase().includes(q);
            const prodMatch = String(o.product || '').toLowerCase().includes(q);
            const wfMatch = String(o.workflowType || '').toLowerCase().includes(q);
            return idMatch || custMatch || prodMatch || wfMatch;
        });

        const isOverviewSelected = !this.activeOrderId;

        let html = `
            <!-- Overview Default Option -->
            <div onclick="window.productionRouter.switchOrder('', 'overview'); window.productionRouter.closeOrderPicker();"
                class="p-3 rounded-2xl border ${isOverviewSelected ? 'border-primary bg-primary/10 text-primary' : 'border-outline-variant/60 dark:border-slate-800 hover:border-primary bg-surface dark:bg-slate-850'} flex items-center justify-between cursor-pointer active-scale transition-apple">
                <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-xl ${isOverviewSelected ? 'bg-primary text-white' : 'bg-surface-variant dark:bg-slate-700 text-secondary dark:text-slate-300'} flex items-center justify-center shrink-0">
                        <span class="material-symbols-outlined text-[20px]">storefront</span>
                    </div>
                    <div>
                        <div class="text-[14px] font-extrabold text-on-surface dark:text-white">Factory Floor Overview</div>
                        <div class="text-[12px] text-secondary dark:text-slate-400">All running orders, department loads & bottleneck radar</div>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-surface-variant dark:bg-slate-700 text-secondary dark:text-slate-300">${activeOrders.length} Active</span>
                    <span class="material-symbols-outlined text-[18px] text-secondary">chevron_right</span>
                </div>
            </div>
            
            <div class="px-1 pt-2 pb-1 text-[11px] font-bold text-secondary dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Active Production Orders (${filtered.length})</span>
            </div>
        `;

        if (filtered.length === 0) {
            html += `
                <div class="p-6 text-center text-secondary dark:text-slate-400">
                    <span class="material-symbols-outlined text-[32px] opacity-40 mb-1">search_off</span>
                    <p class="text-[13px] font-medium">No active orders match "${escapeHtml(filterText)}"</p>
                </div>
            `;
        } else {
            html += filtered.map(ord => {
                const isSelected = String(ord.id) === String(this.activeOrderId);
                const roll = calculateOrderRollup(ord);
                const wfKey = ord.workflowType || 'default';
                const wfInfo = getWorkflowBadgeInfo(wfKey);

                return `
                    <div onclick="window.productionRouter.switchOrder('${ord.id}', '${roll.activeStageKey}'); window.productionRouter.closeOrderPicker();"
                        class="p-3 rounded-2xl border ${isSelected ? 'border-primary ring-2 ring-primary/20 bg-primary/5 dark:bg-primary/10' : 'border-outline-variant/60 dark:border-slate-800 hover:border-primary bg-surface dark:bg-slate-850'} flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 cursor-pointer active-scale transition-apple">
                        
                        <div class="min-w-0 flex-1">
                            <div class="flex items-center gap-2 flex-wrap">
                                <span class="font-mono text-[12px] font-extrabold text-primary bg-primary/10 dark:bg-primary/20 px-2 py-0.5 rounded-md uppercase">
                                    #${ord.id}
                                </span>
                                <span class="text-[13px] font-bold text-on-surface dark:text-white truncate">
                                    ${ord.customerName || ord.customerId || 'Customer'}
                                </span>
                                <span class="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-md ${wfInfo.bgColor} ${wfInfo.color} border ${wfInfo.borderColor}">
                                    <span class="material-symbols-outlined text-[11px]">${wfInfo.icon}</span>
                                    ${wfInfo.shortLabel || wfInfo.label}
                                </span>
                            </div>
                            
                            <div class="text-[12px] text-secondary dark:text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                                <span>${ord.product || 'Garment Order'}</span>
                                <span>•</span>
                                <strong class="text-on-surface dark:text-slate-200">${(ord.qty || 0).toLocaleString()} pcs</strong>
                                <span>•</span>
                                <span>Due: ${ord.deliveryDate || 'Flexible'}</span>
                            </div>
                        </div>

                        <div class="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end shrink-0 pt-1 sm:pt-0">
                            <div class="flex flex-col items-start sm:items-end">
                                <span class="text-[11px] font-bold text-primary flex items-center gap-1">
                                    <span class="material-symbols-outlined text-[13px]">${roll.activeStageDef?.icon || 'bolt'}</span>
                                    ${roll.activeStageDef?.label || 'In Progress'}
                                </span>
                                <span class="text-[10px] text-secondary dark:text-slate-400 font-mono font-bold">${roll.overallPercentage}% ready</span>
                            </div>
                            <span class="material-symbols-outlined text-[18px] text-secondary">arrow_forward</span>
                        </div>
                    </div>
                `;
            }).join('');
        }

        list.innerHTML = html;
    }

    getActiveProduct() {
        if (!this.activeOrder) return null;
        if (Array.isArray(this.activeOrder.products) && this.activeOrder.products.length > 0) {
            const prod = this.activeOrder.products[this.activeProductIndex] || this.activeOrder.products[0];
            if (prod && !prod.stageData) {
                prod.stageData = {};
            }
            return prod;
        }
        return {
            name: this.activeOrder.product || 'Standard Garment',
            qty: Number(this.activeOrder.qty) || 0,
            status: this.activeOrder.status || 'Fabric',
            workflowType: this.activeOrder.workflowType || 'default',
            sizes: this.activeOrder.stageData?.cutting?.cutQuantitiesBySize || {},
            stageData: this.activeOrder.stageData || {}
        };
    }

    renderOrderContextStrip() {
        const container = document.getElementById('order-context-strip');
        if (!container) return;

        if (!this.activeOrder || this.activeStage === 'overview') {
            container.classList.add('hidden');
            container.innerHTML = '';
            return;
        }

        container.classList.remove('hidden');

        const ord = this.activeOrder;
        const roll = calculateOrderRollup(ord);
        const products = Array.isArray(ord.products) && ord.products.length > 0 ? ord.products : [this.getActiveProduct()];
        const activeProd = this.getActiveProduct();
        const activeWorkflow = getProductWorkflowStages(activeProd, ord.workflowType);
        const activeWfKey = activeProd.workflowType || ord.workflowType || 'default';
        const activeWfInfo = getWorkflowBadgeInfo(activeWfKey);

        container.innerHTML = `
            <div class="bg-surface-container-lowest dark:bg-slate-900 border border-outline-variant dark:border-slate-800 rounded-2xl p-3 sm:p-3.5 shadow-sm flex flex-col gap-2.5 animate-fade-in">
                
                <!-- Order Core Metadata Row -->
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5">
                    <div class="flex items-center gap-2.5 flex-wrap">
                        <span class="px-2.5 py-0.5 rounded-lg bg-primary/10 dark:bg-primary/20 text-primary dark:text-blue-400 font-mono text-[12px] font-extrabold uppercase">
                            #${ord.id}
                        </span>
                        <span class="text-[15px] font-extrabold text-on-surface dark:text-white">
                            ${ord.customerName || ord.customerId || 'Customer'}
                        </span>
                        <span class="text-secondary dark:text-slate-500 text-[12px]">•</span>
                        <span class="text-[12px] text-secondary dark:text-slate-400 font-medium">
                            Total: <strong class="text-on-surface dark:text-white">${roll.totalOrderQty.toLocaleString()} pcs</strong>
                        </span>
                        <span class="text-secondary dark:text-slate-500 text-[12px]">•</span>
                        <span class="text-[12px] text-secondary dark:text-slate-400 font-medium">
                            Due: <strong class="text-on-surface dark:text-white">${ord.deliveryDate || 'Not set'}</strong>
                        </span>
                        ${roll.isBottleneck ? '<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-error/10 text-error">Bottleneck Risk</span>' : ''}
                    </div>

                    <!-- Progress Rollup -->
                    <div class="flex items-center gap-3 shrink-0">
                        <div class="flex flex-col items-end">
                            <div class="flex items-center gap-1.5">
                                <span class="text-[11px] font-bold text-secondary dark:text-slate-400">Order Rollup:</span>
                                <span class="text-[12px] font-extrabold text-primary dark:text-blue-400">${roll.overallPercentage}%</span>
                            </div>
                            <div class="w-24 sm:w-28 h-1.5 bg-surface-variant dark:bg-slate-700 rounded-full overflow-hidden mt-0.5">
                                <div class="h-full bg-primary rounded-full transition-apple" style="width: ${roll.overallPercentage}%"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Product Line Switcher (If Order has products) -->
                ${products.length > 1 ? `
                    <div class="pt-2 border-t border-outline-variant/40 dark:border-slate-800/80 flex items-center gap-2 flex-wrap">
                        <span class="text-[11px] font-bold text-secondary dark:text-slate-400 shrink-0">Product Lines:</span>
                        <div class="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                            ${products.map((p, idx) => {
                                const pWf = p.workflowType || ord.workflowType || 'default';
                                const wfInfo = getWorkflowBadgeInfo(pWf);
                                const isAct = idx === this.activeProductIndex;
                                const pWorkflow = getProductWorkflowStages(p, ord.workflowType);
                                const pStageKey = normalizeStageKey(p.status || p.currentStage || pWorkflow[0]);
                                const pStageDef = STAGE_DEFINITIONS[pStageKey] || { label: p.status || pStageKey, icon: 'bolt', shortLabel: pStageKey };
                                return `
                                    <button type="button" onclick="window.productionRouter.switchProduct(${idx})" 
                                        class="px-2.5 py-1 rounded-xl text-[11px] font-bold active-scale transition-apple flex items-center gap-1.5 ${isAct ? 'bg-primary text-white shadow-xs ring-2 ring-primary/30' : 'bg-surface-container dark:bg-slate-800 text-on-surface dark:text-slate-200 hover:bg-surface-variant dark:hover:bg-slate-700'}">
                                        <span>${p.name || `Product #${idx+1}`}</span>
                                        <span class="text-[10px] opacity-75">(${p.qty} pcs)</span>
                                        <span class="px-1.5 py-0.2 rounded text-[9px] font-extrabold ${isAct ? 'bg-white/20 text-white' : `${wfInfo.bgColor} ${wfInfo.color}`}">
                                            ${wfInfo.shortLabel || wfInfo.label}
                                        </span>
                                        <span class="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md text-[9px] font-black ${isAct ? 'bg-white text-primary' : 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-blue-400'}">
                                            <span class="material-symbols-outlined text-[10px]">${pStageDef.icon || 'bolt'}</span>
                                            <span>${pStageDef.shortLabel || pStageDef.label}</span>
                                        </span>
                                    </button>
                                `;
                            }).join('')}
                        </div>
                    </div>
                ` : ''}

                <!-- Active Workflow Route Pipeline Visualization -->
                <div class="pt-2 border-t border-outline-variant/40 dark:border-slate-800/80 flex items-center gap-2 overflow-x-auto pb-0.5 text-[11px] font-semibold text-secondary dark:text-slate-400">
                    <span class="font-bold text-on-surface dark:text-slate-200 shrink-0">Workflow Route:</span>
                    <span class="inline-flex items-center gap-1 text-[10px] font-extrabold ${activeWfInfo.color} ${activeWfInfo.bgColor} px-2 py-0.5 rounded-md border ${activeWfInfo.borderColor} shrink-0">
                        <span class="material-symbols-outlined text-[12px]">${activeWfInfo.icon}</span>
                        ${activeWfInfo.label}
                    </span>
                    <span class="text-secondary/50 dark:text-slate-600">|</span>
                    <div class="flex items-center gap-1 shrink-0">
                        ${activeWorkflow.map((stKey, idx) => {
                            const def = STAGE_DEFINITIONS[stKey] || { label: stKey };
                            const isCurrent = stKey === this.activeStage;
                            const isPast = activeWorkflow.indexOf(this.activeStage) > idx;

                            return `
                                <div class="flex items-center gap-1">
                                    <span class="px-2 py-0.5 rounded-md text-[10px] ${isCurrent ? 'bg-primary text-white font-bold ring-2 ring-primary/20' : isPast ? 'bg-[#34C759]/15 text-[#34C759] font-bold' : 'bg-surface-container dark:bg-slate-800 text-secondary dark:text-slate-400'}">
                                        ${def.label}
                                    </span>
                                    ${idx < activeWorkflow.length - 1 ? '<span class="material-symbols-outlined text-[11px] text-outline dark:text-slate-600">chevron_right</span>' : ''}
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>

            </div>
        `;
    }

    renderStageNavBar() {
        const container = document.getElementById('stage-nav-bar');
        if (!container) return;

        // Always show Overview first
        const overviewDef = STAGE_DEFINITIONS.overview || { label: 'Overview', icon: 'dashboard', key: 'overview' };

        // Determine which workflow stages to show:
        // If an active order/product is loaded, show only that product's workflow stages.
        // Otherwise fall back to the standard default route for the nav skeleton.
        let workflowStageKeys = [];
        if (this.activeOrder) {
            const activeProd  = this.getActiveProduct();
            workflowStageKeys = getProductWorkflowStages(activeProd, this.activeOrder.workflowType);
        } else {
            // No order selected — show standard CMT skeleton
            workflowStageKeys = ['procurement', 'fabric', 'cutting', 'print_wash', 'stitching', 'packing', 'dispatch'];
        }

        // Build nav items: Overview + each stage in the active workflow route
        const navItems = [
            { key: 'overview', label: 'Overview', icon: 'dashboard' },
            ...workflowStageKeys.map((key, i) => {
                const def = STAGE_DEFINITIONS[key] || { label: key, icon: 'circle' };
                // Derive the icon from material-symbols name stored in def
                const icon = def.icon || 'radio_button_unchecked';
                return { key, label: `${i + 1}. ${def.shortLabel || def.label}`, icon };
            })
        ];

        container.innerHTML = navItems.map(s => {
            const isActive = s.key === this.activeStage;
            const def      = STAGE_DEFINITIONS[s.key] || {};
            return `
                <button type="button"
                    onclick="window.productionRouter.switchStage('${s.key}')"
                    class="stage-nav-pill ${isActive ? 'active' : 'inactive'} active-scale">
                    <span class="material-symbols-outlined text-[18px]">${s.icon}</span>
                    <span>${s.label}</span>
                </button>
            `;
        }).join('');
    }

    render() {
        this.renderOrderTrigger();
        this.renderOrderContextStrip();
        this.renderStageNavBar();

        const container = document.getElementById('production-workspace-container');
        if (!container) return;

        if (this.activeStage === 'overview' || !this.activeOrder) {
            container.innerHTML = OverviewWorkspace.render(
                this.orders, 
                this.activeOrderId, 
                (ordId, stg) => this.switchOrder(ordId, stg),
                (stg) => this.switchStage(stg)
            );
            return;
        }

        const workspace = this.workspaces[this.activeStage];
        if (!workspace) {
            container.innerHTML = `
                <div class="p-8 text-center text-secondary">
                    <p class="text-[14px]">Workspace for <strong>${this.activeStage}</strong> not found.</p>
                </div>
            `;
            return;
        }

        const activeProduct = this.getActiveProduct();
        if (activeProduct && !activeProduct.stageData) {
            activeProduct.stageData = {};
        }

        // Deep merge order-level stageData with activeProduct's stageData for isolated stage execution
        const effectiveStageData = {
            ...(this.activeOrder.stageData || {}),
            ...((activeProduct && activeProduct.stageData) || {})
        };

        container.innerHTML = workspace.render(this.activeOrder, activeProduct, effectiveStageData);
    }

    switchOrder(orderId, preferredStage = null) {
        this.closeOrderPicker();
        if (!orderId) {
            this.activeOrderId = null;
            this.activeOrder = null;
            this.activeStage = 'overview';
            this.activeProductIndex = 0;
            this.updateQueryParams();
            this.render();
            return;
        }

        this.activeOrderId = orderId;
        this.syncCurrentOrder();
        this.activeProductIndex = 0;

        if (preferredStage) {
            this.activeStage = preferredStage;
        } else if (this.activeStage === 'overview' && this.activeOrder) {
            const activeProd = this.getActiveProduct();
            if (activeProd) {
                const workflow = getProductWorkflowStages(activeProd, this.activeOrder.workflowType);
                const prodStageKey = normalizeStageKey(activeProd.status || activeProd.currentStage || workflow[0]);
                this.activeStage = workflow.includes(prodStageKey) ? prodStageKey : (workflow[0] || 'procurement');
            } else {
                const roll = calculateOrderRollup(this.activeOrder);
                this.activeStage = roll.activeStageKey || 'cutting';
            }
        }

        this.updateQueryParams();
        this.render();
    }

    switchStage(stageKey) {
        this.activeStage = stageKey;

        // If switching to a floor workspace without an active order, pick the first active order
        if (stageKey !== 'overview' && !this.activeOrderId) {
            const firstActive = this.orders.find(o => !['Delivered', 'Closed', 'Archived'].includes(o.status));
            if (firstActive) {
                this.activeOrderId = firstActive.id;
                this.syncCurrentOrder();
            } else {
                if (window.showToast) window.showToast('Please select an active order first.', 'warning');
                this.activeStage = 'overview';
            }
        }

        this.updateQueryParams();
        this.render();
    }

    switchProduct(productIndex) {
        this.activeProductIndex = productIndex;
        const activeProd = this.getActiveProduct();
        if (activeProd) {
            const workflow = getProductWorkflowStages(activeProd, this.activeOrder?.workflowType);
            const prodStageKey = normalizeStageKey(activeProd.status || activeProd.currentStage || workflow[0]);
            this.activeStage = workflow.includes(prodStageKey) ? prodStageKey : (workflow[0] || 'procurement');
        }
        this.updateQueryParams();
        this.render();
    }

    async saveCurrentStage(shouldAdvance = false, explicitStatus = null) {
        if (!this.activeOrder) return;

        const currentStageKey = this.activeStage;
        const workspace = this.workspaces[currentStageKey];
        if (!workspace || typeof workspace.extractFormData !== 'function') {
            return;
        }

        try {
            const extractedData = workspace.extractFormData();
            const activeProd = this.getActiveProduct();

            // 1. Isolate and save data directly into activeProduct.stageData
            if (activeProd) {
                if (!activeProd.stageData) activeProd.stageData = {};
                const currentProdStageData = hydrateStageData(activeProd.stageData);
                activeProd.stageData = {
                    ...currentProdStageData,
                    [currentStageKey]: {
                        ...(currentProdStageData[currentStageKey] || {}),
                        ...extractedData
                    }
                };
            }

            // 2. Also keep this.activeOrder.stageData synchronized for backward compatibility
            const currentOrderStageData = hydrateStageData(this.activeOrder.stageData);
            currentOrderStageData[currentStageKey] = {
                ...(currentOrderStageData[currentStageKey] || {}),
                ...extractedData
            };
            this.activeOrder.stageData = currentOrderStageData;

            // 3. Ensure the active product in this.activeOrder.products array has updated stageData
            if (Array.isArray(this.activeOrder.products) && this.activeOrder.products[this.activeProductIndex]) {
                this.activeOrder.products[this.activeProductIndex] = {
                    ...this.activeOrder.products[this.activeProductIndex],
                    stageData: activeProd ? activeProd.stageData : {}
                };
            }

            // 4. Advance only this active product along its own workflow
            const workflow = getProductWorkflowStages(activeProd, this.activeOrder.workflowType);
            let nextStageKey = null;

            if (shouldAdvance) {
                const currentIdx = workflow.indexOf(currentStageKey);
                if (currentIdx >= 0 && currentIdx < workflow.length - 1) {
                    nextStageKey = workflow[currentIdx + 1];
                    
                    const nextDef = STAGE_DEFINITIONS[nextStageKey];
                    if (nextDef && activeProd) {
                        activeProd.status = nextDef.label;
                        activeProd.currentStage = nextStageKey;
                        if (Array.isArray(this.activeOrder.products) && this.activeOrder.products[this.activeProductIndex]) {
                            this.activeOrder.products[this.activeProductIndex].status = nextDef.label;
                            this.activeOrder.products[this.activeProductIndex].currentStage = nextStageKey;
                        }
                    }
                } else if (currentIdx === workflow.length - 1) {
                    // Final stage reached for this product
                    if (activeProd) {
                        activeProd.status = 'Completed';
                        activeProd.currentStage = 'dispatch';
                        if (Array.isArray(this.activeOrder.products) && this.activeOrder.products[this.activeProductIndex]) {
                            this.activeOrder.products[this.activeProductIndex].status = 'Completed';
                            this.activeOrder.products[this.activeProductIndex].currentStage = 'dispatch';
                        }
                    }
                }
            }

            // 5. Update status
            if (explicitStatus) {
                if (activeProd) {
                    activeProd.status = explicitStatus;
                    activeProd.currentStage = normalizeStageKey(explicitStatus);
                    if (Array.isArray(this.activeOrder.products) && this.activeOrder.products[this.activeProductIndex]) {
                        this.activeOrder.products[this.activeProductIndex].status = explicitStatus;
                        this.activeOrder.products[this.activeProductIndex].currentStage = normalizeStageKey(explicitStatus);
                    }
                }
                this.activeOrder.status = explicitStatus;
            } else {
                // Roll up status across all products
                const roll = calculateOrderRollup(this.activeOrder);
                if (roll.overallPercentage === 100) {
                    this.activeOrder.status = 'Dispatched';
                } else {
                    this.activeOrder.status = roll.activeStageDef.label;
                }
            }

            // Sync with lineItems if lineItems exists
            if (Array.isArray(this.activeOrder.lineItems) && this.activeOrder.lineItems[this.activeProductIndex]) {
                this.activeOrder.lineItems[this.activeProductIndex] = {
                    ...this.activeOrder.lineItems[this.activeProductIndex],
                    status: activeProd.status,
                    currentStage: activeProd.currentStage,
                    stageData: activeProd.stageData
                };
            }

            // Save to Backend API
            const payload = {
                stageData: this.activeOrder.stageData,
                status: this.activeOrder.status,
                products: this.activeOrder.products || [activeProd]
            };

            await api.updateOrder(this.activeOrder.id, payload);

            // Update in local cache
            const idx = this.orders.findIndex(o => String(o.id) === String(this.activeOrder.id));
            if (idx !== -1) {
                this.orders[idx] = { ...this.orders[idx], ...this.activeOrder };
            }

            if (window.showToast) {
                window.showToast(
                    shouldAdvance && nextStageKey 
                        ? `[${activeProd?.name || 'Product'}] Saved & released to ${STAGE_DEFINITIONS[nextStageKey]?.label || nextStageKey}!` 
                        : 'Stage progress saved successfully!', 
                    'success'
                );
            }

            if (shouldAdvance && nextStageKey) {
                this.switchStage(nextStageKey);
            } else {
                this.render();
            }

        } catch (err) {
            console.error('[ProductionApp] Failed to save stage:', err);
            if (window.showToast) window.showToast(`Error saving: ${err.message}`, 'error');
        }
    }
}

// Instantiate and attach router to window
document.addEventListener('DOMContentLoaded', () => {
    const app = new ProductionApp();
    window.productionRouter = {
        switchOrder: (ordId, stg) => app.switchOrder(ordId, stg),
        switchStage: (stg) => app.switchStage(stg),
        switchProduct: (idx) => app.switchProduct(idx),
        saveCurrentStage: (shouldAdvance, explicitStatus) => app.saveCurrentStage(shouldAdvance, explicitStatus),
        openOrderPicker: () => app.openOrderPicker(),
        closeOrderPicker: () => app.closeOrderPicker(),
        renderOrderPickerList: (txt) => app.renderOrderPickerList(txt),
        get activeOrder() { return app.activeOrder; }
    };

    app.init();
});
