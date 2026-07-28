import { 
    customers, orders, inventory, activeBatches, transactions, costings,
    setInventory, setTransactions, setActiveBatches, setCostings, setOrders, setCustomers
} from '../data/mockData.js';

/**
 * Simulates a network delay for API calls.
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise} Resolves after delay
 */
const delay = (ms = 600) => new Promise(resolve => setTimeout(resolve, ms));

/** Returns a formatted timestamp string for timeline events. */
export const makeTimestamp = () =>
    new Intl.DateTimeFormat('en-IN', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date());

export const api = {
    
    _enrichCustomerStats(c) {
        const cOrders = orders.filter(o => o.customerId === c.id);
        const totalOrders = cOrders.length;
        const completedOrders = cOrders.filter(o => o.status === 'Completed').length;
        const totalRevenue = cOrders.reduce((sum, o) => sum + (o.value || 0), 0);
        const outstanding = cOrders.filter(o => ['Pending', 'Processing'].includes(o.status)).reduce((sum, o) => sum + (o.value || 0), 0);
        const averageOrderValue = totalOrders > 0 ? (totalRevenue / totalOrders) : 0;
        
        // Sort to find last order date
        const sorted = [...cOrders].sort((a,b) => new Date(b.date) - new Date(a.date));
        const lastOrderDate = sorted.length > 0 ? sorted[0].date : null;
        
        return {
            ...c,
            totalOrders,
            completedOrders,
            totalRevenue,
            outstanding,
            averageOrderValue,
            lastOrderDate,
            activeOrders: totalOrders - completedOrders // legacy field support
        };
    },

    async getCustomers() { 
        await delay(); 
        return customers.map(c => this._enrichCustomerStats(c)); 
    },

    async getOrders() { await delay(); return orders; },
    async getInventory() { await delay(); return inventory; },
    async getActiveBatches() { await delay(); return activeBatches; },
    async getTransactions() { await delay(); return transactions; },
    async getCostings() { await delay(); return costings; },
    async getCostingById(id) { await delay(); return costings.find(c => c.id === id); },
    
    // -- CUSTOMERS --
    
    
    async getCustomer(id) {
        await delay(300);
        const c = customers.find(c => c.id === id); return c ? this._enrichCustomerStats(c) : null;
    },

    async updateCustomer(id, data) {
        await delay(500);
        const index = customers.findIndex(c => c.id === id);
        if (index === -1) throw new Error('Customer not found');
        
        customers[index] = {
            ...customers[index],
            ...data,
            lastUpdated: new Date().toISOString()
        };
        return this._enrichCustomerStats(customers[index]);
    },

    async archiveCustomer(id) {
        await delay(400);
        const index = customers.findIndex(c => c.id === id);
        if (index === -1) throw new Error('Customer not found');
        customers[index].status = 'Archived';
        customers[index].statusColor = 'bg-surface-variant text-secondary';
        return this._enrichCustomerStats(customers[index]);
    },

    async restoreCustomer(id) {
        await delay(400);
        const index = customers.findIndex(c => c.id === id);
        if (index === -1) throw new Error('Customer not found');
        customers[index].status = 'Active';
        customers[index].statusColor = 'bg-success-container/30 text-success';
        return this._enrichCustomerStats(customers[index]);
    },

    async deleteCustomer(id) {
        await delay(600);
        const index = customers.findIndex(c => c.id === id);
        if (index === -1) throw new Error('Customer not found');
        customers.splice(index, 1);
        return true;
    },

    async duplicateCustomer(id) {
        await delay(500);
        const customer = customers.find(c => c.id === id);
        if (!customer) throw new Error('Customer not found');
        
        const duplicate = {
            ...customer,
            id: `c-${Date.now()}`,
            customerCode: `CUST-${Math.floor(1000 + Math.random() * 9000)}`,
            name: `${customer.name} (Copy)`,
            status: 'Active',
            statusColor: 'bg-success-container/30 text-success',
            activeOrders: 0,
            totalRevenue: 0
        };
        customers.unshift(duplicate);
        return this._enrichCustomerStats(duplicate);
    },

    
    async searchCustomers(query) {
        const all = await this.getCustomers();
        const q = query.toLowerCase();
        return all.filter(c => 
            c.name.toLowerCase().includes(q) || 
            (c.company && c.company.toLowerCase().includes(q)) ||
            (c.customerCode && c.customerCode.toLowerCase().includes(q)) ||
            (c.phone && c.phone.includes(q)) ||
            (c.gst && c.gst.toLowerCase().includes(q)) ||
            (c.email && c.email.toLowerCase().includes(q)) ||
            (c.city && c.city.toLowerCase().includes(q)) ||
            (c.state && c.state.toLowerCase().includes(q))
        );
    },

    async filterCustomers(filters) {
        const all = await this.getCustomers();
        return all.filter(c => {
            if (filters.status && filters.status !== 'All') {
                if (c.status !== filters.status) return false;
            }
            if (filters.customerType && filters.customerType !== 'All') {
                if (c.customerType !== filters.customerType) return false;
            }
            if (filters.city && c.city !== filters.city) return false;
            if (filters.state && c.state !== filters.state) return false;
            return true;
        });
    },

    async saveCustomer(customerData) {
        await delay();
        const nameLower = customerData.name.trim().toLowerCase();
        
        // Duplicate Detection
        const duplicate = customers.find(c => {
            if (c.name.trim().toLowerCase() === nameLower) return true;
            if (c.phone && customerData.mobile && c.phone === customerData.mobile) return true;
            if (c.gst && customerData.gst && c.gst === customerData.gst) return true;
            return false;
        });

        if (duplicate) {
            throw new Error('Duplicate customer found (Name, Mobile, or GST matches an existing record).');
        }

        const now = new Date().toISOString();
        const newCustomer = {
            id: `c-${Date.now()}`,
            customerCode: `CUST-${Math.floor(1000 + Math.random() * 9000)}`,
            name: customerData.name.trim(),
            company: customerData.company || '',
            contactPerson: customerData.contactPerson || '',
            initials: customerData.name.substring(0, 2).toUpperCase(),
            avatar: '', // Mock generic avatar
            phone: customerData.mobile,
            whatsapp: customerData.whatsapp || '',
            email: customerData.email || '',
            gst: customerData.gst || '',
            customerType: customerData.customerType || 'Brand',
            paymentTerms: customerData.paymentTerms || '',
            creditLimit: parseFloat(customerData.creditLimit) || 0,
            currency: customerData.currency || 'INR',
            address: customerData.address || '',
            city: customerData.city || '',
            state: customerData.state || '',
            country: customerData.country || '',
            pincode: customerData.pincode || '',
            notes: customerData.notes || '',
            isActive: customerData.isActive !== false, // default true
            createdAt: now,
            updatedAt: now,
            totalOrders: 0,
            totalRevenue: 0,
            outstandingAmount: 0,
            status: customerData.isActive === false ? 'Inactive' : 'Active',
            statusColor: customerData.isActive === false ? 'bg-surface-variant text-secondary' : 'bg-[#008A00]/10 text-[#008A00]'
        };

        setCustomers([newCustomer, ...customers]);
        return newCustomer;
    },

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
            const updated = orders.map(o => {
                if (o.id === orderData.id) {
                    if (!newOrder.timeline) newOrder.timeline = [];
                    newOrder.timeline.unshift({
                        id: `t-${Date.now()}`,
                        date: makeTimestamp(),
                        title: 'Order Details Edited',
                        user: 'System',
                        type: 'action'
                    });
                    return newOrder;
                }
                return o;
            });
            setOrders(updated);
        } else {
            // Create
            if (!newOrder.timeline) newOrder.timeline = [];
            newOrder.timeline.unshift({
                id: `t-${Date.now()}`,
                date: makeTimestamp(),
                title: 'Order Created',
                user: 'System',
                type: 'action'
            });
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
            if (o.id === orderId) {
                const newO = { ...o, status: "Archived", statusColor: "bg-surface-variant text-secondary" };
                if (!newO.timeline) newO.timeline = [];
                newO.timeline.unshift({
                    id: `t-${Date.now()}`,
                    date: makeTimestamp(),
                    title: 'Order Archived',
                    user: 'System',
                    type: 'action'
                });
                return newO;
            }
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
        return this._enrichCustomerStats(duplicate);
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
            date: makeTimestamp(),
            title: `Status: ${newStatus}`,
            user: "System Workflow",
            type: "status"
        });
        
        // Mock auto task generation based on status
        if (!order.tasks) order.tasks = [];
        
        const generateTask = (title, assignee) => {
            order.tasks.unshift({ id: `tsk-${Date.now()}-${Math.random()}`, title, status: "Pending", assignee });
        };

        switch (newStatus) {
            case "Quotation Sent":
                generateTask("Follow up with client for approval", "Sales");
                break;
            case "Approved":
                generateTask("Reserve Material", "Inventory Mgr");
                generateTask("Generate Proforma Invoice", "Finance");
                break;
            case "Material Reserved":
                generateTask("Assign Production Line", "Prod Mgr");
                break;
            case "Knitting":
                generateTask("Monitor Yarn Consumption", "Floor Spv");
                break;
            case "Dyeing":
                generateTask("Check color matching vs lap dip", "QC Team");
                break;
            case "Cutting":
                generateTask("Approve Cut Plan", "Floor Spv");
                break;
            case "Stitching":
                generateTask("First Piece Approval (FPA)", "QC Team");
                break;
            case "Quality Check":
                generateTask("100% Inline Inspection", "QC Team");
                generateTask("AQL Final Audit", "QA Mgr");
                break;
            case "Packing":
                generateTask("Source Packing Trims (Polybag, Labels)", "Purchasing");
                break;
            case "Dispatch Ready":
                generateTask("Book Logistics/Truck", "Logistics");
                generateTask("Generate Commercial Invoice", "Finance");
                break;
            case "Dispatched":
                generateTask("Share tracking details with client", "Sales");
                break;
        }
        
        return order;
    },

    async addOrderTask(orderId, taskData) {
        await delay();
        const order = orders.find(o => o.id === orderId);
        if (!order) throw new Error('Order not found');
        if (!order.tasks) order.tasks = [];
        const newTask = {
            id: `tsk-${Date.now()}`,
            title: taskData.title,
            status: taskData.status || 'Pending',
            assignee: taskData.assignee || 'Unassigned',
            priority: taskData.priority || 'Normal',
            dueDate: taskData.dueDate || '',
            notes: taskData.notes || ''
        };
        order.tasks.unshift(newTask);
        return newTask;
    },

    async updateOrderTask(orderId, taskId, taskData) {
        await delay();
        const order = orders.find(o => o.id === orderId);
        if (!order) throw new Error('Order not found');
        const taskIdx = (order.tasks || []).findIndex(t => t.id === taskId);
        if (taskIdx === -1) throw new Error('Task not found');
        order.tasks[taskIdx] = { ...order.tasks[taskIdx], ...taskData };
        return order.tasks[taskIdx];
    },

    async deleteOrderTask(orderId, taskId) {
        await delay();
        const order = orders.find(o => o.id === orderId);
        if (!order) throw new Error('Order not found');
        order.tasks = (order.tasks || []).filter(t => t.id !== taskId);
        return { success: true };
    },

    async logOrderActivity(orderId, activityData) {
        // Will be used for internal audit logging
        await delay();
        const order = orders.find(o => o.id === orderId);
        if (!order) return;
        
        if (!order.timeline) order.timeline = [];
        order.timeline.unshift({
            id: `t-${Date.now()}`,
            date: makeTimestamp(),
            title: activityData.title,
            user: "Current User",
            type: "system"
        });
        return { success: true };
    },

    async addOrderExpense(orderId, expense) {
        await delay();
        const order = orders.find(o => o.id === orderId);
        if (!order) throw new Error('Order not found');
        
        if (!order.expenses) order.expenses = [];
        const newExpense = {
            id: 'e' + Date.now(),
            type: expense.type,
            amount: parseFloat(expense.amount),
            date: expense.date || new Date().toISOString().split('T')[0],
            notes: expense.notes
        };
        order.expenses.push(newExpense);
        
        // Update incurred cost
        order.incurredCost = (order.incurredCost || 0) + newExpense.amount;
        
        // Log to timeline
        if (!order.timeline) order.timeline = [];
        order.timeline.unshift({
            date: makeTimestamp(),
            title: `Logged Expense: $${newExpense.amount} (${newExpense.type})`,
            user: "System",
            type: "inventory",
            status: "completed"
        });
        
        return order;
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
