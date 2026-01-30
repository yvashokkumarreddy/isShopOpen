const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Improved MongoDB Connection Logic
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/shopStatusDB';

mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch((err) => console.error('❌ Connection Error:', err.message));

// Debugging: Log every request to see the incoming data
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`, req.body);
    next();
});

app.get('/', (req, res) => {
    res.send('OpenNow API Running');
});

// Routes
const shopRoutes = require('./routes/shopRoutes');
const externalRoutes = require('./routes/externalRoutes');

app.use('/api/shops', shopRoutes);
app.use('/api/external', externalRoutes);

// Only start server if run directly (Local Dev), otherwise export for Vercel
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);

        // --- BACKGROUND TASK: AUTO-EXPIRE STATUS ---
        const Shop = require('./models/Shop');
        setInterval(async () => {
            try {
                const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

                // Find shops that are OPEN/CLOSED but haven't been updated in 1 hour
                const result = await Shop.updateMany(
                    {
                        lastStatusUpdate: { $lt: oneHourAgo },
                        status: { $in: ['OPEN', 'CLOSED'] }
                    },
                    {
                        $set: { status: 'UNCERTAIN' }
                    }
                );

                if (result.modifiedCount > 0) {
                    console.log(`⏳ Auto-expired ${result.modifiedCount} shops to UNCERTAIN status.`);
                }
            } catch (err) {
                console.error("Auto-expire Error:", err);
            }
        }, 60 * 1000); // Run every 60 seconds
    });
}

module.exports = app;