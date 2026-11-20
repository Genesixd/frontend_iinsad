import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Unit } from '../../api/catalogs'
import { mockFetch } from '../../test/mockFetch'
import { UnitFormModal } from './UnitFormModal'

const existing: Unit = { id: 3, codigo: 'ES', nombre: 'Epidemiología Social', activa: true, total_lineas: 1, lineas_activas: 1, creado_en: '' }

describe('UnitFormModal', () => {
  it('no llama al servidor si el formulario es inválido y muestra los errores', async () => {
    const calls = mockFetch(() => ({ body: {} }))
    render(<UnitFormModal token="tok" onClose={vi.fn()} onSaved={vi.fn()}/>)
    await userEvent.click(screen.getByRole('button', { name: 'Crear unidad' }))
    expect(await screen.findByText('El código es obligatorio.')).toBeInTheDocument()
    expect(screen.getByText('El nombre es obligatorio.')).toBeInTheDocument()
    expect(calls).toHaveLength(0)
  })

  it('crea la unidad enviando código en mayúsculas y nombre normalizado', async () => {
    const saved = { ...existing, id: 9, codigo: 'EC' }
    const calls = mockFetch(() => ({ status: 201, body: saved }))
    const onSaved = vi.fn()
    render(<UnitFormModal token="tok" onClose={vi.fn()} onSaved={onSaved}/>)
    await userEvent.type(screen.getByLabelText(/^Código/), '  ec ')
    await userEvent.type(screen.getByLabelText(/^Nombre/), '  Epidemiología    Clínica ')
    await userEvent.click(screen.getByRole('button', { name: 'Crear unidad' }))
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(saved))
    expect(calls[0]).toMatchObject({
      method: 'POST', url: '/api/v1/usuarios/unidades/',
      body: { codigo: 'EC', nombre: 'Epidemiología Clínica', activa: true },
    })
    expect(calls[0]?.headers.get('Authorization')).toBe('Bearer tok')
  })

  it('muestra bajo el campo el error de validación que devuelve el servidor', async () => {
    mockFetch(() => ({ status: 400, body: { codigo: ['Ya existe una unidad con ese código.'] } }))
    const onSaved = vi.fn()
    render(<UnitFormModal token="tok" onClose={vi.fn()} onSaved={onSaved}/>)
    await userEvent.type(screen.getByLabelText(/^Código/), 'ES')
    await userEvent.type(screen.getByLabelText(/^Nombre/), 'Otra unidad')
    await userEvent.click(screen.getByRole('button', { name: 'Crear unidad' }))
    expect(await screen.findByText('Ya existe una unidad con ese código.')).toBeInTheDocument()
    expect(screen.getByLabelText(/^Código/)).toHaveAttribute('aria-invalid', 'true')
    expect(onSaved).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Crear unidad' })).toBeEnabled()
  })

  it('en edición precarga los datos y usa PATCH', async () => {
    const calls = mockFetch(() => ({ body: { ...existing, nombre: 'Epi Social' } }))
    const onSaved = vi.fn()
    render(<UnitFormModal token="tok" unit={existing} onClose={vi.fn()} onSaved={onSaved}/>)
    expect(screen.getByLabelText(/^Código/)).toHaveValue('ES')
    const name = screen.getByLabelText(/^Nombre/)
    await userEvent.clear(name)
    await userEvent.type(name, 'Epi Social')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(onSaved).toHaveBeenCalled())
    expect(calls[0]).toMatchObject({ method: 'PATCH', url: '/api/v1/usuarios/unidades/3/', body: { codigo: 'ES', nombre: 'Epi Social', activa: true } })
  })

  it('muestra el error general cuando la falla no es de un campo (p. ej. sin permiso)', async () => {
    mockFetch(() => ({ status: 403, body: { detail: 'No tiene permiso para realizar esta acción.' } }))
    render(<UnitFormModal token="tok" onClose={vi.fn()} onSaved={vi.fn()}/>)
    await userEvent.type(screen.getByLabelText(/^Código/), 'ZZ')
    await userEvent.type(screen.getByLabelText(/^Nombre/), 'Nueva')
    await userEvent.click(screen.getByRole('button', { name: 'Crear unidad' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No tiene permiso para realizar esta acción.')
  })
})
