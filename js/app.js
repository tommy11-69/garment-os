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

    import('./utils/states.js').catch(e => console.log('States not loaded', e));
    import('./utils/toast.js').then(module => {
        window.showToast = module.showToast;
    }).catch(e => console.log('Toast not loaded', e));
    
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

window.openQuickAddCustomer = function (callback) {
    const existing = document.getElementById('quickAddCustomerSheet-overlay');
    if (existing) {
        existing.parentElement.remove();
    }

    const container = document.createElement('div');
    container.innerHTML = `
        <div id="quickAddCustomerSheet-overlay" class="bottom-sheet-overlay" onclick="closeSheet('quickAddCustomerSheet'); setTimeout(() => document.getElementById('quickAddCustomerSheet-overlay').parentElement.remove(), 400)"></div>
        <div id="quickAddCustomerSheet-content" class="bottom-sheet-content flex flex-col h-[75vh]">
            <div class="sheet-handle"></div>
            <div class="px-lg pb-md flex justify-between items-center border-b border-outline-variant/30">
                <h2 class="text-[20px] font-bold text-on-surface">Quick Add Customer</h2>
                <button type="button" id="quick-customer-close-x" class="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center text-secondary active-scale transition-apple">
                    <span class="material-symbols-outlined text-[20px]">close</span>
                </button>
            </div>
            <div class="flex-1 overflow-y-auto p-lg flex flex-col gap-lg bg-background">
                <form id="quick-customer-form" class="flex flex-col gap-4" onsubmit="event.preventDefault();">
                    <div>
                        <label class="text-[14px] font-semibold text-on-surface">Customer Name *</label>
                        <input type="text" id="quick-cust-name" required class="w-full bg-surface border border-outline-variant rounded-xl px-4 py-3 text-[16px] text-on-surface focus:ring-2 focus:ring-primary/20 outline-none mt-1">
                    </div>
                    <div>
                        <label class="text-[14px] font-semibold text-on-surface">Mobile Number *</label>
                        <input type="tel" id="quick-cust-mobile" required class="w-full bg-surface border border-outline-variant rounded-xl px-4 py-3 text-[16px] text-on-surface focus:ring-2 focus:ring-primary/20 outline-none mt-1">
                    </div>
                    <div>
                        <label class="text-[14px] font-semibold text-on-surface">Company Name</label>
                        <input type="text" id="quick-cust-company" class="w-full bg-surface border border-outline-variant rounded-xl px-4 py-3 text-[16px] text-on-surface focus:ring-2 focus:ring-primary/20 outline-none mt-1">
                    </div>
                    <div>
                        <label class="text-[14px] font-semibold text-on-surface">Customer Type</label>
                        <select id="quick-cust-type" class="w-full bg-surface border border-outline-variant rounded-xl px-4 py-3 text-[16px] text-on-surface focus:ring-2 focus:ring-primary/20 outline-none mt-1">
                            <option value="Brand">Brand</option>
                            <option value="Manufacturer">Manufacturer</option>
                            <option value="Exporter">Exporter</option>
                            <option value="Retailer">Retailer</option>
                        </select>
                    </div>
                </form>
            </div>
            <div class="p-4 border-t border-outline-variant/30 bg-surface-container-lowest safe-bottom flex gap-3">
                <button type="button" id="quick-customer-cancel-btn" class="flex-1 bg-surface-container-high text-on-surface font-semibold py-3.5 rounded-xl">Cancel</button>
                <button type="button" id="quick-customer-save-btn" class="flex-1 bg-primary text-white font-semibold py-3.5 rounded-xl shadow-sm">Save Customer</button>
            </div>
        </div>
    `;

    document.body.appendChild(container);

    const cleanup = () => {
        closeSheet('quickAddCustomerSheet');
        setTimeout(() => container.remove(), 400);
    };

    container.querySelector('#quick-customer-close-x').onclick = cleanup;
    container.querySelector('#quick-customer-cancel-btn').onclick = cleanup;
    
    container.querySelector('#quick-customer-save-btn').onclick = async () => {
        const name = container.querySelector('#quick-cust-name').value.trim();
        const mobile = container.querySelector('#quick-cust-mobile').value.trim();
        const company = container.querySelector('#quick-cust-company').value.trim();
        const customerType = container.querySelector('#quick-cust-type').value;

        if (!name || !mobile) {
            window.showToast?.("Customer Name and Mobile are required.", "error");
            return;
        }

        try {
            window.showToast?.("Adding customer...", "info");
            const { api } = await import('../js/services/api.js');
            const newCust = await api.saveCustomer({ name, mobile, company, customerType });
            cleanup();
            window.showToast?.("Customer added!", "success");
            if (callback) callback(newCust);
        } catch (e) {
            console.error(e);
            window.showToast?.(e.message || "Failed to add customer.", "error");
        }
    };

    requestAnimationFrame(() => {
        openSheet('quickAddCustomerSheet');
    });
};
