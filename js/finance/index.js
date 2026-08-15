import { financeStore } from '../stores/FinanceStore.js';
import { api } from '../services/api.js';
import { renderers } from '../renderers.js';
import { BottomSheet } from '../components/index.js';
import { bindFormValidation } from '../utils/formHandler.js';
import { 
    getAddTransactionSheetHTML, getAddTransactionFooterHTML,
    getTransactionDetailsHeader, getTransactionDetailsContent,
    getFilterSheetHTML, getFilterFooterHTML
} from './templates.js';

async function initModule() {
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
        const sheetsHTML = [
            BottomSheet({ id: 'addTransactionSheet', title: 'New Transaction', content: getAddTransactionSheetHTML(), footerContent: getAddTransactionFooterHTML(false), isForm: true }),
            BottomSheet({ id: 'editTransactionSheet', title: 'Edit Transaction', content: '<div id="edit-trans-container"></div>', footerContent: getAddTransactionFooterHTML(true), isForm: true }),
            BottomSheet({ id: 'filterSheet', title: 'Filters', content: getFilterSheetHTML(state.currentFilters), footerContent: getFilterFooterHTML(), isForm: false })
        ].join('');
        
        sheetsContainer.innerHTML = sheetsHTML;

        bindFormValidation('addTransactionSheet-content', 'add-trans-submit');
        bindFormValidation('editTransactionSheet-content', 'edit-trans-submit');
        
        document.getElementById('add-trans-submit')?.addEventListener('click', handleAddTransaction);
        document.getElementById('edit-trans-submit')?.addEventListener('click', handleEditTransaction);
    }
}

function renderUI(state) {
    const { entities, selectedIds, isBulkMode, metrics, loading, error } = state;
    
    renderDashboard(metrics);
    
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

    updateBulkToolbar(state);
    updateActiveEntitySheets(state.activeEntity);
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

async function handleAddTransaction() {
    const type = document.getElementById('trans-type').value;
    const date = document.getElementById('trans-date').value;
    const title = document.getElementById('trans-title').value;
    const amount = parseFloat(document.getElementById('trans-amount').value);
    const category = document.getElementById('trans-category').value;
    const paymentMethod = document.getElementById('trans-method').value;
    const referenceNo = document.getElementById('trans-ref').value;
    const status = document.getElementById('trans-status').value;
    const notes = document.getElementById('trans-notes').value;
    
    if(!title || !amount) return;

    window.showToast?.('Saving transaction...', 'info');
    
    try {
        await api.createTransaction({
            type, date, title, amount, category, paymentMethod, referenceNo, status, notes, createdBy: 'Admin'
        });
        window.closeSheet('addTransactionSheet');
        window.showToast?.('Transaction added successfully!', 'success');
        
        // Reset form manually
        document.getElementById('trans-title').value = '';
        document.getElementById('trans-amount').value = '';
        document.getElementById('trans-ref').value = '';
        document.getElementById('trans-notes').value = '';
        
        financeStore.loadTransactions();
    } catch (e) {
        window.showToast?.('Failed to add transaction', 'error');
    }
}

async function handleEditTransaction() {
    const id = document.getElementById('trans-id').value;
    const type = document.getElementById('trans-type').value;
    const date = document.getElementById('trans-date').value;
    const title = document.getElementById('trans-title').value;
    const amount = parseFloat(document.getElementById('trans-amount').value);
    const category = document.getElementById('trans-category').value;
    const paymentMethod = document.getElementById('trans-method').value;
    const referenceNo = document.getElementById('trans-ref').value;
    const status = document.getElementById('trans-status').value;
    const notes = document.getElementById('trans-notes').value;

    window.showToast?.('Updating transaction...', 'info');
    
    try {
        await api.updateTransaction(id, {
            type, date, title, amount, category, paymentMethod, referenceNo, status, notes
        });
        window.closeSheet('editTransactionSheet');
        window.showToast?.('Transaction updated', 'success');
        
        financeStore.fetchActiveEntity(id); // update details sheet
        financeStore.loadTransactions(); // refresh list
    } catch (e) {
        window.showToast?.('Failed to update', 'error');
    }
}

// ==========================================
// WINDOW EXPORTS (For UI Events)
// ==========================================

window.openTransactionDetails = async function(id) {
    if (financeStore.getState().isBulkMode) {
        window.toggleTransactionSelection(id);
        return;
    }

    await financeStore.fetchActiveEntity(id);
    const t = financeStore.getState().activeEntity;
    if (!t) return;

    const container = document.getElementById('sheets-container');
    const existing = document.getElementById('transactionDetailsSheet');
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

window.editTransaction = function() {
    const t = financeStore.getState().activeEntity;
    if (!t) return;
    
    const editContainer = document.getElementById('edit-trans-container');
    if (editContainer) {
        editContainer.innerHTML = getAddTransactionSheetHTML(t);
        // rebind validation since content changed
        bindFormValidation('editTransactionSheet-content', 'edit-trans-submit');
    }
    window.openSheet('editTransactionSheet');
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
    const type = document.getElementById('filter-type').value;
    const status = document.getElementById('filter-status').value;
    const paymentMethod = document.getElementById('filter-method').value;
    const dateRange = document.getElementById('filter-date').value;
    
    financeStore.setFilter('type', type);
    financeStore.setFilter('status', status);
    financeStore.setFilter('paymentMethod', paymentMethod);
    financeStore.setFilter('dateRange', dateRange);
    
    window.closeSheet('filterSheet');
};

window.clearFilters = function() {
    document.getElementById('filter-type').value = 'all';
    document.getElementById('filter-status').value = 'all';
    document.getElementById('filter-method').value = 'all';
    document.getElementById('filter-date').value = 'all';
    
    window.applyFilters();
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
