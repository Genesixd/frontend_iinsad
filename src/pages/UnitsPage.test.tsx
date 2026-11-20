import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue, type Session } from '../auth/auth-context'
import type { RoleCode } from '../config/roles'
import { mockFetch, type Call } from '../test/mockFetch'
import { UnitsPage } from './UnitsPage'

const unidad = (id: number, codigo: string, nombre: string, extra = {}) =>
  ({ id, codigo, nombre, activa: true, total_lineas: 0, lineas_activas: 0, creado_en: '', ...extra })
const linea = (id: number, unidad_id: number, codigo: string, nombre: string) =>
  ({ id, unidad: unidad_id, unidad_codigo: 'EC', unidad_nombre: 'Epidemiología Clínica', codigo, nombre, activa: true, creado_en: '' })
const page = (results: unknown[]) => ({ count: results.length, next: null, previous: null, results })

function renderPage(role: RoleCode = 'ADMIN_TECNICO', demo = false) {
  const session: Session = {
    profile: { id: 1, email: 'admin@iinsad.test', persona: null, roles: [role], asignaciones: [] } as unknown as Session['profile'],
    roles: [role], activeRole: role, token: demo ? null : 'tok', demo,
  }
  const value: AuthContextValue = { session, signIn: vi.fn(), signInDemo: vi.fn(), setActiveRole: vi.fn(), signOut: vi.fn() }
  return render(<AuthContext.Provider value={value}><UnitsPage/></AuthContext.Provider>)
}

/** API falsa en memoria con unidades y líneas; devuelve lo que el frontend pida. */
function fakeApi(overrides: (call: Call) => { status?: number; body?: unknown } | undefined = () => undefined) {
  const units = [unidad(1, 'EC', 'Epidemiología Clínica', { total_lineas: 1, lineas_activas: 1 }), unidad(2, 'ES', 'Epidemiología Social')]
  const lines = [linea(1, 1, 'EC-01', 'Enfermedades crónicas')]
  return mockFetch(call => {
    const custom = overrides(call)
    if (custom) return custom
    if (call.method === 'GET' && call.url.includes('/unidades/')) return { body: page(units) }
    if (call.method === 'GET' && call.url.includes('/lineas/')) return { body: page(lines) }
    if (call.method === 'POST') return { status: 201, body: unidad(9, 'NU', 'Nueva') }
    if (call.method === 'DELETE') return { status: 204 }
    return { body: units[0] }
  })
}

describe('UnitsPage', () => {
  it('bloquea el acceso a roles que no son administrador técnico y no consulta la API', () => {
    const calls = fakeApi()
    renderPage('INVESTIGADOR')
    expect(screen.getByText('Acceso restringido')).toBeInTheDocument()
    expect(calls).toHaveLength(0)
  })

  it('lista las unidades desde la API con sus conteos de líneas', async () => {
    fakeApi()
    renderPage()
    expect(await screen.findByText('Epidemiología Clínica')).toBeInTheDocument()
    expect(screen.getByText('1 activa de 1')).toBeInTheDocument()
    expect(screen.getByText('2 unidades · datos consultados desde Django.')).toBeInTheDocument()
  })

  it('crea una unidad desde el formulario y recarga el listado', async () => {
    const calls = fakeApi()
    renderPage()
    await screen.findByText('Epidemiología Clínica')
    await userEvent.click(screen.getByRole('button', { name: /Nueva unidad/ }))
    const dialog = screen.getByRole('dialog')
    await userEvent.type(within(dialog).getByLabelText(/^Código/), 'nu')
    await userEvent.type(within(dialog).getByLabelText(/^Nombre/), 'Nueva')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Crear unidad' }))
    expect(await screen.findByText('Unidad NU creada.')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(calls.some(call => call.method === 'POST' && call.url.endsWith('/unidades/'))).toBe(true)
    // tras crear se vuelve a pedir la lista (carga inicial + recarga)
    expect(calls.filter(call => call.method === 'GET' && call.url.includes('/unidades/')).length).toBeGreaterThanOrEqual(2)
  })

  it('desactiva una unidad tras confirmar y envía PATCH { activa: false }', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const calls = fakeApi()
    renderPage()
    await screen.findByText('Epidemiología Clínica')
    await userEvent.click(screen.getByRole('button', { name: 'Desactivar unidad EC' }))
    expect(await screen.findByText('Unidad EC desactivada.')).toBeInTheDocument()
    expect(calls.find(call => call.method === 'PATCH')).toMatchObject({ url: '/api/v1/usuarios/unidades/1/', body: { activa: false } })
  })

  it('no hace nada si el usuario cancela la confirmación', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const calls = fakeApi()
    renderPage()
    await screen.findByText('Epidemiología Clínica')
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar unidad EC' }))
    expect(calls.some(call => call.method === 'DELETE')).toBe(false)
  })

  it('muestra el motivo cuando el servidor rechaza eliminar una unidad con líneas', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    fakeApi(call => call.method === 'DELETE'
      ? { status: 400, body: { detail: 'No se puede eliminar: hay registros que dependen de este.' } } : undefined)
    renderPage()
    await screen.findByText('Epidemiología Clínica')
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar unidad EC' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No se puede eliminar: hay registros que dependen de este.')
  })

  it('al buscar pide al servidor ?search= y vuelve a la página 1', async () => {
    const calls = fakeApi()
    renderPage()
    await screen.findByText('Epidemiología Clínica')
    await userEvent.type(screen.getByLabelText('Buscar unidades'), 'social')
    await userEvent.click(screen.getByRole('button', { name: 'Buscar' }))
    await waitFor(() => expect(calls.some(call => call.url.includes('search=social') && call.url.includes('page=1'))).toBe(true))
  })

  it('la pestaña de líneas lista, filtra por unidad y crea una línea', async () => {
    const calls = fakeApi()
    renderPage()
    await userEvent.click(await screen.findByRole('tab', { name: 'Líneas de investigación' }))
    expect(await screen.findByText('Enfermedades crónicas')).toBeInTheDocument()

    await userEvent.selectOptions(screen.getByLabelText('Filtrar líneas por unidad'), '1')
    await waitFor(() => expect(calls.some(call => call.url.includes('/lineas/') && call.url.includes('unidad=1'))).toBe(true))

    await userEvent.click(screen.getByRole('button', { name: /Nueva línea/ }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByLabelText('Unidad')).toHaveValue('1') // preselecciona la unidad del filtro
    await userEvent.type(within(dialog).getByLabelText(/^Código/), 'ec-02')
    await userEvent.type(within(dialog).getByLabelText(/^Nombre/), 'Ensayos clínicos')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Crear línea' }))
    await waitFor(() => expect(calls.some(call => call.method === 'POST' && call.url.endsWith('/lineas/'))).toBe(true))
    expect(calls.find(call => call.method === 'POST')?.body).toMatchObject({ unidad: 1, codigo: 'EC-02', nombre: 'Ensayos clínicos' })
  })

  it('en modo demostración muestra datos ficticios, no llama a la API y desactiva las acciones', () => {
    const calls = fakeApi()
    renderPage('ADMIN_TECNICO', true)
    expect(screen.getByText('Epidemiología Clínica')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Nueva unidad/ })).toBeDisabled()
    expect(calls).toHaveLength(0)
  })
})
