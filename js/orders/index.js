import { api } from '../services/api.js?v=5.2';
import { renderers } from '../renderers.js?v=5.2';
import { getOrderSheetsHTML, getOrderDetailsHeader, getOrderDetailsContent, getOrdersAnalyticsHTML } from './templates.js?v=5.2';
import { calculateOrderRollup, STAGE_DEFINITIONS, normalizeStageKey, getProductWorkflowStages } from '../production/domain/workflowEngine.js?v=5.5';

let currentOrders = [];
let activeOrder = null;
let currentFilter = 'active';
let currentStageFilter = 'all';
let currentUrgencyFilter = 'all';
let currentSortKey = 'urgency';
let currentSearchQuery = '';
let currentViewMode = 'list';
let selectedOrderIds = new Set();


document.addEventListener('DOMContentLoaded', async () => {
    // 1. Render Sheets
    const sheetsContainer = document.getElementById('sheets-container');
    if (sheetsContainer) {
        try {
            sheetsContainer.innerHTML = await getOrderSheetsHTML();
            sheetsContainer.querySelectorAll('.bottom-sheet-overlay, .bottom-sheet-content').forEach((sheetPart) => {
                sheetPart.classList.remove('active');
            });
            document.body.style.overflow = '';
        } catch (e) {
            console.error("Failed to render order sheets:", e);
        }
    }
    
    // 2. Load Data
    try {
        await loadOrders();
    } catch (e) {
        console.error("Failed to load orders:", e);
    }

    // 3. Bind search input
    document.getElementById('orders-search-input')?.addEventListener('input', (e) => {
        currentSearchQuery = e.target.value.trim().toLowerCase();
        renderOrders();
    });

    // 4. Bind sort select
    document.getElementById('orders-sort-select')?.addEventListener('change', (e) => {
        currentSortKey = e.target.value;
        renderOrders();
    });

    // 5. Stage filter chip events from orders.html
    document.addEventListener('stageFilterChanged', (e) => {
        currentStageFilter = e.detail?.stage || 'all';
        renderOrders();
    });

    // 6. Urgency filter chip events from orders.html
    document.addEventListener('urgencyFilterChanged', (e) => {
        currentUrgencyFilter = e.detail?.urgency || 'all';
        renderOrders();
    });

    // Open from URL if present
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('orderId');
    if (orderId) window.openOrderDetails(orderId);
});

async function loadOrders() {
    const raw = await api.getOrders();
    // Ensure stageData and phases are parsed objects (not raw JSON strings)
    currentOrders = raw.map(o => {
        if (o.stageData && typeof o.stageData === 'string') {
            try { o.stageData = JSON.parse(o.stageData); } catch { o.stageData = {}; }
        }
        if (!o.stageData || typeof o.stageData !== 'object') o.stageData = {};
        if (o.phases && typeof o.phases === 'string') {
            try { o.phases = JSON.parse(o.phases); } catch { o.phases = []; }
        }
        if (!Array.isArray(o.phases)) o.phases = [];
        return o;
    });
    renderOrders();
    renderAnalyticsSummary();
}

function renderAnalyticsSummary() {
    const container = document.getElementById('orders-analytics-container');
    if (!container) return;

    const activeOrders = currentOrders.filter(o => !['Dispatched', 'Delivered', 'Closed', 'Archived'].includes(o.status));
    
    const totalValue     = activeOrders.reduce((sum, o) => sum + (o.value || 0), 0);
    const pendingUnits   = activeOrders.reduce((sum, o) => sum + (o.qty || 0), 0);
    const cuttingCount   = activeOrders.filter(o => (o.status || '').toLowerCase().includes('cut')).length;
    const stitchingCount = activeOrders.filter(o => (o.status || '').toLowerCase().includes('stitch')).length;
    const printingCount  = activeOrders.filter(o => (o.status || '').toLowerCase().includes('print')).length;
    
    const now = Date.now();
    const riskCount      = activeOrders.filter(o => {
        if (!o.deliveryDate) return false;
        const days = (new Date(o.deliveryDate).getTime() - now) / (1000 * 60 * 60 * 24);
        return days <= 4;
    }).length;

    container.innerHTML = getOrdersAnalyticsHTML({
        totalValue,
        pendingUnits,
        cuttingCount,
        stitchingCount,
        printingCount,
        riskCount
    });
}

function applyUrgencyFilter(orders, urgencyKey) {
    if (!urgencyKey || urgencyKey === 'all') return orders;
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    return orders.filter(o => {
        if (!o.deliveryDate) return false;
        const d = new Date(o.deliveryDate);
        d.setHours(0, 0, 0, 0);
        const daysLeft = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (urgencyKey === 'overdue') return daysLeft < 0;
        if (urgencyKey === 'this_week') return daysLeft >= 0 && daysLeft <= 7;
        if (urgencyKey === 'two_weeks') return daysLeft >= 0 && daysLeft <= 14;
        return true;
    });
}

function applySorting(orders, sortKey) {
    const sorted = [...orders];
    if (sortKey === 'urgency') {
        return sorted.sort((a, b) => {
            if (!a.deliveryDate && !b.deliveryDate) return 0;
            if (!a.deliveryDate) return 1;
            if (!b.deliveryDate) return -1;
            return new Date(a.deliveryDate).getTime() - new Date(b.deliveryDate).getTime();
        });
    } else if (sortKey === 'value_desc') {
        return sorted.sort((a, b) => (b.value || 0) - (a.value || 0));
    } else if (sortKey === 'qty_desc') {
        return sorted.sort((a, b) => (b.qty || 0) - (a.qty || 0));
    } else if (sortKey === 'progress_asc') {
        return sorted.sort((a, b) => {
            const aProg = (a.progressPercentage !== undefined && a.progressPercentage !== null)
                ? a.progressPercentage
                : calculateOrderRollup(a).overallPercentage;
            const bProg = (b.progressPercentage !== undefined && b.progressPercentage !== null)
                ? b.progressPercentage
                : calculateOrderRollup(b).overallPercentage;
            return aProg - bProg;
        });
    } else if (sortKey === 'date_desc') {
        return sorted.sort((a, b) => {
            const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            if (aTime !== bTime) return bTime - aTime;
            return (b.id || '').localeCompare(a.id || '');
        });
    }
    return sorted;
}

