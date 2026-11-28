import { apiRequest, fetchAllPages } from './http'
import type { RoleCode } from '../config/roles'

export type Ambito = 'GLOBAL' | 'UNIDAD' | 'PROYECTO'

// Debe coincidir con `apps/usuarios/roles.py` del backend: el ámbito lo deriva el servidor del rol.
export const ROLE_SCOPE: Record<RoleCode, Ambito> = {
  INVESTIGADOR: 'PROYECTO',
  RESPONSABLE_UNIDAD: 'UNIDAD',
  CTC: 'GLOBAL',
  DIRECCION: 'GLOBAL',
  ADMIN_TECNICO: 'GLOBAL',
}

export type Page<T> = { count: number; next: string | null; previous: string | null; results: T[] }

export type PersonaData = {
  id?: number
  nombres: string
  apellido_paterno: string
  apellido_materno: string
  nombre_completo?: string
  identificador_institucional?: string
  procedencia?: string
}

export type Assignment = {
  id: number
  usuario: number
  rol: string
  ambito: Ambito
  unidad: number | null
  unidad_nombre: string | null
  proyecto_id: number | null
  vigente_desde: string | null
  vigente_hasta: string | null
  revocada_en: string | null
  motivo: string
  vigente: boolean
}

export type UserRow = {
  id: number
  email: string
  persona: PersonaData | null
  is_active: boolean
  activado_en: string | null
  asignaciones: Assignment[]
}

export type UnitOption = { id: number; codigo: string; nombre: string; activa: boolean }

export type UserFilters = { page: number; search: string; estado: '' | 'true' | 'false' }

export function listUsers(token: string, { page, search, estado }: UserFilters, pageSize?: number) {
  const query = new URLSearchParams({ page: String(page) })
  if (pageSize) query.set('page_size', String(pageSize))
  if (search.trim()) query.set('search', search.trim())
  if (estado) query.set('is_active', estado)
  return apiRequest<Page<UserRow>>(`/usuarios/usuarios/?${query}`, {}, token)
}

// Toda cuenta nace con un rol (CUN-001). `unidad` solo para roles de ámbito UNIDAD.
export type CreateUserInput = {
  email: string
  password?: string
  persona: PersonaData
  rol: RoleCode
  unidad?: number | null
}

export function createUser(token: string, data: CreateUserInput) {
  return apiRequest<UserRow>('/usuarios/usuarios/', { method: 'POST', body: JSON.stringify(data) }, token)
}

export type UpdateUserInput = { persona?: PersonaData; password?: string; is_active?: boolean }

export function updateUser(token: string, id: number, data: UpdateUserInput) {
  return apiRequest<UserRow>(`/usuarios/usuarios/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }, token)
}

/** Baja lógica: el backend desactiva la cuenta y cierra sus sesiones. */
export function deactivateUser(token: string, id: number) {
  return apiRequest<void>(`/usuarios/usuarios/${id}/`, { method: 'DELETE' }, token)
}

export function getUser(token: string, id: number) {
  return apiRequest<UserRow>(`/usuarios/usuarios/${id}/`, {}, token)
}

/** Todas las unidades, para el selector de roles. */
export const listUnits = (token: string) => fetchAllPages<UnitOption>('/usuarios/unidades/', {}, token)

export type CreateAssignmentInput = {
  usuario: number
  rol: RoleCode
  unidad?: number | null
  proyecto_id?: number | null
  vigente_desde?: string | null
  vigente_hasta?: string | null
  motivo?: string
}

export function createAssignment(token: string, data: CreateAssignmentInput) {
  return apiRequest<Assignment>('/usuarios/asignaciones/', { method: 'POST', body: JSON.stringify(data) }, token)
}

export function revokeAssignment(token: string, id: number, motivo: string) {
  return apiRequest<Assignment>(`/usuarios/asignaciones/${id}/revocar/`, {
    method: 'POST', body: JSON.stringify({ motivo }),
  }, token)
}
