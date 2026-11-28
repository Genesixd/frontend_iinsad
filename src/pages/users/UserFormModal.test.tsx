import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { mockFetch, type Call } from '../../test/mockFetch'
import { UserFormModal } from './UserFormModal'

const unidades = {
  count: 2, next: null, previous: null,
  results: [
    { id: 1, codigo: 'EC', nombre: 'Epidemiología Clínica', activa: true },
    { id: 2, codigo: 'XX', nombre: 'Unidad cerrada', activa: false },
  ],
}

function api(onPost?: (call: Call) => { status?: number; body?: unknown } | undefined) {
  return mockFetch(call => {
    if (call.method === 'GET' && call.url.includes('/unidades/')) return { body: unidades }
    if (call.method === 'POST') return onPost?.(call) ?? { status: 201, body: { id: 9 } }
    return { body: {} }
  })
}

async function llenarDatos() {
  await userEvent.type(screen.getByLabelText(/^Correo/), 'nuevo@iinsad.test')
  await userEvent.type(screen.getByLabelText(/^Nombres/), 'Ana')
  await userEvent.type(screen.getByLabelText(/^Apellido paterno/), 'Quispe')
}

const crear = () => userEvent.click(screen.getByRole('button', { name: 'Crear usuario' }))
const posts = (calls: Call[]) => calls.filter(call => call.method === 'POST')

describe('UserFormModal: rol inicial (CUN-001)', () => {
  it('no deja crear la cuenta sin rol y no llama al servidor', async () => {
    const calls = api()
    render(<UserFormModal token="tok" onClose={vi.fn()} onSaved={vi.fn()}/>)
    await llenarDatos()
    await crear()
    expect(await screen.findByText('Selecciona el rol inicial de la cuenta.')).toBeInTheDocument()
    expect(posts(calls)).toHaveLength(0)
  })

  it('crea con un rol global sin enviar unidad', async () => {
    const calls = api()
    const onSaved = vi.fn()
    render(<UserFormModal token="tok" onClose={vi.fn()} onSaved={onSaved}/>)
    await llenarDatos()
    await userEvent.selectOptions(screen.getByLabelText(/^Rol inicial/), 'CTC')
    await crear()
    await waitFor(() => expect(onSaved).toHaveBeenCalled())
    const body = posts(calls)[0]?.body as Record<string, unknown>
    expect(posts(calls)[0]?.url).toBe('/api/v1/usuarios/usuarios/')
    expect(body).toMatchObject({ email: 'nuevo@iinsad.test', rol: 'CTC' })
    expect(body).not.toHaveProperty('unidad')
  })

  it('el rol de unidad pide la unidad (solo activas) y la envía', async () => {
    const calls = api()
    const onSaved = vi.fn()
    render(<UserFormModal token="tok" onClose={vi.fn()} onSaved={onSaved}/>)
    await llenarDatos()
    expect(screen.queryByLabelText(/^Unidad/)).not.toBeInTheDocument()
    await userEvent.selectOptions(screen.getByLabelText(/^Rol inicial/), 'RESPONSABLE_UNIDAD')

    await crear()
    expect(await screen.findByText('Este rol requiere indicar la unidad.')).toBeInTheDocument()
    expect(posts(calls)).toHaveLength(0)

    expect(await screen.findByRole('option', { name: /EC · Epidemiología Clínica/ })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /XX/ })).not.toBeInTheDocument() // unidad inactiva
    await userEvent.selectOptions(screen.getByLabelText(/^Unidad/), '1')
    await crear()
    await waitFor(() => expect(onSaved).toHaveBeenCalled())
    expect(posts(calls)[0]?.body).toMatchObject({ rol: 'RESPONSABLE_UNIDAD', unidad: 1 })
  })

  it('el Investigador se crea sin proyecto y se explica por qué', async () => {
    const calls = api()
    const onSaved = vi.fn()
    render(<UserFormModal token="tok" onClose={vi.fn()} onSaved={onSaved}/>)
    await llenarDatos()
    await userEvent.selectOptions(screen.getByLabelText(/^Rol inicial/), 'INVESTIGADOR')
    expect(screen.getByText(/puede limitarse a un proyecto/)).toBeInTheDocument()
    expect(screen.queryByLabelText(/^Unidad/)).not.toBeInTheDocument()
    await crear()
    await waitFor(() => expect(onSaved).toHaveBeenCalled())
    const body = posts(calls)[0]?.body as Record<string, unknown>
    expect(body.rol).toBe('INVESTIGADOR')
    expect(body).not.toHaveProperty('proyecto_id')
  })

  it('cambiar de rol limpia la unidad elegida', async () => {
    api()
    render(<UserFormModal token="tok" onClose={vi.fn()} onSaved={vi.fn()}/>)
    await userEvent.selectOptions(screen.getByLabelText(/^Rol inicial/), 'RESPONSABLE_UNIDAD')
    await screen.findByRole('option', { name: /EC ·/ })
    await userEvent.selectOptions(screen.getByLabelText(/^Unidad/), '1')
    await userEvent.selectOptions(screen.getByLabelText(/^Rol inicial/), 'DIRECCION')
    await userEvent.selectOptions(screen.getByLabelText(/^Rol inicial/), 'RESPONSABLE_UNIDAD')
    expect(screen.getByLabelText(/^Unidad/)).toHaveValue('')
  })

  it('muestra junto al campo el error del servidor sobre rol/unidad', async () => {
    api(() => ({ status: 400, body: { unidad: ['La unidad está inactiva.'] } }))
    render(<UserFormModal token="tok" onClose={vi.fn()} onSaved={vi.fn()}/>)
    await llenarDatos()
    await userEvent.selectOptions(screen.getByLabelText(/^Rol inicial/), 'RESPONSABLE_UNIDAD')
    await screen.findByRole('option', { name: /EC ·/ })
    await userEvent.selectOptions(screen.getByLabelText(/^Unidad/), '1')
    await crear()
    expect(await screen.findByText('La unidad está inactiva.')).toBeInTheDocument()
    expect(screen.getByLabelText(/^Unidad/)).toHaveAttribute('aria-invalid', 'true')
  })

  it('otros errores del servidor (p. ej. correo repetido) salen en el aviso general', async () => {
    api(() => ({ status: 400, body: { email: ['Ya existe usuario con este email.'] } }))
    render(<UserFormModal token="tok" onClose={vi.fn()} onSaved={vi.fn()}/>)
    await llenarDatos()
    await userEvent.selectOptions(screen.getByLabelText(/^Rol inicial/), 'DIRECCION')
    await crear()
    expect(await screen.findByRole('alert')).toHaveTextContent('Ya existe usuario con este email.')
  })

  it('en edición no pide rol ni consulta unidades y usa PATCH', async () => {
    const calls = mockFetch(() => ({ body: {} }))
    const user = { id: 5, email: 'a@iinsad.test', persona: { nombres: 'A', apellido_paterno: 'B', apellido_materno: '' }, is_active: true, activado_en: null, asignaciones: [] }
    const onSaved = vi.fn()
    render(<UserFormModal token="tok" user={user} onClose={vi.fn()} onSaved={onSaved}/>)
    expect(screen.queryByLabelText(/^Rol inicial/)).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(onSaved).toHaveBeenCalled())
    expect(calls.map(call => call.method)).toEqual(['PATCH'])
  })
})
