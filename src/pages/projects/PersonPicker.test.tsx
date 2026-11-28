import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { mockFetch } from '../../test/mockFetch'
import { page } from '../../test/projects'
import { PersonPicker } from './PersonPicker'

const PEOPLE = [
  { id: 1, nombre_completo: 'Juan Pérez', procedencia: 'UMSA' },
  { id: 2, nombre_completo: 'Juana Condori', procedencia: '' },
]

const field = () => screen.getByRole('combobox', { name: 'Persona' })
const server = (body: unknown = page(PEOPLE), status = 200) => mockFetch(() => ({ status, body }))

describe('PersonPicker', () => {
  it('no consulta con menos de dos letras', async () => {
    const calls = server()
    render(<PersonPicker token="tok" label="Persona" value={null} onChange={vi.fn()}/>)
    await userEvent.type(field(), 'j')
    expect(screen.getByText('Escribe al menos 2 letras.')).toBeInTheDocument()
    await new Promise(resolve => setTimeout(resolve, 400))
    expect(calls).toHaveLength(0)
  })

  it('busca una sola vez al terminar de escribir y entrega la persona elegida', async () => {
    const calls = server()
    const onChange = vi.fn()
    render(<PersonPicker token="tok" label="Persona" value={null} onChange={onChange}/>)
    await userEvent.type(field(), 'juan')
    await userEvent.click(await screen.findByRole('option', { name: 'Juan Pérez · UMSA' }))
    expect(onChange).toHaveBeenCalledWith(PEOPLE[0])
    expect(calls).toHaveLength(1)
    expect(calls[0]?.url).toBe('/api/v1/proyectos/personas/?search=juan')
    expect(calls[0]?.headers.get('Authorization')).toBe('Bearer tok')
  })

  it('se puede elegir con el teclado y Enter no envía el formulario que lo contiene', async () => {
    server()
    const onChange = vi.fn()
    const onSubmit = vi.fn((event: { preventDefault: () => void }) => event.preventDefault())
    render(<form onSubmit={onSubmit}><PersonPicker token="tok" label="Persona" value={null} onChange={onChange}/><button type="submit">Enviar</button></form>)
    await userEvent.type(field(), 'juan{Enter}')
    await screen.findByRole('option', { name: 'Juana Condori' })
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}')
    expect(onChange).toHaveBeenCalledWith(PEOPLE[1])
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('Escape cierra la lista sin llegar al cuadro de diálogo', async () => {
    server()
    const onWindowKey = vi.fn()
    window.addEventListener('keydown', onWindowKey)
    render(<PersonPicker token="tok" label="Persona" value={null} onChange={vi.fn()}/>)
    await userEvent.type(field(), 'juan')
    await screen.findByRole('option', { name: 'Juana Condori' })
    onWindowKey.mockClear()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(onWindowKey).not.toHaveBeenCalled()
    window.removeEventListener('keydown', onWindowKey)
  })

  it('avisa cuando no hay coincidencias y cuando falta ver resultados', async () => {
    server(page([]))
    const { unmount } = render(<PersonPicker token="tok" label="Persona" value={null} onChange={vi.fn()}/>)
    await userEvent.type(field(), 'zz')
    expect(await screen.findByText(/No hay personas que coincidan/)).toBeInTheDocument()
    unmount()
    server(page(PEOPLE, 30))
    render(<PersonPicker token="tok" label="Persona" value={null} onChange={vi.fn()}/>)
    await userEvent.type(field(), 'ju')
    expect(await screen.findByText(/Mostrando 2 de 30/)).toBeInTheDocument()
  })

  it('muestra el error del servidor', async () => {
    server({ detail: 'Sin permiso.' }, 403)
    render(<PersonPicker token="tok" label="Persona" value={null} onChange={vi.fn()}/>)
    await userEvent.type(field(), 'juan')
    expect(await screen.findByText('Sin permiso.')).toBeInTheDocument()
  })

  it('la persona elegida se puede quitar', async () => {
    server()
    const onChange = vi.fn()
    render(<PersonPicker token="tok" label="Persona" value={PEOPLE[0]!} onChange={onChange}/>)
    await userEvent.click(screen.getByRole('button', { name: 'Quitar a Juan Pérez' }))
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(null))
  })
})
