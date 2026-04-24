const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

// Veritabanı dosyasını projenin ana dizininde oluşturuyoruz (sqlite.db)
const dbPath = path.resolve(__dirname, 'sqlite.db');
const db = new Database(dbPath);

// Veritabanı yapılandırması (Docker uyumluluğu için journal_mode DELETE kullanıyoruz)
db.pragma('journal_mode = DELETE');
db.pragma('foreign_keys = ON');

/**
 * Tabloları oluşturur
 */
function initializeDatabase() {
    // Kullanıcılar Tablosu
    const createUsersTable = `
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            firstName TEXT NOT NULL,
            lastName TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            tcNo TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            phone TEXT,
            location TEXT,
            balance REAL DEFAULT 0.0,
            role TEXT DEFAULT 'user',
            last_login DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `;

    // Sürücüler Tablosu
    const createDriversTable = `
        CREATE TABLE IF NOT EXISTS drivers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            carModel TEXT NOT NULL,
            plate TEXT UNIQUE NOT NULL
        )
    `;

    // Rezervasyonlar Tablosu (Sürücü ID eklendi)
    const createBookingsTable = `
        CREATE TABLE IF NOT EXISTS bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId INTEGER NOT NULL,
            driverId INTEGER,
            destination TEXT NOT NULL,
            bookingDate TEXT NOT NULL,
            price REAL DEFAULT 0.0,
            status TEXT DEFAULT 'Bekliyor',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (driverId) REFERENCES drivers(id) ON DELETE SET NULL
        )
    `;

    // Puanlama Tablosu (Booking ID eklendi ve UNIQUE yapıldı)
    const createRatingsTable = `
        CREATE TABLE IF NOT EXISTS ratings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bookingId INTEGER UNIQUE,
            driverId INTEGER NOT NULL,
            userId INTEGER NOT NULL,
            score INTEGER CHECK(score >= 0 AND score <= 5),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (bookingId) REFERENCES bookings(id) ON DELETE CASCADE,
            FOREIGN KEY (driverId) REFERENCES drivers(id) ON DELETE CASCADE,
            FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
        )
    `;

    // İşlemler (Para Hareketleri) Tablosu
    const createTransactionsTable = `
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId INTEGER NOT NULL,
            type TEXT NOT NULL, -- 'Yükleme', 'Transfer Gelen', 'Transfer Giden'
            amount REAL NOT NULL,
            details TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
        )
    `;

    db.exec(createUsersTable);
    db.exec(createDriversTable);
    db.exec(createBookingsTable);
    db.exec(createRatingsTable);
    db.exec(createTransactionsTable);

    // Geriye dönük uyumluluk: role kolonu yoksa ekle
    try {
        db.exec("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user';");
    } catch (e) {}

    // Örnek Sürücüleri Ekle (Seed)
    const driverCount = db.prepare('SELECT COUNT(*) as count FROM drivers').get();
    if (driverCount.count === 0) {
        const insertDriver = db.prepare('INSERT INTO drivers (name, carModel, plate) VALUES (?, ?, ?)');
        insertDriver.run('Murat Kaya', 'Fiat Egea', '34 TAX 01');
        insertDriver.run('Selin Yılmaz', 'Toyota Corolla', '06 TAK 22');
        insertDriver.run('Ahmet Demir', 'Mercedes C200', '35 TIC 99');
        console.log('Örnek sürücüler eklendi.');
    }

    console.log('Veritabanı ve tablolar hazır.');
}

/**
 * Yeni bir kullanıcı ekler (Hashlenmiş şifre ile)
 */
