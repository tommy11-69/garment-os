import { customers, orders, inventory, activeBatches, transactions } from '../data/mockData.js';

/**
 * Simulates a network delay for API calls.
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise} Resolves after delay
 */
const delay = (ms = 600) => new Promise(resolve => setTimeout(resolve, ms));

export const api = {
    /**
     * Fetches the list of customers.
     * @returns {Promise<Array>}
     */
    async getCustomers() {
        await delay();
        return customers;
    },

    /**
     * Fetches the list of recent orders.
     * @returns {Promise<Array>}
     */
    async getOrders() {
        await delay();
        return orders;
    },

    /**
     * Fetches the list of inventory items.
     * @returns {Promise<Array>}
     */
    async getInventory() {
        await delay();
        return inventory;
    },

    /**
     * Fetches active production batches.
     * @returns {Promise<Array>}
     */
    async getActiveBatches() {
        await delay();
        return activeBatches;
    },

    /**
     * Fetches recent financial transactions.
     * @returns {Promise<Array>}
     */
    async getTransactions() {
        await delay();
        return transactions;
    }
};
