import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/core/api/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { useAppNotifications } from '@/ui/components/AppNotificationProvider';


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

const BarChart = ({ data }: { data: ChartData[] }) => {
  const maxValue = Math.max(...data.map((d: ChartData) => d.value), 1);
  return (
    <View style={styles.chartContainer}>
      {data.map((item: ChartData, index: number) => (
        <View key={index} style={styles.barWrapper}>
          <View style={[styles.bar, { height: `${(item.value / maxValue) * 100}%`, backgroundColor: item.color }]} />
          <Text style={styles.barValue}>{item.value}</Text>
          <Text style={styles.barLabel}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
};

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
    setErrorMessage(null);

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

      // Fetch attendance data - FIXED: Changed from 'asistencia' to 'asistencias'
      const { data: attendanceRecords, error: attendanceError } = await supabase
        .from('asistencias')
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
      setErrorMessage(message);
      notify({
        type: 'error',
        title: 'No se pudo cargar el reporte',
        message,
      });
    } finally {
      setLoading(false);
    }
  }, [boleta, materiaId, notify]);

  useEffect(() => {
    loadStudentReport();
  }, [loadStudentReport]);

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
        <Text style={styles.errorText}>{errorMessage ?? 'No se pudo cargar la información.'}</Text>
      </View>
    );
  }

  // Calculate attendance percentage
  const totalRecords = attendanceStats.totalSesiones;
  const attendancePercentage = totalRecords > 0
    ? Math.round(((attendanceStats.presentes + attendanceStats.tardanzas) / totalRecords) * 100)
    : 0;

  const chartData: ChartData[] = [
    { label: 'Presentes', value: attendanceStats.presentes, color: '#10b981' },
    { label: 'Tardanzas', value: attendanceStats.tardanzas, color: '#f59e0b' },
    { label: 'Faltas', value: attendanceStats.faltas, color: '#ef4444' },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Reporte de Estudiante</Text>
      </View>

      <View style={styles.content}>
        {/* Student Info Card */}
        <View style={styles.studentCard}>
          {student.fotografia && (
            <Image
              source={{ uri: student.fotografia }}
              style={styles.studentPhoto}
            />
          )}
          <View style={styles.studentInfo}>
            <Text style={styles.studentName}>
              {student.nombre} {student.apellido}
            </Text>
            <Text style={styles.studentBoleta}>Boleta: {student.boleta}</Text>
            <Text style={styles.materiaName}>{materia.nombre}</Text>
          </View>
        </View>

        {/* Student Details */}
        <View style={styles.detailsCard}>
          <Text style={styles.cardTitle}>Información del Estudiante</Text>
          <InfoRow icon="school-outline" label="Carrera" value={student.carrera} />
          <InfoRow icon="business-outline" label="Escuela" value={student.escuela} />
          <InfoRow icon="time-outline" label="Turno" value={student.turno} />
          <InfoRow icon="card-outline" label="CURP" value={student.curp} />
          <InfoRow
            icon={student.activo ? "checkmark-circle" : "close-circle"}
            label="Estado"
            value={student.activo ? "Activo" : "Inactivo"}
          />
        </View>

        {/* Attendance Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.cardTitle}>Resumen de Asistencia</Text>
          <BarChart data={chartData} />
        </View>

        {/* Attendance Statistics */}
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Estadísticas</Text>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Porcentaje de Asistencia</Text>
            <Text style={[styles.statValue, { color: attendancePercentage >= 80 ? '#10b981' : '#ef4444' }]}>
              {attendancePercentage}%
            </Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Total de Sesiones</Text>
            <Text style={styles.statValue}>{totalRecords}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Presentes</Text>
            <Text style={[styles.statValue, { color: '#10b981' }]}>{attendanceStats.presentes}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Tardanzas</Text>
            <Text style={[styles.statValue, { color: '#f59e0b' }]}>{attendanceStats.tardanzas}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Faltas</Text>
            <Text style={[styles.statValue, { color: '#ef4444' }]}>{attendanceStats.faltas}</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    flex: 1,
  },
  content: {
    padding: 20,
  },
  studentCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  studentPhoto: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
    backgroundColor: '#e5e7eb',
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  studentBoleta: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  materiaName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#800831',
  },
  detailsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#111827',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
  },
  infoIcon: {
    marginRight: 10,
  },
  infoLabel: {
    fontWeight: '600',
    color: '#4b5563',
    marginRight: 8,
  },
  infoValue: {
    color: '#1f2937',
    flex: 1,
  },
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    height: 150,
    alignItems: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 16,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  bar: {
    width: 35,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  barValue: {
    position: 'absolute',
    top: -20,
    fontWeight: 'bold',
    color: '#374151',
  },
  barLabel: {
    marginTop: 8,
    fontSize: 12,
    color: '#6b7280',
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  statLabel: {
    fontSize: 16,
    color: '#374151',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
  },
});
