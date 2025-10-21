import { User } from '@supabase/supabase-js';

export interface Profesor {
  id: string;
  nombre: string;
  apellido: string;
  activo: boolean;
  verified?: boolean;
}

export interface AuthState {
  user: User | null;
  profesor: Profesor | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setProfesor: (profesor: Profesor | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}
