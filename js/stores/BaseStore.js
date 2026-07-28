export class BaseStore {
    constructor() {
        this.entities = [];
        this.activeEntity = null;
        this.selectedIds = new Set();
        
        // Listeners for UI reactivity
        this.listeners = [];
        
        this.loading = false;
        this.error = null;
    }

    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    notify() {
        this.listeners.forEach(listener => listener(this.getState()));
    }

    getState() {
        return {
            entities: this.entities,
            activeEntity: this.activeEntity,
            selectedIds: this.selectedIds,
            isBulkMode: this.selectedIds.size > 0,
            loading: this.loading,
            error: this.error
        };
    }

    // --- State Mutations ---

    setLoading(isLoading) {
        this.loading = isLoading;
        this.notify();
    }

    setError(error) {
        this.error = error;
        this.loading = false;
        this.notify();
    }

    setEntities(entities) {
        this.entities = entities;
        this.error = null;
        this.loading = false;
        
        // If the active entity was updated, refresh it
        if (this.activeEntity) {
            const updated = this.entities.find(e => e.id === this.activeEntity.id);
            if (updated) {
                this.activeEntity = updated;
            }
        }
        
        this.notify();
    }

    setActiveEntity(id) {
        if (!id) {
            this.activeEntity = null;
        } else {
            this.activeEntity = this.entities.find(e => e.id === id) || null;
        }
        this.notify();
    }

    toggleSelection(id) {
        if (this.selectedIds.has(id)) {
            this.selectedIds.delete(id);
        } else {
            this.selectedIds.add(id);
        }
        this.notify();
    }

    clearSelection() {
        this.selectedIds.clear();
        this.notify();
    }

    addEntity(entity) {
        this.entities = [entity, ...this.entities];
        this.notify();
    }

    updateEntity(id, updates) {
        this.entities = this.entities.map(e => e.id === id ? { ...e, ...updates } : e);
        if (this.activeEntity && this.activeEntity.id === id) {
            this.activeEntity = { ...this.activeEntity, ...updates };
        }
        this.notify();
    }

    removeEntity(id) {
        this.entities = this.entities.filter(e => e.id !== id);
        this.selectedIds.delete(id);
        if (this.activeEntity && this.activeEntity.id === id) {
            this.activeEntity = null;
        }
        this.notify();
    }
}
