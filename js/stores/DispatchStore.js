import { BaseStore } from './BaseStore.js';
import { dispatchRepository } from '../repositories/DispatchRepository.js';

class DispatchStore extends BaseStore {
    constructor() {
        super();
        this.currentFilter = 'All';
    }

    getState() {
        return {
            ...super.getState(),
            currentFilter: this.currentFilter
        };
    }

    async loadShipments() {
        this.setLoading(true);
        try {
            const results = await dispatchRepository.searchShipments(this.currentFilter);
            this.setEntities(results);
        } catch (err) {
            this.setError(err);
        }
    }

    setFilter(filter) {
        this.currentFilter = filter;
        this.loadShipments();
    }
}

export const dispatchStore = new DispatchStore();
