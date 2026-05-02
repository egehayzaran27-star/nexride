const axios = require('axios');

/**
 * Harita ve Rota servisleri
 * OSRM (Open Source Routing Machine) kullanarak yol takibi sağlar.
 */
class MapsService {
    constructor() {
        // Public OSRM API (Geliştirme için)
        // Production'da kendi OSRM sunucunuzu kurmanız önerilir.
        this.osrmBaseUrl = 'https://router.project-osrm.org';
    }

    /**
     * Ham GPS koordinatlarını en yakın yola kilitler (Snap to Road)
     * @param {number} lat - Enlem
     * @param {number} lng - Boylam
     * @returns {Promise<{lat: number, lng: number}>}
     */
    async snapToRoad(lat, lng) {
        try {
            const url = `${this.osrmBaseUrl}/nearest/v1/driving/${lng},${lat}?number=1`;
            const response = await axios.get(url);

            if (response.data && response.data.waypoints && response.data.waypoints.length > 0) {
                const snapped = response.data.waypoints[0].location;
                return {
                    lng: snapped[0],
                    lat: snapped[1]
                };
            }
            return { lat, lng }; // Hata durumunda ham veriyi dön
        } catch (error) {
            console.error('📍 SnapToRoad Hatası:', error.message);
            return { lat, lng };
        }
    }

    /**
     * İki nokta arasındaki gerçek yol rotasını getirir.
     * @param {Array} start - [lat, lng]
     * @param {Array} end - [lat, lng]
     * @returns {Promise<Array<[number, number]>>} - Rota koordinat dizisi
     */
    async getRoute(start, end) {
        try {
            const url = `${this.osrmBaseUrl}/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`;
            const response = await axios.get(url);

            if (response.data && response.data.routes && response.data.routes.length > 0) {
                // GeoJSON formatında [lng, lat] gelir, biz [lat, lng] döneriz
                return response.data.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
            }
            return [start, end]; // Hata durumunda kuş uçuşu dön
        } catch (error) {
            console.error('📍 GetRoute Hatası:', error.message);
            return [start, end];
        }
    }

    /**
     * İki nokta arasındaki yol mesafesini (metre) ve süresini (saniye) hesaplar.
     */
    async getDistanceMatrix(start, end) {
        try {
            const url = `${this.osrmBaseUrl}/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=false`;
            const response = await axios.get(url);

            if (response.data && response.data.routes && response.data.routes.length > 0) {
                const route = response.data.routes[0];
                return {
                    distance: route.distance, // metre
                    duration: route.duration  // saniye
                };
            }
            return null;
        } catch (error) {
            console.error('📍 DistanceMatrix Hatası:', error.message);
            return null;
        }
    }
}

module.exports = new MapsService();
