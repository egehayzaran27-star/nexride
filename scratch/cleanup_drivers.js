const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '../sqlite.db');
const db = new Database(dbPath);

console.log('🧹 Tüm sürücüler temizleniyor...');

try {
    const drivers = db.prepare('SELECT id, userId FROM drivers').all();
    console.log(`Bulunan sürücü sayısı: ${drivers.length}`);

    const transaction = db.transaction(() => {
        // 1. Sürücüleri sil
        db.prepare('DELETE FROM drivers').run();
        
        // 2. Rolleri sıfırla (Sadece sürücü olanları kullanıcıya çek, adminlere dokunma)
        db.prepare("UPDATE users SET role = 'user' WHERE role = 'driver'").run();
        
        // 3. Aktif rezervasyonlardaki driverId'leri temizle
        db.prepare("UPDATE bookings SET driverId = NULL WHERE status NOT IN ('Tamamlandı', 'İptal Edildi')").run();
    });

    transaction();
    console.log('✅ Tüm sürücüler ve ilgili veriler başarıyla temizlendi.');
} catch (err) {
    console.error('❌ Hata oluştu:', err.message);
} finally {
    db.close();
}
