import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  LayoutAnimation,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';

import { supabase } from '@/core/api/supabaseClient';
import { useAuthStore } from '@/core/auth/useAuthStore';
import { FeedbackBanner, FeedbackBannerProps } from '@/features/session/components/FeedbackBanner';

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
  horarios: Horario[];
}

type MateriaForm = {
  nombre: string;
  codigo: string;
  semestre: string;
  grupo: string;
};

type HorarioDraft = Omit<Horario, 'id'>;

const DIAS_SEMANA_CORTOS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const DIAS_SEMANA_LARGOS = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'];

const STEP_DEFINITIONS = [
  {
    key: 'info',
    title: 'Datos de la materia',
    description: 'Completa el nombre, codigo, semestre y grupo.',
  },
  {
    key: 'schedule',
    title: 'Horarios',
    description: 'Selecciona los dias y horarios en los que impartes la clase.',
  },
] as const;

const INITIAL_FORM: MateriaForm = {
  nombre: '',
  codigo: '',
  semestre: '',
  grupo: 'A',
};

const INITIAL_HORARIO_FORM = {
  dia_semana: 1,
  hora_inicio: '',
  duracion_minutos: '90',
};

const StepIndicator = ({ currentStep }: { currentStep: number }) => (
  <View style={styles.stepIndicator}>
    {STEP_DEFINITIONS.map((step, index) => {
      const isActive = index === currentStep;
      const isCompleted = index < currentStep;
      return (
        <View key={step.key} style={styles.stepItem}>
          <View style={[styles.stepCircle, (isActive || isCompleted) && styles.stepCircleActive]}>
            <Text style={[styles.stepCircleText, (isActive || isCompleted) && styles.stepCircleTextActive]}>
              {index + 1}
            </Text>
          </View>
          <View style={styles.stepTextGroup}>
            <Text style={[styles.stepTitle, (isActive || isCompleted) && styles.stepTitleActive]}>{step.title}</Text>
            <Text style={styles.stepDescription}>{step.description}</Text>
          </View>
          {index < STEP_DEFINITIONS.length - 1 && <View style={styles.stepDivider} />}
        </View>
      );
    })}
  </View>
);
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

  const [newMateria, setNewMateria] = useState<MateriaForm>(INITIAL_FORM);
  const [newHorarios, setNewHorarios] = useState<HorarioDraft[]>([]);
  const [currentHorario, setCurrentHorario] = useState({
    dia_semana: INITIAL_HORARIO_FORM.dia_semana,
    hora_inicio: INITIAL_HORARIO_FORM.hora_inicio,
    duracion_minutos: INITIAL_HORARIO_FORM.duracion_minutos,
  });
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [currentStep, setCurrentStep] = useState(0);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof MateriaForm, string>>>({});
  const [horarioError, setHorarioError] = useState<string | null>(null);

  const [listFeedback, setListFeedback] = useState<FeedbackBannerProps | null>(null);
  const [pendingDeleteMateria, setPendingDeleteMateria] = useState<Materia | null>(null);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);

  const initialDraftRef = useRef<{ materia: MateriaForm; horarios: HorarioDraft[] } | null>(null);

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  useEffect(() => {
    if (!listFeedback) return;
    const timeout = setTimeout(() => setListFeedback(null), 4000);
    return () => clearTimeout(timeout);
  }, [listFeedback]);

  const loadMaterias = useCallback(
    async (showGlobalSpinner = true) => {
      if (!profesor) {
        setMaterias([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (showGlobalSpinner) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      try {
        const { data, error } = await supabase
          .from('materias')
          .select('*, horarios (*)')
          .eq('profesor_id', profesor.id)
          .eq('activo', true)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setMaterias(data || []);
        setSelectedMateriaId(null);
      } catch (error: any) {
        console.error(error);
        setListFeedback({
          type: 'error',
          title: 'No pudimos cargar tus materias',
          message: error?.message ?? 'Intenta actualizar nuevamente en unos minutos.',
        });
      } finally {
        if (showGlobalSpinner) {
          setLoading(false);
        } else {
          setRefreshing(false);
        }
      }
    },
    [profesor]
  );

  useEffect(() => {
    if (profesor) {
      loadMaterias();
    } else {
      setMaterias([]);
      setLoading(false);
    }
  }, [profesor, loadMaterias]);

  const handleInputChange = (field: keyof MateriaForm, value: string) => {
    setNewMateria((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleHorarioInputChange = (field: 'dia_semana' | 'hora_inicio' | 'duracion_minutos', value: any) => {
    setCurrentHorario((prev) => ({ ...prev, [field]: value }));
    if (horarioError) {
      setHorarioError(null);
    }
  };

  const onTimeChange = (_event: any, selectedDate?: Date) => {
    setShowTimePicker(false);
    if (selectedDate) {
      const time = selectedDate.toTimeString().slice(0, 5);
      handleHorarioInputChange('hora_inicio', time);
    }
  };

  const validateInfoStep = () => {
    const errors: Partial<Record<keyof MateriaForm, string>> = {};

    if (!newMateria.nombre.trim()) {
      errors.nombre = 'Ingresa el nombre de la materia.';
    }
    if (!newMateria.codigo.trim()) {
      errors.codigo = 'El codigo es obligatorio.';
    }
    if (!newMateria.semestre.trim()) {
      errors.semestre = 'Indica el semestre.';
    } else if (Number.isNaN(Number(newMateria.semestre))) {
      errors.semestre = 'El semestre debe ser numerico.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateHorariosStep = () => {
    if (newHorarios.length === 0) {
      setHorarioError('Agrega al menos un horario para la materia.');
      return false;
    }
    setHorarioError(null);
    return true;
  };
  const handleNextStep = () => {
    if (currentStep === 0 && validateInfoStep()) {
      setCurrentStep(1);
    }
  };

  const handlePreviousStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleAddHorario = () => {
    if (!currentHorario.hora_inicio) {
      setHorarioError('Selecciona la hora de inicio.');
      return;
    }

    const duration = Number(currentHorario.duracion_minutos);
    if (Number.isNaN(duration) || duration <= 0) {
      setHorarioError('La duracion debe ser un numero mayor a 0.');
      return;
    }

    setNewHorarios((prev) => [
      ...prev,
      {
        dia_semana: Number(currentHorario.dia_semana),
        hora_inicio: currentHorario.hora_inicio,
        duracion_minutos: duration,
      },
    ]);
    setCurrentHorario(INITIAL_HORARIO_FORM);
    setHorarioError(null);
  };

  const handleRemoveHorario = (index: number) => {
    setNewHorarios((prev) => prev.filter((_, idx) => idx !== index));
  };

  const toggleMateriaActions = (materiaId: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedMateriaId((prev) => (prev === materiaId ? null : materiaId));
  };

  const hasUnsavedChanges = useMemo(() => {
    if (!isModalVisible || !initialDraftRef.current) return false;
    const snapshot = initialDraftRef.current;
    const materiaChanged = JSON.stringify(snapshot.materia) !== JSON.stringify(newMateria);
    const horariosChanged = JSON.stringify(snapshot.horarios) !== JSON.stringify(newHorarios);
    return materiaChanged || horariosChanged;
  }, [isModalVisible, newMateria, newHorarios]);

  const resetFormState = useCallback(() => {
    setNewMateria(INITIAL_FORM);
    setNewHorarios([]);
    setCurrentHorario(INITIAL_HORARIO_FORM);
    setFormErrors({});
    setHorarioError(null);
    setCurrentStep(0);
    setShowTimePicker(false);
    setIsSaving(false);
    setIsEditing(false);
    setEditingMateriaId(null);
    setShowDiscardDialog(false);
    initialDraftRef.current = null;
  }, []);

  const forceCloseModal = useCallback(() => {
    setModalVisible(false);
    resetFormState();
  }, [resetFormState]);

  const requestCloseModal = () => {
    if (hasUnsavedChanges) {
      setShowDiscardDialog(true);
    } else {
      forceCloseModal();
    }
  };

  const openCreateModal = () => {
    resetFormState();
    initialDraftRef.current = { materia: INITIAL_FORM, horarios: [] };
    setModalVisible(true);
  };

  const openEditMateria = (materia: Materia) => {
    resetFormState();
    const materiaForm: MateriaForm = {
      nombre: materia.nombre,
      codigo: materia.codigo,
      semestre: materia.semestre.toString(),
      grupo: materia.grupo,
    };
    const horariosForm = materia.horarios.map<HorarioDraft>((h) => ({
      dia_semana: h.dia_semana,
      hora_inicio: h.hora_inicio,
      duracion_minutos: h.duracion_minutos,
    }));

    setIsEditing(true);
    setEditingMateriaId(materia.id);
    setNewMateria(materiaForm);
    setNewHorarios(horariosForm);
    initialDraftRef.current = { materia: materiaForm, horarios: horariosForm };
    setModalVisible(true);
  };
  const handleSaveMateria = async () => {
    if (!profesor) return;

    const infoIsValid = validateInfoStep();
    const horariosValid = validateHorariosStep();
    if (!infoIsValid) {
      setCurrentStep(0);
      return;
    }
    if (!horariosValid) {
      setCurrentStep(1);
      return;
    }

    setIsSaving(true);
    try {
      const { nombre, codigo, semestre, grupo } = newMateria;
      const horarioPayload = newHorarios.map((h) => ({
        ...h,
        duracion_minutos: Number(h.duracion_minutos),
      }));

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

        if (horarioPayload.length > 0) {
          const { error: insertHorariosError } = await supabase
            .from('horarios')
            .insert(horarioPayload.map((h) => ({ ...h, materia_id: editingMateriaId })));
          if (insertHorariosError) throw insertHorariosError;
        }

        setListFeedback({
          type: 'success',
          title: 'Materia actualizada',
          message: 'Los cambios se guardaron correctamente.',
        });
        forceCloseModal();
        await loadMaterias();
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
        const { error: horariosError } = await supabase
          .from('horarios')
          .insert(horarioPayload.map((h) => ({ ...h, materia_id: newMateriaId })));
        if (horariosError) throw horariosError;

        setListFeedback({
          type: 'success',
          title: 'Materia creada',
          message: 'La materia quedo lista con sus horarios.',
        });
        forceCloseModal();
        await loadMaterias();
        router.push({ pathname: '/(tabs)/materiaDetalle', params: { materia_id: newMateriaId } });
      }
    } catch (error: any) {
      console.error(error);
      setListFeedback({
        type: 'error',
        title: 'No se pudo guardar la materia',
        message: error?.message ?? 'Revisa tu conexion e intentalo nuevamente.',
      });
    } finally {
      setIsSaving(false);
    }
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
      setPendingDeleteMateria(null);
      await loadMaterias();
      setListFeedback({
        type: 'success',
        title: 'Materia eliminada',
        message: 'El grupo ya no estara visible en tu lista.',
      });
    } catch (error: any) {
      console.error(error);
      setListFeedback({
        type: 'error',
        title: 'No se pudo eliminar',
        message: error?.message ?? 'Intenta mas tarde.',
      });
    } finally {
      setLoading(false);
    }
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
              {item.codigo} · Grupo {item.grupo}
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
                setPendingDeleteMateria(item);
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
      {listFeedback ? <FeedbackBanner {...listFeedback} /> : null}

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : materias.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="book-outline" size={64} color="#d1d5db" />
          <Text style={styles.emptyText}>No tienes materias asignadas</Text>
          <Text style={styles.emptySubText}>Crea tu primera materia para comenzar.</Text>
        </View>
      ) : (
        <FlatList
          data={materias}
          renderItem={renderMateria}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadMaterias(false)}
              tintColor="#2563eb"
              colors={['#2563eb']}
            />
          }
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={openCreateModal}>
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>

      <Modal visible={isModalVisible} animationType="slide" onRequestClose={requestCloseModal}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity style={styles.closeButton} onPress={requestCloseModal}>
              <Ionicons name="close" size={26} color="#6b7280" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{isEditing ? 'Editar materia' : 'Crear nueva materia'}</Text>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            <StepIndicator currentStep={currentStep} />

            {currentStep === 0 ? (
              <View style={styles.stepContainer}>
                <TextInput
                  style={[styles.input, formErrors.nombre && styles.inputError]}
                  placeholder="Nombre de la materia"
                  value={newMateria.nombre}
                  onChangeText={(value) => handleInputChange('nombre', value)}
                />
                {formErrors.nombre ? <Text style={styles.errorText}>{formErrors.nombre}</Text> : null}

                <TextInput
                  style={[styles.input, formErrors.codigo && styles.inputError]}
                  placeholder="Codigo"
                  value={newMateria.codigo}
                  onChangeText={(value) => handleInputChange('codigo', value)}
                  autoCapitalize="characters"
                />
                {formErrors.codigo ? <Text style={styles.errorText}>{formErrors.codigo}</Text> : null}

                <TextInput
                  style={[styles.input, formErrors.semestre && styles.inputError]}
                  placeholder="Semestre"
                  keyboardType="numeric"
                  value={newMateria.semestre}
                  onChangeText={(value) => handleInputChange('semestre', value)}
                />
                {formErrors.semestre ? <Text style={styles.errorText}>{formErrors.semestre}</Text> : null}

                <TextInput
                  style={styles.input}
                  placeholder="Grupo (ej. A, B)"
                  value={newMateria.grupo}
                  onChangeText={(value) => handleInputChange('grupo', value)}
                  autoCapitalize="characters"
                  maxLength={2}
                />
              </View>
            ) : (
              <View style={styles.stepContainer}>
                <View style={styles.daySelector}>
                  {DIAS_SEMANA_CORTOS.map((dia, index) => {
                    const isActive = currentHorario.dia_semana === index + 1;
                    return (
                      <TouchableOpacity
                        key={dia}
                        style={[styles.dayButton, isActive && styles.dayButtonSelected]}
                        onPress={() => handleHorarioInputChange('dia_semana', index + 1)}
                      >
                        <Text style={[styles.dayButtonText, isActive && styles.dayButtonTextSelected]}>{dia}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={styles.horarioInputs}>
                  <TouchableOpacity style={[styles.input, styles.horarioInput]} onPress={() => setShowTimePicker(true)}>
                    <Text style={[styles.timeInputText, !currentHorario.hora_inicio && styles.timeInputPlaceholder]}>
                      {currentHorario.hora_inicio || 'Hora (HH:mm)'}
                    </Text>
                  </TouchableOpacity>
                  <TextInput
                    style={[styles.input, styles.horarioInput]}
                    placeholder="Duracion (min)"
                    keyboardType="numeric"
                    value={currentHorario.duracion_minutos}
                    onChangeText={(value) => handleHorarioInputChange('duracion_minutos', value)}
                  />
                </View>

                {showTimePicker ? (
                  <DateTimePicker
                    value={new Date()}
                    mode="time"
                    is24Hour
                    display="default"
                    onChange={onTimeChange}
                  />
                ) : null}

                {horarioError ? <Text style={styles.errorText}>{horarioError}</Text> : null}

                <TouchableOpacity style={styles.addHorarioButton} onPress={handleAddHorario}>
                  <Ionicons name="add" size={20} color="#fff" />
                  <Text style={styles.addHorarioButtonText}>Anadir horario</Text>
                </TouchableOpacity>

                {newHorarios.length > 0 ? (
                  <View style={styles.horariosList}>
                    {newHorarios.map((horario, index) => (
                      <View key={`${horario.dia_semana}-${horario.hora_inicio}-${index}`} style={styles.horarioCard}>
                        <View>
                          <Text style={styles.horarioCardTitle}>
                            {DIAS_SEMANA_LARGOS[horario.dia_semana - 1]}
                          </Text>
                          <Text style={styles.horarioCardSubtitle}>
                            {horario.hora_inicio} · {horario.duracion_minutos} min
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => handleRemoveHorario(index)}
                          style={styles.removeHorarioButton}
                        >
                          <Ionicons name="trash" size={16} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.horariosEmpty}>
                    <Ionicons name="calendar-outline" size={20} color="#94a3b8" />
                    <Text style={styles.horariosEmptyText}>Aun no agregas horarios.</Text>
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            {currentStep > 0 ? (
              <TouchableOpacity style={[styles.footerButton, styles.footerSecondary]} onPress={handlePreviousStep}>
                <Text style={styles.footerSecondaryText}>Atras</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[styles.footerButton, styles.footerSecondary]} onPress={requestCloseModal}>
                <Text style={styles.footerSecondaryText}>Cancelar</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.footerButton, styles.footerPrimary, isSaving && styles.buttonDisabled]}
              onPress={currentStep === STEP_DEFINITIONS.length - 1 ? handleSaveMateria : handleNextStep}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.footerPrimaryText}>
                  {currentStep === STEP_DEFINITIONS.length - 1
                    ? isEditing
                      ? 'Guardar cambios'
                      : 'Crear materia'
                    : 'Siguiente'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <Modal visible={pendingDeleteMateria !== null} transparent animationType="fade">
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogCard}>
            <Text style={styles.dialogTitle}>Eliminar materia</Text>
            <Text style={styles.dialogMessage}>
              Se eliminara “{pendingDeleteMateria?.nombre}” de tu lista. Esta accion no afectara los registros previos.
            </Text>
            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={[styles.dialogButton, styles.dialogSecondary]}
                onPress={() => setPendingDeleteMateria(null)}
              >
                <Text style={styles.dialogSecondaryText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogButton, styles.dialogDestructive]}
                onPress={() => pendingDeleteMateria && deleteMateria(pendingDeleteMateria.id)}
              >
                <Text style={styles.dialogDestructiveText}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showDiscardDialog} transparent animationType="fade">
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogCard}>
            <Text style={styles.dialogTitle}>Descartar cambios</Text>
            <Text style={styles.dialogMessage}>
              Los datos capturados se perderan. ?Quieres salir sin guardar?
            </Text>
            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={[styles.dialogButton, styles.dialogSecondary]}
                onPress={() => setShowDiscardDialog(false)}
              >
                <Text style={styles.dialogSecondaryText}>Seguir editando</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogButton, styles.dialogDestructive]}
                onPress={forceCloseModal}
              >
                <Text style={styles.dialogDestructiveText}>Descartar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', paddingHorizontal: 16, paddingTop: 12 },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    paddingHorizontal: 20,
  },
  listContent: { paddingBottom: 120 },
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
  cardSelected: { borderWidth: 2, borderColor: '#2563eb' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardHeaderText: { flex: 1 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  cardSubtitle: { fontSize: 14, color: '#6b7280' },
  cardBody: { marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  infoText: { fontSize: 14, color: '#6b7280', marginLeft: 8 },
  cardActions: { flexDirection: 'row', gap: 12, marginTop: 12 },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  editButton: { backgroundColor: '#2563eb' },
  deleteButton: { backgroundColor: '#ef4444' },
  actionButtonText: { color: '#fff', fontSize: 15, fontWeight: '600', marginLeft: 8 },
  emptyText: { fontSize: 16, color: '#9ca3af', marginTop: 16, textAlign: 'center' },
  emptySubText: { fontSize: 14, color: '#9ca3af', marginTop: 8, textAlign: 'center' },
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
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f9fafb',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 22, fontWeight: '700', color: '#111827', flex: 1, textAlign: 'center' },
  closeButton: {
    padding: 8,
    position: 'absolute',
    left: 0,
    top: 0,
  },
  modalContent: { paddingBottom: 32, gap: 24 },
  stepIndicator: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    gap: 16,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    position: 'relative',
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  stepCircleActive: {
    borderColor: '#2563eb',
    backgroundColor: '#2563eb',
  },
  stepCircleText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  stepCircleTextActive: { color: '#fff' },
  stepTextGroup: { flex: 1 },
  stepTitle: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  stepTitleActive: { color: '#2563eb' },
  stepDescription: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
  stepDivider: {
    position: 'absolute',
    left: 13,
    top: 32,
    width: 2,
    height: '70%',
    backgroundColor: '#e5e7eb',
  },
  stepContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 20,
    gap: 12,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  inputError: { borderColor: '#f87171' },
  errorText: { fontSize: 12, color: '#b91c1c' },
  daySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f8fafc',
  },
  dayButtonSelected: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  dayButtonText: { fontWeight: '600', color: '#374151' },
  dayButtonTextSelected: { color: '#fff' },
  horarioInputs: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  horarioInput: { flex: 1 },
  timeInputText: { fontSize: 16, color: '#111827' },
  timeInputPlaceholder: { color: '#9ca3af' },
  addHorarioButton: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    height: 48,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  addHorarioButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  horariosList: { gap: 12 },
  horarioCard: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  horarioCardTitle: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  horarioCardSubtitle: { fontSize: 13, color: '#475569', marginTop: 2 },
  removeHorarioButton: {
    padding: 8,
    borderRadius: 999,
    backgroundColor: '#fee2e2',
  },
  horariosEmpty: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  horariosEmptyText: { fontSize: 13, color: '#64748b' },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 12,
  },
  footerButton: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerSecondary: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5f5',
  },
  footerSecondaryText: { color: '#2563eb', fontSize: 15, fontWeight: '600' },
  footerPrimary: { backgroundColor: '#2563eb' },
  footerPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  buttonDisabled: { opacity: 0.6 },
  dialogOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 20,
    gap: 16,
  },
  dialogTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  dialogMessage: { fontSize: 14, color: '#475569', lineHeight: 20 },
  dialogActions: { flexDirection: 'row', gap: 12 },
  dialogButton: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogSecondary: { backgroundColor: '#f8fafc' },
  dialogSecondaryText: { color: '#1d4ed8', fontWeight: '600', fontSize: 14 },
  dialogDestructive: { backgroundColor: '#ef4444' },
  dialogDestructiveText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});


