import { financeStore } from '../stores/FinanceStore.js';
import { renderers } from '../renderers.js';
import { BottomSheet } from '../components/index.js';
import { bindFormValidation } from '../utils/formHandler.js';
import { 
    getAddTransactionSheetHTML, getAddTransactionFooterHTML,
    getTransferFundsSheetHTML, getTransferFundsFooterHTML,
    getTransactionDetailsHeader, getTransactionDetailsContent, getTransactionDetailsFooter
} from './templates.js';

document.addEventListener('DOMContentLoaded', () => {
    initUI();
    financeStore.subscribe(renderUI);
    financeStore.loadTransactions();
});

function initUI() {
    const sheetsContainer = document.getElementById('sheets-container');
    if (sheetsContainer) {
        const sheetsHTML = [
            BottomSheet({ id: 'addTransactionSheet', title: 'New Transaction', content: getAddTransactionSheetHTML(), footerContent: getAddTransactionFooterHTML(), isForm: true }),
            BottomSheet({ id: 'transferFundsSheet', title: 'Transfer Funds', content: getTransferFundsSheetHTML(), footerContent: getTransferFundsFooterHTML(), isForm: true })
        ].join('');
        
        sheetsContainer.innerHTML = sheetsHTML;

        bindFormValidation('addTransactionSheet-content', 'add-trans-submit');
        bindFormValidation('transferFundsSheet-content', 'tr-funds-submit');
    }
}

function renderUI(state) {
    const { entities, activeEntity, loading, error } = state;
    
    const container = document.getElementById('transactions-list');
    if (!container) return;

    if (loading) {
        if (window.setLoading) window.setLoading('transactions-list');
    } else if (error) {
        container.innerHTML = `<div class="p-md text-center text-error">Failed to load transactions: ${error.message}</div>`;
    } else if (entities.length === 0) {
        container.innerHTML = `<div class="p-md text-center text-secondary">No transactions found.</div>`;
    } else {
        container.innerHTML = entities.map(t => renderers.transactionCard(t)).join('');
    }
}

window.openTransactionDetails = async function(id) {
    await financeStore.fetchActiveEntity(id);
    const txn = financeStore.getState().activeEntity;
    if (!txn) return;

    const container = document.getElementById('sheets-container');
    const existing = document.getElementById('transactionDetailsSheet');
    if (existing) {
        existing.remove();
        const overlay = document.getElementById('transactionDetailsSheet-overlay');
        if (overlay) overlay.remove();
    }

    const sheetHTML = BottomSheet({
        id: 'transactionDetailsSheet',
        customHeader: getTransactionDetailsHeader(txn),
        content: getTransactionDetailsContent(txn),
        footerContent: getTransactionDetailsFooter(txn),
        height: '90vh'
    });

    container.insertAdjacentHTML('beforeend', sheetHTML);
    setTimeout(() => window.openSheet('transactionDetailsSheet'), 50);
};