function renderOrders() {
    const listContainer   = document.getElementById('orders-list');
    const kanbanContainer = document.getElementById('orders-kanban');
    const emptyCTA        = document.getElementById('orders-empty-cta');
    if (!listContainer || !kanbanContainer) return;

    let filtered = currentOrders;

    // 1. Segmented tab (Active / Completed)
    if (currentFilter === 'active') {
        filtered = filtered.filter(o => !['Dispatched', 'Delivered', 'Closed', 'Archived'].includes(o.status));
    } else if (currentFilter === 'completed') {
        filtered = filtered.filter(o => ['Dispatched', 'Delivered', 'Closed', 'Archived'].includes(o.status));
    }

    // 2. Canonical stage filter chip
    if (currentStageFilter && currentStageFilter !== 'all') {
        filtered = filtered.filter(o => normalizeStageKey(o.status) === currentStageFilter);
    }

    // 3. Deadline urgency filter
    filtered = applyUrgencyFilter(filtered, currentUrgencyFilter);

    // 4. Search input
    if (currentSearchQuery) {
        filtered = filtered.filter(o =>
            (o.id          && o.id.toLowerCase().includes(currentSearchQuery)) ||
            (o.product     && o.product.toLowerCase().includes(currentSearchQuery)) ||
            (o.customerName && o.customerName.toLowerCase().includes(currentSearchQuery)) ||
            (o.customerId   && o.customerId.toLowerCase().includes(currentSearchQuery)) ||
            (o.fabric       && o.fabric.toLowerCase().includes(currentSearchQuery)) ||
            (o.status       && o.status.toLowerCase().includes(currentSearchQuery))
        );
    }

    // 5. Multi-criteria sorting
    filtered = applySorting(filtered, currentSortKey);

    // Empty CTA — show when zero orders in DB
    if (emptyCTA) emptyCTA.classList.toggle('hidden', currentOrders.length > 0);

    if (currentViewMode === 'list') {
        listContainer.classList.remove('hidden');
        kanbanContainer.classList.add('hidden');
        
        if (filtered.length === 0) {
            listContainer.innerHTML = `<div class="p-10 text-center bg-surface-container-lowest rounded-3xl border border-outline-variant/60 shadow-xs">
                <span class="material-symbols-outlined text-[48px] mb-2 block text-secondary opacity-40">inbox</span>
                <p class="text-[15px] font-bold text-on-surface">No matching orders</p>
                <p class="text-[13px] text-secondary mt-1">Try clearing urgency filters, stage chips, or search queries</p>
            </div>`;
            return;
        }

        const isBulk = selectedOrderIds.size > 0;
        listContainer.innerHTML = filtered.map(o => renderers.orderCard(o, isBulk, selectedOrderIds.has(o.id))).join('');
    } else {
        listContainer.classList.add('hidden');
        kanbanContainer.classList.remove('hidden');
        renderKanban(filtered);
    }
}

