import { financeStore } from '../stores/FinanceStore.js?v=5.5';
import { inventoryRepository } from '../repositories/InventoryRepository.js?v=5.5';
import { api } from '../services/api.js?v=5.5';
import { renderers } from '../renderers.js?v=5.5';
import { BottomSheet } from '../components/index.js?v=5.5';
import { bindFormValidation } from '../utils/formHandler.js?v=5.5';
import { SearchableSelectInput } from '../components/inputs.js?v=5.5';
import { 
    getAddTransactionSheetHTML, getAddTransactionFooterHTML,
    getTransactionDetailsHeader, getTransactionDetailsContent,
    getFilterSheetHTML, getFilterFooterHTML,
    getCategoriesByType, getCategoryBreakdownSheetContent,
    getCustomDateSheetHTML, getCustomDateFooterHTML,
    getBalanceSheetDetailHTML
} from './templates.js?v=5.5';
import {
    initPendingAttachments,
    getPendingAttachments,
    setPendingAttachments,
    setupDropzoneEvents,
    ensureLightboxDOM
} from './attachments.js?v=5.5';

async function initModule() {
    window.financeStore = financeStore;
    financeStore.subscribe(renderUI);

    const searchInput = document.getElementById('transaction-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            financeStore.setSearch(e.target.value);
        });
    }

    await renderSheets();
    await financeStore.loadTransactions();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initModule);
} else {
    initModule();
}

async function renderSheets() {
    const sheetsContainer = document.getElementById('sheets-container');
    if (sheetsContainer) {
        const state = financeStore.getState();
        
        // Fetch parties for transaction form + live enriched inventory for balance sheet
        const [customers, vendors, inventoryItems] = await Promise.all([
            api.getCustomers(), 
            api.getVendors(), 
            inventoryRepository.getAllEnriched().catch(() => api.getInventory())
        ]);
        window.financeParties = { customers, vendors };
        window.financeInventory = inventoryItems || [];

        const sheetsHTML = [
            BottomSheet({ id: 'addTransactionSheet', title: 'New Transaction', content: getAddTransactionSheetHTML(null, 'trans-', window.financeParties), footerContent: getAddTransactionFooterHTML(false), isForm: true }),
            BottomSheet({ id: 'editTransactionSheet', title: 'Edit Transaction', content: '<div id="edit-trans-container"></div>', footerContent: getAddTransactionFooterHTML(true), isForm: true }),
            BottomSheet({ id: 'filterSheet', title: 'Filters', content: getFilterSheetHTML(state.currentFilters), footerContent: getFilterFooterHTML(), isForm: false }),
            BottomSheet({ id: 'customDateSheet', title: 'Custom Date Range', content: getCustomDateSheetHTML(), footerContent: getCustomDateFooterHTML(), isForm: false })
        ].join('');
        
        sheetsContainer.innerHTML = sheetsHTML;

        bindFormValidation('addTransactionSheet-content', 'add-trans-submit');
        bindFormValidation('editTransactionSheet-content', 'edit-trans-submit');
        
        document.getElementById('add-trans-submit')?.addEventListener('click', handleAddTransaction);
        document.getElementById('edit-trans-submit')?.addEventListener('click', handleEditTransaction);

        setupTypeChange('trans-');
        setupCategoryToggle('trans-');
        setupSearchableSelects('trans-category');
        setupSearchableSelects('trans-refId');
        setupCustomDateSheet();
        initPendingAttachments('trans-', []);
        setupDropzoneEvents('trans-');
        ensureLightboxDOM();
    }
}

function setupTypeChange(prefix = 'trans-') {
    const typeSelect = document.getElementById(`${prefix}type`);
    const categoryContainer = document.getElementById(`${prefix}category-container`);
    const partyContainer = document.getElementById(`${prefix}party-container`);
    
    if (typeSelect) {
        typeSelect.addEventListener('change', (e) => {
            const selectedType = e.target.value;
            
            // Category Dropdown
            if (categoryContainer) {
                const categories = getCategoriesByType(selectedType);
                const newCategoryHTML = SearchableSelectInput({ 
                    label: 'Category', 
                    id: `${prefix}category`, 
                    options: categories, 
                    value: categories[0].value, 
                    required: true 
                });
                categoryContainer.innerHTML = newCategoryHTML;
            }

            // Party Dropdown
            if (partyContainer && window.financeParties) {
                const partiesList = selectedType === 'Income' ? window.financeParties.customers : window.financeParties.vendors;
                const options = partiesList.map(p => ({ label: p.name, value: p.id }));
                options.unshift({ label: 'None', value: '' });
                
                const newPartyHTML = SearchableSelectInput({
                    label: selectedType === 'Income' ? 'Customer (Optional)' : 'Vendor (Optional)',
                    id: `${prefix}refId`,
                    options: options,
                    value: ''
                });
                partyContainer.innerHTML = newPartyHTML;
            }
            
            // Reset other category container
            const otherContainer = document.getElementById(`${prefix}other-category-container`);
            if (otherContainer) {
                otherContainer.classList.add('hidden');
            }
            
            // Re-setup handlers for new selects
            setupSearchableSelects(`${prefix}category`);
            if (partyContainer) {
                setupSearchableSelects(`${prefix}refId`);
            }
            setupCategoryToggle(prefix);
        });
    }
}

function setupCategoryToggle(prefix = 'trans-') {
    const catSelect = document.getElementById(`${prefix}category`);
    const otherContainer = document.getElementById(`${prefix}other-category-container`);
    if (catSelect && otherContainer) {
        catSelect.addEventListener('change', (e) => {
            if (e.target.value === 'Other') {
                otherContainer.classList.remove('hidden');
                document.getElementById(`${prefix}other-category`)?.focus();
            } else {
                otherContainer.classList.add('hidden');
            }
        });
    }
}

function setupSearchableSelects(fieldId) {
    const hiddenInput = document.getElementById(fieldId);
    const displayDiv = document.getElementById(`${fieldId}-display`);
    const searchInput = document.getElementById(`${fieldId}-input`);
    const dropdown = document.getElementById(`${fieldId}-dropdown`);
    const items = dropdown?.querySelectorAll('[data-value]');

    if (!hiddenInput || !searchInput || !dropdown || !items) return;

    if (searchInput.dataset.bound) return;
    searchInput.dataset.bound = 'true';

    // Open dropdown on input focus
    searchInput.addEventListener('focus', () => {
        dropdown.classList.remove('hidden');
        searchInput.select(); // Highlight existing text instead of clearing
        filterItems(searchInput.value);
        // Dynamically boost z-index to escape sibling stacking contexts
        const wrapper = displayDiv.closest('.searchable-select-wrapper') || displayDiv.closest('.group');
        if (wrapper) wrapper.style.zIndex = '99999';
    });

    // Filter items on input
    searchInput.addEventListener('input', (e) => {
        const val = e.target.value;
        hiddenInput.value = val; // Capture free text as the new value
        filterItems(val);
        hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
        if (!displayDiv?.contains(e.target) && !dropdown?.contains(e.target)) {
            dropdown.classList.add('hidden');
            const wrapper = displayDiv.closest('.searchable-select-wrapper') || displayDiv.closest('.group');
            if (wrapper) wrapper.style.zIndex = '';
        }
    });

    // Handle item selection
    items.forEach(item => {
        item.addEventListener('click', () => {
            const value = item.getAttribute('data-value');
            const label = item.getAttribute('data-label');
            hiddenInput.value = value;
            searchInput.value = label;
            dropdown.classList.add('hidden');
            const wrapper = displayDiv.closest('.searchable-select-wrapper') || displayDiv.closest('.group');
            if (wrapper) wrapper.style.zIndex = '';

            // Trigger change event
            hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
            
            // Update the visual state - update all items' visual feedback
            items.forEach(itemEl => {
                const itemVal = itemEl.getAttribute('data-value');
                if (itemVal === value) {
                    itemEl.classList.add('bg-surface-container', 'text-primary', 'font-semibold');
                } else {
                    itemEl.classList.remove('bg-surface-container', 'text-primary', 'font-semibold');
                }
            });
        });
    });

    function filterItems(query) {
        const normalizedQuery = query.toLowerCase();
        items.forEach(item => {
            const label = item.getAttribute('data-label').toLowerCase();
            const matches = label.includes(normalizedQuery);
            item.style.display = matches ? '' : 'none';
        });
    }
}

