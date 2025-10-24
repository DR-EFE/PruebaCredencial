import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';

import { AttendanceEntry } from '../types';

interface RecentAttendanceListProps {
  items: AttendanceEntry[];
  emptyMessage?: string;
}

const CARD_MIN_HEIGHT = 120;
const CARD_SPACING = 12;

const renderItem = ({ item }: { item: AttendanceEntry }) => {
  const isLate = item.estado === 'tardanza';
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Ionicons
          name={isLate ? 'time' : 'checkmark-circle'}
          size={20}
          color={isLate ? '#f59e0b' : '#16a34a'}
          style={styles.icon}
        />
        <View style={styles.studentInfo}>
          <Text style={styles.name}>{item.nombreCompleto}</Text>
          <Text style={styles.boleta}>{item.boleta}</Text>
        </View>
        <View
          style={[
            styles.badge,
            isLate ? styles.badgeLate : styles.badgePresent,
          ]}
        >
          <Text style={styles.badgeText}>{isLate ? 'Tarde' : 'Presente'}</Text>
        </View>
      </View>
      <View style={styles.meta}>
        <Text style={styles.metaText}>{format(new Date(item.timestamp), 'HH:mm:ss')}</Text>
        {isLate ? <Text style={styles.metaText}>+{item.minutosTardanza} min</Text> : null}
      </View>
      {item.resumen ? <Text style={styles.update}>{item.resumen}</Text> : null}
    </View>
  );
};

export const RecentAttendanceList = ({
  items,
  emptyMessage = 'Aún no hay asistencias registradas en esta sesión.',
}: RecentAttendanceListProps) => {
  if (items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      style={styles.list}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator
    />
  );
};

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 12,
  },
  emptyContainer: {
    paddingVertical: 16,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#6b7280',
  },
  card: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 14,
    marginBottom: CARD_SPACING,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    minHeight: CARD_MIN_HEIGHT,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  icon: {
    marginRight: 12,
  },
  studentInfo: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  boleta: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgePresent: {
    backgroundColor: '#dcfce7',
  },
  badgeLate: {
    backgroundColor: '#fef3c7',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaText: {
    fontSize: 12,
    color: '#64748b',
  },
  update: {
    fontSize: 12,
    color: '#1d4ed8',
    marginTop: 4,
  },
});

export default RecentAttendanceList;

