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
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';

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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const profesor = useAuthStore((state) => state.profesor);

  useEffect(() => {
    loadMaterias();
  }, []);

  useEffect(() => {
    if (selectedMateria) {
      loadSesiones();
    }
  }, [selectedMateria]);

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

      // Obtener sesiones
      const { data: sesionesData, error: sesionesError } = await supabase
        .from('sesiones')
        .select('*')
        .eq('materia_id', selectedMateria)
        .eq('estado', 'impartida')
        .order('fecha', { ascending: false });

      if (sesionesError) throw sesionesError;

      // Para cada sesión, contar asistencias
      const sesionesConStats = await Promise.all(
        (sesionesData || []).map(async (sesion) => {
          const { data: asistencias, error: asistError } = await supabase
            .from('asistencias')
            .select('estado')
            .eq('sesion_id', sesion.id);

          if (asistError) throw asistError;

          const total = asistencias?.length || 0;
          const presentes = asistencias?.filter((a) => a.estado === 'presente').length || 0;
          const tardanzas = asistencias?.filter((a) => a.estado === 'tardanza').length || 0;
          const faltas = asistencias?.filter((a) => a.estado === 'falta').length || 0;

          return {
            id: sesion.id,
            fecha: sesion.fecha,
            tema: sesion.tema || 'Sin tema',
            total_asistencias: total,
            presentes,
            tardanzas,
            faltas,
          };
        })
      );

      setSesiones(sesionesConStats);
    } catch (error) {
      console.error(error);
    } finally {
      setRefreshing(false);
    }
  };

  const renderSesion = ({ item }: { item: Sesion }) => {
    const porcentajeAsistencia =
      item.total_asistencias > 0
        ? Math.round(((item.presentes + item.tardanzas) / item.total_asistencias) * 100)
        : 0;

    return (
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
      {/* Selector de materias */}
      <View style={styles.selectorContainer}>
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

      {/* Lista de sesiones */}
      {sesiones.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="calendar-outline" size={64} color="#d1d5db" />
          <Text style={styles.emptyText}>No hay sesiones registradas</Text>
        </View>
      ) : (
        <FlatList
          data={sesiones}
          renderItem={renderSesion}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadSesiones();
              }}
              tintColor="#2563eb"
            />
          }
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
