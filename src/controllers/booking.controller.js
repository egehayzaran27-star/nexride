const BookingService = require('../services/booking.service');
const userDb = require('../../user-db');

class BookingController {
    /**
     * Yeni bir rezervasyon oluşturur
     */
    async create(req, res, next) {
        try {
            const io = req.app.get('io');
            const result = await BookingService.createBookingRequest(req.body, io);
            
            if (result.success) {
                return res.status(201).json(result);
            }
            return res.status(400).json(result);
        } catch (err) {
            next(err);
        }
    }

    /**
     * Rezervasyon durumunu günceller (Sürücü kabul/tamamlama vb.)
     */
    async updateStatus(req, res, next) {
        try {
            const { status } = req.body;
            const { id } = req.params;
            const io = req.app.get('io');
            
            const result = await BookingService.updateBookingStatus(id, status, io);
            if (result.success) {
                return res.json({ success: true });
            }
            return res.status(404).json({ error: result.error });
        } catch (err) {
            next(err);
        }
    }

    /**
     * Kullanıcının kendi rezervasyonlarını getirir
     */
    async getMyBookings(req, res, next) {
        try {
            const { userId } = req.params;
            const bookings = userDb.getBookingsByUserId(userId);
            res.json(bookings);
        } catch (err) {
            next(err);
        }
    }

    /**
     * Sürücü puanlama
     */
    async addRating(req, res, next) {
        try {
            const result = userDb.addRating(req.body);
            if (result.success) {
                return res.status(201).json(result);
            }
            return res.status(400).json(result);
        } catch (err) {
            next(err);
        }
    }
}

module.exports = new BookingController();
