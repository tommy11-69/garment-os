import { BaseStore } from './BaseStore.js';
import { vendorRepository } from '../repositories/VendorRepository.js';

class VendorStore extends BaseStore {
    constructor() {
        super(vendorRepository);
        this.currentSearch = '';
        this.currentFilters = { status: 'All', vendorType: 'All' };
    }

    // Overrides
    getState() {
        return {
            ...super.getState(),
            currentSearch: this.currentSearch,
            currentFilters: this.currentFilters
        };
    }

    async loadVendors() {
        this.setState({ loading: true });
        try {
            const results = await vendorRepository.searchVendors(this.currentSearch, this.currentFilters);
            this.setState({ entities: results, loading: false });
        } catch (err) {
            this.setState({ error: err, loading: false });
        }
    }

    setSearch(query) {
        this.currentSearch = query;
        this.loadVendors();
    }

    setFilter(key, value) {
        this.currentFilters[key] = value;
        this.loadVendors();
    }

    async fetchActiveEntity(id) {
        try {
            const entity = await vendorRepository.getByIdWithStats(id);
            if (entity) {
                this.updateEntity(id, entity); // Update local cache
                this.setActiveEntity(id);
            }
        } catch (err) {
            console.error("Failed to fetch active vendor", err);
        }
    }

    async createVendor(data) {
        const newVendor = await vendorRepository.create(data);
        await this.loadVendors(); // Reload to get stats & sort
        return newVendor;
    }

    async updateVendor(id, data) {
        const updated = await vendorRepository.update(id, data);
        await this.fetchActiveEntity(id); // Reload to recalculate stats
        await this.loadVendors(); // Reload list
        return updated;
    }

    async archiveVendor(id) {
        await vendorRepository.archive(id);
        await this.loadVendors();
        if (this.activeEntity && this.activeEntity.id === id) {
            await this.fetchActiveEntity(id);
        }
    }

    async restoreVendor(id) {
        await vendorRepository.restore(id);
        await this.loadVendors();
        if (this.activeEntity && this.activeEntity.id === id) {
            await this.fetchActiveEntity(id);
        }
    }

    async deleteVendor(id) {
        await vendorRepository.delete(id);
        this.removeEntity(id);
    }
    
    async bulkArchive() {
        if (!this.selectedIds.size) return;
        const ids = Array.from(this.selectedIds);
        for (const id of ids) {
            await vendorRepository.archive(id);
        }
        this.clearSelection();
        await this.loadVendors();
    }

    async bulkDelete() {
        if (!this.selectedIds.size) return;
        const ids = Array.from(this.selectedIds);
        for (const id of ids) {
            await vendorRepository.delete(id);
        }
        this.clearSelection();
        await this.loadVendors();
    }
}

export const vendorStore = new VendorStore();
