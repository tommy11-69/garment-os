const mongoose = require('mongoose');

let cachedConnection = null;

/**
 * Connect to MongoDB with connection caching for serverless/worker environments.
 * @param {string} [customUri] - Optional connection URI (e.g. from Worker env)
 * @returns {Promise<mongoose.Connection>}
 */
async function connectDB(customUri) {
    // Return existing active connection if ready
    if (cachedConnection && mongoose.connection.readyState === 1) {
        return cachedConnection;
    }

    const uri = customUri || process.env.MONGODB_URI || 'mongodb://localhost:27017/garment_os';

    try {
        const conn = await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 5000,
            bufferCommands: false // Disable buffering for serverless/worker environments
        });

        cachedConnection = conn;
        console.log('MongoDB connection established');
        return cachedConnection;
    } catch (error) {
        console.error('Error connecting to MongoDB:', error.message);
        throw error;
    }
}

module.exports = connectDB;
