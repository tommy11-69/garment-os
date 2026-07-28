import { 
    customers, orders, inventory, activeBatches, transactions, costings,
    setInventory, setTransactions, setActiveBatches, setCostings, setOrders
} from '../data/mockData.js';

/**
 * Simulates a network delay for API calls.
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise} Resolves after delay
 */
const delay = (ms = 600) => new Promise(resolve => setTimeout(resolve, ms));

export const api = {
    async getCustomers() { await delay(); return customers; },
    async getOrders() { await delay(); return orders; },
    async getInventory() { await delay(); return inventory; },
    async getActiveBatches() { await delay(); return activeBatches; },
    async getTransactions() { await delay(); return transactions; },
    async getCostings() { await delay(); return costings; },
    async getCostingById(id) { await delay(); return costings.find(c => c.id === id); },
    
    // -- ORDERS --
    
    async saveOrder(orderData) {
        await delay();
        const newOrder = {
            id: orderData.id || `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
            ...orderData,
            status: orderData.status || "Draft",
            statusColor: "bg-surface-variant text-secondary", // default
            dateMonth: new Date().toLocaleString('default', { month: 'short' }),
            dateDay: new Date().getDate().toString(),
            incurredCost: 0
        };
        
        if (orderData.id) {
            // Update
            const updated = orders.map(o => o.id === orderData.id ? newOrder : o);
            setOrders(updated);
        } else {
            // Create
            setOrders([newOrder, ...orders]);
        }
        return newOrder;
    },

    async deleteOrder(orderId) {
        await delay();
        setOrders(orders.filter(o => o.id !== orderId));
        return { success: true };
    },

    async archiveOrder(orderId) {
        await delay();
        const updated = orders.map(o => {
            if (o.id === orderId) return { ...o, status: "Archived", statusColor: "bg-surface-variant text-secondary" };
            return o;
        });
        setOrders(updated);
        return { success: true };
    },

    async duplicateOrder(orderId) {
        await delay();
        const original = orders.find(o => o.id === orderId);
        if (!original) throw new Error("Order not found");
        
        const duplicate = {
            ...original,
            id: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
            status: "Draft",
            statusColor: "bg-surface-variant text-secondary",
            progressPercentage: 0,
            progressLabel: "Draft",
            progressColor: "bg-surface-variant",
            incurredCost: 0,
            dateMonth: new Date().toLocaleString('default', { month: 'short' }),
            dateDay: new Date().getDate().toString(),
        };
        
        setOrders([duplicate, ...orders]);
        return duplicate;
    },

    async updateOrderStatus(orderId, newStatus) {
        await delay();
        const order = orders.find(o => o.id === orderId);
        if (!order) throw new Error("Order not found");
        
        const timestamp = new Date().toISOString().split('T')[0];
        
        order.status = newStatus;
        // Mock timeline event
        if (!order.timeline) order.timeline = [];
        order.timeline.unshift({
            id: `t-${Date.now()}`,
            date: timestamp,
            title: `Status: ${newStatus}`,
            user: "Current User",
            type: "status"
        });
        
        // Mock auto task generation based on status
        if (!order.tasks) order.tasks = [];
        if (newStatus === "Approved") {
            order.tasks.push({ id: `tsk-${Date.now()}`, title: "Reserve Material", status: "Pending", assignee: "Inventory Mgr" });
        } else if (newStatus === "Material Reserved") {
            order.tasks.push({ id: `tsk-${Date.now()}`, title: "Commence Cutting", status: "Pending", assignee: "Cutting Dept" });
        }
        
        return order;
    },

    async addOrderTask(orderId, taskData) {
        await delay();
        const order = orders.find(o => o.id === orderId);
        if (!order) throw new Error("Order not found");
        
        if (!order.tasks) order.tasks = [];
        const newTask = {
            id: `tsk-${Date.now()}`,
            title: taskData.title,
            status: taskData.status || "Pending",
            assignee: taskData.assignee || "Unassigned"
        };
        order.tasks.unshift(newTask);
        return newTask;
    },

    async logOrderActivity(orderId, activityData) {
        // Will be used for internal audit logging
        await delay();
        const order = orders.find(o => o.id === orderId);
        if (!order) return;
        
        if (!order.timeline) order.timeline = [];
        order.timeline.unshift({
            id: `t-${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            title: activityData.title,
            user: "Current User",
            type: "system"
        });
        return { success: true };
    },

    /**
     * Logs an expense against a specific production batch.
     */
    async logBatchExpense(batchId, title, amount) {
        await delay();
        const newTxn = {
            id: `txn-${Date.now()}`,
            type: "expense",
            title: title,
            category: "Production",
            amount: parseFloat(amount),
            amountColor: "text-on-surface",
            isNegative: true,
            icon: "science",
            iconBg: "bg-error/10",
            iconColor: "text-error",
            linkedBatchId: batchId
        };
        const newTxns = [newTxn, ...transactions];
        setTransactions(newTxns);

        // Update the batch's expenses array
        const updatedBatches = activeBatches.map(b => {
            if (b.id === batchId) {
                return { ...b, expenses: [...(b.expenses || []), newTxn.id] };
            }
            return b;
        });
        setActiveBatches(updatedBatches);
        
        return newTxn;
    },

    /**
     * Logs raw material consumption against a batch. Deducts from inventory.
     */
    async logBatchConsumption(batchId, invId, qty) {
        await delay();
        const numQty = parseFloat(qty);
        
        // Deduct from inventory
        const updatedInv = inventory.map(item => {
            if (item.id === invId) {
                const newQty = item.quantity - numQty;
                return { ...item, quantity: newQty, status: newQty < 100 ? "Low Stock" : "In Stock" };
            }
            return item;
        });
        setInventory(updatedInv);

        // Add to batch
        const updatedBatches = activeBatches.map(b => {
            if (b.id === batchId) {
                return { 
                    ...b, 
                    consumptions: [
                        ...(b.consumptions || []), 
                        { invId, actualConsumption: numQty, date: new Date().toISOString() }
                    ] 
                };
            }
            return b;
        });
        setActiveBatches(updatedBatches);
        
        return { success: true };
    },

    /**
     * Creates a new costing draft or quote.
     */
    async saveCosting(costingData) {
        await delay();
        const newCosting = {
            id: `cost-${Date.now()}`,
            ...costingData,
            status: costingData.status || "Draft",
            date: new Date().toISOString().split('T')[0]
        };
        setCostings([newCosting, ...costings]);
        return newCosting;
    }
};
