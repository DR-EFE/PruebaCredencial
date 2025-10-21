import { Redirect } from 'expo-router';

export default function TabsIndex() {
  // Redirige a la primera pestaña del layout como pantalla por defecto.
  return <Redirect href="/(tabs)/materias" />;
}
