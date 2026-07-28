import { BaseRepository } from './BaseRepository.js';
import { db } from '../data/database.js';

class InventoryRepository extends BaseRepository {
    constructor() {
        super('inventory');
    }

    async searchInventory(query, categoryFilter = 'All') {
        await db._delay();
        let collection = await this.getAll();
        
        if (categoryFilter !== 'All') {
            collection = collection.filter(i => i.category === categoryFilter);
        }
        
        if (query) {
            const q = query.toLowerCase();
            collection = collection.filter(i => 
                (i.name && i.name.toLowerCase().includes(q)) ||
                (i.sku && i.sku.toLowerCase().includes(q)) ||
                (i.location && i.location.toLowerCase().includes(q))
            );
        }
        
        return collection;
    }
}

export const inventoryRepository = new InventoryRepository();
