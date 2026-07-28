import { api } from '../services/api.js';
import { renderers } from '../renderers.js';
import { SegmentedControl, BottomSheet, TimelineEvent, TaskCard } from '../components/index.js';
import { bindFormValidation } from '../utils/formHandler.js';
import { getOrderSheetsHTML, getOrderDetailsHTML } from './templates.js';

let currentOrders = [];
let activeOrder = null;
let currentFilter = 'all';
let currentSearch = '';
let currentAdvFilters = {
    status: '',
    priority: '',
    dateFrom: '',
    dateTo: ''
};
let isBulkMode = false;
let selectedOrders = new Set();

async function initModule() {
    const segControl = document.getElementById('orders-segmented-control');
    if (segControl) {
        const options = [
            { id: 'all', label: 'All' },
            { id: 'active', label: 'Active (Draft/Prod)' },
            { id: 'completed', label: 'Completed' }
        ];
        
        const renderSegControl = () => {
            segControl.innerHTML = SegmentedControl({
                options: options,
                activeOption: currentFilter
            });
            
            // Attach event listeners manually
            const tabs = segControl.querySelectorAll('button[role="tab"]');
            tabs.forEach(tab => {
                tab.addEventListener('click', (e) => {
                    currentFilter = e.currentTarget.dataset.option;
                    renderSegControl(); // Re-render to update classes
                    renderOrders();
                });
            });
        };
        renderSegControl();
    }

    // Bind Search
    const searchInput = document.getElementById('order-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentSearch = e.target.value.toLowerCase();
            renderOrders();
        });
    }

    // 2. Load Data
    await loadOrders();
    
    // 3. Render Sheets
    await renderSheets();

    // If URL has orderId, open it
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('orderId');
    if (orderId) {
        window.openOrderDetails(orderId);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initModule);
} else {
    initModule();
}

async function loadOrders() {
    const container = document.getElementById('orders-list');
    if (container && window.setLoading) window.setLoading('orders-list');
    try {
        currentOrders = await api.getOrders();
        renderOrders();
    } catch (error) {
        if (container) container.innerHTML = '<div class="p-md text-center text-error">Failed to load orders</div>';
        console.error(error);
    }
}

function renderOrders() {
    const container = document.getElementById('orders-list');
    if (!container) return;

    let filtered = currentOrders;
    
    // 1. Segmented Control Filter
    if (currentFilter === 'active') {
        filtered = filtered.filter(o => !['Delivered', 'Closed', 'Archived'].includes(o.status));
    } else if (currentFilter === 'completed') {
        filtered = filtered.filter(o => ['Delivered', 'Closed', 'Archived'].includes(o.status));
    } else {
        filtered = filtered.filter(o => o.status !== 'Archived');
    }

    // 2. Search Query (Customer, ID, Product/Style)
    if (currentSearch) {
        filtered = filtered.filter(o => {
            const matchId = o.id.toLowerCase().includes(currentSearch);
            const matchCust = (o.customerName || '').toLowerCase().includes(currentSearch);
            const matchProd = (o.product || '').toLowerCase().includes(currentSearch);
            const matchStyle = (o.styleRef || '').toLowerCase().includes(currentSearch);
            const matchFabric = (o.fabric || '').toLowerCase().includes(currentSearch);
            const matchColours = (o.colours || []).join(' ').toLowerCase().includes(currentSearch);
            const matchStatus = (o.status || '').toLowerCase().includes(currentSearch);
            return matchId || matchCust || matchProd || matchStyle || matchFabric || matchColours || matchStatus;
        });
    }

    // 3. Advanced Filters
    if (currentAdvFilters.status) {
        filtered = filtered.filter(o => o.status === currentAdvFilters.status);
    }
    if (currentAdvFilters.priority) {
        filtered = filtered.filter(o => o.priority === currentAdvFilters.priority);
    }
    if (currentAdvFilters.customer) {
        filtered = filtered.filter(o => o.customerId === currentAdvFilters.customer);
    }
    if (currentAdvFilters.department) {
        filtered = filtered.filter(o => (o.department || '') === currentAdvFilters.department);
    }
    if (currentAdvFilters.dispatchDate) {
        filtered = filtered.filter(o => o.dispatchDate === currentAdvFilters.dispatchDate);
    }
    if (currentAdvFilters.paymentStatus) {
        filtered = filtered.filter(o => (o.paymentStatus || '') === currentAdvFilters.paymentStatus);
    }
    if (currentAdvFilters.dateFrom) {
        filtered = filtered.filter(o => new Date(o.deliveryDate) >= new Date(currentAdvFilters.dateFrom));
    }
    if (currentAdvFilters.dateTo) {
        filtered = filtered.filter(o => new Date(o.deliveryDate) <= new Date(currentAdvFilters.dateTo));
    }

    if (filtered.length === 0) {
        container.innerHTML = '<div class="p-md text-center text-secondary">No orders found</div>';
        const countEl = document.getElementById('orders-count');
        if (countEl) countEl.textContent = '0 Orders';
        return;
    }
    container.innerHTML = filtered.map(o => renderers.orderCard(o, isBulkMode, selectedOrders.has(o.id))).join('');
    const countEl = document.getElementById('orders-count');
    if (countEl) countEl.textContent = `${filtered.length} ${currentFilter === 'active' ? 'Active ' : currentFilter === 'completed' ? 'Completed ' : ''}Orders`;
}

