// Core App logic

/**
 * Theme Engine — Instant init, OS listener & manual override
 */
function initTheme() {
    const theme = localStorage.getItem('theme');
    const isDark = theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
    updateThemeToggleUI(isDark);
}

function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateThemeToggleUI(isDark);
    window.dispatchEvent(new CustomEvent('gos-theme-changed', { detail: { isDark } }));
}

function updateThemeToggleUI(isDark) {
    const toggleBtns = document.querySelectorAll('.theme-toggle-btn');
    toggleBtns.forEach(btn => {
        const icon = btn.querySelector('.material-symbols-outlined') || btn.querySelector('.theme-icon');
        const label = btn.querySelector('.theme-label');
        if (icon) {
            icon.textContent = isDark ? 'light_mode' : 'dark_mode';
        }
        if (label) {
            label.textContent = isDark ? 'Light Mode' : 'Dark Mode';
        }
        btn.setAttribute('aria-label', isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode');
        btn.setAttribute('title', isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode');
    });
}

// OS theme change listener
if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) {
            if (e.matches) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
            updateThemeToggleUI(e.matches);
            window.dispatchEvent(new CustomEvent('gos-theme-changed', { detail: { isDark: e.matches } }));
        }
    });
}

window.initTheme = initTheme;
window.toggleTheme = toggleTheme;
window.updateThemeToggleUI = updateThemeToggleUI;

// Execute instantly to ensure UI sync
initTheme();

/**
 * Loads a component HTML into a target element
 * @param {string} url - The URL of the component to load
 * @param {string} targetId - The ID of the element to inject the component into
 * @param {function} callback - Optional callback to run after the component is loaded
 */
async function loadComponent(url, targetId, callback) {
    const filename = url.split('/').pop();
    const candidatePaths = [
        url,
        `../components/${filename}`,
        `./components/${filename}`,
        `/components/${filename}`,
        `components/${filename}`
    ];
    const pathsToTry = [...new Set(candidatePaths)];

    let html = null;
    for (const path of pathsToTry) {
        try {
            const response = await fetch(path);
            if (response.ok) {
                html = await response.text();
                break;
            }
        } catch (e) {
            // Try next fallback path
        }
    }

    const el = document.getElementById(targetId);
    if (el) {
        if (html) {
            el.innerHTML = html;
        }
        if (callback) callback();
        updateThemeToggleUI(document.documentElement.classList.contains('dark'));
    }
}

// Helper to set active link state on sidebar navigation links
function updateSidebarActiveState(currentPage) {
    const sidebarLinks = document.querySelectorAll('.sidebar-nav-link[data-page]');
    sidebarLinks.forEach(link => {
        if (link.dataset.page === currentPage) {
            link.classList.add('sidebar-nav-link--active');
            link.setAttribute('aria-current', 'page');
            const icon = link.querySelector('.material-symbols-outlined');
            if (icon) {
                icon.style.fontVariationSettings = "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24";
            }
        } else {
            link.classList.remove('sidebar-nav-link--active');
            link.removeAttribute('aria-current');
            const icon = link.querySelector('.material-symbols-outlined');
            if (icon) {
                icon.style.fontVariationSettings = "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24";
            }
        }
    });
}

