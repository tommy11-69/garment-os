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
                (c.name && c.name.toLowerCase().includes(q)) || 
                (c.company && c.company.toLowerCase().includes(q)) ||
                (c.customerCode && c.customerCode.toLowerCase().includes(q)) ||
                (c.phone && c.phone.includes(q)) ||
                (c.mobile && c.mobile.includes(q)) ||
                (c.email && c.email.toLowerCase().includes(q))
            );
        }
        
        // Enhance with statistics (relationship engine logic: orders + transactions)
        const [allTransactions, allOrders] = await Promise.all([
            db.getCollection('transactions'),
            db.getCollection('orders')
        ]);
        
        return collection.map(c => this._enrichWithStats(c, allTransactions, allOrders));
    }
    
    async getByIdWithStats(id) {
        const c = await this.getById(id);
        if (!c) return null;
        
        const [allTransactions, allOrders] = await Promise.all([
            db.getCollection('transactions'),
            db.getCollection('orders')
        ]);
        return this._enrichWithStats(c, allTransactions, allOrders);
    }
    
    _enrichWithStats(c, allTransactions = [], allOrders = []) {
        // Finance transactions linked to this customer
        const cTrans = allTransactions.filter(t => t.refId === c.id);
        const totalReceived = cTrans
            .filter(t => t.type === 'Income' && t.status === 'Completed')
            .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
        const pendingIncome = cTrans
            .filter(t => t.type === 'Income' && t.status === 'Pending')
            .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

        // Orders linked to this customer
        const cOrders = allOrders.filter(o => o.customerId === c.id);
        const totalOrders = cOrders.length;
        const completedOrders = cOrders.filter(o => 
            ['Completed', 'Delivered', 'Dispatched', 'Closed', 'Archived'].includes(o.status)
        ).length;
        const totalRevenue = cOrders.reduce((sum, o) => sum + parseFloat(o.value || o.grandTotal || 0), 0);
        
        // Outstanding: If customer has finance transactions, true outstanding is total revenue - total received.
        // Otherwise, fall back to sum of pending/active/unpaid orders.
        let totalOutstanding = 0;
        if (cTrans.length > 0) {
            totalOutstanding = Math.max(0, totalRevenue - totalReceived);
        } else {
            totalOutstanding = cOrders
                .filter(o => ['Pending', 'Processing', 'Draft'].includes(o.status) || o.paymentStatus === 'Unpaid' || o.paymentStatus === 'Partial')
                .reduce((sum, o) => sum + parseFloat(o.value || o.grandTotal || 0), 0);
        }

        const averageOrderValue = totalOrders > 0 ? (totalRevenue / totalOrders) : 0;
        const creditLimit = parseFloat(c.creditLimit || 0);
        const creditUtilization = creditLimit > 0 ? Math.min(100, Math.round((totalOutstanding / creditLimit) * 100)) : 0;
        
        // Sort orders newest first
        const sortedOrders = [...cOrders].sort((a, b) => new Date(b.date || b.deliveryDate || 0) - new Date(a.date || a.deliveryDate || 0));
        const lastOrderDate = sortedOrders.length > 0 ? (sortedOrders[0].date || sortedOrders[0].deliveryDate) : null;
        
        // Enrich recent orders with countdown & payment dot
        const today = new Date();
        const recentOrders = sortedOrders.slice(0, 5).map(o => {
            const deliveryDate = o.deliveryDate ? new Date(o.deliveryDate) : null;
            const daysLeft = deliveryDate ? Math.ceil((deliveryDate - today) / (1000 * 60 * 60 * 24)) : null;
            return {
                ...o,
                daysLeft,
                paymentStatus: o.paymentStatus || 'Unpaid'
            };
        });

        // Sort transactions newest first
        const sortedTrans = [...cTrans].sort((a, b) => new Date(b.date) - new Date(a.date));
        const lastTransactionDate = sortedTrans.length > 0 ? sortedTrans[0].date : null;
        
        return {
            ...c,
            phone: c.phone || c.mobile || '',
            mobile: c.mobile || c.phone || '',
            totalOrders,
            completedOrders,
            activeOrders: totalOrders - completedOrders,
            totalRevenue,
            totalReceived,
            pendingIncome,
            outstanding: totalOutstanding,
            totalOutstanding,
            creditLimit,
            creditUtilization,
            averageOrderValue,
            lastOrderDate,
            lastTransactionDate,
            transactionCount: cTrans.length,
            recentTransactions: sortedTrans.slice(0, 10),
            recentOrders
        };
    }

    // Override create to add customer-specific defaults
    async create(data) {
        const count = (await this.getAll()).length + 1;
        const customerCode = data.customerCode || `CUST-${String(count).padStart(3, '0')}`;
        const initials = data.name 
            ? data.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
            : 'CU';

        const customerData = {
            id: `c-${Date.now()}`,
            customerCode,
            initials,
            customerType: data.customerType || 'Brand',
            status: 'Active',
            statusColor: 'bg-[#008A00]/10 text-[#008A00]',
            isActive: 1,
            createdAt: new Date().toISOString(),
            phone: data.phone || data.mobile || '',
            mobile: data.mobile || data.phone || '',
            ...data,
        };
        return await super.create(customerData);
    }

    async archive(id) {
        return await this.update(id, { status: 'Inactive', statusColor: 'bg-surface-variant text-secondary', isActive: 0 });
    }

    async restore(id) {
        return await this.update(id, { status: 'Active', statusColor: 'bg-[#008A00]/10 text-[#008A00]', isActive: 1 });
    }
}

export const customerRepository = new CustomerRepository();
