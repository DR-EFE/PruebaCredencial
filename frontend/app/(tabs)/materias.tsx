import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { useSesionStore } from '../../store/useSesionStore';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';

interface Materia {
  id: number;
  nombre: string;
  codigo: string;
  semestre: number;
  grupo: string;
  dia_semana: number;
  hora_inicio: string;
  duracion_minutos: number;
}

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export default function MateriasScreen() {
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const profesor = useAuthStore((state) => state.profesor);
  const { setSesionActiva } = useSesionStore();

  useEffect(() => {
    loadMaterias();
  }, []);

  const loadMaterias = async () => {
    try {
      if (!profesor) return;

      const { data, error } = await supabase
        .from('materias')
        .select('*')
        .eq('profesor_id', profesor.id)
        .eq('activo', true)
        .order('dia_semana', { ascending: true });

      if (error) throw error;
      setMaterias(data || []);
    } catch (error: any) {
      Alert.alert('Error', 'No se pudieron cargar las materias');
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleIniciarSesion = async (materia: Materia) => {
    try {
      const now = new Date();
      const { data, error } = await supabase
        .from('sesiones')
        .insert({
          materia_id: materia.id,
          fecha: format(now, 'yyyy-MM-dd'),
          hora_inicio: format(now, 'HH:mm:ss'),
          estado: 'impartida',
          created_by: profesor?.id,
        })
        .select()
        .single();

      if (error) throw error;

      setSesionActiva({
        id: data.id,
        materia_id: materia.id,
        materia_nombre: materia.nombre,
        fecha: data.fecha,
        tema: data.tema || '',
        hora_inicio: data.hora_inicio,
        estado: data.estado,
      });

      Alert.alert('Éxito', `Sesión iniciada para ${materia.nombre}`);
    } catch (error: any) {
      Alert.alert('Error', 'No se pudo iniciar la sesión');
      console.error(error);
    }
  };

  const renderMateria = ({ item }: { item: Materia }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.iconBadge}>
          <Ionicons name="book" size={24} color="#2563eb" />
        </View>
        <View style={styles.cardHeaderText}>
          <Text style={styles.cardTitle}>{item.nombre}</Text>
          <Text style={styles.cardSubtitle}>
            {item.codigo} - Grupo {item.grupo}
          </Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={16} color="#6b7280" />
          <Text style={styles.infoText}>
            {DIAS_SEMANA[item.dia_semana - 1]}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="time-outline" size={16} color="#6b7280" />
          <Text style={styles.infoText}>
            {item.hora_inicio} ({item.duracion_minutos} min)
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="school-outline" size={16} color="#6b7280" />
          <Text style={styles.infoText}>Semestre {item.semestre}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={() => handleIniciarSesion(item)}
      >
        <Ionicons name="play-circle" size={20} color="#fff" />
        <Text style={styles.buttonText}>Iniciar Sesión</Text>
      </TouchableOpacity>
    </View>
  );

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
        <Ionicons name="book-outline" size={64} color="#d1d5db" />
        <Text style={styles.emptyText}>No tienes materias asignadas</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={materias}
        renderItem={renderMateria}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadMaterias();
            }}
            tintColor="#2563eb"
          />
        }
      />
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
    alignItems: 'center',
    marginBottom: 16,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardHeaderText: {
    flex: 1,
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
  cardBody: {
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 8,
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    height: 48,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 16,
  },
});