const STATIC_SIDEBAR_HTML = `<nav class="sidebar-nav bg-white dark:bg-slate-900 border-r border-outline-variant/30 dark:border-slate-800" id="sidebar-nav" role="navigation" aria-label="Main navigation">
    <div class="flex items-center justify-between px-5 h-[68px] shrink-0 border-b border-outline-variant/30 dark:border-slate-800">
        <div class="flex items-center gap-3 min-w-0">
            <div class="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-sm">
                <span class="material-symbols-outlined text-white text-[18px]" style="font-variation-settings:'FILL' 1;">checkroom</span>
            </div>
            <div class="min-w-0">
                <h1 class="text-[14px] font-bold text-on-surface dark:text-slate-100 tracking-tight leading-tight truncate">Garment OS</h1>
                <p class="text-[10px] font-semibold text-secondary dark:text-slate-400 uppercase tracking-[0.07em]">Enterprise</p>
            </div>
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
            <button type="button" onclick="window.openNotificationCenter?.()" aria-label="Notifications" title="Notifications" class="w-8 h-8 rounded-xl flex items-center justify-center text-secondary dark:text-slate-400 hover:bg-surface-variant/40 dark:hover:bg-slate-800 transition-colors relative">
                <span class="material-symbols-outlined text-[19px]">notifications</span>
                <span class="notif-badge hidden absolute -top-0.5 -right-0.5 bg-error text-white text-[9px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center shadow-xs">0</span>
            </button>
            <button type="button" onclick="toggleTheme()" class="theme-toggle-btn w-8 h-8 rounded-xl flex items-center justify-center text-secondary dark:text-slate-400 hover:bg-surface-variant/40 dark:hover:bg-slate-800 transition-colors" title="Toggle Dark/Light Mode" aria-label="Toggle theme">
                <span class="material-symbols-outlined text-[19px]">dark_mode</span>
            </button>
        </div>
    </div>
    <div class="flex-1 overflow-y-auto py-3 flex flex-col" style="gap: 1px;">
        <div class="px-5 pb-1.5 pt-3">
            <span class="text-[10px] font-bold text-secondary dark:text-slate-400 uppercase tracking-[0.08em]">Workspace</span>
        </div>
        <a href="dashboard.html" data-page="dashboard" class="sidebar-nav-link mx-2 flex items-center gap-3 px-3 py-2.5 rounded-xl text-secondary dark:text-slate-400 transition-colors duration-150 group outline-none">
            <span class="material-symbols-outlined text-[20px] shrink-0">dashboard</span>
            <span class="text-[13px] font-semibold leading-none">Dashboard</span>
        </a>
        <a href="advanced-calculator.html" data-page="advanced-calculator" class="sidebar-nav-link mx-2 flex items-center gap-3 px-3 py-2.5 rounded-xl text-secondary dark:text-slate-400 transition-colors duration-150 group outline-none">
            <span class="material-symbols-outlined text-[20px] shrink-0">calculate</span>
            <span class="text-[13px] font-semibold leading-none">Costing</span>
        </a>
        <a href="orders.html" data-page="orders" class="sidebar-nav-link mx-2 flex items-center gap-3 px-3 py-2.5 rounded-xl text-secondary dark:text-slate-400 transition-colors duration-150 group outline-none">
            <span class="material-symbols-outlined text-[20px] shrink-0">receipt_long</span>
            <span class="text-[13px] font-semibold leading-none">Orders</span>
        </a>
        <a href="billings.html" data-page="billings" class="sidebar-nav-link mx-2 flex items-center gap-3 px-3 py-2.5 rounded-xl text-secondary dark:text-slate-400 transition-colors duration-150 group outline-none">
            <span class="material-symbols-outlined text-[20px] shrink-0">receipt</span>
            <span class="text-[13px] font-semibold leading-none">Billings</span>
        </a>
        <a href="finance.html" data-page="finance" class="sidebar-nav-link mx-2 flex items-center gap-3 px-3 py-2.5 rounded-xl text-secondary dark:text-slate-400 transition-colors duration-150 group outline-none">
            <span class="material-symbols-outlined text-[20px] shrink-0">payments</span>
            <span class="text-[13px] font-semibold leading-none">Finance</span>
        </a>
        <a href="reports.html" data-page="reports" class="sidebar-nav-link mx-2 flex items-center gap-3 px-3 py-2.5 rounded-xl text-secondary dark:text-slate-400 transition-colors duration-150 group outline-none">
            <span class="material-symbols-outlined text-[20px] shrink-0">analytics</span>
            <span class="text-[13px] font-semibold leading-none">Reports</span>
        </a>
        <div class="mx-4 my-2 border-t border-outline-variant/40 dark:border-slate-800"></div>
        <div class="px-5 pb-1.5 pt-1">
            <span class="text-[10px] font-bold text-secondary dark:text-slate-400 uppercase tracking-[0.08em]">Management</span>
        </div>
        <a href="customers.html" data-page="customers" class="sidebar-nav-link mx-2 flex items-center gap-3 px-3 py-2.5 rounded-xl text-secondary dark:text-slate-400 transition-colors duration-150 group outline-none">
            <span class="material-symbols-outlined text-[20px] shrink-0">groups</span>
            <span class="text-[13px] font-semibold leading-none">Customers</span>
        </a>
        <a href="inventory.html" data-page="inventory" class="sidebar-nav-link mx-2 flex items-center gap-3 px-3 py-2.5 rounded-xl text-secondary dark:text-slate-400 transition-colors duration-150 group outline-none">
            <span class="material-symbols-outlined text-[20px] shrink-0">inventory_2</span>
            <span class="text-[13px] font-semibold leading-none">Inventory</span>
        </a>
        <a href="vendors.html" data-page="vendors" class="sidebar-nav-link mx-2 flex items-center gap-3 px-3 py-2.5 rounded-xl text-secondary dark:text-slate-400 transition-colors duration-150 group outline-none">
            <span class="material-symbols-outlined text-[20px] shrink-0">storefront</span>
            <span class="text-[13px] font-semibold leading-none">Vendors</span>
        </a>
        <a href="production.html" data-page="production" class="sidebar-nav-link mx-2 flex items-center gap-3 px-3 py-2.5 rounded-xl text-secondary dark:text-slate-400 transition-colors duration-150 group outline-none">
            <span class="material-symbols-outlined text-[20px] shrink-0">precision_manufacturing</span>
            <span class="text-[13px] font-semibold leading-none">Production</span>
        </a>
        <a href="dispatch.html" data-page="dispatch" class="sidebar-nav-link mx-2 flex items-center gap-3 px-3 py-2.5 rounded-xl text-secondary dark:text-slate-400 transition-colors duration-150 group outline-none">
            <span class="material-symbols-outlined text-[20px] shrink-0">local_shipping</span>
            <span class="text-[13px] font-semibold leading-none">Dispatch</span>
        </a>
    </div>
    <div class="shrink-0 border-t border-outline-variant/30 dark:border-slate-800 py-3 flex flex-col" style="gap: 1px;">
        <a href="more.html" data-page="more" class="sidebar-nav-link mx-2 flex items-center gap-3 px-3 py-2.5 rounded-xl text-secondary dark:text-slate-400 transition-colors duration-150 group outline-none">
            <span class="material-symbols-outlined text-[20px] shrink-0">grid_view</span>
            <span class="text-[13px] font-semibold leading-none">More</span>
        </a>
        <a href="settings.html" data-page="settings" class="sidebar-nav-link mx-2 flex items-center gap-3 px-3 py-2.5 rounded-xl text-secondary dark:text-slate-400 transition-colors duration-150 group outline-none">
            <span class="material-symbols-outlined text-[20px] shrink-0">settings</span>
            <span class="text-[13px] font-semibold leading-none">Settings</span>
        </a>
        <button type="button" onclick="toggleTheme()" class="theme-toggle-btn mx-2 flex items-center gap-3 px-3 py-2.5 rounded-xl text-secondary dark:text-slate-400 hover:bg-surface-variant/40 dark:hover:bg-slate-800 transition-colors duration-150 group outline-none text-left">
            <span class="material-symbols-outlined text-[20px] shrink-0">dark_mode</span>
            <span class="theme-label text-[13px] font-semibold leading-none">Theme</span>
        </button>
    </div>
</nav>`;