window.toggleBulkMode = function() {
    isBulkMode = !isBulkMode;
    selectedOrders.clear();
    const toolbar = document.getElementById('bulk-actions-toolbar');
    const fab = document.getElementById('fab-container');
    const bottomNav = document.getElementById('bottom-nav-container');
    
    if (isBulkMode) {
        toolbar?.classList.remove('translate-y-full');
        fab?.classList.add('hidden');
        bottomNav?.classList.add('hidden');
    } else {
        toolbar?.classList.add('translate-y-full');
        fab?.classList.remove('hidden');
        bottomNav?.classList.remove('hidden');
    }
    
    updateBulkToolbar();
    renderOrders();
};

window.toggleOrderSelection = function(orderId) {
    if (selectedOrders.has(orderId)) {
        selectedOrders.delete(orderId);
    } else {
        selectedOrders.add(orderId);
    }
    updateBulkToolbar();
    renderOrders(); // Re-render to show checkbox state
};

window.selectAllOrders = function() {
    // Only select currently filtered items
    const container = document.getElementById('orders-list');
    if (!container) return;
    
    let filtered = currentOrders;
    if (currentFilter === 'active') filtered = filtered.filter(o => !['Delivered', 'Closed', 'Archived'].includes(o.status));
    else if (currentFilter === 'completed') filtered = filtered.filter(o => ['Delivered', 'Closed', 'Archived'].includes(o.status));
    else filtered = filtered.filter(o => o.status !== 'Archived');
    
    if (currentSearch) filtered = filtered.filter(o => o.id.toLowerCase().includes(currentSearch) || (o.customerName || '').toLowerCase().includes(currentSearch) || (o.product || '').toLowerCase().includes(currentSearch));
    
    if (selectedOrders.size === filtered.length && filtered.length > 0) {
        selectedOrders.clear(); // Deselect all
    } else {
        filtered.forEach(o => selectedOrders.add(o.id)); // Select all
    }
    updateBulkToolbar();
    renderOrders();
};

function updateBulkToolbar() {
    const countEl = document.getElementById('bulk-selected-count');
    if (countEl) countEl.textContent = `${selectedOrders.size} Selected`;
}

window.bulkArchive = async function() {
    if (selectedOrders.size === 0) return;
    window.showToast?.(`Archiving ${selectedOrders.size} orders...`, 'info');
    if (window.setLoading) window.setLoading('orders-list');
    
    try {
        for (const orderId of selectedOrders) {
            await api.archiveOrder(orderId);
        }
        window.showToast?.('Orders archived', 'success');
        window.toggleBulkMode(); // Exit bulk mode
        await loadOrders();
    } catch (e) {
        window.showToast?.('Failed to bulk archive', 'error');
    }
};

window.bulkDelete = async function() {
    if (selectedOrders.size === 0) return;
    window.showConfirmation({
        title: 'Bulk Delete',
        message: `Are you sure you want to permanently delete ${selectedOrders.size} orders?`,
        confirmText: 'Delete',
        onConfirm: async () => {
            window.showToast?.(`Deleting ${selectedOrders.size} orders...`, 'info');
            if (window.setLoading) window.setLoading('orders-list');
            try {
                for (const orderId of selectedOrders) {
                    await api.deleteOrder(orderId);
                }
                window.showToast?.('Orders deleted', 'success');
                window.toggleBulkMode();
                await loadOrders();
            } catch (e) {
                window.showToast?.('Failed to bulk delete', 'error');
            }
        }
    });
};

window.bulkExport = function() {
    if (selectedOrders.size === 0) return;
    window.showToast?.(`Exporting ${selectedOrders.size} orders to CSV...`, 'info');
    setTimeout(() => {
        window.showToast?.('Export complete', 'success');
        window.toggleBulkMode();
    }, 1000);
};

window.bulkPrint = function() {
    if (selectedOrders.size === 0) return;
    window.showToast?.(`Generating PDFs for ${selectedOrders.size} orders...`, 'info');
    setTimeout(() => {
        window.showToast?.('Ready for printing', 'success');
        window.toggleBulkMode();
        window.print();
    }, 1000);
};

window.bulkAssign = function() {
    if (selectedOrders.size === 0) return;
    // Simulate assigning to production
    window.showToast?.(`Assigning ${selectedOrders.size} orders to production...`, 'info');
    setTimeout(() => {
        window.showToast?.('Orders assigned', 'success');
        window.toggleBulkMode();
    }, 1000);
};

window.bulkApprove = async function() {
    if (selectedOrders.size === 0) return;
    window.showToast?.(`Approving ${selectedOrders.size} orders...`, 'info');
    if (window.setLoading) window.setLoading('orders-list');
    
    try {
        for (const orderId of selectedOrders) {
            const o = currentOrders.find(ord => ord.id === orderId);
            if (o && (o.status === 'Draft' || o.status === 'Quotation Sent' || o.status === 'Awaiting Approval')) {
                await api.updateOrderStatus(orderId, 'Approved');
            }
        }
        window.showToast?.('Orders approved', 'success');
        window.toggleBulkMode(); // Exit bulk mode
        await loadOrders();
    } catch (e) {
        window.showToast?.('Failed to bulk approve', 'error');
    }
};

