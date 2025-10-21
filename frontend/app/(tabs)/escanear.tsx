import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  FlatList,
  Modal,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import * as Crypto from 'expo-crypto';
import * as Network from 'expo-network';

interface Materia {
  id: number;
  nombre: string;
  codigo?: string;
  grupo?: string;
}

interface SesionActiva {
  id: number;
  materia_id: number;
  fecha: string;
  tema: string | null;
  hora_inicio: string;
  estado: string;
  materia_nombre: string;
}

interface ScrapedStudent {
  boleta: string;
  nombreCompleto: string;
  carrera?: string;
  escuela?: string;
}

const SCRAPER_ALLOWED_DOMAINS = [
  'servicios.dae.ipn.mx',
  'upiicsa.ipn.mx',
  'ipn.mx',
];




const sanitizeText = (text: string) =>
  text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#(\d+);/g, (_, code) => {
      const parsed = Number(code);
      return Number.isFinite(parsed) ? String.fromCharCode(parsed) : '';
    })
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const parseStudentHtml = (html: string): ScrapedStudent => {
  const boletaMatch = html.match(/Boleta:\s*([0-9]{8,10})/i);
  const nombreMatch = html.match(/Nombre:\s*([^<\n]+)/i);
  const carreraMatch = html.match(/Programa\s+acad[eé]mico:\s*([^<\n]+)/i);
  const escuelaMatch =
    html.match(/Unidad\s+Profesional[^<]+/i) ||
    html.match(/UPIICSA/i);

  if (!boletaMatch || !nombreMatch) {
    throw new Error(
      'Datos estudiantiles incompletos o inválidos (no se encontró boleta o nombre)'
    );
  }

  return {
    boleta: sanitizeText(boletaMatch[1]),
    nombreCompleto: sanitizeText(nombreMatch[1]),
    carrera: carreraMatch ? sanitizeText(carreraMatch[1]) : undefined,
    escuela: escuelaMatch ? sanitizeText(escuelaMatch[0]) : 'UPIICSA',
  };
};

const isAllowedUrl = (url: URL) =>
  url.protocol === 'https:' &&
  SCRAPER_ALLOWED_DOMAINS.some((host) => url.hostname.toLowerCase().endsWith(host));

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const checkConnectivity = async () => {
  const networkState = await Network.getNetworkStateAsync();
  if (!networkState.isConnected) {
    throw new Error('No hay conexión a internet');
  }

  const ipAddress = await Network.getIpAddressAsync();
  if (!ipAddress) {
    throw new Error('La red no está reachable');
  }
};

const fetchStudentProfile = async (url: URL): Promise<ScrapedStudent> => {
  const hashParam = url.searchParams.get('h');
  const targetUrl = hashParam
    ? `https://servicios.dae.ipn.mx/vcred/?h=${hashParam}`
    : url.toString();

  const HEADERS: Record<string, string> = {
    'User-Agent':
      'Mozilla/5.0 (Linux; Android 10; Pixel 4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0 Mobile Safari/537.36',
    Accept:
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'es-MX,es;q=0.9,en;q=0.8',
    Referer: 'https://servicios.dae.ipn.mx/',
    Origin: 'https://servicios.dae.ipn.mx',
    Connection: 'keep-alive',
  };

  try {
    console.log('Intentando scraping directo:', targetUrl);

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: HEADERS,
    });

    console.log('HTTP status:', response.status);

    if (!response.ok && response.status !== 0) {
      throw new Error(`Error HTTP ${response.status}`);
    }

    const html = await response.text();
    console.log('HTML recibido:', html.length, 'bytes');

    if (!html || html.length < 100) {
      throw new Error('Respuesta vacía o bloqueada');
    }

    return parseStudentHtml(html);
  } catch (error: any) {
    console.error('Scraping falló:', error.message || error);
    throw new Error(`No se pudo obtener la información del estudiante. Causa: ${error.message || 'Error desconocido'}`);
  }
};

const splitNombre = (nombreCompleto: string) => {
  const partes = nombreCompleto.split(/\s+/).filter(Boolean);
  if (partes.length === 0) {
    return { nombres: '', apellidos: '' };
  }
  if (partes.length === 1) {
    return { nombres: partes[0], apellidos: '' };
  }
  if (partes.length === 2) {
    return { nombres: partes[0], apellidos: partes[1] };
  }
  const apellidos = partes.slice(-2).join(' ');
  const nombres = partes.slice(0, partes.length - 2).join(' ');
  return { nombres, apellidos };
};

