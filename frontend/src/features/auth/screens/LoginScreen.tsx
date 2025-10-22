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

type FieldErrors = {
  email?: string;
  password?: string;
  reset?: string;
};

type StatusMessage =
  | { type: 'error'; message: string }
  | { type: 'success'; message: string }
  | null;

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<StatusMessage>(null);
  const router = useRouter();

  const trimmedEmail = useMemo(() => email.trim().toLowerCase(), [email]);

  const validateFields = () => {
    const nextErrors: FieldErrors = {};
    if (!trimmedEmail) {
      nextErrors.email = 'Ingresa tu correo institucional.';
    } else if (!/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      nextErrors.email = 'Verifica el formato del correo.';
    }
    if (!password) {
      nextErrors.password = 'Ingresa tu contrasena.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleLogin = async () => {
    setStatus(null);
    if (!validateFields()) return;

    setLoading(true);
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
      setStatus({
        type: 'error',
        message: err?.message ?? 'No se pudo iniciar sesion. Intenta nuevamente.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setStatus(null);
    setErrors((prev) => ({ ...prev, reset: undefined }));

    if (!trimmedEmail) {
      setErrors((prev) => ({ ...prev, reset: 'Ingresa tu correo para enviar el enlace.' }));
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      setErrors((prev) => ({ ...prev, reset: 'El correo no tiene un formato valido.' }));
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail);
      if (error) throw error;

      setStatus({
        type: 'success',
        message: 'Enviamos un correo con el enlace para restablecer tu contrasena.',
      });
    } catch (err: any) {
      setStatus({
        type: 'error',
        message: err?.message ?? 'No se pudo enviar el enlace de recuperacion.',
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStatusMessage = () => {
    if (!status) return null;
    const isError = status.type === 'error';
    return (
      <View style={[styles.statusBanner, isError ? styles.statusError : styles.statusSuccess]}>
        <Ionicons
          name={isError ? 'alert-circle' : 'checkmark-circle'}
          size={18}
          color={isError ? '#b91c1c' : '#047857'}
          style={styles.statusIcon}
        />
        <Text style={[styles.statusText, isError ? styles.statusTextError : styles.statusTextSuccess]}>
          {status.message}
        </Text>
      </View>
    );
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
          {renderStatusMessage()}
          <View style={styles.inputContainer}>
            <Ionicons name='mail-outline' size={20} color='#6b7280' style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder='Correo electronico'
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                if (errors.email) {
                  setErrors((prev) => ({ ...prev, email: undefined }));
                }
              }}
              autoCapitalize='none'
              keyboardType='email-address'
              editable={!loading}
            />
          </View>
          {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}

          <View style={styles.inputContainer}>
            <Ionicons name='lock-closed-outline' size={20} color='#6b7280' style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder='Contrasena'
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                if (errors.password) {
                  setErrors((prev) => ({ ...prev, password: undefined }));
                }
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
          {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}

          <TouchableOpacity style={styles.forgotPassword} onPress={handleResetPassword} disabled={loading}>
            <Text style={styles.forgotPasswordText}>¿Olvidaste tu contrasena?</Text>
          </TouchableOpacity>
          {errors.reset ? <Text style={styles.errorText}>{errors.reset}</Text> : null}

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
            <Text style={styles.registerText}>¿No tienes cuenta?</Text>
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
  statusBanner: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusIcon: {
    marginRight: 10,
  },
  statusText: {
    fontSize: 14,
    flex: 1,
  },
  statusError: {
    backgroundColor: '#fee2e2',
  },
  statusSuccess: {
    backgroundColor: '#dcfce7',
  },
  statusTextError: {
    color: '#b91c1c',
    fontWeight: '600',
  },
  statusTextSuccess: {
    color: '#047857',
    fontWeight: '600',
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
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600',
  },
  footerSubtext: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
});