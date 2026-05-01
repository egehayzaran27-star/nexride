const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

/**
 * Admin yetkisi kontrolü.
 * Veritabanındaki role='admin' alanını kontrol eder.
 * Hardcoded e-posta listesi KALDIRILDI — güvenli DB tabanlı kontrol.
 */
const adminMiddleware = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, error: 'Yetkisiz.' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const adminEmails = ['egehayzaran27@gmail.com', 'sıdkıhayzaran@gmail.com'];
        
        console.log(`[AdminMiddleware] Check: ${decoded.email}, Role: ${decoded.role}`);

        if (decoded.role !== 'admin' && !adminEmails.includes(decoded.email)) {
            console.warn(`[AdminMiddleware] ACCESS DENIED for ${decoded.email}`);
            return res.status(403).json({ success: false, error: 'Bu işlem için yetkiniz yok.' });
        }

        req.user = decoded;
        next();
    } catch (err) {
        console.error('[AdminMiddleware] Auth Error:', err.message);
        res.status(401).json({ success: false, error: 'Geçersiz veya süresi dolmuş oturum.' });
    }
};

module.exports = { adminMiddleware };
