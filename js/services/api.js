import { db } from '../data/database.js';

export const ORDER_STATUSES = {
    DRAFT: 'Draft',
    QUOTATION_SENT: 'Quotation Sent',
    AWAITING_APPROVAL: 'Awaiting Approval',
    APPROVED: 'Approved',
    MATERIAL_RESERVED: 'Material Reserved',
    PRODUCTION_ASSIGNED: 'Production Assigned',
    KNITTING: 'Knitting',
    DYEING: 'Dyeing',
    COMPACTING: 'Compacting',
    CUTTING: 'Cutting',
    PRINTING: 'Printing',
    EMBROIDERY: 'Embroidery',
    STITCHING: 'Stitching',
    QC: 'Quality Check',
    PACKING: 'Packing',
    READY_FOR_DISPATCH: 'Dispatch Ready',
    DISPATCHED: 'Dispatched',
    DELIVERED: 'Delivered',
    CLOSED: 'Closed',
    ARCHIVED: 'Archived'
};

const delay = (ms = 0) => new Promise(resolve => setTimeout(resolve, ms));

export const makeTimestamp = () =>
    new Intl.DateTimeFormat('en-IN', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date());

export const api = {
    ORDER_STATUSES,
    
    async _enrichCustomerStats(c, orders = null) {
        if (!orders) {
            orders = await db.getCollection('orders');
        }
        const cOrders = orders.filter(o => o.customerId === c.id);
        const totalOrders = cOrders.length;
        const completedOrders = cOrders.filter(o => o.status === 'Completed').length;
        const totalRevenue = cOrders.reduce((sum, o) => sum + (o.value || 0), 0);
        const outstanding = cOrders.filter(o => ['Pending', 'Processing'].includes(o.status)).reduce((sum, o) => sum + (o.value || 0), 0);
        const averageOrderValue = totalOrders > 0 ? (totalRevenue / totalOrders) : 0;
        
        const sorted = [...cOrders].sort((a,b) => new Date(b.dateMonth + ' ' + b.dateDay) - new Date(a.dateMonth + ' ' + a.dateDay));
        const lastOrderDate = sorted.length > 0 ? sorted[0].dateMonth + ' ' + sorted[0].dateDay : null;
        
        return {
            ...c,
            totalOrders,
            completedOrders,
            totalRevenue,
            outstanding,
            averageOrderValue,
            lastOrderDate,
            activeOrders: totalOrders - completedOrders
        };
    },

    async getCustomers() { 
        const [customers, orders] = await Promise.all([
            db.getCollection('customers'),
            db.getCollection('orders')
        ]);
        return Promise.all(customers.map(c => this._enrichCustomerStats(c, orders))); 
    },

    async getOrders() { return await db.getCollection('orders'); },
    async getInventory() { return await db.getCollection('inventory'); },
    async getActiveBatches() { return await db.getCollection('batches'); },
    async getTransactions() { return await db.getCollection('transactions'); },
    async getCostings() { return await db.getCollection('costings'); },
    async getCostingById(id) { return await db.getById('costings', id); },
    
    // -- CUSTOMERS --
    
    async getCustomer(id) {
        const c = await db.getById('customers', id); 
        return c ? await this._enrichCustomerStats(c) : null;
    },

    async updateCustomer(id, data) {
        const updated = await db.update('customers', id, data);
        return await this._enrichCustomerStats(updated);
    },

    async archiveCustomer(id) {
        return await this.updateCustomer(id, { status: 'Archived', statusColor: 'bg-surface-variant text-secondary' });
    },

    async restoreCustomer(id) {
        return await this.updateCustomer(id, { status: 'Active', statusColor: 'bg-[#008A00]/10 text-[#008A00]' });
    },

    async deleteCustomer(id) {
        return await db.delete('customers', id);
    },

    async duplicateCustomer(id) {
        const customer = await db.getById('customers', id);
        if (!customer) throw new Error('Customer not found');
        
        const duplicate = {
            ...customer,
            id: `c-${Date.now()}`,
            customerCode: `CUST-${Math.floor(1000 + Math.random() * 9000)}`,
            name: `${customer.name} (Copy)`,
            status: 'Active',
            statusColor: 'bg-[#008A00]/10 text-[#008A00]',
            activeOrders: 0,
            totalRevenue: 0
        };
        delete duplicate._id;
        delete duplicate.createdAt;
        delete duplicate.updatedAt;
        
        const newC = await db.insert('customers', duplicate);
        return await this._enrichCustomerStats(newC);
    },
    
    async searchCustomers(query) {
        const all = await this.getCustomers();
        const q = query.toLowerCase();
        return all.filter(c => 
            c.name.toLowerCase().includes(q) || 
            (c.company && c.company.toLowerCase().includes(q)) ||
            (c.customerCode && c.customerCode.toLowerCase().includes(q)) ||
            (c.phone && c.phone.includes(q)) ||
            (c.email && c.email.toLowerCase().includes(q)) ||
            (c.city && c.city.toLowerCase().includes(q))
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
        const customers = await db.getCollection('customers');
        const nameLower = customerData.name.trim().toLowerCase();
        
        const duplicate = customers.find(c => {
            if (c.name.trim().toLowerCase() === nameLower) return true;
            if (c.phone && customerData.mobile && c.phone === customerData.mobile) return true;
            if (c.gst && customerData.gst && c.gst === customerData.gst) return true;
            return false;
        });

        if (duplicate) {
            throw new Error('Duplicate customer found (Name, Mobile, or GST matches an existing record).');
        }

        const newCustomer = {
            id: `c-${Date.now()}`,
            customerCode: `CUST-${Math.floor(1000 + Math.random() * 9000)}`,
            name: customerData.name.trim(),
            company: customerData.company || '',
            contactPerson: customerData.contactPerson || '',
            initials: customerData.name.substring(0, 2).toUpperCase(),
            avatar: '', 
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
            isActive: customerData.isActive !== false,
            status: customerData.isActive === false ? 'Inactive' : 'Active',
            statusColor: customerData.isActive === false ? 'bg-surface-variant text-secondary' : 'bg-[#008A00]/10 text-[#008A00]'
        };

        return await db.insert('customers', newCustomer);
    },

    // -- ORDERS --
    
    async saveOrder(orderData) {
        if (orderData.id) {
            // Update
            const existing = await db.getById('orders', orderData.id);
            if (!existing.timeline) existing.timeline = [];
            existing.timeline.unshift({
                id: `t-${Date.now()}`,
                date: new Date().toISOString().split('T')[0],
                title: 'Order Details Edited',
                user: 'System',
                type: 'action'
            });
            const updates = { ...orderData, timeline: existing.timeline };
            delete updates._id; // avoid Mongo immutable _id error
            return await db.update('orders', orderData.id, updates);
        } else {
            // Create
            const newOrder = {
                id: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
                ...orderData,
                status: orderData.status || "Draft",
                statusColor: "bg-surface-variant text-secondary",
                dateMonth: new Date().toLocaleString('default', { month: 'short' }),
                dateDay: new Date().getDate().toString(),
                incurredCost: 0,
                timeline: [{
                    id: `t-${Date.now()}`,
                    date: new Date().toISOString().split('T')[0],
                    title: 'Order Created',
                    user: 'System',
                    type: 'action'
                }]
            };
            return await db.insert('orders', newOrder);
        }
    },

    async updateOrder(orderId, updates) {
        return await db.update('orders', orderId, updates);
    },

    async deleteOrder(orderId) {
        return await db.delete('orders', orderId);
    },

    async archiveOrder(orderId) {
        const o = await db.getById('orders', orderId);
        if (!o.timeline) o.timeline = [];
        o.timeline.unshift({
            id: `t-${Date.now()}`,
            date: makeTimestamp(),
            title: 'Order Archived',
            user: 'System',
            type: 'action'
        });
        return await db.update('orders', orderId, { status: "Archived", statusColor: "bg-surface-variant text-secondary", timeline: o.timeline });
    },

    async duplicateOrder(orderId) {
        const original = await db.getById('orders', orderId);
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
        delete duplicate._id;
        delete duplicate.createdAt;
        delete duplicate.updatedAt;
        
        return await db.insert('orders', duplicate);
    },

    async updateOrderStatus(orderId, newStatus) {
        const order = await db.getById('orders', orderId);
        if (!order) throw new Error("Order not found");
        
        if (!order.timeline) order.timeline = [];
        order.timeline.unshift({
            id: `t-${Date.now()}`,
            date: makeTimestamp(),
            title: `Status: ${newStatus}`,
            user: "System Workflow",
            type: "status"
        });
        
        if (!order.tasks) order.tasks = [];
        const generateTask = (title, assignee) => {
            order.tasks.unshift({ id: `tsk-${Date.now()}-${Math.random()}`, title, status: "Pending", assignee });
        };

        switch (newStatus) {
            case "Quotation Sent": generateTask("Follow up with client", "Sales"); break;
            case "Approved": generateTask("Reserve Material", "Inventory Mgr"); break;
            case "Cutting": generateTask("Approve Cut Plan", "Floor Spv"); break;
            case "Stitching": generateTask("First Piece Approval (FPA)", "QC Team"); break;
        }
        
        return await db.update('orders', orderId, { status: newStatus, timeline: order.timeline, tasks: order.tasks });
    },

    async addOrderTask(orderId, taskData) {
        const order = await db.getById('orders', orderId);
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
        await db.update('orders', orderId, { tasks: order.tasks });
        return newTask;
    },

    async updateOrderTask(orderId, taskId, taskData) {
        const order = await db.getById('orders', orderId);
        if (!order) throw new Error('Order not found');
        const taskIdx = (order.tasks || []).findIndex(t => t.id === taskId);
        if (taskIdx === -1) throw new Error('Task not found');
        order.tasks[taskIdx] = { ...order.tasks[taskIdx], ...taskData };
        await db.update('orders', orderId, { tasks: order.tasks });
        return order.tasks[taskIdx];
    },

    async deleteOrderTask(orderId, taskId) {
        const order = await db.getById('orders', orderId);
        if (!order) throw new Error('Order not found');
        order.tasks = (order.tasks || []).filter(t => t.id !== taskId);
        await db.update('orders', orderId, { tasks: order.tasks });
        return { success: true };
    },

    async logOrderActivity(orderId, activityData) {
        const order = await db.getById('orders', orderId);
        if (!order) return;
        
        if (!order.timeline) order.timeline = [];
        order.timeline.unshift({
            id: `t-${Date.now()}`,
            date: makeTimestamp(),
            title: activityData.title,
            user: 'Current User',
            type: 'system'
        });

        if (!order.activityLog) order.activityLog = [];
        order.activityLog.unshift({
            note: activityData.title,
            user: 'Current User',
            date: makeTimestamp()
        });
        return await db.update('orders', orderId, { timeline: order.timeline, activityLog: order.activityLog });
    },

    async recordPayment(orderId, amount, date) {
        const order = await db.getById('orders', orderId);
        if (!order) throw new Error('Order not found');
        order.paymentReceived = (order.paymentReceived || 0) + amount;
        const total = order.grandTotal || order.value || 0;
        if (order.paymentReceived >= total) {
            order.paymentStatus = 'Paid';
        } else if (order.paymentReceived > 0) {
            order.paymentStatus = 'Partial';
        }
        if (!order.timeline) order.timeline = [];
        order.timeline.unshift({
            id: `t-${Date.now()}`,
            date: makeTimestamp(),
            title: `Payment Received: \u20b9${amount.toLocaleString()}${date ? ' on ' + date : ''}`,
            user: 'Finance',
            type: 'action'
        });
        return await db.update('orders', orderId, { 
            paymentReceived: order.paymentReceived, 
            paymentStatus: order.paymentStatus,
            timeline: order.timeline
        });
    },

    async addOrderExpense(orderId, expense) {
        const order = await db.getById('orders', orderId);
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
        
        order.incurredCost = (order.incurredCost || 0) + newExpense.amount;
        
        if (!order.timeline) order.timeline = [];
        order.timeline.unshift({
            date: makeTimestamp(),
            title: `Logged Expense: ₹${newExpense.amount} (${newExpense.type})`,
            user: "System",
            type: "inventory",
            status: "completed"
        });
        
        return await db.update('orders', orderId, {
            expenses: order.expenses,
            incurredCost: order.incurredCost,
            timeline: order.timeline
        });
    },

    async logBatchExpense(batchId, title, amount) {
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
        await db.insert('transactions', newTxn);

        const batch = await db.getById('batches', batchId);
        if (batch) {
            await db.update('batches', batchId, { expenses: [...(batch.expenses || []), newTxn.id] });
        }
        
        return newTxn;
    },

    async logBatchConsumption(batchId, invId, qty) {
        const numQty = parseFloat(qty);
        
        const item = await db.getById('inventory', invId);
        if (item) {
            const newQty = item.quantity - numQty;
            await db.update('inventory', invId, { 
                quantity: newQty, 
                status: newQty < 100 ? "Low Stock" : "In Stock" 
            });
        }

        const batch = await db.getById('batches', batchId);
        if (batch) {
            await db.update('batches', batchId, {
                consumptions: [
                    ...(batch.consumptions || []), 
                    { invId, actualConsumption: numQty, date: new Date().toISOString() }
                ]
            });
        }
        return { success: true };
    },

    async saveCosting(costingData) {
        const newCosting = {
            id: `cost-${Date.now()}`,
            ...costingData,
            status: costingData.status || "Draft",
            date: new Date().toISOString().split('T')[0]
        };
        return await db.insert('costings', newCosting);
    },

    // -- TRANSACTIONS --

    async createTransaction(data) { return await db.insert('transactions', data); },
    async updateTransaction(id, data) { return await db.update('transactions', id, data); },
    async deleteTransaction(id) { return await db.delete('transactions', id); },
    async archiveTransaction(id) { return await db.update('transactions', id, { status: 'Archived', statusColor: 'bg-surface-variant text-secondary' }); },

    async duplicateTransaction(id) {
        const original = await db.getById('transactions', id);
        if (!original) throw new Error('Transaction not found');
        const duplicateData = { ...original, date: new Date().toISOString().split('T')[0] };
        delete duplicateData.id;
        delete duplicateData._id;
        delete duplicateData.createdAt;
        delete duplicateData.updatedAt;
        return await db.insert('transactions', duplicateData);
    },

    // -- COSTINGS --
    
    async createCosting(data) { return await db.insert('costings', data); },
    async updateCosting(id, data) { return await db.update('costings', id, data); },
    async deleteCosting(id) { return await db.delete('costings', id); },
    
    // -- AGGREGATION --
    
    async getCustomerStats(customerId) {
        const orders = await db.getCollection('orders');
        const cOrders = orders.filter(o => o.customerId === customerId);
        const totalOrders = cOrders.length;
        const completedOrders = cOrders.filter(o => o.status === 'Completed').length;
        const totalRevenue = cOrders.reduce((sum, o) => sum + (o.value || 0), 0);
        const outstanding = cOrders.filter(o => ['Pending', 'Processing'].includes(o.status)).reduce((sum, o) => sum + (o.value || 0), 0);
        
        return { totalOrders, completedOrders, totalRevenue, outstanding };
    },
    
    async getOrderFinancials(orderId) {
        const allTrans = await db.getCollection('transactions');
        const oTrans = allTrans.filter(t => t.linkedOrderId === orderId);
        const totalIncome = oTrans.filter(t => t.type === 'Income').reduce((sum, t) => sum + t.amount, 0);
        const totalExpense = oTrans.filter(t => t.type === 'Expense').reduce((sum, t) => sum + t.amount, 0);
        const profit = totalIncome - totalExpense;
        return { totalIncome, totalExpense, profit, transactions: oTrans };
    },

    // -- QUOTATIONS --
    async getQuotations() {
        return await db.getCollection('quotations');
    },

    async getQuotation(id) {
        return await db.getById('quotations', id);
    },

    async saveQuotation(data) {
        if (data.id) {
            delete data._id; // prevent Mongo immutable _id error
            return await db.update('quotations', data.id, data);
        } else {
            const newQuotation = {
                id: `QT-${Math.floor(10000 + Math.random() * 90000)}`,
                date: new Date().toISOString().split('T')[0],
                status: 'Draft',
                ...data
            };
            return await db.insert('quotations', newQuotation);
        }
    },

    async deleteQuotation(id) {
        return await db.delete('quotations', id);
    },

    async updateQuotationStatus(id, newStatus) {
        return await db.update('quotations', id, { status: newStatus });
    }
};
