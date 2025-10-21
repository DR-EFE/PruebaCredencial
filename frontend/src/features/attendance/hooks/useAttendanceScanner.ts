import { useCallback, useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import * as Crypto from 'expo-crypto';

import { Profesor } from '@/core/auth/types';
import { supabase } from '@/core/api/supabaseClient';

import {
  AttendanceEntry,
  ScanFeedback,
  ScrapedStudent,
  SesionActiva,
} from '../types';
import { fetchStudentProfile, isAllowedUrl } from '../services/studentProfileService';
import { splitNombre } from '../utils/credentialParsing';

interface UseAttendanceScannerParams {
  sesionActiva: SesionActiva | null;
  profesor: Profesor | null;
}

interface BarCodeEventPayload {
  data: string;
}

const computeHash = async (payload: string) => {
  try {
    return await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, payload);
  } catch (error) {
    console.warn('No se pudo generar hash de verificación', error);
    return '';
  }
};

export const useAttendanceScanner = ({
  sesionActiva,
  profesor,
}: UseAttendanceScannerParams) => {
  const [processing, setProcessing] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [feedback, setFeedback] = useState<ScanFeedback | null>(null);
  const [recentAttendance, setRecentAttendance] = useState<AttendanceEntry[]>([]);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousSessionIdRef = useRef<number | null>(null);

  const clearResumeTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const resumeScanning = useCallback(
    (delay = 1000) => {
      setProcessing(false);
      clearResumeTimeout();
      timeoutRef.current = setTimeout(() => setScanning(true), delay);
    },
    [clearResumeTimeout]
  );

  useEffect(() => () => clearResumeTimeout(), [clearResumeTimeout]);

  useEffect(() => {
    if (sesionActiva?.id !== previousSessionIdRef.current) {
      previousSessionIdRef.current = sesionActiva?.id ?? null;
      setRecentAttendance([]);
      setFeedback(null);
    }

    setScanning(Boolean(sesionActiva));
    setProcessing(false);
  }, [sesionActiva]);

  const handleBarCodeScanned = useCallback(
    async ({ data }: BarCodeEventPayload) => {
      if (processing || !scanning || !sesionActiva) {
        return;
      }

      setProcessing(true);
      setScanning(false);
      setFeedback({
        type: 'info',
        title: 'Procesando credencial...',
        message: 'Validando código QR y sincronizando datos del estudiante.',
      });

      try {
        const rawContent = data.trim();
        let scannedBoleta: string | null = null;
        let scrapedProfile: ScrapedStudent | null = null;
        let verificationHash = '';
        let parsedUrl: URL | null = null;

        try {
          parsedUrl = new URL(rawContent);
        } catch {
          parsedUrl = null;
        }

        if (parsedUrl) {
          if (!isAllowedUrl(parsedUrl)) {
            setFeedback({
              type: 'error',
              title: 'URL no permitida',
              message: 'Usa una credencial institucional válida emitida por el IPN.',
            });
            resumeScanning(900);
            return;
          }

          scrapedProfile = await fetchStudentProfile(parsedUrl);
          scannedBoleta = scrapedProfile.boleta;
          verificationHash = await computeHash(
            `${scrapedProfile.boleta}${scrapedProfile.nombreCompleto}${Date.now()}`
          );
        } else {
          const boletaMatch = rawContent.match(/\d{10}/);
          if (boletaMatch) {
            scannedBoleta = boletaMatch[0];
          }
        }

        if (!scannedBoleta || !/^\d{10}$/.test(scannedBoleta)) {
          setFeedback({
            type: 'error',
            title: 'Código inválido',
            message: 'No se detectó una boleta válida dentro del código QR.',
          });
          resumeScanning(900);
          return;
        }

        if (!sesionActiva) {
          setFeedback({
            type: 'warning',
            title: 'Sesión no disponible',
            message: 'Selecciona una materia para continuar con el pase de lista.',
          });
          resumeScanning(900);
          return;
        }

        const { data: estudiante, error: estudianteError } = await supabase
          .from('estudiantes')
          .select('*')
          .eq('boleta', scannedBoleta)
          .single();

        if (estudianteError || !estudiante) {
          setFeedback({
            type: 'error',
            title: 'Estudiante no encontrado',
            message: `La boleta ${scannedBoleta} no está registrada en la base de datos.`,
          });
          resumeScanning(1100);
          return;
        }

        if (scrapedProfile && scrapedProfile.boleta !== scannedBoleta) {
          setFeedback({
            type: 'warning',
            title: 'Datos inconsistentes',
            message: 'La credencial escaneada no coincide con la boleta registrada.',
          });
          resumeScanning(1100);
          return;
        }

        let updateSummary: string | null = null;

        if (scrapedProfile) {
          const updates: Record<string, any> = {};
          const updatedFields: string[] = [];
          const { nombres, apellidos } = splitNombre(scrapedProfile.nombreCompleto);

          if ('nombre' in estudiante && nombres && estudiante.nombre !== nombres) {
            updates.nombre = nombres;
            updatedFields.push('nombre');
          }

          if ('apellido' in estudiante && apellidos && estudiante.apellido !== apellidos) {
            updates.apellido = apellidos;
            updatedFields.push('apellido');
          }

          if ('carrera' in estudiante && scrapedProfile.carrera) {
            const carreraActual = (estudiante as Record<string, any>).carrera;
            if (carreraActual !== scrapedProfile.carrera) {
              updates.carrera = scrapedProfile.carrera;
              updatedFields.push('carrera');
            }
          }

          if ('escuela' in estudiante && scrapedProfile.escuela) {
            const escuelaActual = (estudiante as Record<string, any>).escuela;
            if (escuelaActual !== scrapedProfile.escuela) {
              updates.escuela = scrapedProfile.escuela;
              updatedFields.push('escuela');
            }
          }

          if ('hash_verificacion' in estudiante && verificationHash) {
            const hashActual = (estudiante as Record<string, any>).hash_verificacion;
            if (hashActual !== verificationHash) {
              updates.hash_verificacion = verificationHash;
              updatedFields.push('hash_verificacion');
            }
          }

          if ('original_url' in estudiante && parsedUrl) {
            const urlActual = (estudiante as Record<string, any>).original_url;
            const serializedUrl = parsedUrl.toString();
            if (urlActual !== serializedUrl) {
              updates.original_url = serializedUrl;
              updatedFields.push('original_url');
            }
          }

          if (Object.keys(updates).length > 0) {
            updates.updated_at = new Date().toISOString();
            if (profesor?.id) {
              updates.updated_by = profesor.id;
            }

            const { error: updateError } = await supabase
              .from('estudiantes')
              .update(updates)
              .eq('boleta', scannedBoleta);

            if (updateError) {
              throw updateError;
            }

            updateSummary =
              updatedFields.length > 0
                ? `Datos sincronizados (${updatedFields.join(', ')})`
                : 'Datos sincronizados';
          }
        }

        const { error: inscripcionError } = await supabase
          .from('inscripciones')
          .select('id')
          .eq('boleta', scannedBoleta)
          .eq('materia_id', sesionActiva.materia_id)
          .eq('estado_inscripcion', 'activa')
          .single();

        if (inscripcionError && inscripcionError.code === 'PGRST116') {
          const { error: insertError } = await supabase
            .from('inscripciones')
            .insert({
              boleta: scannedBoleta,
              materia_id: sesionActiva.materia_id,
              created_by: profesor?.id,
            })
            .select('id')
            .single();

          if (insertError) {
            setFeedback({
              type: 'error',
              title: 'Error de inscripción',
              message: `No se pudo inscribir a ${estudiante.nombre} en la materia.`,
            });
            resumeScanning(1500);
            return;
          }

          setFeedback({
            type: 'success',
            title: 'Inscripción exitosa',
            message: `${estudiante.nombre} ${estudiante.apellido} ha sido inscrito en esta materia.`,
          });
        } else if (inscripcionError) {
          setFeedback({
            type: 'error',
            title: 'Error de inscripción',
            message: 'Ocurrió un error al verificar la inscripción.',
          });
          resumeScanning(1100);
          return;
        }

        const { data: asistenciaExistente } = await supabase
          .from('asistencias')
          .select('*')
          .eq('boleta', scannedBoleta)
          .eq('sesion_id', sesionActiva.id)
          .single();

        if (asistenciaExistente) {
          setFeedback({
            type: 'warning',
            title: 'Registro duplicado',
            message: `${estudiante.nombre} ${estudiante.apellido} ya tiene asistencia registrada en esta sesión.`,
          });
          resumeScanning(1100);
          return;
        }

        const horaReferencia = sesionActiva.hora_inicio || format(new Date(), 'HH:mm:ss');
        const now = new Date();
        const [hours, minutes, seconds] = horaReferencia.split(':').map(Number);
        const horaInicio = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          hours,
          minutes,
          seconds
        );

        const diferenciaMinutos = Math.floor((now.getTime() - horaInicio.getTime()) / (1000 * 60));
        const duracionClase = sesionActiva.duracion_minutos ?? 90;

        if (diferenciaMinutos < 0 || diferenciaMinutos > duracionClase) {
          setFeedback({
            type: 'error',
            title: 'Clase no iniciada o terminada',
            message: `No se puede registrar, la clase de ${duracionClase} min ya finalizó o no ha empezado.`,
          });
          resumeScanning(1500);
          return;
        }

        let estado: 'presente' | 'tardanza' = 'presente';
        let minutosTardanza = 0;

        if (diferenciaMinutos > 15) {
          estado = 'tardanza';
          minutosTardanza = diferenciaMinutos;
        }

        const { error: asistenciaError } = await supabase.from('asistencias').insert({
          boleta: scannedBoleta,
          materia_id: sesionActiva.materia_id,
          sesion_id: sesionActiva.id,
          fecha_sesion: new Date().toISOString(),
          estado,
          minutos_tardanza: minutosTardanza,
          created_by: profesor?.id,
        });

        if (asistenciaError) {
          throw asistenciaError;
        }

        const nombreCompletoDb =
          `${estudiante.nombre ?? ''} ${estudiante.apellido ?? ''}`.trim() ||
          scrapedProfile?.nombreCompleto ||
          scannedBoleta;

        const attendanceEntry: AttendanceEntry = {
          id: `${sesionActiva.id}-${scannedBoleta}-${Date.now()}`,
          boleta: scannedBoleta,
          nombreCompleto: nombreCompletoDb,
          estado,
          minutosTardanza,
          timestamp: new Date().toISOString(),
          resumen: updateSummary,
        };

        setRecentAttendance((prev) => [attendanceEntry, ...prev].slice(0, 25));

        const baseMessage =
          estado === 'presente'
            ? `${nombreCompletoDb} registrado como presente.`
            : `${nombreCompletoDb} llegó con ${minutosTardanza} minutos de tardanza.`;

        const detailMessage = updateSummary ? `${baseMessage}\n${updateSummary}` : baseMessage;

        setFeedback({
          type: estado === 'presente' ? 'success' : 'warning',
          title: estado === 'presente' ? 'Asistencia registrada' : 'Tardanza registrada',
          message: detailMessage,
        });

        resumeScanning(estado === 'presente' ? 800 : 1300);
      } catch (error: any) {
        setFeedback({
          type: 'error',
          title: 'Error al registrar asistencia',
          message: error?.message ?? 'No se pudo registrar la asistencia. Inténtalo de nuevo.',
        });
        resumeScanning(1500);
      }
    },
    [processing, scanning, sesionActiva, profesor, resumeScanning]
  );

  const clearFeedback = useCallback(() => setFeedback(null), []);
  const stopProcessing = useCallback(() => setProcessing(false), []);
  const resetRecentAttendance = useCallback(() => setRecentAttendance([]), []);

  return {
    scanning,
    setScanning,
    processing,
    stopProcessing,
    feedback,
    clearFeedback,
    recentAttendance,
    resetRecentAttendance,
    handleBarCodeScanned,
  };
};