function renderKanban(filteredOrders) {
    const kanbanContainer = document.getElementById('orders-kanban');
    if (!kanbanContainer) return;

    const hasVerticalOrders = filteredOrders.some(o => {
        const k = normalizeStageKey(o.status);
        const wf = o.products?.[0]?.workflowType || o.workflowType;
        return k === 'winding' || k === 'knitting' || k === 'dyeing' || wf === 'full_vertical';
    });

    const KANBAN_STAGES = hasVerticalOrders
        ? ['procurement', 'winding', 'knitting', 'dyeing', 'fabric', 'cutting', 'print_wash', 'stitching', 'packing', 'dispatch']
        : ['procurement', 'fabric', 'cutting', 'print_wash', 'stitching', 'packing', 'dispatch'];

    kanbanContainer.innerHTML = KANBAN_STAGES.map((stgKey, stgIdx) => {
        const stageDef = STAGE_DEFINITIONS[stgKey] || {};
        const stageOrders = filteredOrders.filter(o => normalizeStageKey(o.status) === stgKey);

        const columnHeader = `
            <div class="flex justify-between items-center mb-3 px-1">
                <div class="flex items-center gap-2 min-w-0">
                    <div class="w-7 h-7 rounded-lg ${stageDef.bgColor} ${stageDef.color} flex items-center justify-center shrink-0">
                        <span class="material-symbols-outlined text-[17px]">${stageDef.icon}</span>
                    </div>
                    <span class="text-[13px] font-extrabold uppercase tracking-wider text-on-surface truncate">${stageDef.shortLabel}</span>
                </div>
                <span class="text-[12px] font-extrabold px-2 py-0.5 rounded-full ${stageDef.bgColor} ${stageDef.color}">${stageOrders.length}</span>
            </div>
        `;

        const columnCards = stageOrders.map(o => {
            const customerName = api.getCustomerSync?.(o.customerId)?.name || o.customerName || o.customerId;
            const rollup = calculateOrderRollup(o);
            const displayProgress = (o.progressPercentage !== undefined && o.progressPercentage !== null)
                ? o.progressPercentage
                : rollup.overallPercentage;

            // Delivery countdown
            let urgencyHtml = '';
            if (o.deliveryDate) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const d = new Date(o.deliveryDate);
                d.setHours(0, 0, 0, 0);
                const days = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                if (days < 0) {
                    urgencyHtml = `<span class="text-[10px] font-bold text-error bg-error/10 px-1.5 py-0.5 rounded">${Math.abs(days)}d Overdue</span>`;
                } else if (days <= 5) {
                    urgencyHtml = `<span class="text-[10px] font-bold text-orange-600 bg-orange-500/10 px-1.5 py-0.5 rounded">${days}d left</span>`;
                } else {
                    urgencyHtml = `<span class="text-[10px] font-medium text-secondary">${days}d left</span>`;
                }
            }

            // Inline sizes breakdown
            const primaryProduct = Array.isArray(o.products) && o.products.length > 0 ? o.products[0] : null;
            const sizesObj = primaryProduct?.sizes || o.stageData?.cutting?.cutQuantitiesBySize || o.sizes;
            let sizesBadges = '';
            if (typeof sizesObj === 'object' && sizesObj !== null && Object.keys(sizesObj).length > 0) {
                sizesBadges = `
                    <div class="flex items-center gap-1 overflow-x-auto no-scrollbar py-1 text-[10px]">
                        ${Object.entries(sizesObj).slice(0, 4).map(([sz, q]) => `
                            <span class="px-1 py-0.5 rounded bg-surface-container border border-outline-variant/40">
                                <strong>${sz}</strong>:${q}
                            </span>
                        `).join('')}
                    </div>
                `;
            }

            return `
                <div onclick="window.openOrderDetails('${o.id}')" 
                    class="cursor-pointer bg-surface-container-lowest p-3.5 rounded-2xl border border-outline-variant shadow-xs active-scale transition-apple mb-2 hover:border-primary">
                    <div class="flex justify-between items-start mb-1.5">
                        <span class="text-[11px] font-mono font-bold text-primary uppercase">${o.id}</span>
                        <div class="flex items-center gap-1">
                            ${urgencyHtml}
                            <span class="text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-surface-variant text-on-surface-variant">${o.qty} pcs</span>
                        </div>
                    </div>
                    <h4 class="text-[14px] font-bold text-on-surface line-clamp-1">${o.product || 'Garment'}</h4>
                    <p class="text-[12px] text-secondary line-clamp-1 mt-0.5">${customerName}</p>

                    ${sizesBadges}

                    <!-- Progress Bar -->
                    <div class="mt-2.5">
                        <div class="flex justify-between items-center text-[10px] mb-1">
                            <span class="text-secondary font-medium">Progress</span>
                            <span class="font-bold text-primary">${displayProgress}%</span>
                        </div>
                        <div class="w-full h-1.5 rounded-full bg-surface-variant overflow-hidden">
                            <div class="h-full bg-primary rounded-full transition-all" style="width: ${displayProgress}%"></div>
                        </div>
                    </div>

                    <!-- Quick Stage Advance & Floor Controls -->
                    <div class="mt-3 pt-2.5 border-t border-outline-variant/40 flex items-center justify-between">
                        <div class="flex items-center gap-1">
                            ${stgIdx > 0 ? `
                                <button type="button" onclick="event.stopPropagation(); window.advanceOrderStage('${o.id}', -1)"
                                    class="w-6 h-6 rounded-md bg-surface-variant hover:bg-surface-container-high text-secondary hover:text-on-surface flex items-center justify-center transition-colors" title="Move back">
                                    <span class="material-symbols-outlined text-[14px]">arrow_back</span>
                                </button>
                            ` : ''}
                            ${stgIdx < KANBAN_STAGES.length - 1 ? `
                                <button type="button" onclick="event.stopPropagation(); window.advanceOrderStage('${o.id}', 1)"
                                    class="px-2 h-6 rounded-md bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-bold flex items-center gap-0.5 transition-colors" title="Advance stage">
                                    <span>Advance</span>
                                    <span class="material-symbols-outlined text-[13px]">arrow_forward</span>
                                </button>
                            ` : `
                                <span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#008A00]/10 text-[#008A00]">Complete</span>
                            `}
                        </div>
                        <button type="button" onclick="event.stopPropagation(); window.location.href='production.html?orderId=${o.id}&stage=${stgKey}'"
                            class="text-[11px] font-bold text-secondary hover:text-primary flex items-center gap-0.5 transition-colors" title="Open Floor Workspace">
                            <span>Floor</span>
                            <span class="material-symbols-outlined text-[13px]">open_in_new</span>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="min-w-[290px] max-w-[290px] snap-center flex flex-col h-full bg-surface-container/30 rounded-2xl p-3 border border-outline-variant/60 shadow-xs">
                ${columnHeader}
                <div class="flex-1 overflow-y-auto hide-scrollbar flex flex-col gap-1 min-h-[340px]">
                    ${columnCards}
                    ${stageOrders.length === 0 ? `
                        <div class="flex-1 flex flex-col items-center justify-center p-6 border-2 border-dashed border-outline-variant/50 rounded-2xl opacity-40 text-center">
                            <span class="material-symbols-outlined text-[24px] text-secondary mb-1">${stageDef.icon}</span>
                            <p class="text-[12px] text-secondary font-medium">No orders in ${stageDef.shortLabel}</p>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

window.setSortMode = function(sortKey) {
    currentSortKey = sortKey;
    renderOrders();
};

window.setViewMode = function(mode) {
    currentViewMode = mode;
    
    // Update button states matching orders.html
    const listBtn = document.getElementById('view-list-btn');
    const kanbanBtn = document.getElementById('view-kanban-btn');
    
    if (mode === 'list') {
        if (listBtn) listBtn.className = 'px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary text-[12px] font-bold flex items-center gap-1 transition-colors';
        if (kanbanBtn) kanbanBtn.className = 'px-2.5 py-1.5 rounded-lg text-secondary hover:bg-surface-variant text-[12px] font-bold flex items-center gap-1 transition-colors';
    } else {
        if (kanbanBtn) kanbanBtn.className = 'px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary text-[12px] font-bold flex items-center gap-1 transition-colors';
        if (listBtn) listBtn.className = 'px-2.5 py-1.5 rounded-lg text-secondary hover:bg-surface-variant text-[12px] font-bold flex items-center gap-1 transition-colors';
    }
    
    renderOrders();
};

window.setFilter = function(filter) {
    currentFilter = filter;
    document.getElementById('tab-active')?.classList.replace('bg-surface-variant', 'text-secondary');
    document.getElementById('tab-active')?.classList.replace('text-on-surface', 'text-secondary');
    document.getElementById('tab-active')?.classList.remove('bg-surface-variant', 'text-on-surface');
    document.getElementById('tab-completed')?.classList.remove('bg-surface-variant', 'text-on-surface');
    
    if (filter === 'active') {
        document.getElementById('tab-active')?.classList.add('bg-surface-variant', 'text-on-surface');
        document.getElementById('tab-completed')?.classList.add('text-secondary');
    } else {
        document.getElementById('tab-completed')?.classList.add('bg-surface-variant', 'text-on-surface');
        document.getElementById('tab-completed')?.classList.remove('text-secondary');
        document.getElementById('tab-active')?.classList.add('text-secondary');
    }
    renderOrders();
};

window.openOrderDetails = async function (orderId) {
    activeOrder = currentOrders.find(o => o.id === orderId);
    if (!activeOrder) return;

    const detailsSheet = document.getElementById('orderDetailsSheet-content');
    if (detailsSheet) {
        const headerEl = detailsSheet.querySelector('.sheet-custom-header');
        const contentEl = document.getElementById('orderDetailsSheet-inner-content');
        if (headerEl) headerEl.innerHTML = getOrderDetailsHeader(activeOrder);
        if (contentEl) contentEl.innerHTML = getOrderDetailsContent(activeOrder);
    }

    window.openSheet('orderDetailsSheet');
    window.switchOrderTab('overview');
};

window.switchOrderTab = function(tabId) {
    document.querySelectorAll('.od-tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.od-tab-btn').forEach(btn => {
        btn.classList.remove('border-primary', 'text-primary');
        btn.classList.add('border-transparent', 'text-secondary');
    });

    document.getElementById(`od-tab-${tabId}`)?.classList.remove('hidden');
    const btn = document.getElementById(`od-tab-btn-${tabId}`);
    if (btn) {
        btn.classList.remove('border-transparent', 'text-secondary');
        btn.classList.add('border-primary', 'text-primary');
    }
}

// Navigate directly to the full create-order wizard page
window.openCreateWizard = function() {
    window.location.href = 'create-order.html';
};


window.goToOrderStep = function(direction) {
    let nextStep = window.currentWizardStep + direction;
    if (nextStep < 1 || nextStep > TOTAL_WIZARD_STEPS) return;
    
    for (let i = 1; i <= TOTAL_WIZARD_STEPS; i++) {
        document.getElementById(`order-step-${i}`)?.classList.add('hidden');
    }
    document.getElementById(`order-step-${nextStep}`)?.classList.remove('hidden');
    
    const progressWidth = ((nextStep - 1) / (TOTAL_WIZARD_STEPS - 1)) * 100;
    const progressEl = document.getElementById('wizard-progress-bar');
    if (progressEl) progressEl.style.width = `${progressWidth}%`;

    document.getElementById('wizard-prev-btn')?.classList.toggle('hidden', nextStep === 1);
    document.getElementById('wizard-next-btn')?.classList.toggle('hidden', nextStep === TOTAL_WIZARD_STEPS);
    document.getElementById('create-order-submit')?.classList.toggle('hidden', nextStep !== TOTAL_WIZARD_STEPS);

    window.currentWizardStep = nextStep;
}

function bindWizardCalculations() {
    const qtyInput = document.getElementById('create-qty');
    const priceInput = document.getElementById('create-price');
    const totalEl = document.getElementById('calc-grandtotal');

    const calc = () => {
        const q = parseInt(qtyInput?.value) || 0;
        const p = parseFloat(priceInput?.value) || 0;
        if (totalEl) totalEl.textContent = `₹${(q * p).toLocaleString()}`;
    };

    qtyInput?.addEventListener('input', calc);
    priceInput?.addEventListener('input', calc);
}

function bindCostingAutoFill() {
    const quoteSelect = document.getElementById('create-quote');
    quoteSelect?.addEventListener('change', async (e) => {
        const costingId = e.target.value;
        if (!costingId) return;

        try {
            const costings = await api.getCostings();
            const costing = costings.find(c => c.id === costingId);
            if (costing) {
                const productInput = document.getElementById('create-product');
                const fabricInput = document.getElementById('create-fabric');
                const priceInput = document.getElementById('create-price');

                if (productInput) productInput.value = costing.styleRef || '';
                if (fabricInput) fabricInput.value = costing.fabricType || '';
                if (priceInput) {
                    priceInput.value = costing.retailPrice || costing.totalCost || 0;
                    // Trigger calculations
                    const qtyInput = document.getElementById('create-qty');
                    const q = parseInt(qtyInput?.value) || 0;
                    const p = parseFloat(priceInput.value) || 0;
                    const totalEl = document.getElementById('calc-grandtotal');
                    if (totalEl) totalEl.textContent = `₹${(q * p).toLocaleString()}`;
                }
                window.showToast?.('Pre-filled specs from quotation', 'success');
            }
        } catch (err) {
            console.error('Failed to auto-fill costing:', err);
        }
    });
}

// ==========================================
// CRUD OPERATIONS
// ==========================================
window.submitNewOrder = async function() {
    const customerId = document.getElementById('create-customer-select')?.value;
    const product = document.getElementById('create-product')?.value;
    const qty = parseInt(document.getElementById('create-qty')?.value) || 0;
    const unitPrice = parseFloat(document.getElementById('create-price')?.value) || 0;
    
    if (!customerId || !product || qty <= 0) {
        window.showToast?.('Please fill required fields (Customer, Product, Qty > 0)', 'error');
        return;
    }
    
    const workflowType = document.getElementById('create-workflow')?.value || 'default';
    
    const newOrder = {
        customerId,
        product,
        qty,
        fabric: document.getElementById('create-fabric')?.value || '',
        sizes: document.getElementById('create-sizes')?.value || '',
        colors: document.getElementById('create-colors')?.value || '',
        status: document.getElementById('create-status')?.value || 'Draft',
        priority: document.getElementById('create-priority')?.value || 'Normal',
        workflowType,
        products: [{
            name: product,
            category: 'Adults',
            qty,
            status: document.getElementById('create-status')?.value || 'Fabric',
            workflowType,
            sizes: {}
        }],
        value: (qty * unitPrice),
        incurredCost: 0,
        deliveryDate: document.getElementById('create-delivery')?.value || '',
        tasks: [],
        timeline: [],
        paymentStatus: 'Unpaid',
        paymentReceived: 0
    };
    
    try {
        await api.saveOrder(newOrder);
        window.showToast?.('Order created successfully', 'success');
        window.closeSheet('createOrderSheet');
        await loadOrders();
    } catch (err) {
        window.showToast?.('Failed to create order', 'error');
    }
}

window.openEditOrder = function(orderId) {
    const id = orderId || activeOrder?.id;
    if (!id) {
        window.showToast?.('No order selected to edit', 'error');
        return;
    }
    window.location.href = `create-order.html?edit=${encodeURIComponent(id)}`;
};

window.deleteOrder = async function () {
    if (!activeOrder) return;
    try {
        await api.deleteOrder(activeOrder.id);
        window.showToast?.('Order deleted', 'success');
        window.closeSheet('orderDetailsSheet');
        await loadOrders();
    } catch (e) {
        window.showToast?.('Failed to delete', 'error');
    }
};

window.handleStatusTransition = async function (newStatus) {
    if (!activeOrder) return;
    try {
        window.showToast?.(`Moving to ${newStatus}...`, 'info');
        await api.updateOrderStatus(activeOrder.id, newStatus);
        
        let autoTasks = [];
        if (newStatus === 'Cutting') {
            autoTasks = [
                { title: 'Verify fabric quantity & laying', completed: false },
                { title: 'Apply marker templates & cut fabrics', completed: false }
            ];
        } else if (newStatus === 'Stitching') {
            autoTasks = [
                { title: 'Assemble front & back panels', completed: false },
                { title: 'Attach collar and sleeves', completed: false }
            ];
        } else if (newStatus === 'Printing/Embroidery') {
            autoTasks = [
                { title: 'Prepare screen/embroidery frames', completed: false },
                { title: 'Print sample panel & check alignment', completed: false }
            ];
        } else if (newStatus === 'Ironing & Packing') {
            autoTasks = [
                { title: 'Iron all pieces', completed: false },
                { title: 'Pack and label boxes', completed: false }
            ];
        }
        
        if (autoTasks.length > 0) {
            for (const t of autoTasks) {
                await api.addOrderTask(activeOrder.id, t);
            }
        }

        await loadOrders();
        window.openOrderDetails(activeOrder.id); // Re-open with new data instead of closing
        window.showToast?.(`Status updated to ${newStatus}`, 'success');
    } catch (e) {
        console.error(e);
        window.showToast?.('Failed to update status', 'error');
    }
};

window.updateProductStage = async function(orderId, productIdx, newStage) {
    const order = currentOrders.find(o => o.id === orderId);
    if (!order) return;
    
    // Create products array if missing (for legacy orders)
    if (!order.products || order.products.length === 0) {
        order.products = [{
            name: order.product || 'Garment',
            category: 'Adults',
            qty: order.qty || 0,
            status: order.status || 'Fabric',
            sizes: order.stageData?.cutting?.sizes || {}
        }];
    }
    
    order.products[productIdx].status = newStage;
    
    // Set overall status based on lowest active product stage
    const STAGE_ORDER = ['Fabric', 'Cutting', 'Stitching', 'Printing/Embroidery', 'Ironing & Packing', 'Dispatch'];
    let lowestIdx = STAGE_ORDER.length - 1;
    order.products.forEach(p => {
        const idx = STAGE_ORDER.indexOf(p.status || 'Fabric');
        if (idx !== -1 && idx < lowestIdx) {
            lowestIdx = idx;
        }
    });
    const overallStatus = STAGE_ORDER[lowestIdx];
    
    try {
        window.showToast?.(`Updating stage of ${order.products[productIdx].name} to ${newStage}...`, 'info');
        await api.updateOrder(orderId, {
            products: order.products,
            status: overallStatus
        });

        
        window.showToast?.('Stage updated successfully', 'success');
        
        // Re-render order details locally without closing sheet
        const activeOrderIdx = currentOrders.findIndex(o => o.id === orderId);
        if (activeOrderIdx > -1) {
            activeOrder = currentOrders[activeOrderIdx];
            const contentEl = document.getElementById('orderDetailsSheet-inner-content');
            if (contentEl) contentEl.innerHTML = getOrderDetailsContent(activeOrder);
        }
    } catch (e) {
        console.error(e);
        window.showToast?.('Failed to update product stage', 'error');
    }
};

window.toggleOrderTask = async function(taskId, isCompleted) {
    if (!activeOrder) return;
    try {
        const task = activeOrder.tasks.find(t => t.id === taskId);
        if (task) {
            task.completed = isCompleted;
            await api.updateOrderTask(activeOrder.id, taskId, task);
            
            // Re-render order details locally without closing sheet
            const activeOrderIdx = currentOrders.findIndex(o => o.id === activeOrder.id);
            if(activeOrderIdx > -1) {
                currentOrders[activeOrderIdx] = await api.getOrder(activeOrder.id);
                activeOrder = currentOrders[activeOrderIdx];
                const contentEl = document.getElementById('orderDetailsSheet-inner-content');
                if (contentEl) contentEl.innerHTML = getOrderDetailsContent(activeOrder);
            }
        }
    } catch(e) {
        window.showToast?.('Failed to update task', 'error');
    }
}

window.logPayment = function() {
    if (!activeOrder) return;
    const paymentPending = Math.max((activeOrder.value || 0) - (activeOrder.paymentReceived || 0), 0);
    document.getElementById('log-payment-amount').value = paymentPending || '';
    document.getElementById('log-payment-note').value = '';
    window.openSheet('logPaymentSheet');
};

window.submitLogPayment = async function() {
    if (!activeOrder) return;
    
    const amount = parseFloat(document.getElementById('log-payment-amount').value) || 0;
    const method = document.getElementById('log-payment-method').value;
    const note = document.getElementById('log-payment-note').value;
    
    if (amount <= 0) {
        window.showToast?.('Enter a valid amount', 'error');
        return;
    }

    try {
        const newTotal = (activeOrder.paymentReceived || 0) + amount;
        const isPaid = newTotal >= (activeOrder.value || 0);
        
        await api.updateOrder(activeOrder.id, {
            paymentReceived: newTotal,
            paymentStatus: isPaid ? 'Paid' : 'Partially Paid'
        });

        window.showToast?.(`Logged ₹${amount.toLocaleString()} payment`, 'success');
        window.closeSheet('logPaymentSheet');
        
        await loadOrders();
        window.openOrderDetails(activeOrder.id);
        
    } catch (e) {
        window.showToast?.('Failed to log payment', 'error');
    }
};

// ==============================================================================
// CANONICAL STAGE ADVANCEMENT & WORKFLOW INTEGRATION
// ==============================================================================
const CANONICAL_STAGE_ORDER = [
    { key: 'procurement', label: 'Procurement' },
    { key: 'fabric',      label: 'Fabric' },
    { key: 'cutting',     label: 'Cutting' },
    { key: 'print_wash',  label: 'Printing/Embroidery' },
    { key: 'stitching',   label: 'Stitching' },
    { key: 'packing',     label: 'Ironing & Packing' },
    { key: 'dispatch',    label: 'Dispatched' }
];

window.advanceOrderStage = async function(orderId, delta) {
    const order = currentOrders.find(o => o.id === orderId);
    if (!order) return;

    const primaryProd = (Array.isArray(order.products) && order.products.length > 0) ? order.products[0] : null;
    const stages = getProductWorkflowStages(primaryProd, order.workflowType);
    const currentKey = normalizeStageKey(order.status);
    let currentIdx = stages.indexOf(currentKey);
    if (currentIdx === -1) currentIdx = 0;

    const nextIdx = Math.max(0, Math.min(stages.length - 1, currentIdx + delta));
    if (nextIdx === currentIdx) return;

    const nextStageKey = stages[nextIdx];
    const nextDef = STAGE_DEFINITIONS[nextStageKey] || { label: nextStageKey };
    try {
        window.showToast?.(`Moving #${orderId} to ${nextDef.label}...`, 'info');
        await api.updateOrderStatus(orderId, nextDef.label);
        window.showToast?.(`Order moved to ${nextDef.label}`, 'success');
        await loadOrders();
    } catch (err) {
        console.error("Failed to advance stage:", err);
        window.showToast?.('Failed to advance stage', 'error');
    }
};

// ==============================================================================
// BULK OPERATIONS
// ==============================================================================
window.toggleOrderSelection = function(orderId) {
    if (selectedOrderIds.has(orderId)) {
        selectedOrderIds.delete(orderId);
    } else {
        selectedOrderIds.add(orderId);
    }
    updateBulkToolbar();
    renderOrders();
};

window.toggleSelectAll = function() {
    if (selectedOrderIds.size === currentOrders.length && currentOrders.length > 0) {
        selectedOrderIds.clear();
    } else {
        currentOrders.forEach(o => selectedOrderIds.add(o.id));
    }
    updateBulkToolbar();
    renderOrders();
};

window.clearOrderSelection = function() {
    selectedOrderIds.clear();
    updateBulkToolbar();
    renderOrders();
};

window.clearBulkSelection = function() {
    selectedOrderIds.clear();
    updateBulkToolbar();
    renderOrders();
};

function updateBulkToolbar() {
    const bar = document.getElementById('bulk-actions-bar') || document.getElementById('orders-bulk-bar');
    const countEl = document.getElementById('bulk-selected-count');
    if (!bar) return;

    const count = selectedOrderIds.size;
    if (count > 0) {
        bar.classList.remove('hidden');
        if (countEl) countEl.textContent = `${count} order${count > 1 ? 's' : ''} selected`;
    } else {
        bar.classList.add('hidden');
    }
}

window.bulkAdvanceOrders = async function() {
    if (selectedOrderIds.size === 0) return;
    const count = selectedOrderIds.size;
    if (!confirm(`Advance ${count} selected order${count > 1 ? 's' : ''} to their next production stage?`)) return;

    window.showToast?.(`Advancing ${count} orders...`, 'info');
    let updated = 0;
    for (const orderId of selectedOrderIds) {
        const order = currentOrders.find(o => o.id === orderId);
        if (order) {
            const primaryProd = (Array.isArray(order.products) && order.products.length > 0) ? order.products[0] : null;
            const stages = getProductWorkflowStages(primaryProd, order.workflowType);
            const currentKey = normalizeStageKey(order.status);
            let currentIdx = stages.indexOf(currentKey);
            if (currentIdx < stages.length - 1) {
                const nextStageKey = stages[currentIdx + 1];
                const nextDef = STAGE_DEFINITIONS[nextStageKey] || { label: nextStageKey };
                await api.updateOrderStatus(orderId, nextDef.label);
                updated++;
            }
        }
    }
    selectedOrderIds.clear();
    updateBulkToolbar();
    await loadOrders();
    window.showToast?.(`Advanced ${updated} orders to next stage`, 'success');
};

window.openBulkAdvanceModal = async function() {
    await window.bulkAdvanceOrders();
};

window.bulkExportCSV = function() {
    const ordersToExport = selectedOrderIds.size > 0
        ? currentOrders.filter(o => selectedOrderIds.has(o.id))
        : currentOrders;
    generateAndDownloadCSV(ordersToExport, 'garment_os_selected_orders.csv');
};

window.exportAllOrdersCSV = function() {
    generateAndDownloadCSV(currentOrders, 'garment_os_order_book.csv');
};

function generateAndDownloadCSV(orders, filename) {
    if (!orders || orders.length === 0) {
        window.showToast?.('No orders to export', 'error');
        return;
    }
    const headers = ['Order ID', 'Buyer Name', 'Product Style', 'Total Qty', 'Quoted Value (INR)', 'Production Stage', 'Progress %', 'Target Delivery', 'Payment Status'];
    const rows = orders.map(o => {
        const custName = api.getCustomerSync?.(o.customerId)?.name || o.customerName || o.customerId || '';
        const progress = (o.progressPercentage !== undefined && o.progressPercentage !== null)
            ? o.progressPercentage
            : calculateOrderRollup(o).overallPercentage;
        return [
            `"${o.id || ''}"`,
            `"${custName.replace(/"/g, '""')}"`,
            `"${(o.product || '').replace(/"/g, '""')}"`,
            o.qty || 0,
            o.value || 0,
            `"${o.status || ''}"`,
            progress,
            `"${o.deliveryDate || ''}"`,
            `"${o.paymentStatus || 'Unpaid'}"`
        ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.showToast?.(`Exported ${orders.length} orders to CSV`, 'success');
}

window.bulkPrintTravelers = function() {
    const ordersToPrint = selectedOrderIds.size > 0
        ? currentOrders.filter(o => selectedOrderIds.has(o.id))
        : currentOrders;
    if (ordersToPrint.length === 0) return;

    const travelersHtml = ordersToPrint.map(o => generateJobTravelerHTML(o)).join('<div style="page-break-after: always; height: 1px;"></div>');
    openPrintWindow('Batch Production Job Travelers', travelersHtml);
};

window.openBulkAdvanceModal = async function() {
    if (selectedOrderIds.size === 0) return;
    const count = selectedOrderIds.size;
    if (!confirm(`Advance ${count} selected order${count > 1 ? 's' : ''} to their next production stage?`)) return;

    window.showToast?.(`Advancing ${count} orders...`, 'info');
    let updated = 0;
    for (const orderId of selectedOrderIds) {
        const order = currentOrders.find(o => o.id === orderId);
        if (order) {
            const currentKey = normalizeStageKey(order.status);
            let currentIdx = CANONICAL_STAGE_ORDER.findIndex(s => s.key === currentKey);
            if (currentIdx < CANONICAL_STAGE_ORDER.length - 1) {
                const nextStage = CANONICAL_STAGE_ORDER[currentIdx + 1];
                await api.updateOrderStatus(orderId, nextStage.label);
                updated++;
            }
        }
    }
    selectedOrderIds.clear();
    updateBulkToolbar();
    await loadOrders();
    window.showToast?.(`Advanced ${updated} orders to next stage`, 'success');
};

// ==============================================================================
// PRINTABLE DOCUMENT GENERATORS (A4 Laser & 4x6 Thermal)
// ==============================================================================
window.printJobTraveler = function(orderId) {
    const order = currentOrders.find(o => o.id === orderId);
    if (!order) return;
    const html = generateJobTravelerHTML(order);
    openPrintWindow(`Job Traveler - ${order.id}`, html);
};

window.printProformaInvoice = function(orderId) {
    const order = currentOrders.find(o => o.id === orderId);
    if (!order) return;
    const html = generateProformaInvoiceHTML(order);
    openPrintWindow(`Proforma Invoice - ${order.id}`, html);
};

window.printCartonSlips = function(orderId) {
    const order = currentOrders.find(o => o.id === orderId);
    if (!order) return;
    const html = generateCartonSlipsHTML(order);
    openPrintWindow(`Carton Slips - ${order.id}`, html);
};

function openPrintWindow(title, bodyContent) {
    const printWindow = window.open('', '_blank', 'width=920,height=1000');
    if (!printWindow) {
        alert('Please allow popups for Garment OS to preview and print documents.');
        return;
    }
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8"/>
            <title>${title}</title>
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
            <style>
                @page { size: A4 portrait; margin: 6mm 8mm; }
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; color: #111827; background: #fff; font-size: 11px; line-height: 1.35; padding: 0; }
                .doc-container { max-width: 800px; margin: 0 auto; }
                .text-mono { font-family: 'JetBrains Mono', monospace; }
                table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 10.5px; }
                th, td { border: 1px solid #d1d5db; padding: 5px 6px; text-align: left; }
                th { background-color: #f3f4f6; font-weight: 700; font-size: 9.5px; text-transform: uppercase; }
                .barcode-box { letter-spacing: 4px; font-size: 18px; font-family: monospace; font-weight: bold; padding: 4px 10px; border: 2px solid #111; display: inline-block; }
                @media print {
                    body { padding: 0; }
                    .no-print { display: none !important; }
                    tr, .card, table { page-break-inside: avoid; }
                }
            </style>
        </head>
        <body>
            <div class="no-print" style="margin-bottom: 12px; text-align: right; padding: 8px;">
                <button onclick="window.print()" style="padding: 8px 20px; background: #0A84FF; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 13px; box-shadow: 0 2px 6px rgba(10,132,255,0.3);">🖨️ Print Document</button>
            </div>
            <div class="doc-container">
                ${bodyContent}
            </div>
            <script>
                window.onload = function() {
                    setTimeout(function() { window.print(); }, 400);
                };
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
}

function generateJobTravelerHTML(order) {
    const customer = api.getCustomerSync?.(order.customerId) || {};
    const customerName = customer.name || order.customerName || order.customerId;
    const rollup = calculateOrderRollup(order);

    const primaryProduct = (Array.isArray(order.products) && order.products.length > 0) ? order.products[0] : {};
    const sizeKeys = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'XXXXL'];
    const sizesObj = primaryProduct.sizes || order.stageData?.cutting?.sizes || {};

    const sizesHeader = sizeKeys.map(k => `<th style="text-align:center;">${k}</th>`).join('');
    const sizesRow = sizeKeys.map(k => `<td style="text-align:center; font-weight:bold;">${sizesObj[k] || 0}</td>`).join('');

    return `
        <div style="border: 2px solid #111; padding: 14px; border-radius: 8px; margin-bottom: 12px;">
            <!-- Header -->
            <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom: 2px solid #111; padding-bottom: 10px; margin-bottom: 10px;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <img src="/assets/logo-billing.png" alt="Logo" style="height:44px;object-fit:contain;" onerror="this.outerHTML='<div style=\\'font-size:18px;font-weight:800;\\'>UDHAYAA</div>'">
                    <div>
                        <h1 style="font-size: 17px; font-weight: 800; text-transform: uppercase;">UDHAYAA TEXTILES — FACTORY JOB TRAVELER</h1>
                        <p style="font-size: 10.5px; color: #4b5563; font-weight: 600; margin-top: 1px;">63/A Senthur Nagar, Erode 638004 • GSTIN: 33ANGPU7147M1ZE</p>
                    </div>
                </div>
                <div style="text-align: right;">
                    <div class="barcode-box">||| ${order.id} ||||</div>
                    <p style="font-size: 9.5px; font-weight: bold; color: #6b7280; margin-top: 2px;">PRINTED: ${new Date().toLocaleDateString('en-IN')}</p>
                </div>
            </div>

            <!-- Meta Grid -->
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; font-size: 11px; margin-bottom: 10px;">
                <div><strong>Order ID:</strong> <span class="text-mono">${order.id}</span></div>
                <div><strong>Buyer:</strong> ${customerName}</div>
                <div><strong>Buyer PO #:</strong> ${order.customerPO || order.id}</div>
                <div><strong>Target Delivery:</strong> ${order.deliveryDate || 'Not specified'}</div>
                <div><strong>Priority:</strong> <span style="text-transform:uppercase; font-weight:bold;">${order.priority || 'Normal'}</span></div>
                <div><strong>Total Order Qty:</strong> <strong style="font-size: 13px;">${order.qty} pcs</strong></div>
            </div>

            <!-- Product & Fabric Specs -->
            <div style="background: #f9fafb; border: 1px solid #e5e7eb; padding: 8px 10px; border-radius: 6px; margin-bottom: 10px; font-size: 10.5px;">
                <div style="display:grid; grid-template-columns: 2fr 3fr; gap: 6px;">
                    <div><strong>Style / Product:</strong> ${order.product || 'Garment Item'}</div>
                    <div><strong>Fabric Spec:</strong> ${order.fabric || '100% Combed Cotton Single Jersey, 180 GSM'}</div>
                    <div><strong>Route Preset:</strong> ${(order.workflowType || 'default').replace(/_/g, ' ')}</div>
                    <div><strong>Current Factory Stage:</strong> <strong>${rollup.activeStageDef.label}</strong></div>
                </div>
            </div>

            <!-- Marker & Size Matrix -->
            <h3 style="font-size: 11px; font-weight: 800; text-transform: uppercase; margin-bottom: 3px;">Planned Size Ratio &amp; Bundle Matrix</h3>
            <table>
                <thead>
                    <tr>
                        <th>Spec</th>
                        ${sizesHeader}
                        <th style="text-align:center;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>Planned Qty</strong></td>
                        ${sizesRow}
                        <td style="text-align:center; font-weight:bold; background:#f3f4f6;">${order.qty} pcs</td>
                    </tr>
                    <tr>
                        <td><strong>Actual Cut Qty</strong></td>
                        ${sizeKeys.map(() => `<td style="text-align:center; color:#9ca3af;">—</td>`).join('')}
                        <td style="text-align:center; color:#9ca3af;">—</td>
                    </tr>
                </tbody>
            </table>

            <!-- Department Workstation Signoffs -->
            <h3 style="font-size: 11px; font-weight: 800; text-transform: uppercase; margin-top: 10px; margin-bottom: 3px;">Department Checkpoints &amp; Quality Sign-Off</h3>
            <table>
                <thead>
                    <tr>
                        <th style="width: 25%;">Floor Department</th>
                        <th style="width: 15%;">Target Date</th>
                        <th style="width: 15%; text-align:center;">Output Pcs</th>
                        <th style="width: 15%; text-align:center;">Rejects / Defect</th>
                        <th style="width: 30%;">Supervisor Signature</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>1. Sourcing &amp; Trims</strong></td>
                        <td>${order.deliveryDate || '—'}</td>
                        <td style="text-align:center;"></td>
                        <td style="text-align:center;"></td>
                        <td></td>
                    </tr>
                    <tr>
                        <td><strong>2. Fabric Inward &amp; Roll QC</strong></td>
                        <td>${order.deliveryDate || '—'}</td>
                        <td style="text-align:center;"></td>
                        <td style="text-align:center;"></td>
                        <td></td>
                    </tr>
                    <tr>
                        <td><strong>3. Spreading &amp; Cutting</strong></td>
                        <td>${order.deliveryDate || '—'}</td>
                        <td style="text-align:center;"></td>
                        <td style="text-align:center;"></td>
                        <td></td>
                    </tr>
                    <tr>
                        <td><strong>4. Print / Embroidery / Wash</strong></td>
                        <td>${order.deliveryDate || '—'}</td>
                        <td style="text-align:center;"></td>
                        <td style="text-align:center;"></td>
                        <td></td>
                    </tr>
                    <tr>
                        <td><strong>5. Sewing Line Assembly</strong></td>
                        <td>${order.deliveryDate || '—'}</td>
                        <td style="text-align:center;"></td>
                        <td style="text-align:center;"></td>
                        <td></td>
                    </tr>
                    <tr>
                        <td><strong>6. Ironing &amp; Polybagging</strong></td>
                        <td>${order.deliveryDate || '—'}</td>
                        <td style="text-align:center;"></td>
                        <td style="text-align:center;"></td>
                        <td></td>
                    </tr>
                    <tr>
                        <td><strong>7. Carton Packing &amp; Gate Pass</strong></td>
                        <td>${order.deliveryDate || '—'}</td>
                        <td style="text-align:center;"></td>
                        <td style="text-align:center;"></td>
                        <td></td>
                    </tr>
                </tbody>
            </table>

            <div style="margin-top: 10px; display:flex; justify-content:space-between; align-items:flex-end; font-size:10px; color:#4b5563;">
                <p>Note: This traveler must accompany the cut bundles at all times across sewing lines.</p>
                <div style="border-top: 1px dashed #4b5563; width: 180px; text-align:center; padding-top: 3px;">Factory Manager Authorization</div>
            </div>
        </div>
    `;
}

function generateProformaInvoiceHTML(order) {
    const customer = api.getCustomerSync?.(order.customerId) || {};
    const customerName = customer.name || order.customerName || order.customerId;
    const customerCompany = customer.company || 'Buyer Organization';
    const customerGst = customer.gstNumber || customer.taxId || '33AAAAA0000A1Z5';
    const customerAddress = customer.shippingAddress || customer.address || 'Tamil Nadu, India';

    const orderValue = order.value || 0;
    const unitPrice = order.qty > 0 ? (orderValue / order.qty) : 0;
    const subtotal = Math.round((orderValue / 1.05) * 100) / 100;
    const gstTotal = Math.round((orderValue - subtotal) * 100) / 100;
    const cgst = Math.round((gstTotal / 2) * 100) / 100;
    const sgst = cgst;

    return `
        <div style="border: 1px solid #cbd5e1; padding: 16px; border-radius: 8px;">
            <!-- Seller Info -->
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 10px;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <img src="/assets/logo-billing.png" alt="Logo" style="height:46px;object-fit:contain;" onerror="this.outerHTML='<div style=\\'font-size:20px;font-weight:800;\\'>UDHAYAA TEXTILES</div>'">
                    <div>
                        <h1 style="font-size: 18px; font-weight: 800; color: #0f172a;">UDHAYAA TEXTILES</h1>
                        <p style="font-size: 10px; color: #475569; margin-top: 1px;">
                            63/A Senthur Nagar, Ellapalayam Road, Periyasemur, Erode - 638004<br/>
                            <strong style="color:#0f172a;background:#f1f5f9;padding:1px 4px;border:1px solid #cbd5e1;border-radius:3px;">GSTIN: 33ANGPU7147M1ZE</strong> | Phone: +91 77083 33813 | info@udhayaatextiles.com
                        </p>
                    </div>
                </div>
                <div style="text-align: right;">
                    <h2 style="font-size: 15px; font-weight: 800; text-transform: uppercase;">PROFORMA INVOICE</h2>
                    <p class="text-mono" style="font-size: 12px; font-weight: bold; margin-top: 2px;">PI-${order.id}</p>
                    <p style="font-size: 10px; color: #4b5563;">Date: ${new Date().toLocaleDateString('en-IN')}</p>
                </div>
            </div>

            <!-- Buyer Details -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; background: #f8fafc; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0;">
                <div>
                    <span style="font-size: 9px; font-weight: bold; text-transform: uppercase; color: #64748b;">Billed To / Consignee:</span>
                    <p style="font-size: 13px; font-weight: bold; margin-top: 2px;">${customerName}</p>
                    <p style="font-size: 11px; color: #374151;">${customerCompany}</p>
                    <p style="font-size: 10.5px; color: #374151; margin-top: 2px;">${customerAddress}</p>
                    <p style="font-size: 10.5px; font-weight: bold; margin-top: 2px;">GSTIN: ${customerGst}</p>
                </div>
                <div>
                    <span style="font-size: 9px; font-weight: bold; text-transform: uppercase; color: #64748b;">Order &amp; Payment Specs:</span>
                    <p style="font-size: 11px; margin-top: 2px;"><strong>Buyer PO Ref:</strong> ${order.customerPO || order.id}</p>
                    <p style="font-size: 11px;"><strong>Target Dispatch:</strong> ${order.deliveryDate || 'Within 14 Days'}</p>
                    <p style="font-size: 11px;"><strong>Payment Terms:</strong> 50% Advance, 50% Against Dispatch</p>
                    <p style="font-size: 11px;"><strong>Payment Status:</strong> <span style="font-weight:bold;">${order.paymentStatus || 'Unpaid'}</span></p>
                </div>
            </div>

            <!-- Itemized Table -->
            <table>
                <thead>
                    <tr>
                        <th style="width: 5%;">#</th>
                        <th style="width: 45%;">Style Description &amp; Specifications</th>
                        <th style="width: 15%; text-align:center;">HSN / SAC</th>
                        <th style="width: 10%; text-align:right;">Qty (pcs)</th>
                        <th style="width: 12%; text-align:right;">Unit Rate (₹)</th>
                        <th style="width: 13%; text-align:right;">Total (₹)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>1</td>
                        <td>
                            <strong>${order.product || 'Garment Item'}</strong>
                            <p style="font-size: 10px; color: #4b5563; margin-top: 1px;">${order.fabric || '100% Combed Cotton Single Jersey, 180 GSM'}</p>
                        </td>
                        <td style="text-align:center;" class="text-mono">6109</td>
                        <td style="text-align:right; font-weight:bold;">${order.qty}</td>
                        <td style="text-align:right;">₹${unitPrice.toFixed(2)}</td>
                        <td style="text-align:right; font-weight:bold;">₹${orderValue.toLocaleString('en-IN')}</td>
                    </tr>
                </tbody>
            </table>

            <!-- Financial Totals Grid -->
            <div style="display:flex; justify-content:space-between; margin-top: 8px; gap: 16px;">
                <div style="flex:1; font-size: 10px; color: #374151; background:#f8fafc; padding:8px 10px; border-radius:6px; border:1px solid #e2e8f0;">
                    <strong>Bank Remittance Details:</strong><br/>
                    Bank: Indian Overseas Bank • Branch: Erode Periasemur<br/>
                    A/C Name: Udhayaa Textiles • A/C No: 134601000036234<br/>
                    IFSC: IOBA0001346 • UPI: info.udhayaatextiles-2@okhdfcbank
                </div>
                <div style="width: 250px; font-size: 11px;">
                    <div style="display:flex; justify-content:space-between; padding: 2px 0;">
                        <span>Subtotal (Excl. Tax):</span>
                        <strong>₹${subtotal.toLocaleString('en-IN')}</strong>
                    </div>
                    <div style="display:flex; justify-content:space-between; padding: 2px 0; color:#4b5563;">
                        <span>CGST (2.5%):</span>
                        <span>₹${cgst.toLocaleString('en-IN')}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; padding: 2px 0; color:#4b5563;">
                        <span>SGST (2.5%):</span>
                        <span>₹${sgst.toLocaleString('en-IN')}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; padding: 4px 0; border-top: 1.5px solid #0f172a; font-size: 13px; font-weight: 800; margin-top: 2px;">
                        <span>Grand Total:</span>
                        <span style="color: #0f172a;">₹${orderValue.toLocaleString('en-IN')}</span>
                    </div>
                </div>
            </div>

            <!-- Signature -->
            <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-top: 18px; font-size: 10px;">
                <p>This is a computer-generated commercial proforma invoice.</p>
                <div style="text-align:center; width: 160px; border-top: 1px solid #0f172a; padding-top: 3px;">
                    <strong>For UDHAYAA TEXTILES</strong><br/>
                    <span style="font-size:8.5px;color:#64748b">Authorized Signatory</span>
                </div>
            </div>
        </div>
    `;
}

function generateCartonSlipsHTML(order) {
    const totalQty = order.qty || 1;
    const cartonCapacity = 50;
    const totalCartons = Math.ceil(totalQty / cartonCapacity);

    let slipsHtml = '';
    for (let i = 1; i <= totalCartons; i++) {
        const boxQty = (i === totalCartons && totalQty % cartonCapacity !== 0) ? (totalQty % cartonCapacity) : cartonCapacity;
        slipsHtml += `
            <div style="width: 400px; height: 300px; border: 2px solid #111; padding: 14px; margin: 0 auto 20px auto; border-radius: 8px; page-break-after: always; display:flex; flex-direction:column; justify-content:space-between;">
                <div style="border-bottom: 2px solid #111; padding-bottom: 6px; display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-weight:800; font-size:14px; color:#0A84FF;">GARMENT OS EXPORT HUB</span>
                    <span style="font-weight:bold; font-size:12px; background:#111; color:#fff; padding:2px 6px; rounded:4px;">BOX ${i} OF ${totalCartons}</span>
                </div>
                <div style="margin: 6px 0; font-size: 11px;">
                    <p><strong>Order ID:</strong> <span class="text-mono">${order.id}</span></p>
                    <p><strong>Buyer:</strong> ${order.customerName || order.customerId}</p>
                    <p><strong>Style:</strong> ${order.product || 'Garment Item'}</p>
                    <p><strong>Box Quantity:</strong> <strong style="font-size:14px;">${boxQty} pcs</strong></p>
                </div>
                <div style="text-align:center; padding: 8px 0; border: 1px dashed #111; border-radius: 4px;">
                    <div class="barcode-box">||| ${order.id}-C${i} |||</div>
                </div>
                <div style="font-size: 9px; color: #4b5563; text-align:center; margin-top: 4px;">
                    Handle with Care • Keep Dry • Tirupur Apparel Corridor
                </div>
            </div>
        `;
    }
    return slipsHtml;
}
