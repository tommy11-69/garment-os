const connectDB = require('../database/connection');
const mongoose = require('mongoose');
const Customer = require('../models/Customer');
const Order = require('../models/Order');
const Inventory = require('../models/Inventory');
const Batch = require('../models/Batch');
const Transaction = require('../models/Transaction');
const Costing = require('../models/Costing');

async function seedData() {
    await connectDB();
    console.log('Clearing existing data...');
    await Customer.deleteMany();
    await Order.deleteMany();
    await Inventory.deleteMany();
    await Batch.deleteMany();
    await Transaction.deleteMany();
    await Costing.deleteMany();

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

    console.log('Data seeding completed successfully!');
    process.exit(0);
}

seedData().catch(err => {
    console.error('Seeding error:', err);
    process.exit(1);
});
