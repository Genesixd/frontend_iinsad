export const ROLES = {
  INVESTIGADOR: 'Investigador',
  RESPONSABLE_UNIDAD: 'Responsable de Unidad',
  CTC: 'Miembro del CTC',
  DIRECCION: 'Dirección',
  ADMIN_TECNICO: 'Administrador técnico',
} as const

export type RoleCode = keyof typeof ROLES

export const ROLE_CODES = Object.keys(ROLES) as RoleCode[]

export const isRoleCode = (value: string): value is RoleCode => value in ROLES

export const ROLE_DESCRIPTIONS: Record<RoleCode, string> = {
  INVESTIGADOR: 'Registra propuestas, organiza tareas y presenta avances y evidencias.',
  RESPONSABLE_UNIDAD: 'Supervisa los proyectos y valida avances de su unidad.',
  CTC: 'Consulta y evalúa propuestas designadas para revisión científica.',
  DIRECCION: 'Supervisa la cartera institucional y los avales correspondientes.',
  ADMIN_TECNICO: 'Administra cuentas, roles y catálogos de la institución.',
}
