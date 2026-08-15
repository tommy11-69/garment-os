const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    customerName: String,
    customerId: String,
    costingId: String,
    product: String,
    sizes: [String],
    colours: [String],
    qty: Number,
    
    unitPrice: Number,
    subtotal: Number,
    discount: Number,
    tax: Number,
    shipping: Number,
    grandTotal: Number,
    value: Number,
    incurredCost: Number,
    quotedCost: Number,
    
    status: String,
    statusColor: String,
    dateMonth: String,
    dateDay: String,
    deliveryDate: String,
    priority: String,
    
    factory: String,
    productionManager: String,
    merchandiser: String,
    progressPercentage: Number,
    progressLabel: String,
    progressColor: String,
    
    notes: String,
    
    timeline: [{
        date: String,
        title: String,
        user: String,
        type: { type: String },
        status: String
    }],
    tasks: [{
        id: String,
        title: String,
        assignee: String,
        status: String,
        completed: Boolean
    }],
    expenses: [{
        id: String,
        type: { type: String },
        amount: Number,
        date: String,
        notes: String
    }],
    paymentStatus: String,
    paymentReceived: Number,
    fabric: String,
    activityLog: [{
        note: String,
        user: String,
        date: String
    }]
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
