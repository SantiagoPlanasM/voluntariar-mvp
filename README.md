# VoluntariAR 🌱

> Red Social Solidaria — Proyecto universitario UCC  
> Conecta voluntarios con proyectos sociales en Córdoba, Argentina

---

## Índice
1. [Descripción](#descripción)
2. [Stack tecnológico](#stack-tecnológico)
3. [Arquitectura](#arquitectura)
4. [Estructura del proyecto](#estructura-del-proyecto)
5. [Correr en local](#correr-en-local)
6. [Deploy en Render](#deploy-en-render)
7. [Variables de entorno](#variables-de-entorno)
8. [Endpoints de la API](#endpoints-de-la-api)
9. [Base de datos](#base-de-datos)

---

## Descripción

VoluntariAR es una plataforma web que permite:

- **Voluntarios**: explorar proyectos sociales, inscribirse y hacer seguimiento de sus participaciones
- **ONGs**: publicar proyectos, gestionar inscripciones y aprobar/rechazar voluntarios
- **Feed público**: cualquier persona puede ver los proyectos sin necesidad de registrarse

### Roles del sistema
| Rol | Acceso |
|-----|--------|
| `volunteer` | Feed, inscripciones, perfil propio |
| `ngo` | Dashboard, crear/editar proyectos, gestionar voluntarios |
| `company` | Registro disponible (funcionalidad futura) |

---

## Stack tecnológico

### Frontend
| Tecnología | Uso |
|------------|-----|
| React 18 | UI |
| React Router 7 | Navegación SPA |
| Vite | Bundler |
| Tailwind CSS 4 | Estilos |
| Lucide React | Íconos |

### Backend
| Tecnología | Uso |
|------------|-----|
| Node.js ≥ 18 | Runtime |
| Express 4 | Framework HTTP |
| JWT (jsonwebtoken) | Autenticación |
| bcryptjs | Hash de contraseñas |
| pg | Cliente PostgreSQL |
| better-sqlite3 | Base de datos local |

### Base de datos
- **Local**: SQLite (archivo `data/voluntariar.sqlite`, generado automáticamente)
- **Producción**: PostgreSQL (Render / Railway / Supabase)

El adaptador en `backend/src/db/index.js` cambia automáticamente según la variable `USE_POSTGRES`.

---

## Arquitectura

```
┌─────────────────────────────────┐
│   Frontend (React SPA)          │
│   React Router + AuthContext    │
│   api.ts → fetch() → JWT        │
└────────────┬────────────────────┘
             │ HTTP / JSON
             ▼
┌─────────────────────────────────┐
│   Backend (Express)             │
│   CORS → JWT Middleware         │
│   /auth /projects /enrollments  │
│   /ngos /notifications          │
│   Validaciones email/pass/datos │
└────────────┬────────────────────┘
             │ SQL
             ▼
┌─────────────────────────────────┐
│   Base de datos                 │
│   SQLite (local)                │
│   PostgreSQL (producción)       │
└─────────────────────────────────┘
```

---

## Estructura del proyecto

```
voluntariar-v2/
├── render.yaml                 ← Config automática para Render
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/     ← Pantallas y componentes UI
│   │   │   └── routes.tsx      ← Definición de rutas
│   │   ├── lib/
│   │   │   ├── api.ts          ← Cliente HTTP centralizado
│   │   │   └── AuthContext.tsx ← Estado global de sesión
│   │   └── styles/             ← CSS global + Tailwind
│   ├── .env.example
│   └── package.json
└── backend/
    ├── src/
    │   ├── db/
    │   │   └── index.js        ← Adaptador SQLite / PostgreSQL
    │   ├── middleware/
    │   │   └── auth.js         ← JWT verify + requireRole
    │   └── routes/
    │       ├── auth.js         ← Registro, login, perfil
    │       ├── projects.js     ← CRUD proyectos + búsqueda
    │       ├── enrollments.js  ← Inscripciones
    │       ├── ngos.js         ← Perfiles ONG + dashboard
    │       └── notifications.js
    ├── scripts/
    │   ├── migrate.js          ← Crea las tablas
    │   └── seed.js             ← Datos de prueba
    ├── .env.example
    └── package.json
```

---

## Correr en local

### Requisitos
- Node.js ≥ 18
- npm

### 1. Clonar el repositorio

```bash
git clone https://github.com/TU_USUARIO/voluntariar.git
cd voluntariar
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env          # No hace falta cambiar nada para local
npm run db:migrate            # Crea las tablas en SQLite
npm run db:seed               # Inserta datos de prueba
npm run dev                   # Levanta en http://localhost:3001
```

### 3. Frontend (nueva terminal)

```bash
cd frontend
npm install
cp .env.example .env          # Apunta a localhost:3001
# Editar VITE_API_URL=http://localhost:3001/api
npm run dev                   # Levanta en http://localhost:5173
```

### Usuarios de prueba

| Rol | Email | Contraseña |
|-----|-------|------------|
| Voluntario | maria@example.com | Password1 |
| ONG | admin@sustentando.org | Password1 |

---

## Deploy en Render

Render lee el archivo `render.yaml` en la raíz del repo y crea los servicios automáticamente.

### Pasos

**1. Subir el proyecto a GitHub**
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/TU_USUARIO/voluntariar.git
git push -u origin main
```

**2. Crear cuenta en [render.com](https://render.com)**

**3. New → Blueprint → conectar el repositorio**

Render detecta el `render.yaml` y crea automáticamente:
- PostgreSQL database (`voluntariar-db`)
- Web Service backend (`voluntariar-api`)
- Static Site frontend (`voluntariar`)

**4. Configurar variables de entorno faltantes**

En el servicio `voluntariar-api` → Environment:

| Variable | Valor |
|----------|-------|
| `JWT_SECRET` | Un string largo y aleatorio (ej: `openssl rand -base64 32` en tu terminal) |
| `CORS_ORIGINS` | URL del frontend que Render asignó, ej: `https://voluntariar.onrender.com` |

En el servicio `voluntariar` (frontend) → Environment:

| Variable | Valor |
|----------|-------|
| `VITE_API_URL` | URL del backend + `/api`, ej: `https://voluntariar-api.onrender.com/api` |

**5. Trigger Manual Deploy** en ambos servicios.

### ⚠️ Importante — Plan gratuito de Render

El plan free tiene una limitación: **los servicios se duermen tras 15 minutos de inactividad**. La primera request después de que se duerme tarda ~30 segundos en responder. Para un proyecto universitario/demo esto es aceptable.

La base de datos PostgreSQL gratuita en Render **expira a los 90 días**. Antes de la demo ejecutá un deploy manual para asegurarte que esté activa.

---

## Variables de entorno

### Backend (`backend/.env`)

| Variable | Local | Producción | Descripción |
|----------|-------|------------|-------------|
| `NODE_ENV` | `development` | `production` | Entorno |
| `PORT` | `3001` | Automático | Puerto del servidor |
| `USE_POSTGRES` | `false` | `true` | Motor de BD |
| `DATABASE_URL` | — | URL de Render | Conexión PostgreSQL |
| `JWT_SECRET` | cualquier string | string seguro largo | Firma de tokens |
| `JWT_EXPIRES_IN` | `7d` | `7d` | Expiración de sesión |
| `CORS_ORIGINS` | `http://localhost:5173` | URL del frontend | Orígenes permitidos |

### Frontend (`frontend/.env`)

| Variable | Local | Producción |
|----------|-------|------------|
| `VITE_API_URL` | `http://localhost:3001/api` | `https://voluntariar-api.onrender.com/api` |

---

## Endpoints de la API

### Autenticación
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `POST` | `/api/auth/register` | ❌ | Registrar usuario |
| `POST` | `/api/auth/login` | ❌ | Login → JWT |
| `GET` | `/api/auth/me` | ✅ | Perfil del usuario |
| `PUT` | `/api/auth/me` | ✅ | Editar perfil |

### Proyectos
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/api/projects` | ❌ | Feed (filtros: category, type, search) |
| `GET` | `/api/projects/:id` | ❌ | Detalle con comentarios y ratings |
| `POST` | `/api/projects` | ✅ ngo | Crear proyecto |
| `PUT` | `/api/projects/:id` | ✅ ngo | Editar proyecto |
| `DELETE` | `/api/projects/:id` | ✅ ngo | Eliminar proyecto |
| `POST` | `/api/projects/:id/comments` | ✅ | Comentar |
| `POST` | `/api/projects/:id/ratings` | ✅ | Calificar (1–5) |

### Inscripciones
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `POST` | `/api/enrollments` | ✅ volunteer | Inscribirse |
| `GET` | `/api/enrollments/my` | ✅ | Mis inscripciones |
| `GET` | `/api/enrollments/project/:id` | ✅ ngo | Voluntarios de un proyecto |
| `PATCH` | `/api/enrollments/:id` | ✅ ngo | Aprobar o rechazar |
| `DELETE` | `/api/enrollments/:id` | ✅ | Cancelar inscripción |

### ONGs
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/api/ngos` | ❌ | Listar ONGs |
| `GET` | `/api/ngos/me` | ✅ ngo | Mi perfil ONG |
| `PUT` | `/api/ngos/me` | ✅ ngo | Editar ONG |
| `GET` | `/api/ngos/:id/dashboard` | ✅ ngo | Stats + pendientes |

### Sistema
| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/health` | Health check (Render lo usa para saber si el servicio está vivo) |

---

## Base de datos

### Tablas principales

```
users          id · name · email · password(hash) · role · avatar
ngos           id · user_id → users · name · category · description
projects       id · ngo_id → ngos · title · type(fugaz/sostenido) · status
enrollments    id · user_id → users · project_id → projects · status(pending/approved/rejected)
comments       id · project_id · user_id · comment
ratings        id · project_id · user_id · rating(1-5)
notifications  id · user_id · type · title · read
```

### Comandos útiles

```bash
npm run db:migrate   # Crear/actualizar tablas
npm run db:seed      # Insertar datos de prueba
npm run db:reset     # Borrar todo y recrear desde cero
```

---

## Validaciones implementadas

- **Email**: formato real (`usuario@dominio.com`), rechaza `a@a`
- **Nombre**: solo letras y espacios, mínimo 2 caracteres
- **Contraseña**: mínimo 8 caracteres, 1 mayúscula, 1 número
- **Ubicación**: obligatoria (acepta "Remoto")
- **Duración / Horas**: obligatorio según tipo de proyecto
- **Voluntarios**: entero positivo obligatorio
- **Comentarios**: blacklist básica de palabras
- Todas las validaciones corren en **frontend y backend**

---

## Licencia

Proyecto académico — Universidad Católica de Córdoba  
