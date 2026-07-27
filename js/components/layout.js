export function Accordion({ title, icon, content, isOpen = false }) {
    return `
    <details class="bg-surface-container-lowest rounded-[24px] border border-outline-variant shadow-sm overflow-hidden" ${isOpen ? 'open' : ''}>
        <summary class="flex justify-between items-center p-md cursor-pointer outline-none select-none">
            <div class="flex items-center gap-3">
                ${icon ? `
                <div class="w-10 h-10 rounded-full bg-surface-variant text-on-surface-variant flex items-center justify-center">
                    <span class="material-symbols-outlined text-[20px]">${icon}</span>
                </div>` : ''}
                <h3 class="text-[17px] font-semibold text-on-surface">${title}</h3>
            </div>
            <span class="material-symbols-outlined text-secondary expand-icon transition-apple duration-200">expand_more</span>
        </summary>
        <div class="px-md pb-md border-t border-outline-variant/30 pt-md">
            ${content}
        </div>
    </details>`;
}

export function EmptyState({ icon = 'inbox', title = 'No data found', description = '', actionText = '', actionId = '', type = 'default' }) {
    const isError = type === 'error';
    const iconBgClass = isError ? 'bg-error-container text-error' : 'bg-surface-variant text-on-surface-variant';
    const titleClass = isError ? 'text-error' : 'text-on-surface';
    const actionBgClass = isError ? 'bg-error/10 text-error' : 'bg-primary/10 text-primary';
    
    return `
    <div class="flex flex-col items-center justify-center py-12 text-center px-4">
        <div class="w-16 h-16 rounded-full ${iconBgClass} flex items-center justify-center mb-4">
            <span class="material-symbols-outlined text-[32px]" ${isError ? 'style="font-variation-settings:\'FILL\' 1"' : ''}>${icon}</span>
        </div>
        <h3 class="text-[17px] font-semibold ${titleClass} mb-1">${title}</h3>
        ${description ? `<p class="text-[14px] text-secondary mb-6 max-w-[260px]">${description}</p>` : ''}
        ${actionText ? `
        <button ${actionId ? `id="${actionId}"` : ''} class="px-6 py-2.5 ${actionBgClass} font-semibold rounded-xl text-[14px] active-scale transition-apple">
            ${actionText}
        </button>` : ''}
    </div>`;
}

export function SkeletonBlock({ height = 'h-4', width = 'w-full', round = 'rounded' }) {
    return `<div class="${height} ${width} ${round} skeleton-block"></div>`;
}

export function SkeletonList({ rows = 3 }) {
    let items = '';
    for (let i = 0; i < rows; i++) {
        items += `
        <div class="flex items-center gap-3 p-4 border-b border-outline-variant/30">
            ${SkeletonBlock({ width: 'w-10', height: 'h-10', round: 'rounded-full shrink-0' })}
            <div class="flex-1">
                ${SkeletonBlock({ width: 'w-3/4', height: 'h-4', round: 'rounded mb-2' })}
                ${SkeletonBlock({ width: 'w-1/2', height: 'h-3', round: 'rounded' })}
            </div>
        </div>`;
    }
    return `<div class="bg-surface-container-lowest rounded-[24px] border border-outline-variant overflow-hidden">${items}</div>`;
}

export function PageSkeleton() {
    return `
    <div class="flex flex-col gap-lg">
        <div class="px-xs pt-sm">
            ${SkeletonBlock({ width: 'w-48', height: 'h-8', round: 'rounded-lg mb-2' })}
            ${SkeletonBlock({ width: 'w-32', height: 'h-4', round: 'rounded' })}
        </div>
        <div class="flex gap-4 px-xs">
            ${SkeletonBlock({ width: 'flex-1', height: 'h-24', round: 'rounded-2xl' })}
            ${SkeletonBlock({ width: 'flex-1', height: 'h-24', round: 'rounded-2xl' })}
        </div>
        ${SkeletonList({ rows: 4 })}
    </div>
    `;
}

export function Pagination({ currentPage = 1, totalPages = 1 }) {
    return `
    <div class="flex items-center justify-between mt-4 px-2">
        <button class="w-9 h-9 flex items-center justify-center rounded-full border border-outline-variant text-on-surface disabled:opacity-30 disabled:cursor-not-allowed transition-colors hover:bg-surface-variant" ${currentPage === 1 ? 'disabled' : ''}>
            <span class="material-symbols-outlined text-[18px]">chevron_left</span>
        </button>
        <span class="text-[13px] font-medium text-secondary">Page ${currentPage} of ${totalPages}</span>
        <button class="w-9 h-9 flex items-center justify-center rounded-full border border-outline-variant text-on-surface disabled:opacity-30 disabled:cursor-not-allowed transition-colors hover:bg-surface-variant" ${currentPage === totalPages ? 'disabled' : ''}>
            <span class="material-symbols-outlined text-[18px]">chevron_right</span>
        </button>
    </div>`;
}

export function BottomSheet({ id, title = '', customHeader = '', content, footerContent = '', height = '85vh', isForm = false }) {
    let headerHtml = customHeader;
    if (title) {
        headerHtml = `
        <div class="px-lg pb-md flex justify-between items-center border-b border-outline-variant/30">
            <h2 id="${id}-title" class="text-[20px] font-bold text-on-surface">${title}</h2>
            <button type="button" aria-label="Close" onclick="closeSheet('${id}')" class="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center text-secondary active-scale transition-apple">
                <span class="material-symbols-outlined text-[20px]" aria-hidden="true">close</span>
            </button>
        </div>`;
    }

    let footerHtml = '';
    if (footerContent) {
        footerHtml = `
        <div class="p-4 border-t border-outline-variant/30 bg-surface-container-lowest safe-bottom flex gap-3">
            ${footerContent}
        </div>`;
    }

    const tag = isForm ? 'form' : 'div';
    const formAttr = isForm ? 'novalidate onsubmit="event.preventDefault();"' : '';

    return `
    <!-- Overlay -->
    <div id="${id}-overlay" class="bottom-sheet-overlay" onclick="closeSheet('${id}')" aria-hidden="true"></div>
    
    <!-- Sheet -->
    <${tag} id="${id}" role="dialog" aria-modal="true" aria-labelledby="${id}-title" class="bottom-sheet-content flex flex-col h-[${height}]" ${formAttr}>
        <div class="sheet-handle"></div>
        ${headerHtml}
        <div class="flex-1 overflow-y-auto p-lg flex flex-col gap-lg bg-background">
            ${content}
        </div>
        ${footerHtml}
    </${tag}>`;
}

