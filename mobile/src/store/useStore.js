import { create } from 'zustand';

export const useStore = create((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  
  token: null,
  setToken: (token) => set({ token }),
  
  logout: () => set({ user: null, token: null }),
}));
