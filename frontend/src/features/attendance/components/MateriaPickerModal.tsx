// Importaciones necesarias de React y React Native
import React from 'react';
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// Importación del tipo 'Materia' desde un archivo de tipos.
import { Materia } from '../types';

// Definición de las propiedades (props) que espera el componente MateriaPickerModal.
interface MateriaPickerModalProps {
  visible: boolean; // Controla si el modal es visible o no.
  materias: Materia[]; // Array de objetos 'Materia' para mostrar en la lista.
  selectedMateriaId: number | null; // El ID de la materia actualmente seleccionada.
  onSelect: (materiaId: number) => void; // Función que se llama cuando se selecciona una materia.
  onClose: () => void; // Función que se llama para cerrar el modal.
}

// Definición del componente funcional MateriaPickerModal.
export const MateriaPickerModal = ({
  visible,
  materias,
  selectedMateriaId,
  onSelect,
  onClose,
}: MateriaPickerModalProps) => {
  // Función para renderizar cada elemento de la lista de materias.
  const renderItem = ({ item }: { item: Materia }) => {
    // Comprueba si la materia actual es la que está seleccionada.
    const isActive = item.id === selectedMateriaId;
    // Array para almacenar detalles adicionales de la materia como código y grupo.
    const details: string[] = [];

    // Si la materia tiene un código, lo añade a los detalles.
    if (item.codigo) details.push(item.codigo);
    // Si la materia tiene un grupo, lo añade a los detalles.
    if (item.grupo) details.push(`Grupo ${item.grupo}`);

    // Retorna un elemento 'TouchableOpacity' que funciona como un botón.
    return (
      <TouchableOpacity
        // Aplica estilos base y un estilo adicional si el item está activo.
        style={[styles.item, isActive && styles.itemActive]}
        // Al presionar, llama a la función onSelect con el ID de la materia.
        onPress={() => onSelect(item.id)}
      >
        {/* Muestra el nombre de la materia. */}
        <Text style={[styles.itemText, isActive && styles.itemTextActive]}>{item.nombre}</Text>
        {/* Si hay detalles, los muestra unidos por ' | '. */}
        {details.length > 0 ? <Text style={styles.itemSub}>{details.join(' | ')}</Text> : null}
      </TouchableOpacity>
    );
  };

  // El componente retorna un Modal (una ventana emergente).
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {/* Contenedor oscuro semitransparente que cubre toda la pantalla. */}
      <View style={styles.overlay}>
        {/* Tarjeta principal del modal. */}
        <View style={styles.card}>
          {/* Título del modal. */}
          <Text style={styles.title}>Tus materias</Text>
          {/* Lista de materias. */}
          <FlatList
            data={materias} // Los datos para la lista.
            keyExtractor={(item) => item.id.toString()} // Clave única para cada elemento.
            renderItem={renderItem} // Función para renderizar cada elemento.
            contentContainerStyle={styles.list}
          />
          {/* Botón para cerrar el modal. */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeText}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// Definición de los estilos para el componente usando StyleSheet.
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  list: {
    paddingVertical: 4,
  },
  item: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 8,
  },
  itemActive: {
    borderColor: '#800831',
    backgroundColor: '#800831',
  },
  itemText: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '600',
  },
  itemTextActive: {
    color: '#800831',
  },
  itemSub: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  closeButton: {
    marginTop: 4,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#800831',
    alignItems: 'center',
  },
  closeText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default MateriaPickerModal;

