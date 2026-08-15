const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    orderId: String,
    description: String,
    phase: String,
    progress: Number,
    progressColor: String,
    expenses: [String],
    consumptions: [{
        invId: String,
        actualConsumption: Number,
        date: String
    }]
}, { timestamps: true });

module.exports = mongoose.model('Batch', batchSchema);
