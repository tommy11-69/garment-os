import { BaseStore } from './BaseStore.js';
import { financeRepository } from '../repositories/FinanceRepository.js';

class FinanceStore extends BaseStore {
    constructor() {
        super(financeRepository);
        this.currentSearch = '';
        this.currentFilters = {
            type: 'all',
            status: 'all',
            paymentMethod: 'all',
            category: 'all',
            dateRange: 'all'
        };
        this.currentSort = 'newest';
        
        // Opening balance for calculation purposes
        this.openingBalance = 0;
    }

    getState() {
        const state = super.getState();
        const metrics = this._calculateMetrics(state.entities);
        return {
            ...state,
            currentSearch: this.currentSearch,
            currentFilters: this.currentFilters,
            currentSort: this.currentSort,
            metrics
        };
    }

    _calculateMetrics(transactions) {
        const today = new Date();
        today.setHours(0,0,0,0);
        const thisMonth = today.getMonth();
        const thisYear = today.getFullYear();
        
        let totalIncome = 0;
        let totalExpenses = 0;
        
        let totalIncomeToday = 0;
        let totalExpensesToday = 0;
        
        let totalIncomeMonth = 0;
        let totalExpensesMonth = 0;

        let pendingPayments = 0;
        let pendingReceivables = 0;

        // All mock transactions combined for current balance
        transactions.forEach(t => {
            const amount = parseFloat(t.amount) || 0;
            const tDate = new Date(t.date);
            tDate.setHours(0,0,0,0);
            
            const isToday = tDate.getTime() === today.getTime();
            const isThisMonth = tDate.getMonth() === thisMonth && tDate.getFullYear() === thisYear;
            
            if (t.status === 'Completed') {
                if (t.type === 'Income') {
                    totalIncome += amount;
                    if (isToday) totalIncomeToday += amount;
                    if (isThisMonth) totalIncomeMonth += amount;
                } else if (t.type === 'Expense') {
                    totalExpenses += amount;
                    if (isToday) totalExpensesToday += amount;
                    if (isThisMonth) totalExpensesMonth += amount;
                }
            } else if (t.status === 'Pending') {
                if (t.type === 'Income') pendingReceivables += amount;
                if (t.type === 'Expense') pendingPayments += amount;
            }
        });

        const currentBalance = this.openingBalance + totalIncome - totalExpenses;

        return {
            currentBalance,
            totalIncomeToday,
            totalExpensesToday,
            netCashFlowToday: totalIncomeToday - totalExpensesToday,
            totalIncomeMonth,
            totalExpensesMonth,
            netCashFlowMonth: totalIncomeMonth - totalExpensesMonth,
            totalTransactions: transactions.length,
            pendingPayments,
            pendingReceivables
        };
    }

    async loadTransactions() {
        this.setState({ loading: true });
        try {
            const results = await financeRepository.searchTransactions(
                this.currentSearch,
                this.currentFilters,
                this.currentSort
            );
            this.setState({ entities: results, loading: false });
        } catch (err) {
            this.setState({ error: err, loading: false });
        }
    }

    setSearch(query) {
        this.currentSearch = query;
        this.loadTransactions();
    }

    setFilter(key, value) {
        this.currentFilters[key] = value;
        this.loadTransactions();
    }

    setSort(sort) {
        this.currentSort = sort;
        this.loadTransactions();
    }

    async fetchActiveEntity(id) {
        try {
            const entity = await financeRepository.getById(id);
            if (entity) {
                this.updateEntity(id, entity);
                this.setActiveEntity(id);
            }
        } catch (err) {
            console.error("Failed to fetch active transaction", err);
        }
    }
}

export const financeStore = new FinanceStore();
