import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import Papa from 'papaparse';
import { supabase } from '@/core/api/supabaseClient';
import { useAuthStore } from '@/core/auth/useAuthStore';

export default function AddAlumnosScreen() {
  const { materia_id } = useLocalSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('csv');
  const [fileName, setFileName] = useState<string | null>(null);
  const [newAlumnos, setNewAlumnos] = useState<{ boleta: string }[]>([]);
  const [manualBoleta, setManualBoleta] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const profesor = useAuthStore((state) => state.profesor);

  const isValidBoleta = (boleta: string) => {
    // Assuming a valid "boleta" is a 10-digit number based on "chk_boleta_format".
    // This regex can be adjusted if the format is different.
    const boletaRegex = /^\d{10}$/;
    return boletaRegex.test(boleta);
  };

  const handleFilePick = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: 'text/csv',
      });

      if (res.canceled === false) {
        setFileName(res.assets[0].name);
        const fileContent = await fetch(res.assets[0].uri).then(response => response.text());
        Papa.parse(fileContent, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const parsedBoletas = results.data.map((row: any) => row.boleta).filter(Boolean);
            const validBoletas = parsedBoletas.filter(isValidBoleta);
            const invalidBoletas = parsedBoletas.filter((b: any) => !isValidBoleta(b));

            if (invalidBoletas.length > 0) {
              Alert.alert(
                'Boletas no válidas',
                `Se encontraron ${invalidBoletas.length} boletas con formato incorrecto. Solo se cargarán las válidas.\n\nNo válidas: ${invalidBoletas.slice(0, 5).join(', ')}${invalidBoletas.length > 5 ? '...' : ''}`
              );
            }
            
            if (validBoletas.length === 0 && parsedBoletas.length > 0) {
                Alert.alert('Error', 'Ninguna de las boletas en el archivo CSV tiene el formato correcto (10 dígitos numéricos).');
                setNewAlumnos([]);
            } else {
                setNewAlumnos(validBoletas.map((boleta: string) => ({ boleta })))
            }
          },
        });
      }
    } catch (err) {
      console.error('Error picking document:', err);
    }
  };

  const handleSaveAlumnos = async () => {
    if (!profesor) return;
    setIsSaving(true);
    try {
      if (newAlumnos.length > 0) {
        const inscripcionesToInsert = newAlumnos.map(alumno => ({
          boleta: alumno.boleta,
          materia_id: parseInt(materia_id as string, 10),
          estado_inscripcion: 'activa',
          created_by: profesor.id,
        }));
        const { error: inscripcionesError } = await supabase.from('inscripciones').insert(inscripcionesToInsert);
        if (inscripcionesError) throw inscripcionesError;
      }
      Alert.alert('Éxito', 'Alumnos inscritos correctamente.');
      router.back();
    } catch (error: any) {
      Alert.alert('Error', `No se pudo inscribir a los alumnos: ${error.message}`);
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddManual = async () => {
    if (!profesor) return;
    if (!manualBoleta) {
      Alert.alert('Campo incompleto', 'La boleta del alumno es requerida.');
      return;
    }
    if (!isValidBoleta(manualBoleta)) {
        Alert.alert('Formato incorrecto', 'La boleta debe ser un número de 10 dígitos.');
        return;
    }
    setIsSaving(true);
    try {
      const materiaId = parseInt(materia_id as string, 10);

      // 1. Check for existing inscription
      const { data: existingInscription, error: inscriptionError } = await supabase
        .from('inscripciones')
        .select('id')
        .eq('boleta', manualBoleta)
        .eq('materia_id', materiaId)
        .single();

      if (inscriptionError && inscriptionError.code !== 'PGRST116') { // PGRST116: "The query returned no rows"
        throw inscriptionError;
      }

      if (existingInscription) {
        Alert.alert('Alumno ya inscrito', 'Este alumno ya se encuentra inscrito en la materia.');
        setIsSaving(false); // Stop loading indicator
        return;
      }

      // 2. Check for existing student
      const { data: existingStudent, error: studentError } = await supabase
        .from('estudiantes')
        .select('boleta')
        .eq('boleta', manualBoleta)
        .single();

      if (studentError && studentError.code !== 'PGRST116') {
        throw studentError;
      }

      // Create student if it does not exist
      if (!existingStudent) {
        // NOTE: Creating a student with placeholder data as we only have the boleta.
        // The user should update the student's details later.
        const { error: newStudentError } = await supabase.from('estudiantes').insert({
          boleta: manualBoleta,
          curp: `${manualBoleta}`.padEnd(18, 'X'), // Placeholder CURP
          nombre: 'Estudiante', // Placeholder
          apellido: manualBoleta, // Placeholder
          carrera: 'Ingeniería', // Placeholder
          turno: 'Matutino', // Placeholder
          created_by: profesor.id,
        });
        if (newStudentError) {
            // If the student was created by another concurrent request, ignore the duplicate error.
            if (newStudentError.code !== '23505') {
                throw newStudentError;
            }
        }
      }

      // 3. Create inscription
      const { error: newInscriptionError } = await supabase.from('inscripciones').insert({
        boleta: manualBoleta,
        materia_id: materiaId,
        estado_inscripcion: 'activa',
        created_by: profesor.id,
      });
      if (newInscriptionError) throw newInscriptionError;

      Alert.alert('Éxito', 'Alumno inscrito correctamente.');
      setManualBoleta('');
    } catch (error: any) {
      Alert.alert('Error', `No se pudo inscribir al alumno: ${error.message}`);
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Añadir Alumnos</Text>
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

      {activeTab === 'csv' && (
        <View style={styles.contentContainer}>
          <Text style={styles.sectionTitle}>Importar Alumnos desde CSV</Text>
          <View style={styles.filePickerContainer}>
            <TouchableOpacity style={styles.filePickerButton} onPress={handleFilePick}>
              <Ionicons name="cloud-upload-outline" size={24} color="#2563eb" />
              <Text style={styles.filePickerButtonText}>Seleccionar archivo CSV</Text>
            </TouchableOpacity>
            {fileName && (
              <View style={styles.fileInfoContainer}>
                <Text style={styles.fileNameText}>{fileName}</Text>
                <Text style={styles.fileInfoText}>{newAlumnos.length} alumnos encontrados</Text>
              </View>
            )}
          </View>
          <TouchableOpacity style={[styles.button, isSaving && styles.buttonDisabled]} onPress={handleSaveAlumnos} disabled={isSaving || newAlumnos.length === 0}>
            {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Inscribir Alumnos</Text>}
          </TouchableOpacity>
        </View>
      )}

      {activeTab === 'manual' && (
        <View style={styles.contentContainer}>
          <Text style={styles.sectionTitle}>Inscripción Manual</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Boleta del alumno"
            value={manualBoleta}
            onChangeText={setManualBoleta}
            keyboardType="numeric"
          />
          <TouchableOpacity style={[styles.button, isSaving && styles.buttonDisabled]} onPress={handleAddManual} disabled={isSaving}>
            {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Inscribir Alumno</Text>}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', backgroundColor: '#fff' },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginLeft: 16 },
  tabContainer: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: '#2563eb' },
  tabText: { fontSize: 16, fontWeight: '600', color: '#6b7280' },
  activeTabText: { color: '#2563eb' },
  contentContainer: { padding: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#374151', marginBottom: 16 },
  input: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  button: { backgroundColor: '#2563eb', borderRadius: 12, height: 52, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  buttonDisabled: { opacity: 0.7 },
  filePickerContainer: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 16, alignItems: 'center' },
  filePickerButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, backgroundColor: '#eff6ff', borderRadius: 8 },
  filePickerButtonText: { color: '#2563eb', fontSize: 16, fontWeight: '600', marginLeft: 8 },
  fileInfoContainer: { marginTop: 16, alignItems: 'center' },
  fileNameText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  fileInfoText: { fontSize: 12, color: '#6b7280', marginTop: 4 },
});
