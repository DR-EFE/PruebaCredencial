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
      // Extraer boleta del QR (asumimos que el QR contiene la boleta)
      const boleta = data.trim();

      // Validar formato de boleta (10 dígitos)
      if (!/^[0-9]{10}$/.test(boleta)) {
        Alert.alert('Error', 'Código QR inválido');
        setScanning(true);
        setProcessing(false);
        return;
      }

      // Verificar que el estudiante existe
      const { data: estudiante, error: estudianteError } = await supabase
        .from('estudiantes')
        .select('*')
        .eq('boleta', boleta)
        .single();

      if (estudianteError || !estudiante) {
        Alert.alert('Error', 'Estudiante no encontrado');
        setScanning(true);
        setProcessing(false);
        return;
      }

      // Verificar que esté inscrito en la materia
      const { data: inscripcion, error: inscripcionError } = await supabase
        .from('inscripciones')
        .select('*')
        .eq('boleta', boleta)
        .eq('materia_id', sesionActiva.materia_id)
        .eq('estado_inscripcion', 'activa')
        .single();

      if (inscripcionError || !inscripcion) {
        Alert.alert(
          'Error',
          `${estudiante.nombre} ${estudiante.apellido} no está inscrito en esta materia`
        );
        setScanning(true);
        setProcessing(false);
        return;
      }

      // Verificar si ya se registró asistencia hoy
      const { data: asistenciaExistente } = await supabase
        .from('asistencias')
        .select('*')
        .eq('boleta', boleta)
        .eq('sesion_id', sesionActiva.id)
        .single();

      if (asistenciaExistente) {
        Alert.alert(
          'Aviso',
          `${estudiante.nombre} ${estudiante.apellido} ya tiene asistencia registrada`
        );
        setScanning(true);
        setProcessing(false);
        return;
      }

      // Calcular tardanza (si han pasado más de 10 minutos)
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

      // Registrar asistencia
      const { error: asistenciaError } = await supabase
        .from('asistencias')
        .insert({
          boleta,
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
          ? `¡Asistencia registrada!\n${estudiante.nombre} ${estudiante.apellido}`
          : `Tardanza registrada\n${estudiante.nombre} ${estudiante.apellido}\n${minutosTardanza} minutos tarde`;

      Alert.alert('Éxito', mensaje);
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', 'No se pudo registrar la asistencia');
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
              <Text style={styles.sessionLoadingText}>Preparando sesion...</Text>
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
              Selecciona una materia para preparar la sesion de asistencia.
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
            ? 'Coloca el codigo QR dentro del marco'
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
