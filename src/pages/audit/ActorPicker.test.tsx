import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { mockFetch, type Call } from '../../test/mockFetch'
import { ActorPicker, type Actor } from './ActorPicker'

const usuario = (id: number, email: string, nombre: string | null) => ({
  id, email, persona: nombre ? { nombres: nombre, apellido_paterno: '', apellido_materno: '', nombre_completo: nombre } : null,
  is_active: true, activado_en: null, asignaciones: [],
})

const TODOS = [
  usuario(1, 'ana@iinsad.test', 'Ana Quispe'), usuario(2, 'luis@iinsad.test', 'Luis Mendoza'),
  usuario(3, 'marta@iinsad.test', 'Marta Rojas'), usuario(4, 'sin.nombre@iinsad.test', null),
]

/** Imita al servidor: filtra por ?search= y devuelve a lo sumo `page_size` filas, con el total real. */
function servidor(todos = TODOS, fallar = false) {
  return mockFetch((call: Call) => {
    if (fallar) return { status: 500, body: {} }
    const url = new URL(call.url, 'http://x')
    const texto = (url.searchParams.get('search') ?? '').toLowerCase()
    const hallados = todos.filter(user => `${user.email} ${user.persona?.nombre_completo ?? ''}`.toLowerCase().includes(texto))
    const tamano = Number(url.searchParams.get('page_size') ?? 20)
    return { body: { count: hallados.length, next: null, previous: null, results: hallados.slice(0, tamano) } }
  })
}

const campo = () => screen.getByRole('combobox', { name: 'Actor' })

describe('ActorPicker', () => {
  it('al enfocar muestra los primeros usuarios sin pedir toda la lista', async () => {
    const calls = servidor()
    render(<ActorPicker token="tok" value={null} onChange={vi.fn()}/>)
    await userEvent.click(campo())
    expect(await screen.findByRole('option', { name: 'Ana Quispe · ana@iinsad.test' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'sin.nombre@iinsad.test' })).toBeInTheDocument()
    const params = new URL(calls[0]!.url, 'http://x').searchParams
    expect(params.get('page_size')).toBe('8')
    expect(calls[0]?.headers.get('Authorization')).toBe('Bearer tok')
  })

  it('busca en el servidor por nombre o correo mientras se escribe', async () => {
    const calls = servidor()
    render(<ActorPicker token="tok" value={null} onChange={vi.fn()}/>)
    await userEvent.type(campo(), 'mendo')
    // la lista anterior sigue visible hasta que llega la respuesta de la búsqueda
    await waitFor(() => expect(screen.queryByRole('option', { name: /Ana Quispe/ })).not.toBeInTheDocument())
    expect(screen.getByRole('option', { name: 'Luis Mendoza · luis@iinsad.test' })).toBeInTheDocument()
    expect(calls.some(call => call.url.includes('search=mendo'))).toBe(true)
  })

  it('espera a que termine de escribir en vez de consultar con cada tecla', async () => {
    const calls = servidor()
    render(<ActorPicker token="tok" value={null} onChange={vi.fn()}/>)
    await userEvent.type(campo(), 'marta') // 5 teclas seguidas
    await screen.findByRole('option', { name: /Marta Rojas/ })
    const conTexto = calls.filter(call => new URL(call.url, 'http://x').searchParams.has('search'))
    expect(conTexto.length).toBeLessThan(5)
  })

  it('con muchos usuarios muestra solo unos pocos y avisa cuántos hay', async () => {
    const muchos = Array.from({ length: 150 }, (_, i) => usuario(i + 1, `u${i + 1}@iinsad.test`, `Usuario ${i + 1}`))
    servidor(muchos)
    render(<ActorPicker token="tok" value={null} onChange={vi.fn()}/>)
    await userEvent.click(campo())
    expect(await screen.findAllByRole('option')).toHaveLength(8)
    expect(screen.getByText('Mostrando 8 de 150. Sigue escribiendo para acotar.')).toBeInTheDocument()
  })

  it('encuentra a un usuario que no estaría entre los primeros 100', async () => {
    const muchos = Array.from({ length: 500 }, (_, i) => usuario(i + 1, `u${i + 1}@iinsad.test`, `Usuario ${i + 1}`))
    servidor(muchos)
    const onChange = vi.fn()
    render(<ActorPicker token="tok" value={null} onChange={onChange}/>)
    await userEvent.type(campo(), 'u499@')
    await userEvent.click(await screen.findByRole('option', { name: 'Usuario 499 · u499@iinsad.test' }))
    expect(onChange).toHaveBeenCalledWith({ id: 499, label: 'Usuario 499 · u499@iinsad.test' })
  })

  it('elegir una opción con el ratón entrega el usuario y cierra la lista', async () => {
    servidor()
    const onChange = vi.fn()
    render(<ActorPicker token="tok" value={null} onChange={onChange}/>)
    await userEvent.click(campo())
    await userEvent.click(await screen.findByRole('option', { name: 'Marta Rojas · marta@iinsad.test' }))
    expect(onChange).toHaveBeenCalledWith({ id: 3, label: 'Marta Rojas · marta@iinsad.test' })
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('se puede usar solo con el teclado: flechas, Enter y Escape', async () => {
    servidor()
    const onChange = vi.fn()
    render(<ActorPicker token="tok" value={null} onChange={onChange}/>)
    await userEvent.click(campo())
    await screen.findByRole('option', { name: /Ana Quispe/ })
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}')
    expect(onChange).toHaveBeenCalledWith({ id: 2, label: 'Luis Mendoza · luis@iinsad.test' })

    onChange.mockClear()
    await userEvent.click(campo())
    await screen.findByRole('listbox')
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('con un actor elegido lo muestra y permite quitarlo', async () => {
    const onChange = vi.fn()
    const actor: Actor = { id: 3, label: 'Marta Rojas · marta@iinsad.test' }
    render(<ActorPicker token="tok" value={actor} onChange={onChange}/>)
    expect(screen.getByText('Marta Rojas · marta@iinsad.test')).toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Quitar actor seleccionado' }))
    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('indica cuando nadie coincide', async () => {
    servidor()
    render(<ActorPicker token="tok" value={null} onChange={vi.fn()}/>)
    await userEvent.type(campo(), 'zzzz')
    expect(await screen.findByText('No hay usuarios que coincidan.')).toBeInTheDocument()
  })

  it('avisa si la búsqueda falla', async () => {
    servidor(TODOS, true)
    render(<ActorPicker token="tok" value={null} onChange={vi.fn()}/>)
    await userEvent.click(campo())
    expect(await screen.findByText('No se pudo buscar usuarios.')).toBeInTheDocument()
  })

  it('ignora una respuesta vieja si ya se escribió otra cosa', async () => {
    let lento = true
    mockFetch(call => {
      const texto = new URL(call.url, 'http://x').searchParams.get('search') ?? ''
      const user = texto === 'a' && lento ? usuario(9, 'viejo@iinsad.test', 'Resultado viejo') : usuario(8, 'nuevo@iinsad.test', 'Resultado nuevo')
      return { body: { count: 1, next: null, previous: null, results: [user] } }
    })
    render(<ActorPicker token="tok" value={null} onChange={vi.fn()}/>)
    await userEvent.type(campo(), 'ab')
    await waitFor(() => expect(screen.getByRole('option', { name: /Resultado nuevo/ })).toBeInTheDocument())
    lento = false
    expect(screen.queryByRole('option', { name: /Resultado viejo/ })).not.toBeInTheDocument()
  })
})
