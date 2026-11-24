import type { AuditRecord } from '../api/audit'
import { changedFields, entityLabel } from './auditLabels'

type Data = Record<string, unknown>

const text = (value: unknown): string => (typeof value === 'string' || typeof value === 'number' ? String(value) : '')

/** Eventos de acceso: no modifican datos, solo dejan constancia de que ocurrieron. */
export const isAccessEvent = (accion: string) => accion === 'auth.login' || accion === 'auth.logout'

// Sustantivo con artículo para cada entidad de los catálogos.
const NOUN: Record<string, string> = {
  unidad: 'la unidad', linea: 'la línea de investigación', persona: 'el registro de la persona', parametro: 'el parámetro',
}

/** Referencia legible a lo afectado: «EC · Epidemiología» si hay nombre, o «#4» si solo hay ID. */
function reference(entity: string, id: number | null, data: Data | null): string {
  const named = [text(data?.codigo), text(data?.nombre) || text(data?.titulo) || text(data?.clave)].filter(Boolean).join(' · ')
  const person = [text(data?.nombres), text(data?.apellido_paterno)].filter(Boolean).join(' ')
  if (entity === 'persona' && person) return `«${person}»`
  if (named) return `«${named}»`
  return id !== null ? `#${id}` : ''
}

/**
 * Frase que explica qué ocurrió, p. ej. «admin@iinsad.test asignó el rol INVESTIGADOR al usuario #6.».
 * Se arma con lo que el servidor ya guardó (actor, acción, entidad, antes/después): no pide nada más.
 */
export function describeEvent(record: AuditRecord): string {
  const actor = record.actor_email ?? 'El sistema'
  const after = record.despues ?? {}
  const before = record.antes ?? {}
  const id = record.entidad_id
  const [family = '', verb = ''] = record.accion.split('.')
  const sentence = (what: string) => `${actor} ${what}.`

  if (record.accion === 'auth.login') {
    if (record.resultado !== 'EXITOSO') {
      const email = text(after.email)
      return `Intento fallido de inicio de sesión${email ? ` con el correo «${email}»` : ''}. No se abrió ninguna sesión.`
    }
    return sentence('inició sesión')
  }
  if (record.accion === 'auth.logout') return sentence('cerró sesión (se invalidaron sus sesiones abiertas)')

  switch (record.accion) {
    case 'usuario.crear': return sentence(`creó la cuenta ${text(after.email) || `#${id}`}`)
    case 'usuario.editar': return sentence(`editó la cuenta de usuario #${id}${after.password_cambiada ? ' (incluye cambio de contraseña)' : ''}`)
    case 'usuario.desactivar': return sentence(`desactivó la cuenta de usuario #${id} y cerró sus sesiones`)
    case 'usuario.cambiar_password': return sentence('cambió su contraseña y se cerraron todas sus sesiones')
    case 'asignacion.crear': {
      const scope = text(after.ambito).toLowerCase()
      const unit = after.unidad_id ? ` en la unidad #${text(after.unidad_id)}` : ''
      const project = after.proyecto_id ? ` en el proyecto #${text(after.proyecto_id)}` : ''
      return sentence(`asignó el rol ${text(after.rol)}${scope ? ` (ámbito ${scope})` : ''} al usuario #${text(after.usuario_id)}${unit}${project}`)
    }
    case 'asignacion.revocar': return sentence(`revocó la asignación de rol #${id}`)
    case 'auditoria.exportar': {
      const filters = after.filtros && typeof after.filtros === 'object' ? Object.keys(after.filtros).length : 0
      return sentence(`exportó ${text(after.registros)} registro(s) de la auditoría a ${text(after.formato).toUpperCase()}${filters ? ` con ${filters} filtro(s)` : ' sin filtros'}`)
    }
  }

  const noun = NOUN[family]
  if (noun && verb === 'crear') return sentence(`creó ${noun} ${reference(family, id, after)}`.trim())
  if (noun && verb === 'eliminar') return sentence(`eliminó ${noun} ${reference(family, id, before)}`.trim())
  if (noun && verb === 'editar') {
    const fields = changedFields(record.antes, record.despues).map(row => row.field)
    return sentence(`editó ${noun} ${id !== null ? `#${id}` : ''}${fields.length ? ` (cambió: ${fields.join(', ')})` : ''}`.replace(/\s+/g, ' ').trim())
  }

  const what = id !== null ? ` sobre ${entityLabel(record.entidad_tipo)} #${id}` : ` sobre ${entityLabel(record.entidad_tipo)}`
  return sentence(`ejecutó «${record.accion}»${what}`)
}
