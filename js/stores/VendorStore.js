import { BaseStore } from './BaseStore.js';
import { vendorRepository } from '../repositories/VendorRepository.js';

class VendorStore extends BaseStore {
    constructor() {
        super(vendorRepository);
        this.currentSearch = '';
        this.currentFilters = { status: 'Active', vendorType: 'All' };
    }

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
                this.updateEntity(id, entity);
                this.setActiveEntity(id);
            }
        } catch (err) {
            console.error('Failed to fetch active vendor', err);
        }
    }

    async createVendor(data) {
        const newVendor = await vendorRepository.create(data);
        await this.loadVendors();
        return newVendor;
    }

    async updateVendor(id, data) {
        const updated = await vendorRepository.update(id, data);
        await this.fetchActiveEntity(id);
        await this.loadVendors();
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

    async duplicateVendor(id) {
        const vendor = await vendorRepository.getById(id);
        if (!vendor) throw new Error('Vendor not found');
        
        const dup = { ...vendor };
        delete dup.id;
        delete dup.createdAt;
        delete dup.updatedAt;
        dup.name = `${vendor.name} (Copy)`;
        dup.status = 'Active';
        dup.statusColor = 'bg-[#008A00]/10 text-[#008A00]';
        
        const duplicate = await vendorRepository.create(dup);
        await this.loadVendors();
        return duplicate;
    }

    async bulkArchive() {
        if (!this.selectedIds.size) return;
        for (const id of this.selectedIds) {
            await vendorRepository.archive(id);
        }
        this.clearSelection();
        await this.loadVendors();
    }

    async bulkDelete() {
        if (!this.selectedIds.size) return;
        for (const id of this.selectedIds) {
            await vendorRepository.delete(id);
        }
        this.clearSelection();
        await this.loadVendors();
    }
}

export const vendorStore = new VendorStore();
