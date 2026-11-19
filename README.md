# Frontend IINSAD · Primera entrega de Génesis (18-11-2026)

Aplicación inicial React + TypeScript + Vite. Separada del repositorio backend de David.

## Objetivo del día
1. Frontend React + TypeScript configurado.
2. Layout reutilizable (menú, cabecera, área de contenido).
3. Login visual preparado para la API Django real.
4. Componentes reutilizables (`DataTable`, estructura y tarjetas).
5. Vistas iniciales distintas para los cinco roles (sin fingir que los módulos ya están implementados).

## Requisitos para Windows
- Node.js LTS compatible con Vite 7: versión >= 20.19 o >= 22.12 (recomendado usar una LTS actual).
- Git.
- Visual Studio Code.

## Ejecutar
En PowerShell, desde la carpeta `frontend_iinsad`:

```powershell
Copy-Item .env.example .env
npm install
npm run dev
```

Visita `http://localhost:5173/`.

El modo **Demostración** está disponible exclusivamente cuando `import.meta.env.DEV` es verdadero y `.env` contiene `VITE_ENABLE_DEMO=true`. No concede ningún acceso al backend; muestra opciones visuales según cada rol.

## Conectar Django
- David inicia Django localmente en `http://127.0.0.1:8000` con PostgreSQL y migraciones aplicadas.
- Este frontend ya utiliza las rutas correctas de su ZIP, descritas en `docs/CONTRATO_API.md`.
- Desde login, escribe correo/contraseña reales de la BD de desarrollo y pulsa **Ingresar**.
- La sesión usa access token en memoria; al recargar la página se pierde y hay que iniciar sesión de nuevo. Es temporal y **no** una solución final de autenticación en producción.
- El `vite.config.ts` redirige `/api/*` al backend local. Si Django usa otro puerto, ajústalo allí.

## Carpeta fuente
```text
src/
├── api/                  # peticiones HTTP y contrato de autenticación
├── auth/                 # sesión, protección de rutas, hooks
├── components/
│   ├── layout/           # estructura general, menú lateral, cabecera
│   └── ui/               # tabla configurable reutilizable
├── config/               # roles y navegación declarativa
├── pages/                # Login, Inicio, Usuarios, Unidades, módulos futuros
├── App.tsx               # rutas
├── main.tsx              # punto de entrada
└── styles.css            # estilos globales y responsivos
```

## Control de calidad
```powershell
npm run typecheck
npm run lint
npm run build
```

Una vez que `npm install` genere `package-lock.json`, **súbelo también a Git** para garantizar instalaciones reproducibles. No subas `node_modules`, `.env` ni contraseñas.

## Publicar en GitHub (primera vez)
Crea repositorio VACÍO en GitHub: `Genesixd/frontend_iinsad` (Private), sin README ni licencia.

Desde la carpeta del proyecto:
```powershell
git init -b main
git add .
git commit -m "feat: base React TypeScript y vistas por rol"
git remote add origin https://github.com/Genesixd/frontend_iinsad.git
git push -u origin main
```

Si tu Git ya está inicializado, no repitas `git init`. Comprueba `git status` antes de subir. GitHub solicitará autenticación si la sesión local no está configurada.

## Seguridad y límites
- Nunca utilizar la vista React como control de acceso definitivo; Django siempre comprueba roles y ámbito en API.
- No guardamos tokens en almacenamiento persistente del navegador.
- El `logout` del backend revoca sesiones; el botón siempre limpia la sesión local.
- No mostrar como reales ni usar para la defensa los datos ficticios del modo demo.
- Vistas de proyectos, hitos, informes, documentos y calendario: **marcadores visuales**, no módulos terminados.
- La lista de usuarios y unidades sí puede hacer solicitudes de lectura reales cuando inicia sesión un administrador técnico.
- Sin servidor Django no se pueden probar autenticación real ni datos de PostgreSQL.
- Falta seleccionar y aplicar un rol activo **en backend**; la UI de momento solo cambia el menú entre roles ya asignados al usuario.

## Trabajo en equipo
- David mantiene `backend_iinsad` con Django/PostgreSQL.
- Génesis mantiene `frontend_iinsad` con React/TypeScript.
- Acordar las API en `docs/CONTRATO_API.md` y documentar cambios de endpoints.
- Compartir rama de cambios (p. ej. `feature/login`) y revisar Pull Requests antes de integrar a `main`.
