const mongoose = require('mongoose');

const costingSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    styleRef: String,
    clientId: String,
    totalUnitCost: Number,
    retailPrice: Number,
    status: String,
    date: String,
    materials: [{
        invId: String,
        estimatedConsumption: Number
    }]
}, { timestamps: true });

module.exports = mongoose.model('Costing', costingSchema);
