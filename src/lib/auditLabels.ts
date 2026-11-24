// Textos legibles para la bitácora. Si aparece una acción o campo desconocido se muestra el código tal cual.

export const ACTION_LABELS: Record<string, string> = {
  'auth.login': 'Inicio de sesión',
  'auth.logout': 'Cierre de sesión',
  'usuario.crear': 'Crear usuario',
  'usuario.editar': 'Editar usuario',
  'usuario.desactivar': 'Desactivar usuario',
  'usuario.cambiar_password': 'Cambiar contraseña',
  'asignacion.crear': 'Asignar rol',
  'asignacion.revocar': 'Revocar rol',
  'persona.crear': 'Crear persona',
  'persona.editar': 'Editar persona',
  'persona.eliminar': 'Eliminar persona',
  'unidad.crear': 'Crear unidad',
  'unidad.editar': 'Editar unidad',
  'unidad.eliminar': 'Eliminar unidad',
  'linea.crear': 'Crear línea',
  'linea.editar': 'Editar línea',
  'linea.eliminar': 'Eliminar línea',
  'parametro.crear': 'Crear parámetro',
  'parametro.editar': 'Editar parámetro',
  'parametro.eliminar': 'Eliminar parámetro',
  'auditoria.exportar': 'Exportar auditoría',
}

export const ENTITY_LABELS: Record<string, string> = {
  Usuario: 'Usuario',
  Persona: 'Persona',
  AsignacionRol: 'Asignación de rol',
  Unidad: 'Unidad',
  Linea: 'Línea de investigación',
  Parametro: 'Parámetro',
  Auditoria: 'Auditoría',
}

const FIELD_LABELS: Record<string, string> = {
  email: 'Correo', is_active: 'Cuenta activa', activado: 'Cuenta activada', password_cambiada: 'Contraseña cambiada',
  sesiones_cerradas: 'Sesiones cerradas', nombres: 'Nombres', apellido_paterno: 'Apellido paterno',
  apellido_materno: 'Apellido materno', identificador_institucional: 'Identificador institucional',
  procedencia: 'Procedencia', observaciones: 'Observaciones', completitud: 'Completitud',
  usuario_id: 'Usuario (ID)', rol: 'Rol', ambito: 'Ámbito', unidad_id: 'Unidad (ID)', proyecto_id: 'Proyecto (ID)',
  vigente_desde: 'Vigente desde', vigente_hasta: 'Vigente hasta', revocada_en: 'Revocada en',
  codigo: 'Código', nombre: 'Nombre', activa: 'Activa', clave: 'Clave', titulo: 'Título', valor: 'Valor', estado: 'Estado',
}

export const actionLabel = (code: string) => ACTION_LABELS[code] ?? code
export const entityLabel = (type: string) => ENTITY_LABELS[type] ?? type
export const fieldLabel = (key: string) => key.split('.').map(part => FIELD_LABELS[part] ?? part).join(' › ')

/** Texto de un usuario en listas y selectores: «Nombre completo · correo» (o solo el correo). */
export const actorLabel = (user: { email: string; persona?: { nombre_completo?: string } | null }) =>
  user.persona?.nombre_completo ? `${user.persona.nombre_completo} · ${user.email}` : user.email

/** Quién ejecutó la acción: el correo, o "Sistema" si no hubo una persona detrás (p. ej. login fallido). */
export const actorText = (email: string | null) => email ?? 'Sistema / sin sesión'

export function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Sí' : 'No'
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) return date.toLocaleString('es-BO')
  }
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'medium' })
}

function flatten(value: Record<string, unknown> | null, prefix = ''): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, inner] of Object.entries(value ?? {})) {
    const path = prefix ? `${prefix}.${key}` : key
    if (inner && typeof inner === 'object' && !Array.isArray(inner)) Object.assign(result, flatten(inner as Record<string, unknown>, path))
    else result[path] = inner
  }
  return result
}

export type ChangeRow = { field: string; before: string; after: string }

/**
 * Filas "campo / antes / después". En una edición el backend guarda solo lo que cambió;
 * en una creación `antes` es nulo y `despues` trae el estado completo.
 */
export function changedFields(antes: Record<string, unknown> | null, despues: Record<string, unknown> | null): ChangeRow[] {
  const before = flatten(antes)
  const after = flatten(despues)
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])]
  return keys.map(key => ({ field: fieldLabel(key), before: formatValue(before[key]), after: formatValue(after[key]) }))
}
