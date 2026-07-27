export function showToast(message, type = 'success') {
    const existing = document.getElementById('global-toast');
    if (existing) existing.remove();

    const icons = {
        success: 'check_circle',
        error: 'error',
        warning: 'warning',
        offline: 'cloud_off',
        info: 'info'
    };
    
    const colors = {
        success: 'bg-[#008A00] text-white',
        error: 'bg-error text-white',
        warning: 'bg-warning text-white',
        offline: 'bg-[#1B1B1D] text-white', /* dark for offline */
        info: 'bg-surface-variant text-on-surface'
    };

    const icon = icons[type] || icons.info;
    const color = colors[type] || colors.info;

    const toast = document.createElement('div');
    toast.id = 'global-toast';
    toast.className = `fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg transform transition-all duration-300 translate-y-8 opacity-0 ${color}`;
    
    toast.innerHTML = `
        <span class="material-symbols-outlined text-[20px]" style="font-variation-settings:'FILL' 1;">${icon}</span>
        <span class="text-[14px] font-medium tracking-wide">${message}</span>
    `;

    document.body.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
        toast.classList.remove('translate-y-8', 'opacity-0');
        toast.classList.add('translate-y-0', 'opacity-100');
    });

    // Auto dismiss
    setTimeout(() => {
        toast.classList.remove('translate-y-0', 'opacity-100');
        toast.classList.add('translate-y-8', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Make it globally available for non-module scripts
window.showToast = showToast;
