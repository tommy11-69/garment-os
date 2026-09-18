import { ProgressBar } from './components/index.js?v=5.2';
import { calculateOrderRollup, normalizeStageKey, STAGE_DEFINITIONS, getProductWorkflowStages, WORKFLOW_ROUTES, getWorkflowBadgeInfo } from './production/domain/workflowEngine.js?v=6.0';

function renderStagePipeline(order) {
    // Determine workflow type from the primary product (new schema) or order-level fallback
    const primaryProduct = Array.isArray(order.products) && order.products.length > 0
        ? order.products[0]
        : null;
    const workflowType = primaryProduct?.workflowType || order.workflowType || 'default';

    // Get the real ordered list of stage keys for this workflow
    const stageKeys = getProductWorkflowStages(primaryProduct, workflowType);

    // Determine the active stage key from the order status
    const currentNorm = normalizeStageKey(order.status);
    let activeIdx = stageKeys.indexOf(currentNorm);
    if (activeIdx < 0) activeIdx = 0;
    if (['Dispatched', 'Delivered', 'Closed', 'Archived'].includes(order.status)) {
        activeIdx = stageKeys.length; // all done
    }

    const chips = stageKeys.map((key, i) => {
        const def = STAGE_DEFINITIONS[key] || { shortLabel: key, label: key };
        const isDone = i < activeIdx;
        const isActive = i === activeIdx;
        const chipCls = isDone
            ? 'bg-[#34C759] text-white'
            : isActive
                ? 'bg-primary text-white shadow-xs'
                : 'bg-surface-variant text-secondary';
        const icon = isDone
            ? '<span class="material-symbols-outlined text-[10px] leading-none">check</span>'
            : '';
        const label = def.shortLabel || def.label || key;
        return `<span class="shrink-0 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide ${chipCls} flex items-center gap-0.5">${icon}${label}</span>`;
    });

    const pipelineItems = chips.reduce((arr, chip, i) => {
        arr.push(chip);
        if (i < chips.length - 1) arr.push(`<span class="text-outline-variant text-[10px] shrink-0">›</span>`);
        return arr;
    }, []);

    return `<div class="flex items-center gap-1 flex-wrap mt-3 pt-3 border-t border-outline-variant/50">${pipelineItems.join('')}</div>`;
}

