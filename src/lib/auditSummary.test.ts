import { describe, expect, it } from 'vitest'
import type { AuditRecord } from '../api/audit'
import { describeEvent, isAccessEvent } from './auditSummary'

const base: AuditRecord = {
  id: 1, ocurrido_en: '2026-11-22T15:30:00Z', accion: 'unidad.crear', entidad_tipo: 'Unidad', entidad_id: 4,
  antes: null, despues: null, resultado: 'EXITOSO', motivo: '', actor_usuario: 1, actor_email: 'admin@iinsad.test',
  actor_asignacion: 1, actor_proceso: '', rol_codigo_snapshot: 'ADMIN_TECNICO', ambito_snapshot: 'GLOBAL',
  direccion_red: '127.0.0.1', peticion_id: 'req-1',
}
const record = (extra: Partial<AuditRecord>): AuditRecord => ({ ...base, ...extra })

describe('describeEvent', () => {
  it('inicio de sesión exitoso', () => {
    expect(describeEvent(record({ accion: 'auth.login', entidad_tipo: 'Usuario', entidad_id: 1 }))).toBe('admin@iinsad.test inició sesión.')
  })

  it('inicio de sesión fallido: indica el correo intentado y que no hubo sesión', () => {
    const text = describeEvent(record({ accion: 'auth.login', resultado: 'FALLIDO', actor_email: null, actor_usuario: null, despues: { email: 'x@t.test' } }))
    expect(text).toBe('Intento fallido de inicio de sesión con el correo «x@t.test». No se abrió ninguna sesión.')
  })

  it('cierre de sesión', () => {
    expect(describeEvent(record({ accion: 'auth.logout' }))).toContain('cerró sesión')
  })

  it('crear usuario muestra el correo creado', () => {
    expect(describeEvent(record({ accion: 'usuario.crear', entidad_tipo: 'Usuario', despues: { email: 'nuevo@t.test' } })))
      .toBe('admin@iinsad.test creó la cuenta nuevo@t.test.')
  })

  it('asignar rol indica rol, ámbito, usuario y unidad', () => {
    const text = describeEvent(record({ accion: 'asignacion.crear', entidad_tipo: 'AsignacionRol', despues: { rol: 'RESPONSABLE_UNIDAD', ambito: 'UNIDAD', usuario_id: 6, unidad_id: 2, proyecto_id: null } }))
    expect(text).toBe('admin@iinsad.test asignó el rol RESPONSABLE_UNIDAD (ámbito unidad) al usuario #6 en la unidad #2.')
  })

  it('asignar un rol sin proyecto no inventa un proyecto', () => {
    const text = describeEvent(record({ accion: 'asignacion.crear', despues: { rol: 'INVESTIGADOR', ambito: 'PROYECTO', usuario_id: 6, unidad_id: null, proyecto_id: null } }))
    expect(text).toBe('admin@iinsad.test asignó el rol INVESTIGADOR (ámbito proyecto) al usuario #6.')
  })

  it('revocar una asignación', () => {
    expect(describeEvent(record({ accion: 'asignacion.revocar', entidad_tipo: 'AsignacionRol', entidad_id: 9 })))
      .toBe('admin@iinsad.test revocó la asignación de rol #9.')
  })

  it('crear una unidad usa su código y nombre', () => {
    expect(describeEvent(record({ despues: { codigo: 'EC', nombre: 'Epidemiología Clínica', activa: true } })))
      .toBe('admin@iinsad.test creó la unidad «EC · Epidemiología Clínica».')
  })

  it('editar una unidad enumera los campos que cambiaron', () => {
    expect(describeEvent(record({ accion: 'unidad.editar', antes: { nombre: 'Epi' }, despues: { nombre: 'Epi Social' } })))
      .toBe('admin@iinsad.test editó la unidad #4 (cambió: Nombre).')
  })

  it('eliminar una línea nombra lo eliminado a partir del estado anterior', () => {
    expect(describeEvent(record({ accion: 'linea.eliminar', entidad_tipo: 'Linea', antes: { codigo: 'L1', nombre: 'IA' } })))
      .toBe('admin@iinsad.test eliminó la línea de investigación «L1 · IA».')
  })

  it('exportar auditoría resume cantidad, formato y filtros', () => {
    expect(describeEvent(record({ accion: 'auditoria.exportar', entidad_tipo: 'Auditoria', entidad_id: null, despues: { formato: 'pdf', registros: 20, filtros: { accion: 'x', desde: '2026-11-01' } } })))
      .toBe('admin@iinsad.test exportó 20 registro(s) de la auditoría a PDF con 2 filtro(s).')
    expect(describeEvent(record({ accion: 'auditoria.exportar', despues: { formato: 'xlsx', registros: 5, filtros: {} } })))
      .toContain('a XLSX sin filtros')
  })

  it('una acción desconocida igual produce una frase con su código', () => {
    expect(describeEvent(record({ accion: 'modulo.nuevo', entidad_tipo: 'Proyecto', entidad_id: 7 })))
      .toBe('admin@iinsad.test ejecutó «modulo.nuevo» sobre Proyecto #7.')
  })

  it('sin actor se atribuye al sistema', () => {
    expect(describeEvent(record({ accion: 'usuario.crear', actor_email: null, despues: { email: 'a@t.test' } }))).toBe('El sistema creó la cuenta a@t.test.')
  })
})

describe('isAccessEvent', () => {
  it('solo el login y el logout son eventos de acceso', () => {
    expect(isAccessEvent('auth.login')).toBe(true)
    expect(isAccessEvent('auth.logout')).toBe(true)
    expect(isAccessEvent('usuario.cambiar_password')).toBe(false)
  })
})
