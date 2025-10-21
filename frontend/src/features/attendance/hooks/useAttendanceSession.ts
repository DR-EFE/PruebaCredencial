import { useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';

import { supabase } from '@/core/api/supabaseClient';

import { Materia, SesionActiva } from '../types';

interface UseAttendanceSessionOptions {
  profesorId?: string;
}

interface EnsureSessionResult {
  session: SesionActiva | null;
  changed: boolean;
}

export const useAttendanceSession = ({ profesorId }: UseAttendanceSessionOptions) => {
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [loadingMaterias, setLoadingMaterias] = useState(true);
  const [selectedMateriaId, setSelectedMateriaId] = useState<number | null>(null);
  const [sesionActiva, setSesionActiva] = useState<SesionActiva | null>(null);
  const [loadingSesion, setLoadingSesion] = useState(false);

  const selectedMateria = useMemo(
    () => (selectedMateriaId ? materias.find((materia) => materia.id === selectedMateriaId) ?? null : null),
    [materias, selectedMateriaId]
  );

  const loadMaterias = useCallback(async () => {
    if (!profesorId) {
      setMaterias([]);
      setSelectedMateriaId(null);
      setLoadingMaterias(false);
      return;
    }

    setLoadingMaterias(true);
    try {
      const { data, error } = await supabase
        .from('materias')
        .select('id, nombre, codigo, grupo')
        .eq('profesor_id', profesorId)
        .eq('activo', true)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setMaterias(data ?? []);

      if (data && data.length > 0) {
        setSelectedMateriaId((prev) =>
          prev && data.some((materia) => materia.id === prev) ? prev : data[0].id
        );
      } else {
        setSelectedMateriaId(null);
      }
    } finally {
      setLoadingMaterias(false);
    }
  }, [profesorId]);

  const ensureSesion = useCallback(
    async (materia: Materia): Promise<EnsureSessionResult> => {
      setLoadingSesion(true);
      try {
        const todayDate = new Date();
        const dayOfWeek = todayDate.getDay();
        const isoDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;

        const { data: horario } = await supabase
          .from('horarios')
          .select('duracion_minutos')
          .eq('materia_id', materia.id)
          .eq('dia_semana', isoDayOfWeek)
          .single();

        const duracionClase = horario?.duracion_minutos ?? 90;
        const today = format(todayDate, 'yyyy-MM-dd');

        if (
          sesionActiva &&
          sesionActiva.materia_id === materia.id &&
          sesionActiva.fecha &&
          sesionActiva.fecha.startsWith(today)
        ) {
          if (sesionActiva.duracion_minutos !== duracionClase) {
            setSesionActiva((prev) =>
              prev ? { ...prev, duracion_minutos: duracionClase } : prev
            );
          }

          return { session: sesionActiva, changed: false };
        }

        const { data: existingSessions, error: existingError } = await supabase
          .from('sesiones')
          .select('*')
          .eq('materia_id', materia.id)
          .eq('fecha', today)
          .order('created_at', { ascending: false })
          .limit(1);

        if (existingError) {
          throw existingError;
        }

        if (existingSessions && existingSessions.length > 0) {
          const session = existingSessions[0];
          const hydratedSession: SesionActiva = {
            ...session,
            materia_nombre: materia.nombre,
            duracion_minutos: duracionClase,
          };
          const changed = !sesionActiva || sesionActiva.id !== session.id;
          setSesionActiva(hydratedSession);
          return { session: hydratedSession, changed };
        }

        const horaInicio = format(new Date(), 'HH:mm:ss');
        const { data: nuevaSesion, error: createError } = await supabase
          .from('sesiones')
          .insert({
            materia_id: materia.id,
            fecha: today,
            tema: 'Asistencia',
            hora_inicio: horaInicio,
            estado: 'impartida',
            created_by: profesorId,
          })
          .select('*')
          .single();

        if (createError) {
          throw createError;
        }

        const nuevaSesionHydrated: SesionActiva = {
          ...nuevaSesion,
          materia_nombre: materia.nombre,
          duracion_minutos: duracionClase,
        };

        setSesionActiva(nuevaSesionHydrated);
        return { session: nuevaSesionHydrated, changed: true };
      } catch (error) {
        setSesionActiva(null);
        throw error;
      } finally {
        setLoadingSesion(false);
      }
    },
    [profesorId, sesionActiva]
  );

  useEffect(() => {
    loadMaterias();
  }, [loadMaterias]);

  return {
    materias,
    loadingMaterias,
    selectedMateriaId,
    setSelectedMateriaId,
    selectedMateria,
    sesionActiva,
    ensureSesion,
    loadingSesion,
    reloadMaterias: loadMaterias,
  };
};