function setupCustomDateSheet() {
    const startInput = document.getElementById('custom-date-start');
    const endInput = document.getElementById('custom-date-end');
    const presetsContainer = document.getElementById('custom-date-presets');
    const summaryText = document.getElementById('custom-date-summary-text');
    const durationText = document.getElementById('custom-date-duration-text');
    const errorBox = document.getElementById('custom-date-error-box');
    const applyBtn = document.getElementById('custom-date-apply-btn');

    function updateSummary() {
        if (!startInput || !endInput) return;
        const sVal = startInput.value;
        const eVal = endInput.value;

        if (!sVal || !eVal) {
            if (summaryText) summaryText.textContent = 'Please choose start and end dates';
            if (durationText) durationText.textContent = '';
            if (applyBtn) {
                applyBtn.disabled = true;
                applyBtn.classList.add('opacity-50', 'pointer-events-none');
            }
            return;
        }

        if (sVal > eVal) {
            if (errorBox) errorBox.classList.remove('hidden');
            if (applyBtn) {
                applyBtn.disabled = true;
                applyBtn.classList.add('opacity-50', 'pointer-events-none');
            }
            if (summaryText) summaryText.textContent = 'Invalid date range';
            if (durationText) durationText.textContent = 'From Date must be before or equal to To Date';
        } else {
            if (errorBox) errorBox.classList.add('hidden');
            if (applyBtn) {
                applyBtn.disabled = false;
                applyBtn.classList.remove('opacity-50', 'pointer-events-none');
            }

            const sDate = new Date(sVal + 'T00:00:00');
            const eDate = new Date(eVal + 'T00:00:00');
            const diffDays = Math.round((eDate - sDate) / 86400000) + 1;

            const sFmt = sDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            const eFmt = eDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

            if (summaryText) summaryText.textContent = `${sFmt} – ${eFmt}`;
            if (durationText) durationText.textContent = `${diffDays} day${diffDays === 1 ? '' : 's'} selected`;
        }
    }

    startInput?.addEventListener('input', () => {
        updateSummary();
        clearActivePresetStyles();
    });
    startInput?.addEventListener('change', () => {
        updateSummary();
        clearActivePresetStyles();
    });
    endInput?.addEventListener('input', () => {
        updateSummary();
        clearActivePresetStyles();
    });
    endInput?.addEventListener('change', () => {
        updateSummary();
        clearActivePresetStyles();
    });

    function clearActivePresetStyles() {
        presetsContainer?.querySelectorAll('.preset-pill').forEach(pill => {
            pill.classList.remove('bg-primary', 'text-white', 'border-primary');
            pill.classList.add('border-outline-variant', 'text-on-surface');
        });
    }

    presetsContainer?.querySelectorAll('.preset-pill').forEach(btn => {
        btn.addEventListener('click', () => {
            const preset = btn.dataset.preset;
            const now = new Date();
            let start = new Date();
            let end = new Date();

            if (preset === 'today') {
                // today
            } else if (preset === '7d') {
                start.setDate(now.getDate() - 6);
            } else if (preset === '30d') {
                start.setDate(now.getDate() - 29);
            } else if (preset === 'this_month') {
                start = new Date(now.getFullYear(), now.getMonth(), 1);
            } else if (preset === 'last_month') {
                start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                end = new Date(now.getFullYear(), now.getMonth(), 0);
            } else if (preset === '90d') {
                start.setDate(now.getDate() - 89);
            }

            if (startInput) startInput.value = start.toISOString().split('T')[0];
            if (endInput) endInput.value = end.toISOString().split('T')[0];

            clearActivePresetStyles();
            btn.classList.remove('border-outline-variant', 'text-on-surface');
            btn.classList.add('bg-primary', 'text-white', 'border-primary');

            updateSummary();
        });
    });

    updateSummary();
}

function renderUI(state) {
    const { entities, selectedIds, isBulkMode, metrics, loading, error, allTransactions, currentFilters } = state;
    
    renderDashboard(metrics);
    renderBalanceSheet(metrics);
    
    const container = document.getElementById('transactions-list');
    if (!container) return;

    if (loading) {
        if (window.setLoading) window.setLoading('transactions-list');
    } else if (error) {
        container.innerHTML = `<div class="p-md text-center text-error">Failed to load transactions: ${error.message}</div>`;
    } else if (entities.length === 0) {
        container.innerHTML = `<div class="py-12 flex flex-col items-center justify-center text-secondary">
            <span class="material-symbols-outlined text-[48px] mb-3 opacity-50">receipt_long</span>
            <p class="text-[15px] font-medium">No transactions found</p>
        </div>`;
    } else {
        container.innerHTML = entities.map(t => renderers.transactionCard(t, selectedIds.has(t.id))).join('');
    }

    // Feed ALL (unfiltered) transactions to the chart engine
    const allTxns = allTransactions || state.entities || [];
    if (typeof window.renderFinanceCharts === 'function') {
        window.renderFinanceCharts(allTxns);
    }

    updateFilterUI(currentFilters);
    updateBulkToolbar(state);
    updateActiveEntitySheets(state.activeEntity);
}

function updateFilterUI(filters = {}) {
    let activeCount = 0;
    const activeTags = [];

    if (filters.type && filters.type !== 'all') {
        activeCount++;
        activeTags.push({ key: 'type', label: `Type: ${filters.type}` });
    }
    if (filters.status && filters.status !== 'all') {
        activeCount++;
        activeTags.push({ key: 'status', label: `Status: ${filters.status}` });
    }
    if (filters.paymentMethod && filters.paymentMethod !== 'all') {
        activeCount++;
        activeTags.push({ key: 'paymentMethod', label: `Method: ${filters.paymentMethod}` });
    }
    if (filters.dateRange && filters.dateRange !== 'all') {
        activeCount++;
        const dateLabel = filters.dateRange === 'custom' && filters.startDate ? `${filters.startDate} - ${filters.endDate}` : filters.dateRange.replace('_', ' ');
        activeTags.push({ key: 'dateRange', label: `Date: ${dateLabel}` });
    }

    const badge = document.getElementById('filter-badge');
    if (badge) {
        if (activeCount > 0) {
            badge.textContent = activeCount;
            badge.classList.remove('hidden');
            badge.classList.add('flex');
        } else {
            badge.classList.add('hidden');
            badge.classList.remove('flex');
        }
    }

    const tagsContainer = document.getElementById('active-filter-tags');
    if (tagsContainer) {
        if (activeTags.length > 0) {
            tagsContainer.classList.remove('hidden');
            tagsContainer.classList.add('flex');
            tagsContainer.innerHTML = activeTags.map(t => `
                <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-primary/10 text-primary border border-primary/20 text-[11px] font-bold animate-fade-in">
                    ${t.label}
                    <button onclick="window.removeSingleFilter('${t.key}')" class="hover:opacity-75 active-scale ml-0.5" title="Remove filter">
                        <span class="material-symbols-outlined text-[13px]">close</span>
                    </button>
                </span>
            `).join('') + `
                <button onclick="window.clearFilters()" class="text-[11px] font-bold text-secondary underline hover:text-on-surface ml-1 active-scale">
                    Clear All
                </button>
            `;
        } else {
            tagsContainer.classList.add('hidden');
            tagsContainer.classList.remove('flex');
            tagsContainer.innerHTML = '';
        }
    }

    const quickChips = document.querySelectorAll('#quick-filter-chips .quick-chip');
    quickChips.forEach(chip => {
        const val = chip.dataset.quickFilter;
        let isSelected = false;
        if (val === 'all') {
            isSelected = (!filters.type || filters.type === 'all') && (!filters.status || filters.status === 'all');
        } else if (val === 'Income' || val === 'Expense') {
            isSelected = filters.type === val;
        } else if (val === 'Pending' || val === 'Completed') {
            isSelected = filters.status === val;
        }

        if (isSelected) {
            chip.classList.add('bg-primary', 'text-white', 'border-primary', 'shadow-xs');
            chip.classList.remove('bg-surface-container-lowest', 'text-secondary', 'border-outline-variant');
        } else {
            chip.classList.remove('bg-primary', 'text-white', 'border-primary', 'shadow-xs');
            chip.classList.add('bg-surface-container-lowest', 'text-secondary', 'border-outline-variant');
        }
    });
}

