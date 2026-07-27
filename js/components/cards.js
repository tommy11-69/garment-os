export function MetricCard({ title, icon, value, trend, trendValue, iconColorClass, trendColorClass }) {
    const trendIcon = trend === 'up' ? 'trending_up' : trend === 'down' ? 'trending_down' : 'remove';
    
    return `
    <div class="card p-md flex flex-col justify-between bg-surface-container-lowest border-outline-variant shadow-sm rounded-[20px]">
        <div class="flex items-center justify-between mb-3">
            <span class="text-caption text-secondary font-medium">${title}</span>
            <div class="p-1 rounded-full ${iconColorClass}">
                <span class="material-symbols-outlined text-[16px]">${icon}</span>
            </div>
        </div>
        <div>
            <div class="text-[22px] font-semibold tracking-tight text-on-surface">${value}</div>
            ${trendValue ? `
            <div class="flex items-center mt-1">
                <span class="text-[11px] font-medium ${trendColorClass} flex items-center">
                    <span class="material-symbols-outlined mr-0.5 text-[12px]">${trendIcon}</span>
                    ${trendValue}
                </span>
            </div>` : ''}
        </div>
    </div>`;
}
