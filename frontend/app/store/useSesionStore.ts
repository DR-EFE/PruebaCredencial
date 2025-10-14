import { create } from 'zustand';

interface Sesion {
  id: number;
  materia_id: number;
  materia_nombre: string;
  fecha: string;
  tema: string;
  hora_inicio: string;
  estado: string;
}

interface SesionState {
  sesionActiva: Sesion | null;
  setSesionActiva: (sesion: Sesion | null) => void;
}

export const useSesionStore = create<SesionState>((set) => ({
  sesionActiva: null,
  setSesionActiva: (sesionActiva) => set({ sesionActiva }),
}));