window.openOrderDetails = async function(orderId) {
    activeOrder = currentOrders.find(o => o.id === orderId);
    if (!activeOrder) return;
    
    // Update DOM inside orderDetailsSheet
    document.getElementById('od-id').textContent = activeOrder.id;
    document.getElementById('od-customer').textContent = activeOrder.customerName;
    document.getElementById('od-status').textContent = activeOrder.status;
    document.getElementById('od-status').className = `inline-block mt-2 px-3 py-1 rounded-full text-[12px] font-medium ${activeOrder.statusColor || 'bg-surface-variant text-secondary'}`;
    
    document.getElementById('od-product').textContent = activeOrder.product || '—';
    document.getElementById('od-qty').textContent = activeOrder.qty ? activeOrder.qty.toLocaleString() : '—';
    document.getElementById('od-sizes').textContent = activeOrder.sizes ? activeOrder.sizes.join(', ') : '—';
    document.getElementById('od-colours').textContent = activeOrder.colours ? activeOrder.colours.join(', ') : '—';
    document.getElementById('od-delivery').textContent = activeOrder.deliveryDate || '—';
    document.getElementById('od-notes').textContent = activeOrder.notes || 'No notes.';

    // Financial calculations (Phase 9)
    const orderValue = activeOrder.value || 0;
    const incurredCost = activeOrder.incurredCost || 0;
    const currentProfit = orderValue - incurredCost;
    const profitPct = orderValue > 0 ? ((currentProfit / orderValue) * 100).toFixed(1) : 0;
    
    document.getElementById('od-incurred').textContent = `$${incurredCost.toLocaleString()}`;
    document.getElementById('od-profit-val').textContent = `$${currentProfit.toLocaleString()} (${profitPct}%)`;
    const quotedCost = activeOrder.quotedCost || 0;
    const odQuoted = document.getElementById('od-quoted');
    if (odQuoted) odQuoted.textContent = `$${quotedCost.toLocaleString()}`;
    const profitBar = document.getElementById('od-profit-bar');
    if (profitBar) {
        profitBar.style.width = `${Math.max(0, profitPct)}%`;
        if (profitPct < 15) {
            profitBar.className = 'h-full rounded-full transition-all duration-500 bg-error';
        } else if (profitPct < 30) {
            profitBar.className = 'h-full rounded-full transition-all duration-500 bg-warning';
        } else {
            profitBar.className = 'h-full rounded-full transition-all duration-500 bg-success';
        }
    }

    // Toggle Archive / Restore
    const archiveBtn = document.getElementById('od-btn-archive');
    const archiveIcon = document.getElementById('od-icon-archive');
    if (archiveBtn && archiveIcon) {
        if (activeOrder.status === 'Archived') {
            archiveBtn.setAttribute('onclick', 'window.restoreOrder()');
            archiveBtn.title = 'Restore Order';
            archiveIcon.textContent = 'unarchive';
        } else {
            archiveBtn.setAttribute('onclick', 'window.archiveOrder()');
            archiveBtn.title = 'Archive Order';
            archiveIcon.textContent = 'archive';
        }
    }



    // Order Metrics
    const today = new Date();
    const deliveryDate = new Date(activeOrder.deliveryDate);
    const diffTime = deliveryDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    document.getElementById('od-days-remaining').textContent = diffDays > 0 ? `${diffDays} days` : '0 days';
    
    let delayStr = 'On Track';
    if (diffDays < 0 && activeOrder.status !== 'Delivered' && activeOrder.status !== 'Closed') {
        delayStr = `${Math.abs(diffDays)} days delayed`;
        document.getElementById('od-delay').className = 'text-[16px] font-bold text-error';
    } else {
        document.getElementById('od-delay').className = 'text-[16px] font-bold text-[#008A00]';
    }
    document.getElementById('od-delay').textContent = delayStr;

    const outstanding = activeOrder.value ? (activeOrder.value - (activeOrder.amountPaid || 0)) : 0;
    document.getElementById('od-outstanding').textContent = outstanding > 0 ? `$${outstanding.toLocaleString()}` : '$0';
    
    const remainingQty = activeOrder.qty ? (activeOrder.qty - (activeOrder.qtyCompleted || 0)) : 0;
    document.getElementById('od-remaining-qty').textContent = remainingQty > 0 ? remainingQty.toLocaleString() : '0';

    // Production Progress Stepper
    const progressMap = {
        'Draft': 0, 'Quotation Sent': 5, 'Awaiting Approval': 10, 'Approved': 15,
        'Material Reserved': 20, 'Production Assigned': 25,
        'Knitting': 30, 'Dyeing': 35, 'Compacting': 40, 
        'Cutting': 45, 'Printing': 50, 'Embroidery': 55, 'Stitching': 65, 
        'Quality Check': 75, 'Packing': 85, 'Ready For Dispatch': 90, 
        'Dispatched': 95, 'Delivered': 100, 'Closed': 100
    };
    const currentProgress = progressMap[activeOrder.status] || 0;
    
    document.getElementById('od-progress-label').textContent = activeOrder.status;
    document.getElementById('od-progress-pct').textContent = currentProgress + '%';
    document.getElementById('od-progress-bar').style.width = currentProgress + '%';

    // Dynamic Workflow Engine
    const workflowTransitions = {
        'Draft': ['Quotation Sent', 'Approved'],
        'Quotation Sent': ['Awaiting Approval', 'Approved'],
        'Awaiting Approval': ['Approved', 'Draft'],
        'Approved': ['Material Reserved'],
        'Material Reserved': ['Production Assigned'],
        'Production Assigned': ['Knitting', 'Cutting'], // Branching
        'Knitting': ['Dyeing'],
        'Dyeing': ['Compacting'],
        'Compacting': ['Cutting'],
        'Cutting': ['Printing', 'Embroidery', 'Stitching'], // Branching
        'Printing': ['Stitching'],
        'Embroidery': ['Stitching'],
        'Stitching': ['Quality Check'],
        'Quality Check': ['Packing', 'Stitching'], // Allow send back to stitching
        'Packing': ['Ready For Dispatch'],
        'Ready For Dispatch': ['Dispatched'],
        'Dispatched': ['Delivered'],
        'Delivered': ['Closed']
    };
    
    const nextStatuses = workflowTransitions[activeOrder.status] || [];
    const actionsContainer = document.getElementById('od-status-actions');
    if (actionsContainer) {
        if (nextStatuses.length > 0) {
            actionsContainer.innerHTML = nextStatuses.map(status => `
                <button onclick="window.handleStatusTransition('${status}')" class="shrink-0 px-3 py-1.5 rounded-lg border border-outline-variant text-[12px] font-medium text-secondary active-bg whitespace-nowrap shadow-sm hover:bg-surface-container transition-colors">
                    Move to ${status}
                </button>
            `).join('');
        } else {
            actionsContainer.innerHTML = '<span class="text-[12px] text-secondary italic px-1">Workflow Completed</span>';
        }
    }

    // Render Timeline & Activity
    const timelineContainer = document.getElementById('od-timeline-container');
    const activityContainer = document.getElementById('od-activity-container');
    
    if (activeOrder.timeline) {
        const prodEvents = activeOrder.timeline.filter(e => e.type === 'status' || !e.type);
        const sysEvents = activeOrder.timeline.filter(e => e.type === 'system' || e.type === 'action');
        
        if (timelineContainer) {
            timelineContainer.innerHTML = prodEvents.map((evt, idx) => 
                TimelineEvent({
                    title: evt.title,
                    timestamp: evt.date,
                    user: evt.user,
                    type: evt.type,
                    status: 'completed',
                    isLast: idx === prodEvents.length - 1
                })
            ).join('');
            if (prodEvents.length === 0) timelineContainer.innerHTML = '<p class="text-secondary text-[13px] text-center p-4">No production timeline events.</p>';
        }
        
        if (activityContainer) {
            activityContainer.innerHTML = sysEvents.map((evt, idx) => 
                TimelineEvent({
                    title: evt.title,
                    timestamp: evt.date,
                    user: evt.user,
                    type: evt.type,
                    status: 'completed',
                    isLast: idx === sysEvents.length - 1
                })
            ).join('');
            if (sysEvents.length === 0) activityContainer.innerHTML = '<p class="text-secondary text-[13px] text-center p-4">No activity logged.</p>';
        }
    }

    // Render Tasks
    const tasksContainer = document.getElementById('od-tasks-container');
    if (tasksContainer && activeOrder.tasks) {
        tasksContainer.innerHTML = activeOrder.tasks.map(tsk => 
            TaskCard({
                id: tsk.id,
                title: tsk.title,
                status: tsk.status,
                assignee: tsk.assignee
            })
        ).join('');
        if (activeOrder.tasks.length === 0) {
            tasksContainer.innerHTML = '<p class="text-secondary text-[13px] text-center p-4">No tasks generated yet.</p>';
        }
    }

    window.openSheet('orderDetailsSheet');
    window.switchOrderTab('overview');
};

