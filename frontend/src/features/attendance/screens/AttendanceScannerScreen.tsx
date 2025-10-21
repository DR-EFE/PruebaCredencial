import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';

import { useAuthStore } from '@/core/auth/useAuthStore';

import { MateriaPickerModal } from '../components/MateriaPickerModal';
import { RecentAttendanceList } from '../components/RecentAttendanceList';
import { ScannerStatus } from '../components/ScannerStatus';
import { useAttendanceScanner } from '../hooks/useAttendanceScanner';
import { useAttendanceSession } from '../hooks/useAttendanceSession';
import { ScanFeedback } from '../types';

export default function EscanearScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [isPickerVisible, setPickerVisible] = useState(false);
  const profesor = useAuthStore((state) => state.profesor);

  const {
    materias,
    loadingMaterias,
    selectedMateriaId,
    setSelectedMateriaId,
    selectedMateria,
    sesionActiva,
    ensureSesion,
    loadingSesion,
    reloadMaterias,
  } = useAttendanceSession({ profesorId: profesor?.id });

  const {
    scanning,
    setScanning,
    processing,
    stopProcessing,
    feedback,
    clearFeedback,
    recentAttendance,
    handleBarCodeScanned,
  } = useAttendanceScanner({ sesionActiva, profesor });

  const canScan = Boolean(sesionActiva) && !loadingSesion;

  useFocusEffect(
    useCallback(() => {
      reloadMaterias();
    }, [reloadMaterias])
  );

  useEffect(() => {
    if (!selectedMateria) {
      setScanning(false);
      return;
    }

    let isMounted = true;
    const prepareSession = async () => {
      try {
        const { changed } = await ensureSesion(selectedMateria);
        if (!isMounted) return;

        setScanning(true);
        if (changed) {
          clearFeedback();
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('Error ensuring session for scanner:', err);
        Alert.alert('Error', 'No se pudo preparar la sesión para escanear');
        setScanning(false);
      }
    };

    prepareSession();
    return () => {
      isMounted = false;
    };
  }, [selectedMateria, ensureSesion, setScanning, clearFeedback]);

  const defaultStatus: ScanFeedback = useMemo(() => {
    if (!canScan) {
      return {
        type: 'warning',
        title: 'Selecciona una materia',
        message: 'Elige una materia para iniciar el registro de asistencia.',
      };
    }

    if (processing) {
      return {
        type: 'info',
        title: 'Procesando...',
        message: 'Validando credencial del estudiante.',
      };
    }

    return {
      type: 'info',
      title: 'Listo para escanear',
      message: 'Coloca el código QR dentro del marco.',
    };
  }, [processing, canScan]);

  const activeStatus = feedback ?? defaultStatus;

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
          <Ionicons name='camera-outline' size={64} color='#d1d5db' />
          <Text style={styles.permissionTitle}>Permiso de cámara requerido</Text>
          <Text style={styles.permissionText}>
            Necesitamos acceso a tu cámara para escanear los códigos QR de las credenciales.
          </Text>
          <TouchableOpacity style={styles.button} onPress={requestPermission}>
            <Text style={styles.buttonText}>Permitir cámara</Text>
          </TouchableOpacity>
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
          <Ionicons name='book-outline' size={64} color='#d1d5db' />
          <Text style={styles.noSessionTitle}>No tienes materias registradas</Text>
          <Text style={styles.noSessionText}>
            Crea materias desde la pantalla de Mis Materias para comenzar a registrar asistencias.
          </Text>
        </View>
      </View>
    );
  }

  if (!sesionActiva && !loadingSesion) {
    return (
      <View style={styles.container}>
        <View style={styles.noSessionContainer}>
          <Ionicons name='alert-circle-outline' size={64} color='#f59e0b' />
          <Text style={styles.noSessionTitle}>No hay sesión activa</Text>
          <Text style={styles.noSessionText}>
            Primero debes iniciar una sesión desde la pantalla de Mis Materias.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.sessionInfo}>
        <View style={styles.sessionHeader}>
          <View style={styles.sessionTitleContainer}>
            <Ionicons name='book-outline' size={20} color='#6b7280' />
            <Text style={styles.sessionTitle} numberOfLines={1}>
              {selectedMateria ? selectedMateria.nombre : 'Selecciona materia'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.changeMateriaButton}
            onPress={() => {
              stopProcessing();
              setScanning(false);
              setPickerVisible(true);
            }}
          >
            <Text style={styles.changeMateriaButtonText}>Cambiar</Text>
          </TouchableOpacity>
        </View>
        {loadingSesion ? (
          <View style={styles.sessionLoading}>
            <ActivityIndicator size="small" color="#2563eb" />
            <Text style={styles.sessionLoadingText}>Preparando sesión...</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          facing='back'
          onBarcodeScanned={canScan && scanning ? handleBarCodeScanned : undefined}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
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

      <View style={styles.bottomPanel}>
        <ScannerStatus status={activeStatus} processing={processing} />

        <View style={styles.attendanceHeader}>
          <Text style={styles.attendanceTitle}>Pase de lista</Text>
          <View style={styles.attendanceCountBadge}>
            <Ionicons name='people' size={14} color='#2563eb' />
            <Text style={styles.attendanceCountText}>{recentAttendance.length}</Text>
          </View>
        </View>

        <RecentAttendanceList items={recentAttendance} />
      </View>

      <MateriaPickerModal
        visible={isPickerVisible}
        materias={materias}
        selectedMateriaId={selectedMateriaId}
        onSelect={(id) => {
          stopProcessing();
          setScanning(false);
          setSelectedMateriaId(id);
          setPickerVisible(false);
        }}
        onClose={() => setPickerVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
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
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginLeft: 8,
  },
  changeMateriaButton: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  changeMateriaButtonText: {
    color: '#2563eb',
    fontWeight: '600',
    fontSize: 14,
  },
  sessionLoading: {
    flexDirection: 'row',
    marginTop: 12,
    alignItems: 'center',
  },
  sessionLoadingText: {
    fontSize: 14,
    color: '#2563eb',
    marginLeft: 8,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: 240,
    height: 240,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#38bdf8',
    borderWidth: 4,
  },
  topLeft: {
    top: -2,
    left: -2,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: -2,
    right: -2,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: -2,
    left: -2,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: -2,
    right: -2,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  bottomPanel: {
    backgroundColor: '#fff',
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  attendanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  attendanceTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  attendanceCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  attendanceCountText: {
    fontSize: 13,
    color: '#2563eb',
    fontWeight: '600',
    marginLeft: 6,
  },
});
