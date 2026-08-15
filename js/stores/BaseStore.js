export class BaseStore {
    constructor(repository) {
        this.repository = repository;
        this.state = {
            entities: [],
            activeEntity: null,
            searchQuery: '',
            filter: 'All',
            sortBy: 'newest',
            loading: false,
            error: null,
            isBulkMode: false,
            selectedIds: new Set(),
            
            // Pagination state
            page: 1,
            limit: 20,
            total: 0,
            hasMore: false,
            isLoadingMore: false
        };
        this.listeners = new Set();
    }

    subscribe(listener) {
        this.listeners.add(listener);
        listener(this.getState());
        return () => this.listeners.delete(listener);
    }

    notify() {
        this.listeners.forEach(listener => listener(this.getState()));
    }

    getState() {
        return this.state;
    }

    setState(newState) {
        this.state = { ...this.state, ...newState };
        this.notify();
    }

    async loadPage(page = 1, append = false) {
        const isInitialLoad = !append;
        
        if (isInitialLoad) {
            this.setState({ loading: true, error: null, page });
        } else {
            this.setState({ isLoadingMore: true, error: null, page });
        }
        
        try {
            let result;
            const options = { page: this.state.page, limit: this.state.limit };
            
            if (this.state.searchQuery) {
                // Derived classes should override searchFields
                const fields = this.searchFields || ['id', 'name']; 
                result = await this.repository.search(this.state.searchQuery, fields, options);
            } else {
                result = await this.repository.getAll(options);
            }
            
            // Support both paginated and unpaginated responses for backward compatibility during transition
            let newEntities = [];
            let total = 0;
            let hasMore = false;
            
            if (Array.isArray(result)) {
                newEntities = result;
                total = result.length;
            } else {
                newEntities = result.data || [];
                total = result.total || 0;
                hasMore = result.page < result.totalPages;
            }
            
            // Client-side filtering/sorting
            newEntities = this.applyFiltersAndSort(newEntities);
            
            const entities = append ? [...this.state.entities, ...newEntities] : newEntities;
            
            this.setState({ 
                entities, 
                total,
                hasMore,
                loading: false, 
                isLoadingMore: false 
            });
        } catch (error) {
            this.setState({ error, loading: false, isLoadingMore: false });
        }
    }

    async loadInitial() {
        return this.loadPage(1, false);
    }
    
    async loadMore() {
        if (!this.state.hasMore || this.state.isLoadingMore) return;
        return this.loadPage(this.state.page + 1, true);
    }

    // Default filter & sort (override in subclass)
    applyFiltersAndSort(entities) {
        return entities;
    }

    setSearch(query) {
        this.setState({ searchQuery: query });
        this.loadInitial();
    }

    setFilter(filter) {
        this.setState({ filter });
        this.loadInitial();
    }

    setSort(sortBy) {
        this.setState({ sortBy });
        this.loadInitial();
    }

    // --- Selection ---
    
    toggleBulkMode() {
        this.setState({ isBulkMode: !this.state.isBulkMode, selectedIds: new Set() });
    }

    toggleSelection(id) {
        const newSelected = new Set(this.state.selectedIds);
        if (newSelected.has(id)) newSelected.delete(id);
        else newSelected.add(id);
        this.setState({ selectedIds: newSelected });
    }
    
    selectAll() {
        const newSelected = new Set(this.state.entities.map(e => e.id));
        this.setState({ selectedIds: newSelected });
    }

    clearSelection() {
        this.setState({ selectedIds: new Set(), isBulkMode: false });
    }
    
    // --- CRUD ---

    async getById(id) {
        this.setState({ loading: true, error: null });
        try {
            const entity = await this.repository.getById(id);
            this.setState({ activeEntity: entity, loading: false });
            return entity;
        } catch (error) {
            this.setState({ error, loading: false });
            return null;
        }
    }

    async create(data) {
        try {
            const newEntity = await this.repository.create(data);
            this.setState({ entities: [newEntity, ...this.state.entities] });
            return newEntity;
        } catch (error) {
            this.setState({ error });
            throw error;
        }
    }

    async update(id, data) {
        try {
            const updatedEntity = await this.repository.update(id, data);
            this.setState({
                entities: this.state.entities.map(e => e.id === id ? updatedEntity : e),
                activeEntity: this.state.activeEntity?.id === id ? updatedEntity : this.state.activeEntity
            });
            return updatedEntity;
        } catch (error) {
            this.setState({ error });
            throw error;
        }
    }

    async archive(id) {
        try {
            const updatedEntity = await this.repository.archive(id);
            this.setState({
                entities: this.state.entities.map(e => e.id === id ? updatedEntity : e),
                activeEntity: this.state.activeEntity?.id === id ? updatedEntity : this.state.activeEntity
            });
            return updatedEntity;
        } catch (error) {
            this.setState({ error });
            throw error;
        }
    }

    async delete(id) {
        try {
            await this.repository.delete(id);
            this.setState({
                entities: this.state.entities.filter(e => e.id !== id),
                activeEntity: this.state.activeEntity?.id === id ? null : this.state.activeEntity
            });
            return true;
        } catch (error) {
            this.setState({ error });
            throw error;
        }
    }

    updateEntity(id, entity) {
        this.setState({
            entities: this.state.entities.map(e => e.id === id ? entity : e),
            activeEntity: this.state.activeEntity?.id === id ? entity : this.state.activeEntity
        });
    }

    removeEntity(id) {
        this.setState({
            entities: this.state.entities.filter(e => e.id !== id),
            activeEntity: this.state.activeEntity?.id === id ? null : this.state.activeEntity
        });
    }

    setActiveEntity(id) {
        const entity = this.state.entities.find(e => e.id === id) || null;
        this.setState({ activeEntity: entity });
    }
}

