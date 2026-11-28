// Sesión caducada, errores HTTP y regreso a la página de origen.
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiRequest, fetchAllPages, onSessionExpired } from '../api/http'
import { LoginPage } from '../pages/LoginPage'
import { mockFetch } from '../test/mockFetch'
import { AuthProvider } from './AuthProvider'
import { ProtectedRoute } from './ProtectedRoute'
import { useAuth } from './useAuth'

afterEach(() => onSessionExpired())

const failure = (promise: Promise<unknown>) => promise.then(() => null, (error: unknown) => error as ApiError)

describe('errores HTTP', () => {
  it('un 401 con sesión avisa y no convierte `code` en errores de formulario', async () => {
    mockFetch(() => ({ status: 401, body: { detail: 'Given token not valid', code: 'token_not_valid', messages: [{}] } }))
    const expired = vi.fn()
    onSessionExpired(expired)
    const error = await failure(apiRequest('/x/', {}, 'tok'))
    expect(expired).toHaveBeenCalledOnce()
    expect(error).toMatchObject({ status: 401, fields: {} })
    expect(error?.message).toMatch(/sesión terminó/)
  })

  it('un 401 al iniciar sesión (sin token) no cierra ninguna sesión y muestra el motivo', async () => {
    mockFetch(() => ({ status: 401, body: { detail: 'Credenciales incorrectas.' } }))
    const expired = vi.fn()
    onSessionExpired(expired)
    expect((await failure(apiRequest('/x/')))?.message).toBe('Credenciales incorrectas.')
    expect(expired).not.toHaveBeenCalled()
  })

  it('una respuesta correcta que no es JSON se explica', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response('<html>', { status: 200 }))))
    expect((await failure(apiRequest('/x/')))?.message).toMatch(/formato inesperado/)
  })

  it('fetchAllPages recorre todas las páginas', async () => {
    const calls = mockFetch(call => {
      const page = Number(new URL(call.url, 'http://x').searchParams.get('page'))
      return { body: { next: page < 3 ? 'hay más' : null, results: [page] } }
    })
    expect(await fetchAllPages<number>('/cosas/', { activa: 'true' }, 'tok')).toEqual([1, 2, 3])
    expect(calls[2]?.url).toContain('page_size=100')
    expect(calls[2]?.url).toContain('activa=true')
  })
})

function Private() {
  const { session } = useAuth()
  return <button type="button" onClick={() => void apiRequest('/datos/', {}, session!.token!).catch(() => undefined)}>Pedir datos</button>
}

describe('sesión caducada', () => {
  it('vuelve al acceso, lo explica y después de entrar regresa a la misma página', async () => {
    mockFetch(call => {
      if (call.url.includes('/auth/login/')) return { body: { access: 'tok', refresh: 'r' } }
      if (call.url.includes('/auth/me/')) return { body: { id: 1, email: 'a@t.test', persona: null, roles: ['CTC'], asignaciones: [] } }
      return { status: 401, body: { detail: 'La sesión fue revocada.' } }
    })
    render(<AuthProvider><MemoryRouter initialEntries={['/privada']}><Routes>
      <Route path="/login" element={<LoginPage/>}/>
      <Route element={<ProtectedRoute/>}><Route path="/privada" element={<Private/>}/></Route>
      <Route path="/inicio" element={<p>Inicio</p>}/>
    </Routes></MemoryRouter></AuthProvider>)

    const enter = async () => {
      await userEvent.type(screen.getByLabelText(/Correo/), 'a@t.test')
      await userEvent.type(screen.getByLabelText(/Contraseña/), 'x')
      await userEvent.click(screen.getByRole('button', { name: /Ingresar/ }))
    }
    await enter()
    await userEvent.click(await screen.findByRole('button', { name: 'Pedir datos' }))
    expect(await screen.findByText(/Tu sesión terminó/)).toBeInTheDocument()
    await enter()
    expect(await screen.findByRole('button', { name: 'Pedir datos' })).toBeInTheDocument()
  })
})
