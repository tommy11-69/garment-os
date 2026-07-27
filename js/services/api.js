import { 
    customers, orders, inventory, activeBatches, transactions, costings,
    setInventory, setTransactions, setActiveBatches, setCostings
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
