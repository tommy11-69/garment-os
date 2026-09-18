import { BaseStore } from './BaseStore.js?v=5.2';
import { orderRepository } from '../repositories/OrderRepository.js?v=5.2';

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

    async generateNextOrderId() {
        const year = new Date().getFullYear();
        const prefix = `ORD-${year}-`;
        let maxSeq = 0;
        try {
            const orders = await orderRepository.getAll();
            if (Array.isArray(orders)) {
                for (const o of orders) {
                    const id = o.id || '';
                    if (id.startsWith(prefix)) {
                        const seqStr = id.slice(prefix.length);
                        const seqNum = parseInt(seqStr, 10);
                        if (!isNaN(seqNum) && seqNum > maxSeq) {
                            maxSeq = seqNum;
                        }
                    }
                }
            }
        } catch (e) {
            console.error('Failed to calculate max order sequence:', e);
        }
        const nextSeq = maxSeq + 1;
        return `${prefix}${String(nextSeq).padStart(4, '0')}`;
    }

    async create(data) {
        // Ensure JSON fields are serialised for storage
        const payload = { ...data };
        if (!payload.id) {
            payload.id = await this.generateNextOrderId();
        }
        if (payload.stageData && typeof payload.stageData === 'object') {
            payload.stageData = JSON.stringify(payload.stageData);
        }
        if (payload.phases && Array.isArray(payload.phases)) {
            payload.phases = JSON.stringify(payload.phases);
        }
        const newOrder = await orderRepository.create(payload);
        await this.loadOrders();
        return newOrder;
    }

    async createOrder(data) {
        return this.create(data);
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
