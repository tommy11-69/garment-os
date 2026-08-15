import { 
    customers, orders, inventory, activeBatches, transactions, costings
} from './mockData.js';

class Database {
    constructor() {
        this.collections = {
            customers: [...customers],
            orders: [...orders],
            inventory: [...inventory],
            batches: [...activeBatches],
            transactions: [...transactions],
            costings: [...costings],
            shipments: [
                {
                    id: 'SHP-001',
                    customerName: 'Chennai Silks',
                    invoiceNo: 'INV-2026-140',
                    status: 'In Transit',
                    courier: 'FedEx Express',
                    trackingNo: 'FX-99827361',
                    expectedDate: 'Oct 28, 2026'
                },
                {
                    id: 'SHP-002',
                    customerName: 'Arvind Fashions',
                    invoiceNo: 'INV-2026-141',
                    status: 'Ready',
                    courier: 'DHL Freight',
                    boxes: 12
                }
            ]
        };
    }

    /** Simulates network latency */
    _delay(ms = 300) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // --- Core CRUD ---
    
    async getCollection(collectionName, options = {}) {
        await this._delay();
        if (!this.collections[collectionName]) throw new Error(`Collection ${collectionName} not found.`);
        
        let data = [...this.collections[collectionName]];
        const total = data.length;
        
        if (options.limit) {
            const page = options.page || 1;
            const start = (page - 1) * options.limit;
            const end = start + options.limit;
            data = data.slice(start, end);
            return {
                data,
                total,
                page,
                totalPages: Math.ceil(total / options.limit)
            };
        }
        
        return data;
    }

    async getById(collectionName, id) {
        await this._delay();
        const collection = this.collections[collectionName];
        if (!collection) throw new Error(`Collection ${collectionName} not found.`);
        
        const item = collection.find(i => i.id === id);
        return item ? { ...item } : null;
    }

    async insert(collectionName, data) {
        await this._delay();
        const collection = this.collections[collectionName];
        if (!collection) throw new Error(`Collection ${collectionName} not found.`);
        
        const newItem = {
            id: data.id || `${collectionName.charAt(0)}-${Date.now()}`,
            ...data,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        collection.unshift(newItem);
        return { ...newItem };
    }

    async update(collectionName, id, data) {
        await this._delay();
        const collection = this.collections[collectionName];
        if (!collection) throw new Error(`Collection ${collectionName} not found.`);
        
        const index = collection.findIndex(i => i.id === id);
        if (index === -1) throw new Error(`Entity with ID ${id} not found in ${collectionName}.`);
        
        collection[index] = {
            ...collection[index],
            ...data,
            updatedAt: new Date().toISOString()
        };
        
        return { ...collection[index] };
    }

    async delete(collectionName, id) {
        await this._delay();
        const collection = this.collections[collectionName];
        if (!collection) throw new Error(`Collection ${collectionName} not found.`);
        
        const index = collection.findIndex(i => i.id === id);
        if (index === -1) throw new Error(`Entity with ID ${id} not found in ${collectionName}.`);
        
        collection.splice(index, 1);
        return true;
    }

    async search(collectionName, query, fields, options = {}) {
        await this._delay();
        const collection = this.collections[collectionName];
        if (!collection) throw new Error(`Collection ${collectionName} not found.`);
        
        const q = query.toLowerCase();
        
        let data = collection.filter(item => {
            return fields.some(field => {
                const val = item[field];
                if (val && typeof val === 'string') {
                    return val.toLowerCase().includes(q);
                }
                return false;
            });
        });
        
        const total = data.length;
        
        if (options.limit) {
            const page = options.page || 1;
            const start = (page - 1) * options.limit;
            const end = start + options.limit;
            data = data.slice(start, end);
            return {
                data,
                total,
                page,
                totalPages: Math.ceil(total / options.limit)
            };
        }
        
        return data;
    }
}

export const db = new Database();
