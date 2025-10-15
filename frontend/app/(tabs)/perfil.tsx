import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { useSesionStore } from '@/store/useSesionStore';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function PerfilScreen() {
  const profesor = useAuthStore((state) => state.profesor);
  const { logout } = useAuthStore();
  const { setSesionActiva } = useSesionStore();
  const router = useRouter();

  const handleLogout = async () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro que deseas cerrar sesión?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Cerrar Sesión',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase.auth.signOut();
              logout();
              setSesionActiva(null);
              router.replace('/(auth)/login');
            } catch (error) {
              console.error(error);
              Alert.alert('Error', 'No se pudo cerrar sesión');
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header con información del profesor */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Ionicons name="person" size={48} color="#2563eb" />
        </View>
        <Text style={styles.name}>
          {profesor?.nombre} {profesor?.apellido}
        </Text>
        <Text style={styles.role}>Docente UPIICSA</Text>
      </View>

      {/* Opciones */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Configuración</Text>

        <TouchableOpacity style={styles.option}>
          <View style={styles.optionIcon}>
            <Ionicons name="person-outline" size={24} color="#6b7280" />
          </View>
          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>Editar Perfil</Text>
            <Text style={styles.optionSubtitle}>Actualiza tu información personal</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.option}>
          <View style={styles.optionIcon}>
            <Ionicons name="notifications-outline" size={24} color="#6b7280" />
          </View>
          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>Notificaciones</Text>
            <Text style={styles.optionSubtitle}>Configura alertas y recordatorios</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.option}>
          <View style={styles.optionIcon}>
            <Ionicons name="shield-checkmark-outline" size={24} color="#6b7280" />
          </View>
          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>Privacidad y Seguridad</Text>
            <Text style={styles.optionSubtitle}>Administra tu privacidad</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </TouchableOpacity>
      </View>

      {/* Información */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Información</Text>

        <TouchableOpacity style={styles.option}>
          <View style={styles.optionIcon}>
            <Ionicons name="help-circle-outline" size={24} color="#6b7280" />
          </View>
          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>Ayuda y Soporte</Text>
            <Text style={styles.optionSubtitle}>Obtén ayuda y reporta problemas</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.option}>
          <View style={styles.optionIcon}>
            <Ionicons name="information-circle-outline" size={24} color="#6b7280" />
          </View>
          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>Acerca de</Text>
            <Text style={styles.optionSubtitle}>Versión 1.0.0</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </TouchableOpacity>
      </View>

      {/* Botón de cerrar sesión */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#ef4444" />
        <Text style={styles.logoutText}>Cerrar Sesión</Text>
      </TouchableOpacity>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Instituto Politécnico Nacional</Text>
        <Text style={styles.footerSubtext}>UPIICSA - Sistema de Asistencia</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingVertical: 32,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  avatarContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  role: {
    fontSize: 16,
    color: '#6b7280',
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#f9fafb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fee2e2',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
    marginLeft: 8,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
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
