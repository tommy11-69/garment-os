import { BaseStore } from './BaseStore.js?v=5.2';
import { inventoryRepository } from '../repositories/InventoryRepository.js?v=5.2';

class InventoryStore extends BaseStore {
    constructor() {
        super(inventoryRepository);
        this.currentSearch = '';
        this.currentCategory = 'All';
        this.currentStatus = 'All';
        this.currentSort = 'newest';
        this.kpis = {
            totalValuation: 0,
            totalSKUs: 0,
            lowStockCount: 0,
            outOfStockCount: 0,
            inStockCount: 0
        };
    }

    getState() {
        return {
            ...super.getState(),
            currentSearch: this.currentSearch,
            currentCategory: this.currentCategory,
            currentStatus: this.currentStatus,
            currentSort: this.currentSort,
            kpis: this.kpis
        };
    }

    async loadInventory() {
        this.setState({ loading: true });
        try {
            const [results, kpis] = await Promise.all([
                inventoryRepository.searchInventory(
                    this.currentSearch,
                    this.currentCategory,
                    this.currentStatus,
                    this.currentSort
                ),
                inventoryRepository.getInventoryKPIs()
            ]);
            this.kpis = kpis;
            this.setState({ entities: results, kpis, loading: false });
        } catch (err) {
            this.setState({ error: err, loading: false });
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

    setStatus(status) {
        this.currentStatus = status;
        this.loadInventory();
    }

    setSort(sort) {
        this.currentSort = sort;
        this.loadInventory();
    }

    async fetchActiveEntity(id) {
        try {
            const entity = await inventoryRepository.getById(id);
            if (entity) {
                const normalized = inventoryRepository.normalizeItem(entity);
                this.updateEntity(id, normalized);
                this.setActiveEntity(id);
            }
        } catch (err) {
            console.error("Failed to fetch active inventory item", err);
        }
    }

    async createItem(data) {
        const normalized = inventoryRepository.normalizeItem(data);
        const newItem = await inventoryRepository.create(normalized);
        await this.loadInventory();
        return newItem;
    }

    async updateItem(id, data) {
        const updated = await inventoryRepository.update(id, data);
        await this.fetchActiveEntity(id);
        await this.loadInventory();
        return updated;
    }

    async deleteItem(id) {
        await inventoryRepository.delete(id);
        await this.loadInventory();
    }

    async recordStockIn(id, payload) {
        const updated = await inventoryRepository.recordStockIn(id, payload);
        await this.fetchActiveEntity(id);
        await this.loadInventory();
        return updated;
    }

    async recordStockOut(id, payload) {
        const updated = await inventoryRepository.recordStockOut(id, payload);
        await this.fetchActiveEntity(id);
        await this.loadInventory();
        return updated;
    }

    async adjustStock(id, payload) {
        const updated = await inventoryRepository.adjustStock(id, payload);
        await this.fetchActiveEntity(id);
        await this.loadInventory();
        return updated;
    }
}

export const inventoryStore = new InventoryStore();

