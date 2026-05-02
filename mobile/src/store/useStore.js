import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const THEME = {
  primary: '#000000',
  gold: '#f59e0b',
  white: '#ffffff',
  gray: '#f3f4f6',
  textGray: '#6b7280',
  success: '#10b981',
  danger: '#ef4444'
};

export const BASE_URL = 'https://balmy-game-recount.ngrok-free.dev/api';
export const SOCKET_URL = 'https://balmy-game-recount.ngrok-free.dev';

export const useStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      bookings: [],
      paymentMethods: [],
      notifications: [],
      systemConfig: {},
      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
      setBookings: (bookings) => set({ bookings }),
      setPaymentMethods: (paymentMethods) => set({ paymentMethods }),
      setNotifications: (notifications) => set({ notifications }),
      setSystemConfig: (systemConfig) => set({ systemConfig }),
      logout: () => set({ user: null, token: null, bookings: [], paymentMethods: [], notifications: [] }),
    }),
    {
      name: 'nexride-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
