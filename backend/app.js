const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

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

const ALLOWED_COLLECTIONS = new Set(Object.keys(models));

// Safe escape for regular expressions to prevent ReDoS attacks
function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Sanitizes field names to allow only safe alphanumeric properties
function isSafeFieldName(fieldName) {
    return typeof fieldName === 'string' && /^[a-zA-Z0-9_.]+$/.test(fieldName.trim()) && !fieldName.startsWith('$');
}

function createApp() {
    const app = express();

    // CORS Configuration: Allow specific origins or fallback to permissive during development
    const allowedOrigin = process.env.CORS_ORIGIN;
    if (allowedOrigin && allowedOrigin !== '*') {
        app.use(cors({
            origin: allowedOrigin.split(',').map(o => o.trim()),
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization']
        }));
    } else {
        app.use(cors());
    }

    // Native JSON parser middleware for nodejs_compat & standard Express without iconv-lite dependency
    app.use((req, res, next) => {
        if (req.body !== undefined) return next();
        if (req.method === 'GET' || req.method === 'HEAD') return next();
        
        let data = '';
        req.on('data', chunk => {
            data += chunk.toString();
        });
        req.on('end', () => {
            if (data.trim().length > 0) {
                try {
                    req.body = JSON.parse(data);
                } catch (e) {
                    return res.status(400).json({ error: 'Invalid JSON payload' });
                }
            } else {
                req.body = {};
            }
            next();
        });
    });

    // Health check endpoint
    app.get('/health', (req, res) => {
        const isDbConnected = mongoose.connection.readyState === 1;
        res.json({
            status: 'ok',
            database: isDbConnected ? 'connected' : 'disconnected'
        });
    });

    // Alias for /api/health
    app.get('/api/health', (req, res) => {
        const isDbConnected = mongoose.connection.readyState === 1;
        res.json({
            status: 'ok',
            database: isDbConnected ? 'connected' : 'disconnected'
        });
    });

    // Collection whitelist validation middleware
    function validateCollection(req, res, next) {
        const collection = req.params.collection;
        if (!ALLOWED_COLLECTIONS.has(collection)) {
            return res.status(404).json({ error: 'Collection not found' });
        }
        req.Model = models[collection];
        next();
    }

    // Generic CRUD API routes

    // GET all items (with optional search, pagination, and sorting)
    app.get('/api/:collection', validateCollection, async (req, res, next) => {
        try {
            const Model = req.Model;
            let query = {};

            if (req.query.q && req.query.fields) {
                const requestedFields = req.query.fields.split(',').map(f => f.trim()).filter(isSafeFieldName);
                if (requestedFields.length > 0) {
                    const safeSearch = escapeRegex(String(req.query.q));
                    const searchRegex = new RegExp(safeSearch, 'i');
                    query = {
                        $or: requestedFields.map(field => ({ [field]: searchRegex }))
                    };
                }
            }

            const limit = parseInt(req.query.limit, 10);
            const page = parseInt(req.query.page, 10) || 1;

            if (limit && limit > 0) {
                const skip = (page - 1) * limit;
                const [data, total] = await Promise.all([
                    Model.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
                    Model.countDocuments(query)
                ]);

                return res.json({
                    data,
                    total,
                    page,
                    totalPages: Math.ceil(total / limit)
                });
            }

            const data = await Model.find(query).sort({ createdAt: -1 }).lean();
            res.json(data);
        } catch (err) {
            next(err);
        }
    });

    // GET item by id
    app.get('/api/:collection/:id', validateCollection, async (req, res, next) => {
        try {
            const Model = req.Model;
            const item = await Model.findOne({ id: req.params.id }).lean();
            if (!item) {
                return res.status(404).json({ error: 'Item not found' });
            }
            res.json(item);
        } catch (err) {
            next(err);
        }
    });

    // POST new item
    app.post('/api/:collection', validateCollection, async (req, res, next) => {
        try {
            const Model = req.Model;
            const data = { ...req.body };

            if (!data.id) {
                data.id = `${req.params.collection.charAt(0)}-${Date.now()}`;
            }

            // Remove any dangerous mongo system fields if passed
            delete data._id;

            const newItem = new Model(data);
            await newItem.save();
            res.status(201).json(newItem);
        } catch (err) {
            next(err);
        }
    });

    // PUT update item
    app.put('/api/:collection/:id', validateCollection, async (req, res, next) => {
        try {
            const Model = req.Model;
            const updates = { ...req.body };

            // Prevent overwriting immutable primary identifiers
            delete updates._id;

            const updated = await Model.findOneAndUpdate(
                { id: req.params.id },
                { $set: updates },
                { new: true, runValidators: true }
            );

            if (!updated) {
                return res.status(404).json({ error: 'Item not found' });
            }
            res.json(updated);
        } catch (err) {
            next(err);
        }
    });

    // DELETE item
    app.delete('/api/:collection/:id', validateCollection, async (req, res, next) => {
        try {
            const Model = req.Model;
            const deleted = await Model.findOneAndDelete({ id: req.params.id });
            if (!deleted) {
                return res.status(404).json({ error: 'Item not found' });
            }
            res.json({ success: true });
        } catch (err) {
            next(err);
        }
    });

    // Production-safe central error handling middleware
    app.use((err, req, res, next) => {
        console.error('API Error:', err.message || err);
        const isProduction = process.env.NODE_ENV === 'production';
        res.status(err.status || 500).json({
            error: isProduction ? 'Internal Server Error' : (err.message || 'Unknown error occurred')
        });
    });

    return app;
}

module.exports = { createApp, models, ALLOWED_COLLECTIONS };
