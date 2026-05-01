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
            plate TEXT UNIQUE NOT NULL,
            lat REAL,
            lng REAL,
            is_available INTEGER DEFAULT 1,
            userId INTEGER REFERENCES users(id)
        )
    `;

    // Favori Adresler Tablosu
    const createFavoritesTable = `
        CREATE TABLE IF NOT EXISTS favorite_addresses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId INTEGER NOT NULL,
            label TEXT NOT NULL,
            address TEXT NOT NULL,
            lat REAL,
            lng REAL,
            FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
        )
    `;

    // Bildirimler Tablosu
    const createNotificationsTable = `
        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId INTEGER NOT NULL,
            message TEXT NOT NULL,
            is_read INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
        )
    `;

    // Rezervasyonlar Tablosu (Sürücü ID eklendi)
    const createBookingsTable = `
        CREATE TABLE IF NOT EXISTS bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId INTEGER NOT NULL,
            driverId INTEGER,
            destination TEXT NOT NULL,
            pickupLocation TEXT,
            bookingDate TEXT NOT NULL,
            price REAL DEFAULT 0.0,
            tip REAL DEFAULT 0.0,
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

    // Doğrulama Kodları Tablosu
    const createVerificationCodesTable = `
        CREATE TABLE IF NOT EXISTS verification_codes (
            email TEXT PRIMARY KEY,
            code TEXT NOT NULL,
            expires_at INTEGER NOT NULL
        )
    `;

    db.exec(createUsersTable);
    db.exec(createDriversTable);
    db.exec(createBookingsTable);
    db.exec(createRatingsTable);
    db.exec(createTransactionsTable);
    db.exec(createVerificationCodesTable);
    db.exec(createFavoritesTable);
    db.exec(createNotificationsTable);

    // İndeksler (Performans için)
    db.exec('CREATE INDEX IF NOT EXISTS idx_bookings_userId ON bookings(userId)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_transactions_userId ON transactions(userId)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_ratings_driverId ON ratings(driverId)');

    // Geriye dönük uyumluluk: role kolonu yoksa ekle
    try {
        db.exec("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user';");
    } catch (e) {}

    try {
        db.exec("ALTER TABLE drivers ADD COLUMN lat REAL;");
        db.exec("ALTER TABLE drivers ADD COLUMN lng REAL;");
        db.exec("ALTER TABLE drivers ADD COLUMN is_available INTEGER DEFAULT 1;");
        db.exec("ALTER TABLE drivers ADD COLUMN userId INTEGER;");
    } catch (e) {}

    try {
        db.exec("ALTER TABLE bookings ADD COLUMN tip REAL DEFAULT 0.0;");
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
            const driverRecord = db.prepare('SELECT id FROM drivers WHERE userId = ?').get(user.id);
            return { success: true, user: { ...userWithoutPassword, isDriver: !!driverRecord } };
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
 * Kullanıcıyı sürücü olarak kaydeder veya bilgilerini günceller
 */
function becomeDriver(userId, carData) {
    const { name, carModel, plate } = carData;
    try {
        // Önce bu kullanıcının zaten bir sürücü kaydı var mı bak
        const existingDriver = db.prepare('SELECT id FROM drivers WHERE userId = ?').get(userId);

        if (existingDriver) {
            // Varsa güncelle
            db.prepare(`
                UPDATE drivers 
                SET name = ?, carModel = ?, plate = ?
                WHERE userId = ?
            `).run(name, carModel, plate, userId);
            
            return { success: true, id: existingDriver.id, message: 'Sürücü bilgileri güncellendi.' };
        } else {
            // Yoksa yeni kayıt oluştur
            const query = db.prepare(`
                INSERT INTO drivers (name, carModel, plate, userId, is_available) 
                VALUES (?, ?, ?, ?, 0)
            `);
            const result = query.run(name, carModel, plate, userId);
            
            // Kullanıcının rolünü güncelle (Sadece user ise driver yap, adminliği bozma)
            const user = db.prepare('SELECT role FROM users WHERE id = ?').get(userId);
            if (user && user.role === 'user') {
                db.prepare('UPDATE users SET role = "driver" WHERE id = ?').run(userId);
            }
            
            return { success: true, id: result.lastInsertRowid };
        }
    } catch (err) {
        if (err.message.includes('UNIQUE constraint failed: drivers.plate')) {
            return { success: false, error: 'Bu plaka zaten başka bir sürücü tarafından kullanılıyor.' };
        }
        return { success: false, error: err.message };
    }
}

/**
 * Sürücü müsaitlik durumunu günceller (userId'ye göre)
 */
function updateDriverAvailability(userId, isAvailable) {
    const val = isAvailable ? 1 : 0;
    return db.prepare('UPDATE drivers SET is_available = ? WHERE userId = ?').run(val, userId);
}

/**
 * Sürücüyü siler ve kullanıcının rolünü 'user'a çeker
 */
function deleteDriver(driverId) {
    const driver = db.prepare('SELECT userId FROM drivers WHERE id = ?').get(driverId);
    if (!driver) return false;

    const transaction = db.transaction(() => {
        db.prepare('DELETE FROM drivers WHERE id = ?').run(driverId);
        db.prepare('UPDATE users SET role = "user" WHERE id = ?').run(driver.userId);
    });

    transaction();
    return true;
}

/**
 * Aktif sürücüleri getirir
 */
function getAvailableDrivers() {
    return db.prepare('SELECT * FROM drivers WHERE is_available = 1').all();
}

/**
 * Verilen koordinatlara en yakın müsait sürücüleri bulur (Haversine Formülü)
 * @param {number} lat - Enlem
 * @param {number} lng - Boylam
 * @param {number} limit - Maksimum sürücü sayısı
 */
function getNearbyDrivers(lat, lng, limit = 5) {
    const query = db.prepare(`
        SELECT *, 
            (6371 * acos(
                cos(radians(?)) * cos(radians(lat)) *
                cos(radians(lng) - radians(?)) +
                sin(radians(?)) * sin(radians(lat))
            )) AS distance
        FROM drivers
        WHERE is_available = 1
        ORDER BY distance ASC
        LIMIT ?
    `);
    return query.all(lat, lng, lat, limit);
}


/**
 * Yeni bir rezervasyon ekler
 */
function addBooking(bookingData) {
    const { userId, driverId, destination, pickupLocation, bookingDate, price } = bookingData;
    const insertQuery = db.prepare(`
        INSERT INTO bookings (userId, driverId, destination, pickupLocation, bookingDate, price)
        VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    try {
        const result = insertQuery.run(userId, driverId || null, destination, pickupLocation || null, bookingDate, price || 0);
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
 * Sayfalamalı tüm rezervasyonları getirir
 */
function getAllBookingsPaginated(limit, offset) {
    const query = db.prepare(`
        SELECT b.*, u.firstName, u.lastName, u.email, d.name as driverName 
        FROM bookings b
        JOIN users u ON b.userId = u.id
        LEFT JOIN drivers d ON b.driverId = d.id
        ORDER BY b.created_at DESC
        LIMIT ? OFFSET ?
    `);
    return query.all(limit, offset);
}

/**
 * Toplam rezervasyon sayısını döner
 */
function countAllBookings() {
    return db.prepare('SELECT COUNT(*) as count FROM bookings').get().count;
}

/**
 * ID'ye göre rezervasyon getirir
 */
function getBookingById(id) {
    return db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
}

/**
 * Rezervasyon durumunu günceller
 */
function updateBookingStatus(id, status) {
    const booking = getBookingById(id);
    if (!booking) return { changes: 0 };

    const transaction = db.transaction(() => {
        // Durumu güncelle
        db.prepare('UPDATE bookings SET status = ? WHERE id = ?').run(status, id);

        // Sürücü müsaitliğini yönet
        if (booking.driverId) {
            if (status === 'Onaylandı' || status === 'Yolda') {
                // Sürücü artık meşgul
                db.prepare('UPDATE drivers SET is_available = 0 WHERE id = ?').run(booking.driverId);
            } else if (status === 'Tamamlandı' || status === 'İptal Edildi') {
                // Sürücü artık müsait
                db.prepare('UPDATE drivers SET is_available = 1 WHERE id = ?').run(booking.driverId);
                
                // Eğer tamamlandıysa sürücüye parayı yatır
                if (status === 'Tamamlandı' && booking.price > 0) {
                    const driverRecord = db.prepare('SELECT userId FROM drivers WHERE id = ?').get(booking.driverId);
                    if (driverRecord && driverRecord.userId) {
                        const totalPayment = booking.price + (booking.tip || 0);
                        db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(totalPayment, driverRecord.userId);
                        db.prepare('INSERT INTO transactions (userId, type, amount, details) VALUES (?, ?, ?, ?)').run(
                            driverRecord.userId, 'Yolculuk Kazancı', totalPayment, `Yolculuk ID: ${booking.id} (Ücret: ${booking.price}, Bahşiş: ${booking.tip || 0})`
                        );
                    }
                }
            }
        }
    });

    transaction();
    return { changes: 1 };
}

/**
 * Rezervasyonu iptal eder ve gerekirse iade yapar
 */
function cancelBookingWithRefund(bookingId) {
    const booking = getBookingById(bookingId);
    if (!booking) throw new Error('Rezervasyon bulunamadı.');

    const transaction = db.transaction(() => {
        // Durumu güncelle
        db.prepare("UPDATE bookings SET status = 'İptal Edildi' WHERE id = ?").run(bookingId);

        // Eğer ödendiyse bakiye iadesi yap
        if (booking.status === 'Ödendi') {
            db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(booking.price, booking.userId);
            db.prepare('INSERT INTO transactions (userId, type, amount, details) VALUES (?, ?, ?, ?)').run(
                booking.userId, 
                'İade', 
                booking.price, 
                `${booking.destination} yolculuğu iptal iadesi`
            );
        }
    });
    transaction();
    return { success: true };
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
 * Şifre günceller
 */
async function updateUserPassword(id, oldPassword, newPassword) {
    const user = db.prepare('SELECT password FROM users WHERE id = ?').get(id);
    if (!user) return { success: false, error: 'Kullanıcı bulunamadı.' };

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) return { success: false, error: 'Eski şifre hatalı.' };

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, id);
    return { success: true, message: 'Şifre güncellendi.' };
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
 * ID'ye göre kullanıcı bulur
 */
function getUserById(id) {
    const query = db.prepare('SELECT * FROM users WHERE id = ?');
    return query.get(id);
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
    getAllBookingsPaginated,
    countAllBookings,
    getBookingById,
    updateBookingStatus,
    cancelBookingWithRefund,
    getAllUsers,
    getUserByEmail,
    updateUser,
    updateUserPassword,
    deleteUser,
    searchUsers,
    searchBookings,
    getAvailableDrivers,
    getUserById,
    getNearbyDrivers,
    becomeDriver,
    updateDriverAvailability,
    deleteDriver,


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
    },

    // Doğrulama Kodu Fonksiyonları
    addVerificationCode: (email, code, expiresAt) => {
        const query = db.prepare('INSERT OR REPLACE INTO verification_codes (email, code, expires_at) VALUES (?, ?, ?)');
        return query.run(email, code, expiresAt);
    },

    getVerificationCode: (email) => {
        const query = db.prepare('SELECT * FROM verification_codes WHERE email = ?');
        return query.get(email);
    },

    deleteVerificationCode: (email) => {
        const query = db.prepare('DELETE FROM verification_codes WHERE email = ?');
        return query.run(email);
    },

    addTipToBooking: (userId, bookingId, tipAmount) => {
        const uId = Number(userId);
        const bId = Number(bookingId);
        const amt = Number(tipAmount);

        if (amt <= 0) return { success: false, error: 'Bahşiş miktarı 0\'dan büyük olmalıdır.' };

        const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(uId);
        const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bId);

        if (!user) return { success: false, error: 'Kullanıcı bulunamadı.' };
        if (!booking) return { success: false, error: 'Rezervasyon bulunamadı.' };
        if (booking.userId !== uId) return { success: false, error: 'Yetkisiz işlem.' };
        if (user.balance < amt) return { success: false, error: 'Yetersiz bakiye.' };

        const updateBookingTip = db.prepare('UPDATE bookings SET tip = IFNULL(tip, 0) + ? WHERE id = ?');
        const updateUserBalance = db.prepare('UPDATE users SET balance = balance - ? WHERE id = ?');
        const logTransaction = db.prepare('INSERT INTO transactions (userId, type, amount, details) VALUES (?, ?, ?, ?)');

        try {
            const transaction = db.transaction(() => {
                updateUserBalance.run(amt, uId);
                updateBookingTip.run(amt, bId);
                logTransaction.run(uId, 'Bahşiş', amt, `Rezervasyon #${bId} için bahşiş`);

                // Eğer yolculuk zaten tamamlandıysa, bahşişi hemen sürücüye aktar
                if (booking.status === 'Tamamlandı' || booking.status === 'Ödendi') {
                    const driverRecord = db.prepare('SELECT userId FROM drivers WHERE id = ?').get(booking.driverId);
                    if (driverRecord && driverRecord.userId) {
                        db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(amt, driverRecord.userId);
                        logTransaction.run(driverRecord.userId, 'Bahşiş Kazancı', amt, `Rezervasyon #${bId} için bahşiş alındı`);
                    }
                }
            });
            transaction();
            return { success: true };
        } catch (err) {
            console.error('[Bahşiş Hata]', err.message);
            return { success: false, error: err.message };
        }
    },

    getDriverStats: (userId) => {
        const uId = Number(userId);
        const driver = db.prepare('SELECT id FROM drivers WHERE userId = ?').get(uId);
        if (!driver) return null;

        const dId = driver.id;
        
        // Günlük kazanç (Bugün tamamlanan yolculuklar + bahşişler)
        const today = new Date().toISOString().split('T')[0];
        const earnings = db.prepare(`
            SELECT 
                SUM(price + IFNULL(tip, 0)) as totalEarnings,
                COUNT(id) as totalTrips
            FROM bookings 
            WHERE driverId = ? AND status = 'Tamamlandı' AND DATE(created_at) = DATE(?)
        `).get(dId, today);

        // Ortalama puan ve toplam değerlendirme
        const rating = db.prepare(`
            SELECT 
                IFNULL(AVG(score), 0) as avgScore,
                COUNT(id) as ratingCount
            FROM ratings
            WHERE driverId = ?
        `).get(dId);

        return {
            dailyEarnings: earnings.totalEarnings || 0,
            dailyTrips: earnings.totalTrips || 0,
            avgScore: rating.avgScore,
            ratingCount: rating.ratingCount
        };
    },

    db, // Ham veritabanı erişimi (bakım için)
};
