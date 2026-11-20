import { describe, expect, it } from 'vitest'
import { mockFetch } from '../test/mockFetch'
import { ApiError, apiRequest, fieldErrorsFrom } from './http'

describe('fieldErrorsFrom', () => {
  it('conserva los errores por campo de Django', () => {
    expect(fieldErrorsFrom({ codigo: ['Ya existe.'], nombre: ['Obligatorio.'] }))
      .toEqual({ codigo: ['Ya existe.'], nombre: ['Obligatorio.'] })
  })

  it('ignora `detail` y respuestas que no son objetos', () => {
    expect(fieldErrorsFrom({ detail: 'Sin permiso' })).toEqual({})
    expect(fieldErrorsFrom(null)).toEqual({})
    expect(fieldErrorsFrom(['x'])).toEqual({})
  })
})

describe('apiRequest', () => {
  it('envía el token Bearer y el cuerpo JSON', async () => {
    const calls = mockFetch(() => ({ body: { ok: true } }))
    await apiRequest('/x/', { method: 'POST', body: JSON.stringify({ a: 1 }) }, 'tok')
    expect(calls[0]?.headers.get('Authorization')).toBe('Bearer tok')
    expect(calls[0]?.headers.get('Content-Type')).toBe('application/json')
    expect(calls[0]?.body).toEqual({ a: 1 })
  })

  it('un 400 de validación expone mensaje y errores por campo', async () => {
    mockFetch(() => ({ status: 400, body: { codigo: ['Ya existe una unidad con ese código.'] } }))
    const failure = await apiRequest('/x/').catch((error: unknown) => error)
    expect(failure).toBeInstanceOf(ApiError)
    const error = failure as ApiError
    expect(error.status).toBe(400)
    expect(error.message).toContain('Ya existe una unidad con ese código.')
    expect(error.fields.codigo).toEqual(['Ya existe una unidad con ese código.'])
  })

  it('un 403 usa el `detail` del servidor', async () => {
    mockFetch(() => ({ status: 403, body: { detail: 'No tiene permiso para realizar esta acción.' } }))
    await expect(apiRequest('/x/')).rejects.toMatchObject({ status: 403, message: 'No tiene permiso para realizar esta acción.' })
  })

  it('un 204 devuelve undefined', async () => {
    mockFetch(() => ({ status: 204 }))
    await expect(apiRequest('/x/', { method: 'DELETE' })).resolves.toBeUndefined()
  })
})
