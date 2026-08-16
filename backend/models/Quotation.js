const mongoose = require('mongoose');

const quotationSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    customerId: { type: String, required: true },
    customerName: { type: String, required: true },
    date: { type: String, required: true },
    status: { type: String, default: 'Draft' }, // Draft, Sent, Accepted, Rejected
    showFabric: { type: Boolean, default: false },
    showColour: { type: Boolean, default: false },
    showTax: { type: Boolean, default: true },
    items: [{
        name: { type: String, required: true },
        fabric: String,
        colour: String,
        qty: { type: Number, required: true },
        rate: { type: Number, required: true },
        taxPerPc: { type: Number, default: 0 },
        total: { type: Number, required: true }
    }],
    totalAmount: { type: Number, required: true },
    notes: String
}, { timestamps: true });

module.exports = mongoose.model('Quotation', quotationSchema);
