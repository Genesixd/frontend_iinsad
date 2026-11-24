import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Assignment, UserRow } from '../../api/users'
import { mockFetch, type Call } from '../../test/mockFetch'
import { UserRolesModal } from './UserRolesModal'

const asignacion = (id: number, rol: string, extra: Partial<Assignment> = {}): Assignment => ({
  id, usuario: 5, rol, ambito: 'GLOBAL', unidad: null, unidad_nombre: null, proyecto_id: null,
  vigente_desde: null, vigente_hasta: null, revocada_en: null, motivo: '', vigente: true, ...extra,
})

const usuario = (asignaciones: Assignment[]): UserRow => ({
  id: 5, email: 'a@iinsad.test', persona: { nombres: 'Ana', apellido_paterno: 'Quispe', apellido_materno: '', nombre_completo: 'Ana Quispe' },
  is_active: true, activado_en: '2026-01-01', asignaciones,
})

const unidades = { count: 0, next: null, previous: null, results: [] }
const posts = (calls: Call[]) => calls.filter(call => call.method === 'POST')

describe('UserRolesModal', () => {
  it('muestra el rechazo del servidor al revocar el último rol vigente', async () => {
    const calls = mockFetch(call => {
      if (call.method === 'GET' && call.url.includes('/unidades/')) return { body: unidades }
      if (call.url.includes('/revocar/')) return { status: 400, body: { detail: 'No se puede revocar el único rol vigente del usuario: asígnale otro primero.' } }
      return { body: {} }
    })
    render(<UserRolesModal token="tok" user={usuario([asignacion(1, 'DIRECCION')])} onClose={vi.fn()} onChanged={vi.fn()}/>)
    expect(screen.getByText(/siempre conserva al menos un rol vigente/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /Revocar/ }))
    await userEvent.type(screen.getByPlaceholderText('Motivo de la revocación'), 'Cambio de cargo')
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(await screen.findByText(/único rol vigente del usuario/)).toBeInTheDocument()
    expect(posts(calls)[0]).toMatchObject({ url: '/api/v1/usuarios/asignaciones/1/revocar/', body: { motivo: 'Cambio de cargo' } })
  })

  it('exige el motivo antes de llamar al servidor', async () => {
    const calls = mockFetch(() => ({ body: unidades }))
    render(<UserRolesModal token="tok" user={usuario([asignacion(1, 'DIRECCION'), asignacion(2, 'CTC')])} onClose={vi.fn()} onChanged={vi.fn()}/>)
    await userEvent.click(screen.getAllByRole('button', { name: /Revocar/ })[0]!)
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(await screen.findByText('Debes indicar el motivo de la revocación.')).toBeInTheDocument()
    expect(posts(calls)).toHaveLength(0)
  })

  it('muestra un Investigador sin proyecto como "sin asignar aún"', () => {
    mockFetch(() => ({ body: unidades }))
    render(<UserRolesModal token="tok" user={usuario([asignacion(1, 'INVESTIGADOR', { ambito: 'PROYECTO' })])} onClose={vi.fn()} onChanged={vi.fn()}/>)
    expect(screen.getByText('Proyecto: sin asignar aún')).toBeInTheDocument()
  })

  it('asigna el rol de Investigador sin pedir proyecto y envía proyecto_id nulo', async () => {
    const calls = mockFetch(call => {
      if (call.method === 'GET' && call.url.includes('/unidades/')) return { body: unidades }
      if (call.method === 'GET') return { body: usuario([asignacion(1, 'CTC')]) }
      return { status: 201, body: {} }
    })
    render(<UserRolesModal token="tok" user={usuario([asignacion(1, 'CTC')])} onClose={vi.fn()} onChanged={vi.fn()}/>)
    const form = screen.getByRole('button', { name: /Asignar rol/ }).closest('form') as HTMLElement
    // Investigador es el rol preseleccionado: el proyecto es opcional y no bloquea el envío.
    expect(within(form).getByLabelText(/ID del proyecto \(opcional\)/)).not.toBeRequired()
    await userEvent.click(screen.getByRole('button', { name: /Asignar rol/ }))
    await waitFor(() => expect(posts(calls)).toHaveLength(1))
    expect(posts(calls)[0]?.body).toMatchObject({ usuario: 5, rol: 'INVESTIGADOR', proyecto_id: null, unidad: null })
  })
})