const computeHash = async (payload: string) => {
  try {
    return await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, payload);
  } catch (error) {
    console.warn('No se pudo generar hash de verificación', error);
    return '';
  }
};

export default function EscanearScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [loadingMaterias, setLoadingMaterias] = useState(true);
  const [selectedMateriaId, setSelectedMateriaId] = useState<number | null>(null);
  const [sesionActiva, setSesionActiva] = useState<SesionActiva | null>(null);
  const [loadingSesion, setLoadingSesion] = useState(false);
  const [isPickerVisible, setPickerVisible] = useState(false);
  const profesor = useAuthStore((state) => state.profesor);
  const selectedMateria = selectedMateriaId
    ? materias.find((materia) => materia.id === selectedMateriaId) ?? null
    : null;
  const canScan = !!sesionActiva && !loadingSesion;

  useEffect(() => {
    if (!profesor) return;
    loadMaterias();
  }, [profesor]);

  useEffect(() => {
    if (!selectedMateria) {
      setSesionActiva(null);
      setScanning(false);
      return;
    }
    ensureSesion(selectedMateria);
  }, [selectedMateriaId]);

  useEffect(() => {
    if (!isPickerVisible && canScan && !processing) {
      setScanning(true);
    }
  }, [isPickerVisible, canScan, processing]);

  const loadMaterias = async () => {
    try {
      if (!profesor) return;
      setLoadingMaterias(true);
      const { data, error } = await supabase
        .from('materias')
        .select('id, nombre, codigo, grupo')
        .eq('profesor_id', profesor.id)
        .eq('activo', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setMaterias(data || []);
      if (data && data.length > 0) {
        setSelectedMateriaId((prev) =>
          prev && data.some((materia) => materia.id === prev) ? prev : data[0].id
        );
      } else {
        setSelectedMateriaId(null);
      }
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', 'No se pudieron cargar las materias');
    } finally {
      setLoadingMaterias(false);
    }
  };

  const ensureSesion = async (materia: Materia) => {
    try {
      setLoadingSesion(true);
      setProcessing(false);
      setScanning(false);

      const today = format(new Date(), 'yyyy-MM-dd');

      if (
        sesionActiva &&
        sesionActiva.materia_id === materia.id &&
        sesionActiva.fecha &&
        sesionActiva.fecha.startsWith(today)
      ) {
        setScanning(true);
        return;
      }

      const { data: existingSessions, error: existingError } = await supabase
        .from('sesiones')
        .select('*')
        .eq('materia_id', materia.id)
        .eq('fecha', today)
        .order('created_at', { ascending: false })
        .limit(1);

      if (existingError) throw existingError;

      if (existingSessions && existingSessions.length > 0) {
        const session = existingSessions[0];
        setSesionActiva({
          ...session,
          materia_nombre: materia.nombre,
        });
        setScanning(true);
        return;
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
          created_by: profesor?.id,
        })
        .select('*')
        .single();

      if (createError) throw createError;

      setSesionActiva({
        ...nuevaSesion,
        materia_nombre: materia.nombre,
      });
      setScanning(true);
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', 'No se pudo preparar la sesión para escanear');
      setSesionActiva(null);
    } finally {
      setLoadingSesion(false);
    }
  };

  const renderMateriaOption = ({ item }: { item: Materia }) => {
    const isActive = item.id === selectedMateriaId;
    const details: string[] = [];
    if (item.codigo) details.push(item.codigo);
    if (item.grupo) details.push(`Grupo ${item.grupo}`);

    return (
      <TouchableOpacity
        style={[styles.modalItem, isActive && styles.modalItemActive]}
        onPress={() => {
          setProcessing(false);
          setScanning(false);
          setSelectedMateriaId(item.id);
          setPickerVisible(false);
        }}
      >
        <Text style={[styles.modalItemText, isActive && styles.modalItemTextActive]}>
          {item.nombre}
        </Text>
        {details.length > 0 && (
          <Text style={styles.modalItemSubtext}>{details.join(' | ')}</Text>
        )}
      </TouchableOpacity>
    );
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={64} color="#d1d5db" />
          <Text style={styles.permissionTitle}>Permiso de Cámara Requerido</Text>
          <Text style={styles.permissionText}>
            Necesitamos acceso a tu cámara para escanear los códigos QR de las credenciales
          </Text>
          <TouchableOpacity style={styles.button} onPress={requestPermission}>
            <Text style={styles.buttonText}>Permitir Cámara</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!sesionActiva) {
    return (
      <View style={styles.container}>
        <View style={styles.noSessionContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#f59e0b" />
          <Text style={styles.noSessionTitle}>No hay sesión activa</Text>
          <Text style={styles.noSessionText}>
            Primero debes iniciar una sesión desde la pantalla de Mis Materias
          </Text>
        </View>
      </View>
    );
  }

  if (loadingMaterias) {
    return (
      <View style={styles.container}>
        <View style={styles.noSessionContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.noSessionTitle}>Cargando materias</Text>
        </View>
      </View>
    );
  }

  if (materias.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.noSessionContainer}>
          <Ionicons name="book-outline" size={64} color="#d1d5db" />
          <Text style={styles.noSessionTitle}>No tienes materias registradas</Text>
          <Text style={styles.noSessionText}>
            Crea materias desde la pantalla de Mis Materias para comenzar a registrar asistencias.
          </Text>
        </View>
      </View>
    );
  }

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (processing || !scanning || !sesionActiva) return;

    setProcessing(true);
    setScanning(false);

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
          Alert.alert('Error', 'URL no permitida. Usa una credencial institucional válida.');
          setScanning(true);
          setProcessing(false);
          return;
        }

        await checkConnectivity();
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
        Alert.alert('Error', 'Código QR inválido');
        setScanning(true);
        setProcessing(false);
        return;
      }

      const { data: estudiante, error: estudianteError } = await supabase
        .from('estudiantes')
        .select('*')
        .eq('boleta', scannedBoleta)
        .single();

      if (estudianteError || !estudiante) {
        Alert.alert(
          'Estudiante no encontrado',
          `La boleta "${scannedBoleta}" no corresponde a ningún estudiante registrado en el sistema.`
        );
        setScanning(true);
        setProcessing(false);
        return;
      }

      if (scrapedProfile && scrapedProfile.boleta !== scannedBoleta) {
        Alert.alert(
          'Datos inconsistentes',
          'La credencial escaneada no coincide con la información encontrada.'
        );
        setScanning(true);
        setProcessing(false);
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
          const encryptedUrl = parsedUrl.toString();
          if (urlActual !== encryptedUrl) {
            updates.original_url = encryptedUrl;
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

          if (updateError) throw updateError;
          updateSummary =
            updatedFields.length > 0
              ? `Datos sincronizados (${updatedFields.join(', ')})`
              : 'Datos sincronizados';
        }
      }

      const { data: inscripcion, error: inscripcionError } = await supabase
        .from('inscripciones')
        .select('*')
        .eq('boleta', scannedBoleta)
        .eq('materia_id', sesionActiva.materia_id)
        .eq('estado_inscripcion', 'activa')
        .single();

      if (inscripcionError || !inscripcion) {
        Alert.alert(
          'Error',
          `${estudiante.nombre} ${estudiante.apellido} no está inscrito en esta materia.`
        );
        setScanning(true);
        setProcessing(false);
        return;
      }

      const { data: asistenciaExistente } = await supabase
        .from('asistencias')
        .select('*')
        .eq('boleta', scannedBoleta)
        .eq('sesion_id', sesionActiva.id)
        .single();

      if (asistenciaExistente) {
        Alert.alert(
          'Aviso',
          `${estudiante.nombre} ${estudiante.apellido} ya tiene una asistencia registrada para esta sesión.`
        );
        setScanning(true);
        setProcessing(false);
        return;
      }

      const horaReferencia = sesionActiva.hora_inicio || format(new Date(), 'HH:mm:ss');
      const horaInicio = new Date(`2000-01-01T${horaReferencia}`);
      const horaActual = new Date();
      const diferenciaMinutos = Math.floor(
        (horaActual.getTime() - horaInicio.getTime()) / (1000 * 60)
      );

      let estado = 'presente';
      let minutosTardanza = 0;

      if (diferenciaMinutos > 10) {
        estado = 'tardanza';
        minutosTardanza = diferenciaMinutos;
      }

      const { error: asistenciaError } = await supabase
        .from('asistencias')
        .insert({
          boleta: scannedBoleta,
          materia_id: sesionActiva.materia_id,
          sesion_id: sesionActiva.id,
          fecha_sesion: new Date().toISOString(),
          estado,
          minutos_tardanza: minutosTardanza,
          created_by: profesor?.id,
        });

      if (asistenciaError) throw asistenciaError;

      const mensaje =
        estado === 'presente'
          ? `Asistencia registrada!\n${estudiante.nombre} ${estudiante.apellido}`
          : `Tardanza registrada\n${estudiante.nombre} ${estudiante.apellido}\n${minutosTardanza} minutos tarde`;

      const mensajeFinal = updateSummary ? `${mensaje}\n\n${updateSummary}` : mensaje;

      Alert.alert('Éxito', mensajeFinal);
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', error.message || 'No se pudo registrar la asistencia. Inténtalo de nuevo.');
    } finally {
      setTimeout(() => {
        setScanning(true);
        setProcessing(false);
      }, 2000);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.sessionInfo}>
        <Text style={styles.selectorLabel}>Materia</Text>
        <TouchableOpacity
          style={styles.selectorInput}
          onPress={() => {
            setScanning(false);
            setPickerVisible(true);
          }}
        >
          <Text style={styles.selectorValue}>
            {selectedMateria ? selectedMateria.nombre : 'Selecciona una materia'}
          </Text>
          <Ionicons
            name={isPickerVisible ? 'chevron-up' : 'chevron-down'}
            size={18}
            color="#2563eb"
          />
        </TouchableOpacity>

        {selectedMateria && (
          loadingSesion ? (
            <View style={styles.sessionLoading}>
              <ActivityIndicator size="small" color="#2563eb" />
              <Text style={styles.sessionLoadingText}>Preparando sesión...</Text>
            </View>
          ) : sesionActiva ? (
            <>
              <View style={styles.sessionBadge}>
                <Ionicons name="radio-button-on" size={12} color="#10b981" />
                <Text style={styles.sessionBadgeText}>Sesion lista</Text>
              </View>
              <Text style={styles.sessionTitle}>{sesionActiva.materia_nombre}</Text>
              <Text style={styles.sessionSubtitle}>
                {format(new Date(sesionActiva.fecha), "d 'de' MMMM, yyyy")}
              </Text>
            </>
          ) : (
            <Text style={styles.sessionHelper}>
              Selecciona una materia para preparar la sesión de asistencia.
            </Text>
          )
        )}
      </View>

      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          facing="back"
          onBarcodeScanned={canScan && scanning ? handleBarCodeScanned : undefined}
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
        >
          <View style={styles.overlay}>
            <View style={styles.scanArea}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
          </View>
        </CameraView>
      </View>

      <View style={styles.instructions}>
        <Text style={styles.instructionsTitle}>
          {processing
            ? 'Procesando...'
            : canScan
            ? 'Escanea la credencial del estudiante'
            : 'Selecciona una materia para comenzar'}
        </Text>
        <Text style={styles.instructionsText}>
          {canScan
            ? 'Coloca el código QR dentro del marco'
            : 'Elige una materia para iniciar el registro de asistencia'}
        </Text>
      </View>

      <Modal
        visible={isPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Tus materias</Text>
            <FlatList
              data={materias}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderMateriaOption}
              contentContainerStyle={styles.modalList}
            />
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setPickerVisible(false)}>
              <Text style={styles.modalCloseText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {processing && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#fff',
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  noSessionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#fff',
  },
  noSessionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  noSessionText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  sessionInfo: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  selectorLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    marginBottom: 8,
    letterSpacing: 0.8,
  },
  selectorInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
  },
  selectorValue: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  sessionLoading: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sessionLoadingText: {
    fontSize: 14,
    color: '#2563eb',
    marginLeft: 8,
  },
  sessionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  sessionBadgeText: {
    fontSize: 12,
    color: '#065f46',
    fontWeight: '600',
    marginLeft: 4,
  },
  sessionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  sessionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  sessionHelper: {
    fontSize: 14,
    color: '#6b7280',
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#fff',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  instructions: {
    backgroundColor: '#fff',
    padding: 24,
    alignItems: 'center',
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 14,
    color: '#6b7280',
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  modalList: {
    paddingVertical: 4,
  },
  modalItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 8,
  },
  modalItemActive: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  modalItemText: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '600',
  },
  modalItemTextActive: {
    color: '#1d4ed8',
  },
  modalItemSubtext: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  modalCloseButton: {
    marginTop: 4,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#2563eb',
    alignItems: 'center',
  },
  modalCloseText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
