// js/dashboard/kms.js — Keyboard Master System & Global Command Bar
export class KMSCommandBar {
    constructor() {
        this.isOpen = false;
        this.initDOM();
        this.bindEvents();
    }

    initDOM() {
        if (document.getElementById('kms-modal-container')) return;

        const container = document.createElement('div');
        container.id = 'kms-modal-container';
        container.className = 'fixed inset-0 z-50 hidden items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md transition-opacity duration-200';
        container.innerHTML = `
            <div class="relative w-full max-w-xl bg-surface-container-lowest dark:bg-slate-900 border border-outline-variant/80 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
                <!-- Search Header -->
                <div class="flex items-center gap-3 px-4 py-3.5 border-b border-outline-variant/40 dark:border-slate-800 bg-surface-container-low/50 dark:bg-slate-850/50">
                    <span class="material-symbols-outlined text-secondary dark:text-slate-400 text-[22px]">search</span>
                    <input id="kms-search-input" type="text" placeholder="Type a command or search orders, billings, inventory..."
                           class="w-full bg-transparent border-none outline-none text-[15px] font-medium text-on-surface dark:text-slate-100 placeholder:text-secondary dark:placeholder:text-slate-500 focus:ring-0">
                    <kbd class="px-2 py-0.5 text-[11px] font-semibold text-secondary dark:text-slate-400 bg-surface-variant/70 dark:bg-slate-800 rounded-md border border-outline-variant/60 dark:border-slate-700">ESC</kbd>
                </div>

                <!-- Command Quick List -->
                <div id="kms-results-container" class="max-h-[360px] overflow-y-auto p-2 space-y-1">
                    <div class="px-3 py-1.5 text-[11px] font-semibold text-secondary dark:text-slate-400 uppercase tracking-wider">Quick Navigation</div>
                    <a href="orders.html" class="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-variant/50 dark:hover:bg-slate-800 text-on-surface dark:text-slate-100 transition-colors cursor-pointer">
                        <span class="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center material-symbols-outlined text-[18px]">receipt_long</span>
                        <div class="flex-1">
                            <div class="text-[14px] font-semibold">Orders Pipeline</div>
                            <div class="text-[12px] text-secondary dark:text-slate-400">Manage and track production orders</div>
                        </div>
                        <kbd class="text-[11px] text-secondary dark:text-slate-500">G + O</kbd>
                    </a>
                    <a href="billings.html" class="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-variant/50 dark:hover:bg-slate-800 text-on-surface dark:text-slate-100 transition-colors cursor-pointer">
                        <span class="w-8 h-8 rounded-lg bg-[#00B386]/10 text-[#00B386] flex items-center justify-center material-symbols-outlined text-[18px]">payments</span>
                        <div class="flex-1">
                            <div class="text-[14px] font-semibold">Billings & Invoices</div>
                            <div class="text-[12px] text-secondary dark:text-slate-400">Sales bills, quotations, receipts, purchase orders</div>
                        </div>
                        <kbd class="text-[11px] text-secondary dark:text-slate-500">G + B</kbd>
                    </a>
                    <a href="inventory.html" class="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-variant/50 dark:hover:bg-slate-800 text-on-surface dark:text-slate-100 transition-colors cursor-pointer">
                        <span class="w-8 h-8 rounded-lg bg-[#FF9F0A]/10 text-[#FF9F0A] flex items-center justify-center material-symbols-outlined text-[18px]">inventory_2</span>
                        <div class="flex-1">
                            <div class="text-[14px] font-semibold">Inventory & Stock</div>
                            <div class="text-[12px] text-secondary dark:text-slate-400">Yarn, fabrics, trims & SKU stock levels</div>
                        </div>
                        <kbd class="text-[11px] text-secondary dark:text-slate-500">G + I</kbd>
                    </a>
                    <a href="calculator.html" class="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-variant/50 dark:hover:bg-slate-800 text-on-surface dark:text-slate-100 transition-colors cursor-pointer">
                        <span class="w-8 h-8 rounded-lg bg-[#6C63FF]/10 text-[#6C63FF] flex items-center justify-center material-symbols-outlined text-[18px]">calculate</span>
                        <div class="flex-1">
                            <div class="text-[14px] font-semibold">Costing Calculator</div>
                            <div class="text-[12px] text-secondary dark:text-slate-400">Garment unit cost breakdown & margins</div>
                        </div>
                        <kbd class="text-[11px] text-secondary dark:text-slate-500">G + C</kbd>
                    </a>
                </div>

                <!-- Footer Info -->
                <div class="px-4 py-2 border-t border-outline-variant/40 dark:border-slate-800 bg-surface-container-low/30 dark:bg-slate-900/50 flex items-center justify-between text-[11px] text-secondary dark:text-slate-400">
                    <div class="flex items-center gap-2">
                        <span>Navigation Mode: <strong class="text-on-surface dark:text-slate-200">Keyboard First</strong></span>
                    </div>
                    <div>Press <kbd class="px-1.5 py-0.5 bg-surface-variant dark:bg-slate-800 rounded border dark:border-slate-700">Ctrl + K</kbd> anytime</div>
                </div>
            </div>
        `;
        document.body.appendChild(container);
    }

    bindEvents() {
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                this.toggle();
            }
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });

        const container = document.getElementById('kms-modal-container');
        if (container) {
            container.addEventListener('click', (e) => {
                if (e.target === container) this.close();
            });
        }
    }

    toggle() {
        this.isOpen ? this.close() : this.open();
    }

    open() {
        const container = document.getElementById('kms-modal-container');
        const input = document.getElementById('kms-search-input');
        if (!container) return;
        container.classList.remove('hidden');
        container.classList.add('flex');
        this.isOpen = true;
        if (input) {
            input.value = '';
            setTimeout(() => input.focus(), 50);
        }
    }

    close() {
        const container = document.getElementById('kms-modal-container');
        if (!container) return;
        container.classList.add('hidden');
        container.classList.remove('flex');
        this.isOpen = false;
    }
}