window.handleOrderAction = function(action) {
    if (!activeOrder) return;
    
    switch (action) {
        case 'Print Quote':
            window.showToast?.('Generating PDF...', 'info');
            setTimeout(() => window.showToast?.('Quote PDF downloaded', 'success'), 1000);
            break;
        case 'Generate Invoice':
            window.showToast?.('Invoice generation simulated', 'success');
            break;
        case 'Generate PO':
            window.showToast?.('Purchase Order simulated', 'success');
            break;
        case 'Assign Production':
            window.handleStatusTransition('Cutting');
            setTimeout(() => window.switchOrderTab('timeline'), 300); // Switch to timeline to show automation
            break;
        case 'View Timeline':
            window.switchOrderTab('timeline');
            break;
        case 'View Dispatch':
            window.showToast?.('Dispatch tracking coming soon', 'info');
            break;
        default:
            console.log('Action not mapped:', action);
    }
};

window.switchOrderTab = function(tabName) {
    // Hide all tabs
    document.querySelectorAll('.od-tab-content').forEach(el => el.classList.add('hidden'));
    // Reset all buttons
    ['overview', 'timeline', 'tasks', 'activity'].forEach(t => {
        const btn = document.getElementById(`od-tab-btn-${t}`);
        if (btn) {
            btn.className = `flex-1 pb-3 px-2 whitespace-nowrap text-[14px] font-medium border-b-2 ${t === tabName ? 'text-primary border-primary font-bold' : 'text-secondary border-transparent'}`;
        }
    });
    // Show active tab
    const activeTab = document.getElementById(`od-tab-${tabName}`);
    if (activeTab) activeTab.classList.remove('hidden');
};

window.toggleTaskStatus = async function(taskId) {
    if (!activeOrder) return;
    const task = activeOrder.tasks?.find(t => t.id === taskId);
    if (!task) return;

    task.status = task.status === 'Completed' ? 'Pending' : 'Completed';
    // Log timeline event for task
    if (!activeOrder.timeline) activeOrder.timeline = [];
    activeOrder.timeline.unshift({
        id: `t-${Date.now()}`,
        date: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date()),
        title: `Task "${task.title}" marked as ${task.status}`,
        user: 'Current User',
        type: 'system'
    });
    
    await loadOrders(); // Saves silently
    if (currentOrderTab === 'tasks') {
        renderTasksTab();
    }
    if (currentOrderTab === 'timeline') {
        renderTimelineTab();
    }
};

