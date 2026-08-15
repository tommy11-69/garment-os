import { BaseStore } from './BaseStore.js';
import { orderRepository } from '../repositories/OrderRepository.js';

class OrderStore extends BaseStore {
    constructor() {
        super(orderRepository);
        this.currentSearch = '';
        this.currentFilters = { status: 'all' };
    }

    getState() {
        return {
            ...super.getState(),
            currentSearch: this.currentSearch,
            currentFilters: this.currentFilters
        };
    }

    async loadOrders() {
        this.setState({ loading: true });
        try {
            const results = await orderRepository.searchOrders(this.currentSearch, this.currentFilters);
            this.setState({ entities: results, loading: false });
        } catch (err) {
            this.setState({ error: err, loading: false });
        }
    }

    setSearch(query) {
        this.currentSearch = query;
        this.loadOrders();
    }

    setFilter(key, value) {
        this.currentFilters[key] = value;
        this.loadOrders();
    }

    async fetchActiveEntity(id) {
        try {
            const entity = await orderRepository.getByIdEnriched(id);
            if (entity) {
                this.updateEntity(id, entity);
                this.setActiveEntity(id);
            }
        } catch (err) {
            console.error("Failed to fetch active order", err);
        }
    }

    async createOrder(data) {
        const newOrder = await orderRepository.create(data);
        await this.loadOrders();
        return newOrder;
    }

    async updateOrder(id, data) {
        const updated = await orderRepository.update(id, data);
        await this.fetchActiveEntity(id);
        await this.loadOrders();
        return updated;
    }
    
    async addTimelineEvent(id, event) {
        await orderRepository.addTimelineEvent(id, event);
        await this.fetchActiveEntity(id);
    }

    async toggleTask(orderId, taskId) {
        const order = await orderRepository.getByIdEnriched(orderId);
        if (!order || !order.tasks) return;
        
        const task = order.tasks.find(t => t.id === taskId);
        if (!task) return;
        
        task.status = task.status === 'Completed' ? 'Pending' : 'Completed';
        
        // Calculate progress
        const total = order.tasks.length;
        const completed = order.tasks.filter(t => t.status === 'Completed').length;
        const progress = total === 0 ? 0 : Math.round((completed / total) * 100);
        
        await this.updateOrder(orderId, { tasks: order.tasks, progress });
    }
}

export const orderStore = new OrderStore();
