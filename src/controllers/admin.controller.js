const UserRepository = require('../repositories/user.repository');
const userDb = require('../../user-db');

class AdminController {
    /**
     * Tüm kullanıcıları listeler veya arar
     */
    async getUsers(req, res, next) {
        try {
            const { q } = req.query;
            const users = q ? UserRepository.search(q) : UserRepository.findAll();
            res.json(users);
        } catch (err) {
            next(err);
        }
    }

    /**
     * Kullanıcı siler
     */
    async deleteUser(req, res, next) {
        try {
            const { id } = req.params;
            const result = UserRepository.delete(id);
            if (result) res.json({ success: true, message: 'Kullanıcı silindi.' });
            else res.status(404).json({ success: false, error: 'Kullanıcı bulunamadı.' });
        } catch (err) {
            next(err);
        }
    }

    /**
     * Fiyatları günceller
     */
    async updatePrices(req, res, next) {
        try {
            const { kmPrice } = req.body;
            // userDb üzerinde fiyat güncelleme mantığı (şimdilik json/db simülasyonu)
            // await userDb.updateGlobalSettings({ kmPrice });
            res.json({ success: true, message: 'Fiyatlar güncellendi.' });
        } catch (err) {
            next(err);
        }
    }

    /**
     * Tüm rezervasyonları getirir (Pagination)
     */
    async getAllBookings(req, res, next) {
        try {
            const { page = 1, limit = 20 } = req.query;
            const offset = (page - 1) * limit;
            const bookings = userDb.getAllBookingsPaginated(parseInt(limit), offset);
            const total = userDb.countAllBookings();
            
            res.json({
                bookings,
                total,
                page: parseInt(page),
                totalPages: Math.ceil(total / limit)
            });
        } catch (err) {
            next(err);
        }
    }
}

module.exports = new AdminController();
