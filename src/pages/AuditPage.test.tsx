import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { AuditRecord } from '../api/audit'
import { AuthContext, type AuthContextValue, type Session } from '../auth/auth-context'
import type { RoleCode } from '../config/roles'
import { mockFetch, type Call } from '../test/mockFetch'
import { AuditPage } from './AuditPage'

const registro = (id: number, extra: Partial<AuditRecord> = {}): AuditRecord => ({
  id, ocurrido_en: '2026-11-22T15:30:00Z', accion: 'unidad.crear', entidad_tipo: 'Unidad', entidad_id: 4,
  antes: null, despues: { codigo: 'EC', nombre: 'Epidemiología Clínica' }, resultado: 'EXITOSO', motivo: '',
  actor_usuario: 1, actor_email: 'admin@iinsad.test', actor_asignacion: 1, actor_proceso: '',
  rol_codigo_snapshot: 'ADMIN_TECNICO', ambito_snapshot: 'GLOBAL', direccion_red: '127.0.0.1', peticion_id: 'req-1', ...extra,
})

const page = (results: AuditRecord[], count = results.length) => ({ count, next: null, previous: null, results })
const usuarios = {
  count: 2, next: null, previous: null,
  results: [
    { id: 1, email: 'admin@iinsad.test', persona: { nombres: 'Admin', apellido_paterno: 'Técnico', apellido_materno: '', nombre_completo: 'Admin Técnico' }, is_active: true, activado_en: '2026-01-01', asignaciones: [] },
    { id: 2, email: 'ctc@iinsad.test', persona: null, is_active: true, activado_en: '2026-01-01', asignaciones: [] },
  ],
}

function renderPage(role: RoleCode = 'ADMIN_TECNICO', demo = false) {
  const session: Session = {
    profile: { id: 1, email: 'admin@iinsad.test', persona: null, roles: [role], asignaciones: [] } as unknown as Session['profile'],
    roles: [role], activeRole: role, token: demo ? null : 'tok', demo,
  }
  const value: AuthContextValue = { session, signIn: vi.fn(), signInDemo: vi.fn(), setActiveRole: vi.fn(), signOut: vi.fn() }
  return render(<AuthContext.Provider value={value}><AuditPage/></AuthContext.Provider>)
}

function api(records: AuditRecord[] = [registro(10), registro(11, { accion: 'auth.login', entidad_tipo: 'Usuario', entidad_id: 1, resultado: 'FALLIDO', actor_usuario: null, actor_email: null, rol_codigo_snapshot: '', despues: { email: 'x@t.test' } })],
  override: (call: Call) => { status?: number; body?: unknown } | undefined = () => undefined) {
  return mockFetch(call => {
    const custom = override(call)
    if (custom) return custom
    if (call.url.includes('/usuarios/usuarios/')) {
      const texto = (new URL(call.url, 'http://x').searchParams.get('search') ?? '').toLowerCase()
      const hallados = usuarios.results.filter(user => `${user.email} ${user.persona?.nombre_completo ?? ''}`.toLowerCase().includes(texto))
      return { body: { ...usuarios, count: hallados.length, results: hallados } }
    }
    if (call.url.includes('/exportar/')) return { body: 'ARCHIVO' }
    return { body: page(records) }
  })
}

const auditCalls = (calls: Call[]) => calls.filter(call => call.url.includes('/auditoria/registros/') && !call.url.includes('/exportar/'))
const exportCalls = (calls: Call[]) => calls.filter(call => call.url.includes('/exportar/'))
const lastAudit = (calls: Call[]) => new URL(auditCalls(calls).at(-1)!.url, 'http://x').searchParams

