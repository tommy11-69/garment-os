const mongoose = require('mongoose');

const shipmentSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    customerName: String,
    invoiceNo: String,
    status: String,
    courier: String,
    trackingNo: String,
    expectedDate: String,
    boxes: Number
}, { timestamps: true });

module.exports = mongoose.model('Shipment', shipmentSchema);
