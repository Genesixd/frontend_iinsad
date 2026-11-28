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
  'usuario.reactivar': 'Reactivar usuario',
  'proyecto.crear': 'Registrar proyecto',
  'participacion.crear': 'Agregar participación',
  'participacion.cerrar': 'Cerrar participación',
  'participacion.anular': 'Anular participación',
  'propuesta.crear_version': 'Abrir corrección',
  'propuesta.editar': 'Editar borrador',
  'propuesta.eliminar_borrador': 'Descartar borrador',
  'propuesta.agregar_integrante': 'Agregar integrante',
  'propuesta.quitar_integrante': 'Quitar integrante',
  'propuesta.cambiar_funcion': 'Cambiar función',
  'propuesta.enviar': 'Enviar a revisión',
  'admin.crear': 'Crear desde el panel',
  'admin.editar': 'Editar desde el panel',
  'admin.eliminar': 'Eliminar desde el panel',
}

export const ENTITY_LABELS: Record<string, string> = {
  Usuario: 'Usuario',
  Persona: 'Persona',
  AsignacionRol: 'Asignación de rol',
  Unidad: 'Unidad',
  Linea: 'Línea de investigación',
  Parametro: 'Parámetro',
  Auditoria: 'Auditoría',
  Proyecto: 'Proyecto',
  Participacion: 'Participación',
  VersionPropuesta: 'Versión de propuesta',
}

const FIELD_LABELS: Record<string, string> = {
  email: 'Correo', is_active: 'Cuenta activa', activado: 'Cuenta activada', password_cambiada: 'Contraseña cambiada',
  sesiones_cerradas: 'Sesiones cerradas', nombres: 'Nombres', apellido_paterno: 'Apellido paterno',
  apellido_materno: 'Apellido materno', identificador_institucional: 'Identificador institucional',
  procedencia: 'Procedencia', observaciones: 'Observaciones', completitud: 'Completitud',
  usuario_id: 'Usuario (ID)', rol: 'Rol', ambito: 'Ámbito', unidad_id: 'Unidad (ID)', proyecto_id: 'Proyecto (ID)',
  vigente_desde: 'Vigente desde', vigente_hasta: 'Vigente hasta', revocada_en: 'Revocada en',
  codigo: 'Código', nombre: 'Nombre', activa: 'Activa', clave: 'Clave', titulo: 'Título', valor: 'Valor', estado: 'Estado',
  pregunta_pendiente: 'Pregunta pendiente', aprobada_por_persona_id: 'Aprobada por (ID)', aprobada_en: 'Aprobada en',
  formato: 'Formato', registros: 'Registros', filtros: 'Filtros', persona_id: 'Persona (ID)', funcion: 'Función',
  numero_version: 'N.º de versión', version_anterior_id: 'Versión anterior (ID)', equipo: 'Equipo', enviada_en: 'Enviada en',
  participacion_id: 'Participación (ID)', anulado_en: 'Anulada en', origen: 'Origen', estado_ejecucion: 'Estado de ejecución',
  lineas: 'Líneas', investigador_principal_id: 'Investigador principal (ID)', resumen: 'Resumen', justificacion: 'Justificación',
  objetivo_general: 'Objetivo general', objetivos_especificos: 'Objetivos específicos', metodologia: 'Metodología',
  resultados_esperados: 'Resultados esperados', fecha_inicio_prevista: 'Inicio previsto', fecha_fin_prevista: 'Fin previsto',
  campos_modificados: 'Campos modificados',
}

// Todas las fechas se muestran en la hora de Bolivia, igual que en las exportaciones.
const ZONE = 'America/La_Paz'

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
    if (!Number.isNaN(date.getTime())) return date.toLocaleString('es-BO', { timeZone: ZONE })
  }
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'medium', timeZone: ZONE })
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
