// Errores que no borran lo cargado, proyectos incorporados y listas completas.
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ACTION_LABELS, ENTITY_LABELS } from '../../lib/auditLabels'
import { mockFetch } from '../../test/mockFetch'
import { NO_PERMISSIONS, UNITS, page, project, renderRoute, sentVersion, version } from '../../test/projects'

describe('listado', () => {
  it('un fallo al cargar las unidades no oculta la tabla', async () => {
    mockFetch(call => call.url.includes('/unidades/') ? { status: 500, body: {} } : { body: page([project()]) })
    renderRoute('/proyectos')
    expect(await screen.findByRole('table')).toBeInTheDocument()
    expect(await screen.findByRole('alert')).toHaveTextContent('Error del servidor (500)')
    expect(screen.getByRole('table')).toBeInTheDocument()
  })

  it('el filtro de unidad reúne todas las páginas', async () => {
    mockFetch(call => {
      if (!call.url.includes('/unidades/')) return { body: page([]) }
      const first = call.url.includes('page=1&')
      return { body: { count: 2, previous: null, next: first ? 'otra' : null, results: [UNITS.results[first ? 0 : 1]] } }
    })
    renderRoute('/proyectos')
    expect(await screen.findByRole('option', { name: /ES · Epidemiología Social/ })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /EC · Epidemiología Clínica/ })).toBeInTheDocument()
  })
})

describe('detalle', () => {
  it('si falla la recarga conserva el contenido y permite reintentar', async () => {
    let reads = 0
    mockFetch(call => {
      if (call.method !== 'GET') return { body: version() }
      reads += 1
      return reads === 2 ? { status: 500, body: {} } : { body: project({ permisos: { ...NO_PERMISSIONS, crear_version: true } }, [sentVersion()]) }
    })
    renderRoute('/proyectos/7')
    await userEvent.click(await screen.findByRole('button', { name: 'Crear corrección' }))
    expect(await screen.findByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
    expect(screen.getByText('Resumen enviado')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument()
  })

  it('un proyecto incorporado no se muestra como borrador', async () => {
    mockFetch(() => ({ body: project({ origen: 'HISTORICO', estado_propuesta: null }) }))
    renderRoute('/proyectos/7')
    expect(await screen.findByText('Registro incorporado: no pasa por revisión.')).toBeInTheDocument()
    expect(screen.queryByText(/Borrador/)).not.toBeInTheDocument()
  })

  it('un proyecto anulado no anuncia que está en revisión', async () => {
    mockFetch(() => ({ body: project({ anulado: true, estado_propuesta: 'EN_REVISION' }, [sentVersion()]) }))
    renderRoute('/proyectos/7')
    await screen.findByText('Anulado')
    expect(screen.queryByText(/La propuesta está en revisión/)).not.toBeInTheDocument()
  })

  it('guardar sin cambios no llama al servidor', async () => {
    const calls = mockFetch(() => ({ body: project({ permisos: { ...NO_PERMISSIONS, editar_borrador: true } }) }))
    const confirm = vi.spyOn(window, 'confirm')
    renderRoute('/proyectos/7')
    await userEvent.click(await screen.findByRole('button', { name: 'Editar borrador' }))
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(calls.filter(call => call.method !== 'GET')).toHaveLength(0)
    expect(confirm).not.toHaveBeenCalled()
  })
})

describe('auditoría de M02', () => {
  it('cada acción y entidad que registra el backend tiene nombre legible', () => {
    // Misma lista que usa `registrar(...)` en apps/proyectos y apps/usuarios.
    for (const action of ['usuario.reactivar', 'proyecto.crear', 'participacion.crear', 'participacion.cerrar', 'participacion.anular',
      'propuesta.crear_version', 'propuesta.editar', 'propuesta.eliminar_borrador', 'propuesta.agregar_integrante',
      'propuesta.quitar_integrante', 'propuesta.cambiar_funcion', 'propuesta.enviar', 'admin.crear', 'admin.editar', 'admin.eliminar']) {
      expect(ACTION_LABELS, action).toHaveProperty([action])
    }
    for (const entity of ['Proyecto', 'Participacion', 'VersionPropuesta']) expect(ENTITY_LABELS).toHaveProperty([entity])
  })
})
