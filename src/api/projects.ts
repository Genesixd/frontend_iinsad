// Conexión con M02 (`apps/proyectos` del backend). Los permisos y el estado los decide el servidor.
import { apiRequest } from './http'
import type { Page } from './users'

export type ProposalState = 'BORRADOR' | 'EN_REVISION' | 'EN_CORRECCION' | 'APROBADA' | 'NO_APROBADA'
export type MemberRole = 'INVESTIGADOR_PRINCIPAL' | 'COINVESTIGADOR' | 'COLABORADOR'

export type PersonSummary = { id: number; nombre_completo: string }
export type PersonOption = PersonSummary & { procedencia: string }

export type Member = {
  id: number
  participacion: number
  persona: PersonSummary
  funcion: MemberRole
  funcion_texto: string
  funciones: string
  procedencia: string
}

/** Contenido que el investigador principal escribe y puede editar mientras es borrador. */
export type ProposalContent = {
  titulo: string
  resumen: string
  justificacion: string
  objetivo_general: string
  objetivos_especificos: string
  metodologia: string
  resultados_esperados: string
  fecha_inicio_prevista: string | null
  fecha_fin_prevista: string | null
}

export type Version = ProposalContent & {
  id: number
  numero_version: number
  tipo_version: 'INICIAL' | 'CORRECCION' | 'CAMBIO'
  version_anterior: number | null
  unidad: number
  enviada: boolean
  enviada_en: string | null
  integrantes: Member[]
}

export type Presentation = {
  id: number
  numero_intento: number
  estado: ProposalState
  enviada_en: string | null
  resuelta_en: string | null
  versiones: Version[]
}

export type LineSummary = { id: number; codigo: string; nombre: string }

export type ProjectRow = {
  id: number
  codigo: string | null
  titulo: string | null
  origen: 'PROPUESTA' | 'VIGENTE' | 'HISTORICO'
  estado_ejecucion: string
  unidad: number
  unidad_codigo: string
  unidad_nombre: string
  lineas: LineSummary[]
  investigador_principal: PersonSummary | null
  estado_propuesta: ProposalState | null
  anulado: boolean
  creado_en: string
}

/** Lo que este usuario puede hacer AHORA (permiso + estado). Sirve para mostrar u ocultar botones. */
export type ProposalPermissions = {
  editar_borrador: boolean
  enviar: boolean
  eliminar_borrador: boolean
  crear_version: boolean
  gestionar_equipo: boolean
}

export type ProjectDetail = ProjectRow & {
  referencia_institucional: string
  presentaciones: Presentation[]
  permisos: ProposalPermissions
}

export type ProjectFilters = { page: number; search: string; estado: '' | ProposalState; unidad: string; persona: string }

export function fetchProjects(token: string, { page, search, estado, unidad, persona }: ProjectFilters) {
  const params = new URLSearchParams({ page: String(page) })
  if (search.trim()) params.set('search', search.trim())
  if (estado) params.set('estado_propuesta', estado)
  if (unidad) params.set('unidad', unidad)
  if (persona) params.set('persona', persona)
  return apiRequest<Page<ProjectRow>>(`/proyectos/?${params}`, {}, token)
}

export function fetchProject(token: string, id: number) {
  return apiRequest<ProjectDetail>(`/proyectos/${id}/`, {}, token)
}

export type NewProposalInput = ProposalContent & {
  unidad: number
  lineas: number[]
  investigador_principal: number
  referencia_institucional: string
}

export function createProposal(token: string, data: NewProposalInput) {
  return apiRequest<ProjectDetail>('/proyectos/', { method: 'POST', body: JSON.stringify(data) }, token)
}

const versions = (project: number) => `/proyectos/${project}/propuestas/`
const version = (project: number, id: number) => `${versions(project)}${id}/`
const members = (project: number, id: number) => `${version(project, id)}integrantes/`

export function updateDraft(token: string, project: number, id: number, data: Partial<ProposalContent>) {
  return apiRequest<Version>(version(project, id), { method: 'PATCH', body: JSON.stringify(data) }, token)
}

export function deleteDraft(token: string, project: number, id: number) {
  return apiRequest<void>(version(project, id), { method: 'DELETE' }, token)
}

export function createVersion(token: string, project: number) {
  return apiRequest<Version>(versions(project), { method: 'POST' }, token)
}

export function submitVersion(token: string, project: number, id: number) {
  return apiRequest<Version>(`${version(project, id)}enviar/`, { method: 'POST' }, token)
}

export type NewMemberInput = { persona: number; funcion: MemberRole; funciones?: string; procedencia?: string }

export function addMember(token: string, project: number, id: number, data: NewMemberInput) {
  return apiRequest<Member>(members(project, id), { method: 'POST', body: JSON.stringify(data) }, token)
}

export function changeMemberRole(token: string, project: number, id: number, member: number, funcion: MemberRole) {
  return apiRequest<Member>(`${members(project, id)}${member}/`, { method: 'PATCH', body: JSON.stringify({ funcion }) }, token)
}

export function removeMember(token: string, project: number, id: number, member: number) {
  return apiRequest<void>(`${members(project, id)}${member}/`, { method: 'DELETE' }, token)
}

/** Buscador mínimo de personas (administrador técnico e investigador). Exige 2 letras o más. */
export function searchPeople(token: string, search: string) {
  const params = new URLSearchParams({ search: search.trim() })
  return apiRequest<Page<PersonOption>>(`/proyectos/personas/?${params}`, {}, token)
}
