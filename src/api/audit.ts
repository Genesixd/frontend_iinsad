import { apiDownload, apiRequest } from './http'
import type { Page } from './users'

export type AuditRecord = {
  id: number
  ocurrido_en: string
  accion: string
  entidad_tipo: string
  entidad_id: number | null
  antes: Record<string, unknown> | null
  despues: Record<string, unknown> | null
  resultado: string
  motivo: string
  actor_usuario: number | null
  actor_email: string | null
  actor_asignacion: number | null
  actor_proceso: string
  rol_codigo_snapshot: string
  ambito_snapshot: string
  direccion_red: string | null
  peticion_id: string | null
}

export type AuditFilters = {
  page: number
  search: string
  /** Fecha AAAA-MM-DD (incluye todo ese día). */
  desde: string
  hasta: string
  accion: string
  entidad_tipo: string
  resultado: string
  /** ID numérico del usuario que ejecutó la acción. */
  actor_usuario: string
  peticion_id: string
}

export const EMPTY_AUDIT_FILTERS: AuditFilters = {
  page: 1, search: '', desde: '', hasta: '', accion: '', entidad_tipo: '', resultado: '', actor_usuario: '', peticion_id: '',
}

function toParams(filters: Partial<AuditFilters>) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (String(value).trim() !== '') params.set(key, String(value).trim())
  }
  return params
}

/** Consulta de la bitácora (solo lectura). Los filtros vacíos no se envían. */
export function fetchAudit(token: string, filters: AuditFilters) {
  return apiRequest<Page<AuditRecord>>(`/auditoria/registros/?${toParams(filters)}`, {}, token)
}

export type ExportFormat = 'xlsx' | 'pdf'

/**
 * Descarga TODOS los registros que cumplen los filtros (no solo la página visible).
 * El archivo lo genera Django; aquí se omite `page` porque la exportación no pagina.
 */
export function exportAudit(token: string, filters: AuditFilters, format: ExportFormat) {
  const withoutPage: Partial<AuditFilters> = { ...filters }
  delete withoutPage.page
  const params = toParams(withoutPage)
  params.set('formato', format)
  return apiDownload(`/auditoria/registros/exportar/?${params}`, token)
}

/** Nombre del archivo descargado: auditoria_AAAAMMDD_HHMM.xlsx */
export function exportFileName(format: ExportFormat, now = new Date()) {
  const pad = (n: number) => String(n).padStart(2, '0')
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`
  return `auditoria_${stamp}.${format}`
}
