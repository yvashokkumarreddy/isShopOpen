const mongoose = require('mongoose');
require('dotenv').config({ path: 'api/.env' });
const Shop = require('./api/models/Shop');

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to DB");
        const shops = await Shop.find({});
        console.log(`Found ${shops.length} shops.`);
        shops.forEach(s => {
            console.log(`- ${s.name}: [${s.coordinates.coordinates}] (${s.location})`);
        });
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

run();