function renderDashboard(metrics) {
    const container = document.getElementById('finance-dashboard-container');
    if (!container) return;
    
    const formatMoney = (amount) => '₹' + parseFloat(amount).toLocaleString(undefined, {minimumFractionDigits: 2});

    container.innerHTML = `
        <!-- Main Balance -->
        <div class="bg-surface-container-lowest rounded-[24px] border border-outline-variant p-lg shadow-sm">
            <p class="text-[13px] font-semibold text-secondary uppercase tracking-wider mb-2">Current Balance</p>
            <div class="text-[36px] font-bold tracking-tight text-on-surface mb-6">${formatMoney(metrics.currentBalance)}</div>
            
            <div class="grid grid-cols-2 gap-4 pt-4 border-t border-outline-variant/30">
                <div>
                    <div class="flex items-center gap-1.5 mb-1">
                        <div class="w-2 h-2 rounded-full bg-[#008A00]"></div>
                        <span class="text-[12px] text-secondary">Income Today</span>
                    </div>
                    <span class="text-[16px] font-bold text-on-surface">${formatMoney(metrics.totalIncomeToday)}</span>
                </div>
                <div>
                    <div class="flex items-center gap-1.5 mb-1">
                        <div class="w-2 h-2 rounded-full bg-error"></div>
                        <span class="text-[12px] text-secondary">Expenses Today</span>
                    </div>
                    <span class="text-[16px] font-bold text-on-surface">${formatMoney(metrics.totalExpensesToday)}</span>
                </div>
            </div>
            <div class="mt-4 flex items-center justify-between text-[13px]">
                <span class="font-medium text-secondary">Net Flow Today:</span>
                <span class="font-bold ${metrics.netCashFlowToday >= 0 ? 'text-[#008A00]' : 'text-error'}">
                    ${metrics.netCashFlowToday >= 0 ? '+' : '-'}${formatMoney(Math.abs(metrics.netCashFlowToday))}
                </span>
            </div>
        </div>

        <!-- This Month & Pending -->
        <div class="grid grid-cols-2 gap-4">
            <div class="bg-surface-container-lowest rounded-[20px] border border-outline-variant p-4 shadow-sm flex flex-col justify-between">
                <div>
                    <p class="text-[12px] font-semibold text-secondary uppercase tracking-wider mb-2">This Month</p>
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-[12px] text-secondary">In:</span>
                        <span class="text-[14px] font-bold text-[#008A00]">${formatMoney(metrics.totalIncomeMonth)}</span>
                    </div>
                    <div class="flex items-center justify-between">
                        <span class="text-[12px] text-secondary">Out:</span>
                        <span class="text-[14px] font-bold text-error">${formatMoney(metrics.totalExpensesMonth)}</span>
                    </div>
                </div>
            </div>
            
            <div class="bg-surface-container-lowest rounded-[20px] border border-outline-variant p-4 shadow-sm flex flex-col justify-between">
                <div>
                    <p class="text-[12px] font-semibold text-secondary uppercase tracking-wider mb-2">Pending</p>
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-[12px] text-secondary">To Recv:</span>
                        <span class="text-[14px] font-bold text-[#FF9F0A]">${formatMoney(metrics.pendingReceivables)}</span>
                    </div>
                    <div class="flex items-center justify-between">
                        <span class="text-[12px] text-secondary">To Pay:</span>
                        <span class="text-[14px] font-bold text-error">${formatMoney(metrics.pendingPayments)}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

window._currentFinancePeriod = '7d';
window._currentFinanceCustomRange = null;

function getActivePeriodBounds() {
    const period = window._currentFinancePeriod || '7d';
    const custom = window._currentFinanceCustomRange;
    const now = new Date();
    let startDateStr = null;
    let endDateStr = now.toISOString().split('T')[0];
    let label = 'Last 7 Days';

    if (period === '7d') {
        const d = new Date(now.getTime() - 7 * 86400000);
        startDateStr = d.toISOString().split('T')[0];
        label = 'Last 7 Days';
    } else if (period === '1m') {
        const d = new Date(now.getTime() - 30 * 86400000);
        startDateStr = d.toISOString().split('T')[0];
        label = 'Last 30 Days (1M)';
    } else if (period === '3m') {
        const d = new Date(now.getTime() - 90 * 86400000);
        startDateStr = d.toISOString().split('T')[0];
        label = 'Last 90 Days (3M)';
    } else if (period === 'custom' && custom && custom.startDate && custom.endDate) {
        startDateStr = custom.startDate;
        endDateStr = custom.endDate;
        const sD = new Date(startDateStr + 'T00:00:00');
        const eD = new Date(endDateStr + 'T00:00:00');
        label = `${sD.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} – ${eD.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}`;
    }

    return { period, startDateStr, endDateStr, label };
}

function renderBalanceSheet(metrics) {
    const formatMoney = (amount) => '₹' + parseFloat(amount || 0).toLocaleString(undefined, {minimumFractionDigits: 2});
    const bounds = getActivePeriodBounds();

    const allTxns = financeStore.getState().allTransactions || [];

    // A Balance Sheet is a snapshot as of endDateStr. It should NOT be filtered by startDateStr.
    // 1. Total Cash as of endDateStr
    const cashTxns = allTxns.filter(t => {
        if (t.status !== 'Completed') return false;
        const d = (t.date || '').split('T')[0];
        if (bounds.endDateStr && d > bounds.endDateStr) return false;
        return true;
    });
    const cash = cashTxns.reduce((s, t) => t.type === 'Income' ? s + parseFloat(t.amount || 0) : s - parseFloat(t.amount || 0), 0);

    // 2. Accounts Receivable as of endDateStr (Pending Income)
    const arTxns = allTxns.filter(t => {
        if (t.status !== 'Pending' || t.type !== 'Income') return false;
        const d = (t.date || '').split('T')[0];
        if (bounds.endDateStr && d > bounds.endDateStr) return false;
        return true;
    });
    const ar = arTxns.reduce((s, t) => s + parseFloat(t.amount || 0), 0);

    // 3. Inventory value: live from InventoryRepository (quantity × costPrice per item)
    const inventoryItems = window.financeInventory || [];
    const inventoryValue = inventoryItems.reduce((s, i) => {
        const cost = Number(i.costPrice != null ? i.costPrice : (i.unitCost || 0));
        const val = i.totalValue != null ? Number(i.totalValue) : ((Number(i.quantity) || 0) * cost);
        return s + val;
    }, 0);

    // Auto-sync inventory from InventoryRepository if not yet loaded in memory
    if ((!window.financeInventory || window.financeInventory.length === 0) && !window._inventorySyncing) {
        window._inventorySyncing = true;
        inventoryRepository.getAllEnriched().then(items => {
            window.financeInventory = items || [];
            window._inventorySyncing = false;
            renderBalanceSheet(financeStore.getState().metrics || {});
        }).catch(err => {
            console.warn('Balance sheet inventory auto-sync notice:', err);
            window._inventorySyncing = false;
        });
    }

    // 4. Accounts Payable as of endDateStr (Pending Expense)
    const apTxns = allTxns.filter(t => {
        if (t.status !== 'Pending' || t.type !== 'Expense') return false;
        const d = (t.date || '').split('T')[0];
        if (bounds.endDateStr && d > bounds.endDateStr) return false;
        return true;
    });
    const ap = apTxns.reduce((s, t) => s + parseFloat(t.amount || 0), 0);

    const totalAssets = cash + ar + inventoryValue;
    const totalLiabilities = ap;
    const equity = totalAssets - totalLiabilities;

    // Update DOM
    const bsPeriodBadge = document.getElementById('bs-period-badge');
    if (bsPeriodBadge) bsPeriodBadge.textContent = bounds.label;

    const bsCash = document.getElementById('bs-cash');
    const bsAr = document.getElementById('bs-ar');
    const bsInventory = document.getElementById('bs-inventory');
    const bsTotalAssets = document.getElementById('bs-total-assets');
    
    const bsAp = document.getElementById('bs-ap');
    const bsTotalLiabilities = document.getElementById('bs-total-liabilities');
    
    const bsEquity = document.getElementById('bs-equity');

    if (bsCash) bsCash.textContent = formatMoney(cash);
    if (bsAr) bsAr.textContent = formatMoney(ar);
    if (bsInventory) bsInventory.textContent = formatMoney(inventoryValue);
    if (bsTotalAssets) bsTotalAssets.textContent = formatMoney(totalAssets);

    if (bsAp) bsAp.textContent = formatMoney(ap);
    if (bsTotalLiabilities) bsTotalLiabilities.textContent = formatMoney(totalLiabilities);

    if (bsEquity) {
        bsEquity.textContent = formatMoney(equity);
        if (equity < 0) {
            bsEquity.classList.remove('text-primary');
            bsEquity.classList.add('text-error');
        } else {
            bsEquity.classList.remove('text-error');
            bsEquity.classList.add('text-primary');
        }
    }
}

function updateBulkToolbar(state) {
    let toolbarContainer = document.getElementById('bulk-toolbar-container');
    if (state.isBulkMode) {
        if (!toolbarContainer) {
            toolbarContainer = document.createElement('div');
            toolbarContainer.id = 'bulk-toolbar-container';
            document.body.appendChild(toolbarContainer);
        }
        toolbarContainer.innerHTML = `
        <div id="bulk-actions-toolbar" class="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-surface border-t border-outline-variant/30 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-[100] pb-6 pt-3 px-4 flex justify-between items-center transition-transform duration-300 translate-y-0">
            <div class="flex items-center gap-2">
                <button onclick="window.cancelBulkSelection()" class="w-10 h-10 rounded-full flex items-center justify-center text-secondary active-bg">
                    <span class="material-symbols-outlined text-[20px]">close</span>
                </button>
                <span class="text-[14px] font-bold text-on-surface">${state.selectedIds.size} Selected</span>
            </div>
            <div class="flex gap-1">
                <button onclick="window.selectAllTransactions()" title="Select All" class="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl text-secondary active-bg transition-colors">
                    <span class="material-symbols-outlined text-[18px]">done_all</span>
                    <span class="text-[10px] font-medium">All</span>
                </button>
                <button onclick="window.bulkArchive()" title="Archive" class="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl text-secondary active-bg transition-colors">
                    <span class="material-symbols-outlined text-[18px]">archive</span>
                    <span class="text-[10px] font-medium">Archive</span>
                </button>
                <button onclick="window.bulkDelete()" title="Delete" class="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl text-error active-bg transition-colors">
                    <span class="material-symbols-outlined text-[18px]">delete</span>
                    <span class="text-[10px] font-medium">Delete</span>
                </button>
                <button onclick="window.bulkExport()" title="Export CSV" class="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl text-secondary active-bg transition-colors">
                    <span class="material-symbols-outlined text-[18px]">download</span>
                    <span class="text-[10px] font-medium">Export</span>
                </button>
                <button onclick="window.bulkPrint()" title="Print" class="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl text-secondary active-bg transition-colors">
                    <span class="material-symbols-outlined text-[18px]">print</span>
                    <span class="text-[10px] font-medium">Print</span>
                </button>
            </div>
        </div>`;
    } else if (toolbarContainer) {
        toolbarContainer.remove();
    }
}

function updateActiveEntitySheets(entity) {
    const sheet = document.getElementById('transactionDetailsSheet');
    if (sheet && !sheet.classList.contains('translate-y-full')) {
        const bodyContent = sheet.querySelector('.overflow-y-auto');
        if (bodyContent && getTransactionDetailsContent) {
            bodyContent.innerHTML = getTransactionDetailsContent(entity);
        }
        const header = sheet.querySelector('.bg-surface-container-lowest.sticky');
        if (header && getTransactionDetailsHeader) {
            header.innerHTML = getTransactionDetailsHeader(entity);
        }
    }
}

// ==========================================
// FORM HANDLING
// ==========================================

async function resolvePartyId(type, refInputValue) {
    if (!refInputValue) return '';
    const isIncome = type === 'Income';
    const list = isIncome ? (window.financeParties?.customers || []) : (window.financeParties?.vendors || []);
    
    // Check if it matches an existing ID
    let existing = list.find(p => p.id === refInputValue);
    if (existing) return existing.id;
    
    // Check if it matches an existing name case-insensitively
    existing = list.find(p => p.name.toLowerCase() === refInputValue.toLowerCase());
    if (existing) return existing.id;
    
    // It's a new name, create it!
    if (isIncome) {
        try {
            const newCust = await api.saveCustomer({ name: refInputValue });
            if (window.financeParties) window.financeParties.customers.push(newCust);
            return newCust.id;
        } catch (e) {
            console.warn('Failed to auto-create customer', e);
            return refInputValue;
        }
    } else {
        try {
            const newVend = await api.saveVendor({ name: refInputValue });
            if (window.financeParties) window.financeParties.vendors.push(newVend);
            return newVend.id;
        } catch (e) {
            console.warn('Failed to auto-create vendor', e);
            return refInputValue;
        }
    }
}

async function handleAddTransaction() {
    const type = document.getElementById('trans-type').value;
    const date = document.getElementById('trans-date').value;
    const title = document.getElementById('trans-title').value;
    const amount = parseFloat(document.getElementById('trans-amount').value);
    let category = document.getElementById('trans-category').value;
    if (category === 'Other') {
        const customCat = document.getElementById('trans-other-category')?.value.trim();
        if (customCat) category = customCat;
    }
    const paymentMethod = document.getElementById('trans-method').value;
    const referenceNo = document.getElementById('trans-ref').value;
    const status = document.getElementById('trans-status').value;
    const notes = document.getElementById('trans-notes').value;
    let refId = document.getElementById('trans-refId')?.value || '';
    
    if(!title || !amount) return;

    window.showToast?.('Saving transaction...', 'info');
    
    try {
        refId = await resolvePartyId(type, refId);
        const attachments = getPendingAttachments('trans-');

        await api.createTransaction({
            type, date, title, amount, category, paymentMethod, referenceNo, status, notes, createdBy: 'Admin', refId, attachments
        });
        window.closeSheet('addTransactionSheet');
        window.showToast?.('Transaction added successfully!', 'success');
        
        // Reset form manually
        document.getElementById('trans-title').value = '';
        document.getElementById('trans-amount').value = '';
        document.getElementById('trans-ref').value = '';
        document.getElementById('trans-notes').value = '';
        const otherInput = document.getElementById('trans-other-category');
        if (otherInput) otherInput.value = '';
        document.getElementById('trans-other-category-container')?.classList.add('hidden');
        setPendingAttachments('trans-', []);
        
        financeStore.loadTransactions();
    } catch (e) {
        window.showToast?.('Failed to add transaction', 'error');
    }
}

async function handleEditTransaction() {
    const id = document.getElementById('edit-trans-id').value;
    const type = document.getElementById('edit-trans-type').value;
    const date = document.getElementById('edit-trans-date').value;
    const title = document.getElementById('edit-trans-title').value;
    const amount = parseFloat(document.getElementById('edit-trans-amount').value);
    let category = document.getElementById('edit-trans-category').value;
    if (category === 'Other') {
        const customCat = document.getElementById('edit-trans-other-category')?.value.trim();
        if (customCat) category = customCat;
    }
    const paymentMethod = document.getElementById('edit-trans-method').value;
    const referenceNo = document.getElementById('edit-trans-ref').value;
    const status = document.getElementById('edit-trans-status').value;
    const notes = document.getElementById('edit-trans-notes').value;
    let refId = document.getElementById('edit-trans-refId')?.value || '';

    window.showToast?.('Updating transaction...', 'info');
    
    try {
        refId = await resolvePartyId(type, refId);
        const attachments = getPendingAttachments('edit-trans-');

        await api.updateTransaction(id, {
            type, date, title, amount, category, paymentMethod, referenceNo, status, notes, refId, attachments
        });
        window.closeSheet('editTransactionSheet');
        window.showToast?.('Transaction updated', 'success');
        setPendingAttachments('edit-trans-', []);
        
        financeStore.loadTransactions(); // refresh list
        setTimeout(() => {
            window.openTransactionDetails(id);
        }, 200);
    } catch (e) {
        window.showToast?.('Failed to update', 'error');
    }
}

// ==========================================
// WINDOW EXPORTS (For UI Events)
// ==========================================

window.onFinancePeriodChanged = function(period, customRange) {
    window._currentFinancePeriod = period;
    window._currentFinanceCustomRange = customRange;
    const metrics = financeStore.getState().metrics || {};
    renderBalanceSheet(metrics);
};

window.openBsDetail = async function(type) {
    const sheet = document.getElementById('bs-detail-sheet');
    const titleEl = document.getElementById('bs-detail-title');
    const bodyEl = document.getElementById('bs-detail-body');
    if (!sheet || !bodyEl) return;

    const allTxns = financeStore.getState().allTransactions || [];
    const parties = window.financeParties || { customers: [], vendors: [] };
    const bounds = getActivePeriodBounds();

    const titles = {
        cash: 'Cash & Bank Balance',
        receivable: 'Accounts Receivable',
        payable: 'Accounts Payable',
        inventory: 'Inventory Value'
    };

    let items = [];
    let openingBalance = 0;

    if (type === 'cash') {
        if (bounds.startDateStr) {
            const priorTxns = allTxns.filter(t => t.status === 'Completed' && (t.date || '').split('T')[0] < bounds.startDateStr);
            openingBalance = priorTxns.reduce((s, t) => t.type === 'Income' ? s + parseFloat(t.amount || 0) : s - parseFloat(t.amount || 0), 0);
        }
        items = allTxns.filter(t => {
            if (t.status !== 'Completed') return false;
            const d = (t.date || '').split('T')[0];
            if (bounds.startDateStr && d < bounds.startDateStr) return false;
            if (bounds.endDateStr && d > bounds.endDateStr) return false;
            return true;
        });
    } else if (type === 'receivable') {
        items = allTxns.filter(t => {
            if (t.status !== 'Pending' || t.type !== 'Income') return false;
            const d = (t.date || '').split('T')[0];
            if (bounds.startDateStr && d < bounds.startDateStr) return false;
            if (bounds.endDateStr && d > bounds.endDateStr) return false;
            return true;
        });
    } else if (type === 'payable') {
        items = allTxns.filter(t => {
            if (t.status !== 'Pending' || t.type !== 'Expense') return false;
            const d = (t.date || '').split('T')[0];
            if (bounds.startDateStr && d < bounds.startDateStr) return false;
            if (bounds.endDateStr && d > bounds.endDateStr) return false;
            return true;
        });
    } else if (type === 'inventory') {
        try {
            window.financeInventory = await inventoryRepository.getAllEnriched();
        } catch (e) {
            console.warn('Using cached inventory for balance sheet drilldown', e);
        }
        items = window.financeInventory || [];
    }

    const runningBalanceData = {
        openingBalance,
        periodLabel: bounds.label,
        startDate: bounds.startDateStr,
        endDate: bounds.endDateStr
    };

    // Store current detail for PDF export
    window._bsDetailType = type;
    window._bsDetailItems = items;
    window._bsDetailParties = parties;
    window._bsDetailRunningData = runningBalanceData;

    if (titleEl) titleEl.textContent = titles[type] || 'Detail';
    bodyEl.innerHTML = getBalanceSheetDetailHTML(type, items, parties, runningBalanceData);

    sheet.classList.remove('translate-y-full');
    sheet.classList.add('translate-y-0');
    document.getElementById('bs-detail-backdrop')?.classList.remove('opacity-0', 'pointer-events-none');
    document.getElementById('bs-detail-backdrop')?.classList.add('opacity-100');
};

window.closeBsDetail = function() {
    const sheet = document.getElementById('bs-detail-sheet');
    sheet?.classList.add('translate-y-full');
    sheet?.classList.remove('translate-y-0');
    const bd = document.getElementById('bs-detail-backdrop');
    bd?.classList.add('opacity-0', 'pointer-events-none');
    bd?.classList.remove('opacity-100');
};

window.exportBsDetailPDF = function() {
    const type = window._bsDetailType;
    const items = window._bsDetailItems || [];
    const parties = window._bsDetailParties || { customers: [], vendors: [] };
    const runningData = window._bsDetailRunningData;
    if (!type) return;

    const fmt = (n) => '₹' + parseFloat(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    const today = new Date();
    const titles = { cash: 'Cash & Bank Balance', receivable: 'Accounts Receivable', payable: 'Accounts Payable', inventory: 'Inventory Value' };
    const daysSince = (d) => Math.floor((today - new Date(d)) / 86400000);

    let tableHTML = '';
    if (type === 'cash') {
        const sorted = [...items].sort((a, b) => new Date(a.date) - new Date(b.date));
        const opBal = runningData?.openingBalance || 0;
        let bal = opBal;
        const rows = sorted.map(t => {
            const amt = parseFloat(t.amount || 0);
            const isInc = t.type === 'Income';
            const debit = isInc ? 0 : amt;
            const credit = isInc ? amt : 0;
            bal += isInc ? amt : -amt;
            return { ...t, debit, credit, balance: bal };
        });
        const tD = rows.reduce((s, r) => s + r.debit, 0);
        const tC = rows.reduce((s, r) => s + r.credit, 0);
        const closing = rows.length ? rows[rows.length - 1].balance : opBal;
        tableHTML = `<table><thead><tr><th>Date</th><th>Description</th><th>Category</th><th class="num">Debit (−)</th><th class="num">Credit (+)</th><th class="num">Balance</th></tr></thead>
        <tbody><tr class="sub"><td>—</td><td colspan="4"><em>Opening Balance</em></td><td class="num"><strong>${fmt(opBal)}</strong></td></tr>
        ${rows.map(r => `<tr><td>${r.date}</td><td><strong>${r.title}</strong></td><td>${r.category}</td>
            <td class="num debit">${r.debit > 0 ? fmt(r.debit) : '—'}</td>
            <td class="num credit">${r.credit > 0 ? fmt(r.credit) : '—'}</td>
            <td class="num"><strong>${fmt(r.balance)}</strong></td></tr>`).join('')}</tbody>
        <tfoot><tr class="total"><td colspan="3">Total</td><td class="num debit">${fmt(tD)}</td><td class="num credit">${fmt(tC)}</td><td class="num closing">${fmt(closing)}</td></tr></tfoot></table>`;
    } else if (type === 'receivable' || type === 'payable') {
        const isRec = type === 'receivable';
        const grouped = {};
        items.forEach(t => {
            const p = t.refId ? (isRec ? parties.customers : parties.vendors)?.find(x => String(x.id) === String(t.refId)) : null;
            const key = p ? p.name : (t.title || 'Unknown');
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(t);
        });
        const total = items.reduce((s, t) => s + parseFloat(t.amount || 0), 0);
        tableHTML = `<table><thead><tr><th>${isRec ? 'Customer' : 'Vendor'} / Description</th><th>Date</th><th class="num">Age</th><th class="num">Amount</th></tr></thead><tbody>
        ${Object.entries(grouped).map(([name, txns]) => {
            const sub = txns.reduce((s, t) => s + parseFloat(t.amount || 0), 0);
            return `<tr class="sub"><td><strong>${name}</strong></td><td></td><td></td><td class="num ${isRec ? 'credit' : 'debit'}"><strong>${fmt(sub)}</strong></td></tr>
            ${txns.map(t => {
                const days = daysSince(t.date);
                return `<tr><td style="padding-left:20px">${t.title}${days > 30 ? ' ⚠️' : ''}</td><td>${t.date}</td><td class="num">${days}d</td><td class="num ${isRec ? 'credit' : 'debit'}">${fmt(parseFloat(t.amount || 0))}</td></tr>`;
            }).join('')}`;
        }).join('')}</tbody>
        <tfoot><tr class="total"><td colspan="3">Total ${isRec ? 'Receivable' : 'Payable'}</td><td class="num ${isRec ? 'credit' : 'debit'}">${fmt(total)}</td></tr></tfoot></table>`;
    } else if (type === 'inventory') {
        const total = items.reduce((s, i) => {
            const cost = Number(i.costPrice != null ? i.costPrice : (i.unitCost || 0));
            return s + (i.totalValue != null ? Number(i.totalValue) : (Number(i.quantity || 0) * cost));
        }, 0);
        tableHTML = `<table><thead><tr><th>Item & Category</th><th>SKU</th><th class="num">In Hand</th><th class="num">Unit Cost</th><th class="num">Line Valuation</th><th class="num">%</th></tr></thead><tbody>
        ${items.map(item => {
            const unitCost = Number(item.costPrice != null ? item.costPrice : (item.unitCost || 0));
            const lv = item.totalValue != null ? Number(item.totalValue) : (Number(item.quantity || 0) * unitCost);
            const pct = total > 0 ? (lv / total * 100).toFixed(1) : '0.0';
            const cat = item.category ? `${item.category}${item.subCategory ? ' · ' + item.subCategory : ''}` : 'Inventory';
            return `<tr><td><strong>${item.name}</strong><br><small style="color:#666">${cat} · ${item.status || 'In Stock'}</small></td><td>${item.sku || '—'}</td><td class="num">${Number(item.quantity || 0).toLocaleString()} ${item.unit || 'Units'}</td><td class="num">${fmt(unitCost)}</td><td class="num credit">${fmt(lv)}</td><td class="num">${pct}%</td></tr>`;
        }).join('')}</tbody>
        <tfoot><tr class="total"><td colspan="4">Total Current Inventory Valuation</td><td class="num credit">${fmt(total)}</td><td class="num">100%</td></tr></tfoot></table>`;
    }

    const win = window.open('', '_blank', 'width=900,height=700');
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>${titles[type]} — Balance Sheet Detail</title>
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #111; padding: 32px; }
        h1 { font-size: 20px; margin: 0 0 4px; color: #1a1a2e; }
        .meta { font-size: 11px; color: #666; margin-bottom: 24px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f5f5f7; padding: 8px 10px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #d1d1d6; }
        td { padding: 7px 10px; border-bottom: 1px solid #e5e5ea; }
        .num { text-align: right; }
        .debit { color: #c0392b; }
        .credit { color: #1a7a1a; }
        .closing { color: #1d3a8a; font-weight: 700; }
        tr.sub td { background: #f9f9fb; font-weight: 600; }
        tfoot tr.total td { background: #f0f0f5; font-weight: 700; font-size: 13px; border-top: 2px solid #a0a0b0; }
        @media print { body { padding: 16px; } }
    </style></head>
    <body>
    <h1>${titles[type]}</h1>
    <p class="meta">Generated: ${today.toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })} · Period: ${runningData?.periodLabel || 'All'} · ${items.length} entries · GarmentOS Finance</p>
    ${tableHTML}
    <script>setTimeout(() => { window.print(); }, 400);<\/script>
    </body></html>`);
    win.document.close();
};


