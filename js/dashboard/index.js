// js/dashboard/index.js — Main Operational Command Center Controller
import { KMSCommandBar } from './kms.js?v=5.4';
import { DashboardCharts } from './charts.js?v=5.4';
import { renderHealthMatrix, renderAnomalyWidget } from './components.js?v=5.4';
import { api } from '../services/api.js?v=5.4';
import { renderers } from '../renderers.js?v=5.4';

let kmsInstance = null;
let telemetryPollInterval = null;

document.addEventListener('DOMContentLoaded', () => {
    updateGreeting();
    kmsInstance = new KMSCommandBar();
    
    // Bind KMS launcher button if present
    const kmsBtn = document.getElementById('kms-trigger-btn');
    if (kmsBtn) {
        kmsBtn.addEventListener('click', () => kmsInstance.open());
    }

    // Initial Telemetry Load
    loadDashboardTelemetry();

    // Adaptive SWR Polling (every 10 seconds)
    telemetryPollInterval = setInterval(loadDashboardTelemetry, 10000);
});

function updateGreeting() {
    const greetingEl = document.getElementById('dashboard-greeting');
    if (!greetingEl) return;
    const hour = new Date().getHours();
    let greet = 'Good morning';
    if (hour >= 12 && hour < 17) greet = 'Good afternoon';
    else if (hour >= 17) greet = 'Good evening';
    greetingEl.textContent = `${greet}, Udhayaa`;
}

async function loadDashboardTelemetry() {
    try {
        // Fetch Telemetry & Core ERP Datasets in Parallel
        const [telemetry, orders, batches] = await Promise.all([
            fetchTelemetryData(),
            api.getOrders().catch(() => []),
            api.getBatches().catch(() => [])
        ]);

        renderKPIs(telemetry.metrics || {});
        renderHealthMatrixContainer(telemetry.matrix || {});
        renderAnomalyWidgetContainer(telemetry.anomalies || []);
        renderCharts(telemetry.metrics || {});

        if (orders && orders.length > 0) {
            renderRecentOrders(orders.slice(0, 5));
            renderActivityFeed(orders);
        }

        if (batches && batches.length > 0) {
            renderActiveBatches(batches.slice(0, 3));
        }
    } catch (err) {
        console.error('Dashboard telemetry error:', err);
    }
}

async function fetchTelemetryData() {
    try {
        const res = await fetch('/api/telemetry/dashboard');
        if (res.ok) {
            const data = await res.json();
            if (data && data.success) return data;
        }
    } catch (e) { /* fallback to direct API calculations */ }

    // Fallback calculation via API
    const [billings, inventory, orders] = await Promise.all([
        api.getBillings().catch(() => []),
        api.getInventory().catch(() => []),
        api.getOrders().catch(() => [])
    ]);

    let sales = 0;
    let expenses = 0;
    let quotes = 0;

    billings.forEach(b => {
        if (b.status === 'Void') return;
        if (b.transaction_type === 'Sales_Bill') sales += (b.grand_total || 0);
        else if (b.transaction_type === 'Purchase_Bill' || b.transaction_type === 'Payment_Out') expenses += (b.grand_total || 0);
        else if (b.transaction_type === 'Quotation') quotes++;
    });

    const stockValue = inventory.reduce((sum, i) => sum + (i.totalValue || 0), 0);
    
    const matrix = {
        'Draft': 0, 'Quotation Sent': 0, 'Approved': 0, 'Material Reserved': 0,
        'Knitting': 0, 'Cutting': 0, 'Stitching': 0, 'QC Audit': 0, 'Dispatched': 0
    };
    orders.forEach(o => {
        if (matrix[o.status] !== undefined) matrix[o.status]++;
    });

    return {
        metrics: {
            totalSales: sales,
            totalExpenses: expenses,
            quotationsCount: quotes,
            inventoryValue: stockValue,
            activeOrders: orders.filter(o => o.status !== 'Fulfilled').length
        },
        matrix,
        anomalies: stockValue > 500000 ? [{
            id: 'anom-1',
            metric: 'High Inventory Holding',
            currentValue: `₹${Math.round(stockValue).toLocaleString()}`,
            severity: 'MEDIUM',
            message: 'Total fabric & SKU holding value is above baseline threshold.'
        }] : []
    };
}

