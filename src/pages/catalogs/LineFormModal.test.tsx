import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Line, Unit } from '../../api/catalogs'
import { mockFetch } from '../../test/mockFetch'
import { LineFormModal } from './LineFormModal'

const unit = (id: number, codigo: string, activa = true): Unit => ({ id, codigo, nombre: `Unidad ${codigo}`, activa, total_lineas: 0, lineas_activas: 0, creado_en: '' })
const units = [unit(1, 'EC'), unit(2, 'ES'), unit(3, 'XX', false)]
const line: Line = { id: 8, unidad: 1, unidad_codigo: 'EC', unidad_nombre: 'Unidad EC', codigo: 'EC-01', nombre: 'Crónicas', activa: true, creado_en: '' }

describe('LineFormModal', () => {
  it('exige unidad, código y nombre antes de llamar al servidor', async () => {
    const calls = mockFetch(() => ({ body: {} }))
    render(<LineFormModal token="tok" units={units} onClose={vi.fn()} onSaved={vi.fn()}/>)
    await userEvent.click(screen.getByRole('button', { name: 'Crear línea' }))
    expect(await screen.findByText('Selecciona la unidad a la que pertenece la línea.')).toBeInTheDocument()
    expect(screen.getByText('El código es obligatorio.')).toBeInTheDocument()
    expect(screen.getByText('El nombre es obligatorio.')).toBeInTheDocument()
    expect(calls).toHaveLength(0)
  })

  it('solo ofrece unidades activas al crear', () => {
    render(<LineFormModal token="tok" units={units} onClose={vi.fn()} onSaved={vi.fn()}/>)
    expect(screen.getByRole('option', { name: /EC · Unidad EC/ })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /XX/ })).not.toBeInTheDocument()
  })

  it('crea la línea con la unidad elegida', async () => {
    const calls = mockFetch(() => ({ status: 201, body: { ...line, id: 20 } }))
    const onSaved = vi.fn()
    render(<LineFormModal token="tok" units={units} onClose={vi.fn()} onSaved={onSaved}/>)
    await userEvent.selectOptions(screen.getByLabelText('Unidad'), '2')
    await userEvent.type(screen.getByLabelText(/^Código/), 'es-01')
    await userEvent.type(screen.getByLabelText(/^Nombre/), 'Determinantes   sociales')
    await userEvent.click(screen.getByRole('button', { name: 'Crear línea' }))
    await waitFor(() => expect(onSaved).toHaveBeenCalled())
    expect(calls[0]).toMatchObject({
      method: 'POST', url: '/api/v1/usuarios/lineas/',
      body: { unidad: 2, codigo: 'ES-01', nombre: 'Determinantes sociales', activa: true },
    })
  })

  it('preselecciona la unidad indicada', () => {
    render(<LineFormModal token="tok" units={units} defaultUnit={2} onClose={vi.fn()} onSaved={vi.fn()}/>)
    expect(screen.getByLabelText('Unidad')).toHaveValue('2')
  })

  it('al cambiar de unidad pide el motivo y lo envía', async () => {
    const calls = mockFetch(() => ({ body: { ...line, unidad: 2 } }))
    const onSaved = vi.fn()
    render(<LineFormModal token="tok" units={units} line={line} onClose={vi.fn()} onSaved={onSaved}/>)
    expect(screen.queryByLabelText(/Motivo/)).not.toBeInTheDocument()

    await userEvent.selectOptions(screen.getByLabelText('Unidad'), '2')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(await screen.findByText('Indica el motivo para cambiar la línea de unidad.')).toBeInTheDocument()
    expect(calls).toHaveLength(0)

    await userEvent.type(screen.getByLabelText(/Motivo/), 'Reorganización')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(onSaved).toHaveBeenCalled())
    expect(calls[0]).toMatchObject({ method: 'PATCH', url: '/api/v1/usuarios/lineas/8/', body: { unidad: 2, motivo: 'Reorganización' } })
  })

  it('sin cambiar de unidad no envía motivo', async () => {
    const calls = mockFetch(() => ({ body: line }))
    render(<LineFormModal token="tok" units={units} line={line} onClose={vi.fn()} onSaved={vi.fn()}/>)
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(calls).toHaveLength(1))
    expect(calls[0]?.body).not.toHaveProperty('motivo')
  })

  it('muestra los errores del servidor junto a cada campo', async () => {
    mockFetch(() => ({ status: 400, body: { nombre: ['Ya existe una línea con ese nombre en esta unidad.'], unidad: ['La unidad está inactiva: no admite líneas activas.'] } }))
    render(<LineFormModal token="tok" units={units} defaultUnit={1} onClose={vi.fn()} onSaved={vi.fn()}/>)
    await userEvent.type(screen.getByLabelText(/^Código/), 'L9')
    await userEvent.type(screen.getByLabelText(/^Nombre/), 'Repetida')
    await userEvent.click(screen.getByRole('button', { name: 'Crear línea' }))
    expect(await screen.findByText('Ya existe una línea con ese nombre en esta unidad.')).toBeInTheDocument()
    expect(screen.getByText('La unidad está inactiva: no admite líneas activas.')).toBeInTheDocument()
  })
})
