import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { mockFetch, type Call } from '../../test/mockFetch'
import { ME, UNITS, page, project } from '../../test/projects'
import { NewProposalModal } from './NewProposalModal'

const LINES: Record<string, Array<{ id: number; codigo: string; nombre: string }>> = {
  '1': [{ id: 10, codigo: 'EC-01', nombre: 'Crónicas' }, { id: 11, codigo: 'EC-02', nombre: 'Ensayos' }],
  '2': [{ id: 20, codigo: 'ES-01', nombre: 'Determinantes' }],
}

function api(onPost?: (call: Call) => { status?: number; body?: unknown }) {
  return mockFetch(call => {
    if (call.url.includes('/usuarios/lineas/')) return { body: page(LINES[new URL(call.url, 'http://x').searchParams.get('unidad') ?? ''] ?? []) }
    if (call.url.includes('/proyectos/personas/')) return { body: page([{ id: 42, nombre_completo: 'Luis Mendoza', procedencia: '' }]) }
    if (call.method === 'POST') return onPost?.(call) ?? { status: 201, body: project() }
    return { body: {} }
  })
}

function open({ admin = false, me = ME as typeof ME | null } = {}) {
  const onClose = vi.fn()
  const onCreated = vi.fn()
  render(<NewProposalModal token="tok" units={UNITS.results} me={me} chooseInvestigator={admin} onClose={onClose} onCreated={onCreated}/>)
  return { onClose, onCreated }
}

const save = () => userEvent.click(screen.getByRole('button', { name: 'Guardar borrador' }))
const title = () => screen.getByLabelText('Título')
const unit = () => screen.getByLabelText('Unidad responsable')
const posts = (calls: Call[]) => calls.filter(call => call.method === 'POST')

describe('NewProposalModal', () => {
  it('pide unidad y título antes de llamar al servidor', async () => {
    const calls = api()
    open()
    await save()
    expect(screen.getByText('Selecciona la unidad responsable.')).toBeInTheDocument()
    expect(screen.getByText('El título es obligatorio.')).toBeInTheDocument()
    expect(posts(calls)).toHaveLength(0)
  })

  it('solo ofrece unidades activas', () => {
    api()
    open()
    expect(screen.getByRole('option', { name: /EC · Epidemiología Clínica/ })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /XX/ })).not.toBeInTheDocument()
  })

  it('el investigador queda como principal y se envían las líneas de la unidad', async () => {
    const calls = api()
    const { onCreated } = open()
    expect(screen.getByText('Ana Quispe Choque (tú)')).toBeInTheDocument()
    await userEvent.selectOptions(unit(), '1')
    await userEvent.click(await screen.findByLabelText('EC-02 · Ensayos'))
    await userEvent.type(title(), '  Chagas   en el valle ')
    await userEvent.type(screen.getByLabelText(/^Resumen/), 'Un resumen')
    await save()
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(expect.objectContaining({ id: 7 })))
    expect(posts(calls)[0]?.url).toBe('/api/v1/proyectos/')
    expect(posts(calls)[0]?.body).toEqual({
      unidad: 1, lineas: [11], investigador_principal: 5, titulo: 'Chagas en el valle', resumen: 'Un resumen',
      justificacion: '', objetivo_general: '', objetivos_especificos: '', metodologia: '', resultados_esperados: '',
      fecha_inicio_prevista: null, fecha_fin_prevista: null, referencia_institucional: '',
    })
    const lines = calls.find(call => call.url.includes('/lineas/'))!
    expect(new URL(lines.url, 'http://x').searchParams.get('activa')).toBe('true')
  })

  it('al cambiar de unidad se olvidan las líneas de la anterior', async () => {
    const calls = api()
    open()
    await userEvent.selectOptions(unit(), '1')
    await userEvent.click(await screen.findByLabelText('EC-01 · Crónicas'))
    await userEvent.selectOptions(unit(), '2')
    expect(await screen.findByLabelText('ES-01 · Determinantes')).not.toBeChecked()
    expect(screen.queryByLabelText('EC-01 · Crónicas')).not.toBeInTheDocument()
    await userEvent.type(title(), 'Otro')
    await save()
    await waitFor(() => expect(posts(calls)).toHaveLength(1))
    expect(posts(calls)[0]?.body).toMatchObject({ unidad: 2, lineas: [] })
  })

  it('rechaza una fecha de fin anterior al inicio', async () => {
    const calls = api()
    open()
    await userEvent.selectOptions(unit(), '1')
    await userEvent.type(title(), 'Fechas')
    fireEvent.change(screen.getByLabelText('Inicio previsto'), { target: { value: '2027-03-01' } })
    fireEvent.change(screen.getByLabelText('Fin previsto'), { target: { value: '2027-02-28' } })
    await save()
    expect(screen.getByText('La fecha de fin prevista no puede ser anterior al inicio.')).toBeInTheDocument()
    expect(posts(calls)).toHaveLength(0)
  })

  it('el administrador debe elegir al investigador principal', async () => {
    const calls = api()
    const { onCreated } = open({ admin: true })
    await userEvent.selectOptions(unit(), '1')
    await userEvent.type(title(), 'A nombre de otra persona')
    await save()
    expect(screen.getByText('Elige al investigador principal.')).toBeInTheDocument()
    expect(posts(calls)).toHaveLength(0)
    await userEvent.type(screen.getByRole('combobox', { name: 'Investigador principal' }), 'men')
    await userEvent.click(await screen.findByRole('option', { name: 'Luis Mendoza' }))
    await save()
    await waitFor(() => expect(onCreated).toHaveBeenCalled())
    expect(posts(calls)[0]?.body).toMatchObject({ investigador_principal: 42 })
  })

  it('un investigador sin persona asociada no puede registrar', async () => {
    const calls = api()
    open({ me: null })
    await userEvent.selectOptions(unit(), '1')
    await userEvent.type(title(), 'Sin persona')
    await save()
    expect(screen.getByText(/no tiene una persona asociada/)).toBeInTheDocument()
    expect(posts(calls)).toHaveLength(0)
  })

  it('muestra los errores del servidor y permite reintentar', async () => {
    api(() => ({ status: 400, body: { detail: 'La unidad está inactiva: no admite proyectos nuevos.' } }))
    const { onCreated } = open()
    await userEvent.selectOptions(unit(), '1')
    await userEvent.type(title(), 'Con error')
    await save()
    expect(await screen.findByRole('alert')).toHaveTextContent('La unidad está inactiva')
    expect(screen.getByRole('button', { name: 'Guardar borrador' })).toBeEnabled()
    expect(title()).toHaveValue('Con error')
    expect(onCreated).not.toHaveBeenCalled()
  })

  it('sin cambios se cierra sin preguntar', async () => {
    api()
    const confirm = vi.spyOn(window, 'confirm')
    const { onClose } = open()
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(confirm).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('con texto escrito pregunta antes de perderlo (Cancelar y Escape)', async () => {
    api()
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const { onClose } = open()
    await userEvent.type(title(), 'Algo')
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    await userEvent.keyboard('{Escape}')
    expect(confirm).toHaveBeenCalledTimes(2)
    expect(onClose).not.toHaveBeenCalled()
    confirm.mockReturnValue(true)
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(onClose).toHaveBeenCalled()
  })
})