window.promptNewTask = async function() {
    if (!activeOrder) return;
    const title = prompt("Enter task title:");
    if (!title) return;
    const assignee = prompt("Assign to (e.g. Sales, QC):") || 'Unassigned';
    
    try {
        await api.addOrderTask(activeOrder.id, { title, assignee });
        window.showToast?.('Task added', 'success');
        await loadOrders();
        renderTasksTab();
    } catch (e) {
        window.showToast?.('Error adding task', 'error');
    }
};

window.handleStatusTransition = async function(newStatus) {
    if (!activeOrder) return;
    try {
        window.showToast?.(`Moving to ${newStatus}...`, 'info');
        await api.updateOrderStatus(activeOrder.id, newStatus);
        await loadOrders(); // Refresh lists
        window.openOrderDetails(activeOrder.id); // Re-render sheet
        window.showToast?.(`Status updated to ${newStatus}`, 'success');
    } catch (e) {
        window.showToast?.('Failed to update status', 'error');
    }
};

window.duplicateOrder = async function() {
    if (!activeOrder) return;
    window.closeSheet('orderDetailsSheet');
    if (window.setLoading) window.setLoading('orders-list');
    try {
        await api.duplicateOrder(activeOrder.id);
        window.showToast?.('Order duplicated', 'success');
        await loadOrders();
    } catch (e) {
        window.showToast?.('Failed to duplicate', 'error');
    }
};

window.archiveOrder = async function() {
    if (!activeOrder) return;
    window.closeSheet('orderDetailsSheet');
    if (window.setLoading) window.setLoading('orders-list');
    try {
        await api.archiveOrder(activeOrder.id);
        window.showToast?.('Order archived', 'success');
        await loadOrders();
    } catch (e) {
        window.showToast?.('Failed to archive', 'error');
    }
};

window.restoreOrder = async function() {
    if (!activeOrder) return;
    window.closeSheet('orderDetailsSheet');
    if (window.setLoading) window.setLoading('orders-list');
    try {
        const payload = { ...activeOrder, status: 'Draft' };
        await api.saveOrder(payload);
        window.showToast?.('Order restored', 'success');
        await loadOrders();
    } catch (e) {
        window.showToast?.('Failed to restore', 'error');
    }
};

window.deleteOrder = async function() {
    if (!activeOrder) return;
    window.closeSheet('orderDetailsSheet');
    if (window.setLoading) window.setLoading('orders-list');
    try {
        await api.deleteOrder(activeOrder.id);
        window.showToast?.('Order deleted', 'success');
        await loadOrders();
    } catch (e) {
        window.showToast?.('Failed to delete', 'error');
    }
};

// ==========================================
// WIZARD LOGIC & CALCULATIONS
// ==========================================
let currentWizardStep = 1;
const TOTAL_WIZARD_STEPS = 4;

window.goToOrderStep = function(dir) {
    const nextStep = currentWizardStep + dir;
    if (nextStep < 1 || nextStep > TOTAL_WIZARD_STEPS) return;

    // Hide all steps
    for (let i = 1; i <= TOTAL_WIZARD_STEPS; i++) {
        const stepEl = document.getElementById(`order-step-${i}`);
        const dotEl = document.getElementById(`wizard-dot-${i}`);
        if (stepEl) stepEl.classList.add('hidden');
        if (dotEl) {
            dotEl.className = i <= nextStep
                ? 'w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center z-10 font-bold text-[13px] shadow-sm transition-colors'
                : 'w-8 h-8 rounded-full bg-surface-container-highest text-secondary flex items-center justify-center z-10 font-bold text-[13px] transition-colors';
        }
    }

    // Show current step
    document.getElementById(`order-step-${nextStep}`).classList.remove('hidden');
    
    // Update progress bar
    const progressWidth = ((nextStep - 1) / (TOTAL_WIZARD_STEPS - 1)) * 100;
    document.getElementById('wizard-progress-bar').style.width = `${progressWidth}%`;

    // Update Footer Buttons
    document.getElementById('wizard-prev-btn').classList.toggle('hidden', nextStep === 1);
    document.getElementById('wizard-next-btn').classList.toggle('hidden', nextStep === TOTAL_WIZARD_STEPS);
    document.getElementById('create-order-submit').classList.toggle('hidden', nextStep !== TOTAL_WIZARD_STEPS);
    
    currentWizardStep = nextStep;
};

// Open wizard normally starts at step 1
window.openCreateWizard = function() {
    currentWizardStep = 1;
    // reset visual state
    window.goToOrderStep(0); 
    // Clear inputs (can use formHandler.resetForm if available, but manual is fine for mock)
    document.getElementById('createOrderSheet-content').querySelector('form').reset();
    document.getElementById('calc-subtotal').textContent = '$0.00';
    document.getElementById('calc-grandtotal').textContent = '$0.00';
    closeSheet('fabActionSheet'); 
    openSheet('createOrderSheet');
}

// Live Calculations listener setup (needs to be called after renderSheets)
function bindWizardCalculations() {
    const qtyInput = document.getElementById('create-qty');
    const priceInput = document.getElementById('create-price');
    const taxInput = document.getElementById('create-tax');
    
    const updateCalculations = () => {
        const qty = parseFloat(qtyInput.value) || 0;
        const price = parseFloat(priceInput.value) || 0;
        const tax = parseFloat(taxInput.value) || 0;
        
        const subtotal = qty * price;
        const grandTotal = subtotal + tax;
        
        document.getElementById('calc-subtotal').textContent = `$${subtotal.toFixed(2)}`;
        document.getElementById('calc-grandtotal').textContent = `$${grandTotal.toFixed(2)}`;
    };

    if (qtyInput) qtyInput.addEventListener('input', updateCalculations);
    if (priceInput) priceInput.addEventListener('input', updateCalculations);
    if (taxInput) taxInput.addEventListener('input', updateCalculations);
}

