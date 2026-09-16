const fs = require('fs');
const path = require('path');

const pages = [
    { file: 'pages/dashboard.html', active: 'dashboard' },
    { file: 'pages/advanced-calculator.html', active: 'advanced-calculator' },
    { file: 'pages/calculator.html', active: 'advanced-calculator' },
    { file: 'pages/costings.html', active: 'advanced-calculator' },
    { file: 'pages/pattern-calculator.html', active: 'advanced-calculator' },
    { file: 'pages/orders.html', active: 'orders' },
    { file: 'pages/create-order.html', active: 'orders' },
    { file: 'pages/billings.html', active: 'billings' },
    { file: 'pages/quotations.html', active: 'billings' },
    { file: 'pages/finance.html', active: 'finance' },
    { file: 'pages/reports.html', active: 'reports' },
    { file: 'pages/customers.html', active: 'customers' },
    { file: 'pages/inventory.html', active: 'inventory' },
    { file: 'pages/vendors.html', active: 'vendors' },
    { file: 'pages/production.html', active: 'production' },
    { file: 'pages/dispatch.html', active: 'dispatch' },
    { file: 'pages/more.html', active: 'more' },
    { file: 'pages/settings.html', active: 'settings' }
];

function generateSidebar(activeKey) {
    const links = [
        { href: 'dashboard.html', page: 'dashboard', icon: 'dashboard', label: 'Dashboard' },
        { href: 'advanced-calculator.html', page: 'advanced-calculator', icon: 'calculate', label: 'Costing' },
        { href: 'orders.html', page: 'orders', icon: 'receipt_long', label: 'Orders' },
        { href: 'billings.html', page: 'billings', icon: 'receipt', label: 'Billings' },
        { href: 'finance.html', page: 'finance', icon: 'payments', label: 'Finance' },
        { href: 'reports.html', page: 'reports', icon: 'analytics', label: 'Reports' },
    ];

    const mgmtLinks = [
        { href: 'customers.html', page: 'customers', icon: 'groups', label: 'Customers' },
        { href: 'inventory.html', page: 'inventory', icon: 'inventory_2', label: 'Inventory' },
        { href: 'vendors.html', page: 'vendors', icon: 'storefront', label: 'Vendors' },
        { href: 'production.html', page: 'production', icon: 'precision_manufacturing', label: 'Production' },
        { href: 'dispatch.html', page: 'dispatch', icon: 'local_shipping', label: 'Dispatch' },
    ];

    const bottomLinks = [
        { href: 'more.html', page: 'more', icon: 'grid_view', label: 'More' },
        { href: 'settings.html', page: 'settings', icon: 'settings', label: 'Settings' },
    ];

    function renderLink(item) {
        const isActive = item.page === activeKey;
        const activeClass = isActive ? ' sidebar-nav-link--active' : '';
        const ariaCurrent = isActive ? ' aria-current="page"' : '';
        const fill = isActive ? '1' : '0';
        const wght = isActive ? '400' : '300';
        return `                <a href="${item.href}" data-page="${item.page}" class="sidebar-nav-link${activeClass} mx-2 flex items-center gap-3 px-3 py-2.5 rounded-xl text-secondary dark:text-slate-400 transition-colors duration-150 group outline-none"${ariaCurrent}>
                    <span class="material-symbols-outlined text-[20px] shrink-0" style="font-variation-settings:'FILL' ${fill}, 'wght' ${wght}, 'GRAD' 0, 'opsz' 24;">${item.icon}</span>
                    <span class="text-[13px] font-semibold leading-none">${item.label}</span>
                </a>`;
    }

    return `    <!-- Desktop & Tablet Sidebar Navigation (Permanent HTML Structure) -->
    <div id="sidebar-container">
        <nav class="sidebar-nav bg-white dark:bg-slate-900 border-r border-outline-variant/30 dark:border-slate-800" id="sidebar-nav" role="navigation" aria-label="Main navigation">
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
${links.map(renderLink).join('\n')}
                <div class="mx-4 my-2 border-t border-outline-variant/40 dark:border-slate-800"></div>
                <div class="px-5 pb-1.5 pt-1">
                    <span class="text-[10px] font-bold text-secondary dark:text-slate-400 uppercase tracking-[0.08em]">Management</span>
                </div>
${mgmtLinks.map(renderLink).join('\n')}
            </div>
            <div class="shrink-0 border-t border-outline-variant/30 dark:border-slate-800 py-3 flex flex-col" style="gap: 1px;">
${bottomLinks.map(renderLink).join('\n')}
                <button type="button" onclick="toggleTheme()" class="theme-toggle-btn mx-2 flex items-center gap-3 px-3 py-2.5 rounded-xl text-secondary dark:text-slate-400 hover:bg-surface-variant/40 dark:hover:bg-slate-800 transition-colors duration-150 group outline-none text-left">
                    <span class="material-symbols-outlined text-[20px] shrink-0">dark_mode</span>
                    <span class="theme-label text-[13px] font-semibold leading-none">Theme</span>
                </button>
            </div>
        </nav>
    </div>`;
}

const rootDir = path.resolve(__dirname, '..');

for (const p of pages) {
    const fullPath = path.join(rootDir, p.file);
    if (!fs.existsSync(fullPath)) {
        console.warn('File not found:', fullPath);
        continue;
    }
    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Replace sidebar container
    const sidebarMarkup = generateSidebar(p.active);
    const containerRegex = /(?:<!--[^\n]*-->\s*)?<div id="sidebar-container"[^>]*>[\s\S]*?<\/div>/i;
    
    if (containerRegex.test(content)) {
        content = content.replace(containerRegex, sidebarMarkup);
    } else {
        // If not found, insert after <body>
        content = content.replace(/<body([^>]*)>/i, '<body$1>\n\n' + sidebarMarkup);
    }

    // Update app.js script tag to include ?v=5.5
    content = content.replace(/<script src="\.\.\/js\/app\.js(?:\?v=[^"]*)?"/g, '<script src="../js/app.js?v=5.5"');
    
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log('Successfully embedded permanent sidebar in:', p.file);
}

console.log('All pages processed!');
