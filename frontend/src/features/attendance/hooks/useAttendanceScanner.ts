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

type EstudianteRow = {
  boleta: string;
  nombre?: string | null;
  apellido?: string | null;
  carrera?: string | null;
  escuela?: string | null;
  hash_verificacion?: string | null;
  original_url?: string | null;
};

const buildFallbackCurp = (boleta: string) => {
  const numericBoleta = boleta.replace(/\D/g, '');
  const base = `SNV${numericBoleta}CURP`;
  const padded = (base + 'X'.repeat(18)).slice(0, 18);
  return padded.toUpperCase();
};

const computeHash = async (payload: string) => {
  try {
    return await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, payload);
  } catch (error) {
    console.warn('No se pudo generar hash de verificaciÃ³n', error);
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
        message: 'Validando QR y datos del alumno.',
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
              message: 'Usa una credencial institucional vÃ¡lida emitida por el IPN.',
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
            title: 'CÃ³digo invÃ¡lido',
            message: 'No se detectÃ³ una boleta vÃ¡lida dentro del cÃ³digo QR.',
          });
          resumeScanning(900);
          return;
        }

        if (!sesionActiva) {
          setFeedback({
            type: 'warning',
            title: 'SesiÃ³n no disponible',
            message: 'Selecciona una materia para continuar con el pase de lista.',
          });
          resumeScanning(900);
          return;
        }

        const updateMessages: string[] = [];

        const { data: estudianteData, error: estudianteError } = await supabase
          .from('estudiantes')
          .select('*')
          .eq('boleta', scannedBoleta)
          .single();

        let estudiante: EstudianteRow | null = (estudianteData as EstudianteRow | null) ?? null;

        console.log('[Scanner] Resultado consulta estudiante', {
          boleta: scannedBoleta,
          estudianteEncontrado: Boolean(estudiante),
          errorCode: estudianteError?.code,
          tieneScrapedProfile: Boolean(scrapedProfile),
        });

        if (estudianteError && estudianteError.code !== 'PGRST116') {
          setFeedback({
            type: 'error',
            title: 'No se pudo consultar al estudiante',
            message: 'Ocurrio un error al validar la boleta. Intenta nuevamente.',
          });
          resumeScanning(1500);
          return;
        }

        if (!estudiante) {
          const { nombres, apellidos } = scrapedProfile
            ? splitNombre(scrapedProfile.nombreCompleto)
            : { nombres: '', apellidos: '' };

          const basePayload: Record<string, any> = {
            boleta: scannedBoleta,
            nombre: nombres || scrapedProfile?.nombreCompleto || `Alumno ${scannedBoleta}`,
          };

          const optionalFields: Record<string, any> = {
            apellido: apellidos,
            carrera: scrapedProfile?.carrera,
            escuela: scrapedProfile?.escuela,
            curp: buildFallbackCurp(scannedBoleta),
            turno: 'Sin verificar',
            hash_verificacion: verificationHash,
            original_url: parsedUrl?.toString(),
            created_by: profesor?.id,
          };

          const nuevoEstudiantePayload: Record<string, any> = { ...basePayload };

          Object.entries(optionalFields).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
              nuevoEstudiantePayload[key] = value;
            }
          });

          console.log('[Scanner] Creando nuevo estudiante', {
            boleta: scannedBoleta,
            payload: nuevoEstudiantePayload,
          });

          let insertPayload = { ...nuevoEstudiantePayload };
          const columnasRemovidas: string[] = [];
          const camposAjustados: string[] = [];
          let nuevoEstudiante: EstudianteRow | null = null;

          while (true) {
            const { data, error } = await supabase
              .from('estudiantes')
              .insert(insertPayload)
              .select('*')
              .single();

            if (!error && data) {
              nuevoEstudiante = data as EstudianteRow;
              if (columnasRemovidas.length > 0) {
                console.warn('[Scanner] Estudiante creado omitiendo columnas inexistentes', {
                  boleta: scannedBoleta,
                  columnasRemovidas,
                });
              }
              if (camposAjustados.length > 0) {
                console.warn('[Scanner] Estudiante creado con ajustes forzados', {
                  boleta: scannedBoleta,
                  camposAjustados,
                });
              }
              break;
            }

            if (error?.code === 'PGRST204') {
              const columnaNoEncontrada =
                error.message?.match(/'([^']+)' column/)?.[1] ?? null;

              if (columnaNoEncontrada && columnaNoEncontrada in insertPayload) {
                columnasRemovidas.push(columnaNoEncontrada);
                console.warn('[Scanner] Columna no encontrada al crear estudiante, reintentando', {
                  boleta: scannedBoleta,
                  columnaNoEncontrada,
                });
                delete insertPayload[columnaNoEncontrada];
                continue;
              }
            }

            if (error?.code === 'PGRST116' || error?.message?.includes('turno')) {
              if (insertPayload.turno && insertPayload.turno !== 'Matutino' && insertPayload.turno !== 'Vespertino') {
                insertPayload.turno = 'Matutino';
                camposAjustados.push('turno');
                console.warn('[Scanner] Turno no valido, se asigna Matutino por defecto', {
                  boleta: scannedBoleta,
                });
                continue;
              }
            }

            console.error('[Scanner] Error insertando estudiante', {
              boleta: scannedBoleta,
              payload: insertPayload,
              columnasRemovidas,
              camposAjustados,
              error,
            });
            setFeedback({
              type: 'error',
              title: 'No se pudo registrar al estudiante',
              message: `Hubo un problema al registrar la boleta ${scannedBoleta}.`,
            });
            resumeScanning(1500);
            return;
          }

          estudiante = nuevoEstudiante;
          updateMessages.push('Estudiante agregado al padron');
          if (camposAjustados.includes('turno')) {
            updateMessages.push('Turno pendiente de verificacion');
          }
          console.log('[Scanner] Estudiante creado correctamente', {
            boleta: scannedBoleta,
          });
        }

        if (!estudiante) {
          setFeedback({
            type: 'error',
            title: 'Estudiante no encontrado',
            message: `La boleta ${scannedBoleta} no esta registrada en la base de datos.`,
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

            updateMessages.push(
              updatedFields.length > 0
                ? `Datos sincronizados (${updatedFields.join(', ')})`
                : 'Datos sincronizados'
            );
          }
        }

        console.log('[Scanner] Verificando inscripcion', {
          boleta: scannedBoleta,
          materiaId: sesionActiva.materia_id,
        });

        const { data: inscripcion, error: inscripcionError } = await supabase
          .from('inscripciones')
          .select('id, estado_inscripcion, fecha_baja')
          .eq('boleta', scannedBoleta)
          .eq('materia_id', sesionActiva.materia_id)
          .maybeSingle();

        if (inscripcionError) {
          console.error('[Scanner] Error consultando inscripcion', {
            boleta: scannedBoleta,
            materiaId: sesionActiva.materia_id,
            errorCode: inscripcionError.code,
            errorMessage: inscripcionError.message,
          });
          setFeedback({
            type: 'error',
            title: 'Error de InscripciÃ³n',
            message: 'OcurriÃ³ un error al verificar la inscripciÃ³n del alumno.',
          });
          resumeScanning(1100);
          return;
        }

        const nombreReferencia =
          `${estudiante.nombre ?? ''} ${estudiante.apellido ?? ''}`.trim() ||
          scrapedProfile?.nombreCompleto ||
          scannedBoleta;

        if (inscripcion) {
          if (inscripcion.estado_inscripcion === 'baja' || inscripcion.fecha_baja) {
            console.warn('[Scanner] Intento de registro para alumno dado de baja', {
              boleta: scannedBoleta,
              materiaId: sesionActiva.materia_id,
            });
            setFeedback({
              type: 'error',
              title: 'Alumno dado de baja',
              message: `${nombreReferencia} ya no estÃ¡ inscrito en esta materia.`,
            });
            resumeScanning(1500);
            return;
          }
        } else {
          console.log('[Scanner] Inscripcion no encontrada, creando registro', {
            boleta: scannedBoleta,
            materiaId: sesionActiva.materia_id,
          });

          try {
            const { error: insertError } = await supabase.from('inscripciones').insert({
              boleta: scannedBoleta,
              materia_id: sesionActiva.materia_id,
              estado_inscripcion: 'activa',
              created_by: profesor?.id,
            });

            if (insertError) {
              throw insertError;
            }

            updateMessages.push('Inscripción creada automáticamente');
            console.log('[Scanner] Inscripcion creada correctamente', {
              boleta: scannedBoleta,
              materiaId: sesionActiva.materia_id,
            });
          } catch (insertError: any) {
            const isDuplicate = insertError?.code === '23505';
            const logPayload = {
              boleta: scannedBoleta,
              materiaId: sesionActiva.materia_id,
              errorCode: insertError?.code,
              errorMessage: insertError?.message,
            };

            if (isDuplicate) {
              console.warn('[Scanner] Inscripcion duplicada detectada', logPayload);
            } else {
              console.error('[Scanner] Error insertando inscripcion', logPayload);
            }

            setFeedback({
              type: 'error',
              title: isDuplicate ? 'Alumno dado de baja' : 'Error de Inscripción',
              message: isDuplicate
                ? `${nombreReferencia} tiene una inscripci?n inactiva. Reinscr?belo antes de pasar lista.`
                : `No se pudo inscribir a ${nombreReferencia} en la materia.`,
            });
            resumeScanning(1500);
            return;
          }
        }

        const { data: asistenciaExistente } = await supabase
          .from('asistencias')
          .select('*')
          .eq('boleta', scannedBoleta)
          .eq('sesion_id', sesionActiva.id)
          .single();

        if (asistenciaExistente) {
          const nombreDuplicado =
            `${estudiante.nombre ?? ''} ${estudiante.apellido ?? ''}`.trim() ||
            scrapedProfile?.nombreCompleto ||
            scannedBoleta;

          console.log('[Scanner] Asistencia duplicada detectada', {
            boleta: scannedBoleta,
            sesionId: sesionActiva.id,
          });

          setFeedback({
            type: 'warning',
            title: 'Registro duplicado',
            message: `${nombreDuplicado} ya tiene asistencia registrada en esta sesion.`,
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
            message: `No se puede registrar, la clase de ${duracionClase} min ya finalizÃ³ o no ha empezado.`,
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
          console.error('[Scanner] Error insertando asistencia', {
            boleta: scannedBoleta,
            sesionId: sesionActiva.id,
            errorCode: asistenciaError.code,
            errorMessage: asistenciaError.message,
          });
          throw asistenciaError;
        }

        const updateSummary =
          updateMessages.length > 0 ? updateMessages.join(' Â· ') : null;

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
            : `${nombreCompletoDb} llegÃ³ con ${minutosTardanza} minutos de tardanza.`;

        const detailMessage = updateSummary ? `${baseMessage}\n${updateSummary}` : baseMessage;

        setFeedback({
          type: estado === 'presente' ? 'success' : 'warning',
          title: estado === 'presente' ? 'Asistencia registrada' : 'Tardanza registrada',
          message: detailMessage,
        });

        console.log('[Scanner] Asistencia registrada', {
          boleta: scannedBoleta,
          sesionId: sesionActiva.id,
          estado,
          minutosTardanza,
          mensajes: updateMessages,
        });

        resumeScanning(estado === 'presente' ? 800 : 1300);
      } catch (error: any) {
        console.error('[Scanner] Excepcion durante el escaneo', {
          boleta: scannedBoleta,
          error,
        });
        setFeedback({
          type: 'error',
          title: 'Error al registrar asistencia',
          message: error?.message ?? 'No se pudo registrar la asistencia. Intentalo de nuevo.',
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

