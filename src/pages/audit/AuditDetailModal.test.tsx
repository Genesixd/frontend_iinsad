import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { AuditRecord } from '../../api/audit'
import { AuditDetailModal } from './AuditDetailModal'

const base: AuditRecord = {
  id: 77, ocurrido_en: '2026-11-22T15:30:00Z', accion: 'auth.login', entidad_tipo: 'Usuario', entidad_id: 1,
  antes: null, despues: null, resultado: 'EXITOSO', motivo: '', actor_usuario: 1, actor_email: 'admin@iinsad.test',
  actor_asignacion: null, actor_proceso: '', rol_codigo_snapshot: '', ambito_snapshot: '', direccion_red: '127.0.0.1', peticion_id: 'req-9',
}
const open = (extra: Partial<AuditRecord> = {}, onFilter = vi.fn()) =>
  render(<AuditDetailModal record={{ ...base, ...extra }} onClose={vi.fn()} onFilterByRequest={onFilter}/>)

describe('AuditDetailModal', () => {
  it('un inicio de sesión explica qué pasó y que no modifica datos (en vez de un vacío)', () => {
    open()
    expect(screen.getByText('admin@iinsad.test inició sesión.')).toBeInTheDocument()
    expect(screen.getByText('Es un evento de acceso: no modifica datos, solo deja constancia de que ocurrió.')).toBeInTheDocument()
    expect(screen.queryByText('Este registro no guardó datos de antes ni de después.')).not.toBeInTheDocument()
  })

  it('en eventos de acceso no muestra "Rol al actuar" (no aplica antes de elegir rol)', () => {
    open()
    expect(screen.queryByText('Rol al actuar')).not.toBeInTheDocument()
  })

  it('un login fallido resume el intento y muestra el correo en la tabla', () => {
    open({ resultado: 'FALLIDO', actor_email: null, actor_usuario: null, entidad_id: null, despues: { email: 'x@t.test' } })
    expect(screen.getByText(/Intento fallido de inicio de sesión con el correo «x@t.test»/)).toBeInTheDocument()
    expect(screen.getByText('Fallido')).toBeInTheDocument()
    expect(screen.getByText('Sistema / sin sesión')).toBeInTheDocument()
  })

  it('una edición muestra la frase, el rol con el que actuó y la tabla antes/después', () => {
    open({ accion: 'unidad.editar', entidad_tipo: 'Unidad', entidad_id: 4, antes: { nombre: 'Epi' }, despues: { nombre: 'Epi Social' },
      rol_codigo_snapshot: 'ADMIN_TECNICO', ambito_snapshot: 'GLOBAL' })
    expect(screen.getByText('admin@iinsad.test editó la unidad #4 (cambió: Nombre).')).toBeInTheDocument()
    expect(screen.getByText('ADMIN_TECNICO (GLOBAL)')).toBeInTheDocument()
    const fila = screen.getByText('Epi Social').closest('tr') as HTMLElement
    expect(within(fila).getByText('Epi')).toBeInTheDocument()
  })

  it('el motivo solo aparece cuando existe', () => {
    const { unmount } = open()
    expect(screen.queryByText('Motivo')).not.toBeInTheDocument()
    unmount()
    open({ motivo: 'Fin de gestión' })
    expect(screen.getByText('Motivo')).toBeInTheDocument()
    expect(screen.getByText('Fin de gestión')).toBeInTheDocument()
  })

  it('los datos técnicos (código de acción, IP, operación) van recogidos en un bloque desplegable', async () => {
    open()
    const bloque = screen.getByText('Datos técnicos').closest('details') as HTMLDetailsElement
    expect(bloque.open).toBe(false) // cerrado por defecto: la vista principal queda limpia
    expect(within(bloque).getByText('auth.login')).toBeInTheDocument()
    expect(within(bloque).getByText('127.0.0.1')).toBeInTheDocument()
    expect(within(bloque).getByText('req-9')).toBeInTheDocument()
    expect(within(bloque).getByText('77')).toBeInTheDocument()
    await userEvent.click(screen.getByText('Datos técnicos'))
    expect(bloque.open).toBe(true)
  })

  it('sin IP ni operación muestra un guion y no ofrece "Ver toda esta operación"', () => {
    open({ direccion_red: null, peticion_id: null })
    expect(screen.queryByRole('button', { name: /Ver toda esta operación/ })).not.toBeInTheDocument()
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2)
  })

  it('"Ver toda esta operación" entrega el ID de la operación', async () => {
    const onFilter = vi.fn()
    open({}, onFilter)
    await userEvent.click(screen.getByRole('button', { name: /Ver toda esta operación/ }))
    expect(onFilter).toHaveBeenCalledWith('req-9')
  })
})
