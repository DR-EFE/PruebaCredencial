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

const InfoRow = ({ icon, label, value }: InfoRowProps) => (
  <View style={styles.infoRow}>
    <Ionicons name={icon} size={20} color="#6b7280" style={styles.infoIcon} />
    <Text style={styles.infoLabel}>{label}:</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

export default function StudentReportScreen() {
  const { materiaId, boleta } = useLocalSearchParams();
  const router = useRouter();
  const { notify } = useAppNotifications();
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<Student | null>(null);
  const [materia, setMateria] = useState<{ nombre: string } | null>(null);
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadStudentReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: studentData, error: studentError } = await supabase
        .from('estudiantes')
        .select('*')
        .eq('boleta', boleta)
        .single();
      if (studentError) throw studentError;
      setStudent(studentData);

      const { data: materiaData, error: materiaError } = await supabase
        .from('materias')
        .select('*')
        .eq('id', materiaId)
        .single();
      if (materiaError) throw materiaError;
      setMateria(materiaData);

      const { data: attendanceData, error: attendanceError } = await supabase
        .from('asistencias')
        .select('estado')
        .eq('materia_id', materiaId)
        .eq('boleta', boleta);
      if (attendanceError) throw attendanceError;

      const presentes = attendanceData.filter((a: Asistencia) => a.estado === 'presente').length;
      const tardanzas = attendanceData.filter((a: Asistencia) => a.estado === 'tardanza').length;

      const { count: totalSesiones, error: sesionError } = await supabase
        .from('sesiones')
        .select('*', { count: 'exact', head: true })
        .eq('materia_id', materiaId)
        .eq('estado', 'impartida');
      if (sesionError) throw sesionError;

      const faltas = (totalSesiones ?? 0) - (presentes + tardanzas);

      setAttendanceStats({
        presentes,
        tardanzas,
        faltas: faltas > 0 ? faltas : 0,
        totalSesiones: totalSesiones ?? 0,
      });
    } catch (err) {
      console.error(err);
      const message = err instanceof Error && err.message ? err.message : 'Intenta nuevamente en unos momentos.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [boleta, materiaId]);

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

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text>{error}</Text>
      </View>
    );
  }

  if (!student || !materia || !attendanceStats) {
    return null;
  }

  const chartData: ChartData[] = [
    { label: 'Presente', value: attendanceStats.presentes, color: '#10b981' },
    { label: 'Tardanza', value: attendanceStats.tardanzas, color: '#f59e0b' },
    { label: 'Falta', value: attendanceStats.faltas, color: '#ef4444' },
  ];

  const attendanceRate = attendanceStats.totalSesiones
    ? Math.round((attendanceStats.presentes / attendanceStats.totalSesiones) * 100)
    : 0;
  const tardinessRate = attendanceStats.totalSesiones
    ? Math.round((attendanceStats.tardanzas / attendanceStats.totalSesiones) * 100)
    : 0;
  const absenceRate = attendanceStats.totalSesiones
    ? Math.round((attendanceStats.faltas / attendanceStats.totalSesiones) * 100)
    : 0;

  const barChartData = chartData.map(item => ({
    value: item.value,
    label: item.label,
    frontColor: item.color,
  }));

  const pieChartData = chartData.map(item => ({
    value: item.value,
    color: item.color,
    text: `${item.label}`,
  }));

  const summaryCards = [
    {
      label: 'Asistencias',
      value: attendanceStats.presentes,
      helper: 'Registros presentes',
      icon: 'checkmark-circle',
      tint: 'rgba(16,185,129,0.18)',
      iconColor: '#10b981',
    },
    {
      label: 'Tardanzas',
      value: attendanceStats.tardanzas,
      helper: 'Llegadas tarde',
      icon: 'time',
      tint: 'rgba(245,158,11,0.18)',
      iconColor: '#f59e0b',
    },
    {
      label: 'Faltas',
      value: attendanceStats.faltas,
      helper: 'Ausencias registradas',
      icon: 'close-circle',
      tint: 'rgba(239,68,68,0.15)',
      iconColor: '#ef4444',
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          {student.fotografia ? (
            <Image source={{ uri: student.fotografia }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={24} color="#fff" />
            </View>
          )}
          <Text style={styles.headerTitle}>{`${student.nombre} ${student.apellido}`}</Text>
        </View>
      </View>

      <View style={styles.content}>
        <LinearGradient
          colors={['rgba(128,8,49,0.95)', 'rgba(128,8,49,0.8)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <Text style={styles.heroTitle}>Resumen general</Text>
          <Text style={styles.heroPercent}>{attendanceRate}% de asistencia</Text>
          <Text style={styles.heroHelper}>
            {attendanceRate >= 90
              ? 'Excelente ritmo, sigue asi.'
              : 'Hay oportunidades para mejorar la asistencia.'}
          </Text>
          <View style={styles.heroStatsRow}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{tardinessRate}%</Text>
              <Text style={styles.heroStatLabel}>Tardanzas</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{absenceRate}%</Text>
              <Text style={styles.heroStatLabel}>Faltas</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.metaRow}>
          <View style={styles.metaBadge}>
            <Ionicons name="id-card-outline" size={14} color="#800831" />
            <Text style={styles.metaBadgeText}>{student.boleta}</Text>
          </View>
          <View style={styles.metaBadge}>
            <Ionicons name="book-outline" size={14} color="#800831" />
            <Text style={styles.metaBadgeText}>{materia.nombre}</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          {summaryCards.map(card => (
            <View key={card.label} style={[styles.statCard, { backgroundColor: card.tint }]}>
              <View style={styles.statIcon}>
                <Ionicons name={card.icon} size={20} color={card.iconColor} />
              </View>
              <Text style={styles.statValue}>{card.value}</Text>
              <Text style={styles.statLabel}>{card.label}</Text>
              <Text style={styles.statHelper}>{card.helper}</Text>
            </View>
          ))}
        </View>

        <View style={styles.studentInfoCard}>
          <Text style={styles.cardTitle}>Informacion Academica</Text>
          <InfoRow icon="id-card-outline" label="Boleta" value={student.boleta} />
          <InfoRow icon="school-outline" label="Carrera" value={student.carrera} />
          <InfoRow icon="business-outline" label="Escuela" value={student.escuela} />
          <InfoRow icon="time-outline" label="Turno" value={student.turno} />
          <InfoRow icon="document-text-outline" label="CURP" value={student.curp} />
        </View>

        <View style={styles.chartCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Resumen de asistencia</Text>
            <Text style={styles.sectionSubtitle}>{attendanceStats.totalSesiones} sesiones</Text>
          </View>
          <BarChart
            data={barChartData}
            barWidth={36}
            spacing={20}
            roundedTop
            isAnimated
            hideYAxisText
            hideRules
            yAxisThickness={0}
            xAxisThickness={0}
            xAxisLabelTextStyle={styles.chartLabel}
            disableScroll
          />
          <View style={styles.legendRow}>
            {chartData.map(item => (
              <View key={item.label} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                <Text style={styles.legendText}>{item.label}: {item.value}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.chartCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Distribucion por estado</Text>
            <Text style={styles.sectionSubtitle}>{attendanceRate}% asistencia</Text>
          </View>
          <View style={styles.pieRow}>
            <PieChart
              data={pieChartData}
              donut
              showGradient
              innerRadius={55}
              radius={80}
              focusOnPress={false}
              centerLabelComponent={() => (
                <View style={styles.pieCenter}>
                  <Text style={styles.pieCenterValue}>{attendanceRate}%</Text>
                  <Text style={styles.pieCenterLabel}>Asistencia</Text>
                </View>
              )}
            />
            <View style={styles.pieDetails}>
              <Text style={styles.pieInsightTitle}>Observaciones</Text>
              <Text style={styles.pieInsightText}>
                {attendanceRate >= 85
                  ? 'El estudiante mantiene un buen registro de asistencia.'
                  : 'Recomienda reforzar la puntualidad y asistencia en las siguientes sesiones.'}
              </Text>
              <View style={styles.pieStats}>
                <View style={styles.pieStat}>
                  <Text style={styles.pieStatLabel}>Sesiones totales</Text>
                  <Text style={styles.pieStatValue}>{attendanceStats.totalSesiones}</Text>
                </View>
                <View style={styles.pieStat}>
                  <Text style={styles.pieStatLabel}>Registros</Text>
                  <Text style={styles.pieStatValue}>
                    {attendanceStats.presentes + attendanceStats.tardanzas + attendanceStats.faltas}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </View>
    </ScrollView >
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  scrollContent: { paddingBottom: 32 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: { marginRight: 16 },
  headerContent: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#800831',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827', flex: 1 },
  content: { padding: 20, gap: 20 },
  heroCard: { borderRadius: 20, padding: 20 },
  heroTitle: { fontSize: 14, color: '#f9fafb', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  heroPercent: { fontSize: 32, fontWeight: '700', color: '#fff' },
  heroHelper: { marginTop: 6, color: 'rgba(248,250,252,0.85)', fontSize: 14 },
  heroStatsRow: { marginTop: 18, flexDirection: 'row', alignItems: 'center' },
  heroStat: { flex: 1 },
  heroStatValue: { fontSize: 22, fontWeight: '700', color: '#fff' },
  heroStatLabel: { color: 'rgba(248,250,252,0.85)', fontSize: 13, marginTop: 2 },
  heroDivider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.35)', marginHorizontal: 18 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metaBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: '#e5e7eb', gap: 6 },
  metaBadgeText: { color: '#800831', fontWeight: '600', fontSize: 13 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: { flexGrow: 1, minWidth: '48%', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(0,0,0,0.03)' },
  statIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  statValue: { fontSize: 26, fontWeight: '700', color: '#111827' },
  statLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginTop: 4 },
  statHelper: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, color: '#111827' },
  studentInfoCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 3 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  infoIcon: { marginRight: 12 },
  infoLabel: { fontSize: 15, color: '#374151', fontWeight: '600' },
  infoValue: { fontSize: 15, color: '#6b7280', marginLeft: 8, flex: 1 },
  chartCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, gap: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  sectionSubtitle: { fontSize: 13, color: '#6b7280' },
  chartLabel: { color: '#6b7280', fontSize: 12, marginTop: 4 },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 13, color: '#374151' },
  pieRow: { flexDirection: 'row', alignItems: 'center' },
  pieCenter: { alignItems: 'center', justifyContent: 'center' },
  pieCenterValue: { fontSize: 22, fontWeight: '700', color: '#111827' },
  pieCenterLabel: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  pieDetails: { flex: 1, paddingLeft: 16, gap: 10 },
  pieInsightTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  pieInsightText: { fontSize: 13, color: '#4b5563', lineHeight: 18 },
  pieStats: { flexDirection: 'row', gap: 16 },
  pieStat: { flex: 1, backgroundColor: '#f9fafb', borderRadius: 12, padding: 12 },
  pieStatLabel: { fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 },
  pieStatValue: { fontSize: 18, fontWeight: '700', color: '#111827', marginTop: 6 },
});