describe('AuditPage', () => {
  it('bloquea a los roles que no son administrador técnico y no consulta la API', () => {
    const calls = api()
    renderPage('DIRECCION')
    expect(screen.getByText('Acceso restringido')).toBeInTheDocument()
    expect(calls).toHaveLength(0)
  })

  it('lista los registros con acción traducida, actor, entidad y resultado', async () => {
    api()
    renderPage()
    const tabla = within(await screen.findByRole('table'))
    expect(tabla.getByText('Crear unidad')).toBeInTheDocument()
    expect(tabla.getByText('Unidad #4')).toBeInTheDocument()
    expect(tabla.getByText('Inicio de sesión')).toBeInTheDocument()
    expect(tabla.getByText('Sistema / sin sesión')).toBeInTheDocument() // login fallido sin actor
    expect(tabla.getByText('Fallido')).toBeInTheDocument()
    expect(screen.getByText('2 registros · del más reciente al más antiguo.')).toBeInTheDocument()
  })

  it('el selector de actor busca en el servidor mientras se escribe y filtra por el ID elegido', async () => {
    const calls = api()
    renderPage()
    await screen.findByRole('table')
    await userEvent.type(screen.getByRole('combobox', { name: 'Actor' }), 'ctc')
    await waitFor(() => expect(screen.queryByRole('option', { name: /Admin Técnico/ })).not.toBeInTheDocument())
    expect(screen.getByRole('option', { name: 'ctc@iinsad.test' })).toBeInTheDocument() // sin persona: solo correo
    expect(calls.some(call => call.url.includes('/usuarios/usuarios/') && call.url.includes('search=ctc'))).toBe(true)

    await userEvent.click(screen.getByRole('option', { name: 'ctc@iinsad.test' }))
    expect(screen.getByText('ctc@iinsad.test')).toBeInTheDocument() // queda elegido
    await userEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }))
    await waitFor(() => expect(lastAudit(calls).get('actor_usuario')).toBe('2'))
  })

  it('aplica todos los filtros juntos y vuelve a la página 1', async () => {
    const calls = api()
    renderPage()
    await screen.findByRole('table')
    await userEvent.type(screen.getByLabelText('Buscar en auditoría'), 'reorg')
    await userEvent.type(screen.getByLabelText('Desde'), '2026-11-01')
    await userEvent.type(screen.getByLabelText('Hasta'), '2026-11-22')
    await userEvent.selectOptions(screen.getByLabelText('Acción'), 'asignacion.revocar')
    await userEvent.selectOptions(screen.getByLabelText('Entidad'), 'AsignacionRol')
    await userEvent.selectOptions(screen.getByLabelText('Resultado'), 'FALLIDO')
    await userEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }))
    await waitFor(() => expect(Object.fromEntries(lastAudit(calls))).toEqual({
      page: '1', search: 'reorg', desde: '2026-11-01', hasta: '2026-11-22', accion: 'asignacion.revocar',
      entidad_tipo: 'AsignacionRol', resultado: 'FALLIDO',
    }))
  })

  it('no consulta hasta que se aplican los filtros', async () => {
    const calls = api()
    renderPage()
    await screen.findByRole('table')
    const antes = auditCalls(calls).length
    await userEvent.selectOptions(screen.getByLabelText('Resultado'), 'FALLIDO')
    expect(auditCalls(calls)).toHaveLength(antes)
  })

  it('rechaza un rango de fechas invertido sin llamar al servidor', async () => {
    const calls = api()
    renderPage()
    await screen.findByRole('table')
    const antes = auditCalls(calls).length
    await userEvent.type(screen.getByLabelText('Desde'), '2026-11-22')
    await userEvent.type(screen.getByLabelText('Hasta'), '2026-11-01')
    await userEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }))
    expect(await screen.findByText('La fecha "desde" no puede ser posterior a "hasta".')).toBeInTheDocument()
    expect(auditCalls(calls)).toHaveLength(antes)
  })

  it('"Limpiar" quita los filtros y recarga', async () => {
    const calls = api()
    renderPage()
    await screen.findByRole('table')
    await userEvent.selectOptions(screen.getByLabelText('Resultado'), 'FALLIDO')
    await userEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }))
    await waitFor(() => expect(lastAudit(calls).get('resultado')).toBe('FALLIDO'))
    await userEvent.click(screen.getByRole('button', { name: 'Limpiar' }))
    await waitFor(() => expect(lastAudit(calls).has('resultado')).toBe(false))
    expect(screen.getByLabelText('Resultado')).toHaveValue('')
  })

  it('el detalle muestra qué cambió (antes/después), el motivo y el origen', async () => {
    api([registro(20, { accion: 'unidad.editar', antes: { nombre: 'Epi' }, despues: { nombre: 'Epi Social' }, motivo: 'Corrección de nombre' })])
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Ver detalle del registro 20' }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Editar unidad', { selector: 'h3' })).toBeInTheDocument()
    expect(within(dialog).getByText('Corrección de nombre')).toBeInTheDocument()
    expect(within(dialog).getByText('127.0.0.1')).toBeInTheDocument()
    const fila = within(dialog).getByText('Nombre').closest('tr') as HTMLElement
    expect(within(fila).getByText('Epi')).toBeInTheDocument()
    expect(within(fila).getByText('Epi Social')).toBeInTheDocument()
  })

  it('"Ver toda esta operación" filtra por la petición y permite quitar el filtro', async () => {
    const calls = api([registro(30, { peticion_id: 'req-xyz' })])
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Ver detalle del registro 30' }))
    await userEvent.click(screen.getByRole('button', { name: /Ver toda esta operación/ }))
    await waitFor(() => expect(lastAudit(calls).get('peticion_id')).toBe('req-xyz'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText(/Mostrando solo los registros de una misma operación/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /Quitar este filtro/ }))
    await waitFor(() => expect(lastAudit(calls).has('peticion_id')).toBe(false))
  })

  it('"Ver toda esta operación" ignora los demás filtros para no ocultar registros de la operación', async () => {
    const calls = api([registro(40, { peticion_id: 'req-op' })])
    renderPage()
    await screen.findByRole('table')
    await userEvent.selectOptions(screen.getByLabelText('Resultado'), 'EXITOSO')
    await userEvent.selectOptions(screen.getByLabelText('Acción'), 'unidad.crear')
    await userEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Ver detalle del registro 40' }))
    await userEvent.click(screen.getByRole('button', { name: /Ver toda esta operación/ }))
    await waitFor(() => expect(Object.fromEntries(lastAudit(calls))).toEqual({ page: '1', peticion_id: 'req-op' }))
    expect(screen.getByLabelText('Acción')).toHaveValue('')
    expect(screen.getByLabelText('Resultado')).toHaveValue('')
  })

  it('pagina de a 20 y pide la página siguiente', async () => {
    const calls = mockFetch(call => call.url.includes('/usuarios/usuarios/') ? { body: usuarios } : { body: page([registro(1)], 45) })
    renderPage()
    expect(await screen.findByText('Página 1 de 3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    await waitFor(() => expect(lastAudit(calls).get('page')).toBe('2'))
  })

  it('muestra el error del servidor y el estado vacío', async () => {
    api([], () => undefined)
    renderPage()
    expect(await screen.findByText('No hay registros que coincidan con los filtros.')).toBeInTheDocument()
  })

  describe('exportar', () => {
    function prepararDescarga() {
      URL.createObjectURL = vi.fn(() => 'blob:archivo')
      URL.revokeObjectURL = vi.fn()
      return vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    }

    it('descarga el Excel con los filtros aplicados (sin página) y confirma', async () => {
      const descarga = prepararDescarga()
      const calls = api()
      renderPage()
      await screen.findByRole('table')
      await userEvent.selectOptions(screen.getByLabelText('Resultado'), 'FALLIDO')
      await userEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }))
      await waitFor(() => expect(lastAudit(calls).get('resultado')).toBe('FALLIDO'))

      await userEvent.click(screen.getByRole('button', { name: 'Exportar a Excel' }))
      await waitFor(() => expect(descarga).toHaveBeenCalledTimes(1))
      const url = new URL(exportCalls(calls)[0]!.url, 'http://x')
      expect(url.pathname).toBe('/api/v1/auditoria/registros/exportar/')
      expect(Object.fromEntries(url.searchParams)).toEqual({ resultado: 'FALLIDO', formato: 'xlsx' })
      expect(exportCalls(calls)[0]).toMatchObject({ method: 'GET' })
      expect(exportCalls(calls)[0]?.headers.get('Authorization')).toBe('Bearer tok')
      expect(await screen.findByText(/Se descargó el archivo Excel con 2 registros/)).toBeInTheDocument()
      expect(URL.revokeObjectURL).toHaveBeenCalled()
    })

    it('exporta a PDF', async () => {
      prepararDescarga()
      const calls = api()
      renderPage()
      await screen.findByRole('table')
      await userEvent.click(screen.getByRole('button', { name: 'Exportar a PDF' }))
      await waitFor(() => expect(exportCalls(calls)).toHaveLength(1))
      expect(new URL(exportCalls(calls)[0]!.url, 'http://x').searchParams.get('formato')).toBe('pdf')
    })

    it('no exporta lo escrito sin aplicar y avisa que faltan filtros por aplicar', async () => {
      prepararDescarga()
      const calls = api()
      renderPage()
      await screen.findByRole('table')
      await userEvent.selectOptions(screen.getByLabelText('Resultado'), 'FALLIDO') // sin aplicar
      expect(screen.getByText(/Tienes filtros sin aplicar/)).toBeInTheDocument()
      await userEvent.click(screen.getByRole('button', { name: 'Exportar a Excel' }))
      await waitFor(() => expect(exportCalls(calls)).toHaveLength(1))
      expect(new URL(exportCalls(calls)[0]!.url, 'http://x').searchParams.has('resultado')).toBe(false)
    })

    it('está desactivado si no hay registros que exportar', async () => {
      api([])
      renderPage()
      await screen.findByText('No hay registros que coincidan con los filtros.')
      expect(screen.getByRole('button', { name: 'Exportar a Excel' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Exportar a PDF' })).toBeDisabled()
    })

    it('muestra el motivo si el servidor rechaza la exportación (p. ej. demasiados registros)', async () => {
      const descarga = prepararDescarga()
      api(undefined, call => call.url.includes('/exportar/')
        ? { status: 400, body: { detail: 'Hay 12000 registros y el máximo por exportación es 10000. Acota la consulta con filtros.' } } : undefined)
      renderPage()
      await screen.findByRole('table')
      await userEvent.click(screen.getByRole('button', { name: 'Exportar a Excel' }))
      expect(await screen.findByRole('alert')).toHaveTextContent('el máximo por exportación es 10000')
      expect(descarga).not.toHaveBeenCalled()
      expect(screen.getByRole('button', { name: 'Exportar a Excel' })).toBeEnabled() // se puede reintentar
    })

    it('en modo demostración los botones están desactivados', () => {
      api()
      renderPage('ADMIN_TECNICO', true)
      expect(screen.getByRole('button', { name: 'Exportar a Excel' })).toBeDisabled()
    })
  })

  it('muestra el mensaje cuando la consulta falla', async () => {
    api([], call => call.url.includes('/auditoria/') ? { status: 403, body: { detail: 'No tiene permiso para realizar esta acción.' } } : undefined)
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent('No tiene permiso para realizar esta acción.')
  })

  it('en modo demostración no llama a la API', () => {
    const calls = api()
    renderPage('ADMIN_TECNICO', true)
    expect(screen.getByText(/solo está disponible con datos reales/)).toBeInTheDocument()
    expect(calls).toHaveLength(0)
  })

  it('es de solo lectura: ninguna acción envía POST, PATCH ni DELETE', async () => {
    const calls = api()
    renderPage()
    await screen.findByRole('table')
    await userEvent.click(screen.getByRole('button', { name: 'Ver detalle del registro 10' }))
    expect(calls.every(call => call.method === 'GET')).toBe(true)
  })
})
