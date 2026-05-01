/**
 * Global hata yakalama middleware'i.
 * Tüm endpointlerde tutarlı { success: false, error: "..." } formatı döner.
 * server.js'de tüm route'lardan SONRA tanımlanmalı.
 */
const errorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Sunucu hatası oluştu.';

    // Loglama (winston varsa kullan, yoksa console)
    if (req.app.locals.logger) {
        req.app.locals.logger.error(`[${req.method}] ${req.path} → ${message}`, { stack: err.stack });
    } else {
        console.error(`[ERROR] [${req.method}] ${req.path}:`, message);
    }

    res.status(statusCode).json({ success: false, error: message });
};

/**
 * 404 — Bilinmeyen route handler
 */
const notFoundHandler = (req, res) => {
    res.status(404).json({ success: false, error: `Endpoint bulunamadı: ${req.method} ${req.path}` });
};

module.exports = { errorHandler, notFoundHandler };
