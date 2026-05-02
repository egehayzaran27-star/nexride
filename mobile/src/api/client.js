import axios from 'axios';
import { useStore, BASE_URL } from '../store/useStore';

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

// Request Interceptor: Her isteğe token ekle
apiClient.interceptors.request.use(
  (config) => {
    const token = useStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Merkezi hata yönetimi
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Yetki hatası durumunda çıkış yap
      useStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: (email, password) => apiClient.post('/login', { email, password }),
  register: (data) => apiClient.post('/auth/register', data),
};

export const driverService = {
  getAvailable: () => apiClient.get('/drivers/available'),
  getStats: () => apiClient.get('/drivers/stats'),
  becomeDriver: (data) => apiClient.post('/drivers/become-driver', data),
};

export const bookingService = {
  getAll: () => apiClient.get('/bookings/all'),
  create: (data) => apiClient.post('/bookings', data),
  updateStatus: (id, status) => apiClient.patch(`/bookings/${id}/status`, { status }),
};

export const walletService = {
  getHistory: () => apiClient.get('/wallet/history'),
  topUp: (amount) => apiClient.post('/wallet/topup', { amount }),
};

export default apiClient;
