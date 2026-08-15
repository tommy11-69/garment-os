const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    company: String,
    initials: String,
    avatar: String,
    email: String,
    phone: String,
    status: String,
    statusColor: String
}, { timestamps: true });

module.exports = mongoose.model('Customer', customerSchema);
