const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: String,
    sku: String,
    quantity: Number,
    unit: String,
    status: String,
    statusColor: String,
    icon: String,
    iconColor: String,
    historicalAvgConsumption: Number
}, { timestamps: true });

module.exports = mongoose.model('Inventory', inventorySchema);
