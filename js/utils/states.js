import { SkeletonList, EmptyState, PageSkeleton } from '../components/index.js';

/**
 * Sets a container's content to a loading skeleton.
 * @param {string} containerId - The ID of the container element
 * @param {number} rows - Number of skeleton rows to show (default: 3)
 */
export function setLoading(containerId, rows = 3) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Store original content if we haven't already
    if (!container.dataset.originalContent) {
        container.dataset.originalContent = container.innerHTML;
    }
    
    if (containerId === 'main-content-area') {
        container.innerHTML = PageSkeleton();
    } else {
        container.innerHTML = SkeletonList({ rows });
    }
}

/**
 * Sets a container's content to an empty state.
 * @param {string} containerId - The ID of the container element
 * @param {Object} options - Configuration options for EmptyState
 */
export function setEmpty(containerId, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Store original content if we haven't already
    if (!container.dataset.originalContent) {
        container.dataset.originalContent = container.innerHTML;
    }
    
    container.innerHTML = EmptyState({
        icon: options.icon || 'inbox',
        title: options.title || 'No data found',
        description: options.description || '',
        actionText: options.actionText || '',
        actionId: options.actionId || '',
        type: 'default'
    });
}

/**
 * Sets a container's content to an error state.
 * @param {string} containerId - The ID of the container element
 * @param {Object} options - Configuration options for EmptyState (error variation)
 */
export function setError(containerId, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Store original content if we haven't already
    if (!container.dataset.originalContent) {
        container.dataset.originalContent = container.innerHTML;
    }
    
    container.innerHTML = EmptyState({
        icon: options.icon || 'error',
        title: options.title || 'Something went wrong',
        description: options.description || 'Failed to load data. Please check your connection and try again.',
        actionText: options.actionText || 'Retry',
        actionId: options.actionId || '',
        type: 'error'
    });
}

/**
 * Restores a container's original content.
 * @param {string} containerId - The ID of the container element
 */
export function restoreContent(containerId) {
    const container = document.getElementById(containerId);
    if (!container || !container.dataset.originalContent) return;
    
    container.innerHTML = container.dataset.originalContent;
}

// Make globally available for inline onclick handlers if needed
window.setLoading = setLoading;
window.setEmpty = setEmpty;
window.setError = setError;
window.restoreContent = restoreContent;
