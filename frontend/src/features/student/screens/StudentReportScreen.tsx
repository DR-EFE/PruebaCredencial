import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/core/api/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { useAppNotifications } from '@/ui/components/AppNotificationProvider';
import { LinearGradient } from 'expo-linear-gradient';
import { BarChart, PieChart } from 'react-native-gifted-charts';

interface Student {
  boleta: string;
  nombre: string;
  apellido: string;
  carrera: string;
  escuela: string;
  turno: string;
  curp: string;
  fotografia?: string | null;
  activo: boolean;
}

interface InfoRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}

interface ChartData {
  label: string;
  value: number;
  color: string;
}

interface AttendanceStats {
  presentes: number;
  tardanzas: number;
  faltas: number;
  totalSesiones: number;
}

type Asistencia = {
  estado: string;
};

interface SummaryCard {
  label: string;
  value: number;
  helper: string;
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  iconColor: string;
}

const InfoRow = ({ icon, label, value }: InfoRowProps) => (
  <View style={styles.infoRow}>
    <Ionicons name={icon} size={20} color="#6b7280" style={styles.infoIcon} />
    <Text style={styles.infoLabel}>{label}:</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  infoIcon: {
    marginRight: 10,
  },
  infoLabel: {
    fontWeight: '600',
    color: '#4b5563',
  },
  infoValue: {
    color: '#1f2937',
  },
});
export default function StudentReportScreen() {
  const { materiaId, boleta } = useLocalSearchParams();
  const router = useRouter();
  const { notify } = useAppNotifications();
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<Student | null>(null);
  const [materia, setMateria] = useState<{ nombre: string } | null>(null);
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadStudentReport = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null); // Clear previous error messages

    if (!boleta || typeof boleta !== 'string') {
      setErrorMessage('ID de boleta no proporcionado o inválido.');
      notify({
        type: 'error',
        title: 'Error de navegación',
        message: 'No se pudo obtener el ID de boleta.',
      });
      setLoading(false);
      return;
    }

    if (!materiaId || typeof materiaId !== 'string') {
      setErrorMessage('ID de materia no proporcionado o inválido.');
      notify({
        type: 'error',
        title: 'Error de navegación',
        message: 'No se pudo obtener el ID de materia.',
      });
      setLoading(false);
      return;
    }
    try {
      // Fetch student data
      const { data: studentData, error: studentError } = await supabase
        .from('estudiantes')
        .select('*')
        .eq('boleta', boleta)
        .single();

      if (studentError) {
        console.error('Error fetching student:', studentError);
        setErrorMessage('Error al cargar la información del estudiante.');
        return;
      }
      if (!studentData) {
        setErrorMessage('Estudiante no encontrado.');
        return;
      }
      setStudent(studentData);

      // Fetch materia data
      const { data: materiaData, error: materiaError } = await supabase
        .from('materias')
        .select('nombre')
        .eq('id', materiaId)
        .single();

      if (materiaError) {
        console.error('Error fetching materia:', materiaError);
        setErrorMessage('Error al cargar la información de la materia.');
        return;
      }
      if (!materiaData) {
        setErrorMessage('Materia no encontrada.');
        return;
      }
      setMateria(materiaData);

      // Fetch attendance data
      const { data: attendanceRecords, error: attendanceError } = await supabase
        .from('asistencia')
        .select('estado')
        .eq('boleta_estudiante', boleta)
        .eq('id_materia', materiaId);

      if (attendanceError) {
        console.error('Error fetching attendance:', attendanceError);
        setErrorMessage('Error al cargar la información de asistencia.');
        return;
      }

      let presentes = 0;
      let tardanzas = 0;
      let faltas = 0;

      attendanceRecords.forEach((record: Asistencia) => {
        if (record.estado === 'presente') {
          presentes++;
        } else if (record.estado === 'tardanza') {
          tardanzas++;
        } else if (record.estado === 'falta') {
          faltas++;
        }
      });

      setAttendanceStats({
        presentes,
        tardanzas,
        faltas,
        totalSesiones: attendanceRecords.length,
      });
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Intenta nuevamente en unos momentos.';
      setErrorMessage(message); // Set error message state
      notify({
        type: 'error',
        title: 'No se pudo cargar el reporte',
        message,
      });
    } finally {
      setLoading(false); // Set loading to false regardless of success or error
    }
  }, [boleta, materiaId, notify]);

  useEffect(() => {
    loadStudentReport();
  }, [loadStudentReport]); // Dependencies for useEffect

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#800831" />
      </View>
    );
  }

  if (!student || !materia || !attendanceStats) {
    return (
      <View style={styles.centerContainer}>
        <Text>{errorMessage ?? 'No se pudo cargar la información.'}</Text>
      </View>
    );
  }
}