window.toggleFinanceView = function(view) {
    const cashFlowView = document.getElementById('cash-flow-view');
    const balanceSheetView = document.getElementById('balance-sheet-view');
    const tabCashFlow = document.getElementById('tab-cash-flow');
    const tabBalanceSheet = document.getElementById('tab-balance-sheet');
    const periodSelector = document.getElementById('cash-flow-period-selector');
    const fab = document.getElementById('fab-container');

    if (view === 'cash-flow') {
        cashFlowView.classList.remove('hidden');
        cashFlowView.classList.add('flex');
        balanceSheetView.classList.add('hidden');
        balanceSheetView.classList.remove('flex');
        
        tabCashFlow.classList.add('bg-primary', 'text-white', 'shadow-sm');
        tabCashFlow.classList.remove('text-secondary', 'hover:text-on-surface');
        
        tabBalanceSheet.classList.remove('bg-primary', 'text-white', 'shadow-sm');
        tabBalanceSheet.classList.add('text-secondary', 'hover:text-on-surface');
        
        if (periodSelector) periodSelector.classList.remove('hidden');
        if (fab) fab.classList.remove('hidden'); // Show FAB
    } else {
        cashFlowView.classList.add('hidden');
        cashFlowView.classList.remove('flex');
        balanceSheetView.classList.remove('hidden');
        balanceSheetView.classList.add('flex');

        tabCashFlow.classList.remove('bg-primary', 'text-white', 'shadow-sm');
        tabCashFlow.classList.add('text-secondary', 'hover:text-on-surface');
        
        tabBalanceSheet.classList.add('bg-primary', 'text-white', 'shadow-sm');
        tabBalanceSheet.classList.remove('text-secondary', 'hover:text-on-surface');
        
        if (periodSelector) periodSelector.classList.remove('hidden'); // Keep period selector visible for Balance Sheet too!
        if (fab) fab.classList.add('hidden'); // Hide FAB since transactions aren't added here

        // Instantly refresh inventory when switching to Balance Sheet
        inventoryRepository.getAllEnriched().then(items => {
            window.financeInventory = items || [];
            renderBalanceSheet(financeStore.getState().metrics || {});
        }).catch(() => {});
    }
};