window.handleOrderAction = function(action) {
    window.showToast?.(`Action: ${action}`, 'info');
    // Implementation for PDF, Invoice generation would go here
};

window.editOrder = function() {
    if (!activeOrder) return;
    
    // Populate form fields
    document.getElementById('edit-customer').value = activeOrder.customerId || '';
    document.getElementById('edit-product').value = activeOrder.product || '';
    document.getElementById('edit-fabric').value = activeOrder.fabric || '';
    document.getElementById('edit-sizes').value = (activeOrder.sizes || []).join(', ');
    document.getElementById('edit-colours').value = (activeOrder.colours || []).join(', ');
    document.getElementById('edit-qty').value = activeOrder.qty || '';
    document.getElementById('edit-price').value = activeOrder.unitPrice || '';
    document.getElementById('edit-discount').value = activeOrder.discount || '';
    
    // Calculate back tax percentage if not saved explicitly (mock data setup doesn't have tax %)
    const taxPct = activeOrder.tax && activeOrder.subtotal ? (activeOrder.tax / activeOrder.subtotal) * 100 : 5;
    document.getElementById('edit-tax').value = taxPct;
    
    document.getElementById('edit-date').value = activeOrder.deliveryDate || '';
    document.getElementById('edit-priority').value = activeOrder.priority || 'Normal';
    document.getElementById('edit-factory').value = activeOrder.factory || '';
    document.getElementById('edit-notes').value = activeOrder.notes || '';
    
    window.closeSheet('orderDetailsSheet');
    window.openSheet('editOrderSheet');
};

function bindOrderSubmissions() {
    // Create Submission
    const createSubmit = document.getElementById('create-order-submit');
    if (createSubmit) {
        createSubmit.addEventListener('click', async () => {
            const btn = createSubmit;
            const originalText = btn.innerHTML;
            btn.innerHTML = '<span class="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>';
            
            try {
                const subtotal = (parseFloat(document.getElementById('create-qty').value) || 0) * (parseFloat(document.getElementById('create-price').value) || 0);
                const tax = subtotal * ((parseFloat(document.getElementById('create-tax').value) || 0) / 100);
                
                const payload = {
                    customerId: document.getElementById('create-customer').value,
                    customerName: document.getElementById('create-customer').options[document.getElementById('create-customer').selectedIndex]?.text,
                    costingId: document.getElementById('create-quote').value,
                    product: document.getElementById('create-product').value,
                    fabric: document.getElementById('create-fabric').value,
                    sizes: document.getElementById('create-sizes').value.split(',').map(s => s.trim()).filter(Boolean),
                    colours: document.getElementById('create-colours').value.split(',').map(s => s.trim()).filter(Boolean),
                    qty: parseFloat(document.getElementById('create-qty').value) || 0,
                    unitPrice: parseFloat(document.getElementById('create-price').value) || 0,
                    discount: parseFloat(document.getElementById('create-discount').value) || 0,
                    subtotal,
                    tax,
                    grandTotal: subtotal + tax,
                    deliveryDate: document.getElementById('create-date').value,
                    status: document.getElementById('create-status').value || 'Draft',
                    priority: document.getElementById('create-priority').value,
                    notes: document.getElementById('create-notes').value
                };
                
                await api.saveOrder(payload);
                window.closeSheet('createOrderSheet');
                window.showToast?.('Order created successfully', 'success');
                await loadOrders();
            } catch (e) {
                window.showToast?.('Failed to save order', 'error');
                btn.innerHTML = originalText;
            }
        });
    }

    // Edit Submission
    const editSubmit = document.getElementById('edit-order-submit');
    if (editSubmit) {
        editSubmit.addEventListener('click', async () => {
            if (!activeOrder) return;
            const btn = editSubmit;
            const originalText = btn.innerHTML;
            btn.innerHTML = '<span class="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>';
            
            try {
                const subtotal = (parseFloat(document.getElementById('edit-qty').value) || 0) * (parseFloat(document.getElementById('edit-price').value) || 0);
                const tax = subtotal * ((parseFloat(document.getElementById('edit-tax').value) || 0) / 100);
                const discount = parseFloat(document.getElementById('edit-discount').value) || 0;
                
                const payload = {
                    ...activeOrder, // Keep existing timeline, tasks, statuses
                    customerId: document.getElementById('edit-customer').value,
                    customerName: document.getElementById('edit-customer').options[document.getElementById('edit-customer').selectedIndex]?.text,
                    product: document.getElementById('edit-product').value,
                    fabric: document.getElementById('edit-fabric').value,
                    sizes: document.getElementById('edit-sizes').value.split(',').map(s => s.trim()).filter(Boolean),
                    colours: document.getElementById('edit-colours').value.split(',').map(s => s.trim()).filter(Boolean),
                    qty: parseFloat(document.getElementById('edit-qty').value) || 0,
                    unitPrice: parseFloat(document.getElementById('edit-price').value) || 0,
                    discount: discount,
                    subtotal,
                    tax,
                    grandTotal: subtotal + tax - discount,
                    deliveryDate: document.getElementById('edit-date').value,
                    priority: document.getElementById('edit-priority').value,
                    factory: document.getElementById('edit-factory').value,
                    notes: document.getElementById('edit-notes').value
                };
                
                await api.saveOrder(payload);
                window.closeSheet('editOrderSheet');
                window.showToast?.('Order updated successfully', 'success');
                await loadOrders();
            } catch (e) {
                window.showToast?.('Failed to update order', 'error');
                btn.innerHTML = originalText;
            }
        });
    }
}

