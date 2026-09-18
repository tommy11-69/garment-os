import { BaseStore } from './BaseStore.js?v=5.2';
import { financeRepository } from '../repositories/FinanceRepository.js?v=5.2';

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
        const all = this._allEntities || state.entities;
        const metrics = this._calculateMetrics(all);
        const pnlRows = this._calculatePnL(all, window.financeOrders || []);
        const pnlRowsPeriod = this._calculatePnL(
            this._getPeriodTransactions(all),
            window.financeOrders || []
        );
        return {
            ...state,
            allTransactions: all,
            currentSearch: this.currentSearch,
            currentFilters: this.currentFilters,
            currentSort: this.currentSort,
            metrics,
            pnlRows,        // all-time P&L
            pnlRowsPeriod   // period-filtered P&L
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

        const txList = Array.isArray(transactions) ? transactions : [];

        txList.forEach(t => {
            if (!t) return;
            const parsedBase = parseFloat(t.amount);
            const baseAmount = isNaN(parsedBase) ? 0 : parsedBase;

            // Sum subEntries (e.g. expense instalments/additions)
            let subTotal = 0;
            let subToday = 0;
            let subMonth = 0;

            if (t.subEntries) {
                let entries = [];
                try {
                    entries = typeof t.subEntries === 'string' ? JSON.parse(t.subEntries) : (Array.isArray(t.subEntries) ? t.subEntries : []);
                } catch { entries = []; }

                if (Array.isArray(entries)) {
                    entries.forEach(se => {
                        const seAmt = parseFloat(se.amount);
                        const cleanSeAmt = isNaN(seAmt) ? 0 : seAmt;
                        subTotal += cleanSeAmt;

                        const seDateStr = se.date || t.date;
                        if (seDateStr) {
                            const seDate = new Date(seDateStr);
                            seDate.setHours(0, 0, 0, 0);
                            if (!isNaN(seDate.getTime())) {
                                if (seDate.getTime() === today.getTime()) {
                                    subToday += cleanSeAmt;
                                }
                                if (seDate.getMonth() === thisMonth && seDate.getFullYear() === thisYear) {
                                    subMonth += cleanSeAmt;
                                }
                            }
                        }
                    });
                }
            }

            const totalAmount = baseAmount + subTotal;

            const tDate = new Date(t.date);
            tDate.setHours(0, 0, 0, 0);
            const isValidDate = !isNaN(tDate.getTime());
            
            const isToday = isValidDate && tDate.getTime() === today.getTime();
            const isThisMonth = isValidDate && tDate.getMonth() === thisMonth && tDate.getFullYear() === thisYear;

            const isExpense = t.type === 'Expense' || t.isNegative === 1 || t.isNegative === true;
            const isIncome = t.type === 'Income' && !isExpense;
            
            if (t.status === 'Completed') {
                if (isIncome) {
                    totalIncome += totalAmount;
                    if (isToday) totalIncomeToday += baseAmount;
                    totalIncomeToday += subToday;
                    if (isThisMonth) totalIncomeMonth += baseAmount;
                    totalIncomeMonth += subMonth;
                } else if (isExpense) {
                    totalExpenses += totalAmount;
                    if (isToday) totalExpensesToday += baseAmount;
                    totalExpensesToday += subToday;
                    if (isThisMonth) totalExpensesMonth += baseAmount;
                    totalExpensesMonth += subMonth;
                }
            } else if (t.status === 'Pending') {
                if (isIncome) pendingReceivables += totalAmount;
                if (isExpense) pendingPayments += totalAmount;
            }
        });

        const currentBalance = this.openingBalance + totalIncome - totalExpenses;

        return {
            currentBalance,
            totalIncome,
            totalExpenses,
            totalIncomeToday,
            totalExpensesToday,
            netCashFlowToday: totalIncomeToday - totalExpensesToday,
            totalIncomeMonth,
            totalExpensesMonth,
            netCashFlowMonth: totalIncomeMonth - totalExpensesMonth,
            totalTransactions: txList.length,
            pendingPayments,
            pendingReceivables
        };
    }

    _getTxnTotal(t) {
        if (!t) return 0;
        let total = parseFloat(t.amount) || 0;
        if (t.subEntries) {
            let entries = [];
            try {
                entries = typeof t.subEntries === 'string' ? JSON.parse(t.subEntries) : (Array.isArray(t.subEntries) ? t.subEntries : []);
            } catch { entries = []; }
            if (Array.isArray(entries)) {
                total += entries.reduce((s, se) => s + (parseFloat(se.amount) || 0), 0);
            }
        }
        return total;
    }

    // Returns transactions within the current active period (mirrors the chart engine logic)
    _getPeriodTransactions(all) {
        const period = window._currentFinancePeriod || '7d';
        const custom = window._currentFinanceCustomRange;
        if (period === 'custom' && custom && custom.startDate && custom.endDate) {
            return all.filter(t => {
                const d = (t.date || '').split('T')[0];
                return d >= custom.startDate && d <= custom.endDate;
            });
        }
        const days = period === '3m' ? 90 : period === '1m' ? 30 : 7;
        const cutoff = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
        return all.filter(t => (t.date || '').split('T')[0] >= cutoff);
    }

    // Computes P&L grouped by order for a given transaction set
    _calculatePnL(transactions, orders) {
        const orderMap = {};
        const txList = Array.isArray(transactions) ? transactions : [];
        for (const t of txList) {
            const oid = t.linkedOrderId;
            if (!oid || t.status === 'Cancelled') continue;
            if (!orderMap[oid]) orderMap[oid] = { income: 0, expense: 0, incTxns: [], expTxns: [] };
            const amt = this._getTxnTotal(t);
            if (t.type === 'Income') {
                orderMap[oid].income += amt;
                orderMap[oid].incTxns.push(t);
            } else {
                orderMap[oid].expense += amt;
                orderMap[oid].expTxns.push(t);
            }
        }
        return Object.entries(orderMap).map(([orderId, data]) => {
            const order = (Array.isArray(orders) ? orders : []).find(o => String(o.id) === String(orderId)) || {};
            const profit = data.income - data.expense;
            const margin = data.income > 0 ? (profit / data.income) * 100 : 0;
            return {
                orderId,
                orderLabel: order.id || orderId,
                customerName: order.customerName || order._customer?.name || '—',
                orderStatus: order.status || '',
                income: data.income,
                expense: data.expense,
                profit,
                margin,
                incTxns: data.incTxns,
                expTxns: data.expTxns
            };
        }).sort((a, b) => Math.abs(b.profit) - Math.abs(a.profit));
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