window.openTransactionDetails = async function(id) {
    if (financeStore.getState().isBulkMode) {
        window.toggleTransactionSelection(id);
        return;
    }

    await financeStore.fetchActiveEntity(id);
    const t = financeStore.getState().activeEntity;
    if (!t) return;

    const container = document.getElementById('sheets-container');
    const existing = document.getElementById('transactionDetailsSheet-content');
    if (existing) {
        existing.remove(); 
        const overlay = document.getElementById('transactionDetailsSheet-overlay');
        if (overlay) overlay.remove();
    }

    const sheetHTML = BottomSheet({
        id: 'transactionDetailsSheet',
        customHeader: getTransactionDetailsHeader(t),
        content: getTransactionDetailsContent(t),
        height: '85vh'
    });

    container.insertAdjacentHTML('beforeend', sheetHTML);
    setTimeout(() => window.openSheet('transactionDetailsSheet'), 50);
};

window.saveDetailNotes = async function(id) {
    const notes = document.getElementById('detail-notes-input').value;
    window.showToast?.('Saving notes...', 'info');
    try {
        await api.updateTransaction(id, { notes });
        window.showToast?.('Notes updated', 'success');
        document.getElementById('save-detail-notes-btn')?.classList.add('hidden');
        await financeStore.loadTransactions();
        await financeStore.fetchActiveEntity(id);
    } catch (e) {
        window.showToast?.('Failed to update notes', 'error');
    }
};

