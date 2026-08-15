const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    type: String,
    amount: Number,
    date: String,
    category: String,
    status: String,
    description: String,
    refId: String // Order or batch ref
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);
