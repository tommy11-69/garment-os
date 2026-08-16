require('dotenv').config();
const { createApp } = require('./app');
const connectDB = require('./database/connection');

const app = createApp();

const PORT = process.env.PORT || 5000;

// Connect to DB and start local HTTP server
connectDB()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch((err) => {
        console.error('Failed to start server:', err.message);
        process.exit(1);
    });
