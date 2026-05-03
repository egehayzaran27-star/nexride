const express = require('express');
const NotificationController = require('../controllers/notification.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/', authMiddleware, NotificationController.getNotifications);
router.patch('/:id/read', authMiddleware, NotificationController.markAsRead);
router.patch('/read-all', authMiddleware, NotificationController.markAllAsRead);

module.exports = router;
