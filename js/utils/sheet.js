/**
 * Global Bottom Sheet Utility
 */

function openSheet(id) {
    const overlay = document.getElementById(id + '-overlay');
    const content = document.getElementById(id + '-content');
    
    if (overlay) overlay.classList.add('active');
    if (content) content.classList.add('active');
    
    document.body.style.overflow = 'hidden';
}

function closeSheet(id) {
    const overlay = document.getElementById(id + '-overlay');
    const content = document.getElementById(id + '-content');
    
    if (overlay) overlay.classList.remove('active');
    if (content) content.classList.remove('active');
    
    document.body.style.overflow = '';
}

// Make globally available for inline onclick attributes
window.openSheet = openSheet;
window.closeSheet = closeSheet;

/**
 * Dynamically creates and shows a confirmation bottom sheet.
 * @param {Object} options - Configuration options
 */
function showConfirmation({ title, message, confirmText = 'Confirm', cancelText = 'Cancel', type = 'danger', onConfirm }) {
    // Generate unique ID
    const id = 'confirm-' + Math.random().toString(36).substr(2, 9);
    
    const isDanger = type === 'danger';
    const confirmClass = isDanger ? 'bg-error text-white' : 'bg-primary text-white';
    const cancelClass = 'bg-surface-container-high text-on-surface';
    
    // Create DOM element
    const container = document.createElement('div');
    container.innerHTML = `
        <div id="${id}-overlay" class="bottom-sheet-overlay" onclick="closeConfirmation('${id}')"></div>
        <div id="${id}-content" class="bottom-sheet-content flex flex-col max-h-[50vh]">
            <div class="sheet-handle"></div>
            <div class="px-lg pb-md">
                <h2 class="text-[20px] font-bold text-on-surface mb-2">${title}</h2>
                <p class="text-[15px] text-secondary">${message}</p>
            </div>
            <div class="p-4 border-t border-outline-variant/30 bg-surface-container-lowest safe-bottom flex gap-3">
                <button onclick="closeConfirmation('${id}')" class="flex-1 ${cancelClass} font-bold text-[16px] py-4 rounded-2xl active-scale transition-apple">
                    ${cancelText}
                </button>
                <button id="${id}-confirm-btn" class="flex-1 ${confirmClass} font-bold text-[16px] py-4 rounded-2xl active-scale transition-apple shadow-sm">
                    ${confirmText}
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(container);
    
    // Bind confirm action
    document.getElementById(`${id}-confirm-btn`).addEventListener('click', () => {
        if (onConfirm) onConfirm();
        closeConfirmation(id);
    });
    
    // Animate in (next frame)
    requestAnimationFrame(() => {
        openSheet(id);
    });
}

// Special closer that also removes the element from DOM
function closeConfirmation(id) {
    closeSheet(id);
    setTimeout(() => {
        const overlay = document.getElementById(id + '-overlay');
        if (overlay && overlay.parentElement) {
            overlay.parentElement.remove();
        }
    }, 350); // wait for animation
}

window.showConfirmation = showConfirmation;
window.closeConfirmation = closeConfirmation;
