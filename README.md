# Frontend IINSAD

Interfaz web del **Sistema de Gestión y Seguimiento de Proyectos de Investigación** del Instituto de Investigación en Salud y Desarrollo (IINSAD), Universidad Mayor de San Andrés (UMSA).

Está construida con **React 19 + TypeScript + Vite** y consume la API REST del backend Django (repositorio `backend_iinsad`). Este repositorio contiene **solo el frontend**.

## Contenido

1. [Estado actual](#estado-actual)
2. [Requisitos](#requisitos)
3. [Puesta en marcha](#puesta-en-marcha)
4. [Variables de entorno](#variables-de-entorno)
5. [Estructura de archivos](#estructura-de-archivos)
6. [Cómo funciona](#cómo-funciona)
7. [Roles y menú](#roles-y-menú)
8. [Endpoints que usa el frontend](#endpoints-que-usa-el-frontend)
9. [Scripts disponibles](#scripts-disponibles)
10. [Seguridad y límites](#seguridad-y-límites)
11. [Despliegue](#despliegue)
12. [Flujo de trabajo con Git](#flujo-de-trabajo-con-git)
13. [Trabajo en equipo](#trabajo-en-equipo)

## Estado actual

| Funcionalidad | Estado |
|---|---|
| Inicio y cierre de sesión contra Django (JWT) | Funcional |
| Menú y rutas protegidas según el rol | Funcional |
| Gestión de usuarios: listar, buscar, filtrar, crear, editar, desactivar y reactivar | Funcional |
| Asignación y revocación de roles (con ámbito, vigencia y motivo) | Funcional |
| CRUD de unidades y líneas de investigación (crear, editar, activar/desactivar, eliminar, buscar, filtrar) | Funcional |
| Validaciones del cliente y del servidor, con errores por campo | Funcional |
| Rol inicial obligatorio al crear un usuario (y bloqueo al revocar su último rol) | Funcional |
| Consulta de auditoría (solo administrador técnico): filtros, buscador de actor y detalle antes/después | Funcional |
| Exportación de la auditoría a Excel y PDF (todos los registros filtrados, hasta 10.000) | Funcional |
| Pruebas automatizadas (`npm test`) | Funcional |
| Propuestas (M02): listado con filtros, registro, detalle, edición del borrador, equipo, envío a revisión e historial | Funcional |
| Evaluaciones, hitos, informes, documentos y calendario | Marcadores visuales (aún no implementados) |

## Requisitos

- **Node.js** `>= 20.19` o `>= 22.12` (versión LTS).
- **Git**.
- El **backend Django** corriendo en `http://127.0.0.1:8000` con PostgreSQL y migraciones aplicadas (ver el README de `backend_iinsad`).

## Puesta en marcha

### 1. Backend (en la carpeta `backend_iinsad`)

```powershell
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py runserver
```

Para tener usuarios de prueba en desarrollo, cargar los datos semilla una sola vez:

```powershell
.\.venv\Scripts\python.exe manage.py shell -c "exec(open('scripts/seed_dev.py', encoding='utf-8').read())"
```

### 2. Frontend (en la carpeta `frontend_iinsad`)

```powershell
Copy-Item .env.example .env
npm install
npm run dev
```

Abrir `http://localhost:5173/`.

### 3. Usuarios de prueba (solo desarrollo)

El seed crea un usuario por rol, todos con la contraseña `Iinsad-Dev-2026`:

| Correo | Rol |
|---|---|
| `admin@iinsad.test` | Administrador técnico |
| `direccion@iinsad.test` | Dirección |
| `ctc@iinsad.test` | Miembro del CTC |
| `responsable@iinsad.test` | Responsable de unidad |
| `investigador@iinsad.test` | Investigador |

> Estas cuentas existen solo para desarrollo. **No ejecutar el seed en producción.** El login usa **correo electrónico**, no nombre de usuario.

### Modo demostración (opcional)

Con `VITE_ENABLE_DEMO=true` y `npm run dev`, la pantalla de login muestra botones para entrar como cada rol con **datos ficticios**. No concede acceso real al backend y se desactiva por completo en el build de producción. Para probar la conexión real, pon `VITE_ENABLE_DEMO=false`.

## Variables de entorno

Se definen en el archivo `.env` (copia de `.env.example`). El archivo `.env` **no se sube a Git**. Solo deben contener valores públicos, nunca secretos.

| Variable | Valor por defecto | Descripción |
|---|---|---|
| `VITE_API_BASE` | `/api/v1` | Prefijo de la API. En desarrollo el proxy de Vite lo redirige al backend. |
| `VITE_ENABLE_DEMO` | `true` | Habilita el modo demostración (solo en `npm run dev`). |

## Estructura de archivos

```text
frontend_iinsad/
├── src/
│   ├── api/
│   │   ├── http.ts              # cliente HTTP: URL base, token Bearer y mensajes de error
│   │   ├── auth.ts              # login, perfil (/me) y cierre de sesión
│   │   ├── users.ts             # usuarios, asignaciones de rol y unidades
│   │   └── projects.ts          # proyectos, propuestas, equipo y buscador de personas
│   ├── assets/
│   │   └── logo-iinsad.jpg      # logo institucional (login, menú y pestaña)
│   ├── auth/
│   │   ├── auth-context.ts      # tipos y contexto de la sesión
│   │   ├── AuthProvider.tsx     # estado de sesión: signIn, signOut, rol activo
│   │   ├── ProtectedRoute.tsx   # redirige a /login si no hay sesión
│   │   └── useAuth.ts           # hook para leer la sesión
│   ├── components/
│   │   ├── layout/
│   │   │   └── AppShell.tsx     # estructura general: menú lateral y cabecera
│   │   └── ui/
│   │       ├── DataTable.tsx    # tabla configurable reutilizable
│   │       └── Modal.tsx        # ventana emergente reutilizable
│   ├── config/
│   │   ├── roles.ts             # códigos y nombres de los cinco roles
│   │   └── navigation.ts        # opciones del menú y qué rol ve cada una
│   ├── pages/
│   │   ├── LoginPage.tsx        # inicio de sesión
│   │   ├── DashboardPage.tsx    # inicio, distinto según el rol
│   │   ├── UsersPage.tsx        # administración de usuarios
│   │   ├── UnitsPage.tsx        # unidades de investigación
│   │   ├── ModulePage.tsx       # marcador para módulos futuros
│   │   ├── users/
│   │   │   ├── UserFormModal.tsx   # formulario de crear/editar usuario
│   │   │   └── UserRolesModal.tsx  # asignar y revocar roles
│   │   └── projects/
│   │       ├── ProjectsPage.tsx       # listado y filtros
│   │       ├── ProjectDetailPage.tsx  # detalle, envío e historial
│   │       ├── NewProposalModal.tsx   # registrar una propuesta
│   │       ├── EditDraftModal.tsx     # editar el borrador
│   │       ├── ProposalFields.tsx     # campos compartidos por los dos formularios
│   │       ├── TeamSection.tsx        # integrantes y funciones
│   │       └── PersonPicker.tsx       # buscador de personas
│   ├── lib/
│   │   └── proposal.ts          # textos, validación y fechas de propuestas
│   ├── App.tsx                  # definición de rutas
│   ├── main.tsx                 # punto de entrada
│   ├── styles.css               # estilos globales y responsivos
│   └── vite-env.d.ts            # tipos de Vite
├── .env.example                 # plantilla de variables de entorno
├── .gitignore
├── eslint.config.js             # reglas de lint
├── index.html                   # página base (título e ícono)
├── package.json                 # dependencias y scripts
├── package-lock.json            # versiones exactas (subir siempre a Git)
├── tsconfig.json                # configuración de TypeScript (raíz)
├── tsconfig.app.json            # TypeScript para el código de src/
├── tsconfig.node.json           # TypeScript para vite.config.ts
└── vite.config.ts               # Vite: plugin de React y proxy /api
```

## Cómo funciona

**Conexión con el backend.** En desarrollo, `vite.config.ts` redirige todo lo que empiece con `/api` a `http://127.0.0.1:8000`. El navegador cree que habla con el mismo origen, por lo que no hay problemas de CORS. Si Django usa otro puerto, se ajusta ahí.

**Sesión.** Al iniciar sesión, `auth.ts` llama a `POST /usuarios/auth/login/` y luego a `GET /usuarios/auth/me/`. El token de acceso se guarda **solo en memoria**: al recargar la página hay que iniciar sesión de nuevo. `AuthProvider` mantiene la sesión y `ProtectedRoute` bloquea las rutas privadas.

**Menú y rutas por rol.** `config/navigation.ts` declara qué rol ve cada opción del menú, y `AppShell` dibuja solo las que corresponden al rol activo. Si un usuario tiene varios roles, puede cambiar el rol activo, que solo modifica el menú visible.

**Errores.** `http.ts` traduce las respuestas de error de Django (por ejemplo `Correo: ya existe`) a mensajes legibles para el usuario.

**Gestión de usuarios** (`pages/UsersPage.tsx`, solo administrador técnico):
- Lista paginada de 20 en 20, con búsqueda por nombre o correo y filtro por estado.
- Crear y editar usuarios. El correo no se puede cambiar al editar. Sin contraseña inicial, la cuenta queda *pendiente de activación*.
- Desactivar (cierra las sesiones de esa cuenta) y reactivar. No se puede desactivar la propia cuenta.
- Asignar roles con su ámbito: **Global** (Dirección, CTC, Admin. técnico), **por unidad** (Responsable de unidad) o **por proyecto** (Investigador). Las asignaciones no se editan ni se borran: se **revocan** con un motivo obligatorio y queda el historial.

**Propuestas** (`pages/projects/`, ruta `/proyectos`):
- El servidor decide qué proyectos ve cada cuenta; la pantalla solo envía los filtros (estado, unidad, participación y búsqueda).
- Registran propuestas el Investigador (como investigador principal) y el Administrador técnico (a nombre de quien elija).
- En el detalle, los botones salen del campo `permisos` que envía Django. Lo enviado a revisión es de solo lectura; corregir crea una versión nueva y la anterior queda en el historial.
- Datos de demostración y guion: `docs/M02_proyectos.md` del backend.

## Roles y menú

| Opción del menú | Investigador | Resp. de unidad | CTC | Dirección | Admin. técnico |
|---|:-:|:-:|:-:|:-:|:-:|
| Inicio | ✔ | ✔ | ✔ | ✔ | ✔ |
| Proyectos | ✔ | ✔ | ✔ | ✔ | ✔ |
| Evaluaciones \* | | ✔ | ✔ | ✔ | |
| Hitos y planificación \* | ✔ | ✔ | | ✔ | |
| Informes \* | ✔ | ✔ | | ✔ | |
| Documentos \* | ✔ | ✔ | ✔ | ✔ | ✔ |
| Calendario \* | ✔ | ✔ | ✔ | ✔ | ✔ |
| Usuarios | | | | | ✔ |
| Unidades y líneas | | | | | ✔ |

\* Marcador visual: módulo aún no implementado.

## Endpoints que usa el frontend

Todos bajo `/api/v1/`. La documentación interactiva del backend está en `http://127.0.0.1:8000/api/docs/`.

| Acción | Método | Ruta |
|---|---|---|
| Iniciar sesión | POST | `/usuarios/auth/login/` |
| Perfil del usuario actual | GET | `/usuarios/auth/me/` |
| Cerrar sesión (revoca tokens) | POST | `/usuarios/auth/logout/` |
| Listar usuarios (`page`, `search`, `is_active`) | GET | `/usuarios/usuarios/` |
| Crear usuario | POST | `/usuarios/usuarios/` |
| Ver / editar usuario | GET / PATCH | `/usuarios/usuarios/{id}/` |
| Desactivar usuario (baja lógica) | DELETE | `/usuarios/usuarios/{id}/` |
| Asignar rol | POST | `/usuarios/asignaciones/` |
| Revocar rol (exige `motivo`) | POST | `/usuarios/asignaciones/{id}/revocar/` |
| Listar unidades | GET | `/usuarios/unidades/` |
| Listar proyectos (`search`, `estado_propuesta`, `unidad`, `persona`) | GET | `/proyectos/` |
| Registrar propuesta / ver detalle | POST / GET | `/proyectos/` · `/proyectos/{id}/` |
| Buscar personas | GET | `/proyectos/personas/?search=` |
| Nueva versión de corrección | POST | `/proyectos/{id}/propuestas/` |
| Editar / descartar borrador | PATCH / DELETE | `/proyectos/{id}/propuestas/{version}/` |
| Enviar a revisión | POST | `/proyectos/{id}/propuestas/{version}/enviar/` |
| Agregar integrante | POST | `.../{version}/integrantes/` |
| Cambiar función / retirar | PATCH / DELETE | `.../{version}/integrantes/{integrante}/` |

## Scripts disponibles

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo en `http://localhost:5173` |
| `npm run typecheck` | Revisa los tipos de TypeScript |
| `npm run lint` | Revisa el estilo y errores comunes con ESLint |
| `npm run build` | Genera la versión de producción en `dist/` |
| `npm run preview` | Sirve localmente el build de producción |

Antes de subir cambios conviene ejecutar `npm run typecheck`, `npm run lint` y `npm run build`.

## Seguridad y límites

- **El frontend no es control de acceso.** Ocultar un botón es solo comodidad visual: Django comprueba roles y ámbito en cada petición y rechaza con 403 lo que no corresponde.
- El token se guarda en memoria, **nunca** en `localStorage` ni `sessionStorage`. Es una solución temporal; la estrategia definitiva de sesión (por ejemplo cookies `HttpOnly`) debe acordarse con el backend.
- El token de acceso dura 30 minutos y el frontend aún no renueva la sesión con el `refresh`: pasado ese tiempo hay que volver a iniciar sesión.
- No subir a Git `.env`, `node_modules/`, contraseñas ni claves.
- Los datos del modo demostración son ficticios y no deben usarse como reales.
- Los marcadores de módulos futuros no son funcionalidad terminada.

## Despliegue

El proxy de Vite **solo existe en desarrollo**. En producción el frontend son archivos estáticos (`npm run build` genera `dist/`) y hay que resolver cómo llegan las peticiones a `/api`:

- **Recomendado:** un servidor web (Nginx, Caddy u otro) que sirva `dist/` y reenvíe `/api/` al backend, todo bajo un mismo dominio con HTTPS. Así no hace falta CORS.
- **Alternativa:** definir `VITE_API_BASE` con la URL completa del backend al hacer el build, y configurar `CORS_ALLOWED_ORIGINS` en el backend.

Del lado del backend, producción exige definir `SECRET_KEY`, `ALLOWED_HOSTS` y las variables de PostgreSQL, y revisar la configuración de HTTPS y archivos estáticos. Consultar el README de `backend_iinsad`.

## Flujo de trabajo con Git

Cada funcionalidad se desarrolla en una rama propia y se integra a `main` al terminar.

```powershell
git checkout -b feature/nombre-de-la-funcionalidad
```
```powershell
git add .
```
```powershell
git commit -m "Descripción clara del cambio"
```
```powershell
git push -u origin feature/nombre-de-la-funcionalidad
```

Después se abre un **Pull Request** en GitHub, se revisa y se une a `main`. Antes de empezar una rama nueva, actualizar `main` con `git pull origin main`. Los nombres de rama no llevan espacios.

## Trabajo en equipo

- **David** mantiene `backend_iinsad` (Django + PostgreSQL).
- **Génesis** mantiene `frontend_iinsad` (React + TypeScript).
- Los cambios en endpoints se acuerdan con el backend y se documentan allí (`/api/docs/`).
- Revisar los Pull Requests antes de integrar a `main`.
