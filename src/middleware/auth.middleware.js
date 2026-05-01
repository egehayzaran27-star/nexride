const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

/**
 * Standart JWT doğrulama middleware'i.
 * Authorization: Bearer <token> header'ı gerektirir.
 */
const authMiddleware = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, error: 'Yetkisiz erişim.' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ success: false, error: 'Geçersiz token.' });
    }
};

module.exports = { authMiddleware };
