const express = require('express');
const AdminController = require('../controllers/admin.controller');
const { adminMiddleware } = require('../middleware/admin.middleware');
const { authMiddleware } = require('../middleware/auth.middleware');
const UserRepository = require('../repositories/user.repository');

const router = express.Router();

// Kullanıcı Yönetimi
router.get('/users', adminMiddleware, AdminController.getUsers);
router.delete('/users/:id', adminMiddleware, AdminController.deleteUser);

// Rezervasyon Yönetimi
router.get('/all-bookings', adminMiddleware, AdminController.getAllBookings);

// Profil Güncelleme (Auth katmanında da olabilir)
router.patch('/users/:id', authMiddleware, async (req, res, next) => {
    try {
        if (req.user.role !== 'admin' && req.user.id != req.params.id) {
            return res.status(403).json({ error: 'Yetkisiz işlem.' });
        }
        const success = UserRepository.update(req.params.id, req.body);
        if (success) res.json({ success: true, message: 'Profil güncellendi.' });
        else res.status(400).json({ success: false, error: 'Güncelleme başarısız.' });
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

router.get('/stations', (req, res) => res.json(TAXI_STATIONS));

module.exports = router;
