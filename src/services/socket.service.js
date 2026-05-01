const socketIO = require('socket.io');
const userDb = require('../../user-db');

/**
 * Socket.io hizmetini başlatır ve olay dinleyicilerini kurar.
 */
function initSocket(server) {
    const io = socketIO(server, {
        cors: {
            origin: "*", // Geliştirme aşamasında tüm kökenlere izin ver
            methods: ["GET", "POST"]
        }
    });

    console.log('📡 WebSocket Sunucusu Hazır');

    io.on('connection', (socket) => {
        console.log(`🔌 Yeni Bağlantı: ${socket.id}`);

        // Sürücülerin kendi odalarına katılması (bildirimler için)
        socket.on('join', (data) => {
            const { userId, role, isDriver } = data;
            if (userId) {
                socket.join(`user-${userId}`);
                if (role === 'driver' || isDriver) {
                    socket.join('drivers-room');
                    console.log(`🚕 Sürücü odaya katıldı: ${userId}`);
                }
            }
        });

        // Sürücü konum güncellemesi
        socket.on('driver:location-update', async (data) => {
            const { driverId, lat, lng } = data;
            io.emit('driver:moved', { driverId, lat, lng });
        });

        // Kullanıcı konum güncellemesi
        socket.on('user:location-update', (data) => {
            io.emit('user:moved', data);
        });

        // Rezervasyon talebi (Sürücülere yayınla)
        socket.on('booking:request', (bookingData) => {
            console.log('🔔 Yeni Rezervasyon Talebi:', bookingData.id);
            // Tüm müsait sürücülere gönder
            io.to('drivers-room').emit('booking:new-request', bookingData);
        });

        socket.on('disconnect', () => {
            console.log(`❌ Bağlantı Kesildi: ${socket.id}`);
        });
    });

    return io;
}

module.exports = { initSocket };
