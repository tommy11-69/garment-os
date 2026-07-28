import { BaseStore } from './BaseStore.js';
import { customerRepository } from '../repositories/CustomerRepository.js';

class CustomerStore extends BaseStore {
    constructor() {
        super();
        this.currentSearch = '';
        this.currentFilters = { status: 'All', customerType: 'All' };
    }

    // Overrides
    getState() {
        return {
            ...super.getState(),
            currentSearch: this.currentSearch,
            currentFilters: this.currentFilters
        };
    }

    async loadCustomers() {
        this.setLoading(true);
        try {
            const results = await customerRepository.searchCustomers(this.currentSearch, this.currentFilters);
            this.setEntities(results);
        } catch (err) {
            this.setError(err);
        }
    }

    setSearch(query) {
        this.currentSearch = query;
        this.loadCustomers();
    }

    setFilter(key, value) {
        this.currentFilters[key] = value;
        this.loadCustomers();
    }

    async fetchActiveEntity(id) {
        try {
            const entity = await customerRepository.getByIdWithStats(id);
            if (entity) {
                this.updateEntity(id, entity); // Update local cache
                this.setActiveEntity(id);
            }
        } catch (err) {
            console.error("Failed to fetch active customer", err);
        }
    }

    async createCustomer(data) {
        const newCust = await customerRepository.create(data);
        await this.loadCustomers(); // Reload to get stats & sort
        return newCust;
    }

    async updateCustomer(id, data) {
        const updated = await customerRepository.update(id, data);
        await this.fetchActiveEntity(id); // Reload to recalculate stats
        await this.loadCustomers(); // Reload list
        return updated;
    }

    async archiveCustomer(id) {
        await customerRepository.archive(id);
        await this.loadCustomers();
        if (this.activeEntity && this.activeEntity.id === id) {
            await this.fetchActiveEntity(id);
        }
    }

    async restoreCustomer(id) {
        await customerRepository.restore(id);
        await this.loadCustomers();
        if (this.activeEntity && this.activeEntity.id === id) {
            await this.fetchActiveEntity(id);
        }
    }

    async deleteCustomer(id) {
        await customerRepository.delete(id);
        this.removeEntity(id);
    }
    
    async duplicateCustomer(id) {
        const customer = await customerRepository.getById(id);
        if (!customer) throw new Error('Customer not found');
        
        const duplicateData = { ...customer };
        delete duplicateData.id;
        delete duplicateData.createdAt;
        delete duplicateData.updatedAt;
        duplicateData.name = `${customer.name} (Copy)`;
        duplicateData.customerCode = `CUST-${Math.floor(1000 + Math.random() * 9000)}`;
        duplicateData.status = 'Active';
        duplicateData.statusColor = 'bg-success-container/30 text-success';
        
        const duplicate = await customerRepository.create(duplicateData);
        await this.loadCustomers();
        return duplicate;
    }

    async bulkArchive() {
        if (!this.selectedIds.size) return;
        const ids = Array.from(this.selectedIds);
        for (const id of ids) {
            await customerRepository.archive(id);
        }
        this.clearSelection();
        await this.loadCustomers();
    }

    async bulkDelete() {
        if (!this.selectedIds.size) return;
        const ids = Array.from(this.selectedIds);
        for (const id of ids) {
            await customerRepository.delete(id);
        }
        this.clearSelection();
        await this.loadCustomers();
    }
}

export const customerStore = new CustomerStore();
