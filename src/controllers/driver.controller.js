const DriverRepository = require('../repositories/driver.repository');

class DriverController {
    /**
     * Müsait sürücüleri listeler
     */
    async getAvailable(req, res, next) {
        try {
            const drivers = await DriverRepository.findAvailable();
            res.json(drivers);
        } catch (err) {
            next(err);
        }
    }

    /**
     * Tüm sürücüleri listeler
     */
    async getAll(req, res, next) {
        try {
            const drivers = await DriverRepository.findAll();
            res.json(drivers);
        } catch (err) {
            next(err);
        }
    }

    /**
     * Sürücü istatistiklerini getirir
     */
    async getStats(req, res, next) {
        try {
            const driverId = req.user.id;
            const stats = await DriverRepository.getStats(driverId);
            res.json(stats);
        } catch (err) {
            next(err);
        }
    }

    /**
     * Sürücü olma başvurusu / güncelleme
     */
    async becomeDriver(req, res, next) {
        try {
            const result = await DriverRepository.create({
                userId: req.user.id,
                ...req.body
            });
            if (result.success) {
                res.json({ success: true, message: 'Sürücü kaydı güncellendi.' });
            } else {
                res.status(400).json({ success: false, error: 'İşlem başarısız.' });
            }
        } catch (err) {
            next(err);
        }
    }

    /**
     * Sürücü müsaitlik durumunu değiştirir
     */
    async toggleStatus(req, res, next) {
        try {
            const { isAvailable } = req.body;
            const result = await DriverRepository.updateStatus(req.user.id, isAvailable);
            res.json({ success: true, isAvailable });
        } catch (err) {
            next(err);
        }
    }
}

module.exports = new DriverController();
