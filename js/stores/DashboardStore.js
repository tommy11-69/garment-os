import { BaseStore } from './BaseStore.js';
import { orderRepository } from '../repositories/OrderRepository.js';
import { productionRepository } from '../repositories/ProductionRepository.js';
import { customerRepository } from '../repositories/CustomerRepository.js';
import { financeRepository } from '../repositories/FinanceRepository.js';
import { calculatorRepository } from '../repositories/CalculatorRepository.js';

class DashboardStore extends BaseStore {
    constructor() {
        super(null);
        this.state.dashboardData = {
            kpis: {
                revenue: 0,
                profit: 0,
                activeOrders: 0,
                activeClients: 0
            },
            orders: [],
            batches: [],
            customers: [],
            transactions: [],
            costings: []
        };
    }

    getState() {
        return {
            ...super.getState(),
        };
    }

    async loadDashboardData() {
        this.setState({ loading: true });
        try {
            const [orders, batches, customers, transactions, costings] = await Promise.all([
                orderRepository.getAll(),
                productionRepository.getAll(),
                customerRepository.getAll(),
                financeRepository.getAll(),
                calculatorRepository.getAll()
            ]);
            
            // Calculate Revenue and Profit for the current month
            const today = new Date();
            let revenue = 0;
            let expenses = 0;
            
            transactions.forEach(t => {
                const tDate = new Date(t.date);
                if (tDate.getMonth() === today.getMonth() && tDate.getFullYear() === today.getFullYear()) {
                    if (t.status === 'Completed') {
                        if (t.type === 'Income') revenue += parseFloat(t.amount || 0);
                        else if (t.type === 'Expense') expenses += parseFloat(t.amount || 0);
                    }
                }
            });
            const profit = revenue - expenses;
            
            // Active Orders
            const activeOrders = orders.filter(o => !['Completed', 'Delivered', 'Closed', 'Archived'].includes(o.status)).length;
            
            // Active Clients
            const activeClients = customers.filter(c => c.status === 'Active').length;
            
            // Sort recent transactions (newest first)
            const sortedTxns = [...transactions].sort((a,b) => new Date(b.date) - new Date(a.date));
            const sortedOrders = [...orders].sort((a,b) => new Date(b.date || 0) - new Date(a.date || 0));
            const sortedCostings = [...costings].sort((a,b) => new Date(b.date || 0) - new Date(a.date || 0));
            
            const dashboardData = { 
                kpis: { revenue, profit, activeOrders, activeClients },
                orders: sortedOrders.slice(0, 3), 
                batches: batches.slice(0, 3),
                customers: customers.slice(0, 3),
                transactions: sortedTxns.slice(0, 3),
                costings: sortedCostings.slice(0, 3)
            };
            
            this.setState({ dashboardData, loading: false });
        } catch (err) {
            console.error("Dashboard Load Error:", err);
            this.setState({ error: err, loading: false });
        }
    }
}

export const dashboardStore = new DashboardStore();
