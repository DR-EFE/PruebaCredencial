import React, { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '@/core/api/supabaseClient';
import { Screen } from '@/ui/components/Screen';
import { Text } from '@/ui/components/Text';
import { Input } from '@/ui/components/Input';
import { Button } from '@/ui/components/Button';
import { theme } from '@/ui/theme';

const institutionalDomains = /@(ucb\.edu\.bo|uab\.edu\.bo)$/;

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
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!trimmedEmail) {
      nextErrors.email = 'Ingresa tu correo institucional.';
    } else if (!emailRegex.test(trimmedEmail)) {
      nextErrors.email = 'Ingresa un correo electrónico válido.';
    } else if (!institutionalDomains.test(trimmedEmail)) {
      nextErrors.email = 'El correo debe pertenecer a un dominio institucional valido.';
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
          color={isError ? theme.colors.error : theme.colors.success}
          style={styles.statusIcon}
        />
        <Text
          variant="body"
          style={{ flex: 1, color: isError ? theme.colors.error : theme.colors.success, fontWeight: '600' }}
        >
          {status.message}
        </Text>
      </View>
    );
  };

  const disableInputs = loading || (status?.type === 'success');

  return (
    <Screen style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Button
            title=""
            variant="ghost"
            leftIcon={<Ionicons name="arrow-back" size={24} color={theme.colors.primary} />}
            onPress={() => router.back()}
            disabled={loading}
            style={styles.backButton}
          />
          <View style={styles.iconContainer}>
            <Ionicons name="person-add" size={48} color={theme.colors.text.inverse} />
          </View>
          <Text variant="h2" align="center" style={styles.title}>
            Registro de Profesor
          </Text>
          <Text variant="body" color={theme.colors.text.secondary} align="center">
            Completa la informacion requerida para crear tu cuenta en el sistema.
          </Text>
        </View>

        <View style={styles.form}>
          {renderStatus()}

          <Input
            label="Nombre(s)"
            placeholder="Nombre(s)"
            value={nombre}
            onChangeText={(value) => {
              setNombre(value);
              if (errors.nombre) setErrors((prev) => ({ ...prev, nombre: undefined }));
            }}
            autoCapitalize="words"
            editable={!disableInputs}
            returnKeyType="next"
            leftIcon="person-outline"
            error={errors.nombre}
          />

          <Input
            label="Apellido(s)"
            placeholder="Apellido(s)"
            value={apellido}
            onChangeText={(value) => {
              setApellido(value);
              if (errors.apellido) setErrors((prev) => ({ ...prev, apellido: undefined }));
            }}
            autoCapitalize="words"
            editable={!disableInputs}
            returnKeyType="next"
            leftIcon="people-outline"
            error={errors.apellido}
          />

          <Input
            label="Correo institucional"
            placeholder="Correo institucional"
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
            }}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!disableInputs}
            returnKeyType="next"
            leftIcon="mail-outline"
            error={errors.email}
          />

          <Input
            label="Contrasena"
            placeholder="Contrasena"
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
            }}
            secureTextEntry
            editable={!disableInputs}
            returnKeyType="next"
            leftIcon="lock-closed-outline"
            error={errors.password}
          />

          <Input
            label="Confirma tu contrasena"
            placeholder="Confirma tu contrasena"
            value={confirmPassword}
            onChangeText={(value) => {
              setConfirmPassword(value);
              if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
            }}
            secureTextEntry
            editable={!disableInputs}
            leftIcon="shield-checkmark-outline"
            error={errors.confirmPassword}
          />

          <Button
            title="Crear cuenta"
            onPress={handleRegister}
            loading={loading}
            disabled={loading || status?.type === 'success'}
            style={styles.registerButton}
          />

          <Button
            title="¿Ya tienes una cuenta? Inicia sesion"
            variant="ghost"
            onPress={() => router.replace('/(auth)/login')}
            disabled={loading}
            style={styles.loginLink}
            textStyle={{ fontSize: 14, color: theme.colors.primary }}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 0,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing.l,
    paddingVertical: theme.spacing.xl,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: 0,
    marginBottom: theme.spacing.s,
    height: 40,
    width: 40,
    paddingHorizontal: 0,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.m,
  },
  title: {
    marginBottom: theme.spacing.s,
  },
  form: {
    marginTop: theme.spacing.s,
  },
  statusBanner: {
    borderRadius: theme.spacing.s + 4,
    paddingVertical: theme.spacing.s,
    paddingHorizontal: theme.spacing.m,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.m,
  },
  statusIcon: {
    marginRight: theme.spacing.s,
  },
  statusError: {
    backgroundColor: '#fee2e2',
  },
  statusSuccess: {
    backgroundColor: '#dcfce7',
  },
  registerButton: {
    marginTop: theme.spacing.s,
  },
  loginLink: {
    marginTop: theme.spacing.m,
  },
});
