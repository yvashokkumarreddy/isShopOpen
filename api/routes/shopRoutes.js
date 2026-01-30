const express = require('express');
const router = express.Router();
const Shop = require('../models/Shop');
const StatusLog = require('../models/StatusLog');

// @route   GET /api/shops
// @desc    Get all shops (sorted by recentness or distance)
router.get('/', async (req, res) => {
    try {
        const { search, lat, lng } = req.query;
        let query = {};

        // 1. Text Filter
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { category: { $regex: search, $options: 'i' } }
            ];
        }

        let shops;

        // 2. CHECK "SHOW ALL" MODE
        const showAll = req.query.all === 'true';

        if (showAll) {
            // Return everything, sorted by newest
            shops = await Shop.find(query).sort({ lastStatusUpdate: -1 }).limit(100);
        }
        // 3. Location Filter
        else if (lat && lng && lat !== 'null' && lng !== 'null') {
            shops = await Shop.find({
                ...query,
                coordinates: {
                    $near: {
                        $geometry: {
                            type: "Point",
                            coordinates: [parseFloat(lng), parseFloat(lat)]
                        }
                        // No maxDistance to ensure all test data is shown
                    }
                }
            }).limit(50);
        } else {
            // 4. Default: Recent
            shops = await Shop.find(query)
                .sort({ lastStatusUpdate: -1 })
                .limit(50);
        }

        res.json(shops);
    } catch (err) {
        console.error("Local DB Fetch Error:", err.message);
        res.status(500).json({ message: err.message });
    }
});



// @route   POST /api/shops
// @desc    Create a new shop
router.post('/', async (req, res) => {
    try {
        console.log("Data received at backend:", req.body);
        const newShop = new Shop({
            name: req.body.name,
            category: req.body.category,
            location: req.body.location,
            status: req.body.status || 'OPEN',
            reportCount: 1, // Initial report by creator
            openTime: req.body.openTime,
            closeTime: req.body.closeTime,
            coordinates: req.body.coordinates
        });

        const savedShop = await newShop.save();
        res.status(201).json(savedShop);
    } catch (err) {
        console.error("Validation Error:", err.message);
        res.status(400).json({ message: err.message });
    }
});




// Update shop status (Upsert for external shops)
router.post('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, shopDetails } = req.body;

        let shop;

        // 1. Try finding by MongoDB ID (if valid ObjectId)
        if (require('mongoose').Types.ObjectId.isValid(id)) {
            shop = await Shop.findById(id);
        }

        // 2. If not found, try finding by External ID
        if (!shop) {
            shop = await Shop.findOne({ externalId: id });
        }

        // 3. If still not found and we have details, CREATE IT (Migration from External -> Local)
        if (!shop && shopDetails) {
            console.log(`Migrating external shop ${id} to local DB...`);
            shop = new Shop({
                externalId: id,
                name: shopDetails.name,
                category: shopDetails.category || 'Unknown',
                location: shopDetails.location || 'Unknown Location',
                coordinates: shopDetails.coordinates,
                openTime: shopDetails.openTime,
                closeTime: shopDetails.closeTime,
                status: status,
                reportCount: 0 // Will increment below
            });
        } else if (!shop) {
            return res.status(404).json({ message: 'Shop not found and no details provided for creation' });
        }

        // Update Fields
        shop.status = status;
        shop.lastStatusUpdate = Date.now();
        shop.reportCount = (shop.reportCount || 0) + 1;

        await shop.save();
        res.json(shop);

    } catch (err) {
        console.error("Error updating/migrating shop:", err.message);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;