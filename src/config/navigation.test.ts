import { describe, expect, it } from 'vitest'
import { menuForRole, roleCanAccess } from './navigation'
import { ROLE_CODES } from './roles'

// Cuentas ficticias de los cinco roles (las mismas que carga `scripts/seed_dev.py` del backend).
describe('menú por rol', () => {
  it('todos los roles ven Inicio, Documentos y Calendario', () => {
    for (const role of ROLE_CODES) {
      const paths = menuForRole(role).map(item => item.path)
      expect(paths, role).toEqual(expect.arrayContaining(['/inicio', '/documentos', '/calendario']))
    }
  })

  it('solo el administrador técnico gestiona usuarios y unidades/líneas', () => {
    for (const role of ROLE_CODES) {
      const admin = role === 'ADMIN_TECNICO'
      expect(roleCanAccess(role, '/usuarios'), role).toBe(admin)
      expect(roleCanAccess(role, '/unidades'), role).toBe(admin)
    }
  })

  it('solo el administrador técnico ve la auditoría', () => {
    for (const role of ROLE_CODES) expect(roleCanAccess(role, '/auditoria'), role).toBe(role === 'ADMIN_TECNICO')
  })

  it('el CTC no ve proyectos de investigador (hitos ni informes)', () => {
    expect(roleCanAccess('CTC', '/evaluaciones')).toBe(true)
    expect(roleCanAccess('CTC', '/hitos')).toBe(false)
    expect(roleCanAccess('CTC', '/informes')).toBe(false)
  })

  it('los cinco roles entran a Proyectos (Django decide qué proyectos ve cada uno)', () => {
    for (const role of ROLE_CODES) expect(roleCanAccess(role, '/proyectos'), role).toBe(true)
  })

  it('una ruta inexistente nunca está permitida', () => {
    for (const role of ROLE_CODES) expect(roleCanAccess(role, '/no-existe')).toBe(false)
  })
})
