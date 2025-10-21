export interface Materia {
  id: number;
  nombre: string;
  codigo?: string;
  grupo?: string;
}

export interface SesionActiva {
  id: number;
  materia_id: number;
  fecha: string;
  tema: string | null;
  hora_inicio: string;
  estado: string;
  materia_nombre: string;
  duracion_minutos?: number;
}

export interface ScrapedStudent {
  boleta: string;
  nombreCompleto: string;
  carrera?: string;
  escuela?: string;
}

export type FeedbackType = 'info' | 'success' | 'warning' | 'error';

export interface ScanFeedback {
  type: FeedbackType;
  title: string;
  message: string;
}

export interface AttendanceEntry {
  id: string;
  boleta: string;
  nombreCompleto: string;
  estado: 'presente' | 'tardanza';
  minutosTardanza: number;
  timestamp: string;
  resumen?: string | null;
}
