const express = require('express');
const rateLimit = require('express-rate-limit');
const userDb = require('../../user-db');
const { authMiddleware } = require('../middleware/auth.middleware');
const { sendVerificationEmail } = require('../services/email.service');

const router = express.Router();

const emailLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    keyGenerator: (req) => req.body.email || req.ip,
    validate: { keyGeneratorIpFallback: false },
    message: { error: 'E-posta gönderim sınırı aşıldı. Lütfen daha sonra tekrar deneyin.' }
});


// POST /api/wallet/send-email
router.post('/send-email', emailLimiter, async (req, res, next) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'E-posta gerekli.' });

    try {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 dk geçerli

        userDb.addVerificationCode(email, code, expiresAt.toISOString());

        await sendVerificationEmail(email, code);

        res.json({ success: true, message: 'Doğrulama kodu e-postanıza gönderildi.' });
    } catch (error) {
        next(error);
    }
});

// GET /api/wallet/balance/:userId
router.get('/balance/:userId', authMiddleware, async (req, res, next) => {
    try {
        const balance = userDb.getUserBalance(req.params.userId);
        res.json({ balance });
    } catch (err) {
        next(err);
    }
});

// POST /api/wallet/deposit
router.post('/deposit', authMiddleware, async (req, res, next) => {
    const { userId, amount, code } = req.body;
    
    try {
        const user = userDb.getUserById(userId);
        if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });

        const savedCode = userDb.getVerificationCode(user.email);
        if (!savedCode || savedCode.code !== code) {
            return res.status(400).json({ error: 'Geçersiz doğrulama kodu.' });
        }

        if (new Date(savedCode.expires_at) < new Date()) {
            return res.status(400).json({ error: 'Doğrulama kodunun süresi dolmuş.' });
        }

        const result = userDb.addBalance(userId, amount);
        if (result.success) {
            userDb.deleteVerificationCode(user.email);
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        next(error);
    }
});

// POST /api/wallet/transfer
router.post('/transfer', authMiddleware, async (req, res, next) => {
    try {
        const { fromUserId, toEmail, amount } = req.body;
        const result = userDb.transferMoney(fromUserId, toEmail, amount);
        if (result.success) res.json(result);
        else res.status(400).json(result);
    } catch (err) {
        next(err);
    }
});

// GET /api/wallet/transactions/:userId
router.get('/transactions/:userId', authMiddleware, async (req, res, next) => {
    try {
        const transactions = userDb.getTransactions(req.params.userId);
        res.json(transactions);
    } catch (err) {
        next(err);
    }
});

// POST /api/wallet/pay
router.post('/pay', authMiddleware, async (req, res, next) => {
    const { userId, bookingId, method, code } = req.body;

    try {
        if (method !== 'Cash') {
            const user = userDb.getUserById(userId);
            if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });

            const savedCode = userDb.getVerificationCode(user.email);
            if (!savedCode || savedCode.code !== code) {
                return res.status(400).json({ error: 'Geçersiz veya eksik doğrulama kodu.' });
            }

            if (new Date(savedCode.expires_at) < new Date()) {
                return res.status(400).json({ error: 'Doğrulama kodunun süresi dolmuş.' });
            }
            userDb.deleteVerificationCode(user.email);
        }

        const result = userDb.payForBooking(userId, bookingId, method);
        if (result.success) res.json(result);
        else res.status(400).json(result);
    } catch (error) {
        next(error);
    }
});

// POST /api/wallet/tip
router.post('/tip', authMiddleware, async (req, res, next) => {
    const { userId, bookingId, amount } = req.body;
    try {
        const result = userDb.addTipToBooking(userId, bookingId, amount);
        if (result.success) res.json(result);
        else res.status(400).json(result);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
