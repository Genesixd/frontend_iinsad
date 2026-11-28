import type { RoleCode } from './roles'

export type MenuItem = {
  path: string
  label: string
  icon: 'home' | 'users' | 'building' | 'folders' | 'reviews' | 'plan' | 'files' | 'calendar' | 'reports' | 'audit'
  roles: readonly RoleCode[]
  phase: 'base' | 'proximo'
}

const TODOS: RoleCode[] = ['INVESTIGADOR', 'RESPONSABLE_UNIDAD', 'CTC', 'DIRECCION', 'ADMIN_TECNICO']

export const NAVIGATION: MenuItem[] = [
  { path: '/inicio', label: 'Inicio', icon: 'home', roles: TODOS, phase: 'base' },
  { path: '/proyectos', label: 'Proyectos', icon: 'folders', roles: TODOS, phase: 'base' },
  { path: '/evaluaciones', label: 'Evaluaciones', icon: 'reviews', roles: ['RESPONSABLE_UNIDAD', 'CTC', 'DIRECCION'], phase: 'proximo' },
  { path: '/hitos', label: 'Hitos y planificación', icon: 'plan', roles: ['INVESTIGADOR', 'RESPONSABLE_UNIDAD', 'DIRECCION'], phase: 'proximo' },
  { path: '/informes', label: 'Informes', icon: 'reports', roles: ['INVESTIGADOR', 'RESPONSABLE_UNIDAD', 'DIRECCION'], phase: 'proximo' },
  { path: '/documentos', label: 'Documentos', icon: 'files', roles: TODOS, phase: 'proximo' },
  { path: '/calendario', label: 'Calendario', icon: 'calendar', roles: TODOS, phase: 'proximo' },
  { path: '/usuarios', label: 'Usuarios', icon: 'users', roles: ['ADMIN_TECNICO'], phase: 'base' },
  { path: '/unidades', label: 'Unidades y líneas', icon: 'building', roles: ['ADMIN_TECNICO'], phase: 'base' },
  { path: '/auditoria', label: 'Auditoría', icon: 'audit', roles: ['ADMIN_TECNICO'], phase: 'base' },
]

export function menuForRole(role: RoleCode): MenuItem[] {
  return NAVIGATION.filter(item => item.roles.includes(role))
}

export function roleCanAccess(role: RoleCode, path: string): boolean {
  const item = NAVIGATION.find(item => item.path === path)
  return !!item && item.roles.includes(role)
}
