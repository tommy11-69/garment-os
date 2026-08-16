const express = require('express');
const cors = require('cors');
const connectDB = require('./database/connection');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect to DB
connectDB();

// Models
const Customer = require('./models/Customer');
const Order = require('./models/Order');
const Inventory = require('./models/Inventory');
const Batch = require('./models/Batch');
const Transaction = require('./models/Transaction');
const Costing = require('./models/Costing');
const Shipment = require('./models/Shipment');
const Quotation = require('./models/Quotation');

const models = {
    customers: Customer,
    orders: Order,
    inventory: Inventory,
    batches: Batch,
    transactions: Transaction,
    costings: Costing,
    shipments: Shipment,
    quotations: Quotation
};

// Generic CRUD API routes

// GET all items (with optional pagination & search)
app.get('/api/:collection', async (req, res) => {
    try {
        const Model = models[req.params.collection];
        if (!Model) return res.status(404).json({ error: 'Collection not found' });
        
        let query = {};
        if (req.query.q && req.query.fields) {
            const fields = req.query.fields.split(',');
            const searchRegex = new RegExp(req.query.q, 'i');
            query = {
                $or: fields.map(field => ({ [field]: searchRegex }))
            };
        }

        const limit = parseInt(req.query.limit);
        const page = parseInt(req.query.page) || 1;

        if (limit) {
            const skip = (page - 1) * limit;
            const data = await Model.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit);
            const total = await Model.countDocuments(query);
            return res.json({
                data,
                total,
                page,
                totalPages: Math.ceil(total / limit)
            });
        }

        const data = await Model.find(query).sort({ createdAt: -1 });
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET item by id
app.get('/api/:collection/:id', async (req, res) => {
    try {
        const Model = models[req.params.collection];
        if (!Model) return res.status(404).json({ error: 'Collection not found' });
        
        const item = await Model.findOne({ id: req.params.id });
        if (!item) return res.status(404).json({ error: 'Item not found' });
        
        res.json(item);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST new item
app.post('/api/:collection', async (req, res) => {
    try {
        const Model = models[req.params.collection];
        if (!Model) return res.status(404).json({ error: 'Collection not found' });
        
        const data = req.body;
        if (!data.id) {
            data.id = `${req.params.collection.charAt(0)}-${Date.now()}`;
        }
        
        const newItem = new Model(data);
        await newItem.save();
        res.status(201).json(newItem);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT update item
app.put('/api/:collection/:id', async (req, res) => {
    try {
        const Model = models[req.params.collection];
        if (!Model) return res.status(404).json({ error: 'Collection not found' });
        
        const updated = await Model.findOneAndUpdate(
            { id: req.params.id }, 
            { $set: req.body },
            { new: true }
        );
        
        if (!updated) return res.status(404).json({ error: 'Item not found' });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE item
app.delete('/api/:collection/:id', async (req, res) => {
    try {
        const Model = models[req.params.collection];
        if (!Model) return res.status(404).json({ error: 'Collection not found' });
        
        const deleted = await Model.findOneAndDelete({ id: req.params.id });
        if (!deleted) return res.status(404).json({ error: 'Item not found' });
        
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
