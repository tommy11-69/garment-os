export function StatusBadge({ status, label }) {
    const styles = {
        success: 'bg-[#008A00]/10 text-[#008A00]',
        warning: 'bg-[#FF9F0A]/10 text-[#FF9F0A]',
        error: 'bg-error-container text-error',
        neutral: 'bg-surface-variant text-on-surface-variant',
        primary: 'bg-primary/10 text-primary'
    };
    
    const appliedStyle = styles[status] || styles.neutral;

    return `<span class="px-2.5 py-1 rounded-full text-[11px] font-medium ${appliedStyle}">
        ${label}
    </span>`;
}
