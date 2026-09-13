import { BaseRepository } from './BaseRepository.js';
import { db } from '../data/database.js';

class VendorRepository extends BaseRepository {
    constructor() {
        super('vendors');
    }

    async searchVendors(query, filters = {}) {
        await db._delay();
        let collection = await this.getAll();
        
        // Status filter
        if (filters.status && filters.status !== 'All') {
            collection = collection.filter(v => v.status === filters.status);
        }
        // Vendor type filter
        if (filters.vendorType && filters.vendorType !== 'All') {
            collection = collection.filter(v => v.vendorType === filters.vendorType);
        }
        
        // Search
        if (query) {
            const q = query.toLowerCase();
            collection = collection.filter(v => 
                (v.name && v.name.toLowerCase().includes(q)) || 
                (v.company && v.company.toLowerCase().includes(q)) ||
                (v.contactPerson && v.contactPerson.toLowerCase().includes(q)) ||
                (v.phone && v.phone.includes(q)) ||
                (v.email && v.email.toLowerCase().includes(q)) ||
                (v.vendorCode && v.vendorCode.toLowerCase().includes(q))
            );
        }
        
        // Enrich with stats (transactions + orders)
        const [allTransactions, allOrders] = await Promise.all([
            db.getCollection('transactions'),
            db.getCollection('orders'),
        ]);
        
        return collection.map(v => this._enrichWithStats(v, allTransactions, allOrders));
    }
    
    async getByIdWithStats(id) {
        const v = await this.getById(id);
        if (!v) return null;
        
        const [allTransactions, allOrders] = await Promise.all([
            db.getCollection('transactions'),
            db.getCollection('orders'),
        ]);
        return this._enrichWithStats(v, allTransactions, allOrders);
    }
    
    _enrichWithStats(v, allTransactions, allOrders = []) {
        // All finance transactions linked to this vendor
        const vTrans = allTransactions.filter(t => t.refId === v.id);
        
        // Total expenses billed by this vendor (Expense type transactions)
        const totalExpenses = vTrans
            .filter(t => t.type === 'Expense' && t.status === 'Completed')
            .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
        
        // Pending expenses (not yet paid, but billed)
        const pendingExpenses = vTrans
            .filter(t => t.type === 'Expense' && t.status === 'Pending')
            .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

        // Total payments we have made to this vendor
        const totalPaid = vTrans
            .filter(t => t.type === 'Expense' && t.status === 'Completed')
            .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

        // For "how much you owe" = Pending expenses (expense transactions that are Pending)
        // This is the most natural definition: billed but not yet paid
        const outstandingPayable = pendingExpenses;

        // Total lifetime purchases = all expense transactions (completed + pending)
        const totalPurchases = totalExpenses + pendingExpenses;
        
        const sortedTrans = [...vTrans].sort((a, b) => new Date(b.date) - new Date(a.date));
        const lastTransactionDate = sortedTrans.length > 0 ? sortedTrans[0].date : null;
        
        // Related orders — orders where factory field contains this vendor's name or id
        const relatedOrders = allOrders.filter(o => 
            o.vendorId === v.id || 
            (o.factory && v.name && o.factory.toLowerCase().includes(v.name.toLowerCase().split(' ')[0]))
        ).sort((a, b) => new Date(b.deliveryDate || 0) - new Date(a.deliveryDate || 0)).slice(0, 5);
        
        return {
            ...v,
            totalPurchases,
            totalPaid: totalExpenses, // money we've actually paid (completed)
            outstandingPayable,       // pending billed amounts we owe
            lastTransactionDate,
            transactionCount: vTrans.length,
            recentTransactions: sortedTrans.slice(0, 15),
            relatedOrders,
        };
    }

    // Override create to add vendor-specific defaults
    async create(data) {
        const count = (await this.getAll()).length + 1;
        const vendorCode = data.vendorCode || `VEND-${String(count).padStart(3, '0')}`;
        const initials = data.name 
            ? data.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
            : 'VN';

        const vendorData = {
            id: `v-${Date.now()}`,
            vendorCode,
            initials,
            vendorType: data.vendorType || 'Other',
            status: 'Active',
            statusColor: 'bg-[#008A00]/10 text-[#008A00]',
            isActive: 1,
            createdAt: new Date().toISOString(),
            ...data,
        };
        return await super.create(vendorData);
    }

    async archive(id) {
        return await this.update(id, { status: 'Inactive', statusColor: 'bg-surface-variant text-secondary', isActive: 0 });
    }

    async restore(id) {
        return await this.update(id, { status: 'Active', statusColor: 'bg-[#008A00]/10 text-[#008A00]', isActive: 1 });
    }
}

export const vendorRepository = new VendorRepository();
