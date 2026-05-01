const express = require('express');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const userDb = require('../../user-db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

// Auth için rate limiter (15 dk'da 10 deneme)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { success: false, error: 'Çok fazla deneme yaptınız, lütfen 15 dakika sonra tekrar deneyin.' },
});

/**
 * TC Kimlik No doğrulaması (algoritma bazlı)
 */
function verifyWithNVI(tcNo) {
    if (!/^[1-9][0-9]{10}$/.test(tcNo)) return false;
    const d = tcNo.split('').map(Number);
    const d10 = (((d[0] + d[2] + d[4] + d[6] + d[8]) * 7) - (d[1] + d[3] + d[5] + d[7])) % 10;
    const d11 = (d[0] + d[1] + d[2] + d[3] + d[4] + d[5] + d[6] + d[7] + d[8] + d[9]) % 10;
    return d10 === d[9] && d11 === d[10];
}

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
    try {
        const { firstName, lastName, email, tcNo, password } = req.body;

        if (!firstName || !lastName || !email || !tcNo || !password) {
            return res.status(400).json({ success: false, error: 'Tüm alanlar zorunludur.' });
        }

        if (!verifyWithNVI(tcNo)) {
            return res.status(400).json({ success: false, error: 'Geçersiz TC Kimlik Numarası.' });
        }

        const result = await userDb.addUser(req.body);
        if (result.success) {
            res.status(201).json({ success: true, message: 'Kayıt başarılı.' });
        } else {
            res.status(400).json({ success: false, error: result.error });
        }
    } catch (err) {
        next(err);
    }
});

// POST /api/auth/login
router.post('/login', authLimiter, async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'E-posta ve şifre gereklidir.' });
        }

        const result = await userDb.checkUserCredentials(email, password);

        if (result.success) {
            const token = jwt.sign(
                { id: result.user.id, email: result.user.email, role: result.user.role },
                JWT_SECRET,
                { expiresIn: '24h' }
            );
            res.json({ success: true, user: result.user, token });
        } else {
            res.status(401).json({ success: false, error: result.error });
        }
    } catch (err) {
        next(err);
    }
});

module.exports = router;
