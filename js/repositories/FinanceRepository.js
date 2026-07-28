import { BaseRepository } from './BaseRepository.js';
import { db } from '../data/database.js';

class FinanceRepository extends BaseRepository {
    constructor() {
        super('transactions');
    }

    async searchTransactions(query) {
        await db._delay();
        let collection = await this.getAll();
        
        if (query) {
            const q = query.toLowerCase();
            collection = collection.filter(t => 
                (t.party && t.party.toLowerCase().includes(q)) ||
                (t.id && t.id.toLowerCase().includes(q)) ||
                (t.type && t.type.toLowerCase().includes(q))
            );
        }
        
        return collection;
    }
}

export const financeRepository = new FinanceRepository();
