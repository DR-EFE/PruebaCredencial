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
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '@/core/api/supabaseClient';

type RegisterErrors = {
  nombre?: string;
  apellido?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
};

type StatusMessage =
  | { type: 'error'; message: string }
  | { type: 'success'; message: string }
  | null;

export default function RegisterScreen() {
  const router = useRouter();
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [status, setStatus] = useState<StatusMessage>(null);

  const trimmedNombre = useMemo(() => nombre.trim(), [nombre]);
  const trimmedApellido = useMemo(() => apellido.trim(), [apellido]);
  const trimmedEmail = useMemo(() => email.trim().toLowerCase(), [email]);

  const validateForm = () => {
    const nextErrors: RegisterErrors = {};

    if (!trimmedNombre) {
      nextErrors.nombre = 'Ingresa tu nombre.';
    }
    if (!trimmedApellido) {
      nextErrors.apellido = 'Ingresa tu apellido.';
    }
    if (!trimmedEmail) {
      nextErrors.email = 'Ingresa tu correo institucional.';
    } else if (!/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      nextErrors.email = 'El correo no tiene un formato valido.';
    }
    if (!password) {
      nextErrors.password = 'Ingresa una contrasena.';
    } else if (password.length < 6) {
      nextErrors.password = 'La contrasena debe tener al menos 6 caracteres.';
    }
    if (!confirmPassword) {
      nextErrors.confirmPassword = 'Confirma tu contrasena.';
    } else if (password !== confirmPassword) {
      nextErrors.confirmPassword = 'Las contrasenas no coinciden.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleRegister = async () => {
    setStatus(null);
    if (!validateForm()) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: {
            nombre: trimmedNombre,
            apellido: trimmedApellido,
            tipo: 'profesor',
          },
        },
      });

      if (error) {
        throw error;
      }

      await supabase.auth.signOut();
      setStatus({
        type: 'success',
        message:
          'Enviamos un enlace de verificacion a tu correo institucional. Confirmalo para finalizar el registro.',
      });
    } catch (err: any) {
      setStatus({
        type: 'error',
        message: err?.message ?? 'No se pudo completar el registro. Intenta nuevamente.',
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStatus = () => {
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

  const disableInputs = loading || (status?.type === 'success');

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps='handled'>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton} disabled={loading}>
            <Ionicons name='arrow-back' size={24} color='#2563eb' />
          </TouchableOpacity>
          <View style={styles.iconContainer}>
            <Ionicons name='person-add' size={48} color='#2563eb' />
          </View>
          <Text style={styles.title}>Registro de Profesor</Text>
          <Text style={styles.subtitle}>
            Completa la informacion requerida para crear tu cuenta en el sistema.
          </Text>
        </View>

        <View style={styles.form}>
          {renderStatus()}
          <View style={styles.inputContainer}>
            <Ionicons name='person-outline' size={20} color='#6b7280' style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder='Nombre(s)'
              value={nombre}
              onChangeText={(value) => {
                setNombre(value);
                if (errors.nombre) setErrors((prev) => ({ ...prev, nombre: undefined }));
              }}
              autoCapitalize='words'
              editable={!disableInputs}
              returnKeyType='next'
            />
          </View>
          {errors.nombre ? <Text style={styles.errorText}>{errors.nombre}</Text> : null}

          <View style={styles.inputContainer}>
            <Ionicons name='people-outline' size={20} color='#6b7280' style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder='Apellido(s)'
              value={apellido}
              onChangeText={(value) => {
                setApellido(value);
                if (errors.apellido) setErrors((prev) => ({ ...prev, apellido: undefined }));
              }}
              autoCapitalize='words'
              editable={!disableInputs}
              returnKeyType='next'
            />
          </View>
          {errors.apellido ? <Text style={styles.errorText}>{errors.apellido}</Text> : null}

          <View style={styles.inputContainer}>
            <Ionicons name='mail-outline' size={20} color='#6b7280' style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder='Correo institucional'
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
              }}
              autoCapitalize='none'
              keyboardType='email-address'
              editable={!disableInputs}
              returnKeyType='next'
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
                if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
              }}
              secureTextEntry={!showPassword}
              editable={!disableInputs}
              returnKeyType='next'
            />
            <TouchableOpacity onPress={() => setShowPassword((prev) => !prev)} style={styles.eyeIcon} disabled={disableInputs}>
              <Ionicons
                name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                size={20}
                color='#6b7280'
              />
            </TouchableOpacity>
          </View>
          {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}

          <View style={styles.inputContainer}>
            <Ionicons name='shield-checkmark-outline' size={20} color='#6b7280' style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder='Confirma tu contrasena'
              value={confirmPassword}
              onChangeText={(value) => {
                setConfirmPassword(value);
                if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
              }}
              secureTextEntry={!showConfirmPassword}
              editable={!disableInputs}
            />
            <TouchableOpacity onPress={() => setShowConfirmPassword((prev) => !prev)} style={styles.eyeIcon} disabled={disableInputs}>
              <Ionicons
                name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                size={20}
                color='#6b7280'
              />
            </TouchableOpacity>
          </View>
          {errors.confirmPassword ? <Text style={styles.errorText}>{errors.confirmPassword}</Text> : null}

          <TouchableOpacity
            style={[styles.button, (loading || status?.type === 'success') && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading || status?.type === 'success'}
          >
            {loading ? (
              <ActivityIndicator color='#fff' />
            ) : (
              <Text style={styles.buttonText}>Crear cuenta</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => router.replace('/(auth)/login')}
            disabled={loading}
          >
            <Text style={styles.loginLinkText}>¿Ya tienes una cuenta? Inicia sesion</Text>
          </TouchableOpacity>
        </View>
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
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: 8,
    marginBottom: 12,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  form: {
    marginTop: 8,
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
    minHeight: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    paddingVertical: 12,
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
  loginLink: {
    marginTop: 16,
    alignItems: 'center',
  },
  loginLinkText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '500',
  },
});