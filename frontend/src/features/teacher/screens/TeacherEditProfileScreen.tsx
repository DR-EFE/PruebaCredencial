import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '@/core/api/supabaseClient';
import { useAuthStore } from '@/core/auth/useAuthStore';
import { useAppNotifications } from '@/ui/components/AppNotificationProvider';
import { useFormValidation } from '@/ui/hooks/useFormValidation';

type FieldKey = 'nombre' | 'apellido';

export default function TeacherEditProfileScreen() {
  const router = useRouter();
  const profesor = useAuthStore((state) => state.profesor);
  const setProfesor = useAuthStore((state) => state.setProfesor);
  const [nombre, setNombre] = useState(profesor?.nombre ?? '');
  const [apellido, setApellido] = useState(profesor?.apellido ?? '');
  const [saving, setSaving] = useState(false);
  const { notify, showLoader, hideLoader } = useAppNotifications();
  const { require, validate, clearError, getError } = useFormValidation<FieldKey>();

  useEffect(() => {
    setNombre(profesor?.nombre ?? '');
    setApellido(profesor?.apellido ?? '');
  }, [profesor?.nombre, profesor?.apellido]);

  const trimmedNombre = useMemo(() => nombre.trim(), [nombre]);
  const trimmedApellido = useMemo(() => apellido.trim(), [apellido]);

  const hasChanges = useMemo(() => {
    const currentNombre = (profesor?.nombre ?? '').trim();
    const currentApellido = (profesor?.apellido ?? '').trim();
    return trimmedNombre !== currentNombre || trimmedApellido !== currentApellido;
  }, [profesor?.nombre, profesor?.apellido, trimmedNombre, trimmedApellido]);

  const validateForm = () => {
    let valid = true;

    if (!require('nombre', trimmedNombre, 'Ingresa tu nombre.')) {
      valid = false;
    } else if (!validate('nombre', () => trimmedNombre.length >= 2, 'El nombre debe tener al menos 2 caracteres.')) {
      valid = false;
    }

    if (!require('apellido', trimmedApellido, 'Ingresa tu apellido.')) {
      valid = false;
    } else if (!validate('apellido', () => trimmedApellido.length >= 2, 'El apellido debe tener al menos 2 caracteres.')) {
      valid = false;
    }

    if (valid && !hasChanges) {
      notify({
        type: 'info',
        title: 'Sin cambios',
        message: 'Modifica alguno de los campos para guardar.',
      });
      return false;
    }

    return valid;
  };

  const handleSave = async () => {
    if (!profesor) {
      notify({
        type: 'error',
        title: 'Perfil no disponible',
        message: 'Vuelve a iniciar sesion para editar tu informacion.',
      });
      return;
    }

    if (!validateForm()) {
      return;
    }

    setSaving(true);
    showLoader('Guardando cambios...');
    try {
      const { data, error } = await supabase
        .from('profesores')
        .update({
          nombre: trimmedNombre,
          apellido: trimmedApellido,
        })
        .eq('id', profesor.id)
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      setProfesor(data);
      notify({
        type: 'success',
        title: 'Perfil actualizado',
        message: 'Tus datos se guardaron correctamente.',
      });
      router.back();
    } catch (err: any) {
      console.error(err);
      notify({
        type: 'error',
        title: 'No se guardo',
        message: err?.message ?? 'Intenta nuevamente en unos minutos.',
      });
    } finally {
      hideLoader();
      setSaving(false);
    }
  };

  if (!profesor) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name='person-circle' size={72} color='#9ca3af' />
        <Text style={styles.emptyTitle}>No encontramos tu perfil</Text>
        <Text style={styles.emptySubtitle}>Inicia sesion nuevamente para continuar.</Text>
        <TouchableOpacity style={styles.backButtonAlt} onPress={() => router.replace('/(auth)/login')}>
          <Text style={styles.backButtonAltText}>Ir a login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps='handled'>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name='arrow-back' size={22} color='#111827' />
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>Editar perfil</Text>
            <Text style={styles.subtitle}>Actualiza tu informacion personal</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Nombre(s)</Text>
            <View style={[styles.inputWrapper, getError('nombre') && styles.inputWrapperError]}>
              <Ionicons name='person-outline' size={20} color='#9ca3af' style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={nombre}
                onChangeText={(text) => {
                  setNombre(text);
                  clearError('nombre');
                }}
                placeholder='Ingresa tus nombres'
                autoCapitalize='words'
                autoCorrect={false}
                returnKeyType='next'
              />
            </View>
            {getError('nombre') ? <Text style={styles.errorText}>{getError('nombre')}</Text> : null}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Apellidos</Text>
            <View style={[styles.inputWrapper, getError('apellido') && styles.inputWrapperError]}>
              <Ionicons name='person-circle-outline' size={20} color='#9ca3af' style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={apellido}
                onChangeText={(text) => {
                  setApellido(text);
                  clearError('apellido');
                }}
                placeholder='Ingresa tus apellidos'
                autoCapitalize='words'
                autoCorrect={false}
                returnKeyType='done'
              />
            </View>
            {getError('apellido') ? <Text style={styles.errorText}>{getError('apellido')}</Text> : null}
          </View>

          <View style={styles.hint}>
            <Ionicons name='shield-checkmark' size={18} color='#047857' />
            <Text style={styles.hintText}>Esta informacion se mostrara a tus estudiantes dentro de la app.</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, (saving || !hasChanges) && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving || !hasChanges}
        >
          {saving ? <ActivityIndicator color='#fff' /> : <Text style={styles.saveButtonText}>Guardar cambios</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    marginRight: 16,
    padding: 8,
    borderRadius: 9999,
    backgroundColor: '#f3f4f6',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 20,
    shadowColor: '#111827',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    marginBottom: 24,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    paddingHorizontal: 12,
  },
  inputWrapperError: {
    borderColor: '#f87171',
    backgroundColor: '#fef2f2',
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    paddingVertical: 12,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 12,
    marginTop: 6,
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  hintText: {
    flex: 1,
    color: '#065f46',
    fontSize: 13,
  },
  saveButton: {
    backgroundColor: '#800831',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#800831',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  backButtonAlt: {
    marginTop: 12,
    backgroundColor: '#800831',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
  },
  backButtonAltText: {
    color: '#fff',
    fontWeight: '600',
  },
});

