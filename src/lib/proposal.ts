// Textos y validación de propuestas. La validación solo anticipa la respuesta: Django vuelve a comprobar.
import type { MemberRole, ProjectDetail, ProposalContent, ProposalState, Version } from '../api/projects'
import type { FormErrors } from './catalogValidation'

export const STATE_LABELS: Record<ProposalState, string> = {
  BORRADOR: 'Borrador',
  EN_REVISION: 'En revisión',
  EN_CORRECCION: 'En corrección',
  APROBADA: 'Aprobada',
  NO_APROBADA: 'No aprobada',
}

export const STATE_TAGS: Record<ProposalState, string> = {
  BORRADOR: 'tag-muted',
  EN_REVISION: 'tag-info',
  EN_CORRECCION: 'tag-warning',
  APROBADA: 'tag-positive',
  NO_APROBADA: 'tag-negative',
}

export const ORIGIN_LABELS = {
  PROPUESTA: 'Propuesta nueva',
  VIGENTE: 'Proyecto vigente incorporado',
  HISTORICO: 'Proyecto histórico incorporado',
} as const

export const VERSION_TYPE_LABELS: Record<Version['tipo_version'], string> = {
  INICIAL: 'Versión inicial',
  CORRECCION: 'Corrección',
  CAMBIO: 'Cambio solicitado',
}

export const MEMBER_ROLE_LABELS: Record<MemberRole, string> = {
  INVESTIGADOR_PRINCIPAL: 'Investigador principal',
  COINVESTIGADOR: 'Coinvestigador',
  COLABORADOR: 'Colaborador',
}

export const TITLE_MAX = 600

export type TextField = Exclude<keyof ProposalContent, 'fecha_inicio_prevista' | 'fecha_fin_prevista'>

export const TEXT_FIELDS: Array<{ key: TextField; label: string; rows: number; requiredToSend?: string }> = [
  { key: 'titulo', label: 'Título', rows: 2, requiredToSend: 'el título' },
  { key: 'resumen', label: 'Resumen', rows: 4, requiredToSend: 'el resumen' },
  { key: 'justificacion', label: 'Justificación', rows: 3 },
  { key: 'objetivo_general', label: 'Objetivo general', rows: 2, requiredToSend: 'el objetivo general' },
  { key: 'objetivos_especificos', label: 'Objetivos específicos', rows: 4 },
  { key: 'metodologia', label: 'Metodología', rows: 4 },
  { key: 'resultados_esperados', label: 'Resultados esperados', rows: 3 },
]

/** Valores del formulario: las fechas son texto (vacío = sin fecha). */
export type ContentForm = Record<keyof ProposalContent, string>

export const emptyContent = (): ContentForm => ({
  titulo: '', resumen: '', justificacion: '', objetivo_general: '', objetivos_especificos: '', metodologia: '',
  resultados_esperados: '', fecha_inicio_prevista: '', fecha_fin_prevista: '',
})

export function contentForm(source: ProposalContent): ContentForm {
  const form = emptyContent()
  for (const key of Object.keys(form) as Array<keyof ContentForm>) form[key] = source[key] ?? ''
  return form
}

export function contentPayload(form: ContentForm): ProposalContent {
  return {
    titulo: form.titulo.split(/\s+/).filter(Boolean).join(' '),
    resumen: form.resumen.trim(),
    justificacion: form.justificacion.trim(),
    objetivo_general: form.objetivo_general.trim(),
    objetivos_especificos: form.objetivos_especificos.trim(),
    metodologia: form.metodologia.trim(),
    resultados_esperados: form.resultados_esperados.trim(),
    fecha_inicio_prevista: form.fecha_inicio_prevista || null,
    fecha_fin_prevista: form.fecha_fin_prevista || null,
  }
}

export function validateContent(form: ContentForm): FormErrors {
  const errors: FormErrors = {}
  const title = form.titulo.split(/\s+/).filter(Boolean).join(' ')
  if (!title) errors.titulo = 'El título es obligatorio.'
  else if (title.length > TITLE_MAX) errors.titulo = `El título admite hasta ${TITLE_MAX} caracteres.`
  // Las fechas llegan como AAAA-MM-DD: se comparan bien como texto.
  const { fecha_inicio_prevista: start, fecha_fin_prevista: end } = form
  if (start && end && end < start) errors.fecha_fin_prevista = 'La fecha de fin prevista no puede ser anterior al inicio.'
  return errors
}

/** Lo que falta completar para poder enviar (aviso previo; el servidor tiene la última palabra). */
export function missingToSend(version: ProposalContent): string[] {
  return TEXT_FIELDS.filter(field => field.requiredToSend && !version[field.key]?.trim()).map(field => field.requiredToSend!)
}

export type VersionEntry = { version: Version; attempt: number }

/** Todas las versiones visibles, de la más reciente a la más antigua. */
export function versionHistory(project: ProjectDetail): VersionEntry[] {
  return project.presentaciones
    .flatMap(presentation => presentation.versiones.map(version => ({ version, attempt: presentation.numero_intento })))
    .sort((a, b) => b.attempt - a.attempt || b.version.numero_version - a.version.numero_version)
}

/** "2026-03-05" → "05/03/2026" sin pasar por zonas horarias (evita que se corra un día). */
export function formatDate(value: string | null): string {
  if (!value) return '—'
  const [year, month, day] = value.slice(0, 10).split('-')
  return `${day}/${month}/${year}`
}

export function formatDateTime(value: string | null): string {
  if (!value) return '—'
  return new Intl.DateTimeFormat('es-BO', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/La_Paz' }).format(new Date(value))
}
