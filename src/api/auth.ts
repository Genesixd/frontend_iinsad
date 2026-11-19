import { apiRequest } from './http'
import { isRoleCode, type RoleCode } from '../config/roles'

export type Persona = {
  id: number
  nombres: string
  apellido_paterno: string
  apellido_materno: string
  nombre_completo: string
}

export type UserProfile = {
  id: number
  email: string
  persona: Persona | null
  roles: string[]
  asignaciones: Array<{ rol: string; ambito: string; unidad: number | null; proyecto_id: number | null }>
}

type LoginResponse = { access: string; refresh: string }

export async function authenticate(email: string, password: string) {
  const tokens = await apiRequest<LoginResponse>('/usuarios/auth/login/', {
    method: 'POST', body: JSON.stringify({ email, password }),
  })
  const profile = await apiRequest<UserProfile>('/usuarios/auth/me/', {}, tokens.access)
  const roles: RoleCode[] = profile.roles.filter(isRoleCode)
  if (!roles.length) throw new Error('La cuenta no tiene roles vigentes. Contacta al administrador.')
  return { accessToken: tokens.access, profile, roles }
}

export async function revokeSession(token: string) {
  await apiRequest<void>('/usuarios/auth/logout/', { method: 'POST' }, token)
}
