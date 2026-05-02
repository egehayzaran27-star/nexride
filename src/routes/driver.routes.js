const express = require('express');
const DriverController = require('../controllers/driver.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

const router = express.Router();

// Herkese açık sürücü listesi
router.get('/available', authMiddleware, DriverController.getAvailable);

// Sürücüye özel işlemler
router.get('/stats', authMiddleware, DriverController.getStats);
router.post('/become-driver', authMiddleware, DriverController.becomeDriver);
router.patch('/status', authMiddleware, DriverController.toggleStatus);

module.exports = router;
