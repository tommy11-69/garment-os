export function TimelineEvent({ title, description, timestamp, status = 'completed', user, type, isLast = false }) {
    const statusColors = {
        completed: 'bg-primary border-primary text-on-primary',
        active: 'bg-white border-primary text-primary',
        pending: 'bg-surface border-outline text-outline'
    };
    
    // Determine icon based on type
    let iconName = 'check';
    if (type === 'system') iconName = 'settings';
    if (type === 'status') iconName = 'update';
    if (type === 'inventory') iconName = 'inventory_2';
    
    const iconColor = statusColors[status] || statusColors.pending;
    let icon = '';
    if (status === 'completed') icon = `<span class="material-symbols-outlined text-[12px]">${iconName}</span>`;
    else if (status === 'active') icon = '<span class="w-2 h-2 rounded-full bg-primary"></span>';

    return `
    <div class="flex gap-4">
        <div class="flex flex-col items-center">
            <div class="w-8 h-8 rounded-full border-2 flex items-center justify-center z-10 ${iconColor}">
                ${icon}
            </div>
            ${!isLast ? `<div class="w-[2px] flex-1 bg-outline-variant/50 my-1"></div>` : ''}
        </div>
        <div class="pb-6 flex-1">
            <h4 class="text-[15px] font-semibold text-on-surface">${title}</h4>
            ${description ? `<p class="text-[13px] text-secondary mt-1">${description}</p>` : ''}
            <div class="flex items-center gap-2 mt-2">
                <span class="text-[11px] text-secondary/70 font-medium">${timestamp}</span>
                ${user ? `<span class="text-[11px] px-2 py-0.5 rounded-full bg-surface-variant text-secondary">${user}</span>` : ''}
            </div>
        </div>
    </div>`;
}

export function TaskCard({ id, title, status, assignee }) {
    const isCompleted = status === 'Completed';
    const checkClass = isCompleted ? 'text-primary' : 'text-outline';
    const checkIcon = isCompleted ? 'check_box' : 'check_box_outline_blank';
    const textClass = isCompleted ? 'text-secondary line-through' : 'text-on-surface';

    return `
    <div class="flex items-center gap-3 p-3 rounded-xl border border-outline-variant/50 bg-surface-container-lowest mb-2 cursor-pointer active-bg transition-colors" onclick="window.toggleTaskStatus('${id}')">
        <span class="material-symbols-outlined ${checkClass} text-[20px] shrink-0">${checkIcon}</span>
        <div class="flex-1 min-w-0">
            <h4 class="text-[14px] font-medium ${textClass} truncate">${title}</h4>
            <div class="flex items-center gap-1 mt-1">
                <span class="material-symbols-outlined text-[12px] text-secondary">person</span>
                <span class="text-[11px] text-secondary truncate">${assignee}</span>
            </div>
        </div>
    </div>`;
}

export function TransactionRow({ title, date, amount, type }) {
    const isIncome = type === 'income';
    const amountClass = isIncome ? 'text-[#008A00]' : 'text-on-surface';
    const iconClass = isIncome ? 'bg-[#008A00]/10 text-[#008A00]' : 'bg-error/10 text-error';
    const iconName = isIncome ? 'arrow_downward' : 'arrow_upward';
    const formattedAmount = isIncome ? `+₹${amount}` : `-₹${amount}`;

    return `
    <div class="flex items-center justify-between p-4">
        <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full ${iconClass} flex items-center justify-center shrink-0">
                <span class="material-symbols-outlined text-[20px]">${iconName}</span>
            </div>
            <div>
                <p class="text-[15px] font-semibold text-on-surface">${title}</p>
                <p class="text-[12px] text-secondary">${date}</p>
            </div>
        </div>
        <div class="text-[16px] font-bold tracking-tight ${amountClass}">
            ${formattedAmount}
        </div>
    </div>`;
}
