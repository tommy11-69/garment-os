import { dashboardStore } from '../stores/DashboardStore.js';
import { renderers } from '../renderers.js';
import { MetricCard } from '../components/index.js';

document.addEventListener('DOMContentLoaded', () => {
    updateGreeting();
    dashboardStore.subscribe(renderUI);
    dashboardStore.loadDashboardData();
});

function updateGreeting() {
    const greetingEl = document.getElementById('dashboard-greeting');
    if (!greetingEl) return;
    const hour = new Date().getHours();
    let greet = 'Good morning';
    if (hour >= 12 && hour < 17) greet = 'Good afternoon';
    else if (hour >= 17) greet = 'Good evening';
    greetingEl.textContent = `${greet}, Michael`;
}

function renderUI(state) {
    const { dashboardData, loading, error } = state;
    const { orders, batches, kpis } = dashboardData;
    
    const ordersContainer = document.getElementById('dashboard-recent-orders');
    const batchesContainer = document.getElementById('dashboard-active-batches');
    const metricsContainer = document.getElementById('dashboard-metrics');
    
    if (loading) {
        if (window.setLoading) {
            window.setLoading('dashboard-recent-orders');
            window.setLoading('dashboard-active-batches');
        } else {
            if (ordersContainer) ordersContainer.innerHTML = '<div class="p-md text-center text-secondary">Loading...</div>';
            if (batchesContainer) batchesContainer.innerHTML = '<div class="p-md text-center text-secondary">Loading...</div>';
        }
        return;
    }

    if (error) {
        if (ordersContainer) ordersContainer.innerHTML = `<div class="p-md text-center text-error">Failed to load data</div>`;
        if (batchesContainer) batchesContainer.innerHTML = `<div class="p-md text-center text-error">Failed to load data</div>`;
        return;
    }

    // 1. Render Metrics dynamically
    if (metricsContainer && kpis) {
        // Calculate average production capacity from batches progress
        const avgProgress = batches && batches.length > 0 
            ? Math.round(batches.reduce((sum, b) => sum + (b.progressPercentage || 0), 0) / batches.length)
            : 0;

        metricsContainer.innerHTML = `
            ${MetricCard({ 
                title: 'Revenue', 
                icon: 'payments', 
                value: `₹${(kpis.revenue || 0).toLocaleString()}`, 
                trend: 'up', 
                trendValue: 'This Month', 
                iconColorClass: 'bg-accent-primary-light text-[#0071E3]', 
                trendColorClass: 'text-[#008A00]' 
            })}
            ${MetricCard({ 
                title: 'Profit', 
                icon: 'account_balance', 
                value: `₹${(kpis.profit || 0).toLocaleString()}`, 
                trend: kpis.profit >= 0 ? 'up' : 'down', 
                trendValue: 'This Month', 
                iconColorClass: 'bg-[#008A00]/10 text-[#008A00]', 
                trendColorClass: kpis.profit >= 0 ? 'text-[#008A00]' : 'text-error' 
            })}
            ${MetricCard({ 
                title: 'Active Orders', 
                icon: 'receipt_long', 
                value: `${kpis.activeOrders || 0}`, 
                trend: 'neutral', 
                trendValue: 'In production pipeline', 
                iconColorClass: 'bg-surface-container text-on-surface', 
                trendColorClass: 'text-secondary' 
            })}
            ${MetricCard({ 
                title: 'Prod. Progress', 
                icon: 'precision_manufacturing', 
                value: `${avgProgress}%`, 
                trend: 'neutral', 
                trendValue: 'Avg Batch Progress', 
                iconColorClass: 'bg-[#FF9F0A]/10 text-[#FF9F0A]', 
                trendColorClass: '' 
            })}
        `;
    }

    // 2. Render lists
    if (ordersContainer && orders) {
        ordersContainer.innerHTML = orders.map(o => renderers.dashboardOrderCard(o)).join('');
    }
    if (batchesContainer && batches) {
        batchesContainer.innerHTML = batches.map(b => renderers.dashboardBatchCard(b)).join('');
    }

    // 3. Generate and Render Recent Activity from orders timeline
    const activities = [];
    if (orders) {
        orders.forEach(o => {
            if (o.timeline) {
                o.timeline.forEach(t => {
                    activities.push({
                        title: t.status || t.title || 'Order Update',
                        message: `Order ${o.id} (${o.product}) - ${t.title || t.status}`,
                        timestamp: new Date(t.timestamp || t.date),
                        user: t.user || 'System'
                    });
                });
            }
        });
    }

    // Sort activities by timestamp (newest first)
    activities.sort((a,b) => b.timestamp - a.timestamp);
    const recentActivities = activities.slice(0, 3);

    const activityFeed = document.getElementById('dashboard-activity-feed');
    if (activityFeed) {
        if (recentActivities.length === 0) {
            activityFeed.innerHTML = '<p class="text-secondary text-sm p-4">No recent activity logged.</p>';
        } else {
            activityFeed.innerHTML = recentActivities.map(act => {
                const timeDiff = Math.floor((new Date() - act.timestamp) / 60000); // in minutes
                let timeStr = `${timeDiff}m ago`;
                if (timeDiff >= 60) {
                    const hrs = Math.floor(timeDiff / 60);
                    timeStr = `${hrs}h ago`;
                    if (hrs >= 24) {
                        timeStr = `${Math.floor(hrs/24)}d ago`;
                    }
                } else if (timeDiff < 1) {
                    timeStr = 'Just now';
                }
                
                return `
                    <div class="relative pl-6">
                        <div class="absolute -left-[9px] top-0.5 w-4 h-4 rounded-full bg-primary ring-4 ring-white"></div>
                        <div class="mb-1">
                            <span class="text-body-bold text-on-surface">${act.title}</span>
                        </div>
                        <p class="text-body text-secondary leading-snug">${act.message}</p>
                        <span class="text-caption text-secondary mt-1 block">${timeStr} • by ${act.user}</span>
                    </div>
                `;
            }).join('');
        }
    }
}
