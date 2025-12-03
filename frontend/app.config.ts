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
  const supabaseUrl = resolveSecret('SUPABASE_URL', appEnv) || (config.extra?.supabaseUrl as string);
  const supabaseAnonKey = resolveSecret('SUPABASE_ANON_KEY', appEnv) || (config.extra?.supabaseAnonKey as string);
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
    
    // ✅ CORRECCIÓN: ProjectId consistente
    extra: {
      appEnv,
      supabaseUrl,
      supabaseAnonKey,
      backendUrl: publicBackendUrl,
      expoRouter: {
        appRoot: 'src/app',
      },
      router: {},
      eas: {
        projectId: "fa4512ec-4554-41ab-a97a-565bfd532a29" // ← ProjectId correcto
      },
    },

    // ✅ CORRECCIÓN: Updates URL con projectId correcto
    updates: {
      url: "https://u.expo.dev/fa4512ec-4554-41ab-a97a-565bfd532a29",
      enabled: true,
      fallbackToCacheTimeout: 0
    },

    // ✅ CORRECCIÓN: Runtime version policy
    runtimeVersion: {
      policy: "appVersion"
    },

    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.efe1212.frontend',
      config: {
        googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
      },
      infoPlist: {
        NSCameraUsageDescription: 'Permite acceso a la cámara para escanear códigos QR de credenciales estudiantiles.',
        NSLocationWhenInUseUsageDescription: 'La app necesita acceso a tu ubicación para funcionalidades de geolocalización.',
      },
    },

    android: {
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        backgroundColor: '#000000', // ✅ 6 caracteres hexadecimal
      },
      edgeToEdgeEnabled: true,
      permissions: [
        'android.permission.CAMERA', 
        'android.permission.RECORD_AUDIO',
        'android.permission.ACCESS_FINE_LOCATION',
        'android.permission.ACCESS_COARSE_LOCATION'
      ],
      package: 'com.efe1212.frontend',
      config: {
        googleMaps: {
          apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
        },
      },
    },

    androidStatusBar: {
      backgroundColor: '#000000', // ✅ 6 caracteres hexadecimal
    },

    // ✅ CORRECCIÓN: Splash screen sin conflicto de colores
    splash: {
      image: './assets/images/splash-image.png',
      resizeMode: 'contain',
      backgroundColor: '#000000', // ✅ Mismo color que status bar para consistencia
    },

    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/images/favicon.png',
    },

    plugins: [
      'expo-router',
      'expo-web-browser', // ✅ Plugin faltante agregado
      [
        'expo-splash-screen',
        {
          image: './assets/images/splash-image.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#000000',
        },
      ],
      [
        'expo-camera',
        {
          cameraPermission: 'Permite acceso a la cámara para escanear códigos QR de credenciales estudiantiles.',
        },
      ],
    ],

    experiments: {
      typedRoutes: true,
    },

    platforms: ['ios', 'android', 'web'],
  };
};