# App de Asistencia UPIICSA

## Descripción
Aplicación móvil en React Native con Expo para el registro de asistencia mediante códigos QR en la UPIICSA (IPN).

## Stack Tecnológico
- **Frontend**: React Native + Expo Router
- **Backend**: Supabase (PostgreSQL)
- **Autenticación**: Supabase Auth
- **Scanner QR**: expo-camera
- **Estado**: Zustand
- **Navegación**: React Navigation (Bottom Tabs)

## Credenciales de Supabase
- **URL**: https://jeffzletkqeyxfxcahqs.supabase.co
- **Anon Key**: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImplZmZ6bGV0a3FleXhmeGNhaHFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3MTMzNTAsImV4cCI6MjA3MzI4OTM1MH0.BkxOb4eC91lTx-xniRYcSSGJI8nl7O4VYqIyopKtGKs

## Estructura de la Aplicación

### Pantallas Principales
1. **Login** (`app/(auth)/login.tsx`)
   - Autenticación de profesores con email/contraseña
   - Validación de permisos de profesor
   
2. **Mis Materias** (`app/(tabs)/materias.tsx`)
   - Lista de materias del profesor
   - Botón para iniciar sesión de clase
   - Información de horarios y grupos

3. **Escanear QR** (`app/(tabs)/escanear.tsx`)
   - Escaneo de códigos QR de credenciales
   - Validación de estudiantes inscritos
   - Registro automático de asistencia
   - Cálculo de tardanzas

4. **Reportes** (`app/(tabs)/reportes.tsx`)
   - Estadísticas por materia
   - Historial de sesiones
   - Porcentajes de asistencia

5. **Perfil** (`app/(tabs)/perfil.tsx`)
   - Información del profesor
   - Configuraciones
   - Cerrar sesión

### Flujo de Trabajo
1. Profesor inicia sesión
2. Selecciona materia e inicia sesión
3. Escanea QR de credenciales de estudiantes
4. Sistema valida:
   - Estudiante existe
   - Está inscrito en la materia
   - No tiene asistencia registrada para esa sesión
5. Registra asistencia (presente/tardanza)
6. Profesor puede ver reportes

### Lógica de Tardanzas
- **Presente**: Escaneo dentro de los primeros 10 minutos
- **Tardanza**: Escaneo después de 10 minutos de iniciada la clase

## Archivos Clave

### Configuración
- `app.json`: Configuración de Expo y credenciales
- `.env`: Variables de entorno
- `app/lib/supabase.ts`: Cliente de Supabase

### Estado Global
- `app/store/useAuthStore.ts`: Estado de autenticación
- `app/store/useSesionStore.ts`: Estado de sesión activa

### Contexto
- `app/contexts/AuthContext.tsx`: Proveedor de autenticación

## Base de Datos

### Tablas Principales
1. **profesores**: Información de docentes
2. **estudiantes**: Datos de alumnos
3. **materias**: Asignaturas y horarios
4. **inscripciones**: Relación estudiante-materia
5. **sesiones**: Clases impartidas
6. **asistencias**: Registro de asistencias

## Comandos

### Instalación
```bash
cd /app/frontend
yarn install
```

### Desarrollo
```bash
yarn start
```

### Limpiar caché
```bash
rm -rf .expo .metro-cache node_modules/.cache
```

## Consideraciones de Seguridad
- RLS (Row Level Security) en Supabase
- Cada profesor solo ve sus materias
- Validación de permisos en backend
- No se almacenan datos biométricos

## Próximas Mejoras
- [ ] Modo offline con sincronización
- [ ] Notificaciones push
- [ ] Reportes en PDF
- [ ] Dashboard de estadísticas
- [ ] Justificación de faltas
- [ ] Edición manual de asistencias

##  Formatos de QR Esperados
El QR de la credencial debe contener la boleta del estudiante (10 dígitos).
Ejemplo: `2023123456`
