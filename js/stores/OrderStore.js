import { BaseStore } from './BaseStore.js';
import { orderRepository } from '../repositories/OrderRepository.js';

class OrderStore extends BaseStore {
    constructor() {
        super();
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
        this.setLoading(true);
        try {
            const results = await orderRepository.searchOrders(this.currentSearch, this.currentFilters);
            this.setEntities(results);
        } catch (err) {
            this.setError(err);
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
}

export const orderStore = new OrderStore();