async function renderSheets() {
    const sheetsContainer = document.getElementById('sheets-container');
    if (!sheetsContainer) return;

    const sheetsHTML = await getOrderSheetsHTML();
    const detailsHTML = getOrderDetailsHTML();



    const addExpenseContent = `
        <div class="flex flex-col gap-4">
            <div class="flex flex-col gap-1.5">
                <label class="text-[13px] font-medium text-on-surface ml-1">Expense Type</label>
                <select id="expense-type" class="w-full h-12 px-4 rounded-xl bg-surface-container-lowest border border-outline-variant text-[15px] focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all">
                    <option value="Material">Material (Fabric/Yarn)</option>
                    <option value="Stitching">Stitching Labor</option>
                    <option value="Printing">Printing / Embroidery</option>
                    <option value="Overhead">Factory Overhead</option>
                    <option value="Shipping">Logistics</option>
                </select>
            </div>
            <div class="flex flex-col gap-1.5">
                <label class="text-[13px] font-medium text-on-surface ml-1">Amount ($)</label>
                <input type="number" id="expense-amount" class="w-full h-12 px-4 rounded-xl bg-surface-container-lowest border border-outline-variant text-[15px] focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" placeholder="e.g. 500.00" required>
            </div>
            <div class="flex flex-col gap-1.5">
                <label class="text-[13px] font-medium text-on-surface ml-1">Notes</label>
                <input type="text" id="expense-notes" class="w-full h-12 px-4 rounded-xl bg-surface-container-lowest border border-outline-variant text-[15px] focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" placeholder="Optional details">
            </div>
        </div>
    `;
    const addExpenseFooter = `
        <button id="submit-expense-btn" class="w-full bg-primary text-on-primary font-bold text-[15px] py-3.5 rounded-2xl active-scale transition-apple">
            Save Expense
        </button>
    `;

    // Render Sheets
    sheetsContainer.innerHTML = [
        BottomSheet({ id: 'fabActionSheet', title: 'Order Actions', content: sheetsHTML.fabActionContent, height: 'auto' }),
        BottomSheet({ id: 'createOrderSheet', title: 'Create Order', content: sheetsHTML.createOrderContent, footerContent: sheetsHTML.createOrderFooter, isForm: true }),
        BottomSheet({ id: 'orderDetailsSheet', customHeader: detailsHTML.orderDetailsHeader, content: detailsHTML.orderDetailsContent, footerContent: detailsHTML.orderDetailsFooter, height: '90vh' }),
        BottomSheet({ id: 'editOrderSheet', title: 'Edit Order', content: sheetsHTML.editOrderContent, footerContent: sheetsHTML.editOrderFooter, height: '90vh', isForm: true }),
        BottomSheet({ id: 'addExpenseSheet', title: 'Log Expense', content: addExpenseContent, footerContent: addExpenseFooter, height: 'auto' }),
        BottomSheet({ id: 'filterOrderSheet', customHeader: sheetsHTML.filterOrderHeader, content: sheetsHTML.filterOrderContent, footerContent: sheetsHTML.filterOrderFooter, height: 'auto' }),
        BottomSheet({ id: 'importOrderSheet', title: 'Import Orders', content: sheetsHTML.importOrderContent, footerContent: sheetsHTML.importOrderFooter, height: 'auto' })
    ].join('');
    
    // Bind logic for Submit Expense
    document.getElementById('submit-expense-btn')?.addEventListener('click', async () => {
        if (!activeOrder) return;
        const amt = document.getElementById('expense-amount').value;
        if (!amt || isNaN(amt)) {
            window.showToast?.('Please enter a valid amount', 'error');
            return;
        }
        window.closeSheet('addExpenseSheet');
        try {
            await api.addOrderExpense(activeOrder.id, {
                type: document.getElementById('expense-type').value,
                amount: amt,
                notes: document.getElementById('expense-notes').value
            });
            window.showToast?.('Expense logged successfully', 'success');
            // Re-render
            await loadOrders();
            window.openOrderDetails(activeOrder.id);
            document.getElementById('expense-amount').value = '';
            document.getElementById('expense-notes').value = '';
        } catch (e) {
            window.showToast?.('Failed to log expense', 'error');
        }
    });

    if (window.bindFormValidation) {
        window.bindFormValidation('createOrderSheet', 'create-order-submit');
        window.bindFormValidation('editOrderSheet', 'edit-order-submit');
    }

    // Bind live wizard calculations
    bindWizardCalculations();
    bindOrderSubmissions();
    
    // Bind Auto-Fill for Quote Linking
    const quoteSelect = document.getElementById('create-quote');
    if (quoteSelect) {
        quoteSelect.addEventListener('change', async (e) => {
            const quoteId = e.target.value;
            if (!quoteId) return;
            const quote = await api.getCostingById(quoteId);
            if (quote) {
                document.getElementById('create-product').value = quote.styleRef || '';
                // Auto calculate value based on expected retail price
                const qtyInput = document.getElementById('create-qty');
                if (qtyInput && qtyInput.value) {
                    document.getElementById('create-price').value = (quote.retailPrice * parseInt(qtyInput.value)).toFixed(2);
                }
                
                // If the user types quantity AFTER selecting quote
                qtyInput.addEventListener('input', (ev) => {
                    const q = parseInt(ev.target.value);
                    if (!isNaN(q)) {
                        document.getElementById('create-price').value = (quote.retailPrice * q).toFixed(2);
                    }
                });
            }
        });
    }

}

