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
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { useSesionStore } from '@/store/useSesionStore';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';

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
  const router = useRouter();

  const [isModalVisible, setModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedMateriaId, setSelectedMateriaId] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingMateriaId, setEditingMateriaId] = useState<number | null>(null);

  // State for the main subject form
  const [newMateria, setNewMateria] = useState({ nombre: '', codigo: '', semestre: '', grupo: 'A' });
  // State for the list of schedules to be added
  const [newHorarios, setNewHorarios] = useState<Omit<Horario, 'id'>[]>([]);
  // State for the single schedule entry form
  const [currentHorario, setCurrentHorario] = useState({ dia_semana: 1, hora_inicio: '', duracion_minutos: '90' });
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

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
      setSelectedMateriaId(null);
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

  const onTimeChange = (event: any, selectedDate?: Date) => {
    setShowTimePicker(false);
    if (selectedDate) {
      const time = selectedDate.toTimeString().slice(0, 5);
      handleHorarioInputChange('hora_inicio', time);
    }
  };

  const handleAddHorario = () => {
    if (!currentHorario.hora_inicio) {
      Alert.alert('Hora requerida', 'Debes especificar la hora de inicio del horario.');
      return;
    }
    setNewHorarios([...newHorarios, { ...currentHorario, dia_semana: Number(currentHorario.dia_semana), duracion_minutos: Number(currentHorario.duracion_minutos) }]);
    setCurrentHorario({ dia_semana: 1, hora_inicio: '', duracion_minutos: '90' });
  };

  const toggleMateriaActions = (materiaId: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedMateriaId((prev) => (prev === materiaId ? null : materiaId));
  };

  const handleSaveMateria = async () => {
    if (!profesor) return;
    const { nombre, codigo, semestre, grupo } = newMateria;

    if (!nombre || !codigo || !semestre) {
      Alert.alert('Campos incompletos', 'El nombre, c?digo y semestre de la materia son requeridos.');
      return;
    }
    if (newHorarios.length === 0) {
      Alert.alert('Sin horarios', 'Debes a?adir al menos un horario para la materia.');
      return;
    }

    setIsSaving(true);
    try {
      if (isEditing && editingMateriaId) {
        const { error: materiaUpdateError } = await supabase
          .from('materias')
          .update({
            nombre,
            codigo,
            semestre: parseInt(semestre, 10),
            grupo,
            updated_by: profesor.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingMateriaId);

        if (materiaUpdateError) throw materiaUpdateError;

        const { error: deleteHorariosError } = await supabase.from('horarios').delete().eq('materia_id', editingMateriaId);
        if (deleteHorariosError) throw deleteHorariosError;

        const horariosToInsert = newHorarios.map((h) => ({
          ...h,
          materia_id: editingMateriaId,
        }));

        if (horariosToInsert.length > 0) {
          const { error: insertHorariosError } = await supabase.from('horarios').insert(horariosToInsert);
          if (insertHorariosError) throw insertHorariosError;
        }

        Alert.alert('Materia actualizada', 'Los cambios se guardaron correctamente.');
      } else {
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

        const horariosToInsert = newHorarios.map((h) => ({ ...h, materia_id: newMateriaId }));
        const { error: horariosError } = await supabase.from('horarios').insert(horariosToInsert);
        if (horariosError) throw horariosError;

        Alert.alert('?xito', 'Materia creada correctamente.');
        closeModal();
        loadMaterias();
        router.push({ pathname: '/(tabs)/materiaDetalle', params: { materia_id: newMateriaId } });
        return;
      }

      closeModal();
      loadMaterias();
    } catch (error: any) {
      Alert.alert('Error', `No se pudo guardar la materia: ${error.message}`);
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const openEditMateria = (materia: Materia) => {
    setIsEditing(true);
    setEditingMateriaId(materia.id);
    setNewMateria({
      nombre: materia.nombre,
      codigo: materia.codigo,
      semestre: materia.semestre.toString(),
      grupo: materia.grupo,
    });
    setNewHorarios(
      materia.horarios.map((h) => ({
        dia_semana: h.dia_semana,
        hora_inicio: h.hora_inicio,
        duracion_minutos: h.duracion_minutos,
      }))
    );
    setCurrentHorario({ dia_semana: 1, hora_inicio: '', duracion_minutos: '90' });
    setModalVisible(true);
  };

  const confirmDeleteMateria = (materia: Materia) => {
    Alert.alert(
      'Eliminar materia',
      `¿Quieres eliminar la materia ${materia.nombre}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => deleteMateria(materia.id),
        },
      ],
      { cancelable: true }
    );
  };

  const deleteMateria = async (materiaId: number) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('materias')
        .update({ activo: false, updated_at: new Date().toISOString() })
        .eq('id', materiaId);
      if (error) throw error;
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setSelectedMateriaId(null);
      await loadMaterias();
    } catch (error: any) {
      Alert.alert('Error', 'No se pudo eliminar la materia.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setModalVisible(false);
    setNewMateria({ nombre: '', codigo: '', semestre: '', grupo: 'A' });
    setNewHorarios([]);
    setIsEditing(false);
    setEditingMateriaId(null);
    setCurrentHorario({ dia_semana: 1, hora_inicio: '', duracion_minutos: '90' });
  }

  const openCreateModal = () => {
    setIsEditing(false);
    setEditingMateriaId(null);
    setNewMateria({ nombre: '', codigo: '', semestre: '', grupo: 'A' });
    setNewHorarios([]);
    setCurrentHorario({ dia_semana: 1, hora_inicio: '', duracion_minutos: '90' });
    setModalVisible(true);
  };

  const renderMateria = ({ item }: { item: Materia }) => {
    const isSelected = selectedMateriaId === item.id;

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => router.push({ pathname: '/(tabs)/materiaDetalle', params: { materia_id: item.id } })}
        onLongPress={() => toggleMateriaActions(item.id)}
        delayLongPress={300}
        style={[styles.card, isSelected && styles.cardSelected]}
      >
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
          {item.horarios.map((horario) => (
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

        {isSelected && (
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.editButton]}
              onPress={(event) => {
                event.stopPropagation();
                openEditMateria(item);
              }}
            >
              <Ionicons name="create-outline" size={18} color="#fff" />
              <Text style={styles.actionButtonText}>Editar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={(event) => {
                event.stopPropagation();
                confirmDeleteMateria(item);
              }}
            >
              <Ionicons name="trash-outline" size={18} color="#fff" />
              <Text style={styles.actionButtonText}>Eliminar</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

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

      <TouchableOpacity style={styles.fab} onPress={openCreateModal}>
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>

      <Modal visible={isModalVisible} animationType="slide" onRequestClose={closeModal}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{isEditing ? 'Editar Materia' : 'Crear Nueva Materia'}</Text>
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
                    <TouchableOpacity onPress={() => setShowTimePicker(true)} style={[styles.input, styles.horarioInput]}>
                        <Text style={styles.timeInputText}>{currentHorario.hora_inicio || 'Hora (HH:mm)'}</Text>
                    </TouchableOpacity>
                    <TextInput style={[styles.input, styles.horarioInput]} placeholder="Duración (min)" keyboardType="numeric" value={currentHorario.duracion_minutos} onChangeText={(val) => handleHorarioInputChange('duracion_minutos', val)} />
                </View>
                {showTimePicker && (
                    <DateTimePicker
                        value={new Date()}
                        mode="time"
                        is24Hour={true}
                        display="default"
                        onChange={onTimeChange}
                    />
                )}
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
              {isSaving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>{isEditing ? 'Guardar Cambios' : 'Guardar Materia'}</Text>
              )}
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
  listContent: { padding: 16, paddingBottom: 120 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  cardSelected: { borderWidth: 2, borderColor: '#2563eb' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  iconBadge: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardHeaderText: { flex: 1 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  cardSubtitle: { fontSize: 14, color: '#6b7280' },
  cardBody: { marginBottom: 12 },
  cardActions: { flexDirection: 'row', gap: 12, marginTop: 12 },
  actionButton: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 12, borderRadius: 12 },
  editButton: { backgroundColor: '#2563eb' },
  deleteButton: { backgroundColor: '#ef4444' },
  actionButtonText: { color: '#fff', fontSize: 15, fontWeight: '600', marginLeft: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  infoText: { fontSize: 14, color: '#6b7280', marginLeft: 8 },
  emptyText: { fontSize: 16, color: '#9ca3af', marginTop: 16, textAlign: 'center' },
  emptySubText: { fontSize: 14, color: '#9ca3af', marginTop: 8, textAlign: 'center' },
  fab: { position: 'absolute', right: 24, bottom: 110, width: 60, height: 60, borderRadius: 30, backgroundColor: '#2563eb', justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4 },
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
  timeInputText: { fontSize: 16, color: '#111827' },
});
