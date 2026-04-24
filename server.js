require('dotenv').config();
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const morgan = require('morgan');
const jwt = require('jsonwebtoken');
const userDb = require('./user-db');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

// Security Middlewares
app.use(helmet({
    contentSecurityPolicy: false, // Leaflet için CSP'yi esnetiyoruz
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Statik dosyalar
app.use(express.static(path.join(__dirname, 'public')));

// JWT Middleware
const authMiddleware = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Yetkisiz erişim.' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Geçersiz token.' });
    }
};

/**
 * Kimlik Doğrulama Simülasyonu
 */
async function verifyWithNVI(tcNo) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (tcNo.length === 11) resolve(true);
            else reject(new Error('Geçersiz TC Kimlik Numarası formatı.'));
        }, 1000);
    });
}

/**
 * AUTH ROUTES
 */
app.post('/api/register', async (req, res) => {
    const { firstName, lastName, email, tcNo, password } = req.body;
    
    if (!firstName || !lastName || !email || !tcNo || !password) {
        return res.status(400).json({ success: false, error: 'Tüm alanlar zorunludur.' });
    }

    try {
        await verifyWithNVI(tcNo);
        const result = await userDb.addUser(req.body);
        
        if (result.success) {
            res.status(201).json({ success: true, message: 'Kayıt başarılı.' });
        } else {
            res.status(400).json({ success: false, error: result.error });
        }
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

app.post('/api/login', async (req, res) => {
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
});

/**
 * DATA ROUTES
 */
app.get('/api/drivers', async (req, res) => {
    const drivers = userDb.getDriversWithAvgRatings();
    res.json(drivers);
});

app.get('/api/my-bookings/:userId', async (req, res) => {
    const bookings = userDb.getBookingsByUserId(req.params.userId);
    res.json(bookings);
});

app.post('/api/bookings', async (req, res) => {
    const result = userDb.addBooking(req.body);
    if (result.success) res.status(201).json(result);
    else res.status(400).json(result);
});

app.post('/api/ratings', async (req, res) => {
    const result = userDb.addRating(req.body);
    if (result.success) res.status(201).json(result);
    else res.status(400).json(result);
});

/**
 * WALLET ROUTES
 */
app.get('/api/wallet/balance/:userId', async (req, res) => {
    const balance = userDb.getUserBalance(req.params.userId);
    res.json({ balance });
});

app.post('/api/wallet/deposit', async (req, res) => {
    const { userId, amount } = req.body;
    const result = userDb.addBalance(userId, amount);
    if (result.success) res.json(result);
    else res.status(400).json(result);
});

app.post('/api/wallet/transfer', async (req, res) => {
    const { fromUserId, toEmail, amount } = req.body;
    const result = userDb.transferMoney(fromUserId, toEmail, amount);
    if (result.success) res.json(result);
    else res.status(400).json(result);
});

app.get('/api/wallet/transactions/:userId', async (req, res) => {
    const transactions = userDb.getTransactions(req.params.userId);
    res.json(transactions);
});

app.post('/api/wallet/pay', async (req, res) => {
    const { userId, bookingId, method } = req.body;
    const result = userDb.payForBooking(userId, bookingId, method);
    if (result.success) res.json(result);
    else res.status(400).json(result);
});

/**
 * ADMIN ROUTES
 */
app.get('/api/users', async (req, res) => {
    const { q } = req.query;
    const users = q ? userDb.searchUsers(q) : userDb.getAllUsers();
    res.json(users);
});

app.get('/api/all-bookings', async (req, res) => {
    const { q } = req.query;
    const bookings = q ? userDb.searchBookings(q) : userDb.getAllBookings();
    res.json(bookings);
});

// Sunucuyu başlat
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Sunucu Hazır: http://localhost:${PORT}`);
    console.log(`📂 Mod: ${process.env.NODE_ENV}\n`);
});
