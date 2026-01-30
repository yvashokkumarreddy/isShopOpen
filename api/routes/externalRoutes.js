const express = require('express');
const router = express.Router();

// Helper: Fetch from OSM
const fetchFromOSM = async (lat, lng, radius) => {
    const r = radius || 2000;
    const query = `
        [out:json][timeout:25];
        (
          node["shop"](around:${r},${lat},${lng});
          node["amenity"="pharmacy"](around:${r},${lat},${lng});
          node["amenity"="bank"](around:${r},${lat},${lng});
          node["amenity"="atm"](around:${r},${lat},${lng});
          node["amenity"="fuel"](around:${r},${lat},${lng});
        );
        out body;
        >;
        out skel qt;
    `;

    const overpassUrl = 'https://overpass-api.de/api/interpreter';
    const response = await fetch(overpassUrl, {
        method: 'POST',
        body: query
    });

    if (!response.ok) {
        throw new Error(`Overpass API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.elements.map(item => {
        let category = 'Other';
        if (item.tags.shop === 'supermarket' || item.tags.shop === 'convenience') category = 'General Store';
        if (item.tags.amenity === 'pharmacy') category = 'Pharmacy';
        if (item.tags.amenity === 'bank' || item.tags.amenity === 'atm') category = 'Bank';
        if (item.tags.amenity === 'fuel') category = 'Gas Station';

        return {
            _id: `osm_${item.id}`,
            name: item.tags.name || `${category} (Unnamed)`,
            category: category,
            location: 'OpenStreetMap Data',
            coordinates: {
                type: 'Point',
                coordinates: [item.lon, item.lat]
            },
            status: 'UNCERTAIN',
            staticHours: item.tags.opening_hours || 'Not Specified',
            source: 'OSM'
        };
    }).filter(item => item.name);
};
// Helper: Mock Data Generator
const generateMockShops = (lat, lng) => {
    const categories = ['Pharmacy', 'General Store', 'Cafe', 'Bank'];
    const names = ['City Pharmacy', 'Daily Needs', 'Sunrise Cafe', 'SBI ATM'];

    return Array.from({ length: 5 }).map((_, i) => ({
        _id: `mock_${Date.now()}_${i}`,
        name: `${names[i % names.length]} (Demo)`,
        category: categories[i % categories.length],
        location: 'Demo Location Data',
        coordinates: {
            type: 'Point',
            coordinates: [
                parseFloat(lng) + (Math.random() * 0.01 - 0.005),
                parseFloat(lat) + (Math.random() * 0.01 - 0.005)
            ]
        },
        status: Math.random() > 0.3 ? 'OPEN' : 'CLOSED',
        staticHours: '9:00 AM - 10:00 PM',
        source: 'MOCK_DATA'
    }));
};

// @route   GET /api/external/google
// @desc    Fetch nearby places from Google Maps Places API (with OSM Fallback)
// @access  Public
router.get('/google', async (req, res) => {
    const { lat, lng, radius } = req.query;

    if (!lat || !lng) {
        return res.status(400).json({ message: 'Latitude and Longitude are required' });
    }

    const startGoogle = Date.now();

    try {
        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        if (!apiKey) throw new Error('No API Key');

        const r = radius || 2000;
        const url = 'https://places.googleapis.com/v1/places:searchNearby';

        const requestBody = {
            includedTypes: ['restaurant', 'cafe', 'pharmacy', 'bank', 'atm', 'supermarket', 'store'],
            maxResultCount: 20,
            locationRestriction: {
                circle: {
                    center: {
                        latitude: parseFloat(lat),
                        longitude: parseFloat(lng)
                    },
                    radius: parseFloat(r)
                }
            }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': apiKey,
                'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.types,places.regularOpeningHours,places.businessStatus'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Google API ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        const results = data.places || [];

        const shops = results.map(item => {
            const isOpenNow = item.regularOpeningHours ? item.regularOpeningHours.openNow : null;
            let status = 'UNCERTAIN';
            if (item.businessStatus === 'CLOSED_PERMANENTLY' || item.businessStatus === 'CLOSED_TEMPORARILY') {
                status = 'CLOSED';
            } else if (isOpenNow === true) {
                status = 'OPEN';
            } else if (isOpenNow === false) {
                status = 'CLOSED';
            }

            let category = 'Other';
            if (item.types) {
                if (item.types.includes('pharmacy')) category = 'Pharmacy';
                else if (item.types.includes('bank') || item.types.includes('atm')) category = 'Bank';
                else if (item.types.includes('cafe') || item.types.includes('restaurant')) category = 'Cafe';
                else if (item.types.includes('supermarket') || item.types.includes('convenience_store')) category = 'General Store';
                else if (item.types.length > 0) category = item.types[0].replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            }

            return {
                _id: `google_${item.id}`,
                name: item.displayName ? item.displayName.text : 'Unknown Place',
                category: category,
                location: item.formattedAddress || 'Google Maps Data',
                coordinates: {
                    type: 'Point',
                    coordinates: [item.location.longitude, item.location.latitude]
                },
                status: status,
                staticHours: isOpenNow !== null ? (isOpenNow ? 'Open Now' : 'Closed Now') : (item.businessStatus === 'OPERATIONAL' ? 'Hours not listed' : 'Closed'),
                source: 'Google'
            };
        });

        return res.json(shops);

    } catch (err) {
        console.error("Google Fetch Failed:", err.message);
        console.log("Falling back to OpenStreetMap...");

        try {
            const osmShops = await fetchFromOSM(lat, lng, radius);
            return res.json(osmShops);
        } catch (osmErr) {
            console.error("OSM Fallback Failed:", osmErr.message);
            console.log("Serving Mock Data as final fallback...");
            const mockShops = generateMockShops(lat, lng);
            return res.json(mockShops);
        }
    }
});

module.exports = router;
