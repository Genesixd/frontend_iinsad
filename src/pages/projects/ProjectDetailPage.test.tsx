import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ProjectDetail, ProposalPermissions } from '../../api/projects'
import { mockFetch, type Call } from '../../test/mockFetch'
import { NO_PERMISSIONS, member, page, project, renderRoute, sentVersion, version } from '../../test/projects'

const PRINCIPAL_DRAFT: ProposalPermissions = { ...NO_PERMISSIONS, editar_borrador: true, enviar: true, gestionar_equipo: true }
const complete = { resumen: 'Un resumen', objetivo_general: 'Medir' }
const coworker = member({
  id: 2, participacion: 2, persona: { id: 42, nombre_completo: 'Luis Mendoza' }, funcion: 'COINVESTIGADOR',
  funcion_texto: 'Coinvestigador', funciones: 'Trabajo de campo',
})

type Reply = { status?: number; body?: unknown }

/** Servidor de prueba: el detalle cambia después de cada operación que el servidor acepta. */
function server(states: ProjectDetail[], operation: (call: Call) => Reply = () => ({ status: 200 })) {
  let current = 0
  return mockFetch(call => {
    if (call.url.includes('/proyectos/personas/')) return { body: page([{ id: 42, nombre_completo: 'Luis Mendoza', procedencia: 'UMSA' }]) }
    if (call.method === 'GET') return { body: states[current] }
    const reply = operation(call)
    if ((reply.status ?? 200) < 300) current = Math.min(current + 1, states.length - 1)
    return reply
  })
}

const writes = (calls: Call[]) => calls.filter(call => call.method !== 'GET')
const button = (name: string | RegExp) => screen.queryByRole('button', { name })
const loaded = () => screen.findByRole('region', { name: 'Contenido de la propuesta' })
const team = () => within(screen.getByRole('region', { name: 'Equipo de la propuesta' }))
const accept = () => vi.spyOn(window, 'confirm').mockReturnValue(true)

describe('ProjectDetailPage: lo que cada quien puede hacer', () => {
  it('investigador principal con borrador: editar, enviar y gestionar equipo', async () => {
    server([project({ permisos: PRINCIPAL_DRAFT })])
    renderRoute('/proyectos/7')
    await loaded()
    expect(button('Editar borrador')).toBeInTheDocument()
    expect(button('Enviar a revisión')).toBeInTheDocument()
    expect(button('Descartar borrador')).not.toBeInTheDocument()
    expect(button('Crear corrección')).not.toBeInTheDocument()
    expect(button('Agregar al equipo')).toBeInTheDocument()
    expect(screen.getByText('Antes de enviar completa: el resumen, el objetivo general.')).toBeInTheDocument()
  })

  it('sin permisos todo es de solo lectura', async () => {
    server([project({ permisos: NO_PERMISSIONS }, [version({ integrantes: [member(), coworker] })])])
    renderRoute('/proyectos/7', { role: 'DIRECCION' })
    await loaded()
    for (const name of ['Editar borrador', 'Enviar a revisión', 'Descartar borrador', 'Crear corrección', 'Agregar al equipo', /Quitar a/]) {
      expect(button(name)).not.toBeInTheDocument()
    }
    expect(team().getByText('Luis Mendoza')).toBeInTheDocument()
    expect(team().queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.queryByText(/Antes de enviar completa/)).not.toBeInTheDocument()
  })

  it('administrador técnico: solo el equipo', async () => {
    server([project({ permisos: { ...NO_PERMISSIONS, gestionar_equipo: true } })])
    renderRoute('/proyectos/7', { role: 'ADMIN_TECNICO' })
    await loaded()
    expect(button('Agregar al equipo')).toBeInTheDocument()
    expect(button('Editar borrador')).not.toBeInTheDocument()
    expect(button('Enviar a revisión')).not.toBeInTheDocument()
  })

  it('muestra los datos generales y avisa que está en revisión', async () => {
    server([project({ estado_propuesta: 'EN_REVISION', codigo: 'IINSAD-9' }, [sentVersion()])])
    renderRoute('/proyectos/7')
    await loaded()
    expect(screen.getByText('EC · Epidemiología Clínica')).toBeInTheDocument()
    expect(screen.getByText('EC-01 · Crónicas')).toBeInTheDocument()
    expect(screen.getByText('IINSAD-9')).toBeInTheDocument()
    expect(screen.getByText(/La propuesta está en revisión/)).toBeInTheDocument()
    expect(screen.getByText(/Solo lectura/)).toBeInTheDocument()
  })

  it('un proyecto ajeno o inexistente se explica sin mostrar datos', async () => {
    mockFetch(() => ({ status: 404, body: { detail: 'No encontrado.' } }))
    renderRoute('/proyectos/999')
    expect(await screen.findByRole('alert')).toHaveTextContent('no existe o no tienes permiso')
  })

  it('una dirección mal escrita no llama a la API', async () => {
    const calls = mockFetch(() => ({ body: {} }))
    renderRoute('/proyectos/abc')
    expect(await screen.findByRole('alert')).toHaveTextContent('no corresponde a un proyecto')
    expect(calls).toHaveLength(0)
  })

  it('en modo demostración no consulta la API', () => {
    const calls = mockFetch(() => ({ body: {} }))
    renderRoute('/proyectos/7', { demo: true })
    expect(screen.getByText('Requiere una cuenta')).toBeInTheDocument()
    expect(calls).toHaveLength(0)
  })
})

