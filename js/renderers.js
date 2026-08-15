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
                            <span class="text-[13px] font-bold text-on-surface">₹${(customer.totalRevenue || 0).toLocaleString()}</span>
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

        // Delivery countdown
        const today = new Date();
        const deliveryDate = order.deliveryDate ? new Date(order.deliveryDate) : null;
        const daysLeft = deliveryDate ? Math.ceil((deliveryDate - today) / (1000 * 60 * 60 * 24)) : null;
        const isFinished = ['Delivered', 'Dispatched', 'Closed', 'Archived'].includes(order.status);
        let deliveryBadge = '';
        if (!isFinished && daysLeft !== null) {
            if (daysLeft < 0) deliveryBadge = `<span class="text-[10px] font-bold text-error">${Math.abs(daysLeft)}d overdue</span>`;
            else if (daysLeft <= 5) deliveryBadge = `<span class="text-[10px] font-bold text-orange-500">${daysLeft}d left</span>`;
            else deliveryBadge = `<span class="text-[10px] text-secondary">${daysLeft}d left</span>`;
        }

        // Payment status dot
        const pmtStatus = order.paymentStatus || 'Unpaid';
        const pmtDot = pmtStatus === 'Paid' ? 'bg-[#008A00]' : pmtStatus === 'Partial' ? 'bg-orange-400' : 'bg-error';

        return `
            <div role="button" tabindex="0" onclick="${isBulkMode ? `window.toggleOrderSelection('${order.id}')` : `window.openOrderDetails('${order.id}')`}" class="bg-surface-container-lowest rounded-[24px] border ${isSelected ? 'border-primary ring-1 ring-primary' : 'border-outline-variant'} p-lg shadow-sm active-bg transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary flex items-center">
                ${checkboxHtml}
                <div class="flex-1 w-full min-w-0">
                    <div class="flex items-start justify-between mb-4">
                        <div>
                            <span class="text-[13px] font-semibold text-primary mb-1 block">${order.id}</span>
                            <h4 class="text-[18px] font-bold text-on-surface mb-0.5">${order.customerName}</h4>
                            <div class="flex items-center gap-2">
                                <span class="text-body text-secondary">&#8377;${(order.value || 0).toLocaleString()}</span>
                                <span class="w-1.5 h-1.5 rounded-full ${pmtDot} shrink-0" title="Payment: ${pmtStatus}"></span>
                                ${deliveryBadge}
                            </div>
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
                        <p class="text-caption text-secondary">${order.id} • ₹${(order.value || 0).toLocaleString()}</p>
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
            <div role="button" tabindex="0" class="bg-surface-container-lowest rounded-[24px] border border-outline-variant p-md shadow-sm active-scale transition-apple cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary" onclick="window.openItemDetails('${item.id}')">
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
            <div role="button" tabindex="0" class="p-md ${txn.id === 'txn-003' ? '' : 'border-b border-outline-variant/30'} flex justify-between items-center active-scale transition-apple cursor-pointer outline-none focus-visible:bg-surface-variant focus-visible:ring-2 focus-visible:ring-primary" onclick="window.openTransactionDetails('${txn.id}')">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full ${txn.iconBg} ${txn.iconColor} flex items-center justify-center">
                        <span class="material-symbols-outlined text-[20px]">${txn.icon}</span>
                    </div>
                    <div>
                        <h4 class="text-[15px] font-semibold text-on-surface leading-tight mb-0.5">${txn.title}</h4>
                        <span class="text-[13px] text-secondary">${txn.category}</span>
                    </div>
                </div>
                <span class="text-[15px] font-bold ${txn.amountColor}">${sign}₹${txn.amount.toFixed(2).toLocaleString()}</span>
            </div>
        `;
    },
    
    shipmentCard(s) {
        const isTransit = s.status === 'In Transit';
        const statusColor = isTransit ? 'bg-[#FF9F0A]/10 text-[#FF9F0A]' : 'bg-primary/10 text-primary';
        const icon = isTransit ? 'local_shipping' : 'inventory_2';
        
        let detailsHtml = '';
        if (isTransit) {
            detailsHtml = `
                <div class="flex justify-between items-center">
                    <span class="text-[13px] text-secondary">Courier</span>
                    <span class="text-[14px] font-semibold text-on-surface">${s.courier}</span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-[13px] text-secondary">Tracking No.</span>
                    <span class="text-[14px] font-semibold text-primary">${s.trackingNo}</span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-[13px] text-secondary">Expected</span>
                    <span class="text-[14px] font-semibold text-on-surface">${s.expectedDate}</span>
                </div>
            `;
        } else {
            detailsHtml = `
                <div class="flex justify-between items-center">
                    <span class="text-[13px] text-secondary">Courier</span>
                    <span class="text-[14px] font-semibold text-on-surface">${s.courier}</span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-[13px] text-secondary">Boxes</span>
                    <span class="text-[14px] font-semibold text-on-surface">${s.boxes} Cartons</span>
                </div>
            `;
        }
        
        const actionBtn = isTransit 
            ? `<button class="w-full bg-surface-container-high text-on-surface font-bold text-[14px] py-3 rounded-xl active-scale transition-apple">Track Shipment</button>`
            : `<div class="flex gap-2">
                <button class="flex-1 bg-surface-container-high text-on-surface font-bold text-[14px] py-3 rounded-xl active-scale transition-apple">Print Labels</button>
                <button onclick="window.openSheet('dispatchOrderSheet')" class="flex-1 bg-primary text-white font-bold text-[14px] py-3 rounded-xl active-scale transition-apple shadow-sm">Mark Dispatched</button>
               </div>`;
        
        return `
            <div class="bg-surface-container-lowest rounded-[24px] border border-outline-variant p-lg shadow-sm mb-4">
                <div class="flex justify-between items-start mb-4">
                    <div class="flex items-center gap-3">
                        <div class="w-12 h-12 rounded-full bg-surface-variant flex items-center justify-center">
                            <span class="material-symbols-outlined text-[24px] text-primary">${icon}</span>
                        </div>
                        <div>
                            <h3 class="text-[17px] font-bold text-on-surface leading-tight">${s.customerName}</h3>
                            <span class="text-[13px] text-secondary">${s.invoiceNo}</span>
                        </div>
                    </div>
                    <span class="px-2.5 py-1 rounded-full text-[11px] font-bold ${statusColor} uppercase tracking-wider">${s.status}</span>
                </div>
                
                <div class="bg-surface-variant/50 rounded-xl p-3 flex flex-col gap-2 mb-4">
                    ${detailsHtml}
                </div>
                
                ${actionBtn}
            </div>
        `;
    },
    
    dashboardOrderCard(o) {
        const isExpedited = o.isExpedited;
        const color = isExpedited ? 'text-[#FF9F0A]' : 'text-on-surface';
        const bg = isExpedited ? 'bg-[#FF9F0A]/10' : 'bg-surface-variant';
        return `
            <div class="p-md flex items-center justify-between active:bg-surface-variant/50 transition-colors cursor-pointer" onclick="window.location.href='orders.html'">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full ${bg} flex items-center justify-center">
                        <span class="material-symbols-outlined text-[20px] ${color}">local_shipping</span>
                    </div>
                    <div>
                        <h4 class="text-[15px] font-bold text-on-surface leading-tight">${o.customerName}</h4>
                        <span class="text-[12px] text-secondary">${o.id} • ${o.totalValue}</span>
                    </div>
                </div>
                <div class="text-right">
                    <span class="block text-[13px] font-bold text-on-surface mb-0.5">${o.status}</span>
                    <span class="text-[11px] font-medium text-secondary">Due ${o.deliveryDate}</span>
                </div>
            </div>
        `;
    },

    dashboardBatchCard(b) {
        return `
            <div class="cursor-pointer active:opacity-70 transition-opacity" onclick="window.location.href='production.html'">
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <h4 class="text-[15px] font-bold text-on-surface mb-0.5">Batch #${b.id}</h4>
                        <span class="text-[12px] text-secondary">${b.description}</span>
                    </div>
                    <span class="text-[13px] font-bold text-primary">${b.progress}%</span>
                </div>
                <div class="w-full bg-surface-container h-1.5 rounded-full overflow-hidden mb-1">
                    <div class="bg-primary h-full rounded-full transition-apple duration-500" style="width: ${b.progress}%;"></div>
                </div>
                <span class="text-[11px] font-medium text-primary">Current Phase: ${b.phase}</span>
            </div>
        `;
    },

    transactionCard(t, isSelected = false) {
        const isIncome = t.type === 'Income';
        const color = isIncome ? 'text-[#008A00]' : 'text-error';
        const bg = isIncome ? 'bg-[#008A00]/10' : 'bg-error/10';
        const icon = isIncome ? 'arrow_downward' : 'arrow_upward';
        const amountStr = (isIncome ? '+' : '-') + '₹' + parseFloat(t.amount).toLocaleString(undefined, {minimumFractionDigits:2});
        
        const statusColor = t.status === 'Completed' ? 'bg-[#008A00]/10 text-[#008A00]' : 
                            (t.status === 'Pending' ? 'bg-[#FF9F0A]/10 text-[#FF9F0A]' : 'bg-surface-variant text-secondary');

        return `
            <div class="relative bg-surface-container-lowest rounded-[24px] border ${isSelected ? 'border-primary shadow-sm bg-primary/5' : 'border-outline-variant shadow-sm'} p-md mb-3 flex items-start gap-4 transition-colors">
                <div class="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center">
                    <input type="checkbox" 
                           ${isSelected ? 'checked' : ''} 
                           onchange="window.toggleTransactionSelection('${t.id}')"
                           class="w-5 h-5 rounded-md border-outline text-primary focus:ring-primary focus:ring-offset-0 bg-transparent transition-apple cursor-pointer z-10"
                           onclick="event.stopPropagation()">
                </div>
                
                <div class="flex-1 ml-8 flex items-start gap-3 cursor-pointer" onclick="window.openTransactionDetails('${t.id}')">
                    <div class="w-10 h-10 rounded-full ${bg} flex items-center justify-center shrink-0">
                        <span class="material-symbols-outlined text-[20px] ${color}">${icon}</span>
                    </div>
                    
                    <div class="flex-1 min-w-0">
                        <div class="flex justify-between items-start mb-0.5">
                            <h4 class="text-[15px] font-bold text-on-surface truncate pr-2">${t.title}</h4>
                            <span class="text-[15px] font-bold ${color} whitespace-nowrap">${amountStr}</span>
                        </div>
                        
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
            <div role="button" tabindex="0" class="bg-surface-container-lowest rounded-[24px] border border-outline-variant p-md shadow-sm active-scale transition-apple cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary" onclick="window.openItemDetails('${item.id}')">
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
            <div role="button" tabindex="0" class="p-md ${txn.id === 'txn-003' ? '' : 'border-b border-outline-variant/30'} flex justify-between items-center active-scale transition-apple cursor-pointer outline-none focus-visible:bg-surface-variant focus-visible:ring-2 focus-visible:ring-primary" onclick="window.openTransactionDetails('${txn.id}')">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full ${txn.iconBg} ${txn.iconColor} flex items-center justify-center">
                        <span class="material-symbols-outlined text-[20px]">${txn.icon}</span>
                    </div>
                    <div>
                        <h4 class="text-[15px] font-semibold text-on-surface leading-tight mb-0.5">${txn.title}</h4>
                        <span class="text-[13px] text-secondary">${txn.category}</span>
                    </div>
                </div>
                <span class="text-[15px] font-bold ${txn.amountColor}">${sign}₹${txn.amount.toFixed(2).toLocaleString()}</span>
            </div>
        `;
    },
    
    shipmentCard(s) {
        const isTransit = s.status === 'In Transit';
        const statusColor = isTransit ? 'bg-[#FF9F0A]/10 text-[#FF9F0A]' : 'bg-primary/10 text-primary';
        const icon = isTransit ? 'local_shipping' : 'inventory_2';
        
        let detailsHtml = '';
        if (isTransit) {
            detailsHtml = `
                <div class="flex justify-between items-center">
                    <span class="text-[13px] text-secondary">Courier</span>
                    <span class="text-[14px] font-semibold text-on-surface">${s.courier}</span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-[13px] text-secondary">Tracking No.</span>
                    <span class="text-[14px] font-semibold text-primary">${s.trackingNo}</span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-[13px] text-secondary">Expected</span>
                    <span class="text-[14px] font-semibold text-on-surface">${s.expectedDate}</span>
                </div>
            `;
        } else {
            detailsHtml = `
                <div class="flex justify-between items-center">
                    <span class="text-[13px] text-secondary">Courier</span>
                    <span class="text-[14px] font-semibold text-on-surface">${s.courier}</span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-[13px] text-secondary">Boxes</span>
                    <span class="text-[14px] font-semibold text-on-surface">${s.boxes} Cartons</span>
                </div>
            `;
        }
        
        const actionBtn = isTransit 
            ? `<button class="w-full bg-surface-container-high text-on-surface font-bold text-[14px] py-3 rounded-xl active-scale transition-apple">Track Shipment</button>`
            : `<div class="flex gap-2">
                <button class="flex-1 bg-surface-container-high text-on-surface font-bold text-[14px] py-3 rounded-xl active-scale transition-apple">Print Labels</button>
                <button onclick="window.openSheet('dispatchOrderSheet')" class="flex-1 bg-primary text-white font-bold text-[14px] py-3 rounded-xl active-scale transition-apple shadow-sm">Mark Dispatched</button>
               </div>`;
        
        return `
            <div class="bg-surface-container-lowest rounded-[24px] border border-outline-variant p-lg shadow-sm mb-4">
                <div class="flex justify-between items-start mb-4">
                    <div class="flex items-center gap-3">
                        <div class="w-12 h-12 rounded-full bg-surface-variant flex items-center justify-center">
                            <span class="material-symbols-outlined text-[24px] text-primary">${icon}</span>
                        </div>
                        <div>
                            <h3 class="text-[17px] font-bold text-on-surface leading-tight">${s.customerName}</h3>
                            <span class="text-[13px] text-secondary">${s.invoiceNo}</span>
                        </div>
                    </div>
                    <span class="px-2.5 py-1 rounded-full text-[11px] font-bold ${statusColor} uppercase tracking-wider">${s.status}</span>
                </div>
                
                <div class="bg-surface-variant/50 rounded-xl p-3 flex flex-col gap-2 mb-4">
                    ${detailsHtml}
                </div>
                
                ${actionBtn}
            </div>
        `;
    },
    
    dashboardOrderCard(o) {
        const isExpedited = o.isExpedited;
        const color = isExpedited ? 'text-[#FF9F0A]' : 'text-on-surface';
        const bg = isExpedited ? 'bg-[#FF9F0A]/10' : 'bg-surface-variant';
        return `
            <div class="p-md flex items-center justify-between active:bg-surface-variant/50 transition-colors cursor-pointer" onclick="window.location.href='orders.html'">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full ${bg} flex items-center justify-center">
                        <span class="material-symbols-outlined text-[20px] ${color}">local_shipping</span>
                    </div>
                    <div>
                        <h4 class="text-[15px] font-bold text-on-surface leading-tight">${o.customerName}</h4>
                        <span class="text-[12px] text-secondary">${o.id} • ${o.totalValue}</span>
                    </div>
                </div>
                <div class="text-right">
                    <span class="block text-[13px] font-bold text-on-surface mb-0.5">${o.status}</span>
                    <span class="text-[11px] font-medium text-secondary">Due ${o.deliveryDate}</span>
                </div>
            </div>
        `;
    },

    dashboardBatchCard(b) {
        return `
            <div class="cursor-pointer active:opacity-70 transition-opacity" onclick="window.location.href='production.html'">
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <h4 class="text-[15px] font-bold text-on-surface mb-0.5">Batch #${b.id}</h4>
                        <span class="text-[12px] text-secondary">${b.description}</span>
                    </div>
                    <span class="text-[13px] font-bold text-primary">${b.progress}%</span>
                </div>
                <div class="w-full bg-surface-container h-1.5 rounded-full overflow-hidden mb-1">
                    <div class="bg-primary h-full rounded-full transition-apple duration-500" style="width: ${b.progress}%;"></div>
                </div>
                <span class="text-[11px] font-medium text-primary">Current Phase: ${b.phase}</span>
            </div>
        `;
    },

    transactionCard(t, isSelected = false) {
        const isIncome = t.type === 'Income';
        const color = isIncome ? 'text-[#008A00]' : 'text-error';
        const bg = isIncome ? 'bg-[#008A00]/10' : 'bg-error/10';
        const icon = isIncome ? 'arrow_downward' : 'arrow_upward';
        const amountStr = (isIncome ? '+' : '-') + '₹' + parseFloat(t.amount).toLocaleString(undefined, {minimumFractionDigits:2});
        
        const statusColor = t.status === 'Completed' ? 'bg-[#008A00]/10 text-[#008A00]' : 
                            (t.status === 'Pending' ? 'bg-[#FF9F0A]/10 text-[#FF9F0A]' : 'bg-surface-variant text-secondary');

        return `
            <div class="relative bg-surface-container-lowest rounded-[24px] border ${isSelected ? 'border-primary shadow-sm bg-primary/5' : 'border-outline-variant shadow-sm'} p-md mb-3 flex items-start gap-4 transition-colors">
                <div class="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center">
                    <input type="checkbox" 
                           ${isSelected ? 'checked' : ''} 
                           onchange="window.toggleTransactionSelection('${t.id}')"
                           class="w-5 h-5 rounded-md border-outline text-primary focus:ring-primary focus:ring-offset-0 bg-transparent transition-apple cursor-pointer z-10"
                           onclick="event.stopPropagation()">
                </div>
                
                <div class="flex-1 ml-8 flex items-start gap-3 cursor-pointer" onclick="window.openTransactionDetails('${t.id}')">
                    <div class="w-10 h-10 rounded-full ${bg} flex items-center justify-center shrink-0">
                        <span class="material-symbols-outlined text-[20px] ${color}">${icon}</span>
                    </div>
                    
                    <div class="flex-1 min-w-0">
                        <div class="flex justify-between items-start mb-0.5">
                            <h4 class="text-[15px] font-bold text-on-surface truncate pr-2">${t.title}</h4>
                            <span class="text-[15px] font-bold ${color} whitespace-nowrap">${amountStr}</span>
                        </div>
                        
                        <div class="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span class="text-[12px] font-medium px-2 py-0.5 rounded-md bg-surface-container text-on-surface-variant">${t.category}</span>
                            <span class="text-[12px] font-medium px-2 py-0.5 rounded-md ${statusColor}">${t.status}</span>
                        </div>
                        
                        <div class="flex items-center justify-between text-[11px] text-secondary">
                            <div class="flex items-center gap-1.5">
                                <span class="material-symbols-outlined text-[14px]">calendar_today</span>
                                <span>${t.date}</span>
                                <span>•</span>
                                <span>${t.paymentMethod}</span>
                            </div>
                            <span class="truncate max-w-[80px]">${t.referenceNo || ''}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    dashboardCustomerCard(c) {
        return `
            <div class="p-md flex items-center justify-between active:bg-surface-variant/50 transition-colors cursor-pointer" onclick="window.location.href='customers.html'">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                        <span class="font-bold text-[14px]">${c.initials || c.name.charAt(0)}</span>
                    </div>
                    <div>
                        <h4 class="text-[15px] font-bold text-on-surface leading-tight">${c.name}</h4>
                        <span class="text-[12px] text-secondary">${c.company || 'Individual'}</span>
                    </div>
                </div>
                <div class="text-right">
                    <span class="block text-[13px] font-bold text-on-surface mb-0.5">${c.status || 'Active'}</span>
                    <span class="text-[11px] font-medium text-secondary">${c.totalOrders || 0} Orders</span>
                </div>
            </div>
        `;
    },

    dashboardTransactionCard(t) {
        const isIncome = t.type === 'Income';
        const color = isIncome ? 'text-[#008A00]' : 'text-error';
        const bg = isIncome ? 'bg-[#008A00]/10' : 'bg-error/10';
        const amountStr = (isIncome ? '+' : '-') + '₹' + parseFloat(t.amount).toLocaleString(undefined, {minimumFractionDigits:2});
        
        return `
            <div class="p-md flex items-center justify-between active:bg-surface-variant/50 transition-colors cursor-pointer" onclick="window.location.href='finance.html'">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full ${bg} flex items-center justify-center">
                        <span class="material-symbols-outlined text-[20px] ${color}">${isIncome ? 'arrow_downward' : 'arrow_upward'}</span>
                    </div>
                    <div>
                        <h4 class="text-[15px] font-bold text-on-surface leading-tight">${t.title}</h4>
                        <span class="text-[12px] text-secondary">${t.category}</span>
                    </div>
                </div>
                <div class="text-right">
                    <span class="block text-[13px] font-bold ${color} mb-0.5">${amountStr}</span>
                    <span class="text-[11px] font-medium text-secondary">${t.date}</span>
                </div>
            </div>
        `;
    },

    dashboardCostingCard(c) {
        return `
            <div class="p-md flex items-center justify-between active:bg-surface-variant/50 transition-colors cursor-pointer" onclick="window.location.href='calculator.html'">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-[#5E5CE6]/10 text-[#5E5CE6] flex items-center justify-center">
                        <span class="material-symbols-outlined text-[20px]">calculate</span>
                    </div>
                    <div>
                        <h4 class="text-[15px] font-bold text-on-surface leading-tight">${c.styleName || 'Costing'}</h4>
                        <span class="text-[12px] text-secondary">Qty: ${c.quantity || 1}</span>
                    </div>
                </div>
                <div class="text-right">
                    <span class="block text-[13px] font-bold text-on-surface mb-0.5">₹${c.totalCost || '0.00'}/pc</span>
                    <span class="text-[11px] font-medium text-secondary">Margin: ${c.margin || 0}%</span>
                </div>
            </div>
        `;
    }
};
