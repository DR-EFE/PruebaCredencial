import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '@/core/api/supabaseClient';
import { useAuthStore } from '@/core/auth/useAuthStore';
import { useAppNotifications } from '@/ui/components/AppNotificationProvider';

interface MateriaDetalle {
  id: number;
  nombre: string;
  codigo: string;
  grupo: string;
  semestre: number;
}

interface Inscripcion {
  id: number;
  boleta: string;
  estado_inscripcion: string;
}

interface Estudiante {
  boleta: string;
  nombre: string;
  apellido?: string;
}

interface AlumnoItem {
  inscripcionId: number;
  boleta: string;
  nombreCompleto: string;
}

export default function MateriaDetalleScreen() {
  const { materia_id } = useLocalSearchParams();
  const router = useRouter();
  const profesor = useAuthStore((state) => state.profesor);
  const { notify } = useAppNotifications();

  const materiaId = useMemo(() => {
    const parsed = Number(materia_id);
    return Number.isFinite(parsed) ? parsed : null;
  }, [materia_id]);

  const [materia, setMateria] = useState<MateriaDetalle | null>(null);
  const [alumnos, setAlumnos] = useState<AlumnoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);

  const loadData = useCallback(
    async (options: { silent?: boolean } = {}) => {
      if (!materiaId) {
        notify({ type: 'error', title: 'Materia no encontrada', message: 'No pudimos identificar la materia seleccionada.' });
        router.back();
        return;
      }

      if (!options.silent) {
        setLoading(true);
      }

      try {
        const { data: materiaData, error: materiaError } = await supabase
          .from('materias')
          .select('id, nombre, codigo, grupo, semestre')
          .eq('id', materiaId)
          .single();

        if (materiaError) throw materiaError;
        setMateria(materiaData as MateriaDetalle);

        const { data: inscripcionesData, error: inscripcionesError } = await supabase
          .from('inscripciones')
          .select('id, boleta, estado_inscripcion')
          .eq('materia_id', materiaId)
          .eq('estado_inscripcion', 'activa');

        if (inscripcionesError) throw inscripcionesError;

        const inscripciones = ((inscripcionesData as Inscripcion[]) || []).sort((a, b) =>
          a.boleta.localeCompare(b.boleta)
        );

        if (inscripciones.length === 0) {
          setAlumnos([]);
          return;
        }

        const boletas = inscripciones.map((item) => item.boleta);
        const {
          data: estudiantesData,
          error: estudiantesError,
        } = await supabase.from('estudiantes').select('boleta, nombre, apellido').in('boleta', boletas);

        if (estudiantesError) throw estudiantesError;

        const estudiantes = (estudiantesData as Estudiante[]) || [];
        const estudiantesMap = new Map(estudiantes.map((est) => [est.boleta, est]));

        const alumnosList: AlumnoItem[] = inscripciones.map((inscripcion) => {
          const estudiante = estudiantesMap.get(inscripcion.boleta);
          const nombreCompleto = estudiante
            ? `${estudiante.nombre} ${estudiante.apellido ?? ''}`.trim()
            : `Alumno ${inscripcion.boleta}`;

          return {
            inscripcionId: inscripcion.id,
            boleta: inscripcion.boleta,
            nombreCompleto,
          };
        });

        setAlumnos(alumnosList);
      } catch (error: any) {
        console.error(error);
        notify({ type: 'error', title: 'No se pudo cargar la materia', message: 'Intenta nuevamente en unos minutos.' });
      } finally {
        if (!options.silent) {
          setLoading(false);
        }
        setRefreshing(false);
      }
    },
    [materiaId, notify, router]
  );

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData({ silent: true });
  }, [loadData]);

  const handleDropStudent = useCallback(
    async (inscripcionId: number, nombreCompleto: string) => {
      if (!profesor) return;

      setProcessingId(inscripcionId);
      try {
        const { error } = await supabase
          .from('inscripciones')
          .update({ estado_inscripcion: 'baja_definitiva' })
          .eq('id', inscripcionId);

        if (error) throw error;

        notify({
          type: 'success',
          title: 'Alumno dado de baja',
          message: `${nombreCompleto} ya no esta activo en la materia.`,
        });
        await loadData({ silent: true });
      } catch (error: any) {
        console.error(error);
        notify({
          type: 'error',
          title: 'No se pudo dar de baja',
          message: 'Intentalo nuevamente.',
        });
      } finally {
        setProcessingId(null);
      }
    },
    [loadData, notify, profesor]
  );

  const confirmDropStudent = useCallback(
    (item: AlumnoItem) => {
      notify({
        type: 'warning',
        title: 'Dar de baja',
        message: `Confirma dar de baja a ${item.nombreCompleto}.`,
        actionLabel: 'Dar de baja',
        onAction: () => handleDropStudent(item.inscripcionId, item.nombreCompleto),
      });
    },
    [handleDropStudent, notify]
  );
  const renderAlumno = ({ item }: { item: AlumnoItem }) => (
    <View style={styles.studentCard}>
      <TouchableOpacity style={styles.studentInfo} onPress={() => router.push(`/student-report?materiaId=${materiaId}&boleta=${item.boleta}`)}>
        <Text style={styles.studentName}>{item.nombreCompleto}</Text>
        <Text style={styles.studentBoleta}>Boleta: {item.boleta}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.dropButton}
        onPress={() => confirmDropStudent(item)}
        disabled={processingId === item.inscripcionId}
      >
        {processingId === item.inscripcionId ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            <Ionicons name="remove-circle-outline" size={18} color="#fff" />
            <Text style={styles.dropButtonText}>Dar de baja</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  const alumnosActivosTexto =
    alumnos.length === 1 ? '1 alumno activo' : `${alumnos.length} alumnos activos`;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>{materia?.nombre ?? 'Materia'}</Text>
          {materia && (
            <Text style={styles.headerSubtitle}>
              {materia.codigo} · Grupo {materia.grupo} · Semestre {materia.semestre}
            </Text>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : (
        <FlatList
          data={alumnos}
          keyExtractor={(item) => item.inscripcionId.toString()}
          renderItem={renderAlumno}
          contentContainerStyle={
            alumnos.length === 0 ? styles.emptyListContent : styles.listContent
          }
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <Text style={styles.sectionTitle}>Alumnos inscritos</Text>
              <Text style={styles.sectionSubtitle}>{alumnosActivosTexto}</Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color="#9ca3af" />
              <Text style={styles.emptyTitle}>Aún no hay alumnos activos</Text>
              <Text style={styles.emptySubtitle}>
                Usa el botón + para inscribir nuevos alumnos a esta materia.
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />
          }
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() =>
          router.push({ pathname: '/(tabs)/addAlumnos', params: { materia_id: materiaId ?? '' } })
        }
      >
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: { padding: 8, marginRight: 12 },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  headerSubtitle: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listHeader: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#374151' },
  sectionSubtitle: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  listContent: { padding: 16, paddingBottom: 120, gap: 12 },
  emptyListContent: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  studentCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  studentInfo: { flex: 1, marginRight: 12 },
  studentName: { fontSize: 16, fontWeight: '600', color: '#111827' },
  studentBoleta: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  dropButton: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dropButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingHorizontal: 32, paddingTop: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#374151', marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: '#6b7280', marginTop: 8, textAlign: 'center' },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 110,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
});
