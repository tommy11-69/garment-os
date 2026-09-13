import { BaseStore } from './BaseStore.js?v=5.2';
import { dispatchRepository } from '../repositories/DispatchRepository.js?v=5.2';

class DispatchStore extends BaseStore {
    constructor() {
        super(dispatchRepository);
        this.currentFilter = 'All';
    }

    getState() {
        return {
            ...super.getState(),
            currentFilter: this.currentFilter
        };
    }

    async loadShipments() {
        this.setState({ loading: true });
        try {
            const results = await dispatchRepository.searchShipments(this.currentFilter);
            this.setState({ entities: results, loading: false });
        } catch (err) {
            this.setState({ error: err, loading: false });
        }
    }

    setFilter(filter) {
        this.currentFilter = filter;
        this.loadShipments();
    }
}

export const dispatchStore = new DispatchStore();
