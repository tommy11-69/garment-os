import { ProgressBar } from './components/index.js';

export const renderers = {
    customerCard(customer, isBulkMode = false, isSelected = false) {
        const avatarHtml = customer.avatar 
            ? `<img class="w-full h-full object-cover" src="${customer.avatar}" alt="${customer.name}"/>`
            : `<span class="text-secondary font-medium">${customer.initials}</span>`;
            
        const checkboxHtml = isBulkMode ? `
            <div class="mr-3 flex items-center h-full">
                <div class="w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-primary border-primary' : 'border-outline-variant'}" onclick="event.stopPropagation(); window.toggleCustomerSelection('${customer.id}')">
                    ${isSelected ? '<span class="material-symbols-outlined text-white text-[16px] font-bold">check</span>' : ''}
                </div>
            </div>
        ` : '';
            
        return `
            <div role="button" tabindex="0" onclick="${isBulkMode ? `window.toggleCustomerSelection('${customer.id}')` : `window.openCustomerDetails('${customer.id}')`}" class="bg-surface-container-lowest rounded-[24px] border ${isSelected ? 'border-primary ring-1 ring-primary' : 'border-outline-variant'} p-md shadow-sm active-bg transition-colors flex items-start gap-4 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary">
                ${checkboxHtml}
                <div class="w-[60px] h-[60px] rounded-full overflow-hidden border border-outline-variant/30 flex-shrink-0 flex items-center justify-center bg-surface-variant/50">
                    ${avatarHtml}
                </div>
                <div class="flex-1 w-full min-w-0">
                    <div class="flex items-start justify-between">
                        <div>
                            <span class="text-[12px] font-semibold text-primary mb-0.5 block">${customer.customerCode || ''}</span>
                            <h4 class="text-body-bold text-on-surface mb-0.5 truncate">${customer.name}</h4>
                            <p class="text-caption text-secondary mb-2 truncate">${customer.company}</p>
                        </div>
                        <span class="px-2.5 py-1 rounded-full text-[11px] font-medium shrink-0 ml-2 ${customer.statusColor || 'bg-success-container/30 text-success'}">${customer.status || 'Active'}</span>
                    </div>
                    <div class="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-outline-variant/30">
                        <div>
                            <span class="text-[11px] text-secondary uppercase tracking-wider block mb-0.5">Revenue</span>
                            <span class="text-[13px] font-bold text-on-surface">$${(customer.totalRevenue || 0).toLocaleString()}</span>
                        </div>
                        <div>
                            <span class="text-[11px] text-secondary uppercase tracking-wider block mb-0.5">Active Orders</span>
                            <span class="text-[13px] font-bold text-on-surface">${customer.activeOrders || 0}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    orderCard(order, isBulkMode = false, isSelected = false) {
        const checkboxHtml = isBulkMode ? `
            <div class="mr-3 flex items-center h-full">
                <div class="w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-primary border-primary' : 'border-outline-variant'}" onclick="event.stopPropagation(); window.toggleOrderSelection('${order.id}')">
                    ${isSelected ? '<span class="material-symbols-outlined text-white text-[16px] font-bold">check</span>' : ''}
                </div>
            </div>
        ` : '';

        return `
            <div role="button" tabindex="0" onclick="${isBulkMode ? `window.toggleOrderSelection('${order.id}')` : `window.openOrderDetails('${order.id}')`}" class="bg-surface-container-lowest rounded-[24px] border ${isSelected ? 'border-primary ring-1 ring-primary' : 'border-outline-variant'} p-lg shadow-sm active-bg transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary flex items-center">
                ${checkboxHtml}
                <div class="flex-1 w-full min-w-0">
                    <div class="flex items-start justify-between mb-4">
                        <div>
                            <span class="text-[13px] font-semibold text-primary mb-1 block">${order.id}</span>
                            <h4 class="text-[18px] font-bold text-on-surface mb-0.5">${order.customerName}</h4>
                            <span class="text-body text-secondary">$${(order.value || 0).toLocaleString()}</span>
                        </div>
                        <span class="px-2.5 py-1 rounded-full text-[11px] font-medium shrink-0 ml-2 ${order.statusColor}">${order.status}</span>
                    </div>
                    ${ProgressBar({ label: `${order.progressPercentage}% Complete`, secondaryLabel: order.progressLabel, percentage: order.progressPercentage, colorClass: order.progressColor })}
                </div>
            </div>
        `;
    },
    
    dashboardOrderCard(order) {
        return `
            <div role="button" tabindex="0" onclick="window.location.href='orders.html?orderId=${order.id}'" class="p-md flex items-center justify-between active-bg transition-colors cursor-pointer outline-none focus-visible:bg-surface-variant focus-visible:ring-2 focus-visible:ring-primary inset-0">
                <div class="flex items-center gap-md">
                    <div class="w-12 h-12 rounded-[14px] bg-[#F5F5F7] flex flex-col items-center justify-center border border-outline-variant/30">
                        <span class="text-[10px] text-secondary font-medium uppercase">${order.dateMonth}</span>
                        <span class="text-[18px] text-on-surface font-bold leading-none">${order.dateDay}</span>
                    </div>
                    <div>
                        <h4 class="text-[16px] font-semibold text-on-surface leading-tight mb-0.5">${order.customerName}</h4>
                        <p class="text-caption text-secondary">${order.id} • $${(order.value || 0).toLocaleString()}</p>
                    </div>
                </div>
                <span class="px-2.5 py-1 rounded-full text-[11px] font-medium ${order.statusColor}">${order.status}</span>
            </div>
        `;
    },

    dashboardBatchCard(batch) {
        return `
            <div>
                <div class="flex justify-between items-end mb-2">
                    <div>
                        <span class="text-body-bold text-on-surface block">Batch #${batch.id}</span>
                        <span class="text-[13px] text-secondary">${batch.description}</span>
                    </div>
                    <span class="text-[13px] font-medium text-primary">${batch.phase} ${batch.progress}%</span>
                </div>
                <div class="relative w-full h-2.5 bg-surface-container rounded-full overflow-hidden">
                    <div class="absolute top-0 left-0 h-full ${batch.progressColor} rounded-full" style="width: ${batch.progress}%;"></div>
                </div>
            </div>
        `;
    },

    inventoryCard(item) {
        return `
            <div role="button" tabindex="0" class="bg-surface-container-lowest rounded-[24px] border border-outline-variant p-md shadow-sm active-scale transition-apple cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary" onclick="openSheet('itemDetailsSheet')">
                <div class="flex justify-between items-start mb-3">
                    <div class="flex gap-3 items-center">
                        <div class="w-10 h-10 rounded-full ${item.iconColor} flex items-center justify-center">
                            <span class="material-symbols-outlined text-[20px]">${item.icon}</span>
                        </div>
                        <div>
                            <h4 class="text-[15px] font-semibold text-on-surface leading-tight">${item.name}</h4>
                            <span class="text-[12px] text-secondary">${item.sku}</span>
                        </div>
                    </div>
                    <span class="px-2 py-0.5 rounded text-[11px] font-medium ${item.statusColor}">${item.status}</span>
                </div>
                <div class="flex items-end justify-between">
                    <div>
                        <span class="text-[20px] font-bold text-on-surface leading-none block mb-0.5">${item.quantity}</span>
                        <span class="text-caption text-secondary">${item.unit}</span>
                    </div>
                </div>
            </div>
        `;
    },

    transactionCard(txn) {
        const sign = txn.isNegative ? "-" : "+";
        return `
            <div role="button" tabindex="0" class="p-md ${txn.id === 'txn-003' ? '' : 'border-b border-outline-variant/30'} flex justify-between items-center active-scale transition-apple cursor-pointer outline-none focus-visible:bg-surface-variant focus-visible:ring-2 focus-visible:ring-primary" onclick="openSheet('transactionDetailsSheet')">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full ${txn.iconBg} ${txn.iconColor} flex items-center justify-center">
                        <span class="material-symbols-outlined text-[20px]">${txn.icon}</span>
                    </div>
                    <div>
                        <h4 class="text-[15px] font-semibold text-on-surface leading-tight mb-0.5">${txn.title}</h4>
                        <span class="text-[13px] text-secondary">${txn.category}</span>
                    </div>
                </div>
                <span class="text-[15px] font-bold ${txn.amountColor}">${sign}$${txn.amount.toFixed(2).toLocaleString()}</span>
            </div>
        `;
    }
};
