export function TimelineEvent({ title, description, timestamp, status, isLast = false }) {
    const statusColors = {
        completed: 'bg-primary border-primary text-on-primary',
        active: 'bg-white border-primary text-primary',
        pending: 'bg-surface border-outline text-outline'
    };
    
    const iconColor = statusColors[status] || statusColors.pending;
    
    // Check icon style
    let icon = '';
    if (status === 'completed') icon = '<span class="material-symbols-outlined text-[12px]">check</span>';
    else if (status === 'active') icon = '<span class="w-2 h-2 rounded-full bg-primary"></span>';

    return `
    <div class="flex gap-4">
        <div class="flex flex-col items-center">
            <div class="w-6 h-6 rounded-full border-2 flex items-center justify-center z-10 ${iconColor}">
                ${icon}
            </div>
            ${!isLast ? `<div class="w-[2px] flex-1 bg-outline-variant/50 my-1"></div>` : ''}
        </div>
        <div class="pb-6">
            <h4 class="text-[15px] font-semibold text-on-surface">${title}</h4>
            ${description ? `<p class="text-[13px] text-secondary mt-1">${description}</p>` : ''}
            <span class="text-[11px] text-secondary/70 font-medium mt-1 block">${timestamp}</span>
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