window.toggleAddAmountForm = function(id) {
    const form = document.getElementById('add-amount-form');
    if (!form) return;
    form.classList.toggle('hidden');
    if (!form.classList.contains('hidden')) {
        document.getElementById('sub-amount')?.focus();
    }
};

window.addExpenseSubEntry = async function(id) {
    const amount = parseFloat(document.getElementById('sub-amount')?.value);
    const date = document.getElementById('sub-date')?.value;
    const note = document.getElementById('sub-note')?.value?.trim() || '';
    const paymentMethod = document.getElementById('sub-method')?.value || 'Cash';

    if (!amount || amount <= 0) {
        window.showToast?.('Please enter a valid amount', 'error');
        return;
    }
    if (!date) {
        window.showToast?.('Please select a date', 'error');
        return;
    }

    const t = financeStore.getState().activeEntity;
    if (!t) return;

    // Parse existing subEntries
    let existing = [];
    if (t.subEntries) {
        try {
            existing = typeof t.subEntries === 'string' ? JSON.parse(t.subEntries) : (Array.isArray(t.subEntries) ? t.subEntries : []);
        } catch { existing = []; }
    }

    const newEntry = { amount, date, note, paymentMethod };
    const updated = [...existing, newEntry];

    const btn = document.querySelector('#add-amount-form button[onclick*="addExpenseSubEntry"]');
    if (btn) btn.textContent = 'Saving...';
    
    try {
        await api.updateTransaction(id, { subEntries: JSON.stringify(updated) });
        window.showToast?.('Payment added successfully!', 'success');
        await financeStore.loadTransactions();
        // Re-open details sheet to reflect the new entry
        setTimeout(() => window.openTransactionDetails(id), 200);
    } catch (e) {
        window.showToast?.('Failed to add payment', 'error');
        if (btn) btn.innerHTML = '<span class="material-symbols-outlined text-[16px] align-middle mr-1">add</span> Save Payment';
    }
};

