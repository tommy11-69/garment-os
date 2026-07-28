import { BaseStore } from './BaseStore.js';
import { orderRepository } from '../repositories/OrderRepository.js';
import { productionRepository } from '../repositories/ProductionRepository.js';

class DashboardStore extends BaseStore {
    constructor() {
        super();
        this.dashboardData = {
            orders: [],
            batches: []
        };
    }

    getState() {
        return {
            ...super.getState(),
            dashboardData: this.dashboardData
        };
    }

    async loadDashboardData() {
        this.setLoading(true);
        try {
            const [orders, batches] = await Promise.all([
                orderRepository.getAll(),
                productionRepository.getAll()
            ]);
            
            // Just take recent 3 orders
            this.dashboardData.orders = orders.slice(0, 3);
            this.dashboardData.batches = batches;
            
            this.setLoading(false);
            this.notify();
        } catch (err) {
            this.setError(err);
        }
    }
}

export const dashboardStore = new DashboardStore();
