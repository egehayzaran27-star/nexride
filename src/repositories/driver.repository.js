const userDb = require('../../user-db');

class DriverRepository {
    /**
     * Tüm müsait sürücüleri getirir
     */
    findAvailable() {
        return userDb.getAvailableDrivers();
    }

    /**
     * Koordinat bazlı yakın sürücüleri getirir
     */
    findNearby(lat, lng, radiusKm = 5) {
        return userDb.getNearbyDrivers(lat, lng, radiusKm);
    }

    /**
     * Sürücü konumunu günceller
     */
    updateLocation(driverId, lat, lng) {
        return userDb.updateDriverLocation(driverId, lat, lng);
    }

    /**
     * Sürücü durumunu günceller (Müsait/Meşgul)
     */
    updateStatus(driverId, isAvailable) {
        return userDb.updateDriverStatus(driverId, isAvailable);
    }

    /**
     * Yeni sürücü kaydı oluşturur
     */
    create(driverData) {
        return userDb.becomeDriver(driverData);
    }

    /**
     * Sürücü istatistiklerini getirir
     */
    getStats(driverId) {
        return userDb.getDriverStats(driverId);
    }
}

module.exports = new DriverRepository();
