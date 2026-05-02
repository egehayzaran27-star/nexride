const express = require('express');
const router = express.Router();
const mapsService = require('../services/maps.service');

/**
 * @route GET /api/maps/route
 * @desc İki nokta arasındaki yol rotasını getirir
 */
router.get('/route', async (req, res) => {
    const { startLat, startLng, endLat, endLng } = req.query;

    if (!startLat || !startLng || !endLat || !endLng) {
        return res.status(400).json({ error: 'Eksik koordinat bilgisi.' });
    }

    try {
        const route = await mapsService.getRoute(
            [parseFloat(startLat), parseFloat(startLng)],
            [parseFloat(endLat), parseFloat(endLng)]
        );
        res.json({ success: true, route });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * @route GET /api/maps/snap
 * @desc Ham koordinatı en yakın yola kilitler
 */
router.get('/snap', async (req, res) => {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
        return res.status(400).json({ error: 'Eksik koordinat bilgisi.' });
    }

    try {
        const snapped = await mapsService.snapToRoad(parseFloat(lat), parseFloat(lng));
        res.json({ success: true, snapped });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
