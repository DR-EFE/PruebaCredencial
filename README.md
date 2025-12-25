# PruebaCredencial

![License](https://img.shields.io/badge/license-MIT-blue.svg)

## 📖 Descripción del proyecto

**PruebaCredencial** es una aplicación completa diseñada para gestionar credenciales de usuarios, autenticación y registro, con un enfoque en una experiencia de usuario moderna y segura. El proyecto combina un frontend desarrollado con **React Native / Expo** y un backend basado en **Node.js** (o la arquitectura que corresponda). Incluye funcionalidades como registro, inicio de sesión, autenticación biométrica, gestión de perfiles y un panel de administración.

---

## ✨ Características principales

- **Registro y login** con validación de formularios y feedback visual.
- **Autenticación biométrica** (Face ID / Touch ID) para dispositivos iOS y Android.
- **Gestión de perfil**: edición de datos, cambio de contraseña y foto de perfil.
- **Panel de administración** con tabla de usuarios, paginación y filtros avanzados.
- **Experiencia responsiva**: diseño adaptado a móviles y escritorio con animaciones sutiles y micro‑interacciones.
- **Internacionalización**: soporte en español e inglés.
- **Testing**: pruebas unitarias y de integración con Jest y React Testing Library.
- **CI/CD**: flujo de trabajo configurado con GitHub Actions para lint, test y despliegue.

---

## 🛠️ Stack tecnológico

| Área              | Tecnologías                                                                        |
| ----------------- | ---------------------------------------------------------------------------------- |
| **Frontend**      | React Native, Expo, TypeScript, Vite (para web), TailwindCSS (solo si se solicita) |
| **Backend**       | Node.js, Express, TypeScript, MongoDB (o Firestore)                                |
| **Autenticación** | Supabase Auth, BiometricService custom                                             |
| **Estado**        | Redux Toolkit, React Context                                                       |
| **Pruebas**       | Jest, React Testing Library                                                        |
| **CI/CD**         | GitHub Actions                                                                     |
| **Despliegue**    | Vercel / Netlify (frontend), Railway / Render (backend)                            |

---

## 📦 Instalación y ejecución local

### Prerrequisitos

- **Node.js** (versión 18 o superior)
- **Yarn** o **npm**
- **Expo CLI** (`npm install -g expo-cli`)
- **Git**

### Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/PruebaCredencial.git
cd PruebaCredencial
```

### Instalar dependencias

```bash
# Instalar dependencias del frontend
cd frontend
npm install   # o yarn install

# Instalar dependencias del backend (si existe)
cd ../backend
npm install   # o yarn install
```

### Configurar variables de entorno

Crea un archivo `.env` en la raíz del proyecto (o en `frontend`/`backend` según corresponda) con las siguientes claves:

```env
# Supabase credentials
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Secretos del backend (si utilizas backend propio)
JWT_SECRET=your_jwt_secret
DB_URI=mongodb://localhost:27017/prueba_credencial
```

> **Nota:** Los valores `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY` se obtienen del proyecto Supabase que crees en https://app.supabase.com.

### Ejecutar la aplicación en modo desarrollo

#### Frontend (Expo)

```bash
cd frontend
expo start
```

Escanea el QR con la app Expo Go o presiona `w` para abrir en el navegador.

#### Backend (Node/Express)

```bash
cd backend
npm run dev   # o yarn dev
```

La API estará disponible en `http://localhost:3000`.

---

## 📁 Estructura del proyecto

```text
PruebaCredencial/
├─ backend/                # API REST (Node/Express)
│   ├─ src/
│   │   ├─ controllers/
│   │   ├─ models/
│   │   ├─ routes/
│   │   └─ services/
│   └─ tests/
├─ frontend/               # Aplicación móvil/web con Expo
│   ├─ src/
│   │   ├─ assets/          # Imágenes, fuentes, íconos
│   │   ├─ components/      # Componentes UI reutilizables
│   │   ├─ features/        # Módulos de dominio (auth, profile, admin)
│   │   ├─ navigation/      # Stack y tab navigators
│   │   ├─ hooks/           # Custom hooks
│   │   ├─ services/        # Llamadas a la API, Supabase utils
│   │   └─ utils/           # Helpers y constantes
│   ├─ App.tsx
│   └─ app.json
├─ .github/                # Workflows CI/CD
├─ .gitignore
├─ README.md               # Este archivo
└─ package.json            # Scripts comunes (lint, format)
```

---

## ✅ Testing

El proyecto incluye pruebas unitarias y de integración.

```bash
# Ejecutar pruebas del frontend
cd frontend
npm test

# Ejecutar pruebas del backend
cd ../backend
npm test
```

Para generar un reporte de cobertura:

```bash
npm run test:coverage
```

---

## 🤝 Contribuir

1. Haz fork del repositorio.
2. Crea una rama para tu feature: `git checkout -b feature/nueva-funcionalidad`.
3. Realiza tus cambios y escribe pruebas.
4. Commit con mensajes claros siguiendo Conventional Commits.
5. Push y abre un Pull Request.

Asegúrate de que los tests pasen y el linter no reporte errores.

---

## 📄 Licencia

Este proyecto está bajo la licencia MIT. Consulta el archivo `LICENSE` para más detalles.

---

## 📞 Contacto

- **Autor**: Tu Nombre
- **Email**: tu.email@example.com
- **Twitter**: [@tu_usuario](https://twitter.com/tu_usuario)

¡Gracias por visitar PruebaCredencial! 🎉

![License](https://img.shields.io/badge/license-MIT-blue.svg)

## 📖 Descripción del proyecto

**PruebaCredencial** es una aplicación completa diseñada para gestionar credenciales de usuarios, autenticación y registro, con un enfoque en una experiencia de usuario moderna y segura. El proyecto combina un frontend desarrollado con **React Native / Expo** y un backend basado en **Node.js** (o la arquitectura que corresponda). Incluye funcionalidades como registro, inicio de sesión, autenticación biométrica, gestión de perfiles y un panel de administración.

---

## ✨ Características principales

- **Registro y login** con validación de formularios y feedback visual.
- **Autenticación biométrica** (Face ID / Touch ID) para dispositivos iOS y Android.
- **Gestión de perfil**: edición de datos, cambio de contraseña y foto de perfil.
- **Panel de administración** con tabla de usuarios, paginación y filtros avanzados.
- **Experiencia responsiva**: diseño adaptado a móviles y escritorio con animaciones sutiles y micro‑interacciones.
- **Internacionalización**: soporte en español e inglés.
- **Testing**: pruebas unitarias y de integración con Jest y React Testing Library.
- **CI/CD**: flujo de trabajo configurado con GitHub Actions para lint, test y despliegue.

---

## 🛠️ Stack tecnológico

| Área              | Tecnologías                                                                        |
| ----------------- | ---------------------------------------------------------------------------------- |
| **Frontend**      | React Native, Expo, TypeScript, Vite (para web), TailwindCSS (solo si se solicita) |
| **Backend**       | Node.js, Express, TypeScript, MongoDB (o Firestore)                                |
| **Autenticación** | Firebase Auth, BiometricService custom                                             |
| **Estado**        | Redux Toolkit, React Context                                                       |
| **Pruebas**       | Jest, React Testing Library                                                        |
| **CI/CD**         | GitHub Actions                                                                     |
| **Despliegue**    | Vercel / Netlify (frontend), Railway / Render (backend)                            |

---

## 📦 Instalación y ejecución local

### Prerrequisitos

- **Node.js** (versión 18 o superior)
- **Yarn** o **npm**
- **Expo CLI** (`npm install -g expo-cli`)
- **Git**

### Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/PruebaCredencial.git
cd PruebaCredencial
```

### Instalar dependencias

```bash
# Instalar dependencias del frontend
cd frontend
npm install   # o yarn install

# Instalar dependencias del backend (si existe)
cd ../backend
npm install   # o yarn install
```

### Configurar variables de entorno

Crea un archivo `.env` en la raíz del proyecto (o en `frontend`/`backend` según corresponda) con las siguientes claves:

```env
# Ejemplo para Firebase
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id

# Secretos del backend
JWT_SECRET=your_jwt_secret
DB_URI=mongodb://localhost:27017/prueba_credencial
```

### Ejecutar la aplicación en modo desarrollo

#### Frontend (Expo)

```bash
cd frontend
expo start
```

Escanea el QR con la app Expo Go o presiona `w` para abrir en el navegador.

#### Backend (Node/Express)

```bash
cd backend
npm run dev   # o yarn dev
```

La API estará disponible en `http://localhost:3000`.

---

## 📁 Estructura del proyecto

```
PruebaCredencial/
├─ backend/                # API REST (Node/Express)
│   ├─ src/
│   │   ├─ controllers/
│   │   ├─ models/
│   │   ├─ routes/
│   │   └─ services/
│   └─ tests/
├─ frontend/               # Aplicación móvil/web con Expo
│   ├─ src/
│   │   ├─ assets/          # Imágenes, fuentes, íconos
│   │   ├─ components/      # Componentes UI reutilizables
│   │   ├─ features/        # Módulos de dominio (auth, profile, admin)
│   │   ├─ navigation/      # Stack y tab navigators
│   │   ├─ hooks/           # Custom hooks
│   │   ├─ services/        # Llamadas a la API, Firebase utils
│   │   └─ utils/           # Helpers y constantes
│   ├─ App.tsx
│   └─ app.json
├─ .github/                # Workflows CI/CD
├─ .gitignore
├─ README.md               # ¡Este archivo!
└─ package.json            # Scripts comunes (lint, format)
```

---

## ✅ Testing

El proyecto incluye pruebas unitarias y de integración.

```bash
# Ejecutar pruebas del frontend
cd frontend
npm test

# Ejecutar pruebas del backend
cd ../backend
npm test
```

Para generar un reporte de cobertura:

```bash
npm run test:coverage
```

---

## 🤝 Contribuir

1. Haz fork del repositorio.
2. Crea una rama para tu feature: `git checkout -b feature/nueva-funcionalidad`.
3. Realiza tus cambios y escribe pruebas.
4. Commit con mensajes claros siguiendo Conventional Commits.
5. Push y abre un Pull Request.

Asegúrate de que los tests pasen y el linter no reporte errores.

---

## 📄 Licencia

Este proyecto está bajo la licencia MIT. Consulta el archivo `LICENSE` para más detalles.

---

## 📞 Contacto

- **Autor**: Tu Nombre
- **Email**: tu.email@example.com
- **Twitter**: [@tu_usuario](https://twitter.com/tu_usuario)

¡Gracias por visitar PruebaCredencial! 🎉
