```
import React, { useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '@/core/api/supabaseClient';
import { useAppNotifications } from '@/ui/components/AppNotificationProvider';
import { useFormValidation } from '@/ui/hooks/useFormValidation';
import { Screen } from '@/ui/components/Screen';
import { Text } from '@/ui/components/Text';
import { Input } from '@/ui/components/Input';
import { Button } from '@/ui/components/Button';
import { theme } from '@/ui/theme';

type FieldKey = 'email' | 'password' | 'reset';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
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
    <Screen style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name="school" size={64} color={theme.colors.text.inverse} />
        </View>
        <Text variant="h1" align="center" style={styles.title}>
          UPIICSA Asistencia
        </Text>
        <Text variant="body" color={theme.colors.text.secondary} align="center">
          Sistema de Registro Docente
        </Text>
      </View>

      <View style={styles.form}>
        <Input
          label="Correo electronico"
          placeholder="ejemplo@ipn.mx"
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            clearError('email');
            clearError('reset');
          }}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!loading}
          leftIcon="mail-outline"
          error={getError('email')}
        />

        <Input
          label="Contrasena"
          placeholder="********"
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            clearError('password');
          }}
          secureTextEntry
          editable={!loading}
          leftIcon="lock-closed-outline"
          error={getError('password')}
        />

        <Button
          title="Olvidaste tu contrasena?"
          variant="ghost"
          onPress={handleResetPassword}
          disabled={loading}
          style={styles.forgotPassword}
          textStyle={{ fontSize: 14, color: theme.colors.primary }}
        />
        {getError('reset') ? (
          <Text variant="small" color={theme.colors.error} align="right" style={{ marginBottom: 8 }}>
            {getError('reset')}
          </Text>
        ) : null}

        <Button
          title="Iniciar Sesion"
          onPress={handleLogin}
          loading={loading}
          style={styles.loginButton}
        />

        <View style={styles.registerPrompt}>
          <Text variant="body" color={theme.colors.text.secondary}>
            No tienes cuenta?
          </Text>
          <Button
            title="Registrate"
            variant="ghost"
            onPress={() => router.push('/(auth)/register')}
            disabled={loading}
            style={styles.registerButton}
          />
        </View>
      </View>

      <View style={styles.footer}>
        <Text variant="small" color={theme.colors.text.secondary}>
          Instituto Politecnico Nacional
        </Text>
        <Text variant="small" color={theme.colors.text.hint}>
          UPIICSA
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: theme.spacing.l,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xxl,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.m,
  },
  title: {
    marginBottom: theme.spacing.s,
  },
  form: {
    marginBottom: theme.spacing.xl,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    height: 'auto',
    paddingHorizontal: 0,
    marginBottom: theme.spacing.s,
  },
  loginButton: {
    marginTop: theme.spacing.s,
  },
  registerPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.m,
  },
  registerButton: {
    height: 'auto',
    paddingHorizontal: theme.spacing.s,
  },
  footer: {
    alignItems: 'center',
    marginTop: theme.spacing.xl,
  },
});
```
