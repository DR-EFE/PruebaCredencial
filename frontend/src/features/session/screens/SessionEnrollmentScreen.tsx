import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import Papa from 'papaparse';

import { supabase } from '@/core/api/supabaseClient';
import { useAuthStore } from '@/core/auth/useAuthStore';

import { FeedbackBanner, FeedbackBannerProps } from '@/features/session/components/FeedbackBanner';

type TabKey = 'csv' | 'manual';

const BOLETA_REGEX = /^\d{10}$/;

interface PendingAlumno {
  boleta: string;
}

export default function SessionEnrollmentScreen() {
  const { materia_id } = useLocalSearchParams();
  const router = useRouter();
  const profesor = useAuthStore((state) => state.profesor);

  const [activeTab, setActiveTab] = useState<TabKey>('csv');
  const [fileName, setFileName] = useState<string | null>(null);
  const [newAlumnos, setNewAlumnos] = useState<PendingAlumno[]>([]);
  const [invalidBoletas, setInvalidBoletas] = useState<string[]>([]);
  const [duplicateBoletas, setDuplicateBoletas] = useState<string[]>([]);
  const [manualBoleta, setManualBoleta] = useState('');
  const [manualError, setManualError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackBannerProps | null>(null);

  useEffect(() => {
    if (!feedback) return;
    const timeout = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(timeout);
  }, [feedback]);

  const instructions = useMemo(
    () => [
      'La primera fila debe incluir la cabecera "boleta".',
      'Cada boleta debe contener exactamente 10 dígitos numéricos.',
      'Se descartan filas vacías, duplicadas o con formato incorrecto.',
    ],
    []
  );

  const isValidBoleta = (boleta: string) => BOLETA_REGEX.test(boleta);

  const handleFilePick = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: 'text/csv' });
      if (res.canceled) {
        return;
      }

      const asset = res.assets?.[0];
      if (!asset) {
        setFeedback({
          type: 'error',
          title: 'No se pudo leer el archivo',
          message: 'Intenta seleccionar el CSV nuevamente.',
        });
        return;
      }

      const fileContent = await fetch(asset.uri).then((response) => response.text());

      Papa.parse(fileContent, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const rows = Array.isArray(results.data) ? results.data : [];
          const seen = new Set<string>();
          const valid: string[] = [];
          const invalid: string[] = [];
          const duplicates: string[] = [];

          rows.forEach((row: any) => {
            const rawBoleta = typeof row?.boleta === 'string' ? row.boleta.trim() : '';
            if (!rawBoleta) return;

            if (!isValidBoleta(rawBoleta)) {
              invalid.push(rawBoleta);
              return;
            }

            if (seen.has(rawBoleta)) {
              duplicates.push(rawBoleta);
              return;
            }

            seen.add(rawBoleta);
            valid.push(rawBoleta);
          });

          setFileName(asset.name);
          setNewAlumnos(valid.map((boleta) => ({ boleta })));
          setInvalidBoletas(invalid);
          setDuplicateBoletas(duplicates);

          if (valid.length === 0) {
            setFeedback({
              type: 'error',
              title: 'No se detectaron boletas válidas',
              message: 'Revisa que la columna se llame "boleta" y que cada valor tenga 10 dígitos.',
            });
          } else if (invalid.length > 0 || duplicates.length > 0) {
            const issues = [
              invalid.length > 0 ? `${invalid.length} con formato incorrecto` : null,
              duplicates.length > 0 ? `${duplicates.length} duplicadas` : null,
            ]
              .filter(Boolean)
              .join(' y ');

            setFeedback({
              type: 'warning',
              title: 'Importación parcial',
              message: `Se agregaron ${valid.length} boletas. Se omitieron ${issues}.`,
            });
          } else {
            setFeedback({
              type: 'success',
              title: 'Archivo cargado',
              message: `Se prepararon ${valid.length} boletas para inscripción.`,
            });
          }
        },
        error: () => {
          setFeedback({
            type: 'error',
            title: 'Error al procesar el CSV',
            message: 'Confirma que el archivo está en formato CSV y vuelve a intentarlo.',
          });
        },
      });
    } catch (error) {
      console.error('Error picking document:', error);
      setFeedback({
        type: 'error',
        title: 'No se pudo leer el archivo',
        message: 'Intenta seleccionar el CSV nuevamente.',
      });
    }
  };

  const handleRemoveBoleta = (boleta: string) => {
    setNewAlumnos((prev) => prev.filter((alumno) => alumno.boleta !== boleta));
  };

  const handleClearCsv = () => {
    setFileName(null);
    setNewAlumnos([]);
    setInvalidBoletas([]);
    setDuplicateBoletas([]);
  };

  const handleSaveAlumnos = async () => {
    if (!profesor) {
      setFeedback({
        type: 'error',
        title: 'Sesión inválida',
        message: 'Vuelve a iniciar sesión para continuar.',
      });
      return;
    }

    if (newAlumnos.length === 0) {
      setFeedback({
        type: 'warning',
        title: 'Nada que inscribir',
        message: 'Importa un archivo con boletas válidas antes de continuar.',
      });
      return;
    }

    setIsSaving(true);
    try {
      const materiaId = parseInt(materia_id as string, 10);
      const payload = newAlumnos.map((alumno) => ({
        boleta: alumno.boleta,
        materia_id: materiaId,
        estado_inscripcion: 'activa',
        created_by: profesor.id,
      }));

      const { error } = await supabase.from('inscripciones').insert(payload);
      if (error) {
        throw error;
      }

      setFeedback({
        type: 'success',
        title: 'Inscripción completada',
        message: `${newAlumnos.length} alumnos fueron inscritos correctamente.`,
      });
      handleClearCsv();
    } catch (error: any) {
      console.error('Error saving alumnos:', error);
      setFeedback({
        type: 'error',
        title: 'No se pudo inscribir',
        message: error?.message ?? 'Inténtalo de nuevo más tarde.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddManual = async () => {
    setManualError(null);

    if (!manualBoleta.trim()) {
      setManualError('Ingresa la boleta del alumno.');
      return;
    }

    if (!isValidBoleta(manualBoleta.trim())) {
      setManualError('La boleta debe tener exactamente 10 dígitos numéricos.');
      return;
    }

    if (!profesor) {
      setFeedback({
        type: 'error',
        title: 'Sesión inválida',
        message: 'Vuelve a iniciar sesión para continuar.',
      });
      return;
    }

    setIsSaving(true);
    try {
      const normalizedBoleta = manualBoleta.trim();
      const materiaId = parseInt(materia_id as string, 10);

      const { data: existingInscription, error: inscriptionError } = await supabase
        .from('inscripciones')
        .select('id')
        .eq('boleta', normalizedBoleta)
        .eq('materia_id', materiaId)
        .single();

      if (inscriptionError && inscriptionError.code !== 'PGRST116') {
        throw inscriptionError;
      }

      if (existingInscription) {
        setManualError('Este alumno ya está inscrito en la materia.');
        setIsSaving(false);
        return;
      }

      const { data: existingStudent, error: studentError } = await supabase
        .from('estudiantes')
        .select('boleta')
        .eq('boleta', normalizedBoleta)
        .single();

      if (studentError && studentError.code !== 'PGRST116') {
        throw studentError;
      }

      if (!existingStudent) {
        setManualError('La boleta no pertenece a un estudiante registrado en Supabase.');
        setIsSaving(false);
        return;
      }

      const { error } = await supabase
        .from('inscripciones')
        .insert({
          boleta: normalizedBoleta,
          materia_id: materiaId,
          estado_inscripcion: 'activa',
          created_by: profesor.id,
        });

      if (error) {
        throw error;
      }

      setFeedback({
        type: 'success',
        title: 'Alumno inscrito',
        message: `La boleta ${normalizedBoleta} fue inscrita correctamente.`,
      });
      setManualBoleta('');
    } catch (error: any) {
      console.error('Error adding alumno manual:', error);
      setManualError(error?.message ?? 'No se pudo inscribir al alumno.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderBoletaItem = ({ item }: { item: PendingAlumno }) => (
    <View style={styles.boletaRow}>
      <Text style={styles.boletaText}>{item.boleta}</Text>
      <TouchableOpacity style={styles.removeButton} onPress={() => handleRemoveBoleta(item.boleta)}>
        <Ionicons name='trash' size={16} color='#ef4444' />
        <Text style={styles.removeButtonText}>Quitar</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name='arrow-back' size={24} color='#111827' />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Añadir alumnos</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'csv' && styles.activeTab]}
          onPress={() => setActiveTab('csv')}
        >
          <Text style={[styles.tabText, activeTab === 'csv' && styles.activeTabText]}>Importar CSV</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'manual' && styles.activeTab]}
          onPress={() => setActiveTab('manual')}
        >
          <Text style={[styles.tabText, activeTab === 'manual' && styles.activeTabText]}>Manual</Text>
        </TouchableOpacity>
      </View>

      {feedback ? <FeedbackBanner {...feedback} /> : null}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {activeTab === 'csv' ? (
          <View style={styles.contentContainer}>
            <Text style={styles.sectionTitle}>Importar alumnos desde CSV</Text>
            <View style={styles.instructionsBox}>
              <Text style={styles.instructionsTitle}>Antes de importar:</Text>
              {instructions.map((item) => (
                <View key={item} style={styles.instructionsRow}>
                  <Ionicons name='checkmark-circle' size={16} color='#2563eb' />
                  <Text style={styles.instructionsText}>{item}</Text>
                </View>
              ))}
            </View>

            <View style={styles.filePickerContainer}>
              <TouchableOpacity style={styles.filePickerButton} onPress={handleFilePick} disabled={isSaving}>
                <Ionicons name='cloud-upload-outline' size={22} color='#2563eb' />
                <Text style={styles.filePickerButtonText}>Seleccionar archivo CSV</Text>
              </TouchableOpacity>
              {fileName ? (
                <View style={styles.fileInfoContainer}>
                  <View style={styles.fileInfoHeader}>
                    <Text style={styles.fileNameText}>{fileName}</Text>
                    <TouchableOpacity onPress={handleClearCsv}>
                      <Text style={styles.fileClearButton}>Limpiar</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.fileInfoText}>{newAlumnos.length} boletas listas para inscribir.</Text>
                </View>
              ) : (
                <Text style={styles.fileEmptyText}>Aún no se selecciona un archivo.</Text>
              )}
            </View>

            {newAlumnos.length > 0 ? (
              <View style={styles.previewContainer}>
                <View style={styles.previewHeader}>
                  <Text style={styles.previewTitle}>Boletas preparadas</Text>
                  <Text style={styles.previewCount}>{newAlumnos.length}</Text>
                </View>
                <FlatList
                  data={newAlumnos}
                  keyExtractor={(item) => item.boleta}
                  renderItem={renderBoletaItem}
                />
              </View>
            ) : null}

            {invalidBoletas.length > 0 ? (
              <View style={styles.issueContainer}>
                <Text style={styles.issueTitle}>Formato incorrecto</Text>
                <Text style={styles.issueText}>
                  Revisa las siguientes boletas: {invalidBoletas.slice(0, 8).join(', ')}
                  {invalidBoletas.length > 8 ? '…' : ''}
                </Text>
              </View>
            ) : null}

            {duplicateBoletas.length > 0 ? (
              <View style={styles.issueContainer}>
                <Text style={styles.issueTitle}>Duplicados omitidos</Text>
                <Text style={styles.issueText}>
                  Se detectaron {duplicateBoletas.length} boletas repetidas dentro del archivo.
                </Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.button, (isSaving || newAlumnos.length === 0) && styles.buttonDisabled]}
              onPress={handleSaveAlumnos}
              disabled={isSaving || newAlumnos.length === 0}
            >
              {isSaving ? <ActivityIndicator color='#fff' /> : <Text style={styles.buttonText}>Inscribir alumnos</Text>}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.contentContainer}>
            <Text style={styles.sectionTitle}>Inscripción manual</Text>
            <Text style={styles.manualHelper}>Registra una boleta puntual cuando no esté incluida en el CSV.</Text>
            <TextInput
              style={[styles.input, manualError && styles.inputError]}
              placeholder='Boleta del alumno'
              value={manualBoleta}
              onChangeText={(value) => {
                setManualBoleta(value);
                if (manualError) setManualError(null);
              }}
              keyboardType='numeric'
              maxLength={10}
              editable={!isSaving}
            />
            {manualError ? <Text style={styles.errorText}>{manualError}</Text> : null}
            <TouchableOpacity
              style={[styles.button, isSaving && styles.buttonDisabled]}
              onPress={handleAddManual}
              disabled={isSaving}
            >
              {isSaving ? <ActivityIndicator color='#fff' /> : <Text style={styles.buttonText}>Inscribir alumno</Text>}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 36 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginLeft: 16 },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#2563eb',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  activeTabText: {
    color: '#2563eb',
  },
  contentContainer: {
    paddingVertical: 24,
    gap: 18,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  instructionsBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    gap: 10,
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  instructionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  instructionsText: {
    flex: 1,
    fontSize: 14,
    color: '#4b5563',
  },
  filePickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    gap: 12,
  },
  filePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    gap: 8,
  },
  filePickerButtonText: {
    color: '#2563eb',
    fontSize: 16,
    fontWeight: '600',
  },
  fileInfoContainer: {
    gap: 4,
  },
  fileInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fileNameText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  fileClearButton: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ef4444',
  },
  fileInfoText: {
    fontSize: 13,
    color: '#6b7280',
  },
  fileEmptyText: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
  },
  previewContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    gap: 12,
    maxHeight: 260,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  previewCount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563eb',
  },
  boletaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  boletaText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  removeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ef4444',
  },
  issueContainer: {
    backgroundColor: '#fff7ed',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fed7aa',
    padding: 14,
    gap: 6,
  },
  issueTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#b45309',
  },
  issueText: {
    fontSize: 13,
    color: '#7c2d12',
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  manualHelper: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  inputError: {
    borderColor: '#f87171',
  },
  errorText: {
    fontSize: 13,
    color: '#b91c1c',
    marginBottom: 8,
  },
});
