import { describe, expect, it } from 'vitest'
import { mockFetch } from '../test/mockFetch'
import { EMPTY_AUDIT_FILTERS, exportAudit, exportFileName, fetchAudit } from './audit'

const page = { count: 0, next: null, previous: null, results: [] }

describe('fetchAudit', () => {
  it('sin filtros solo pide la página', async () => {
    const calls = mockFetch(() => ({ body: page }))
    await fetchAudit('tok', EMPTY_AUDIT_FILTERS)
    expect(calls[0]).toMatchObject({ method: 'GET', url: '/api/v1/auditoria/registros/?page=1' })
    expect(calls[0]?.headers.get('Authorization')).toBe('Bearer tok')
  })

  it('envía solo los filtros con valor, recortados', async () => {
    const calls = mockFetch(() => ({ body: page }))
    await fetchAudit('tok', {
      ...EMPTY_AUDIT_FILTERS, page: 3, search: ' reorg ', desde: '2026-11-01', hasta: '2026-11-22',
      accion: 'asignacion.revocar', entidad_tipo: 'AsignacionRol', resultado: 'EXITOSO', actor_usuario: '7',
      peticion_id: 'abc-123',
    })
    const url = new URL(calls[0]!.url, 'http://x')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      page: '3', search: 'reorg', desde: '2026-11-01', hasta: '2026-11-22', accion: 'asignacion.revocar',
      entidad_tipo: 'AsignacionRol', resultado: 'EXITOSO', actor_usuario: '7', peticion_id: 'abc-123',
    })
  })

  it('es de solo lectura: nunca usa un método de escritura', async () => {
    const calls = mockFetch(() => ({ body: page }))
    await fetchAudit('tok', EMPTY_AUDIT_FILTERS)
    expect(calls.every(call => call.method === 'GET')).toBe(true)
  })
})

describe('exportAudit', () => {
  it('pide el archivo con los filtros, sin la página, y el formato', async () => {
    const calls = mockFetch(() => ({ body: 'DATOS' }))
    const blob = await exportAudit('tok', { ...EMPTY_AUDIT_FILTERS, page: 4, accion: 'asignacion.revocar', actor_usuario: '7', desde: '2026-11-01' }, 'xlsx')
    const url = new URL(calls[0]!.url, 'http://x')
    expect(url.pathname).toBe('/api/v1/auditoria/registros/exportar/')
    expect(Object.fromEntries(url.searchParams)).toEqual({ accion: 'asignacion.revocar', actor_usuario: '7', desde: '2026-11-01', formato: 'xlsx' })
    expect(calls[0]).toMatchObject({ method: 'GET' })
    expect(calls[0]?.headers.get('Authorization')).toBe('Bearer tok')
    expect(blob.size).toBeGreaterThan(0)
    expect(await blob.text()).toContain('DATOS')
  })

  it('pide PDF cuando se elige PDF', async () => {
    const calls = mockFetch(() => ({ body: 'x' }))
    await exportAudit('tok', EMPTY_AUDIT_FILTERS, 'pdf')
    expect(new URL(calls[0]!.url, 'http://x').searchParams.get('formato')).toBe('pdf')
  })

  it('propaga el error del servidor con su mensaje', async () => {
    mockFetch(() => ({ status: 400, body: { detail: 'Hay 12000 registros y el máximo por exportación es 10000.' } }))
    await expect(exportAudit('tok', EMPTY_AUDIT_FILTERS, 'xlsx')).rejects.toMatchObject({ status: 400, message: expect.stringContaining('máximo por exportación') })
  })

  it('un 403 (sin permiso) llega como error', async () => {
    mockFetch(() => ({ status: 403, body: { detail: 'No tiene permiso para realizar esta acción.' } }))
    await expect(exportAudit('tok', EMPTY_AUDIT_FILTERS, 'pdf')).rejects.toMatchObject({ status: 403 })
  })

  it('un error de formato del servidor expone el campo', async () => {
    mockFetch(() => ({ status: 400, body: { formato: ['Formato no válido. Usa xlsx o pdf.'] } }))
    await expect(exportAudit('tok', EMPTY_AUDIT_FILTERS, 'xlsx')).rejects.toMatchObject({ fields: { formato: ['Formato no válido. Usa xlsx o pdf.'] } })
  })
})

describe('exportFileName', () => {
  it('arma auditoria_AAAAMMDD_HHMM con la extensión del formato', () => {
    const fecha = new Date(2026, 10, 5, 9, 7) // 5-nov-2026 09:07
    expect(exportFileName('xlsx', fecha)).toBe('auditoria_20261105_0907.xlsx')
    expect(exportFileName('pdf', fecha)).toBe('auditoria_20261105_0907.pdf')
  })
})
