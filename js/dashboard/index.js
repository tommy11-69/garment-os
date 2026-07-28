import { dashboardStore } from '../stores/DashboardStore.js';
import { renderers } from '../renderers.js';
import { MetricCard } from '../components/index.js';

document.addEventListener('DOMContentLoaded', () => {
    initUI();
    dashboardStore.subscribe(renderUI);
    dashboardStore.loadDashboardData();
});

function initUI() {
    const metricsContainer = document.getElementById('dashboard-metrics');
    if (metricsContainer) {
        metricsContainer.innerHTML = `
            ${MetricCard({ title: 'Revenue', icon: 'payments', value: '$1.2M', trend: 'up', trendValue: '+12%', iconColorClass: 'bg-accent-primary-light text-[#0071E3]', trendColorClass: 'text-[#008A00]' })}
            ${MetricCard({ title: 'Profit', icon: 'account_balance', value: '$428K', trend: 'up', trendValue: '+8%', iconColorClass: 'bg-[#008A00]/10 text-[#008A00]', trendColorClass: 'text-[#008A00]' })}
            ${MetricCard({ title: 'Orders', icon: 'receipt_long', value: '42', trend: 'neutral', trendValue: '3 need attention', iconColorClass: 'bg-surface-container text-on-surface', trendColorClass: 'text-secondary' })}
            ${MetricCard({ title: 'Capacity', icon: 'precision_manufacturing', value: '88%', trend: 'neutral', trendValue: '', iconColorClass: 'bg-[#FF9F0A]/10 text-[#FF9F0A]', trendColorClass: '' })}
        `;
    }
}

function renderUI(state) {
    const { dashboardData, loading, error } = state;
    const { orders, batches } = dashboardData;
    
    const ordersContainer = document.getElementById('dashboard-recent-orders');
    const batchesContainer = document.getElementById('dashboard-active-batches');
    if (!ordersContainer || !batchesContainer) return;

    if (loading) {
        if (window.setLoading) {
            window.setLoading('dashboard-recent-orders');
            window.setLoading('dashboard-active-batches');
        } else {
            ordersContainer.innerHTML = '<div class="p-md text-center text-secondary">Loading...</div>';
            batchesContainer.innerHTML = '<div class="p-md text-center text-secondary">Loading...</div>';
        }
    } else if (error) {
        ordersContainer.innerHTML = `<div class="p-md text-center text-error">Failed to load data: ${error.message}</div>`;
        batchesContainer.innerHTML = `<div class="p-md text-center text-error">Failed to load data</div>`;
    } else {
        ordersContainer.innerHTML = orders.map(o => renderers.dashboardOrderCard(o)).join('');
        batchesContainer.innerHTML = batches.map(b => renderers.dashboardBatchCard(b)).join('');
    }
}