window.openCategoryBreakdown = function(category) {
    const state = financeStore.getState();
    const allTxns = state.allTransactions || state.entities || [];

    // Compute total expenses across the period for the % calculation
    const totalExpenses = allTxns
        .filter(t => t.type === 'Expense')
        .reduce((s, t) => {
            let sub = 0;
            if (t.subEntries) {
                try {
                    const entries = typeof t.subEntries === 'string' ? JSON.parse(t.subEntries) : (Array.isArray(t.subEntries) ? t.subEntries : []);
                    sub = entries.reduce((ss, se) => ss + parseFloat(se.amount || 0), 0);
                } catch { sub = 0; }
            }
            return s + parseFloat(t.amount) + sub;
        }, 0);

    const container = document.getElementById('sheets-container');
    const existing = document.getElementById('categoryBreakdownSheet-content');
    if (existing) {
        existing.remove();
        const overlay = document.getElementById('categoryBreakdownSheet-overlay');
        if (overlay) overlay.remove();
    }

    const sheetHTML = BottomSheet({
        id: 'categoryBreakdownSheet',
        customHeader: `
            <div class="px-lg pb-md flex justify-between items-center border-b border-outline-variant/30">
                <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-xl bg-error/10 flex items-center justify-center">
                        <span class="material-symbols-outlined text-error text-[18px]">donut_small</span>
                    </div>
                    <div>
                        <h2 class="text-[18px] font-bold text-on-surface">${category}</h2>
                        <p class="text-[12px] text-secondary">Expense Category Breakdown</p>
                    </div>
                </div>
                <button onclick="window.closeSheet('categoryBreakdownSheet')" class="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center text-secondary active-scale transition-apple">
                    <span class="material-symbols-outlined text-[20px]">close</span>
                </button>
            </div>
        `,
        content: getCategoryBreakdownSheetContent(category, allTxns, totalExpenses),
        height: '88vh'
    });

    container.insertAdjacentHTML('beforeend', sheetHTML);
    setTimeout(() => window.openSheet('categoryBreakdownSheet'), 50);
};

window.editTransaction = function() {
    const t = financeStore.getState().activeEntity;
    if (!t) return;
    
    window.closeSheet('transactionDetailsSheet');

    const editContainer = document.getElementById('edit-trans-container');
    if (editContainer) {
        editContainer.innerHTML = getAddTransactionSheetHTML(t, 'edit-trans-', window.financeParties);
        // rebind validation since content changed
        bindFormValidation('editTransactionSheet-content', 'edit-trans-submit');
        setupTypeChange('edit-trans-');
        setupCategoryToggle('edit-trans-');
        setupSearchableSelects('edit-trans-category');
        setupSearchableSelects('edit-trans-refId');
        initPendingAttachments('edit-trans-', t.attachments || []);
        setupDropzoneEvents('edit-trans-');
    }
    setTimeout(() => {
        window.openSheet('editTransactionSheet');
    }, 150);
};

window.duplicateTransaction = async function() {
    const t = financeStore.getState().activeEntity;
    if (!t) return;
    window.showToast?.('Duplicating transaction...', 'info');
    try {
        const newTxn = await api.duplicateTransaction(t.id);
        window.showToast?.('Transaction duplicated', 'success');
        window.closeSheet('transactionDetailsSheet');
        financeStore.loadTransactions();
        window.openTransactionDetails(newTxn.id);
    } catch (e) {
        window.showToast?.('Failed to duplicate', 'error');
    }
};

window.deleteTransaction = async function() {
    const t = financeStore.getState().activeEntity;
    if (!t) return;
    window.showToast?.('Deleting transaction...', 'info');
    try {
        await api.deleteTransaction(t.id);
        window.showToast?.('Transaction deleted', 'success');
        window.closeSheet('transactionDetailsSheet');
        financeStore.loadTransactions();
    } catch (e) {
        window.showToast?.('Failed to delete', 'error');
    }
};

window.applyFilters = function() {
    const type = document.getElementById('filter-type')?.value || 'all';
    const status = document.getElementById('filter-status')?.value || 'all';
    const paymentMethod = document.getElementById('filter-method')?.value || 'all';
    const dateRange = document.getElementById('filter-date')?.value || 'all';
    
    if (dateRange === 'custom') {
        window.closeSheet('filterSheet');
        window.openCustomDateFilter();
        return;
    }

    financeStore.setFilters({
        type,
        status,
        paymentMethod,
        dateRange,
        startDate: null,
        endDate: null
    });
    
    window.closeSheet('filterSheet');
};

