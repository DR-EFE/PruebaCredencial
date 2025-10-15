import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { supabase } from '@/lib/supabase';
import { useSesionStore } from '@/store/useSesionStore';
import { useAuthStore } from '@/store/useAuthStore';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';

export default function EscanearScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(true);
  const [processing, setProcessing] = useState(false);
  const { sesionActiva } = useSesionStore();
  const profesor = useAuthStore((state) => state.profesor);

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

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (processing || !scanning) return;

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
      const horaInicio = new Date(`2000-01-01T${sesionActiva.hora_inicio}`);
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
      {/* Info de sesión activa */}
      <View style={styles.sessionInfo}>
        <View style={styles.sessionBadge}>
          <Ionicons name="radio-button-on" size={12} color="#10b981" />
          <Text style={styles.sessionBadgeText}>Sesión Activa</Text>
        </View>
        <Text style={styles.sessionTitle}>{sesionActiva.materia_nombre}</Text>
        <Text style={styles.sessionSubtitle}>
          {format(new Date(sesionActiva.fecha), "d 'de' MMMM, yyyy")}
        </Text>
      </View>

      {/* Cámara */}
      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          facing="back"
          onBarcodeScanned={scanning ? handleBarCodeScanned : undefined}
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

      {/* Instrucciones */}
      <View style={styles.instructions}>
        <Text style={styles.instructionsTitle}>
          {processing ? 'Procesando...' : 'Escanea la credencial del estudiante'}
        </Text>
        <Text style={styles.instructionsText}>
          Coloca el código QR dentro del marco
        </Text>
      </View>

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
});
