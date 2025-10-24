import React, { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';

import { useAuthStore } from '@/core/auth/useAuthStore';

import { FeedbackBanner, FeedbackBannerProps } from '@/features/session/components/FeedbackBanner';
import { MateriaPickerModal } from '../components/MateriaPickerModal';
import { RecentAttendanceList } from '../components/RecentAttendanceList';
import { ScannerStatus } from '../components/ScannerStatus';
import { useAttendanceScanner } from '../hooks/useAttendanceScanner';
import { useAttendanceSession } from '../hooks/useAttendanceSession';
import { AttendanceEntry, ScanFeedback } from '../types';

type ScannerPhase = 'idle' | 'preparing' | 'scanning' | 'offline' | 'error';

const isOfflineError = (error: unknown) => {
  if (!error) {
    return false;
  }

  const candidate =
    typeof error === 'string'
      ? error
      : (error as { message?: string })?.message ?? '';
  const code = (error as { code?: string })?.code;

  if (code && ['ECONNABORTED', 'ENOTFOUND', 'EAI_AGAIN', 'ENETUNREACH'].includes(code)) {
    return true;
  }

  return /network|offline|internet|conexion|conection/i.test(candidate ?? '');
};

const CAMERA_PHASE_DETAILS: Record<
  ScannerPhase,
  {
    icon: React.ComponentProps<typeof Ionicons>['name'];
    badgeBackground: string;
    badgeColor: string;
    label: string;
    overlayTitle?: string;
    overlayDescription?: string;
  }
> = {
  idle: {
    icon: 'pause-circle',
    badgeBackground: 'rgba(17,24,39,0.75)',
    badgeColor: '#f8fafc',
    label: 'Selecciona materia',
    overlayTitle: 'Selecciona una materia',
    overlayDescription: 'Elige una materia para preparar la camara y empezar a escanear.',
  },
  preparing: {
    icon: 'time-outline',
    badgeBackground: 'rgba(37,99,235,0.85)',
    badgeColor: '#eff6ff',
    label: 'Preparando',
    overlayTitle: 'Preparando escaner',
    overlayDescription: 'Sincronizando la sesion y activando la camara del dispositivo.',
  },
  scanning: {
    icon: 'scan',
    badgeBackground: 'rgba(6,182,212,0.85)',
    badgeColor: '#ecfeff',
    label: 'Escaneando',
  },
  offline: {
    icon: 'cloud-offline',
    badgeBackground: 'rgba(248,113,113,0.85)',
    badgeColor: '#fee2e2',
    label: 'Sin conexion',
    overlayTitle: 'Sin conexion a internet',
    overlayDescription: 'Revisa tu conexion para continuar registrando asistencias.',
  },
  error: {
    icon: 'alert-circle',
    badgeBackground: 'rgba(249,115,22,0.85)',
    badgeColor: '#fff7ed',
    label: 'Error',
    overlayTitle: 'No se pudo preparar el escaner',
    overlayDescription: 'Intenta nuevamente o cambia de materia para continuar.',
  },
};

interface CameraStateContainerProps {
  children: ReactNode;
  phase: ScannerPhase;
  onRetry: () => void;
}

const CameraStateContainer = ({ children, phase, onRetry }: CameraStateContainerProps) => {
  const details = CAMERA_PHASE_DETAILS[phase];
  const showBlockingOverlay = Boolean(details.overlayTitle);
  const showRetry = phase === 'offline' || phase === 'error';

  return (
    <View style={styles.cameraContainer}>
      {children}
      <View
        style={[
          styles.cameraBadge,
          {
            backgroundColor: details.badgeBackground,
          },
        ]}
      >
        <Ionicons
          name={details.icon}
          size={16}
          color={details.badgeColor}
          style={styles.cameraBadgeIcon}
        />
        <Text
          style={[
            styles.cameraBadgeText,
            {
              color: details.badgeColor,
            },
          ]}
        >
          {details.label}
        </Text>
      </View>

      {showBlockingOverlay ? (
        <View style={styles.cameraBlockingOverlay}>
          <View style={styles.cameraBlockingCard}>
            <Ionicons
              name={details.icon}
              size={32}
              color={details.badgeBackground}
              style={styles.cameraBlockingIcon}
            />
            <Text style={styles.cameraBlockingTitle}>{details.overlayTitle}</Text>
            {details.overlayDescription ? (
              <Text style={styles.cameraBlockingSubtitle}>{details.overlayDescription}</Text>
            ) : null}
            {showRetry ? (
              <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
                <Text style={styles.retryButtonText}>Reintentar</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  );
};

interface ValidationStatusSectionProps {
  banner: FeedbackBannerProps | null;
  status: ScanFeedback;
  processing: boolean;
}

const ValidationStatusSection = ({ banner, status, processing }: ValidationStatusSectionProps) => (
  <View style={styles.validationSection}>
    {banner ? <FeedbackBanner {...banner} /> : null}
    <ScannerStatus status={status} processing={processing} />
  </View>
);



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
  const [scannerPhase, setScannerPhase] = useState<ScannerPhase>('idle');
  const [sessionBanner, setSessionBanner] = useState<FeedbackBannerProps | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      reloadMaterias();
    }, [reloadMaterias])
  );

  const prepareScannerSession = useCallback(async () => {
    if (!selectedMateria) {
      setScannerPhase('idle');
      setSessionBanner(null);
      setScanning(false);
      return;
    }

    setScannerPhase('preparing');
    setSessionBanner({
      type: 'info',
      title: 'Preparando escaner',
      message: 'Sincronizando la sesion y habilitando la camara.',
    });

    try {
      const { changed } = await ensureSesion(selectedMateria);
      if (!isMountedRef.current) {
        return;
      }

      setSessionBanner(null);
      setScannerPhase('scanning');
      setScanning(true);

      if (changed) {
        clearFeedback();
      }
    } catch (error) {
      if (!isMountedRef.current) {
        return;
      }

      console.error('Error ensuring session for scanner:', error);
      const offline = isOfflineError(error);

      setScannerPhase(offline ? 'offline' : 'error');
      setSessionBanner({
        type: offline ? 'warning' : 'error',
        title: offline ? 'Sin conexion a internet' : 'No se pudo preparar el escaner',
        message: offline
          ? 'Revisa tu conexion y vuelve a intentar preparar la sesion.'
          : 'Ocurrio un problema al iniciar la sesion de asistencia. Intenta nuevamente.',
      });
      setScanning(false);
    }
  }, [selectedMateria, ensureSesion, setScanning, clearFeedback, setSessionBanner, setScannerPhase]);

  useEffect(() => {
    prepareScannerSession();
  }, [prepareScannerSession]);

  const handleRetryPreparation = useCallback(() => {
    prepareScannerSession();
  }, [prepareScannerSession]);


  const defaultStatus: ScanFeedback = useMemo(() => {
    if (scannerPhase === 'offline') {
      return {
        type: 'error',
        title: 'Sin conexion',
        message: 'Revisa tu conexion a internet para continuar con el pase de lista.',
      };
    }

    if (scannerPhase === 'error') {
      return {
        type: 'error',
        title: 'No se pudo preparar el escaner',
        message: 'Intenta nuevamente para reanudar el registro de asistencias.',
      };
    }

    if (scannerPhase === 'preparing') {
      return {
        type: 'info',
        title: 'Preparando escaner',
        message: 'Sincronizando la sesion y habilitando la camara.',
      };
    }

    if (!canScan || scannerPhase === 'idle') {
      return {
        type: 'warning',
        title: 'Selecciona una materia',
        message: 'Elige una materia para iniciar el registro de asistencia.',
      };
    }

    if (processing) {
      return {
        type: 'info',
        title: 'Procesando credencial',
        message: 'Validando codigo QR y sincronizando al estudiante.',
      };
    }

    return {
      type: 'info',
      title: 'Escaneando',
      message: 'Coloca el codigo QR dentro del marco.',
    };
  }, [scannerPhase, processing, canScan]);


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
              clearFeedback();
              setScannerPhase('idle');
              setSessionBanner(null);
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

      <View style={{ flex: 3, backgroundColor: 'black' }}>
        <CameraStateContainer phase={scannerPhase} onRetry={handleRetryPreparation}>
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
        </CameraStateContainer>
      </View>

      <View style={styles.bottomPanel}>
        <View style={styles.bottomPanelContent}>
          <ValidationStatusSection
            banner={sessionBanner}
            status={activeStatus}
            processing={processing}
          />
          <View style={styles.attendanceHeader}>
            <Text style={styles.attendanceTitle}>Pase de lista</Text>
            <View style={styles.attendanceCountBadge}>
              <Ionicons name='people' size={14} color='#2563eb' />
              <Text style={styles.attendanceCountText}>{recentAttendance.length}</Text>
            </View>
          </View>
          <View style={styles.listContainer}>
            <RecentAttendanceList items={recentAttendance} />
          </View>
        </View>
      </View>

      <MateriaPickerModal
        visible={isPickerVisible}
        materias={materias}
        selectedMateriaId={selectedMateriaId}
        onSelect={(id) => {
          stopProcessing();
          setScanning(false);
          clearFeedback();
          setScannerPhase('preparing');
          setSessionBanner({
            type: 'info',
            title: 'Preparando escaner',
            message: 'Sincronizando la sesion y habilitando la camara.',
          });
          setSelectedMateriaId(id);
          if (selectedMateria?.id === id) {
            prepareScannerSession();
          }
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
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  cameraBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  cameraBadgeIcon: {
    marginRight: 6,
  },
  cameraBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  cameraBlockingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  cameraBlockingCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  cameraBlockingIcon: {
    marginBottom: 16,
  },
  cameraBlockingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 8,
  },
  cameraBlockingSubtitle: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
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
  validationSection: {
    marginBottom: 12,
  },
  bottomPanel: {
    flex: 2,
    flexShrink: 0,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  bottomPanelContent: {
    flex: 1,
  },
  listContainer: {
    flex: 1,
    minHeight: 200,
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

