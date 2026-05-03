const NotificationRepository = require('../repositories/notification.repository');

class NotificationController {
    /**
     * Kullanıcının bildirimlerini getirir
     */
    async getNotifications(req, res, next) {
        try {
            const notifications = await NotificationRepository.findByUserId(req.user.id);
            res.json(notifications);
        } catch (err) {
            next(err);
        }
    }

    /**
     * Bildirimi okundu işaretler
     */
    async markAsRead(req, res, next) {
        try {
            const { id } = req.params;
            await NotificationRepository.markAsRead(id);
            res.json({ success: true });
        } catch (err) {
            next(err);
        }
    }

    /**
     * Tüm bildirimleri okundu işaretler
     */
    async markAllAsRead(req, res, next) {
        try {
            await NotificationRepository.markAllAsRead(req.user.id);
            res.json({ success: true });
        } catch (err) {
            next(err);
        }
    }
}

module.exports = new NotificationController();
