import 'dotenv/config';
import type { ConfigContext, ExpoConfig } from 'expo/config';

type AppEnv = 'dev' | 'stg' | 'prod';

const getAppEnv = (): AppEnv => {
  const value = (process.env.APP_ENV as AppEnv) ?? 'dev';
  if (value === 'dev' || value === 'stg' || value === 'prod') {
    return value;
  }
  return 'dev';
};

const resolveSecret = (key: string, env: AppEnv): string => {
  const namespacedKey = `${key}_${env.toUpperCase()}`;
  return process.env[namespacedKey] ?? process.env[key] ?? '';
};

export default ({ config }: ConfigContext): ExpoConfig => {
  const appEnv = getAppEnv();
  const supabaseUrl = resolveSecret('SUPABASE_URL', appEnv);
  const supabaseAnonKey = resolveSecret('SUPABASE_ANON_KEY', appEnv);
  const publicBackendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;

  return {
    ...config,
    name: 'frontend',
    slug: 'frontend',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'frontend',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        backgroundColor: '#000',
      },
      edgeToEdgeEnabled: true,
      permissions: ['android.permission.CAMERA', 'android.permission.RECORD_AUDIO'],
      package: 'com.efe1212.frontend',
    },
    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      [
        'expo-splash-screen',
        {
          image: './assets/images/splash-image.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#000',
        },
      ],
      [
        'expo-camera',
        {
          cameraPermission:
            'Permite acceso a la cámara para escanear códigos QR de credenciales estudiantiles.',
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      appEnv,
      supabaseUrl,
      supabaseAnonKey,
      backendUrl: publicBackendUrl,
      expoRouter: {
        appRoot: 'src/app',
      },
    },
  };
};
