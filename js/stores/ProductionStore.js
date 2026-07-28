import { BaseStore } from './BaseStore.js';
import { productionRepository } from '../repositories/ProductionRepository.js';

class ProductionStore extends BaseStore {
    constructor() {
        super();
    }

    async loadBatches() {
        this.setLoading(true);
        try {
            const results = await productionRepository.getAll();
            this.setEntities(results);
        } catch (err) {
            this.setError(err);
        }
    }
}

export const productionStore = new ProductionStore();
