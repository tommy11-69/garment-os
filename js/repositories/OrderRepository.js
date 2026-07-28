import { BaseRepository } from './BaseRepository.js';
import { db } from '../data/database.js';

class OrderRepository extends BaseRepository {
    constructor() {
        super('orders');
    }

    async searchOrders(query, filters = {}) {
        await db._delay();
        let collection = await this.getAll();
        
        // Filter first
        if (filters.status) {
            if (filters.status === 'active') {
                collection = collection.filter(o => !['Completed', 'Delivered', 'Closed', 'Archived'].includes(o.status));
            } else if (filters.status === 'completed') {
                collection = collection.filter(o => ['Completed', 'Delivered', 'Closed'].includes(o.status));
            } else if (filters.status !== 'all') {
                collection = collection.filter(o => o.status === filters.status);
            }
        }
        
        // Then search
        if (query) {
            const q = query.toLowerCase();
            collection = collection.filter(o => 
                (o.id && o.id.toLowerCase().includes(q)) ||
                (o.customerName && o.customerName.toLowerCase().includes(q)) ||
                (o.product && o.product.toLowerCase().includes(q))
            );
        }
        
        // Enrich with relations (Relationship Engine)
        const customers = await db.getCollection('customers');
        return collection.map(order => this._enrich(order, customers));
    }
    
    async getByIdEnriched(id) {
        const order = await this.getById(id);
        if (!order) return null;
        const customers = await db.getCollection('customers');
        return this._enrich(order, customers);
    }
    
    _enrich(order, customers) {
        // Resolve customer relationship
        if (order.customerId) {
            const customer = customers.find(c => c.id === order.customerId);
            if (customer) {
                order.customerName = customer.name; // Keep in sync
                order._customer = customer; // Attach full object for UI
            }
        }
        return order;
    }

    // Additional specific methods
    async addTimelineEvent(id, event) {
        const order = await this.getById(id);
        if (!order) throw new Error('Order not found');
        
        if (!order.timeline) order.timeline = [];
        order.timeline.unshift({
            id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            date: new Date().toISOString(), // Simplified timestamp
            ...event
        });
        
        return await this.update(id, { timeline: order.timeline });
    }
}

export const orderRepository = new OrderRepository();
