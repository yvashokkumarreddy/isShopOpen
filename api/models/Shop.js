const mongoose = require('mongoose');

const shopSchema = new mongoose.Schema({
    externalId: { type: String, unique: true, sparse: true }, // For OSM/Google IDs
    name: { type: String, required: true },
    category: { type: String, required: true },
    location: { type: String, required: true }, // Address string
    status: { type: String, default: 'OPEN' },
    lastStatusUpdate: { type: Date, default: Date.now },
    reportCount: { type: Number, default: 0 },
    openTime: { type: String }, // e.g., "09:00"
    closeTime: { type: String }, // e.g., "22:00"
    // GeoJSON format for Leaflet/Google Maps compatibility
    coordinates: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], required: true } // [longitude, latitude]
    }
});

// This index is what makes the map fast and searchable by location
shopSchema.index({ coordinates: '2dsphere' });

module.exports = mongoose.model('Shop', shopSchema);