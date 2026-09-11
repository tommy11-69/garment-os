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
            dateRange: 'all',
            startDate: null,
            endDate: null
        };
        this.currentSort = 'newest';
        
        // Opening balance for calculation purposes
        this.openingBalance = 0;
    }

    getState() {
        const state = super.getState();
        const metrics = this._calculateMetrics(this._allEntities || state.entities);
        return {
            ...state,
            allTransactions: this._allEntities || state.entities,
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
            // Fetch all (for charts) and filtered (for list) in parallel
            const [allResults, results] = await Promise.all([
                financeRepository.searchTransactions('', {type:'all',status:'all',paymentMethod:'all',category:'all',dateRange:'all'}, this.currentSort),
                financeRepository.searchTransactions(this.currentSearch, this.currentFilters, this.currentSort)
            ]);
            this._allEntities = allResults;
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

    setFilters(filtersObj) {
        this.currentFilters = { ...this.currentFilters, ...filtersObj };
        this.loadTransactions();
    }

    setCustomDateRange(startDate, endDate) {
        this.currentFilters.dateRange = 'custom';
        this.currentFilters.startDate = startDate;
        this.currentFilters.endDate = endDate;
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
