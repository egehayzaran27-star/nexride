const express = require('express');
const rateLimit = require('express-rate-limit');
const WalletController = require('../controllers/wallet.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

const router = express.Router();

const emailLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    keyGenerator: (req) => req.body.email || req.ip,
    validate: { keyGeneratorIpFallback: false },
    message: { error: 'E-posta sınırı aşıldı.' }
});

// E-posta ve Doğrulama
router.post('/send-email', emailLimiter, WalletController.sendEmail);

// Bakiye ve İşlemler
router.get('/balance/:userId', authMiddleware, async (req, res, next) => {
    try {
        const WalletRepository = require('../repositories/wallet.repository');
        const balance = WalletRepository.getBalance(req.params.userId);
        res.json({ balance });
    } catch (err) { next(err); }
});

router.post('/deposit', authMiddleware, WalletController.deposit);
router.get('/transactions/:userId', authMiddleware, WalletController.getTransactions);

// Ödeme ve Bahşiş
router.post('/pay', authMiddleware, WalletController.pay);
router.post('/tip', authMiddleware, async (req, res, next) => {
    try {
        const WalletRepository = require('../repositories/wallet.repository');
        const result = WalletRepository.addTip(req.body.userId, req.body.bookingId, req.body.amount);
        res.json(result);
    } catch (err) { next(err); }
});

module.exports = router;

module.exports = router;
