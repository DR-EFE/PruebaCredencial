import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { FeedbackType, ScanFeedback } from '../types';

interface ScannerStatusProps {
  status: ScanFeedback;
  processing: boolean;
}

const STATUS_STYLES: Record<
  FeedbackType,
  { container: { backgroundColor: string; borderColor: string }; icon: { name: React.ComponentProps<typeof Ionicons>['name']; color: string } }
> = {
  info: {
    container: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
    icon: { name: 'scan', color: '#2563eb' },
  },
  success: {
    container: { backgroundColor: '#ecfdf5', borderColor: '#bbf7d0' },
    icon: { name: 'checkmark-circle', color: '#047857' },
  },
  warning: {
    container: { backgroundColor: '#fef3c7', borderColor: '#fde68a' },
    icon: { name: 'alert-circle', color: '#b45309' },
  },
  error: {
    container: { backgroundColor: '#fee2e2', borderColor: '#fecaca' },
    icon: { name: 'close-circle', color: '#b91c1c' },
  },
};

export const ScannerStatus = ({ status, processing }: ScannerStatusProps) => {
  const variant = STATUS_STYLES[status.type];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: variant.container.backgroundColor,
          borderColor: variant.container.borderColor,
        },
      ]}
    >
      {processing && status.type === 'info' ? (
        <ActivityIndicator
          size="small"
          color={variant.icon.color}
          style={styles.icon}
        />
      ) : (
        <Ionicons
          name={variant.icon.name}
          size={22}
          color={variant.icon.color}
          style={styles.icon}
        />
      )}
      <View style={styles.texts}>
        <Text style={styles.title}>{status.title}</Text>
        <Text style={styles.subtitle}>{status.message}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  icon: {
    marginRight: 12,
  },
  texts: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#475569',
  },
});

export default ScannerStatus;
