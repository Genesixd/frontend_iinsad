import { describe, expect, it } from 'vitest'
import { mockFetch } from '../test/mockFetch'
import {
  createLine, createUnit, deleteLine, deleteUnit, fetchLines, fetchUnits, updateLine, updateUnit,
} from './catalogs'

const page = { count: 0, next: null, previous: null, results: [] }

describe('API de unidades', () => {
  it('lista con paginación, búsqueda y estado', async () => {
    const calls = mockFetch(() => ({ body: page }))
    await fetchUnits('tok', { page: 2, search: ' epi ', estado: 'true' })
    expect(calls[0]?.method).toBe('GET')
    expect(calls[0]?.url).toBe('/api/v1/usuarios/unidades/?page=2&search=epi&activa=true')
  })

  it('omite filtros vacíos y admite page_size', async () => {
    const calls = mockFetch(() => ({ body: page }))
    await fetchUnits('tok', { page: 1, search: '', estado: '' }, 100)
    expect(calls[0]?.url).toBe('/api/v1/usuarios/unidades/?page=1&page_size=100')
  })

  it('crea con POST', async () => {
    const calls = mockFetch(() => ({ status: 201, body: { id: 5 } }))
    await createUnit('tok', { codigo: 'EC', nombre: 'Epi', activa: true })
    expect(calls[0]).toMatchObject({ method: 'POST', url: '/api/v1/usuarios/unidades/', body: { codigo: 'EC', nombre: 'Epi', activa: true } })
  })

  it('edita con PATCH y elimina con DELETE', async () => {
    const calls = mockFetch(call => ({ status: call.method === 'DELETE' ? 204 : 200, body: {} }))
    await updateUnit('tok', 7, { activa: false })
    await deleteUnit('tok', 7)
    expect(calls[0]).toMatchObject({ method: 'PATCH', url: '/api/v1/usuarios/unidades/7/', body: { activa: false } })
    expect(calls[1]).toMatchObject({ method: 'DELETE', url: '/api/v1/usuarios/unidades/7/' })
  })
})

describe('API de líneas', () => {
  it('lista filtrando por unidad', async () => {
    const calls = mockFetch(() => ({ body: page }))
    await fetchLines('tok', { page: 1, search: '', estado: 'false', unidad: '3' })
    expect(calls[0]?.url).toBe('/api/v1/usuarios/lineas/?page=1&activa=false&unidad=3')
  })

  it('crea, edita (con motivo) y elimina', async () => {
    const calls = mockFetch(call => ({ status: call.method === 'DELETE' ? 204 : 200, body: {} }))
    await createLine('tok', { unidad: 1, codigo: 'L1', nombre: 'Línea', activa: true })
    await updateLine('tok', 4, { unidad: 2, motivo: 'Reorganización' })
    await deleteLine('tok', 4)
    expect(calls[0]).toMatchObject({ method: 'POST', url: '/api/v1/usuarios/lineas/', body: { unidad: 1, codigo: 'L1' } })
    expect(calls[1]).toMatchObject({ method: 'PATCH', url: '/api/v1/usuarios/lineas/4/', body: { unidad: 2, motivo: 'Reorganización' } })
    expect(calls[2]).toMatchObject({ method: 'DELETE', url: '/api/v1/usuarios/lineas/4/' })
  })
})
