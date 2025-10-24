import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '@/core/api/supabaseClient';
import { useAppNotifications } from '@/ui/components/AppNotificationProvider';
import { useFormValidation } from '@/ui/hooks/useFormValidation';

type FieldKey = 'email' | 'password' | 'reset';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { clearError, require, validate, getError } = useFormValidation<FieldKey>();
  const { notify, showLoader, hideLoader } = useAppNotifications();
  const router = useRouter();

  const trimmedEmail = useMemo(() => email.trim().toLowerCase(), [email]);

  const validateFields = () => {
    let valid = true;

    if (!require('email', trimmedEmail, 'Ingresa tu correo institucional.')) {
      valid = false;
    } else if (
      !validate('email', () => /^\S+@\S+\.\S+$/.test(trimmedEmail), 'Verifica el formato del correo.')
    ) {
      valid = false;
    }

    if (!require('password', password, 'Ingresa tu contrasena.')) {
      valid = false;
    }

    return valid;
  };

  const handleLogin = async () => {
    if (!validateFields()) return;

    setLoading(true);
    showLoader('Iniciando sesion...');
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (error) {
        throw error;
      }

      router.replace('/(tabs)');
    } catch (err: any) {
      notify({
        type: 'error',
        title: 'No se pudo iniciar sesion',
        message: err?.message ?? 'Intenta nuevamente en unos segundos.',
      });
    } finally {
      hideLoader();
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    clearError('reset');

    if (!require('reset', trimmedEmail, 'Ingresa tu correo para enviar el enlace.')) {
      return;
    }

    if (!validate('reset', () => /^\S+@\S+\.\S+$/.test(trimmedEmail), 'El correo no tiene un formato valido.')) {
      return;
    }

    setLoading(true);
    showLoader('Enviando enlace...');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail);
      if (error) throw error;

      notify({
        type: 'success',
        title: 'Enlace enviado',
        message: 'Revisa tu correo para restablecer tu contrasena.',
      });
    } catch (err: any) {
      notify({
        type: 'error',
        title: 'No pudimos enviar el enlace',
        message: err?.message ?? 'Intenta nuevamente en unos minutos.',
      });
    } finally {
      hideLoader();
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name='school' size={64} color='#2563eb' />
          </View>
          <Text style={styles.title}>UPIICSA Asistencia</Text>
          <Text style={styles.subtitle}>Sistema de Registro Docente</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Ionicons name='mail-outline' size={20} color='#6b7280' style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder='Correo electronico'
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                clearError('email');
                clearError('reset');
              }}
              autoCapitalize='none'
              keyboardType='email-address'
              editable={!loading}
            />
          </View>
          {getError('email') ? <Text style={styles.errorText}>{getError('email')}</Text> : null}

          <View style={styles.inputContainer}>
            <Ionicons name='lock-closed-outline' size={20} color='#6b7280' style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder='Contrasena'
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                clearError('password');
              }}
              secureTextEntry={!showPassword}
              editable={!loading}
            />
            <TouchableOpacity onPress={() => setShowPassword((prev) => !prev)} style={styles.eyeIcon}>
              <Ionicons
                name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                size={20}
                color='#6b7280'
              />
            </TouchableOpacity>
          </View>
          {getError('password') ? <Text style={styles.errorText}>{getError('password')}</Text> : null}

          <TouchableOpacity style={styles.forgotPassword} onPress={handleResetPassword} disabled={loading}>
            <Text style={styles.forgotPasswordText}>Olvidaste tu contrasena?</Text>
          </TouchableOpacity>
          {getError('reset') ? <Text style={styles.errorText}>{getError('reset')}</Text> : null}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color='#fff' />
            ) : (
              <Text style={styles.buttonText}>Iniciar Sesion</Text>
            )}
          </TouchableOpacity>

          <View style={styles.registerPrompt}>
            <Text style={styles.registerText}>No tienes cuenta?</Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')} disabled={loading}>
              <Text style={styles.registerLink}>Registrate</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Instituto Politecnico Nacional</Text>
          <Text style={styles.footerSubtext}>UPIICSA</Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  form: {
    marginBottom: 32,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  eyeIcon: {
    padding: 8,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 12,
    marginTop: -8,
    marginBottom: 12,
    marginLeft: 4,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 12,
  },
  forgotPasswordText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  registerPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  registerText: {
    color: '#6b7280',
    marginRight: 6,
    fontSize: 14,
  },
  registerLink: {
    color: '#2563eb',
    fontWeight: '600',
    fontSize: 14,
  },
  footer: {
    alignItems: 'center',
    marginTop: 32,
  },
  footerText: {
    color: '#6b7280',
    fontSize: 12,
    marginBottom: 4,
  },
  footerSubtext: {
    color: '#9ca3af',
    fontSize: 12,
  },
});