// ── Subtle Top Progress Bar Controller (Non-blocking) ─────
function initTopProgressBar() {
    if (document.getElementById('top-progress-bar')) return;
    const bar = document.createElement('div');
    bar.id = 'top-progress-bar';
    bar.className = 'fixed top-0 left-0 h-[2.5px] bg-[#0071E3] z-[99999] transition-all duration-300 pointer-events-none opacity-0';
    bar.style.width = '0%';
    document.body.appendChild(bar);
}

window.startSubtleLoading = function() {
    initTopProgressBar();
    const bar = document.getElementById('top-progress-bar');
    if (bar) {
        bar.style.width = '30%';
        bar.classList.remove('opacity-0');
        bar.classList.add('opacity-100');
        setTimeout(() => { if (bar && bar.style.width === '30%') bar.style.width = '75%'; }, 150);
    }
};

window.finishSubtleLoading = function() {
    const bar = document.getElementById('top-progress-bar');
    if (bar) {
        bar.style.width = '100%';
        setTimeout(() => {
            bar.classList.remove('opacity-100');
            bar.classList.add('opacity-0');
            setTimeout(() => { bar.style.width = '0%'; }, 300);
        }, 200);
    }
};

/**
 * Initialize the application
 */
function initApp() {
    // ── Authentication Guard ──
    const token = localStorage.getItem('gos_token');
    const isLoginPage = window.location.pathname.includes('/auth/login');
    
    if (isLoginPage) {
        return;
    }

    if (!token) {
        window.location.replace('../auth/login');
        return;
    }

    // Determine current page from URL
    const path = window.location.pathname;
    let currentPage = path.split('/').pop().replace('.html', '');
    if (!currentPage || currentPage === 'index' || currentPage === '') {
        currentPage = 'dashboard';
    }

    // ── Load Desktop/Tablet Sidebar Navigation ──
    let sidebarContainer = document.getElementById('sidebar-container');
    if (!sidebarContainer) {
        sidebarContainer = document.createElement('div');
        sidebarContainer.id = 'sidebar-container';
        document.body.insertBefore(sidebarContainer, document.body.firstChild);
    }
    
    // Populate static sidebar HTML synchronously if not already present
    if (!sidebarContainer.innerHTML || sidebarContainer.innerHTML.trim() === '') {
        sidebarContainer.innerHTML = STATIC_SIDEBAR_HTML;
    }
    // Instantly set active tab state synchronously
    updateSidebarActiveState(currentPage);

    // ── Load Mobile Bottom Navigation ──
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

    // ── Load Mobile Top Bar & Notification System ──
    loadComponent('../components/topbar-mobile.html', 'topbar-container', () => {
        if (window.updateTopbarBadge) window.updateTopbarBadge();
    });

    // Dynamically load notification system
    import('./components/notificationCenter.js?v=5.2').then(m => {
        window.openNotificationCenter = m.openNotificationCenter;
        window.closeNotificationCenter = m.closeNotificationCenter;
        window.updateTopbarBadge = m.updateTopbarBadge;
        if (m.updateTopbarBadge) m.updateTopbarBadge();
    }).catch(err => console.warn('Notification system init warning:', err));
    
    // ── Load FAB if container exists ──
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
        <div id="quickAddCustomerSheet-content" class="bottom-sheet-content flex flex-col h-[75vh] bg-surface dark:bg-slate-900 border-outline-variant/30 dark:border-slate-800">
            <div class="sheet-handle"></div>
            <div class="px-lg pb-md flex justify-between items-center border-b border-outline-variant/30 dark:border-slate-800">
                <h2 class="text-[20px] font-bold text-on-surface dark:text-slate-100">Quick Add Customer</h2>
                <button type="button" id="quick-customer-close-x" class="w-8 h-8 rounded-full bg-surface-variant dark:bg-slate-800 flex items-center justify-center text-secondary dark:text-slate-400 active-scale transition-apple">
                    <span class="material-symbols-outlined text-[20px]">close</span>
                </button>
            </div>
            <div class="flex-1 overflow-y-auto p-lg flex flex-col gap-lg bg-background dark:bg-slate-900/50">
                <form id="quick-customer-form" class="flex flex-col gap-4" onsubmit="event.preventDefault();">
                    <div>
                        <label class="text-[14px] font-semibold text-on-surface dark:text-slate-200">Customer Name *</label>
                        <input type="text" id="quick-cust-name" required class="w-full bg-surface dark:bg-slate-800 border border-outline-variant dark:border-slate-700 rounded-xl px-4 py-3 text-[16px] text-on-surface dark:text-slate-100 focus:ring-2 focus:ring-primary/20 outline-none mt-1">
                    </div>
                    <div>
                        <label class="text-[14px] font-semibold text-on-surface dark:text-slate-200">Mobile Number *</label>
                        <input type="tel" id="quick-cust-mobile" required class="w-full bg-surface dark:bg-slate-800 border border-outline-variant dark:border-slate-700 rounded-xl px-4 py-3 text-[16px] text-on-surface dark:text-slate-100 focus:ring-2 focus:ring-primary/20 outline-none mt-1">
                    </div>
                    <div>
                        <label class="text-[14px] font-semibold text-on-surface dark:text-slate-200">Company Name</label>
                        <input type="text" id="quick-cust-company" class="w-full bg-surface dark:bg-slate-800 border border-outline-variant dark:border-slate-700 rounded-xl px-4 py-3 text-[16px] text-on-surface dark:text-slate-100 focus:ring-2 focus:ring-primary/20 outline-none mt-1">
                    </div>
                    <div>
                        <label class="text-[14px] font-semibold text-on-surface dark:text-slate-200">Customer Type</label>
                        <select id="quick-cust-type" class="w-full bg-surface dark:bg-slate-800 border border-outline-variant dark:border-slate-700 rounded-xl px-4 py-3 text-[16px] text-on-surface dark:text-slate-100 focus:ring-2 focus:ring-primary/20 outline-none mt-1">
                            <option value="Brand">Brand</option>
                            <option value="Manufacturer">Manufacturer</option>
                            <option value="Exporter">Exporter</option>
                            <option value="Retailer">Retailer</option>
                        </select>
                    </div>
                </form>
            </div>
            <div class="p-4 border-t border-outline-variant/30 dark:border-slate-800 bg-surface-container-lowest dark:bg-slate-900 safe-bottom flex gap-3">
                <button type="button" id="quick-customer-cancel-btn" class="flex-1 bg-surface-container-high dark:bg-slate-800 text-on-surface dark:text-slate-200 font-semibold py-3.5 rounded-xl">Cancel</button>
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
            const { api } = await import('/js/services/api.js');
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
