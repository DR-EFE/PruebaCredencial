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
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { useSesionStore } from '@/store/useSesionStore';
import { Ionicons } from '@expo/vector-icons';

// New interface for Horario
interface Horario {
  id: number;
  dia_semana: number;
  hora_inicio: string;
  duracion_minutos: number;
}

interface Materia {
  id: number;
  nombre: string;
  codigo: string;
  semestre: number;
  grupo: string;
  horarios: Horario[]; // Materia now has an array of schedules
}

const DIAS_SEMANA_CORTOS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const DIAS_SEMANA_LARGOS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export default function MateriasScreen() {
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const profesor = useAuthStore((state) => state.profesor);

  const [isModalVisible, setModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // State for the main subject form
  const [newMateria, setNewMateria] = useState({ nombre: '', codigo: '', semestre: '', grupo: 'A' });
  // State for the list of schedules to be added
  const [newHorarios, setNewHorarios] = useState<Omit<Horario, 'id'>[]>([]);
  // State for the single schedule entry form
  const [currentHorario, setCurrentHorario] = useState({ dia_semana: 1, hora_inicio: '', duracion_minutos: '90' });

  useEffect(() => {
    if(profesor) {
      loadMaterias();
    }
  }, [profesor]);

  const loadMaterias = async () => {
    setLoading(true);
    try {
      if (!profesor) return;

      // Fetch materias and their related horarios
      const { data, error } = await supabase
        .from('materias')
        .select('*, horarios (*)') // Use Supabase to fetch related horarios
        .eq('profesor_id', profesor.id)
        .eq('activo', true)
        .order('created_at', { ascending: false });

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

  const handleInputChange = (field: keyof typeof newMateria, value: string) => {
    setNewMateria((prev) => ({ ...prev, [field]: value }));
  };

  const handleHorarioInputChange = (field: keyof typeof currentHorario, value: any) => {
    setCurrentHorario((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddHorario = () => {
    if (!currentHorario.hora_inicio) {
      Alert.alert('Hora requerida', 'Debes especificar la hora de inicio del horario.');
      return;
    }
    setNewHorarios([...newHorarios, { ...currentHorario, dia_semana: Number(currentHorario.dia_semana), duracion_minutos: Number(currentHorario.duracion_minutos) }]);
  };

  const handleSaveMateria = async () => {
    if (!profesor) return;
    const { nombre, codigo, semestre, grupo } = newMateria;

    if (!nombre || !codigo || !semestre) {
      Alert.alert('Campos incompletos', 'El nombre, código y semestre de la materia son requeridos.');
      return;
    }
    if (newHorarios.length === 0) {
      Alert.alert('Sin horarios', 'Debes añadir al menos un horario para la materia.');
      return;
    }

    setIsSaving(true);
    try {
      // Step 1: Insert the materia and get its ID
      const { data: materiaData, error: materiaError } = await supabase
        .from('materias')
        .insert({
          profesor_id: profesor.id,
          nombre,
          codigo,
          semestre: parseInt(semestre, 10),
          grupo,
          created_by: profesor.id,
        })
        .select('id')
        .single();

      if (materiaError) throw materiaError;
      const newMateriaId = materiaData.id;

      // Step 2: Prepare and insert the horarios with the new materia_id
      const horariosToInsert = newHorarios.map(h => ({ ...h, materia_id: newMateriaId }));
      const { error: horariosError } = await supabase.from('horarios').insert(horariosToInsert);

      if (horariosError) throw horariosError;

      Alert.alert('Éxito', 'Materia creada correctamente.');
      closeModal();
      loadMaterias();
    } catch (error: any) {
      Alert.alert('Error', `No se pudo crear la materia: ${error.message}`);
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const closeModal = () => {
    setModalVisible(false);
    setNewMateria({ nombre: '', codigo: '', semestre: '', grupo: 'A' });
    setNewHorarios([]);
  }

  const renderMateria = ({ item }: { item: Materia }) => (
    <View style={styles.card}>
        <View style={styles.cardHeader}>
            <View style={styles.iconBadge}>
                <Ionicons name="book" size={24} color="#2563eb" />
            </View>
            <View style={styles.cardHeaderText}>
                <Text style={styles.cardTitle}>{item.nombre}</Text>
                <Text style={styles.cardSubtitle}>{item.codigo} - Grupo {item.grupo}</Text>
            </View>
        </View>

        <View style={styles.cardBody}>
            {item.horarios.map(horario => (
                <View key={horario.id} style={styles.infoRow}>
                    <Ionicons name="time-outline" size={16} color="#6b7280" />
                    <Text style={styles.infoText}>
                        {DIAS_SEMANA_LARGOS[horario.dia_semana - 1]}: {horario.hora_inicio} ({horario.duracion_minutos} min)
                    </Text>
                </View>
            ))}
            <View style={styles.infoRow}>
                <Ionicons name="school-outline" size={16} color="#6b7280" />
                <Text style={styles.infoText}>Semestre {item.semestre}</Text>
            </View>
        </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {loading ? (
         <View style={styles.centerContainer}><ActivityIndicator size="large" color="#2563eb" /></View>
      ) : materias.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="book-outline" size={64} color="#d1d5db" />
          <Text style={styles.emptyText}>No tienes materias asignadas</Text>
          <Text style={styles.emptySubText}>¡Crea tu primera materia para empezar!</Text>
        </View>
      ) : (
        <FlatList
          data={materias}
          renderItem={renderMateria}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadMaterias} tintColor="#2563eb" />}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>

      <Modal visible={isModalVisible} animationType="slide" onRequestClose={closeModal}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Crear Nueva Materia</Text>
              <TouchableOpacity onPress={closeModal}><Ionicons name="close" size={28} color="#6b7280" /></TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Datos de la Materia</Text>
            <TextInput style={styles.input} placeholder="Nombre de la materia" value={newMateria.nombre} onChangeText={(val) => handleInputChange('nombre', val)} />
            <TextInput style={styles.input} placeholder="Código" value={newMateria.codigo} onChangeText={(val) => handleInputChange('codigo', val)} />
            <TextInput style={styles.input} placeholder="Semestre" keyboardType="numeric" value={newMateria.semestre} onChangeText={(val) => handleInputChange('semestre', val)} />
            <TextInput style={styles.input} placeholder="Grupo (ej. A, B)" value={newMateria.grupo} onChangeText={(val) => handleInputChange('grupo', val)} />

            <Text style={styles.sectionTitle}>Horarios de Clase</Text>
            <View style={styles.horarioCreator}>
                <View style={styles.daySelector}>
                    {DIAS_SEMANA_CORTOS.map((dia, index) => (
                        <TouchableOpacity key={index} style={[styles.dayButton, currentHorario.dia_semana === index + 1 && styles.dayButtonSelected]} onPress={() => handleHorarioInputChange('dia_semana', index + 1)}>
                            <Text style={[styles.dayButtonText, currentHorario.dia_semana === index + 1 && styles.dayButtonTextSelected]}>{dia}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
                <View style={styles.horarioInputs}>
                    <TextInput style={[styles.input, styles.horarioInput]} placeholder="Hora (HH:mm)" value={currentHorario.hora_inicio} onChangeText={(val) => handleHorarioInputChange('hora_inicio', val)} />
                    <TextInput style={[styles.input, styles.horarioInput]} placeholder="Duración (min)" keyboardType="numeric" value={currentHorario.duracion_minutos} onChangeText={(val) => handleHorarioInputChange('duracion_minutos', val)} />
                </View>
                <TouchableOpacity style={styles.addHorarioButton} onPress={handleAddHorario}>
                    <Ionicons name="add" size={20} color="#fff" />
                    <Text style={styles.buttonText}>Añadir Horario</Text>
                </TouchableOpacity>
            </View>

            {newHorarios.length > 0 && (
                <View style={styles.horariosList}>
                    {newHorarios.map((h, i) => (
                        <View key={i} style={styles.horarioChip}>
                            <Text style={styles.horarioChipText}>{DIAS_SEMANA_LARGOS[h.dia_semana - 1]}, {h.hora_inicio}</Text>
                        </View>
                    ))}
                </View>
            )}

            <TouchableOpacity style={[styles.button, isSaving && styles.buttonDisabled]} onPress={handleSaveMateria} disabled={isSaving}>
              {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Guardar Materia</Text>}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb', paddingHorizontal: 20 },
  listContent: { padding: 16, paddingBottom: 80 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  iconBadge: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardHeaderText: { flex: 1 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  cardSubtitle: { fontSize: 14, color: '#6b7280' },
  cardBody: { marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  infoText: { fontSize: 14, color: '#6b7280', marginLeft: 8 },
  emptyText: { fontSize: 16, color: '#9ca3af', marginTop: 16, textAlign: 'center' },
  emptySubText: { fontSize: 14, color: '#9ca3af', marginTop: 8, textAlign: 'center' },
  fab: { position: 'absolute', right: 24, bottom: 24, width: 60, height: 60, borderRadius: 30, backgroundColor: '#2563eb', justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4 },
  modalContainer: { flex: 1, backgroundColor: '#f9fafb' },
  modalContent: { padding: 24, paddingTop: 50 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#374151', marginBottom: 16, marginTop: 8 },
  input: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  button: { backgroundColor: '#2563eb', borderRadius: 12, height: 52, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  buttonDisabled: { opacity: 0.7 },
  horarioCreator: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 16 },
  daySelector: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 },
  dayButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb' },
  dayButtonSelected: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  dayButtonText: { fontWeight: '600', color: '#374151' },
  dayButtonTextSelected: { color: '#fff' },
  horarioInputs: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  horarioInput: { flex: 1, marginBottom: 12 },
  addHorarioButton: { backgroundColor: '#10b981', borderRadius: 12, height: 48, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  horariosList: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16, gap: 8 },
  horarioChip: { backgroundColor: '#eff6ff', borderRadius: 16, paddingVertical: 6, paddingHorizontal: 12 },
  horarioChipText: { color: '#1d4ed8', fontWeight: '500' },
});
