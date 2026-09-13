import { BaseRepository } from './BaseRepository.js?v=5.2';
import { db } from '../data/database.js?v=5.2';

class DispatchRepository extends BaseRepository {
    constructor() {
        super('shipments');
    }

    async searchShipments(filter = 'All') {
        await db._delay();
        let collection = await this.getAll();
        
        if (filter !== 'All') {
            collection = collection.filter(s => s.status === filter);
        }
        
        return collection;
    }
}

export const dispatchRepository = new DispatchRepository();
