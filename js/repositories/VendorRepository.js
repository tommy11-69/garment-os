import { BaseRepository } from './BaseRepository.js';
import { db } from '../data/database.js';

class VendorRepository extends BaseRepository {
    constructor() {
        super('vendors');
    }

    async searchVendors(query, filters = {}) {
        await db._delay();
        let collection = await this.getAll();
        
        // Filter first
        if (filters.status && filters.status !== 'All') {
            collection = collection.filter(v => v.status === filters.status);
        }
        if (filters.vendorType && filters.vendorType !== 'All') {
            collection = collection.filter(v => v.vendorType === filters.vendorType);
        }
        
        // Then search
        if (query) {
            const q = query.toLowerCase();
            collection = collection.filter(v => 
                v.name.toLowerCase().includes(q) || 
                (v.contactPerson && v.contactPerson.toLowerCase().includes(q)) ||
                (v.phone && v.phone.includes(q)) ||
                (v.email && v.email.toLowerCase().includes(q))
            );
        }
        
        // Enhance with statistics
        const allTransactions = await db.getCollection('transactions');
        
        return collection.map(v => this._enrichWithStats(v, allTransactions));
    }
    
    async getByIdWithStats(id) {
        const v = await this.getById(id);
        if (!v) return null;
        
        const allTransactions = await db.getCollection('transactions');
        return this._enrichWithStats(v, allTransactions);
    }
    
    _enrichWithStats(v, allTransactions) {
        const vTrans = allTransactions.filter(t => t.refId === v.id);
        const totalPurchases = vTrans.filter(t => t.type === 'Purchase').reduce((sum, t) => sum + (t.amount || 0), 0);
        // Payments sent to vendor
        const totalPaid = vTrans.filter(t => t.type === 'Payment' && t.isNegative).reduce((sum, t) => sum + (t.amount || 0), 0);
        const outstandingPayable = Math.max(0, totalPurchases - totalPaid);
        
        const sorted = [...vTrans].sort((a,b) => new Date(b.date) - new Date(a.date));
        const lastPurchaseDate = sorted.find(t => t.type === 'Purchase')?.date || null;
        
        return {
            ...v,
            totalPurchases,
            totalPaid,
            outstandingPayable,
            lastPurchaseDate,
            transactionCount: vTrans.length,
            recentTransactions: sorted.slice(0, 10)
        };
    }

    // Override create to add defaults
    async create(data) {
        const vendorData = {
            id: `v-${Date.now()}`,
            vendorType: data.vendorType || 'Other',
            status: 'Active',
            statusColor: 'bg-[#008A00]/10 text-[#008A00]',
            isActive: 1,
            ...data
        };
        return await super.create(vendorData);
    }
}

export const vendorRepository = new VendorRepository();
