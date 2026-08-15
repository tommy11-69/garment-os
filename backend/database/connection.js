const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

async function connectDB() {
    try {
        // We read compass-connections.json just to be faithful to the user's setup, though usually this comes from env vars.
        const connectionsPath = path.join(__dirname, 'compass-connections.json');
        let connectionString = 'mongodb://localhost:27017/garment_os';
        
        if (fs.existsSync(connectionsPath)) {
            const data = JSON.parse(fs.readFileSync(connectionsPath, 'utf8'));
            if (data.connections && data.connections.length > 0) {
                const url = data.connections[0].connectionOptions.connectionString;
                // append db name if needed
                connectionString = url.endsWith('/') ? `${url}garment_os` : `${url}/garment_os`;
            }
        }

        await mongoose.connect(connectionString, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        
        console.log(`MongoDB Connected: ${connectionString}`);
    } catch (error) {
        console.error('Error connecting to MongoDB:', error.message);
        process.exit(1);
    }
}

module.exports = connectDB;
