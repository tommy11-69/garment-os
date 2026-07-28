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
            costings: [...costings]
        };
    }

    /** Simulates network latency */
    _delay(ms = 300) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // --- Core CRUD ---
    
    async getCollection(collectionName) {
        await this._delay();
        if (!this.collections[collectionName]) throw new Error(`Collection ${collectionName} not found.`);
        return [...this.collections[collectionName]];
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
            id: `${collectionName.charAt(0)}-${Date.now()}`,
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

    async search(collectionName, query, fields) {
        const collection = await this.getCollection(collectionName);
        const q = query.toLowerCase();
        
        return collection.filter(item => {
            return fields.some(field => {
                const val = item[field];
                if (val && typeof val === 'string') {
                    return val.toLowerCase().includes(q);
                }
                return false;
            });
        });
    }
}

export const db = new Database();
