export function ProgressBar({ label = '', secondaryLabel = '', percentage = 0, color = 'primary' }) {
    const colorStyles = {
        primary: 'bg-primary',
        success: 'bg-[#008A00]',
        warning: 'bg-[#FF9F0A]',
        error: 'bg-error'
    };
    
    const barColor = colorStyles[color] || colorStyles.primary;
    
    let header = '';
    if (label || secondaryLabel) {
        header = `
        <div class="flex justify-between items-end mb-2">
            <div>
                ${label ? `<span class="text-body-bold text-on-surface block">${label}</span>` : ''}
                ${secondaryLabel ? `<span class="text-[13px] text-secondary">${secondaryLabel}</span>` : ''}
            </div>
            <span class="text-[13px] font-medium ${color === 'warning' ? 'text-[#FF9F0A]' : 'text-primary'}">${percentage}%</span>
        </div>`;
    }

    return `
    <div>
        ${header}
        <div class="relative w-full h-2.5 bg-surface-container rounded-full overflow-hidden">
            <div class="absolute top-0 left-0 h-full ${barColor} rounded-full" style="width: ${percentage}%;"></div>
        </div>
    </div>`;
}
