import { BaseStore } from './BaseStore.js';
import { productionRepository } from '../repositories/ProductionRepository.js';

class ProductionStore extends BaseStore {
    constructor() {
        super(productionRepository);
    }

    async loadBatches() {
        this.setState({ loading: true });
        try {
            const results = await productionRepository.getAll();
            this.setState({ entities: results, loading: false });
        } catch (err) {
            this.setState({ error: err, loading: false });
        }
    }
}

export const productionStore = new ProductionStore();
