import { BaseRepository } from './BaseRepository.js';

class ProductionRepository extends BaseRepository {
    constructor() {
        super('batches');
    }
}

export const productionRepository = new ProductionRepository();
