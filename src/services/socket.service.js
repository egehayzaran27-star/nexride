const socketIO = require('socket.io');
const userDb = require('../../user-db');
const mapsService = require('./maps.service');

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
                socket.userId = userId;
                
                if (role === 'driver' || isDriver) {
                    socket.join('drivers-room');
                    socket.isDriver = true;
                    console.log(`🚕 Sürücü odaya katıldı: ${userId}`);
                    io.emit('driver:connected', { driverId: userId });
                }
            }
        });

        // Sürücü konum güncellemesi (Yol Takip Sistemli)
        socket.on('driver:location-update', async (data) => {
            const { driverId, lat, lng } = data;
            
            try {
                const snapped = await mapsService.snapToRoad(lat, lng);
                
                io.emit('driver:moved', { 
                    driverId, 
                    lat: snapped.lat, 
                    lng: snapped.lng
                });

                await userDb.updateDriverLocation(driverId, snapped.lat, snapped.lng);
            } catch (error) {
                io.emit('driver:moved', { driverId, lat, lng });
            }
        });

        // Kullanıcı konum güncellemesi
        socket.on('user:location-update', (data) => {
            io.emit('user:moved', data);
        });

        // Bildirim gönderme
        socket.on('send-notification', async (data) => {
            const { userId, message } = data;
            await userDb.addNotification(userId, message);
            io.to(`user-${userId}`).emit('notification:new', { message });
        });

        // Rezervasyon talebi
        socket.on('booking:request', (bookingData) => {
            console.log('🔔 Yeni Rezervasyon Talebi:', bookingData.id);
            io.to('drivers-room').emit('booking:new-request', bookingData);
        });

        socket.on('disconnect', () => {
            if (socket.isDriver) {
                io.emit('driver:disconnected', { driverId: socket.userId });
            }
            console.log(`❌ Bağlantı Kesildi: ${socket.id}`);
        });
    });

    return io;
}

module.exports = { initSocket };
