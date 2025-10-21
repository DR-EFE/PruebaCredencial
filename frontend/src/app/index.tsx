import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/core/auth/AuthProvider';
import { useAuthStore } from '@/core/auth/useAuthStore';

export default function Index() {
  const router = useRouter();
  const { session, loading } = useAuth();
  const profesor = useAuthStore((state) => state.profesor);

  useEffect(() => {
    if (!loading) {
      if (session && profesor) {
        router.replace('/(tabs)');
      } else {
        router.replace('/(auth)/login');
      }
    }
  }, [loading, session, profesor, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#2563eb" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
