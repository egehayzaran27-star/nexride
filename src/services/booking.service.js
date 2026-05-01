const userDb = require('../../user-db');

/**
 * Rezervasyon ve sürücü eşleştirme mantığı.
 */
class BookingService {
    /**
     * Yeni bir rezervasyon talebi oluşturur ve uygun sürücüleri bulmaya çalışır.
     */
    static async createBookingRequest(bookingData, io) {
        // 1. Rezervasyonu DB'ye ekle
        const result = userDb.addBooking(bookingData);
        if (!result.success) return result;

        const bookingId = result.id;
        const fullBookingData = { ...bookingData, id: bookingId, status: 'Bekliyor' };

        // 2. Başlangıç koordinatlarını ayrıştır
        const coords = bookingData.destination.split(',').map(c => parseFloat(c.trim()));
        
        if (coords.length === 2 && !isNaN(coords[0])) {
            // 3. Yakındaki sürücüleri bul
            const nearbyDrivers = userDb.getNearbyDrivers(coords[0], coords[1], 5);
            
            console.log(`🔍 Rezervasyon #${bookingId} için ${nearbyDrivers.length} yakın sürücü bulundu.`);

            // 4. Sürücülere WebSocket üzerinden haber ver
            io.to('drivers-room').emit('booking:new-request', fullBookingData);
        }

        return { success: true, id: bookingId };
    }

    /**
     * Rezervasyon durumunu günceller ve ilgili taraflara haber verir.
     */
    static async updateBookingStatus(bookingId, status, io) {
        const result = userDb.updateBookingStatus(bookingId, status);
        if (result.changes > 0) {
            const booking = userDb.getBookingById(bookingId);
            if (booking) {
                // Kullanıcıya bildir
                io.to(`user-${booking.userId}`).emit('booking:status-updated', {
                    bookingId,
                    status,
                    message: `Sürücü rezervasyonu onayladı`
                });
            }
            return { success: true };
        }
        return { success: false, error: 'Rezervasyon bulunamadı.' };
    }
}

module.exports = BookingService;
