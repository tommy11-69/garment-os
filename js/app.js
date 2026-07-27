// Core App logic

/**
 * Loads a component HTML into a target element
 * @param {string} url - The URL of the component to load
 * @param {string} targetId - The ID of the element to inject the component into
 * @param {function} callback - Optional callback to run after the component is loaded
 */
async function loadComponent(url, targetId, callback) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to load ${url}`);
        const html = await response.text();
        const el = document.getElementById(targetId);
        if (el) {
            el.innerHTML = html;
            if (callback) callback();
        }
    } catch (error) {
        console.error('Error loading component:', error);
    }
}

/**
 * Initialize the application
 */
function initApp() {
    // Determine current page from URL
    const path = window.location.pathname;
    let currentPage = path.split('/').pop().replace('.html', '');
    if (!currentPage || currentPage === 'index' || currentPage === '') {
        currentPage = 'dashboard';
    }

    // Load Mobile Bottom Navigation
    loadComponent('../components/bottom-nav.html', 'bottom-nav-container', () => {
        // Set active state on bottom nav links
        const tabs = document.querySelectorAll('.nav-tab');
        tabs.forEach(tab => {
            if (tab.dataset.page === currentPage) {
                const icon = tab.querySelector('.material-symbols-outlined');
                const text = tab.querySelector('.font-caption');
                
                // Update icon fill and color
                if (icon) {
                    icon.style.fontVariationSettings = "'FILL' 1";
                    icon.classList.remove('text-secondary', 'group-hover:text-primary');
                    icon.classList.add('text-primary');
                }
                
                // Update text color
                if (text) {
                    text.classList.remove('text-secondary', 'group-hover:text-primary');
                    text.classList.add('text-primary', 'font-semibold');
                }
                
                // Add ARIA current page attribute
                tab.setAttribute('aria-current', 'page');
            } else {
                tab.removeAttribute('aria-current');
            }
        });
    });

    // Load Mobile Top Bar
    loadComponent('../components/topbar-mobile.html', 'topbar-container');
    
    // Load FAB if container exists
    const fabContainer = document.getElementById('fab-container');
    if (fabContainer) {
        loadComponent('../components/fab.html', 'fab-container', () => {
            const btn = fabContainer.querySelector('button');
            const iconEl = fabContainer.querySelector('.material-symbols-outlined');
            
            if (btn && fabContainer.dataset.action) {
                btn.setAttribute('onclick', fabContainer.dataset.action);
            }
            if (iconEl && fabContainer.dataset.icon) {
                iconEl.textContent = fabContainer.dataset.icon;
            }
        });
    }
}

// Ensure DevTools are available (this is imported statically via a script tag later, wait, app.js is not a module by default).
// Actually, let's just dynamically import it since app.js is a classic script.
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    import('./utils/devtools.js').then(module => {
        module.initDevTools();
    }).catch(e => console.log('DevTools not loaded', e));
    
    // Global keyboard support for elements with role="button"
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            const activeEl = document.activeElement;
            if (activeEl && (activeEl.getAttribute('role') === 'button' || activeEl.hasAttribute('tabindex'))) {
                e.preventDefault();
                activeEl.click();
            }
        }
    });
});
