const express = require('express');
const userDb = require('../../user-db');
const { authMiddleware } = require('../middleware/auth.middleware');

const router = express.Router();

// POST /api/drivers/become-driver
router.post('/become-driver', authMiddleware, async (req, res, next) => {
    try {
        console.log('📝 Sürücü başvurusu geldi:', req.body);
        const result = userDb.becomeDriver(req.user.id, req.body);
        console.log('✅ Başvuru sonucu:', result);
        if (result.success) res.json(result);
        else res.status(400).json(result);
    } catch (err) {
        next(err);
    }
});

// PATCH /api/drivers/availability
router.patch('/availability', authMiddleware, async (req, res, next) => {
    try {
        const { isAvailable } = req.body;
        const result = userDb.updateDriverAvailability(req.user.id, isAvailable);
        res.json({ success: true, isAvailable });
    } catch (err) {
        next(err);
    }
});

// GET /api/drivers
router.get('/', async (req, res, next) => {
    try {
        const drivers = userDb.getDriversWithAvgRatings();
        res.json(drivers);
    } catch (err) {
        next(err);
    }
});

// GET /api/drivers/available
router.get('/available', async (req, res, next) => {
    try {
        const drivers = userDb.getAvailableDrivers();
        res.json(drivers);
    } catch (err) {
        next(err);
    }
});

const { adminMiddleware } = require('../middleware/admin.middleware');

// DELETE /api/drivers/:id
router.delete('/:id', adminMiddleware, async (req, res, next) => {
    try {
        console.log(`[Admin] Deleting driver with ID: ${req.params.id}`);
        const result = userDb.deleteDriver(req.params.id);
        if (result) {
            console.log(`[Admin] Driver ${req.params.id} deleted successfully.`);
            res.json({ success: true, message: 'Sürücü silindi.' });
        } else {
            console.warn(`[Admin] Driver ${req.params.id} not found.`);
            res.status(404).json({ success: false, error: 'Sürücü bulunamadı.' });
        }
    } catch (err) {
        console.error(`[Admin] Error deleting driver ${req.params.id}:`, err);
        next(err);
    }
});

module.exports = router;
