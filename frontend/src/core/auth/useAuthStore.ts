import { create } from 'zustand';
import { AuthState } from './types';

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profesor: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setProfesor: (profesor) => set({ profesor }),
  setLoading: (isLoading) => set({ isLoading }),
  logout: () => set({ user: null, profesor: null }),
}));