describe('ProjectDetailPage: envío y versiones', () => {
  const ready = project({ permisos: PRINCIPAL_DRAFT }, [version(complete)])
  const sent = project({ estado_propuesta: 'EN_REVISION', permisos: { ...NO_PERMISSIONS, crear_version: true } }, [sentVersion()])

  it('pide confirmación antes de enviar; si se cancela no envía', async () => {
    const calls = server([ready, sent])
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    renderRoute('/proyectos/7')
    await userEvent.click(await screen.findByRole('button', { name: 'Enviar a revisión' }))
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('ya no se podrá modificar'))
    expect(writes(calls)).toHaveLength(0)
  })

  it('envía y la pantalla pasa a solo lectura', async () => {
    const calls = server([ready, sent])
    accept()
    renderRoute('/proyectos/7')
    await userEvent.click(await screen.findByRole('button', { name: 'Enviar a revisión' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Versión 1 enviada a revisión.')
    expect(await screen.findByRole('button', { name: 'Crear corrección' })).toBeEnabled()
    expect(button('Enviar a revisión')).not.toBeInTheDocument()
    expect(button('Editar borrador')).not.toBeInTheDocument()
    expect(writes(calls)).toMatchObject([{ method: 'POST', url: '/api/v1/proyectos/7/propuestas/11/enviar/' }])
  })

  it('si el servidor rechaza el envío muestra cada motivo y vuelve a leer el proyecto', async () => {
    const calls = server([ready], () => ({ status: 400, body: {
      resumen: ['Completa el resumen antes de enviar.'], equipo: ['Agrega al equipo al investigador principal vigente.'],
    } }))
    accept()
    renderRoute('/proyectos/7')
    await userEvent.click(await screen.findByRole('button', { name: 'Enviar a revisión' }))
    const alert = await screen.findByRole('alert')
    expect(within(alert).getAllByRole('listitem').map(item => item.textContent)).toEqual([
      'Completa el resumen antes de enviar.', 'Agrega al equipo al investigador principal vigente.',
    ])
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    await waitFor(() => expect(calls.filter(call => call.method === 'GET')).toHaveLength(2))
  })

  it('crear una corrección abre el nuevo borrador y conserva la versión enviada en el historial', async () => {
    const v1 = sentVersion()
    const v2 = version({ ...complete, id: 12, numero_version: 2, tipo_version: 'CORRECCION', version_anterior: 11, titulo: 'Chagas corregido' })
    const correcting = project({ estado_propuesta: 'EN_CORRECCION', permisos: { ...PRINCIPAL_DRAFT, eliminar_borrador: true } }, [v1, v2])
    const calls = server([sent, correcting], () => ({ status: 201, body: v2 }))
    renderRoute('/proyectos/7')
    await userEvent.click(await screen.findByRole('button', { name: 'Crear corrección' }))
    expect(await screen.findByRole('heading', { name: 'Versión 2 · Corrección' })).toBeInTheDocument()
    expect(writes(calls)).toMatchObject([{ method: 'POST', url: '/api/v1/proyectos/7/propuestas/' }])
    const history = within(screen.getByRole('region', { name: 'Historial de versiones' }))
    expect(history.getByText('Borrador sin enviar')).toBeInTheDocument()

    // Al consultar la versión 1 no se ofrece modificarla.
    await userEvent.click(history.getByRole('button', { name: 'Ver versión 1' }))
    expect(screen.getByRole('heading', { name: 'Versión 1 · Versión inicial' })).toBeInTheDocument()
    expect(screen.getByText('Resumen enviado')).toBeInTheDocument()
    expect(button('Editar borrador')).not.toBeInTheDocument()
    expect(button('Enviar a revisión')).not.toBeInTheDocument()
    expect(button('Agregar al equipo')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Ir al borrador' }))
    expect(screen.getByRole('heading', { name: 'Versión 2 · Corrección' })).toBeInTheDocument()
  })

  it('descartar la corrección borra solo ese borrador', async () => {
    const v2 = version({ id: 12, numero_version: 2, tipo_version: 'CORRECCION', version_anterior: 11 })
    const correcting = project({ permisos: { ...PRINCIPAL_DRAFT, eliminar_borrador: true } }, [sentVersion(), v2])
    const calls = server([correcting, sent], () => ({ status: 204 }))
    accept()
    renderRoute('/proyectos/7')
    await userEvent.click(await screen.findByRole('button', { name: 'Descartar borrador' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Borrador descartado.')
    expect(writes(calls)).toMatchObject([{ method: 'DELETE', url: '/api/v1/proyectos/7/propuestas/12/' }])
    expect(screen.getByRole('heading', { name: 'Versión 1 · Versión inicial' })).toBeInTheDocument()
  })
})

describe('ProjectDetailPage: editar el borrador', () => {
  const draft = project({ permisos: PRINCIPAL_DRAFT }, [version({ resumen: 'Antes', fecha_inicio_prevista: '2027-01-10' })])

  async function openEditor() {
    await userEvent.click(await screen.findByRole('button', { name: 'Editar borrador' }))
    return within(screen.getByRole('dialog', { name: 'Editar borrador' }))
  }

  it('guarda los cambios con PATCH y vuelve a leer el proyecto', async () => {
    const after = project({ permisos: PRINCIPAL_DRAFT }, [version({ resumen: 'Después' })])
    const calls = server([draft, after])
    renderRoute('/proyectos/7')
    const dialog = await openEditor()
    expect(dialog.getByLabelText(/^Resumen/)).toHaveValue('Antes')
    expect(dialog.getByLabelText('Inicio previsto')).toHaveValue('2027-01-10')
    await userEvent.clear(dialog.getByLabelText(/^Resumen/))
    await userEvent.type(dialog.getByLabelText(/^Resumen/), 'Después')
    await userEvent.click(dialog.getByRole('button', { name: 'Guardar cambios' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Borrador guardado.')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(await screen.findByText('Después')).toBeInTheDocument()
    expect(writes(calls)[0]).toMatchObject({ method: 'PATCH', url: '/api/v1/proyectos/7/propuestas/11/' })
    expect(writes(calls)[0]?.body).toMatchObject({ resumen: 'Después', fecha_inicio_prevista: '2027-01-10', fecha_fin_prevista: null })
    expect(writes(calls)[0]?.body).not.toHaveProperty('unidad')
  })

  it('no guarda sin título', async () => {
    const calls = server([draft])
    renderRoute('/proyectos/7')
    const dialog = await openEditor()
    await userEvent.clear(dialog.getByLabelText('Título'))
    await userEvent.click(dialog.getByRole('button', { name: 'Guardar cambios' }))
    expect(dialog.getByText('El título es obligatorio.')).toBeInTheDocument()
    expect(writes(calls)).toHaveLength(0)
  })

  it('si la versión ya se envió desde otro lugar, lo explica y conserva lo escrito', async () => {
    server([draft], () => ({ status: 400, body: { detail: 'Esta versión ya fue enviada a revisión y no se puede modificar.' } }))
    renderRoute('/proyectos/7')
    const dialog = await openEditor()
    await userEvent.type(dialog.getByLabelText(/^Metodología/), 'Texto nuevo')
    await userEvent.click(dialog.getByRole('button', { name: 'Guardar cambios' }))
    expect(await dialog.findByRole('alert')).toHaveTextContent('ya fue enviada')
    expect(dialog.getByLabelText(/^Metodología/)).toHaveValue('Texto nuevo')
  })
})

describe('ProjectDetailPage: equipo', () => {
  const withTeam = project({ permisos: PRINCIPAL_DRAFT }, [version({ integrantes: [member(), coworker] })])
  const alone = project({ permisos: PRINCIPAL_DRAFT })

  it('agrega un integrante con su función y responsabilidades', async () => {
    const calls = server([alone, withTeam], () => ({ status: 201, body: coworker }))
    renderRoute('/proyectos/7')
    await loaded()
    await userEvent.type(team().getByRole('combobox', { name: 'Persona a agregar' }), 'men')
    await userEvent.click(await screen.findByRole('option', { name: 'Luis Mendoza · UMSA' }))
    await userEvent.selectOptions(team().getByLabelText('Función en el proyecto'), 'COLABORADOR')
    await userEvent.type(team().getByLabelText(/^Responsabilidades/), 'Encuestas')
    await userEvent.click(team().getByRole('button', { name: 'Agregar al equipo' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Luis Mendoza se agregó al equipo.')
    expect(writes(calls)[0]?.url).toBe('/api/v1/proyectos/7/propuestas/11/integrantes/')
    expect(writes(calls)[0]?.body).toEqual({ persona: 42, funcion: 'COLABORADOR', funciones: 'Encuestas', procedencia: 'UMSA' })
    await waitFor(() => expect(team().getByLabelText(/^Responsabilidades/)).toHaveValue(''))
  })

  it('no agrega sin elegir persona', async () => {
    const calls = server([alone])
    renderRoute('/proyectos/7')
    await loaded()
    await userEvent.click(team().getByRole('button', { name: 'Agregar al equipo' }))
    expect(team().getByText('Busca y elige a la persona que quieres agregar.')).toBeInTheDocument()
    expect(writes(calls)).toHaveLength(0)
  })

  it('el principal vigente no se puede quitar ni cambiar; los demás sí', async () => {
    const calls = server([withTeam, withTeam])
    accept()
    renderRoute('/proyectos/7')
    await loaded()
    expect(team().getByText('Principal vigente')).toBeInTheDocument()
    expect(button('Quitar a Ana Quispe Choque')).not.toBeInTheDocument()
    expect(team().queryByRole('combobox', { name: 'Función de Ana Quispe Choque' })).not.toBeInTheDocument()

    await userEvent.selectOptions(team().getByLabelText('Función de Luis Mendoza'), 'COLABORADOR')
    expect(await screen.findByRole('status')).toHaveTextContent('Luis Mendoza ahora es colaborador.')
    await waitFor(() => expect(button('Quitar a Luis Mendoza')).toBeEnabled())
    await userEvent.click(button('Quitar a Luis Mendoza')!)
    await waitFor(() => expect(writes(calls)).toHaveLength(2))
    expect(writes(calls)).toMatchObject([
      { method: 'PATCH', url: '/api/v1/proyectos/7/propuestas/11/integrantes/2/', body: { funcion: 'COLABORADOR' } },
      { method: 'DELETE', url: '/api/v1/proyectos/7/propuestas/11/integrantes/2/' },
    ])
  })

  it('los errores del equipo se muestran en la tarjeta del equipo', async () => {
    server([withTeam], () => ({ status: 400, body: { detail: 'La persona ya tiene esa función.' } }))
    renderRoute('/proyectos/7')
    await loaded()
    await userEvent.selectOptions(team().getByLabelText('Función de Luis Mendoza'), 'COLABORADOR')
    expect(await team().findByRole('alert')).toHaveTextContent('La persona ya tiene esa función.')
  })

  it('tras un cambio de investigador principal ofrece agregarlo al borrador', async () => {
    const changed = project({
      permisos: { ...NO_PERMISSIONS, gestionar_equipo: true }, investigador_principal: { id: 42, nombre_completo: 'Luis Mendoza' },
    })
    const calls = server([changed, changed], () => ({ status: 201, body: {} }))
    accept()
    renderRoute('/proyectos/7', { role: 'ADMIN_TECNICO' })
    await loaded()
    expect(button('Quitar a Ana Quispe Choque')).toBeInTheDocument() // ya no es la principal vigente
    await userEvent.click(screen.getByRole('button', { name: 'Agregar como principal' }))
    await waitFor(() => expect(writes(calls)).toHaveLength(1))
    expect(writes(calls)[0]?.body).toEqual({ persona: 42, funcion: 'INVESTIGADOR_PRINCIPAL' })
  })
})
