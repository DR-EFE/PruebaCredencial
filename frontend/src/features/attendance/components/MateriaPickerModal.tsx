import React from 'react';
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Materia } from '../types';

interface MateriaPickerModalProps {
  visible: boolean;
  materias: Materia[];
  selectedMateriaId: number | null;
  onSelect: (materiaId: number) => void;
  onClose: () => void;
}

export const MateriaPickerModal = ({
  visible,
  materias,
  selectedMateriaId,
  onSelect,
  onClose,
}: MateriaPickerModalProps) => {
  const renderItem = ({ item }: { item: Materia }) => {
    const isActive = item.id === selectedMateriaId;
    const details: string[] = [];

    if (item.codigo) details.push(item.codigo);
    if (item.grupo) details.push(`Grupo ${item.grupo}`);

    return (
      <TouchableOpacity
        style={[styles.item, isActive && styles.itemActive]}
        onPress={() => onSelect(item.id)}
      >
        <Text style={[styles.itemText, isActive && styles.itemTextActive]}>{item.nombre}</Text>
        {details.length > 0 ? <Text style={styles.itemSub}>{details.join(' | ')}</Text> : null}
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Tus materias</Text>
          <FlatList
            data={materias}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
          />
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeText}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

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
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  itemText: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '600',
  },
  itemTextActive: {
    color: '#1d4ed8',
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
    backgroundColor: '#2563eb',
    alignItems: 'center',
  },
  closeText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default MateriaPickerModal;
