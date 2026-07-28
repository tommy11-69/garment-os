import { BaseRepository } from './BaseRepository.js';
import { db } from '../data/database.js';

class CustomerRepository extends BaseRepository {
    constructor() {
        super('customers');
    }

    // Advanced search implementation for Customers
    async searchCustomers(query, filters = {}) {
        await db._delay();
        let collection = await this.getAll();
        
        // Filter first
        if (filters.status && filters.status !== 'All') {
            collection = collection.filter(c => c.status === filters.status);
        }
        if (filters.customerType && filters.customerType !== 'All') {
            collection = collection.filter(c => c.customerType === filters.customerType);
        }
        
        // Then search
        if (query) {
            const q = query.toLowerCase();
            collection = collection.filter(c => 
                c.name.toLowerCase().includes(q) || 
                (c.company && c.company.toLowerCase().includes(q)) ||
                (c.customerCode && c.customerCode.toLowerCase().includes(q)) ||
                (c.phone && c.phone.includes(q)) ||
                (c.email && c.email.toLowerCase().includes(q))
            );
        }
        
        // Enhance with statistics (relationship engine logic)
        const allOrders = await db.getCollection('orders');
        
        return collection.map(c => this._enrichWithStats(c, allOrders));
    }
    
    async getByIdWithStats(id) {
        const c = await this.getById(id);
        if (!c) return null;
        
        const allOrders = await db.getCollection('orders');
        return this._enrichWithStats(c, allOrders);
    }
    
    _enrichWithStats(c, allOrders) {
        const cOrders = allOrders.filter(o => o.customerId === c.id);
        const totalOrders = cOrders.length;
        const completedOrders = cOrders.filter(o => o.status === 'Completed' || o.status === 'Delivered').length;
        const totalRevenue = cOrders.reduce((sum, o) => sum + (o.value || o.grandTotal || 0), 0);
        const outstanding = cOrders.filter(o => ['Pending', 'Processing', 'Draft'].includes(o.status)).reduce((sum, o) => sum + (o.value || o.grandTotal || 0), 0);
        const averageOrderValue = totalOrders > 0 ? (totalRevenue / totalOrders) : 0;
        
        const sorted = [...cOrders].sort((a,b) => new Date(b.date || b.deliveryDate) - new Date(a.date || a.deliveryDate));
        const lastOrderDate = sorted.length > 0 ? (sorted[0].date || sorted[0].deliveryDate) : null;
        
        return {
            ...c,
            totalOrders,
            completedOrders,
            totalRevenue,
            outstanding,
            averageOrderValue,
            lastOrderDate,
            activeOrders: totalOrders - completedOrders
        };
    }
}

export const customerRepository = new CustomerRepository();
