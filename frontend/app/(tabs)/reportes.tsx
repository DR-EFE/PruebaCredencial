import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { Ionicons } from '@expo/vector-icons';
import { format, getWeek, getMonth, getYear } from 'date-fns';
import { useRouter } from 'expo-router';

interface Materia {
  id: number;
  nombre: string;
}

interface Sesion {
  id: number;
  fecha: string;
  tema: string;
  total_asistencias: number;
  presentes: number;
  tardanzas: number;
  faltas: number;
}

export default function ReportesScreen() {
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [selectedMateria, setSelectedMateria] = useState<number | null>(null);
  const [sesiones, setSesiones] = useState<Sesion[]>([]);
  const [weeklyReports, setWeeklyReports] = useState([]);
  const [monthlyReports, setMonthlyReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reportType, setReportType] = useState('sesiones'); // sesiones, semanal, mensual
  const profesor = useAuthStore((state) => state.profesor);
  const router = useRouter();

  useEffect(() => {
    loadMaterias();
  }, []);

  useEffect(() => {
    if (selectedMateria) {
      loadSesiones();
    }
  }, [selectedMateria, reportType]);

  const loadMaterias = async () => {
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
  };

  const loadSesiones = async () => {
    try {
      if (!selectedMateria) return;
      setRefreshing(true);

      const { data: sesionesData, error: sesionesError } = await supabase
        .from('sesiones')
        .select('*, asistencias(estado)')
        .eq('materia_id', selectedMateria)
        .eq('estado', 'impartida')
        .order('fecha', { ascending: false });

      if (sesionesError) throw sesionesError;

      const sesionesConStats = sesionesData.map(sesion => {
        const asistencias = sesion.asistencias;
        const presentes = asistencias.filter(a => a.estado === 'presente').length;
        const tardanzas = asistencias.filter(a => a.estado === 'tardanza').length;
        const faltas = asistencias.filter(a => a.estado === 'falta').length;
        return { ...sesion, presentes, tardanzas, faltas, total_asistencias: asistencias.length };
      });

      if (reportType === 'sesiones') {
        setSesiones(sesionesConStats);
      } else if (reportType === 'semanal') {
        const grouped = sesionesConStats.reduce((acc, sesion) => {
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
        const grouped = sesionesConStats.reduce((acc, sesion) => {
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
    } finally {
      setRefreshing(false);
    }
  };

  const renderWeeklyReport = ({ item }) => {
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

  const renderMonthlyReport = ({ item }) => {
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

    return (
      <TouchableOpacity onPress={() => router.push(`/report-detail?sesionId=${item.id}`)}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>
                {format(new Date(item.fecha), 'dd/MM/yyyy')}
              </Text>
              <Text style={styles.cardSubtitle}>{item.tema}</Text>
            </View>
            <View style={styles.percentageBadge}>
              <Text style={styles.percentageText}>{porcentajeAsistencia}%</Text>
            </View>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <View style={[styles.statDot, { backgroundColor: '#10b981' }]} />
              <Text style={styles.statLabel}>Presentes</Text>
              <Text style={styles.statValue}>{item.presentes}</Text>
            </View>

            <View style={styles.statItem}>
              <View style={[styles.statDot, { backgroundColor: '#f59e0b' }]} />
              <Text style={styles.statLabel}>Tardanzas</Text>
              <Text style={styles.statValue}>{item.tardanzas}</Text>
            </View>

            <View style={styles.statItem}>
              <View style={[styles.statDot, { backgroundColor: '#ef4444' }]} />
              <Text style={styles.statLabel}>Faltas</Text>
              <Text style={styles.statValue}>{item.faltas}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
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
      {reportType === 'sesiones' && (
        <FlatList
          data={sesiones}
          renderItem={renderSesion}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<View style={styles.centerContainer}><Text style={styles.emptyText}>No hay sesiones</Text></View>}
        />
      )}
      {reportType === 'semanal' && (
        <FlatList
          data={weeklyReports}
          renderItem={renderWeeklyReport}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<View style={styles.centerContainer}><Text style={styles.emptyText}>No hay reportes semanales</Text></View>}
        />
      )}
      {reportType === 'mensual' && (
        <FlatList
          data={monthlyReports}
          renderItem={renderMonthlyReport}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<View style={styles.centerContainer}><Text style={styles.emptyText}>No hay reportes mensuales</Text></View>}
        />
      )}
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
    backgroundColor: '#2563eb',
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
    color: '#2563eb',
  },
  listContent: {
    padding: 16,
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
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  percentageText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2563eb',
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
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 16,
  },
});