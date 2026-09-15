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
    calculateOrderRollup 
} from './domain/workflowEngine.js?v=5.5';
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
            this.renderOrderDropdown();
            this.syncCurrentOrder();
            this.render();

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
            this.activeOrder = found;
        } else {
            this.activeOrder = null;
            this.activeStage = 'overview';
        }
    }

    renderOrderDropdown() {
        const select = document.getElementById('order-select-dropdown');
        if (!select) return;

        const activeOrders = this.orders.filter(o => !['Delivered', 'Closed', 'Archived'].includes(o.status));

        let html = `<option value="" ${!this.activeOrderId ? 'selected' : ''}>🏢 Factory Floor Overview (All Orders)</option>`;
        activeOrders.forEach(ord => {
            const isSelected = String(ord.id) === String(this.activeOrderId);
            html += `
                <option value="${ord.id}" ${isSelected ? 'selected' : ''}>
                    #${ord.id} - ${ord.customerName || ord.customerId} (${ord.qty || 0} pcs)
                </option>
            `;
        });

        select.innerHTML = html;
    }

    getActiveProduct() {
        if (!this.activeOrder) return null;
        if (Array.isArray(this.activeOrder.products) && this.activeOrder.products.length > 0) {
            return this.activeOrder.products[this.activeProductIndex] || this.activeOrder.products[0];
        }
        return {
            name: this.activeOrder.product || 'Standard Garment',
            qty: Number(this.activeOrder.qty) || 0,
            status: this.activeOrder.status || 'Fabric',
            workflowType: this.activeOrder.workflowType || 'default',
            sizes: this.activeOrder.stageData?.cutting?.cutQuantitiesBySize || {}
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

        container.innerHTML = `
            <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 shadow-sm flex flex-col gap-3 animate-fade-in">
                
                <!-- Order Core Metadata Row -->
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div class="flex items-center gap-3 flex-wrap">
                        <span class="px-2.5 py-1 rounded-lg bg-primary/10 text-primary font-mono text-[13px] font-extrabold uppercase">
                            ${ord.id}
                        </span>
                        <span class="text-[16px] font-extrabold text-on-surface">
                            ${ord.customerName || ord.customerId || 'Customer'}
                        </span>
                        <span class="text-secondary text-[13px]">•</span>
                        <span class="text-[13px] text-secondary font-medium">
                            Total: <strong>${roll.totalOrderQty.toLocaleString()} pcs</strong>
                        </span>
                        <span class="text-secondary text-[13px]">•</span>
                        <span class="text-[13px] text-secondary font-medium">
                            Promised Delivery: <strong>${ord.deliveryDate || 'Not set'}</strong>
                        </span>
                        ${roll.isBottleneck ? '<span class="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-error/10 text-error">Bottleneck Risk</span>' : ''}
                    </div>

                    <!-- Progress Rollup -->
                    <div class="flex items-center gap-3 shrink-0">
                        <div class="flex flex-col items-end">
                            <div class="flex items-center gap-1.5">
                                <span class="text-[12px] font-bold text-secondary">Order Rollup:</span>
                                <span class="text-[13px] font-extrabold text-primary">${roll.overallPercentage}%</span>
                            </div>
                            <div class="w-28 h-1.5 bg-surface-variant rounded-full overflow-hidden mt-1">
                                <div class="h-full bg-primary rounded-full transition-apple" style="width: ${roll.overallPercentage}%"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Product Line Switcher (If Order has products) -->
                ${products.length > 1 ? `
                    <div class="pt-2 border-t border-outline-variant/40 flex items-center gap-2 flex-wrap">
                        <span class="text-[12px] font-bold text-secondary shrink-0">Product Lines:</span>
                        <div class="flex items-center gap-1.5 overflow-x-auto pb-1">
                            ${products.map((p, idx) => `
                                <button onclick="window.productionRouter.switchProduct(${idx})" 
                                    class="px-3 py-1 rounded-xl text-[12px] font-bold active-scale transition-apple ${idx === this.activeProductIndex ? 'bg-on-surface text-surface-lowest shadow-xs' : 'bg-surface-container text-on-surface hover:bg-surface-variant'}">
                                    ${p.name} (${p.qty} pcs)
                                </button>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <!-- Active Workflow Route Pipeline Visualization -->
                <div class="pt-2 border-t border-outline-variant/40 flex items-center gap-2 overflow-x-auto pb-1 text-[11px] font-semibold text-secondary">
                    <span class="font-bold text-on-surface shrink-0">Workflow Route:</span>
                    <div class="flex items-center gap-1.5 shrink-0">
                        ${activeWorkflow.map((stKey, idx) => {
                            const def = STAGE_DEFINITIONS[stKey] || { label: stKey };
                            const isCurrent = stKey === this.activeStage;
                            const isPast = activeWorkflow.indexOf(this.activeStage) > idx;

                            return `
                                <div class="flex items-center gap-1">
                                    <span class="px-2 py-0.5 rounded-md ${isCurrent ? 'bg-primary text-white font-bold' : isPast ? 'bg-[#34C759]/15 text-[#34C759] font-bold' : 'bg-surface-container text-secondary'}">
                                        ${def.label}
                                    </span>
                                    ${idx < activeWorkflow.length - 1 ? '<span class="material-symbols-outlined text-[12px] text-outline">chevron_right</span>' : ''}
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
        this.renderOrderDropdown();
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
        const stageData = this.activeOrder.stageData;

        container.innerHTML = workspace.render(this.activeOrder, activeProduct, stageData);
    }

    switchOrder(orderId, preferredStage = null) {
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
            const roll = calculateOrderRollup(this.activeOrder);
            this.activeStage = roll.activeStageKey || 'cutting';
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
            
            // Hydrate stageData
            const currentStageData = hydrateStageData(this.activeOrder.stageData);
            currentStageData[currentStageKey] = {
                ...currentStageData[currentStageKey],
                ...extractedData
            };
            this.activeOrder.stageData = currentStageData;

            // Determine workflow progression
            const activeProd = this.getActiveProduct();
            const workflow = getProductWorkflowStages(activeProd, this.activeOrder.workflowType);
            let nextStageKey = null;

            if (shouldAdvance) {
                const currentIdx = workflow.indexOf(currentStageKey);
                if (currentIdx >= 0 && currentIdx < workflow.length - 1) {
                    nextStageKey = workflow[currentIdx + 1];
                    
                    // Update active product's status
                    const nextDef = STAGE_DEFINITIONS[nextStageKey];
                    if (nextDef && activeProd) {
                        activeProd.status = nextDef.label;
                    }
                }
            }

            if (explicitStatus) {
                this.activeOrder.status = explicitStatus;
                if (activeProd) activeProd.status = explicitStatus;
            } else {
                // Roll up status
                const roll = calculateOrderRollup(this.activeOrder);
                if (roll.overallPercentage === 100) {
                    this.activeOrder.status = 'Dispatched';
                } else {
                    this.activeOrder.status = roll.activeStageDef.label;
                }
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
                        ? `Saved & released to ${STAGE_DEFINITIONS[nextStageKey]?.label || nextStageKey}!` 
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
        get activeOrder() { return app.activeOrder; }
    };

    app.init();
});
