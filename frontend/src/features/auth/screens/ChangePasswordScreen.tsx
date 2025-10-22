import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '@/core/api/supabaseClient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppNotifications } from '@/ui/components/AppNotificationProvider';
import { useFormValidation } from '@/ui/hooks/useFormValidation';

type FieldKey = 'password' | 'confirm';

export default function ChangePasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { notify, showLoader, hideLoader } = useAppNotifications();
  const { clearError, getError, require, validate } = useFormValidation<FieldKey>();

  const validatePasswords = () => {
    let valid = true;

    if (!require('password', password, 'Ingresa una contrasena.')) {
      valid = false;
    } else if (
      !validate('password', () => password.length >= 6, 'La contrasena debe tener al menos 6 caracteres.')
    ) {
      valid = false;
    }

    if (!require('confirm', confirmPassword, 'Confirma tu contrasena.')) {
      valid = false;
    } else if (
      !validate('confirm', () => confirmPassword === password, 'Las contrasenas no coinciden.')
    ) {
      valid = false;
    }

    return valid;
  };

  const handleChangePassword = async () => {
    if (!validatePasswords()) {
      return;
    }

    setLoading(true);
    showLoader('Actualizando contrasena...');
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        throw error;
      }

      notify({
        type: 'success',
        title: 'Contrasena actualizada',
        message: 'Tu contrasena fue actualizada correctamente.',
      });
      router.back();
    } catch (error: any) {
      notify({
        type: 'error',
        title: 'No se pudo actualizar',
        message: error?.message ?? 'Intenta nuevamente en unos minutos.',
      });
    } finally {
      hideLoader();
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name='arrow-back' size={24} color='#111827' />
        </TouchableOpacity>
        <Text style={styles.title}>Cambiar contrasena</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Nueva contrasena</Text>
        <TextInput
          style={[styles.input, getError('password') ? styles.inputError : null]}
          secureTextEntry
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            clearError('password');
          }}
          placeholder='Ingresa tu nueva contrasena'
          autoCapitalize='none'
        />
        {getError('password') ? <Text style={styles.errorText}>{getError('password')}</Text> : null}

        <Text style={styles.label}>Confirmar contrasena</Text>
        <TextInput
          style={[styles.input, getError('confirm') ? styles.inputError : null]}
          secureTextEntry
          value={confirmPassword}
          onChangeText={(value) => {
            setConfirmPassword(value);
            clearError('confirm');
          }}
          placeholder='Confirma tu nueva contrasena'
          autoCapitalize='none'
        />
        {getError('confirm') ? <Text style={styles.errorText}>{getError('confirm')}</Text> : null}

        <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleChangePassword} disabled={loading}>
          {loading ? <ActivityIndicator color='#fff' /> : <Text style={styles.buttonText}>Actualizar contrasena</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  form: {
    padding: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    fontSize: 16,
    marginBottom: 8,
  },
  inputError: {
    borderColor: '#f87171',
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 12,
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
