import { BaseStore } from './BaseStore.js';
import { inventoryRepository } from '../repositories/InventoryRepository.js';

class InventoryStore extends BaseStore {
    constructor() {
        super();
        this.currentSearch = '';
        this.currentCategory = 'All';
    }

    getState() {
        return {
            ...super.getState(),
            currentSearch: this.currentSearch,
            currentCategory: this.currentCategory
        };
    }

    async loadInventory() {
        this.setLoading(true);
        try {
            const results = await inventoryRepository.searchInventory(this.currentSearch, this.currentCategory);
            this.setEntities(results);
        } catch (err) {
            this.setError(err);
        }
    }

    setSearch(query) {
        this.currentSearch = query;
        this.loadInventory();
    }

    setCategory(category) {
        this.currentCategory = category;
        this.loadInventory();
    }

    async fetchActiveEntity(id) {
        try {
            const entity = await inventoryRepository.getById(id);
            if (entity) {
                this.updateEntity(id, entity);
                this.setActiveEntity(id);
            }
        } catch (err) {
            console.error("Failed to fetch active inventory item", err);
        }
    }
}

export const inventoryStore = new InventoryStore();