function renderKPIs(metrics) {
    const container = document.getElementById('dashboard-metrics');
    if (!container) return;

    const sales = metrics.totalSales || 0;
    const expenses = metrics.totalExpenses || 0;
    const netProfit = sales - expenses;
    const activeOrders = metrics.activeOrders || 0;
    const stockVal = metrics.inventoryValue || 0;

    container.innerHTML = `
        <div class="bg-surface-container-lowest border border-outline-variant/60 rounded-3xl p-4 shadow-sm flex flex-col justify-between">
            <div class="flex items-center justify-between">
                <span class="text-[12px] font-semibold text-secondary uppercase tracking-wider">Revenue</span>
                <div class="w-8 h-8 rounded-xl bg-[#00B386]/10 text-[#00B386] flex items-center justify-center">
                    <span class="material-symbols-outlined text-[18px]">payments</span>
                </div>
            </div>
            <div class="mt-3">
                <div class="text-[22px] font-extrabold font-mono text-on-surface">₹${sales.toLocaleString()}</div>
                <div class="text-[11px] font-medium text-[#00B386] mt-0.5">Live Invoiced</div>
            </div>
        </div>

        <div class="bg-surface-container-lowest border border-outline-variant/60 rounded-3xl p-4 shadow-sm flex flex-col justify-between">
            <div class="flex items-center justify-between">
                <span class="text-[12px] font-semibold text-secondary uppercase tracking-wider">Net Profit</span>
                <div class="w-8 h-8 rounded-xl ${netProfit >= 0 ? 'bg-[#008A00]/10 text-[#008A00]' : 'bg-error/10 text-error'} flex items-center justify-center">
                    <span class="material-symbols-outlined text-[18px]">account_balance</span>
                </div>
            </div>
            <div class="mt-3">
                <div class="text-[22px] font-extrabold font-mono text-on-surface">₹${netProfit.toLocaleString()}</div>
                <div class="text-[11px] font-medium ${netProfit >= 0 ? 'text-[#008A00]' : 'text-error'} mt-0.5">${netProfit >= 0 ? '+ Run Rate' : '- Deficit'}</div>
            </div>
        </div>

        <div class="bg-surface-container-lowest border border-outline-variant/60 rounded-3xl p-4 shadow-sm flex flex-col justify-between">
            <div class="flex items-center justify-between">
                <span class="text-[12px] font-semibold text-secondary uppercase tracking-wider">Active WIP</span>
                <div class="w-8 h-8 rounded-xl bg-[#0071E3]/10 text-[#0071E3] flex items-center justify-center">
                    <span class="material-symbols-outlined text-[18px]">precision_manufacturing</span>
                </div>
            </div>
            <div class="mt-3">
                <div class="text-[22px] font-extrabold font-mono text-on-surface">${activeOrders} Orders</div>
                <div class="text-[11px] font-medium text-[#0071E3] mt-0.5">In Floor Lifecycle</div>
            </div>
        </div>

        <div class="bg-surface-container-lowest border border-outline-variant/60 rounded-3xl p-4 shadow-sm flex flex-col justify-between">
            <div class="flex items-center justify-between">
                <span class="text-[12px] font-semibold text-secondary uppercase tracking-wider">Stock Valuation</span>
                <div class="w-8 h-8 rounded-xl bg-[#FF9F0A]/10 text-[#FF9F0A] flex items-center justify-center">
                    <span class="material-symbols-outlined text-[18px]">inventory_2</span>
                </div>
            </div>
            <div class="mt-3">
                <div class="text-[22px] font-extrabold font-mono text-on-surface">₹${stockVal.toLocaleString()}</div>
                <div class="text-[11px] font-medium text-[#FF9F0A] mt-0.5">Yarn & Fabric Assets</div>
            </div>
        </div>
    `;
}

function renderHealthMatrixContainer(matrix) {
    const el = document.getElementById('dashboard-health-matrix');
    if (el) el.innerHTML = renderHealthMatrix(matrix);
}

function renderAnomalyWidgetContainer(anomalies) {
    const el = document.getElementById('dashboard-anomaly-widget');
    if (el) el.innerHTML = renderAnomalyWidget(anomalies);
}

function renderCharts(metrics) {
    DashboardCharts.renderRunRateChart('runRateCanvas', {
        sales: metrics.totalSales || 480000,
        expenses: metrics.totalExpenses || 310000
    });
    DashboardCharts.renderCapacityHeatmap('capacityHeatmapContainer');
}

function renderRecentOrders(orders) {
    const container = document.getElementById('dashboard-recent-orders');
    if (!container) return;
    container.innerHTML = orders.map(o => renderers.dashboardOrderCard(o)).join('');
}

function renderActiveBatches(batches) {
    const container = document.getElementById('dashboard-active-batches');
    if (!container) return;
    container.innerHTML = batches.map(b => renderers.dashboardBatchCard(b)).join('');
}

function renderActivityFeed(orders) {
    const activityFeed = document.getElementById('dashboard-activity-feed');
    if (!activityFeed) return;

    const activities = [];
    orders.forEach(o => {
        let timeline = o.timeline;
        if (typeof timeline === 'string') {
            try { timeline = JSON.parse(timeline); } catch (e) { timeline = []; }
        }
        if (Array.isArray(timeline)) {
            timeline.forEach(t => {
                activities.push({
                    title: t.status || t.title || 'Order Update',
                    message: `Order ${o.id} (${o.product}) - ${t.title || t.status}`,
                    timestamp: new Date(t.timestamp || t.date || Date.now()),
                    user: t.user || 'System'
                });
            });
        }
    });

    activities.sort((a, b) => b.timestamp - a.timestamp);
    const recent = activities.slice(0, 3);

    if (recent.length === 0) {
        activityFeed.innerHTML = '<p class="text-secondary text-sm p-4">No recent activity logged.</p>';
    } else {
        activityFeed.innerHTML = recent.map(act => `
            <div class="relative pl-6">
                <div class="absolute -left-[9px] top-0.5 w-4 h-4 rounded-full bg-primary ring-4 ring-white"></div>
                <div class="mb-1">
                    <span class="text-body-bold text-on-surface">${act.title}</span>
                </div>
                <p class="text-body text-secondary leading-snug">${act.message}</p>
                <span class="text-caption text-secondary mt-1 block">Recently • by ${act.user}</span>
            </div>
        `).join('');
    }
}
