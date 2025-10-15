import { create } from 'zustand';
import { User } from '@supabase/supabase-js';

interface Profesor {
  id: string;
  nombre: string;
  apellido: string;
  activo: boolean;
  verified?: boolean;
}

interface AuthState {
  user: User | null;
  profesor: Profesor | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setProfesor: (profesor: Profesor | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profesor: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setProfesor: (profesor) => set({ profesor }),
  setLoading: (isLoading) => set({ isLoading }),
  logout: () => set({ user: null, profesor: null }),
}));
