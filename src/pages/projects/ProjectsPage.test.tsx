import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { ProjectRow } from '../../api/projects'
import type { RoleCode } from '../../config/roles'
import { mockFetch, type Call } from '../../test/mockFetch'
import { UNITS, page, project, renderRoute } from '../../test/projects'

const row = (id: number, extra: Partial<ProjectRow> = {}): ProjectRow => ({ ...project(), id, ...extra })

const ROWS = [
  row(7, { titulo: 'Chagas en el valle', estado_propuesta: 'BORRADOR' }),
  row(8, { titulo: 'Anemia infantil', estado_propuesta: 'EN_REVISION' }),
  row(9, { titulo: 'Proyecto antiguo', origen: 'HISTORICO', estado_propuesta: null, codigo: 'IINSAD-001' }),
  row(10, { titulo: 'Registro erróneo', anulado: true }),
]

function api(rows = ROWS, count = rows.length) {
  return mockFetch(call => {
    if (call.url.includes('/usuarios/unidades/')) return { body: UNITS }
    if (call.url.includes('/proyectos/7/')) return { body: project() }
    return { body: page(rows, count) }
  })
}

const listCalls = (calls: Call[]) => calls.filter(call => /\/api\/v1\/proyectos\/\?/.test(call.url))
const lastQuery = (calls: Call[]) => Object.fromEntries(new URL(listCalls(calls).at(-1)!.url, 'http://x').searchParams)

describe('ProjectsPage: listado', () => {
  it('muestra los proyectos con su estado y pide los datos con el token', async () => {
    const calls = api()
    renderRoute('/proyectos')
    const table = within(await screen.findByRole('table'))
    expect(table.getByRole('link', { name: 'Chagas en el valle' })).toHaveAttribute('href', '/proyectos/7')
    expect(table.getByText('Borrador')).toBeInTheDocument()
    expect(table.getByText('En revisión')).toBeInTheDocument()
    expect(table.getByText('Proyecto histórico incorporado')).toBeInTheDocument()
    expect(table.getByText('IINSAD-001')).toBeInTheDocument()
    expect(table.getByText('Anulado')).toBeInTheDocument()
    expect(listCalls(calls)[0]?.headers.get('Authorization')).toBe('Bearer tok')
    expect(lastQuery(calls)).toEqual({ page: '1' })
  })

  it('envía al servidor los filtros de estado, unidad, participación y búsqueda, y los limpia', async () => {
    const calls = api()
    renderRoute('/proyectos')
    await screen.findByRole('table')
    await userEvent.selectOptions(screen.getByLabelText('Filtrar por estado de propuesta'), 'EN_CORRECCION')
    await waitFor(() => expect(lastQuery(calls)).toEqual({ page: '1', estado_propuesta: 'EN_CORRECCION' }))
    await userEvent.selectOptions(screen.getByLabelText('Filtrar por unidad'), '2')
    await userEvent.click(screen.getByLabelText(/Solo donde participo/))
    await userEvent.type(screen.getByLabelText('Buscar proyectos'), '  anemia ')
    await userEvent.click(screen.getByRole('button', { name: 'Buscar' }))
    await waitFor(() => expect(lastQuery(calls)).toEqual({
      page: '1', estado_propuesta: 'EN_CORRECCION', unidad: '2', persona: '5', search: 'anemia',
    }))

    await userEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
    await waitFor(() => expect(lastQuery(calls)).toEqual({ page: '1' }))
    expect(screen.getByLabelText('Buscar proyectos')).toHaveValue('')
    expect(screen.queryByRole('button', { name: 'Limpiar filtros' })).not.toBeInTheDocument()
  })

  it('buscar sin cambiar nada no deja la pantalla cargando', async () => {
    const calls = api()
    renderRoute('/proyectos')
    await screen.findByRole('table')
    await userEvent.click(screen.getByRole('button', { name: 'Buscar' }))
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.queryByText('Cargando proyectos…')).not.toBeInTheDocument()
    expect(listCalls(calls)).toHaveLength(1)
  })

  it('pagina en el servidor', async () => {
    const calls = api(ROWS, 45)
    renderRoute('/proyectos')
    expect(await screen.findByText('Página 1 de 3')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    await waitFor(() => expect(lastQuery(calls)).toEqual({ page: '2' }))
  })

  it.each<[RoleCode, boolean]>([
    ['INVESTIGADOR', true], ['ADMIN_TECNICO', true], ['DIRECCION', false], ['RESPONSABLE_UNIDAD', false], ['CTC', false],
  ])('el rol %s %s el botón «Nueva propuesta»', async (role, visible) => {
    api()
    renderRoute('/proyectos', { role })
    await screen.findByRole('table')
    expect(!!screen.queryByRole('button', { name: 'Nueva propuesta' })).toBe(visible)
  })

  it('explica al CTC por qué su lista está vacía', async () => {
    api([])
    renderRoute('/proyectos', { role: 'CTC' })
    expect(await screen.findByText(/no tienes propuestas designadas/)).toBeInTheDocument()
  })

  it('distingue «sin resultados» de «sin proyectos»', async () => {
    api([])
    renderRoute('/proyectos')
    expect(await screen.findByText('Todavía no hay proyectos que puedas consultar.')).toBeInTheDocument()
    await userEvent.selectOptions(screen.getByLabelText('Filtrar por estado de propuesta'), 'APROBADA')
    expect(await screen.findByText('No hay proyectos que coincidan con los filtros.')).toBeInTheDocument()
  })

  it('muestra el error del servidor', async () => {
    mockFetch(call => call.url.includes('/unidades/') ? { body: UNITS } : { status: 403, body: { detail: 'No tiene permiso.' } })
    renderRoute('/proyectos')
    expect(await screen.findByRole('alert')).toHaveTextContent('No tiene permiso.')
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('en modo demostración no consulta la API', () => {
    const calls = api()
    renderRoute('/proyectos', { demo: true })
    expect(screen.getByText('Requiere una cuenta')).toBeInTheDocument()
    expect(calls).toHaveLength(0)
  })

  it('«Ver detalle» abre el expediente', async () => {
    api()
    renderRoute('/proyectos')
    await userEvent.click(await screen.findByRole('link', { name: 'Ver detalle de Chagas en el valle' }))
    expect(await screen.findByRole('heading', { level: 2, name: 'Chagas en el valle' })).toBeInTheDocument()
  })

  it('no ofrece la persona «yo» si la cuenta no la tiene', async () => {
    api()
    renderRoute('/proyectos', { role: 'ADMIN_TECNICO', persona: null })
    await screen.findByRole('table')
    expect(screen.queryByLabelText(/Solo donde participo/)).not.toBeInTheDocument()
  })
})
