import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { supabase } from '@/core/api/supabaseClient';
import { useAuthStore } from '@/core/auth/useAuthStore';
import { Ionicons } from '@expo/vector-icons';
import { format, getWeek, getMonth, getYear } from 'date-fns';
import { useRouter } from 'expo-router';

interface Materia {
  id: number;
  nombre: string;
}

interface Asistencia {
  estado: 'presente' | 'tardanza' | 'falta';
}

interface WeeklyReport {
  id: string;
  week: number;
  year: number;
  sesiones: Sesion[];
  presentes: number;
  tardanzas: number;
  faltas: number;
  total_asistencias: number;
}

interface MonthlyReport {
  id: string;
  month: number;
  year: number;
  sesiones: Sesion[];
  presentes: number;
  tardanzas: number;
  faltas: number;
  total_asistencias: number;
}

interface Sesion {
  id: number;
  fecha: string;
  tema: string;
  total_asistencias: number;
  presentes: number;
  tardanzas: number;
  faltas: number;
  asistencias: Asistencia[];
}

export default function ReportesScreen() {
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [selectedMateria, setSelectedMateria] = useState<number | null>(null);
  const [sesiones, setSesiones] = useState<Sesion[]>([]);
  const [weeklyReports, setWeeklyReports] = useState<WeeklyReport[]>([]);
  const [monthlyReports, setMonthlyReports] = useState<MonthlyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState('sesiones'); // sesiones, semanal, mensual
  const profesor = useAuthStore((state) => state.profesor);
  const router = useRouter();

  const loadMaterias = useCallback(async () => {
    try {
      if (!profesor) return;

      const { data, error } = await supabase
        .from('materias')
        .select('id, nombre')
        .eq('profesor_id', profesor.id)
        .eq('activo', true);

      if (error) throw error;
      setMaterias(data || []);
      if (data && data.length > 0) {
        setSelectedMateria(data[0].id);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [profesor]);

  const loadSesiones = useCallback(async () => {
    try {
      if (!selectedMateria) return;

      const { data: sesionesData, error: sesionesError } = await supabase
        .from('sesiones')
        .select('*, asistencias(estado)')
        .eq('materia_id', selectedMateria)
        .eq('estado', 'impartida')
        .order('fecha', { ascending: false });

      if (sesionesError) throw sesionesError;

      const sesionesConStats: Sesion[] = sesionesData.map(sesion => {
        const asistencias = sesion.asistencias;
        const presentes = asistencias.filter((a: Asistencia) => a.estado === 'presente').length;
        const tardanzas = asistencias.filter((a: Asistencia) => a.estado === 'tardanza').length;
        const faltas = asistencias.filter((a: Asistencia) => a.estado === 'falta').length;
        return { ...sesion, presentes, tardanzas, faltas, total_asistencias: asistencias.length };
      });

      if (reportType === 'sesiones') {
        setSesiones(sesionesConStats);
      } else if (reportType === 'semanal') {
        const grouped = sesionesConStats.reduce((acc: { [key: string]: WeeklyReport }, sesion) => {
          const week = getWeek(new Date(sesion.fecha), { weekStartsOn: 1 });
          const year = getYear(new Date(sesion.fecha));
          const key = `${year}-W${week}`;
          if (!acc[key]) {
            acc[key] = { id: key, week, year, sesiones: [], presentes: 0, tardanzas: 0, faltas: 0, total_asistencias: 0 };
          }
          acc[key].sesiones.push(sesion);
          acc[key].presentes += sesion.presentes;
          acc[key].tardanzas += sesion.tardanzas;
          acc[key].faltas += sesion.faltas;
          acc[key].total_asistencias += sesion.total_asistencias;
          return acc;
        }, {});
        setWeeklyReports(Object.values(grouped));
      } else if (reportType === 'mensual') {
        const grouped = sesionesConStats.reduce((acc: { [key: string]: MonthlyReport }, sesion) => {
          const month = getMonth(new Date(sesion.fecha));
          const year = getYear(new Date(sesion.fecha));
          const key = `${year}-M${month}`;
          if (!acc[key]) {
            acc[key] = { id: key, month, year, sesiones: [], presentes: 0, tardanzas: 0, faltas: 0, total_asistencias: 0 };
          }
          acc[key].sesiones.push(sesion);
          acc[key].presentes += sesion.presentes;
          acc[key].tardanzas += sesion.tardanzas;
          acc[key].faltas += sesion.faltas;
          acc[key].total_asistencias += sesion.total_asistencias;
          return acc;
        }, {});
        setMonthlyReports(Object.values(grouped));
      }
    } catch (error) {
      console.error(error);
    }
  }, [reportType, selectedMateria]);

useEffect(() => {
  loadMaterias();
}, [loadMaterias]);

useEffect(() => {
  loadSesiones();
}, [loadSesiones]);

  const renderWeeklyReport = ({ item }: { item: WeeklyReport }) => {
    const percentage = item.total_asistencias > 0 ? Math.round(((item.presentes + item.tardanzas) / item.total_asistencias) * 100) : 0;
    return (
      <TouchableOpacity onPress={() => { /* Navigate to weekly detail */ }}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{`Semana ${item.week}, ${item.year}`}</Text>
          <Text>{`${item.sesiones.length} sesiones`}</Text>
          <Text>{percentage}% de asistencia promedio</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderMonthlyReport = ({ item }: { item: MonthlyReport }) => {
    const percentage = item.total_asistencias > 0 ? Math.round(((item.presentes + item.tardanzas) / item.total_asistencias) * 100) : 0;
    const monthName = format(new Date(item.year, item.month), 'MMMM yyyy');
    return (
      <TouchableOpacity onPress={() => { /* Navigate to monthly detail */ }}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{monthName}</Text>
          <Text>{`${item.sesiones.length} sesiones`}</Text>
          <Text>{percentage}% de asistencia promedio</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSesion = ({ item }: { item: Sesion }) => {
    const porcentajeAsistencia =
      item.total_asistencias > 0
        ? Math.round(((item.presentes + item.tardanzas) / item.total_asistencias) * 100)
        : 0;

    const statConfig = [
      {
        label: 'Presentes',
        value: item.presentes,
        icon: 'checkmark-circle' as const,
        color: '#10b981',
      },
      {
        label: 'Tardanzas',
        value: item.tardanzas,
        icon: 'time' as const,
        color: '#f59e0b',
      },
      {
        label: 'Faltas',
        value: item.faltas,
        icon: 'close-circle' as const,
        color: '#ef4444',
      },
    ];

    return (
      <Pressable
        onPress={() => router.push(`/report-detail?sesionId=${item.id}`)}
        android_ripple={{ color: '#f3f4f6', borderless: false }}
        hitSlop={{ top: 6, bottom: 6 }}
        pressRetentionOffset={{ top: 20, bottom: 20, left: 20, right: 20 }}
        style={({ pressed }) => [
          styles.card,
          styles.sessionCard,
          pressed && styles.sessionCardPressed,
        ]}
      >
        <View style={styles.sessionTopRow}>
          <View style={styles.sessionBadge}>
            <Ionicons name="calendar" size={16} color="#fff" />
            <Text style={styles.sessionBadgeText}>{format(new Date(item.fecha), 'dd MMM')}</Text>
          </View>

          <View style={styles.sessionInfo}>
            <Text style={styles.sessionTitle}>{item.tema || 'Sesion sin titulo'}</Text>
            <Text style={styles.sessionMeta}>{format(new Date(item.fecha), 'dd/MM/yyyy')}</Text>
          </View>

          <View style={styles.sessionPercentage}>
            <Text style={styles.sessionPercentageValue}>{porcentajeAsistencia}%</Text>
            <Text style={styles.sessionPercentageLabel}>asistencia</Text>
          </View>
        </View>

        <View style={styles.sessionStatsRow}>
          {statConfig.map((stat) => (
            <View key={stat.label} style={styles.sessionStat}>
              <View style={[styles.sessionStatIcon, { backgroundColor: `${stat.color}1a` }]}>
                <Ionicons name={stat.icon} size={18} color={stat.color} />
              </View>
              <Text style={styles.sessionStatValue}>{stat.value}</Text>
              <Text style={styles.sessionStatLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.sessionFooter}>
          <View style={styles.sessionFooterDetail}>
            <Ionicons name="people" size={16} color="#6b7280" />
            <Text style={styles.sessionFooterText}>
              {item.total_asistencias} registros capturados
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
        </View>
      </Pressable>
    );
  };

  const sessionListPadding = useMemo(() => (sesiones.length < 3 ? styles.listContentCompact : null), [sesiones.length]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#800831" />
      </View>
    );
  }

  if (materias.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="stats-chart-outline" size={64} color="#d1d5db" />
        <Text style={styles.emptyText}>No tienes materias para mostrar reportes</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Selector de materias y tipo de reporte */}
      <View style={styles.selectorContainer}>
        <View style={styles.reportTypeSelector}>
          <TouchableOpacity 
            style={[styles.reportTypeButton, reportType === 'sesiones' && styles.reportTypeButtonActive]} 
            onPress={() => setReportType('sesiones')}>
            <Text style={[styles.reportTypeButtonText, reportType === 'sesiones' && styles.reportTypeButtonTextActive]}>Sesiones</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.reportTypeButton, reportType === 'semanal' && styles.reportTypeButtonActive]} 
            onPress={() => setReportType('semanal')}>
            <Text style={[styles.reportTypeButtonText, reportType === 'semanal' && styles.reportTypeButtonTextActive]}>Semanal</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.reportTypeButton, reportType === 'mensual' && styles.reportTypeButtonActive]} 
            onPress={() => setReportType('mensual')}>
            <Text style={[styles.reportTypeButtonText, reportType === 'mensual' && styles.reportTypeButtonTextActive]}>Mensual</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          horizontal
          data={materias}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.materiaChip,
                selectedMateria === item.id && styles.materiaChipActive,
              ]}
              onPress={() => setSelectedMateria(item.id)}
            >
              <Text
                style={[
                  styles.materiaChipText,
                  selectedMateria === item.id && styles.materiaChipTextActive,
                ]}
              >
                {item.nombre}
              </Text>
            </TouchableOpacity>
          )}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.selectorContent}
        />
      </View>

      {/* Lista de reportes */}
      <View style={{ flex: 1 }}>
        {reportType === 'sesiones' && (
          <FlatList
            data={sesiones}
            renderItem={renderSesion}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={[styles.listContent, sessionListPadding]}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={<View style={styles.centerContainer}><Text style={styles.emptyText}>No hay sesiones</Text></View>}
          />
        )}
        {reportType === 'semanal' && (
          <FlatList
            data={weeklyReports}
            renderItem={renderWeeklyReport}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={<View style={styles.centerContainer}><Text style={styles.emptyText}>No hay reportes semanales</Text></View>}
          />
        )}
        {reportType === 'mensual' && (
          <FlatList
            data={monthlyReports}
            renderItem={renderMonthlyReport}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={<View style={styles.centerContainer}><Text style={styles.emptyText}>No hay reportes mensuales</Text></View>}
          />
        )}
      </View>
    </View>
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
    backgroundColor: '#f9fafb',
  },
  selectorContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  selectorContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  materiaChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
  },
  materiaChipActive: {
    backgroundColor: '#800831',
  },
  materiaChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  materiaChipTextActive: {
    color: '#fff',
  },
  reportTypeSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 4,
    backgroundColor: '#f3f4f6',
    marginHorizontal: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  reportTypeButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
  },
  reportTypeButtonActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  reportTypeButtonText: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  reportTypeButtonTextActive: {
    color: '#800831',
  },
  listContent: {
    padding: 16,
  },
  listContentCompact: {
    padding: 16,
    paddingBottom: 200,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  percentageBadge: {
    backgroundColor: '#800831',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  percentageText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#800831',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  sessionCard: {
    padding: 20,
  },
  sessionCardPressed: {
    transform: [{ scale: 0.99 }],
    opacity: 0.96,
  },
  sessionTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sessionBadge: {
    backgroundColor: '#800831',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sessionBadgeText: {
    color: '#fff',
    fontWeight: '600',
    textTransform: 'uppercase',
    fontSize: 12,
  },
  sessionInfo: {
    flex: 1,
    marginLeft: 16,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  sessionMeta: {
    fontSize: 13,
    color: '#6b7280',
  },
  sessionPercentage: {
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'flex-end',
  },
  sessionPercentageValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#800831',
  },
  sessionPercentageLabel: {
    fontSize: 11,
    color: '#9f1239',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sessionStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  sessionStat: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  sessionStatIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  sessionStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  sessionStatLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  sessionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 12,
  },
  sessionFooterDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sessionFooterText: {
    fontSize: 13,
    color: '#4b5563',
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 16,
  },
});

