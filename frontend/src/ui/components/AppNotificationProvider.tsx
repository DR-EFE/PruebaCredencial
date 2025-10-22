import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface AppNotificationOptions {
  type: NotificationType;
  title?: string;
  message: string;
  duration?: number;
  actionLabel?: string;
  onAction?: () => void;
}

interface NotificationItem extends AppNotificationOptions {
  id: string;
  expiresAt: number;
}

interface LoaderState {
  visible: boolean;
  message?: string;
}

interface NotificationContextValue {
  notify: (options: AppNotificationOptions) => void;
  dismiss: (id: string) => void;
  showLoader: (message?: string) => void;
  hideLoader: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

const STYLE_MAP: Record<
  NotificationType,
  {
    background: string;
    border: string;
    icon: React.ComponentProps<typeof Ionicons>['name'];
    iconColor: string;
  }
> = {
  info: {
    background: '#eff6ff',
    border: '#bfdbfe',
    icon: 'information-circle',
    iconColor: '#2563eb',
  },
  success: {
    background: '#ecfdf5',
    border: '#bbf7d0',
    icon: 'checkmark-circle',
    iconColor: '#047857',
  },
  warning: {
    background: '#fef3c7',
    border: '#fde68a',
    icon: 'alert-circle',
    iconColor: '#b45309',
  },
  error: {
    background: '#fee2e2',
    border: '#fecaca',
    icon: 'close-circle',
    iconColor: '#b91c1c',
  },
};

export const AppNotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loader, setLoader] = useState<LoaderState>({ visible: false });
  const timeoutsRef = useRef<Record<string, NodeJS.Timeout>>({});

  const scheduleRemoval = useCallback((id: string, duration: number) => {
    if (timeoutsRef.current[id]) {
      clearTimeout(timeoutsRef.current[id]);
    }
    timeoutsRef.current[id] = setTimeout(() => {
      setNotifications((prev) => prev.filter((item) => item.id !== id));
      delete timeoutsRef.current[id];
    }, duration);
  }, []);

  const notify = useCallback(
    (options: AppNotificationOptions) => {
      const duration = options.duration ?? 4500;
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const item: NotificationItem = {
        ...options,
        id,
        expiresAt: Date.now() + duration,
      };
      setNotifications((prev) => [...prev, item]);
      scheduleRemoval(id, duration);
    },
    [scheduleRemoval]
  );

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((item) => item.id !== id));
    if (timeoutsRef.current[id]) {
      clearTimeout(timeoutsRef.current[id]);
      delete timeoutsRef.current[id];
    }
  }, []);

  const showLoader = useCallback((message?: string) => {
    setLoader({ visible: true, message });
  }, []);

  const hideLoader = useCallback(() => {
    setLoader({ visible: false });
  }, []);

  useEffect(
    () => () => {
      Object.values(timeoutsRef.current).forEach((timeoutId) => clearTimeout(timeoutId));
      timeoutsRef.current = {};
    },
    []
  );

  const contextValue = useMemo(
    () => ({
      notify,
      dismiss,
      showLoader,
      hideLoader,
    }),
    [notify, dismiss, showLoader, hideLoader]
  );

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      <View pointerEvents="box-none" style={styles.notificationContainer}>
        {notifications.map((item) => {
          const variant = STYLE_MAP[item.type];
          return (
            <View
              key={item.id}
              style={[
                styles.notification,
                {
                  backgroundColor: variant.background,
                  borderColor: variant.border,
                },
              ]}
            >
              <View style={styles.notificationContent}>
                <Ionicons
                  name={variant.icon}
                  size={20}
                  color={variant.iconColor}
                  style={styles.notificationIcon}
                />
                <View style={styles.notificationTexts}>
                  {item.title ? <Text style={styles.notificationTitle}>{item.title}</Text> : null}
                  <Text style={styles.notificationMessage}>{item.message}</Text>
                </View>
              </View>
              <View style={styles.notificationActions}>
                {item.actionLabel && item.onAction ? (
                  <TouchableOpacity
                    onPress={() => {
                      dismiss(item.id);
                      item.onAction?.();
                    }}
                  >
                    <Text style={styles.notificationActionLabel}>{item.actionLabel}</Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity onPress={() => dismiss(item.id)} style={styles.closeButton}>
                  <Ionicons name="close" size={16} color="#475569" />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </View>

      {loader.visible ? (
        <View style={styles.loaderOverlay} pointerEvents="auto">
          <View style={styles.loaderCard}>
            <ActivityIndicator size="large" color="#fff" />
            {loader.message ? <Text style={styles.loaderMessage}>{loader.message}</Text> : null}
          </View>
        </View>
      ) : null}
    </NotificationContext.Provider>
  );
};

export const useAppNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useAppNotifications must be used within an AppNotificationProvider');
  }
  return context;
};

const styles = StyleSheet.create({
  notificationContainer: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    zIndex: 20,
  },
  notification: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 12,
  },
  notificationIcon: {
    marginRight: 10,
  },
  notificationTexts: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 13,
    color: '#334155',
  },
  notificationActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationActionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563eb',
    marginRight: 12,
  },
  closeButton: {
    padding: 4,
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 30,
  },
  loaderCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderRadius: 18,
    alignItems: 'center',
    minWidth: 180,
  },
  loaderMessage: {
    marginTop: 12,
    fontSize: 14,
    color: '#f8fafc',
    textAlign: 'center',
  },
});

export default AppNotificationProvider;
