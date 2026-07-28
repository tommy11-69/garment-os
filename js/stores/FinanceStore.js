import { BaseStore } from './BaseStore.js';
import { financeRepository } from '../repositories/FinanceRepository.js';

class FinanceStore extends BaseStore {
    constructor() {
        super();
        this.currentSearch = '';
    }

    getState() {
        return {
            ...super.getState(),
            currentSearch: this.currentSearch
        };
    }

    async loadTransactions() {
        this.setLoading(true);
        try {
            const results = await financeRepository.searchTransactions(this.currentSearch);
            this.setEntities(results);
        } catch (err) {
            this.setError(err);
        }
    }

    setSearch(query) {
        this.currentSearch = query;
        this.loadTransactions();
    }

    async fetchActiveEntity(id) {
        try {
            const entity = await financeRepository.getById(id);
            if (entity) {
                this.updateEntity(id, entity);
                this.setActiveEntity(id);
            }
        } catch (err) {
            console.error("Failed to fetch active transaction", err);
        }
    }
}

export const financeStore = new FinanceStore();
