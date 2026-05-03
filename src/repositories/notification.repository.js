const userDb = require('../../user-db');

class NotificationRepository {
    /**
     * Kullanıcıya ait bildirimleri getirir
     */
    findByUserId(userId) {
        return userDb.getNotificationsByUserId(userId);
    }

    /**
     * Yeni bildirim oluşturur
     */
    create(userId, message) {
        return userDb.addNotification(userId, message);
    }

    /**
     * Bildirimi okundu olarak işaretler
     */
    markAsRead(id) {
        return userDb.markNotificationAsRead(id);
    }

    /**
     * Tüm bildirimleri okundu işaretler
     */
    markAllAsRead(userId) {
        return userDb.markAllNotificationsAsRead(userId);
    }
}

module.exports = new NotificationRepository();
