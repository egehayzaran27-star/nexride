const express = require('express');
const userDb = require('../../user-db');
const { adminMiddleware } = require('../middleware/admin.middleware');
const { authMiddleware } = require('../middleware/auth.middleware');

const router = express.Router();

// GET /api/admin/users
router.get('/users', adminMiddleware, async (req, res, next) => {
    try {
        const { q } = req.query;
        const users = q ? userDb.searchUsers(q) : userDb.getAllUsers();
        res.json(users);
    } catch (err) {
        next(err);
    }
});

// PATCH /api/admin/users/:id
router.patch('/users/:id', authMiddleware, async (req, res, next) => {
    try {
        // Sadece kendi profilini güncelleyebilir (Admin değilse)
        if (req.user.role !== 'admin' && req.user.id != req.params.id) {
            return res.status(403).json({ error: 'Yetkisiz işlem.' });
        }

        const success = userDb.updateUser(req.params.id, req.body);
        if (success) res.json({ success: true, message: 'Profil güncellendi.' });
        else res.status(400).json({ success: false, error: 'Güncelleme başarısız.' });
    } catch (err) {
        next(err);
    }
});

// PATCH /api/admin/users/:id/password
router.patch('/users/:id/password', authMiddleware, async (req, res, next) => {
    try {
        const { oldPassword, newPassword } = req.body;
        
        if (req.user.id != req.params.id) {
            return res.status(403).json({ error: 'Yetkisiz işlem.' });
        }

        const result = await userDb.updateUserPassword(req.params.id, oldPassword, newPassword);
        if (result.success) res.json(result);
        else res.status(400).json(result);
    } catch (err) {
        next(err);
    }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', adminMiddleware, async (req, res, next) => {
    try {
        const result = userDb.deleteUser(req.params.id);
        if (result) res.json({ success: true, message: 'Kullanıcı silindi.' });
        else res.status(404).json({ success: false, error: 'Kullanıcı bulunamadı.' });
    } catch (err) {
        next(err);
    }
});

// GET /api/admin/all-bookings
router.get('/all-bookings', adminMiddleware, async (req, res, next) => {
    try {
        const { q, page = 1, limit = 20 } = req.query;
        
        if (q) {
            const bookings = userDb.searchBookings(q);
            return res.json(bookings);
        }
        
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
});

let TAXI_STATIONS = [
    { id: 1, name: "Kızılay Merkez Taksi", lat: 39.9208, lng: 32.8541 },
    { id: 2, name: "Tunalı Hilmi Taksi", lat: 39.9075, lng: 32.8625 },
    { id: 3, name: "Bahçelievler 7. Cad. Taksi", lat: 39.9247, lng: 32.8228 },
    { id: 4, name: "Çankaya Atakule Taksi", lat: 39.8860, lng: 32.8548 },
    { id: 5, name: "Esat Dörtyol Taksi", lat: 39.9110, lng: 32.8690 },
    { id: 6, name: "Yenimahalle Metro Taksi", lat: 39.9670, lng: 32.8020 },
    { id: 7, name: "Keçiören Belediye Taksi", lat: 39.9780, lng: 32.8650 },
    { id: 8, name: "Anıttepe Taksi", lat: 39.9270, lng: 32.8420 }
];

router.get('/stations', (req, res) => {
    res.json(TAXI_STATIONS);
});

router.post('/stations', adminMiddleware, (req, res) => {
    const { name, lat, lng } = req.body;
    const newStation = {
        id: TAXI_STATIONS.length + 1,
        name,
        lat: parseFloat(lat),
        lng: parseFloat(lng)
    };
    TAXI_STATIONS.push(newStation);
    res.json({ success: true, station: newStation });
});

module.exports = router;
