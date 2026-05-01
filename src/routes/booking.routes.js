const express = require('express');
const userDb = require('../../user-db');
const { authMiddleware } = require('../middleware/auth.middleware');

const BookingService = require('../services/booking.service');

const router = express.Router();

// GET /api/bookings/my-bookings/:userId
router.get('/my-bookings/:userId', authMiddleware, async (req, res, next) => {
    try {
        const bookings = userDb.getBookingsByUserId(req.params.userId);
        res.json(bookings);
    } catch (err) {
        next(err);
    }
});

// GET /api/bookings/all (Sürücüler için tüm talepler)
router.get('/all', authMiddleware, async (req, res, next) => {
    try {
        // Offset ve limit parametreleri eklenebilir, şimdilik basit tutuyoruz
        const bookings = userDb.getAllBookingsPaginated(50, 0); 
        res.json(bookings);
    } catch (err) {
        next(err);
    }
});

// POST /api/bookings
router.post('/', authMiddleware, async (req, res, next) => {
    try {
        const io = req.app.get('io');
        const result = await BookingService.createBookingRequest(req.body, io);
        
        if (result.success) res.status(201).json(result);
        else res.status(400).json(result);
    } catch (err) {
        next(err);
    }
});


// PATCH /api/bookings/:id/status
router.patch('/:id/status', authMiddleware, async (req, res, next) => {
    try {
        const { status } = req.body;
        const allowed = ['Onaylandı', 'Yolda', 'Tamamlandı', 'İptal Edildi'];
        if (!allowed.includes(status)) return res.status(400).json({ error: 'Geçersiz durum.' });
        
        const io = req.app.get('io');
        const result = await BookingService.updateBookingStatus(req.params.id, status, io);
        if (result.success) res.json({ success: true });
        else res.status(404).json({ error: result.error });
    } catch (err) {
        next(err);
    }
});

// PATCH /api/bookings/:id/cancel
router.patch('/:id/cancel', authMiddleware, async (req, res, next) => {
    try {
        const booking = userDb.getBookingById(req.params.id);
        if (!booking) return res.status(404).json({ error: 'Rezervasyon bulunamadı.' });
        
        if (req.user.role !== 'admin' && booking.userId !== req.user.id) {
            return res.status(403).json({ error: 'Yetkisiz işlem.' });
        }
        
        if (booking.status !== 'Bekliyor' && booking.status !== 'Ödendi') {
            return res.status(400).json({ error: 'Bu rezervasyon artık iptal edilemez.' });
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
