import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

type FeedbackType = 'info' | 'success' | 'warning' | 'error';

export interface FeedbackBannerProps {
  type: FeedbackType;
  title: string;
  message: string;
}

const STYLE_MAP: Record<
  FeedbackType,
  { container: { backgroundColor: string; borderColor: string }; icon: { name: React.ComponentProps<typeof Ionicons>['name']; color: string } }
> = {
  info: {
    container: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
    icon: { name: 'information-circle', color: '#2563eb' },
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

export const FeedbackBanner = ({ type, title, message }: FeedbackBannerProps) => {
  const variant = STYLE_MAP[type];

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: variant.container.backgroundColor, borderColor: variant.container.borderColor },
      ]}
    >
      <Ionicons name={variant.icon.name} size={20} color={variant.icon.color} style={styles.icon} />
      <View style={styles.texts}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  icon: {
    marginRight: 12,
  },
  texts: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  message: {
    fontSize: 13,
    color: '#4b5563',
  },
});

export default FeedbackBanner;
