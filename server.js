require('dotenv').config();
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const morgan = require('morgan');
const winston = require('winston');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');
const userDb = require('./user-db');

const app = express();
const PORT = process.env.PORT || 3001;

// Trust Proxy: Ngrok veya benzeri proxy arkasındayken IP adreslerini doğru almak için
app.set('trust proxy', 1);

// Winston Logger Setup
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' }),
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        })
    ]
});

// App-wide logger access
app.locals.logger = logger;

// Security Middlewares
app.use(helmet({
    contentSecurityPolicy: false,
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Statik dosyalar
app.use(express.static(path.join(__dirname, 'public')));

// MODÜLER ROUTE'LAR
const authRoutes = require('./src/routes/auth.routes');
const bookingRoutes = require('./src/routes/booking.routes');
const driverRoutes = require('./src/routes/driver.routes');
const walletRoutes = require('./src/routes/wallet.routes');
const adminRoutes = require('./src/routes/admin.routes');
const mapsRoutes = require('./src/routes/maps.routes');
const notificationRoutes = require('./src/routes/notification.routes');
const { errorHandler, notFoundHandler } = require('./src/middleware/error.middleware');
const { initSocket } = require('./src/services/socket.service');

// Root API montajı
app.use('/api', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/maps', mapsRoutes);
app.use('/api/notifications', notificationRoutes);

// Geriye dönük uyumluluk için ana dizindeki /api/send-email (eğer gerekirse)
app.post('/api/send-email', (req, res) => res.redirect(307, '/api/wallet/send-email'));

// Error Handling (Route'lardan sonra gelmeli)
app.use(notFoundHandler);
app.use(errorHandler);

// HTTP Server & Socket.io başlatma
const http = require('http');
const server = http.createServer(app);
const io = initSocket(server);

// App genelinde io erişimi
app.set('io', io);

// Sunucuyu başlat
if (require.main === module) {
    server.listen(PORT, '0.0.0.0', () => {
        logger.info(`🚀 Sunucu Hazır: http://localhost:${PORT}`);
        logger.info(`📂 Mod: ${process.env.NODE_ENV || 'development'}`);
    });
}

module.exports = app;
