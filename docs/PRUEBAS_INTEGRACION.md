# IINSAD-UMSA
## Registro de pruebas de integración — Primera etapa

**Proyecto:** Sistema Web de Gestión y Seguimiento de Proyectos de Investigación del IINSAD-UMSA  
**Fecha de ejecución:** 18 de noviembre de 2026  
**Responsable de las pruebas:** Génesis  
**Entorno:** Desarrollo local

---

## 1. Objetivo

Verificar la comunicación entre el frontend desarrollado con React y TypeScript, el backend implementado con Django REST Framework y la base de datos PostgreSQL.

También se realizaron pruebas iniciales de autenticación, autorización y consulta de información.

## 2. Entorno tecnológico

| Componente | Tecnología | Versión |
|---|---|---|
| Frontend | React + TypeScript | Proyecto inicial |
| Herramienta de desarrollo | Vite | 7.3.8 |
| Backend | Django | 5.1.15 |
| API | Django REST Framework | 3.17.2 |
| Lenguaje del backend | Python | 3.11.9 |
| Base de datos | PostgreSQL | 16 |
| Base de datos de desarrollo | `iinsad_dev` | Local |

**Direcciones utilizadas:**

- Frontend: `http://localhost:5173/`
- Backend: `http://127.0.0.1:8000/`
- PostgreSQL: `localhost:5432`

## 3. Pruebas de integración realizadas

| ID | Prueba | Resultado observado | Estado |
|---|---|---|---|
| PI-01 | Conexión Django–PostgreSQL | Conexión confirmada con `iinsad_dev`, puerto 5432 | Aprobada |
| PI-02 | Migraciones de Django | Migraciones ejecutadas correctamente | Aprobada |
| PI-03 | Inicio de sesión del administrador | HTTP 200 | Aprobada |
| PI-04 | Inicio de sesión de Dirección | Acceso correcto | Aprobada |
| PI-05 | Inicio de sesión del CTC | Acceso correcto | Aprobada |
| PI-06 | Inicio de sesión del responsable de unidad | Acceso correcto | Aprobada |
| PI-07 | Inicio de sesión del investigador | Acceso correcto | Aprobada |
| PI-08 | Consulta del perfil autenticado | HTTP 200 | Aprobada |
| PI-09 | Cierre de sesión | HTTP 204 | Aprobada |
| PI-10 | Consulta de usuarios | HTTP 200; registros visualizados en React | Aprobada |
| PI-11 | Consulta de unidades | HTTP 200 desde la API | Aprobada |
| PI-12 | Inicio de sesión con contraseña incorrecta | HTTP 401; acceso rechazado | Aprobada |
| PI-13 | Acceso del investigador a la lista administrativa | HTTP 403; acceso rechazado | Aprobada |

## 4. Pruebas de autorización

Se comprobó que un usuario autenticado con el rol **Investigador** no puede acceder al listado administrativo de usuarios.

**Endpoint evaluado:**

`GET /api/v1/usuarios/usuarios/`

**Resultado obtenido:**

- Usuario autenticado: `investigador@iinsad.test`
- Código de respuesta: `403 Forbidden`

**Conclusión:** El backend aplicó correctamente la restricción de acceso para la operación evaluada.

Esta comprobación no representa una auditoría completa de todos los permisos del sistema.

## 5. Pruebas automáticas del backend

Se ejecutaron las pruebas automatizadas mediante:

`python -m pytest -q`

**Resultados:**

| Indicador | Resultado |
|---|---|
| Pruebas ejecutadas | 52 |
| Pruebas aprobadas | 52 |
| Pruebas fallidas | 0 |
| Tiempo de ejecución | 148,25 segundos |
| Porcentaje de aprobación | 100 % |

**Salida registrada:**

`52 passed in 148.25s (0:02:28)`

Las 52 pruebas corresponden al conjunto automatizado existente en el backend. Su aprobación no implica que todos los módulos del sistema estén implementados.

## 6. Comprobaciones del frontend

Se ejecutaron los siguientes comandos:

- `npm run typecheck` — Sin errores.
- `npm run lint` — Sin errores.
- `npm run build` — Compilación completada correctamente.

Además, se revisaron visualmente las pantallas iniciales de los cinco roles.

## 7. Observaciones y aspectos pendientes

- Las pruebas se realizaron con cuentas y datos ficticios de desarrollo.
- Se comprobó la autenticación real desde React mediante Django.
- Se verificó una restricción de autorización mediante una solicitud directa a la API.
- Las pantallas de usuarios y unidades implementan consultas iniciales; todavía no constituyen una administración CRUD completa.
- La selección de rol activo requiere completar su aplicación y validación en el backend.
- El mensaje de credenciales incorrectas debe presentarse en español.
- Quedan pendientes pruebas adicionales de permisos, seguridad, operaciones de escritura y funcionalidades de los demás módulos.
- No se deben utilizar las credenciales de prueba en producción.

## 8. Conclusión

Las pruebas realizadas el 18 de noviembre de 2026 permitieron verificar satisfactoriamente la integración inicial entre React, Django REST Framework y PostgreSQL.

Se comprobó el inicio de sesión de cinco usuarios de desarrollo, la consulta de perfiles, el cierre de sesión, la consulta de información y el rechazo de operaciones no autorizadas en los casos evaluados.

Asimismo, las **52 pruebas automatizadas del backend finalizaron correctamente**.

La arquitectura básica se encuentra operativa en el entorno local de desarrollo, quedando pendiente la implementación y validación integral de los módulos del sistema.