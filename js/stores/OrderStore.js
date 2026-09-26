import { BaseStore } from './BaseStore.js?v=5.2';
import { orderRepository } from '../repositories/OrderRepository.js?v=5.2';

class OrderStore extends BaseStore {
    constructor() {
        super(orderRepository);
        this.currentSearch = '';
        this.currentFilters = { status: 'all' };
    }

    getState() {
        return {
            ...super.getState(),
            currentSearch: this.currentSearch,
            currentFilters: this.currentFilters
        };
    }

    async loadOrders() {
        this.setState({ loading: true });
        try {
            const results = await orderRepository.searchOrders(this.currentSearch, this.currentFilters);
            this.setState({ entities: results, loading: false });
        } catch (err) {
            this.setState({ error: err, loading: false });
        }
    }

    setSearch(query) {
        this.currentSearch = query;
        this.loadOrders();
    }

    setFilter(key, value) {
        this.currentFilters[key] = value;
        this.loadOrders();
    }

    async fetchActiveEntity(id) {
        try {
            const entity = await orderRepository.getByIdEnriched(id);
            if (entity) {
                this.updateEntity(id, entity);
                this.setActiveEntity(id);
            }
        } catch (err) {
            console.error("Failed to fetch active order", err);
        }
    }

    async generateNextOrderId() {
        const year = new Date().getFullYear();
        const prefix = `ORD-${year}-`;
        let maxSeq = 0;
        try {
            const orders = await orderRepository.getAll();
            if (Array.isArray(orders)) {
                for (const o of orders) {
                    const id = o.id || '';
                    if (id.startsWith(prefix)) {
                        const seqStr = id.slice(prefix.length);
                        const seqNum = parseInt(seqStr, 10);
                        if (!isNaN(seqNum) && seqNum > maxSeq) {
                            maxSeq = seqNum;
                        }
                    }
                }
            }
        } catch (e) {
            console.error('Failed to calculate max order sequence:', e);
        }
        const nextSeq = maxSeq + 1;
        return `${prefix}${String(nextSeq).padStart(4, '0')}`;
    }

    async create(data) {
        // Ensure JSON fields are serialised for storage
        const payload = { ...data };
        if (!payload.id) {
            payload.id = await this.generateNextOrderId();
        }
        if (payload.stageData && typeof payload.stageData === 'object') {
            payload.stageData = JSON.stringify(payload.stageData);
        }
        if (payload.phases && Array.isArray(payload.phases)) {
            payload.phases = JSON.stringify(payload.phases);
        }

        // Dual-write to V2 Normalized Relational Endpoint for complete schema synchronization
        try {
            const v2Payload = {
                id: payload.id,
                orderNumber: payload.id || payload.orderNumber,
                customerId: payload.customerId || 'c_default',
                customerName: payload.customerName || 'Customer',
                orderDate: payload.orderDate || new Date().toISOString().split('T')[0],
                deliveryDate: payload.deliveryDate || payload.targetDeliveryDate || new Date(Date.now() + 30*86400000).toISOString().split('T')[0],
                priority: payload.priority || 'Medium',
                season: payload.season || '',
                notes: payload.notes || '',
                commercials: {
                    currency: payload.currency || 'USD',
                    unitPrice: parseFloat(payload.unitPrice || 0),
                    discountAmount: parseFloat(payload.discount || 0),
                    taxPercent: parseFloat(payload.tax || 0),
                    paymentTerms: payload.paymentTerms || 'Net 30'
                },
                items: Array.isArray(payload.products) && payload.products.length > 0 ? payload.products.map(p => ({
                    styleCode: p.name || p.style || 'STYLE-01',
                    styleName: p.name || 'Apparel Item',
                    workflowPresetId: p.workflowType || payload.workflowType || 'wp_standard_cmt',
                    fabricComposition: p.fabric?.type || payload.fabric || 'Cotton Jersey',
                    targetGsm: parseInt(p.fabric?.gsm || 180),
                    fabricDia: p.fabric?.dia || 'Open Width',
                    totalQuantity: parseInt(p.qty || payload.qty || 0),
                    variants: [{
                        colorName: p.color || 'Standard Color',
                        colorCode: '#000000',
                        sizes: Object.entries(p.sizes || {}).map(([sizeCode, qty]) => ({
                            sizeCode,
                            orderedQuantity: parseInt(qty) || 0
                        }))
                    }]
                })) : [{
                    styleCode: payload.styleName || payload.product || 'STYLE-01',
                    styleName: payload.styleName || payload.product || 'Apparel Item',
                    workflowPresetId: payload.workflowType || 'wp_standard_cmt',
                    fabricComposition: payload.fabric || 'Cotton Jersey',
                    targetGsm: 180,
                    fabricDia: 'Open Width',
                    totalQuantity: parseInt(payload.qty || 0),
                    variants: []
                }]
            };

            await db.createOrderV2(v2Payload);
        } catch (v2Err) {
            console.warn("V2 normalized creation sync note:", v2Err.message || v2Err);
        }

        const newOrder = await orderRepository.create(payload);
        await this.loadOrders();
        return newOrder;
    }

    async createOrder(data) {
        return this.create(data);
    }


    async updateOrder(id, data) {
        const updated = await orderRepository.update(id, data);
        await this.fetchActiveEntity(id);
        await this.loadOrders();
        return updated;
    }
    
    async addTimelineEvent(id, event) {
        await orderRepository.addTimelineEvent(id, event);
        await this.fetchActiveEntity(id);
    }

    async toggleTask(orderId, taskId) {
        const order = await orderRepository.getByIdEnriched(orderId);
        if (!order || !order.tasks) return;
        
        const task = order.tasks.find(t => t.id === taskId);
        if (!task) return;
        
        task.status = task.status === 'Completed' ? 'Pending' : 'Completed';
        
        // Calculate progress
        const total = order.tasks.length;
        const completed = order.tasks.filter(t => t.status === 'Completed').length;
        const progress = total === 0 ? 0 : Math.round((completed / total) * 100);
        
        await this.updateOrder(orderId, { tasks: order.tasks, progress });
    }
}

export const orderStore = new OrderStore();