async function addUser(userData) {
    const { firstName, lastName, email, tcNo, password, phone, location } = userData;
    
    // Şifreyi hashle
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const insertQuery = db.prepare(`
        INSERT INTO users (firstName, lastName, email, tcNo, password, phone, location) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    try {
        const result = insertQuery.run(firstName, lastName, email, tcNo, hashedPassword, phone, location || null);
        return { success: true, id: result.lastInsertRowid };
    } catch (err) {
        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            if (err.message.includes('email')) return { success: false, error: 'Bu e-posta adresi zaten kullanımda.' };
            if (err.message.includes('tcNo')) return { success: false, error: 'Bu TC Kimlik numarası zaten kayıtlı.' };
            return { success: false, error: 'Bu kullanıcı zaten mevcut.' };
        }
        throw err;
    }
}

/**
 * Giriş bilgilerini kontrol eder (Hashlenmiş şifre kontrolü ile)
 */
async function checkUserCredentials(email, password) {
    const query = db.prepare('SELECT * FROM users WHERE email = ?');
    const user = query.get(email);
    
    if (user) {
        const isMatch = await bcrypt.compare(password, user.password);
        if (isMatch) {
            db.prepare("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?").run(user.id);
            const { password, ...userWithoutPassword } = user;
            return { success: true, user: userWithoutPassword };
        }
    }
    return { success: false, error: 'E-posta veya şifre hatalı.' };
}

/**
 * Tüm sürücüleri ve ortalama puanlarını getirir
 */
function getDriversWithAvgRatings() {
    const query = db.prepare(`
        SELECT d.*, 
               IFNULL(AVG(r.score), 0) as avgScore,
               COUNT(r.id) as ratingCount
        FROM drivers d
        LEFT JOIN ratings r ON d.id = r.driverId
        GROUP BY d.id
    `);
    return query.all();
}

/**
 * Yeni bir rezervasyon ekler
 */
function addBooking(bookingData) {
    const { userId, driverId, destination, bookingDate, price } = bookingData;
    const insertQuery = db.prepare(`
        INSERT INTO bookings (userId, driverId, destination, bookingDate, price)
        VALUES (?, ?, ?, ?, ?)
    `);
    
    try {
        const result = insertQuery.run(userId, driverId || null, destination, bookingDate, price || 0);
        return { success: true, id: result.lastInsertRowid };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

/**
 * Kullanıcıya ait rezervasyonları ve sürücü bilgisini getirir (Verilen puan dahil)
 */
function getBookingsByUserId(userId) {
    const query = db.prepare(`
        SELECT b.*, d.name as driverName, d.carModel, d.plate, r.score as userRating
        FROM bookings b
        LEFT JOIN drivers d ON b.driverId = d.id
        LEFT JOIN ratings r ON b.id = r.bookingId
        WHERE b.userId = ?
        ORDER BY b.created_at DESC
        LIMIT 5
    `);
    return query.all(userId);
}

/**
 * Yeni bir puan ekler
 */
function addRating(ratingData) {
    const { driverId, userId, score, bookingId } = ratingData;
    const insertQuery = db.prepare(`
        INSERT INTO ratings (driverId, userId, score, bookingId)
        VALUES (?, ?, ?, ?)
    `);
    
    try {
        const result = insertQuery.run(driverId, userId, score, bookingId);
        return { success: true, id: result.lastInsertRowid };
    } catch (err) {
        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return { success: false, error: 'Bu yolculuk zaten puanlanmış.' };
        }
        return { success: false, error: err.message };
    }
}

/**
 * Tüm rezervasyonları listeler (Admin için)
 */
function getAllBookings() {
    const selectQuery = db.prepare(`
        SELECT b.*, u.firstName, u.lastName, u.email, d.name as driverName 
        FROM bookings b
        JOIN users u ON b.userId = u.id
        LEFT JOIN drivers d ON b.driverId = d.id
        ORDER BY b.created_at DESC
        LIMIT 5
    `);
    return selectQuery.all();
}

/**
 * Kullanıcıyı günceller (Basitleştirilmiş)
 */
function updateUser(id, userData) {
    const { firstName, lastName, location, phone } = userData;
    const updateQuery = db.prepare('UPDATE users SET firstName = ?, lastName = ?, location = ?, phone = ? WHERE id = ?');
    const result = updateQuery.run(firstName, lastName, location, phone, id);
    return result.changes > 0;
}

/**
 * Kullanıcıyı siler
 */
function deleteUser(id) {
    const deleteQuery = db.prepare('DELETE FROM users WHERE id = ?');
    const result = deleteQuery.run(id);
    return result.changes > 0;
}

/**
 * Tüm kullanıcıları listeler
 */
function getAllUsers() {
    const query = db.prepare('SELECT * FROM users ORDER BY created_at DESC');
    return query.all();
}

/**
 * E-postaya göre kullanıcı bulur
 */
function getUserByEmail(email) {
    const query = db.prepare('SELECT * FROM users WHERE email = ?');
    return query.get(email);
}

/**
 * Kullanıcılar içinde arama yapar (Ad, Soyad, Email, TC No) - Case Insensitive
 */
function searchUsers(term) {
    const searchTerm = `%${term.toLowerCase()}%`;
    const query = db.prepare(`
        SELECT * FROM users 
        WHERE LOWER(firstName) LIKE ? 
           OR LOWER(lastName) LIKE ? 
           OR LOWER(email) LIKE ? 
           OR tcNo LIKE ?
        ORDER BY created_at DESC
    `);
    return query.all(searchTerm, searchTerm, searchTerm, searchTerm);
}

/**
 * Rezervasyonlar içinde arama yapar (Varış noktası, Kullanıcı Adı, Sürücü Adı)
 */
function searchBookings(term) {
    const searchTerm = `%${term.toLowerCase()}%`;
    const query = db.prepare(`
        SELECT b.*, u.firstName, u.lastName, u.email, d.name as driverName 
        FROM bookings b
        JOIN users u ON b.userId = u.id
        LEFT JOIN drivers d ON b.driverId = d.id
        WHERE LOWER(b.destination) LIKE ? 
           OR LOWER(u.firstName) LIKE ? 
           OR LOWER(u.lastName) LIKE ? 
           OR LOWER(d.name) LIKE ?
        ORDER BY b.created_at DESC
    `);
    return query.all(searchTerm, searchTerm, searchTerm, searchTerm);
}

// İlk çalıştırmada tabloları hazırla
initializeDatabase();

module.exports = {
    addUser,
    checkUserCredentials,
    getDriversWithAvgRatings,
    addBooking,
    getBookingsByUserId,
    addRating,
    getAllBookings,
    getAllUsers, // Gerekirse admin için
    getUserByEmail,
    updateUser,
    deleteUser,
    searchUsers,
    searchBookings,

    // Cüzdan Fonksiyonları
    addBalance: (userId, amount) => {
        const uId = Number(userId);
        const amt = Number(amount);
        console.log(`[Cüzdan Debug] ID: ${uId}, Miktar: ${amt}`);
        
        const update = db.prepare('UPDATE users SET balance = IFNULL(balance, 0) + ? WHERE id = ?');
        const log = db.prepare('INSERT INTO transactions (userId, type, amount, details) VALUES (?, ?, ?, ?)');
        
        try {
            const transaction = db.transaction(() => {
                const result = update.run(amt, uId);
                if (result.changes === 0) throw new Error('Kullanıcı bulunamadı (ID: ' + uId + ')');
                log.run(uId, 'Yükleme', amt, 'Kredi Kartı ile Yükleme');
            });
            transaction();
            return { success: true };
        } catch (err) {
            console.error('[Cüzdan Hata]', err.message);
            return { success: false, error: err.message };
        }
    },

    transferMoney: (fromUserId, toEmail, amount) => {
        const fId = Number(fromUserId);
        const amt = Number(amount);
        
        const sender = db.prepare('SELECT * FROM users WHERE id = ?').get(fId);
        const receiver = db.prepare('SELECT * FROM users WHERE email = ?').get(toEmail);

        if (!sender) return { success: false, error: 'Gönderici bulunamadı.' };
        if (!receiver) return { success: false, error: 'Alıcı e-posta adresi bulunamadı.' };
        if (sender.balance < amt) return { success: false, error: 'Yetersiz bakiye.' };
        if (sender.id === receiver.id) return { success: false, error: 'Kendinize para gönderemezsiniz.' };

        const updateSender = db.prepare('UPDATE users SET balance = balance - ? WHERE id = ?');
        const updateReceiver = db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?');
        const logSender = db.prepare('INSERT INTO transactions (userId, type, amount, details) VALUES (?, ?, ?, ?)');
        const logReceiver = db.prepare('INSERT INTO transactions (userId, type, amount, details) VALUES (?, ?, ?, ?)');

        const transaction = db.transaction(() => {
            updateSender.run(amt, fId);
            updateReceiver.run(amt, receiver.id);
            logSender.run(fId, 'Transfer Giden', amt, `${receiver.email} adresine transfer`);
            logReceiver.run(receiver.id, 'Transfer Gelen', amt, `${sender.email} adresinden transfer`);
        });
        transaction();
        return { success: true };
    },

    getTransactions: (userId) => {
        return db.prepare('SELECT * FROM transactions WHERE userId = ? ORDER BY created_at DESC LIMIT 5').all(userId);
    },

    getUserBalance: (userId) => {
        const uId = Number(userId);
        const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(uId);
        return user ? (user.balance || 0) : 0;
    },

    payForBooking: (userId, bookingId, method = 'Cüzdan') => {
        const uId = Number(userId);
        const bId = Number(bookingId);
        
        const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(uId);
        const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bId);

        if (!user) return { success: false, error: 'Kullanıcı bulunamadı.' };
        if (!booking) return { success: false, error: 'Rezervasyon bulunamadı.' };
        if (booking.status === 'Ödendi') return { success: false, error: 'Bu yolculuk zaten ödenmiş.' };

        const updateBooking = db.prepare("UPDATE bookings SET status = 'Ödendi' WHERE id = ?");
        const logTransaction = db.prepare('INSERT INTO transactions (userId, type, amount, details) VALUES (?, ?, ?, ?)');

        if (method === 'Cüzdan') {
            if (user.balance < booking.price) return { success: false, error: 'Yetersiz bakiye. Mevcut: ₺' + user.balance };
            const updateBalance = db.prepare('UPDATE users SET balance = balance - ? WHERE id = ?');
            try {
                const transaction = db.transaction(() => {
                    updateBalance.run(booking.price, uId);
                    updateBooking.run(bId);
                    logTransaction.run(uId, 'Ödeme', booking.price, `${booking.destination} yolculuğu ödemesi (Cüzdan)`);
                });
                transaction();
                return { success: true };
            } catch (err) {
                return { success: false, error: err.message };
            }
        } else {
            // PayPal, Credit/Debit Card gibi dış ödeme yöntemleri
            try {
                const transaction = db.transaction(() => {
                    updateBooking.run(bId);
                    logTransaction.run(uId, 'Ödeme', booking.price, `${booking.destination} yolculuğu ödemesi (${method})`);
                });
                transaction();
                return { success: true };
            } catch (err) {
                return { success: false, error: err.message };
            }
        }
    },

    getUnpaidBookings: (userId) => {
        const uId = Number(userId);
        return db.prepare("SELECT * FROM bookings WHERE userId = ? AND status = 'Bekliyor' AND price > 0").all(uId);
    }
};