export const renderers = {

    customerCard(customer, isBulkMode = false, isSelected = false) {
        const typeAvatarColors = {
            'Brand': 'bg-blue-500/15 text-blue-700',
            'Manufacturer': 'bg-purple-500/15 text-purple-700',
            'Exporter': 'bg-emerald-500/15 text-emerald-700',
            'Retailer': 'bg-orange-500/15 text-orange-700',
            'Wholesaler': 'bg-teal-500/15 text-teal-700',
            'Distributor': 'bg-indigo-500/15 text-indigo-700',
            'Other': 'bg-primary/15 text-primary',
        };
        const avatarCls = typeAvatarColors[customer.customerType] || typeAvatarColors['Other'];
        const initials = customer.initials || (customer.name || 'CU').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
        const avatarHtml = customer.avatar
            ? `<img class="w-full h-full object-cover rounded-full" src="${customer.avatar}" alt="${customer.name}"/>`
            : `<span class="font-bold text-[18px]">${initials}</span>`;

        const outstanding = parseFloat(customer.totalOutstanding ?? customer.outstanding ?? 0);
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
                <div class="w-[56px] h-[56px] rounded-full flex-shrink-0 flex items-center justify-center font-bold text-[18px] ${avatarCls}">
                    ${avatarHtml}
                </div>
                <div class="flex-1 w-full min-w-0">
                    <div class="flex items-start justify-between mb-1">
                        <div class="min-w-0">
                            <div class="flex items-center gap-1.5 mb-0.5">
                                <span class="text-[11px] font-semibold text-primary">${customer.customerCode || ''}</span>
                                ${customer.customerType ? `<span class="text-[10px] text-secondary font-medium">· ${customer.customerType}</span>` : ''}
                            </div>
                            <h4 class="text-[16px] font-bold text-on-surface leading-tight truncate">${customer.name}</h4>
                            ${customer.company ? `<p class="text-[12px] text-secondary truncate">${customer.company}</p>` : ''}
                        </div>
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ml-2 ${customer.statusColor || 'bg-[#008A00]/10 text-[#008A00]'}">${customer.status || 'Active'}</span>
                    </div>
                    <div class="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-outline-variant/30">
                        <div>
                            <span class="text-[10px] text-secondary uppercase tracking-wider block mb-0.5">Revenue</span>
                            <span class="text-[12px] font-bold text-on-surface">₹${(customer.totalRevenue || 0).toLocaleString('en-IN')}</span>
                        </div>
                        <div>
                            <span class="text-[10px] text-secondary uppercase tracking-wider block mb-0.5">Active Orders</span>
                            <span class="text-[12px] font-bold text-on-surface">${customer.activeOrders || 0}</span>
                        </div>
                        <div>
                            <span class="text-[10px] text-secondary uppercase tracking-wider block mb-0.5">Outstanding</span>
                            <span class="text-[12px] font-bold ${outstanding > 0 ? 'text-error' : 'text-[#008A00]'}">₹${outstanding.toLocaleString('en-IN')}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    orderTableRow(order, isSelected = false) {
        const today = new Date();
        const deliveryDate = order.deliveryDate ? new Date(order.deliveryDate) : null;
        const daysLeft = deliveryDate ? Math.ceil((deliveryDate - today) / (1000 * 60 * 60 * 24)) : null;
        const isFinished = ['Delivered', 'Dispatched', 'Closed', 'Archived'].includes(order.status);
        
        let deliveryBadge = `<span class="text-[12px] text-secondary dark:text-slate-400 font-medium">${order.deliveryDate || '—'}</span>`;
        if (!isFinished && daysLeft !== null) {
            if (daysLeft < 0) {
                deliveryBadge = `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-error/10 text-error"><span class="w-1.5 h-1.5 rounded-full bg-error animate-pulse"></span>${Math.abs(daysLeft)}d overdue</span>`;
            } else if (daysLeft <= 4) {
                deliveryBadge = `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-orange-500/10 text-orange-600 dark:text-orange-400">${daysLeft}d left</span>`;
            } else {
                deliveryBadge = `<span class="text-[12px] font-medium text-on-surface dark:text-slate-300">${order.deliveryDate} (${daysLeft}d)</span>`;
            }
        }

        const pmtStatus = order.paymentStatus || 'Unpaid';
        const pmtDot = pmtStatus === 'Paid' ? 'bg-[#008A00]' : pmtStatus === 'Partial' ? 'bg-orange-400' : 'bg-error';

        const rollup = calculateOrderRollup(order);
        const displayPercentage = (order.progressPercentage !== undefined && order.progressPercentage !== null && order.progressPercentage > 0)
            ? order.progressPercentage
            : rollup.overallPercentage;

        const stageDef = rollup.activeStageDef || STAGE_DEFINITIONS.procurement;

        const orderProducts = Array.isArray(order.products) && order.products.length > 0 ? order.products : null;
        let productSummaryHtml = '';
        if (orderProducts && orderProducts.length > 0) {
            const first = orderProducts[0];
            const pWf = first.workflowType || order.workflowType || 'default';
            const wfInfo = getWorkflowBadgeInfo(pWf);
            productSummaryHtml = `
                <div class="flex items-center gap-1.5 max-w-[240px]">
                    <span class="font-bold text-[13px] text-on-surface dark:text-slate-100 truncate">${first.name || order.product || 'Apparel Item'}</span>
                    ${orderProducts.length > 1 ? `<span class="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-surface-container dark:bg-slate-800 text-secondary dark:text-slate-300 shrink-0">+${orderProducts.length - 1}</span>` : ''}
                    <span class="px-1.5 py-0.5 rounded text-[9px] font-extrabold ${wfInfo.bgColor} ${wfInfo.color} shrink-0 border ${wfInfo.borderColor}">
                        ${wfInfo.shortLabel || wfInfo.label}
                    </span>
                </div>
            `;
        } else {
            productSummaryHtml = `
                <span class="font-bold text-[13px] text-on-surface dark:text-slate-100 truncate">${order.product || 'Apparel Item'}</span>
            `;
        }

        return `
            <tr class="border-b border-outline-variant/40 dark:border-slate-800/80 hover:bg-surface-container-lowest/80 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group ${isSelected ? 'bg-primary/5 dark:bg-primary/10' : ''}"
                onclick="window.openOrderInspector('${order.id}')">
                
                <!-- Checkbox -->
                <td class="py-3 px-3 text-center" onclick="event.stopPropagation()">
                    <input type="checkbox" ${isSelected ? 'checked' : ''} 
                        onchange="window.toggleOrderSelection('${order.id}')"
                        class="w-4 h-4 rounded text-primary focus:ring-primary border-outline-variant dark:border-slate-700 bg-surface dark:bg-slate-900 cursor-pointer">
                </td>

                <!-- Order ID & Buyer -->
                <td class="py-3 px-3">
                    <div class="flex items-center gap-2.5">
                        <span class="px-2.5 py-1 rounded-lg bg-primary/10 text-primary font-mono text-[12px] font-extrabold uppercase shrink-0">
                            ${order.id}
                        </span>
                        <div class="min-w-0">
                            <span class="font-bold text-[13px] text-on-surface dark:text-white block truncate leading-tight">
                                ${order.customerName || order.customerId || 'Customer'}
                            </span>
                            ${order.customerCompany ? `<span class="text-[11px] text-secondary dark:text-slate-400 block truncate mt-0.5">${order.customerCompany}</span>` : ''}
                        </div>
                    </div>
                </td>

                <!-- Products & Route -->
                <td class="py-3 px-3">
                    ${productSummaryHtml}
                </td>

                <!-- Quantity -->
                <td class="py-3 px-3 whitespace-nowrap">
                    <span class="font-extrabold text-[13px] text-on-surface dark:text-slate-100">
                        ${(order.qty || 0).toLocaleString()}
                    </span>
                    <span class="text-[11px] text-secondary dark:text-slate-400 font-medium">pcs</span>
                </td>

                <!-- Order Value & Payment -->
                <td class="py-3 px-3 whitespace-nowrap">
                    <div class="flex items-center gap-1.5">
                        <span class="w-2 h-2 rounded-full ${pmtDot} shrink-0" title="Payment: ${pmtStatus}"></span>
                        <span class="font-bold text-[13px] text-on-surface dark:text-slate-100">
                            ₹${(order.value || 0).toLocaleString()}
                        </span>
                    </div>
                </td>

                <!-- Delivery Urgency -->
                <td class="py-3 px-3 whitespace-nowrap">
                    ${deliveryBadge}
                </td>

                <!-- Factory Stage & Progress -->
                <td class="py-3 px-3 min-w-[150px]">
                    <div class="flex flex-col gap-1">
                        <div class="flex items-center justify-between gap-1">
                            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold ${stageDef.bgColor} ${stageDef.color}">
                                <span class="material-symbols-outlined text-[12px]">${stageDef.icon}</span>
                                <span>${stageDef.shortLabel || stageDef.label}</span>
                            </span>
                            <span class="text-[11px] font-mono font-extrabold text-primary">${displayPercentage}%</span>
                        </div>
                        <div class="w-full h-1.5 bg-surface-variant dark:bg-slate-800 rounded-full overflow-hidden">
                            <div class="h-full bg-primary rounded-full transition-all" style="width: ${displayPercentage}%"></div>
                        </div>
                    </div>
                </td>

                <!-- Actions -->
                <td class="py-3 px-3 text-right" onclick="event.stopPropagation()">
                    <div class="flex items-center justify-end gap-1.5">
                        <button type="button" onclick="window.openOrderInspector('${order.id}')"
                            title="Quick Inspect"
                            class="w-8 h-8 rounded-xl bg-surface-container dark:bg-slate-800 hover:bg-primary hover:text-white text-secondary dark:text-slate-300 flex items-center justify-center active-scale transition-apple shadow-xs">
                            <span class="material-symbols-outlined text-[17px]">visibility</span>
                        </button>
                        <button type="button" onclick="window.location.href='create-order.html?edit=${order.id}'"
                            title="Edit Order"
                            class="w-8 h-8 rounded-xl bg-surface-container dark:bg-slate-800 hover:bg-amber-500 hover:text-white text-secondary dark:text-slate-300 flex items-center justify-center active-scale transition-apple shadow-xs">
                            <span class="material-symbols-outlined text-[17px]">edit</span>
                        </button>
                        <button type="button" onclick="window.location.href='production.html?orderId=${order.id}&stage=${rollup.activeStageKey}'"
                            title="Open Floor Workspace"
                            class="w-8 h-8 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white flex items-center justify-center active-scale transition-apple shadow-xs">
                            <span class="material-symbols-outlined text-[17px]">precision_manufacturing</span>
                        </button>
                        <button type="button" onclick="window.printJobTraveler('${order.id}')"
                            title="Print Traveler / Cut Ticket"
                            class="w-8 h-8 rounded-xl bg-surface-container dark:bg-slate-800 hover:bg-surface-variant text-secondary dark:text-slate-300 flex items-center justify-center active-scale transition-apple shadow-xs">
                            <span class="material-symbols-outlined text-[17px]">print</span>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    },

    orderCard(order, isBulkMode = false, isSelected = false) {
        const checkboxHtml = isBulkMode ? `
            <div class="mr-2.5 flex items-center">
                <div class="w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-primary border-primary' : 'border-outline-variant'}" onclick="event.stopPropagation(); window.toggleOrderSelection('${order.id}')">
                    ${isSelected ? '<span class="material-symbols-outlined text-white text-[14px] font-bold">check</span>' : ''}
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
            if (daysLeft < 0) deliveryBadge = `<span class="text-[11px] font-extrabold text-error px-2 py-0.5 rounded-md bg-error/10">${Math.abs(daysLeft)}d overdue</span>`;
            else if (daysLeft <= 4) deliveryBadge = `<span class="text-[11px] font-extrabold text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-md bg-orange-500/10">${daysLeft}d left</span>`;
            else deliveryBadge = `<span class="text-[11px] text-secondary font-medium">${daysLeft}d left</span>`;
        }

        // Payment status dot
        const pmtStatus = order.paymentStatus || 'Unpaid';
        const pmtDot = pmtStatus === 'Paid' ? 'bg-[#008A00]' : pmtStatus === 'Partial' ? 'bg-orange-400' : 'bg-error';

        // Dynamic workflow roll-up calculation
        const rollup = calculateOrderRollup(order);
        const displayPercentage = (order.progressPercentage !== undefined && order.progressPercentage !== null && order.progressPercentage > 0)
            ? order.progressPercentage
            : rollup.overallPercentage;

        // Bottleneck warning badge
        const bottleneckBadge = rollup.isBottleneck ? `
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-error/10 text-error text-[10px] font-extrabold">
                <span class="material-symbols-outlined text-[12px]">warning</span>
                <span>Bottleneck</span>
            </span>
        ` : '';

        // Product-level stage and workflow badges
        let productChipsHtml = '';
        const orderProducts = Array.isArray(order.products) && order.products.length > 0 ? order.products : null;
        if (orderProducts && orderProducts.length > 0) {
            productChipsHtml = `
                <div class="flex flex-wrap gap-1.5 mt-2">
                    ${orderProducts.map(p => {
                        const pWf = p.workflowType || order.workflowType || 'default';
                        const wfInfo = getWorkflowBadgeInfo(pWf);
                        const pWorkflow = getProductWorkflowStages(p, order.workflowType);
                        const pStageKey = normalizeStageKey(p.status || p.currentStage || pWorkflow[0]);
                        const pStageDef = STAGE_DEFINITIONS[pStageKey] || { label: p.status || pStageKey, icon: 'bolt' };
                        return `
                            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-surface-container dark:bg-slate-800 border border-outline-variant/50 text-on-surface dark:text-slate-200">
                                <span class="font-bold">${p.name || 'Item'}:</span>
                                <span class="px-1.5 py-0.2 rounded text-[9px] font-extrabold ${wfInfo.bgColor} ${wfInfo.color}">
                                    ${wfInfo.shortLabel || wfInfo.label}
                                </span>
                                <span class="text-primary font-bold">• ${pStageDef.shortLabel || pStageDef.label}</span>
                            </span>
                        `;
                    }).join('')}
                </div>
            `;
        }

        return `
            <div role="button" tabindex="0" onclick="${isBulkMode ? `window.toggleOrderSelection('${order.id}')` : `window.openOrderInspector('${order.id}')`}" 
                class="bg-surface-container-lowest dark:bg-slate-900 rounded-2xl border ${isSelected ? 'border-primary ring-2 ring-primary/30 bg-primary/5' : 'border-outline-variant/60 dark:border-slate-800'} p-4 shadow-xs hover:border-primary transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary flex flex-col gap-3">
                
                <!-- Card Header -->
                <div class="flex items-start justify-between gap-3">
                    <div class="flex items-start gap-2.5 min-w-0">
                        ${checkboxHtml}
                        <div class="min-w-0">
                            <div class="flex items-center gap-2 flex-wrap mb-1">
                                <span class="px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary font-mono text-[12px] font-extrabold uppercase">
                                    ${order.id}
                                </span>
                                <span class="px-2 py-0.5 rounded-md text-[10px] font-extrabold ${order.statusColor || 'bg-surface-variant text-secondary'}">
                                    ${order.status}
                                </span>
                                ${bottleneckBadge}
                            </div>
                            <h4 class="text-[16px] font-extrabold text-on-surface dark:text-white leading-tight truncate">
                                ${order.customerName || order.customerId || 'Customer'}
                            </h4>
                            ${order.customerCompany ? `<p class="text-[12px] text-secondary dark:text-slate-400 truncate">${order.customerCompany}</p>` : ''}
                        </div>
                    </div>

                    <!-- Value & Payment -->
                    <div class="flex flex-col items-end shrink-0">
                        <div class="flex items-center gap-1.5">
                            <span class="w-2 h-2 rounded-full ${pmtDot} shrink-0" title="Payment: ${pmtStatus}"></span>
                            <span class="text-[15px] font-extrabold text-on-surface dark:text-white">₹${(order.value || 0).toLocaleString()}</span>
                        </div>
                        <div class="mt-0.5">${deliveryBadge}</div>
                    </div>
                </div>

                <!-- Products route chips -->
                ${productChipsHtml}

                <!-- Progress Bar & Active Stage -->
                <div class="mt-1">
                    <div class="flex items-center justify-between text-[11px] mb-1 font-semibold">
                        <span class="text-secondary dark:text-slate-400">
                            <strong>${(order.qty || 0).toLocaleString()} pcs</strong> • Active: <strong class="text-primary">${rollup.activeStageDef.label}</strong>
                        </span>
                        <span class="text-primary font-mono font-extrabold">${displayPercentage}%</span>
                    </div>
                    <div class="w-full h-1.5 bg-surface-variant dark:bg-slate-800 rounded-full overflow-hidden">
                        <div class="h-full bg-primary rounded-full transition-apple" style="width: ${displayPercentage}%"></div>
                    </div>
                </div>

                <!-- Card Footer Actions -->
                <div class="pt-2.5 border-t border-outline-variant/40 dark:border-slate-800 flex items-center justify-between gap-2" onclick="event.stopPropagation()">
                    <button type="button" onclick="window.openOrderInspector('${order.id}')"
                        class="px-3 py-1.5 rounded-xl bg-surface-container dark:bg-slate-800 hover:bg-surface-variant text-on-surface dark:text-slate-200 text-[12px] font-bold flex items-center gap-1 active-scale transition-apple shadow-xs">
                        <span class="material-symbols-outlined text-[15px]">visibility</span>
                        <span>Quick View</span>
                    </button>

                    <div class="flex items-center gap-1.5">
                        <button type="button" onclick="window.location.href='create-order.html?edit=${order.id}'"
                            title="Edit Order"
                            class="w-8 h-8 rounded-xl border border-outline-variant dark:border-slate-800 hover:border-primary text-secondary hover:text-primary flex items-center justify-center active-scale transition-apple">
                            <span class="material-symbols-outlined text-[16px]">edit</span>
                        </button>
                        <button type="button" onclick="window.printJobTraveler('${order.id}')"
                            title="Print Traveler / Cut Ticket"
                            class="w-8 h-8 rounded-xl border border-outline-variant dark:border-slate-800 hover:border-primary text-secondary hover:text-primary flex items-center justify-center active-scale transition-apple">
                            <span class="material-symbols-outlined text-[16px]">print</span>
                        </button>
                        <button type="button" onclick="window.location.href='production.html?orderId=${order.id}&stage=${rollup.activeStageKey}'"
                            class="px-3 py-1.5 rounded-xl bg-primary text-white text-[12px] font-bold active-scale transition-apple flex items-center gap-1 hover:bg-primary-hover shadow-xs">
                            <span>Floor</span>
                            <span class="material-symbols-outlined text-[15px]">arrow_forward</span>
                        </button>
                    </div>
                </div>

            </div>
        `;
    },

    orderInspectorContent(order) {
        const rollup = calculateOrderRollup(order);
        const displayPercentage = (order.progressPercentage !== undefined && order.progressPercentage !== null && order.progressPercentage > 0)
            ? order.progressPercentage
            : rollup.overallPercentage;

        const pmtStatus = order.paymentStatus || 'Unpaid';
        const pmtBadgeCls = pmtStatus === 'Paid' ? 'bg-[#34C759]/15 text-[#34C759]' : pmtStatus === 'Partial' ? 'bg-orange-500/15 text-orange-600' : 'bg-error/15 text-error';

        const products = Array.isArray(order.products) && order.products.length > 0 
            ? order.products 
            : [{ name: order.product || 'Standard Garment', qty: order.qty || 0, workflowType: order.workflowType || 'default', sizes: order.sizes || {} }];

        return `
            <div class="flex flex-col gap-5 pb-8 animate-fade-in">
                
                <!-- Inspector Header -->
                <div class="bg-surface-container-lowest dark:bg-slate-900 border border-outline-variant/60 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
                    <div class="flex items-start justify-between gap-3">
                        <div>
                            <div class="flex items-center gap-2 flex-wrap mb-1">
                                <span class="px-2.5 py-1 rounded-lg bg-primary/10 text-primary font-mono text-[13px] font-extrabold uppercase">
                                    ${order.id}
                                </span>
                                <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold ${order.statusColor || 'bg-primary/10 text-primary'}">
                                    ${order.status}
                                </span>
                                <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold ${pmtBadgeCls}">
                                    ${pmtStatus}
                                </span>
                            </div>
                            <h3 class="text-[20px] font-extrabold text-on-surface dark:text-white leading-tight">
                                ${order.customerName || order.customerId || 'Customer'}
                            </h3>
                            ${order.customerCompany ? `<p class="text-[13px] text-secondary dark:text-slate-400 mt-0.5">${order.customerCompany}</p>` : ''}
                        </div>

                        <!-- Progress Circle / Gauge -->
                        <div class="flex flex-col items-end">
                            <span class="text-[24px] font-mono font-black text-primary">${displayPercentage}%</span>
                            <span class="text-[11px] font-bold text-secondary dark:text-slate-400 uppercase tracking-wider">Floor Progress</span>
                        </div>
                    </div>

                    <!-- Quick Action Buttons Row -->
                    <div class="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-outline-variant/40 dark:border-slate-800">
                        <button type="button" onclick="window.location.href='create-order.html?edit=${order.id}'"
                            class="py-2.5 px-3 rounded-xl bg-surface-container dark:bg-slate-800 hover:bg-amber-500 hover:text-white text-on-surface dark:text-slate-200 text-[12px] font-bold flex items-center justify-center gap-1.5 active-scale transition-apple shadow-xs">
                            <span class="material-symbols-outlined text-[16px]">edit</span>
                            <span>Edit Order</span>
                        </button>
                        <button type="button" onclick="window.location.href='production.html?orderId=${order.id}&stage=${rollup.activeStageKey}'"
                            class="py-2.5 px-3 rounded-xl bg-primary text-white text-[12px] font-bold flex items-center justify-center gap-1.5 active-scale transition-apple shadow-xs hover:bg-primary-hover">
                            <span class="material-symbols-outlined text-[16px]">precision_manufacturing</span>
                            <span>Floor Hub</span>
                        </button>
                        <button type="button" onclick="window.printJobTraveler('${order.id}')"
                            class="py-2.5 px-3 rounded-xl border border-outline-variant dark:border-slate-700 hover:border-primary text-on-surface dark:text-slate-200 text-[12px] font-bold flex items-center justify-center gap-1.5 active-scale transition-apple shadow-xs">
                            <span class="material-symbols-outlined text-[16px]">print</span>
                            <span>Cut Ticket</span>
                        </button>
                    </div>
                </div>

                <!-- Commercial & Delivery Snapshot -->
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div class="bg-surface-container-lowest dark:bg-slate-900 border border-outline-variant/50 dark:border-slate-800 rounded-xl p-3">
                        <span class="text-[10px] font-bold text-secondary dark:text-slate-400 uppercase block">Total Pieces</span>
                        <strong class="text-[16px] text-on-surface dark:text-white">${(order.qty || 0).toLocaleString()} pcs</strong>
                    </div>
                    <div class="bg-surface-container-lowest dark:bg-slate-900 border border-outline-variant/50 dark:border-slate-800 rounded-xl p-3">
                        <span class="text-[10px] font-bold text-secondary dark:text-slate-400 uppercase block">Total Value</span>
                        <strong class="text-[16px] text-primary">₹${(order.value || 0).toLocaleString()}</strong>
                    </div>
                    <div class="bg-surface-container-lowest dark:bg-slate-900 border border-outline-variant/50 dark:border-slate-800 rounded-xl p-3">
                        <span class="text-[10px] font-bold text-secondary dark:text-slate-400 uppercase block">Promised Delivery</span>
                        <strong class="text-[14px] text-on-surface dark:text-white">${order.deliveryDate || 'Not set'}</strong>
                    </div>
                    <div class="bg-surface-container-lowest dark:bg-slate-900 border border-outline-variant/50 dark:border-slate-800 rounded-xl p-3">
                        <span class="text-[10px] font-bold text-secondary dark:text-slate-400 uppercase block">Current Station</span>
                        <strong class="text-[14px] text-primary truncate block">${rollup.activeStageDef.label}</strong>
                    </div>
                </div>

                <!-- Product Lines & Size Matrix Accordion -->
                <div class="bg-surface-container-lowest dark:bg-slate-900 border border-outline-variant/60 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col gap-4">
                    <div class="flex items-center justify-between border-b border-outline-variant/40 dark:border-slate-800 pb-2.5">
                        <h4 class="text-[13px] font-extrabold text-on-surface dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                            <span class="material-symbols-outlined text-[17px] text-primary">inventory_2</span>
                            <span>Product Lines & Sizing (${products.length})</span>
                        </h4>
                    </div>

                    <div class="flex flex-col gap-3">
                        ${products.map((p, idx) => {
                            const pWf = p.workflowType || order.workflowType || 'default';
                            const wfInfo = getWorkflowBadgeInfo(pWf);
                            const pWorkflow = getProductWorkflowStages(p, order.workflowType);
                            const pStageKey = normalizeStageKey(p.status || p.currentStage || pWorkflow[0]);
                            const pStageDef = STAGE_DEFINITIONS[pStageKey] || { label: pStageKey, icon: 'bolt' };
                            const sizes = p.sizes || {};
                            const sizeEntries = Object.entries(sizes).filter(([_, q]) => Number(q) > 0);

                            return `
                                <div class="p-3.5 rounded-xl bg-surface-container dark:bg-slate-800/60 border border-outline-variant/40 dark:border-slate-700/60 flex flex-col gap-2.5">
                                    <div class="flex items-start justify-between gap-2">
                                        <div>
                                            <div class="flex items-center gap-2 mb-0.5">
                                                <span class="font-bold text-[14px] text-on-surface dark:text-white">${p.name || `Product #${idx+1}`}</span>
                                                <span class="px-2 py-0.2 rounded text-[10px] font-extrabold ${wfInfo.bgColor} ${wfInfo.color}">
                                                    ${wfInfo.shortLabel || wfInfo.label}
                                                </span>
                                            </div>
                                            <p class="text-[12px] text-secondary dark:text-slate-400">${p.category || 'Adults'} • ${(p.qty || 0).toLocaleString()} pcs</p>
                                        </div>

                                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-extrabold ${pStageDef.bgColor || 'bg-primary/10'} ${pStageDef.color || 'text-primary'}">
                                            <span class="material-symbols-outlined text-[12px]">${pStageDef.icon || 'bolt'}</span>
                                            <span>${pStageDef.shortLabel || pStageDef.label}</span>
                                        </span>
                                    </div>

                                    <!-- Sizing Matrix Pills -->
                                    ${sizeEntries.length > 0 ? `
                                        <div class="pt-2 border-t border-outline-variant/40 dark:border-slate-700/40">
                                            <span class="text-[10px] font-bold text-secondary dark:text-slate-400 uppercase tracking-wider block mb-1">Size Breakdown:</span>
                                            <div class="flex flex-wrap gap-1.5">
                                                ${sizeEntries.map(([sz, q]) => `
                                                    <span class="px-2 py-0.5 rounded-md bg-surface-container-lowest dark:bg-slate-900 border border-outline-variant/60 dark:border-slate-700 text-[11px] font-semibold">
                                                        <strong class="text-on-surface dark:text-slate-200">${sz}:</strong> <span class="text-primary font-bold">${q}</span>
                                                    </span>
                                                `).join('')}
                                            </div>
                                        </div>
                                    ` : ''}

                                    <!-- Fabric Specs Preview if available -->
                                    ${p.fabric && (p.fabric.type || p.fabric.gsm) ? `
                                        <div class="text-[11px] text-secondary dark:text-slate-400">
                                            <strong>Fabric:</strong> ${p.fabric.type || ''} ${p.fabric.gsm ? `(${p.fabric.gsm} GSM)` : ''} ${p.fabric.dia ? `• Dia: ${p.fabric.dia}` : ''}
                                        </div>
                                    ` : ''}
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>

                <!-- Order Notes / Shipping -->
                ${order.notes || order.customerPo ? `
                    <div class="bg-surface-container-lowest dark:bg-slate-900 border border-outline-variant/60 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
                        <span class="text-[11px] font-extrabold text-secondary dark:text-slate-400 uppercase tracking-wider block mb-1.5">Logistics & Buyer Notes</span>
                        ${order.customerPo ? `<p class="text-[12px] text-secondary dark:text-slate-400 mb-1"><strong>Buyer PO #:</strong> ${order.customerPo}</p>` : ''}
                        ${order.notes ? `<p class="text-[13px] text-on-surface dark:text-slate-200 bg-surface-container dark:bg-slate-800/60 p-2.5 rounded-xl border border-outline-variant/30">${order.notes}</p>` : ''}
                    </div>
                ` : ''}

            </div>
        `;
    },


    dashboardOrderCard(order) {
        const rollup = calculateOrderRollup(order);
        const stageDef = rollup.activeStageDef;
        const targetUrl = window.location.pathname.includes('/pages/')
            ? `production.html?orderId=${order.id}&stage=${rollup.activeStageKey}`
            : `pages/production.html?orderId=${order.id}&stage=${rollup.activeStageKey}`;
        return `
            <div role="button" tabindex="0" onclick="window.location.href='${targetUrl}'" 
                class="p-3.5 flex items-center justify-between active-bg transition-colors cursor-pointer rounded-2xl hover:bg-surface-container/60 dark:hover:bg-slate-800/60 border border-outline-variant/40 dark:border-slate-800 mb-2">
                <div class="flex items-center gap-3 min-w-0 pr-2">
                    <div class="w-10 h-10 rounded-xl ${stageDef.bgColor} ${stageDef.color} flex items-center justify-center shrink-0">
                        <span class="material-symbols-outlined text-[20px]">${stageDef.icon}</span>
                    </div>
                    <div class="min-w-0">
                        <div class="flex items-center gap-2">
                            <span class="text-[12px] font-mono font-bold text-primary dark:text-primary-fixed">${order.id}</span>
                            <span class="text-[13px] font-bold text-on-surface dark:text-slate-100 truncate">${order.customerName || order.customerId}</span>
                        </div>
                        <p class="text-[12px] text-secondary dark:text-slate-400 truncate mt-0.5">${order.product || 'Garments'} • ${(order.qty || 0).toLocaleString()} pcs</p>
                    </div>
                </div>
                <div class="flex flex-col items-end shrink-0">
                    <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold ${stageDef.color} ${stageDef.bgColor}">
                        ${stageDef.shortLabel} (${rollup.overallPercentage}%)
                    </span>
                    <span class="text-[11px] text-primary dark:text-primary-fixed font-bold mt-1 flex items-center gap-0.5">
                        Floor <span class="material-symbols-outlined text-[13px]">arrow_forward</span>
                    </span>
                </div>
            </div>
        `;
    },

    dashboardBatchCard(batch) {
        const stageKey = batch.stageKey || 'cutting';
        const targetUrl = window.location.pathname.includes('/pages/')
            ? `production.html?stage=${stageKey}`
            : `pages/production.html?stage=${stageKey}`;
        return `
            <div onclick="window.location.href='${targetUrl}'" 
                class="p-3.5 rounded-2xl bg-surface-container-low/60 dark:bg-slate-800/60 border border-outline-variant/40 dark:border-slate-700/60 shadow-xs cursor-pointer active-scale transition-apple hover:border-primary">
                <div class="flex justify-between items-end mb-2">
                    <div>
                        <span class="text-[14px] font-bold text-on-surface dark:text-slate-100 block">Batch #${batch.id}</span>
                        <span class="text-[12px] text-secondary dark:text-slate-400">${batch.description || 'Production Batch'}</span>
                    </div>
                    <span class="text-[12px] font-extrabold text-primary dark:text-primary-fixed">${batch.phase || 'Floor'} ${batch.progress || 0}%</span>
                </div>
                <div class="relative w-full h-2 bg-surface-container dark:bg-slate-800 rounded-full overflow-hidden mb-1">
                    <div class="absolute top-0 left-0 h-full ${batch.progressColor || 'bg-primary'} rounded-full transition-apple" style="width: ${batch.progress || 0}%;"></div>
                </div>
                <span class="text-[11px] font-bold text-primary dark:text-primary-fixed flex items-center gap-1 mt-1.5">
                    <span>Open Department Workspace</span>
                    <span class="material-symbols-outlined text-[13px]">arrow_forward</span>
                </span>
            </div>
        `;
    },

    inventoryCard(item) {
        const qty = Number(item.quantity || 0);
        const cost = Number(item.costPrice || item.unitPrice || 0);
        const totalVal = Number(item.totalValue) || (qty * cost);
        const minStock = Number(item.minStock || 0);

        // Progress percentage against 2x minStock threshold
        const targetRef = minStock > 0 ? (minStock * 2) : 100;
        const stockPct = Math.min(100, Math.max(5, Math.round((qty / targetRef) * 100)));

        let barColor = 'bg-[#34C759]';
        if (qty <= 0) {
            barColor = 'bg-error';
        } else if (minStock > 0 && qty <= minStock) {
            barColor = 'bg-[#FF9F0A]';
        }

        // Gather spec chips (GSM, color, size, etc.)
        const specChips = [];
        if (item.color) specChips.push(item.color);
        if (item.specifications) {
            if (item.specifications.gsm) specChips.push(`${item.specifications.gsm} GSM`);
            if (item.specifications.width) specChips.push(item.specifications.width);
            if (item.specifications.count) specChips.push(item.specifications.count);
            if (item.specifications.size) specChips.push(item.specifications.size);
            if (item.specifications.rolls) specChips.push(`${item.specifications.rolls} Rolls`);
        }

        return `
            <div role="button" tabindex="0" class="bg-surface-container-lowest rounded-[24px] border border-outline-variant p-4 sm:p-5 shadow-sm active-scale transition-apple cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary flex flex-col gap-3" onclick="window.openItemDetails('${item.id}')">
                <!-- Header -->
                <div class="flex justify-between items-start gap-3">
                    <div class="flex gap-3 items-center min-w-0">
                        <div class="w-11 h-11 rounded-2xl ${item.iconColor || 'bg-primary/10 text-primary'} flex items-center justify-center shrink-0 shadow-xs">
                            <span class="material-symbols-outlined text-[22px]">${item.icon || 'inventory_2'}</span>
                        </div>
                        <div class="min-w-0">
                            <h4 class="text-[15px] font-bold text-on-surface leading-snug truncate">${item.name}</h4>
                            <div class="flex items-center gap-1.5 flex-wrap text-[12px] text-secondary mt-0.5">
                                <span class="font-mono text-primary font-semibold">${item.sku || 'SKU-GEN'}</span>
                                <span>•</span>
                                <span>${item.category || 'General'}${item.subCategory ? ` / ${item.subCategory}` : ''}</span>
                                ${item.location ? `
                                    <span>•</span>
                                    <span class="inline-flex items-center gap-0.5 text-on-surface-variant font-medium">
                                        <span class="material-symbols-outlined text-[13px]">pin_drop</span>
                                        ${item.location}
                                    </span>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                    <span class="px-2.5 py-1 rounded-full text-[11px] font-bold tracking-tight shrink-0 ${item.statusColor || 'bg-[#008A00]/10 text-[#008A00]'}">
                        ${item.status || 'In Stock'}
                    </span>
                </div>

                <!-- Spec Chips -->
                ${specChips.length > 0 ? `
                    <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                        ${specChips.map(chip => `
                            <span class="px-2 py-0.5 rounded-md bg-surface-container text-secondary text-[11px] font-medium shrink-0 border border-outline-variant/40">
                                ${chip}
                            </span>
                        `).join('')}
                    </div>
                ` : ''}

                <!-- Stock Level Progress Bar -->
                <div class="w-full bg-surface-container rounded-full h-1.5 overflow-hidden">
                    <div class="h-full rounded-full ${barColor} transition-all duration-300" style="width: ${stockPct}%"></div>
                </div>

                <!-- 3-Column Valuation & Metrics Grid -->
                <div class="grid grid-cols-3 gap-2 pt-1 border-t border-outline-variant/40">
                    <div class="flex flex-col">
                        <span class="text-[10px] font-bold text-secondary uppercase tracking-wider">In Hand</span>
                        <span class="text-[15px] font-bold text-on-surface leading-tight mt-0.5">
                            ${qty.toLocaleString()} <span class="text-[11px] text-secondary font-medium">${item.unit || 'units'}</span>
                        </span>
                    </div>
                    <div class="flex flex-col border-l border-outline-variant/30 pl-2">
                        <span class="text-[10px] font-bold text-secondary uppercase tracking-wider">Unit Cost</span>
                        <span class="text-[14px] font-semibold text-on-surface leading-tight mt-0.5">
                            ₹${cost.toLocaleString('en-IN')}
                        </span>
                    </div>
                    <div class="flex flex-col border-l border-outline-variant/30 pl-2">
                        <span class="text-[10px] font-bold text-secondary uppercase tracking-wider">Total Value</span>
                        <span class="text-[15px] font-bold text-primary leading-tight mt-0.5">
                            ₹${totalVal >= 100000 ? (totalVal / 100000).toFixed(2) + 'L' : totalVal.toLocaleString('en-IN')}
                        </span>
                    </div>
                </div>
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

    transactionCard(t) {
        const isIncome = t.type === 'Income';
        const amountColor = isIncome ? 'text-[#008A00]' : 'text-on-surface';

        // Modern gradients for the icon
        const iconGradient = isIncome
            ? 'bg-gradient-to-br from-[#30D158] to-[#008A00] text-white shadow-[0_2px_8px_rgba(0,138,0,0.3)]'
            : 'bg-gradient-to-br from-[#FF6B6B] to-[#FF453A] text-white shadow-[0_2px_8px_rgba(255,69,58,0.3)]';
        const icon = isIncome ? 'arrow_downward' : 'arrow_upward';

        let subTotal = 0;
        if (t.subEntries) {
            try {
                const entries = typeof t.subEntries === 'string' ? JSON.parse(t.subEntries) : (Array.isArray(t.subEntries) ? t.subEntries : []);
                subTotal = entries.reduce((s, se) => s + (parseFloat(se.amount) || 0), 0);
            } catch { }
        }
        const finalAmount = (parseFloat(t.amount) || 0) + subTotal;
        const amountStr = (isIncome ? '+' : '-') + '₹' + finalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        // Refined Badges with micro-icons
        const statusUI = t.status === 'Completed'
            ? '<div class="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#008A00]/10 text-[#008A00] border border-[#008A00]/20"><span class="material-symbols-outlined text-[11px]">check_circle</span><span class="text-[11px] font-bold tracking-wide">Completed</span></div>'
            : (t.status === 'Pending'
                ? '<div class="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#FF9F0A]/10 text-[#FF9F0A] border border-[#FF9F0A]/20"><span class="material-symbols-outlined text-[11px]">schedule</span><span class="text-[11px] font-bold tracking-wide">Pending</span></div>'
                : '<div class="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-surface-variant text-secondary border border-outline-variant/30"><span class="material-symbols-outlined text-[11px]">cancel</span><span class="text-[11px] font-bold tracking-wide">Cancelled</span></div>');

        return `
            <div class="bg-surface-container-lowest rounded-[24px] border border-outline-variant/50 p-4 mb-3 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer active:scale-[0.98]" onclick="window.openTransactionDetails('${t.id}')">
                <div class="flex items-start gap-4">
                    <div class="w-11 h-11 rounded-full ${iconGradient} flex items-center justify-center shrink-0 mt-0.5">
                        <span class="material-symbols-outlined text-[20px]">${icon}</span>
                    </div>
                    
                    <div class="flex-1 min-w-0">
                        <div class="flex justify-between items-baseline mb-1.5 gap-2">
                            <h4 class="text-[16px] font-bold text-on-surface truncate tracking-tight">${t.title}</h4>
                            <span class="text-[17px] font-extrabold ${amountColor} whitespace-nowrap shrink-0">${amountStr}</span>
                        </div>
                        
                        <div class="flex items-center gap-2 mb-3 flex-wrap">
                            <div class="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-surface-variant/60 text-secondary border border-outline-variant/30">
                                <span class="material-symbols-outlined text-[11px]">sell</span>
                                <span class="text-[11px] font-bold tracking-wide">${t.category}</span>
                            </div>
                            ${(() => {
                if (!t.refId) return '';
                let partyName = t.refId;
                if (window.financeParties) {
                    const partiesList = isIncome ? window.financeParties.customers : window.financeParties.vendors;
                    const party = partiesList?.find(p => String(p.id) === String(t.refId));
                    if (party) partyName = party.name;
                }
                return `
                                <div class="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#5E5CE6]/10 text-[#5E5CE6] border border-[#5E5CE6]/20">
                                    <span class="material-symbols-outlined text-[11px]">${isIncome ? 'person' : 'storefront'}</span>
                                    <span class="text-[11px] font-bold tracking-wide truncate max-w-[120px]">${partyName}</span>
                                </div>`;
            })()}
                            ${statusUI}
                            ${(() => {
                const attCount = Array.isArray(t.attachments) ? t.attachments.length : 0;
                if (attCount === 0) return '';
                return `
                                <div class="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-primary/10 text-primary border border-primary/20" title="${attCount} receipt/attachment${attCount > 1 ? 's' : ''}">
                                    <span class="material-symbols-outlined text-[11px]">attach_file</span>
                                    <span class="text-[11px] font-bold tracking-wide">${attCount}</span>
                                </div>`;
            })()}
                        </div>
                        
                        ${t.notes ? `
                        <div class="relative mb-3 mt-1">
                            <div class="absolute -left-1.5 top-2.5 w-3 h-3 bg-surface-variant/40 rotate-45 transform origin-center border-l border-b border-outline-variant/30"></div>
                            <div class="relative bg-surface-variant/40 px-3.5 py-2.5 rounded-2xl rounded-tl-sm border border-outline-variant/30">
                                <p class="text-[12.5px] text-on-surface-variant leading-relaxed line-clamp-2 font-medium">
                                    ${t.notes}
                                </p>
                            </div>
                        </div>` : ''}
                        
                        <div class="flex items-center justify-between text-[11.5px] text-secondary font-semibold mt-1">
                            <div class="flex items-center gap-1.5">
                                <span class="material-symbols-outlined text-[14px]">calendar_today</span>
                                <span>${t.date}</span>
                                <span class="text-outline-variant/50 px-0.5">•</span>
                                <span class="material-symbols-outlined text-[14px]">payments</span>
                                <span>${t.paymentMethod || 'Bank Transfer'}</span>
                            </div>
                            ${t.referenceNo ? `<span class="bg-surface-container px-1.5 py-0.5 rounded text-[10px] font-mono tracking-widest text-secondary/70">#${t.referenceNo}</span>` : ''}
                        </div>
                    </div>
                </div>
            </div>`;
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
        let subTotal = 0;
        if (t.subEntries) {
            try {
                const entries = typeof t.subEntries === 'string' ? JSON.parse(t.subEntries) : (Array.isArray(t.subEntries) ? t.subEntries : []);
                subTotal = entries.reduce((s, se) => s + (parseFloat(se.amount) || 0), 0);
            } catch { }
        }
        const finalAmount = (parseFloat(t.amount) || 0) + subTotal;
        const amountStr = (isIncome ? '+' : '-') + '₹' + finalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 });

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
