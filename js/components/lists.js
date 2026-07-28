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
    if (type === 'action') iconName = 'bolt';
    if (type === 'task') iconName = 'task_alt';
    if (type === 'expense') iconName = 'receipt_long';
    if (type === 'edit') iconName = 'edit';
    
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

export function TaskCard({ id, title, status, assignee, priority = 'Normal', dueDate = '' }) {
    const isCompleted = status === 'Completed';
    const checkClass = isCompleted ? 'text-primary' : 'text-outline';
    const checkIcon = isCompleted ? 'check_box' : 'check_box_outline_blank';
    const textClass = isCompleted ? 'text-secondary line-through' : 'text-on-surface';

    const priorityColors = { High: 'text-error bg-error/10', Normal: 'text-secondary bg-surface-variant', Low: 'text-secondary bg-surface-variant' };
    const priorityBadge = priority && priority !== 'Normal'
        ? `<span class="text-[10px] font-bold px-1.5 py-0.5 rounded ${priorityColors[priority] || priorityColors.Normal}">${priority}</span>`
        : '';

    const dueDateChip = dueDate
        ? `<span class="text-[10px] text-secondary flex items-center gap-0.5"><span class="material-symbols-outlined text-[11px]">event</span>${dueDate}</span>`
        : '';

    return `
    <div class="flex items-center gap-3 p-3 rounded-xl border border-outline-variant/50 bg-surface-container-lowest mb-2">
        <span class="material-symbols-outlined ${checkClass} text-[20px] shrink-0 cursor-pointer active-scale transition-apple" onclick="window.toggleTaskStatus('${id}')">${checkIcon}</span>
        <div class="flex-1 min-w-0 cursor-pointer" onclick="window.toggleTaskStatus('${id}')">
            <h4 class="text-[14px] font-medium ${textClass} truncate">${title}</h4>
            <div class="flex items-center gap-2 mt-1 flex-wrap">
                <span class="text-[11px] text-secondary flex items-center gap-0.5 truncate"><span class="material-symbols-outlined text-[11px]">person</span>${assignee || 'Unassigned'}</span>
                ${priorityBadge}
                ${dueDateChip}
            </div>
        </div>
        <div class="flex gap-1 shrink-0">
            <button onclick="event.stopPropagation(); window.openEditTask('${id}')" class="w-7 h-7 rounded-lg flex items-center justify-center text-secondary active-bg transition-colors" title="Edit Task">
                <span class="material-symbols-outlined text-[16px]">edit</span>
            </button>
            <button onclick="event.stopPropagation(); window.deleteTask('${id}')" class="w-7 h-7 rounded-lg flex items-center justify-center text-error/70 active-bg transition-colors" title="Delete Task">
                <span class="material-symbols-outlined text-[16px]">delete</span>
            </button>
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