window.applyOrderFilters = function() {
    currentAdvFilters = {
        status: document.getElementById('filter-status').value,
        priority: document.getElementById('filter-priority').value,
        customer: document.getElementById('filter-customer')?.value || '',
        department: document.getElementById('filter-department')?.value || '',
        dispatchDate: document.getElementById('filter-dispatch-date')?.value || '',
        paymentStatus: document.getElementById('filter-payment-status')?.value || '',
        dateFrom: document.getElementById('filter-date-from').value,
        dateTo: document.getElementById('filter-date-to').value
    };
    renderOrders();
    window.closeSheet('filterOrderSheet');
    window.showToast?.('Filters applied', 'success');
};

window.resetOrderFilters = function() {
    currentAdvFilters = {
        status: '',
        priority: '',
        customer: '',
        department: '',
        dispatchDate: '',
        paymentStatus: '',
        dateFrom: '',
        dateTo: ''
    };
    
    document.getElementById('filter-status').value = '';
    document.getElementById('filter-priority').value = '';
    if (document.getElementById('filter-customer')) document.getElementById('filter-customer').value = '';
    if (document.getElementById('filter-department')) document.getElementById('filter-department').value = '';
    if (document.getElementById('filter-dispatch-date')) document.getElementById('filter-dispatch-date').value = '';
    if (document.getElementById('filter-payment-status')) document.getElementById('filter-payment-status').value = '';
    document.getElementById('filter-date-from').value = '';
    document.getElementById('filter-date-to').value = '';
    renderOrders();
    window.closeSheet('filterOrderSheet');
    window.showToast?.('Filters reset', 'info');
};

window.duplicateFlow = function() {
    let orderToDup = null;
    if (selectedOrders.size > 0) {
        const idToDup = Array.from(selectedOrders)[0];
        orderToDup = currentOrders.find(o => o.id === idToDup);
    } else if (activeOrder) {
        orderToDup = activeOrder;
    }
    
    if (orderToDup) {
        document.getElementById('create-customer').value = orderToDup.customerId || '';
        document.getElementById('create-product').value = orderToDup.product + ' (Copy)' || '';
        document.getElementById('create-fabric').value = orderToDup.fabric || '';
        document.getElementById('create-sizes').value = (orderToDup.sizes || []).join(', ');
        document.getElementById('create-colours').value = (orderToDup.colours || []).join(', ');
        document.getElementById('create-qty').value = orderToDup.qty || '';
        document.getElementById('create-price').value = orderToDup.value ? (orderToDup.value / orderToDup.qty) : '';
        document.getElementById('create-discount').value = '';
        document.getElementById('create-tax').value = '';
        document.getElementById('create-date').value = orderToDup.deliveryDate || '';
        document.getElementById('create-status').value = 'Draft';
        document.getElementById('create-priority').value = orderToDup.priority || 'Normal';
        document.getElementById('create-notes').value = orderToDup.notes || '';
        
        window.openCreateWizard();
        window.openSheet('createOrderSheet');
    } else {
        window.showToast?.('Please select an order to duplicate', 'error');
    }
};

window.createSampleOrder = function() {
    document.getElementById('create-customer').value = '';
    document.getElementById('create-product').value = 'Sample - ';
    document.getElementById('create-fabric').value = '';
    document.getElementById('create-sizes').value = '';
    document.getElementById('create-colours').value = '';
    document.getElementById('create-qty').value = '1';
    document.getElementById('create-price').value = '0';
    document.getElementById('create-discount').value = '0';
    document.getElementById('create-tax').value = '0';
    document.getElementById('create-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('create-status').value = 'Draft';
    document.getElementById('create-priority').value = 'Normal';
    document.getElementById('create-notes').value = 'Pre-production sample request.';
    
    window.openCreateWizard();
    window.openSheet('createOrderSheet');
};

window.createDraftOrder = async function() {
    if (window.setLoading) window.setLoading('orders-list');
    try {
        const newOrder = {
            id: 'ORD-' + Math.floor(1000 + Math.random() * 9000),
            customerId: 'cust-001',
            customerName: 'Acme Corp',
            product: 'Quick Draft',
            qty: 0,
            value: 0,
            status: 'Draft',
            deliveryDate: new Date().toISOString().split('T')[0]
        };
        await api.createOrder(newOrder);
        window.showToast?.('Draft order created', 'success');
        await loadOrders();
    } catch (e) {
        window.showToast?.('Failed to create draft', 'error');
    }
};

window.importOrders = function() {
    const fileInput = document.getElementById('import-file-upload');
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        window.showToast?.('Please select a file to import', 'error');
        return;
    }
    
    const importBtn = document.getElementById('import-submit-btn');
    if (importBtn) {
        importBtn.textContent = 'Importing...';
        importBtn.disabled = true;
    }
    
    setTimeout(async () => {
        const newOrder = {
            id: 'ORD-' + Math.floor(1000 + Math.random() * 9000),
            customerId: 'cust-002',
            customerName: 'Globex Inc',
            product: 'Imported Garments',
            qty: 500,
            value: 12500,
            status: 'Draft',
            deliveryDate: new Date().toISOString().split('T')[0]
        };
        await api.createOrder(newOrder);
        
        window.showToast?.('1 Order successfully imported!', 'success');
        window.closeSheet('importOrderSheet');
        if (importBtn) {
            importBtn.textContent = 'Import Orders';
            importBtn.disabled = false;
        }
        await loadOrders();
    }, 1500);
};