window.selectFilterPill = function(category, value, el) {
    const hiddenInput = document.getElementById(`filter-${category}`);
    if (hiddenInput) hiddenInput.value = value;

    const parent = el.closest('div');
    if (parent) {
        parent.querySelectorAll('button').forEach(b => {
            b.classList.remove('bg-primary', 'text-white', 'border-primary', 'shadow-xs');
            b.classList.add('bg-surface-container-lowest', 'text-on-surface', 'border-outline-variant');
        });
    }
    el.classList.add('bg-primary', 'text-white', 'border-primary', 'shadow-xs');
    el.classList.remove('bg-surface-container-lowest', 'text-on-surface', 'border-outline-variant');
};

window.setQuickFilter = function(val) {
    const current = financeStore.getState().currentFilters || {};
    if (val === 'all') {
        financeStore.setFilters({ type: 'all', status: 'all' });
    } else if (val === 'Income' || val === 'Expense') {
        const nextType = (current.type && current.type.toLowerCase() === val.toLowerCase()) ? 'all' : val;
        financeStore.setFilters({ type: nextType });
    } else if (val === 'Pending' || val === 'Completed') {
        const nextStatus = (current.status && current.status.toLowerCase() === val.toLowerCase()) ? 'all' : val;
        financeStore.setFilters({ status: nextStatus });
    }
};

window.removeSingleFilter = function(key) {
    const current = { ...financeStore.getState().currentFilters };
    current[key] = 'all';
    if (key === 'dateRange') {
        current.startDate = null;
        current.endDate = null;
    }
    financeStore.setFilters(current);
};

window.clearFilters = function() {
    if (document.getElementById('filter-type')) document.getElementById('filter-type').value = 'all';
    if (document.getElementById('filter-status')) document.getElementById('filter-status').value = 'all';
    if (document.getElementById('filter-method')) document.getElementById('filter-method').value = 'all';
    if (document.getElementById('filter-date')) document.getElementById('filter-date').value = 'all';
    
    financeStore.setFilters({
        type: 'all',
        status: 'all',
        paymentMethod: 'all',
        dateRange: 'all',
        startDate: null,
        endDate: null
    });

    window.closeSheet('filterSheet');
};

window.openCustomDateFilter = function() {
    window.openSheet?.('customDateSheet');
    const startInput = document.getElementById('custom-date-start');
    const endInput = document.getElementById('custom-date-end');
    const current = financeStore.getState().currentFilters;
    if (current.dateRange === 'custom' && current.startDate && current.endDate) {
        if (startInput) startInput.value = current.startDate;
        if (endInput) endInput.value = current.endDate;
    }
    startInput?.dispatchEvent(new Event('input', { bubbles: true }));
};

window.applyCustomDateFilter = function() {
    const startInput = document.getElementById('custom-date-start');
    const endInput = document.getElementById('custom-date-end');
    const applyList = document.getElementById('custom-date-apply-list');

    if (!startInput || !endInput) return;
    const startDate = startInput.value;
    const endDate = endInput.value;

    if (!startDate || !endDate) {
        window.showToast?.('Please choose both From and To dates', 'warning');
        return;
    }
    if (startDate > endDate) {
        window.showToast?.('From Date cannot be later than To Date', 'error');
        return;
    }

    // 1. Update SVG Chart Engine in finance.html
    if (typeof window.finSetPeriod === 'function') {
        window.finSetPeriod('custom', { startDate, endDate });
    }

    // 2. Update pill UI active styling
    document.querySelectorAll('.period-pill').forEach(el => {
        const isCustom = el.dataset.period === 'custom';
        el.classList.toggle('active', isCustom);
        el.classList.toggle('inactive', !isCustom);
    });

    // 3. Update active banner in finance.html
    const sDate = new Date(startDate + 'T00:00:00');
    const eDate = new Date(endDate + 'T00:00:00');
    const sFmt = sDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const eFmt = eDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const banner = document.getElementById('active-custom-range-banner');
    const bannerText = document.getElementById('active-custom-range-text');
    if (banner && bannerText) {
        bannerText.textContent = `${sFmt} – ${eFmt}`;
        banner.classList.remove('hidden');
    }

    // 4. Update transaction list in FinanceStore if checked
    if (applyList && applyList.checked) {
        financeStore.setCustomDateRange(startDate, endDate);
    }

    window.closeSheet?.('customDateSheet');
    window.showToast?.(`Custom range: ${sFmt} – ${eFmt}`, 'info');
};

window.clearCustomDateFilter = function() {
    if (typeof window.finSetPeriod === 'function') {
        window.finSetPeriod('7d');
    }

    const banner = document.getElementById('active-custom-range-banner');
    if (banner) banner.classList.add('hidden');

    const state = financeStore.getState();
    if (state.currentFilters.dateRange === 'custom') {
        financeStore.setFilters({ dateRange: 'all', startDate: null, endDate: null });
    }

    window.closeSheet?.('customDateSheet');
};

window.onFinPeriodReset = function() {
    const banner = document.getElementById('active-custom-range-banner');
    if (banner) banner.classList.add('hidden');

    const state = financeStore.getState();
    if (state.currentFilters.dateRange === 'custom') {
        financeStore.setFilters({ dateRange: 'all', startDate: null, endDate: null });
    }
};

window.toggleTransactionSelection = function(id) {
    financeStore.toggleSelection(id);
};

window.selectAllTransactions = function() {
    const state = financeStore.getState();
    const allSelected = state.entities.length > 0 && state.selectedIds.size === state.entities.length;
    if (allSelected) {
        financeStore.clearSelection();
    } else {
        financeStore.selectAll(state.entities.map(e => e.id));
    }
};

window.cancelBulkSelection = function() {
    financeStore.clearSelection();
};

window.bulkArchive = async function() {
    const state = financeStore.getState();
    if (state.selectedIds.size === 0) return;
    window.showToast?.(`Archiving ${state.selectedIds.size} transactions...`, 'info');
    if (window.setLoading) window.setLoading('transactions-list');
    
    try {
        for (const id of state.selectedIds) {
            await api.archiveTransaction(id);
        }
        window.showToast?.('Transactions archived', 'success');
        financeStore.clearSelection();
        financeStore.loadTransactions();
    } catch (e) {
        window.showToast?.('Failed to bulk archive', 'error');
    }
};

window.bulkDelete = async function() {
    const state = financeStore.getState();
    if (state.selectedIds.size === 0) return;
    window.showConfirmation({
        title: 'Bulk Delete',
        message: `Are you sure you want to permanently delete ${state.selectedIds.size} transactions?`,
        confirmText: 'Delete',
        onConfirm: async () => {
            window.showToast?.(`Deleting ${state.selectedIds.size} transactions...`, 'info');
            if (window.setLoading) window.setLoading('transactions-list');
            try {
                for (const id of state.selectedIds) {
                    await api.deleteTransaction(id);
                }
                window.showToast?.('Transactions deleted', 'success');
                financeStore.clearSelection();
                financeStore.loadTransactions();
            } catch (e) {
                window.showToast?.('Failed to bulk delete', 'error');
            }
        }
    });
};

window.bulkExport = function() {
    if (financeStore.getState().selectedIds.size === 0) return;
    window.showToast?.(`Exporting ${financeStore.getState().selectedIds.size} transactions to CSV...`, 'info');
    setTimeout(() => {
        window.showToast?.('Export complete', 'success');
        financeStore.clearSelection();
    }, 1000);
};

window.bulkPrint = function() {
    if (financeStore.getState().selectedIds.size === 0) return;
    window.showToast?.(`Generating PDFs for ${financeStore.getState().selectedIds.size} transactions...`, 'info');
    setTimeout(() => {
        window.showToast?.('Ready for printing', 'success');
        financeStore.clearSelection();
        window.print();
    }, 1000);
};
