const express = require('express');
const { authMiddleware } = require('../middleware/auth.middleware');
const BookingController = require('../controllers/booking.controller');
const userDb = require('../../user-db');

const router = express.Router();

// POST /api/bookings/ratings
router.post('/ratings', authMiddleware, BookingController.addRating);

// GET /api/bookings/my-bookings/:userId
router.get('/my-bookings/:userId', authMiddleware, BookingController.getMyBookings);

// GET /api/bookings/all (Sürücüler için tüm talepler)
router.get('/all', authMiddleware, async (req, res, next) => {
    try {
        const bookings = userDb.getAllBookingsPaginated(50, 0); 
        res.json(bookings);
    } catch (err) {
        next(err);
    }
});

// POST /api/bookings
router.post('/', authMiddleware, BookingController.create);

// PATCH /api/bookings/:id/status
router.patch('/:id/status', authMiddleware, BookingController.updateStatus);

// PATCH /api/bookings/:id/cancel
router.patch('/:id/cancel', authMiddleware, async (req, res, next) => {
    try {
        const booking = userDb.getBookingById(req.params.id);
        if (!booking) return res.status(404).json({ error: 'Rezervasyon bulunamadı.' });
        if (req.user.role !== 'admin' && booking.userId !== req.user.id) {
            return res.status(403).json({ error: 'Yetkisiz işlem.' });
        }
        const result = userDb.cancelBookingWithRefund(req.params.id);
        res.json(result);
    } catch (err) {
        next(err);
    }
});

// GET /api/booking-updates/:userId (SSE)
router.get('/booking-updates/:userId', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    const interval = setInterval(() => {
        const bookings = userDb.getBookingsByUserId(req.params.userId);
        res.write(`data: ${JSON.stringify(bookings)}\n\n`);
    }, 5000);
    req.on('close', () => clearInterval(interval));
});

module.exports = router;
