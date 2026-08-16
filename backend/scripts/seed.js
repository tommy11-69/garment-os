const connectDB = require('../database/connection');
const mongoose = require('mongoose');
const Customer = require('../models/Customer');
const Order = require('../models/Order');
const Inventory = require('../models/Inventory');
const Batch = require('../models/Batch');
const Transaction = require('../models/Transaction');
const Costing = require('../models/Costing');
const Quotation = require('../models/Quotation');

async function seedData() {
    await connectDB();
    console.log('Clearing existing data...');
    await Customer.deleteMany();
    await Order.deleteMany();
    await Inventory.deleteMany();
    await Batch.deleteMany();
    await Transaction.deleteMany();
    await Costing.deleteMany();
    await Quotation.deleteMany();

    console.log('Loading mock data...');
    // Using dynamic import for ES module
    const mockData = await import('../../js/data/mockData.js');

    console.log('Seeding Customers...');
    await Customer.insertMany(mockData.customers);
    
    console.log('Seeding Orders...');
    await Order.insertMany(mockData.orders);
    
    console.log('Seeding Inventory...');
    await Inventory.insertMany(mockData.inventory);
    
    console.log('Seeding Batches...');
    await Batch.insertMany(mockData.activeBatches);
    
    console.log('Seeding Transactions...');
    if(mockData.transactions.length > 0) {
        await Transaction.insertMany(mockData.transactions);
    }
    
    console.log('Seeding Costings...');
    await Costing.insertMany(mockData.costings);

    console.log('Seeding Quotations...');
    await Quotation.insertMany([
        {
            id: "QT-88392",
            customerId: "c-001",
            customerName: "Chennai Silks",
            date: "2026-08-15",
            status: "Draft",
            items: [
                { name: "Premium Polo Shirt", qty: 200, rate: 450, total: 90000 },
                { name: "Organic Cotton Tee", qty: 500, rate: 300, total: 150000 }
            ],
            totalAmount: 252000,
            notes: "5% discount applied on bulk polo order."
        },
        {
            id: "QT-73921",
            customerId: "c-002",
            customerName: "Arvind Fashions",
            date: "2026-08-14",
            status: "Sent",
            items: [
                { name: "Denim Jackets SS26", qty: 100, rate: 1200, total: 120000 }
            ],
            totalAmount: 126000,
            notes: "Standard terms: 50% advance."
        }
    ]);

    console.log('Data seeding completed successfully!');
    process.exit(0);
}

seedData().catch(err => {
    console.error('Seeding error:', err);
    process.exit(1);
});
