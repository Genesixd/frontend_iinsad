# API utilizada: referencia al ZIP `backend_iinsad-main.zip`

La estructura fue leída del backend entregado por David (no verificada en ejecución).

| Acción | Método | Ruta | Parámetros / respuesta |
|---|---|---|---|
| Login | POST | `/api/v1/usuarios/auth/login/` | `{ "email": "...", "password": "..." }` → `{ access, refresh }` |
| Perfil | GET | `/api/v1/usuarios/auth/me/` | `Authorization: Bearer <access>` → `{ id, email, persona, roles, asignaciones }` |
| Logout | POST | `/api/v1/usuarios/auth/logout/` | `Authorization: Bearer <access>` → 204 |
| Usuarios | GET | `/api/v1/usuarios/usuarios/` | Admin técnico; paginado: `{ count, results }` |
| Unidades | GET | `/api/v1/usuarios/unidades/` | Autenticado; paginado: `{ count, results }` |
| Roles | GET | `/api/v1/usuarios/roles/` | Autenticado; lista de `{ codigo, nombre, ambito }` |

**Notas importantes:**
- El backend usa **correo electrónico**, no nombre de usuario.
- Los códigos de rol son `INVESTIGADOR`, `RESPONSABLE_UNIDAD`, `CTC`, `DIRECCION`, `ADMIN_TECNICO`.
- La API documenta `/api/docs/` y `/api/schema/`.
- Este frontend **NO almacena JWT en `localStorage` ni en `sessionStorage`**. El token de acceso queda en memoria y desaparece al recargar.
- Se ignora de momento el `refresh` recibido, porque aún debe acordarse una estrategia de sesión segura (idealmente cookies `HttpOnly` con configuración correspondiente en backend).
- El cambio de rol activo, cuando esté disponible para un usuario con múltiples roles, **solo cambia la navegación visual**. No sustituye reglas de permisos del backend ni añade un claim al token.
- Backend en desarrollo: `http://127.0.0.1:8000`; Vite usa un proxy `/api` para desarrollo local.
- Los datos de prueba del modo demo **no provienen de PostgreSQL**; la interfaz los identifica como ficticios.
