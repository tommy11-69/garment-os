import { BaseRepository } from './BaseRepository.js?v=5.2';

class ProductionRepository extends BaseRepository {
    constructor() {
        super('batches');
    }
}

export const productionRepository = new ProductionRepository();
