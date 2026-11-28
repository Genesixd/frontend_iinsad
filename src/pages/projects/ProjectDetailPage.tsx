import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, FilePlus2, Pencil, Send, Trash2 } from 'lucide-react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { ApiError } from '../../api/http'
import { createVersion, deleteDraft, fetchProject, submitVersion, type ProjectDetail, type Version } from '../../api/projects'
import { useAuth } from '../../auth/useAuth'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { roleCanAccess } from '../../config/navigation'
import {
  TEXT_FIELDS, VERSION_TYPE_LABELS, formatDate, formatDateTime, missingToSend, versionHistory, type VersionEntry,
} from '../../lib/proposal'
import { EditDraftModal } from './EditDraftModal'
import { StateTag } from './ProjectsPage'
import { TeamSection } from './TeamSection'

type Problems = { area: 'version' | 'team'; messages: string[] } | null

const messagesFrom = (failure: unknown): string[] => {
  if (failure instanceof ApiError && Object.keys(failure.fields).length > 0) return Object.values(failure.fields).flat()
  return [failure instanceof Error ? failure.message : 'No se pudo completar la acción.']
}

export function ProjectDetailPage() {
  const { id } = useParams()
  const projectId = Number(id)
  const location = useLocation()
  const { session } = useAuth()
  const token = session?.token ?? undefined
  const allowed = !!session && roleCanAccess(session.activeRole, '/proyectos')

  const [project, setProject] = useState<ProjectDetail | null>(null)
  const [loadError, setLoadError] = useState('')
  const [notice, setNotice] = useState((location.state as { notice?: string } | null)?.notice ?? '')
  const [problems, setProblems] = useState<Problems>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!token) return
    if (!Number.isInteger(projectId) || projectId <= 0) { setLoadError('La dirección no corresponde a un proyecto.'); return }
    try {
      setProject(await fetchProject(token, projectId))
      setLoadError('')
    } catch (failure) {
      // Solo un 404 retira lo que ya se veía; un corte de red conserva los datos y permite reintentar.
      const gone = failure instanceof ApiError && failure.status === 404
      if (gone) setProject(null)
      setLoadError(gone ? 'Este proyecto no existe o no tienes permiso para consultarlo.'
        : failure instanceof Error ? failure.message : 'No se pudo cargar el proyecto.')
    }
  }, [token, projectId])

  useEffect(() => { if (allowed) void load() }, [allowed, load])

  const back = <Link className="back-link" to="/proyectos"><ArrowLeft size={14}/> Volver a proyectos</Link>

  if (!allowed) return <div className="content-area"><div className="message-panel"><h2>Acceso restringido</h2><p>Esta opción no está disponible para el rol seleccionado.</p></div></div>
  if (!token) return <div className="content-area">{back}<div className="message-panel"><h2>Requiere una cuenta</h2><p>El modo demostración no se conecta con Django.</p></div></div>
  if (loadError && !project) return <div className="content-area">{back}<div className="alert-error" role="alert">{loadError}</div></div>
  if (!project || project.id !== projectId) return <div className="content-area">{back}<div className="message-panel">Cargando proyecto…</div></div>

  const history = versionHistory(project)
  const selected = (history.find(entry => entry.version.id === selectedId) ?? history[0])?.version
  // Los proyectos incorporados no pasan por borrador ni revisión.
  const isProposal = project.origen === 'PROPUESTA'
  const draft = isProposal ? history.find(entry => !entry.version.enviada)?.version : undefined
  const onDraft = isProposal && !!selected && !selected.enviada
  const unsentText = isProposal ? 'Borrador: todavía no se ha enviado.' : 'Registro incorporado: no pasa por revisión.'
  const permisos = project.permisos
  const missing = onDraft && permisos.enviar ? missingToSend(selected) : []

  async function run(area: 'version' | 'team', action: () => Promise<unknown>, success: string) {
    setBusy(true); setNotice(''); setProblems(null)
    let done = true
    try { await action(); setNotice(success) }
    catch (failure) { done = false; setProblems({ area, messages: messagesFrom(failure) }) }
    // Se vuelve a leer siempre: si falló pudo ser porque el estado cambió (p. ej. ya se había enviado).
    await load()
    setBusy(false)
    return done
  }

  function send(version: Version) {
    if (!window.confirm(`¿Enviar la versión ${version.numero_version} a revisión? Después de enviarla ya no se podrá modificar.`)) return
    void run('version', () => submitVersion(token!, project!.id, version.id), `Versión ${version.numero_version} enviada a revisión.`)
  }

  function discard(version: Version) {
    if (!window.confirm(`¿Descartar el borrador de la versión ${version.numero_version}? Las versiones enviadas no cambian.`)) return
    void run('version', async () => { await deleteDraft(token!, project!.id, version.id); setSelectedId(null) }, 'Borrador descartado.')
  }

  function openCorrection() {
    void run('version', async () => { await createVersion(token!, project!.id); setSelectedId(null) },
      'Se abrió un nuevo borrador a partir de la última versión enviada, que se conserva sin cambios.')
  }

  const historyColumns: Column<VersionEntry>[] = [
    { key: 'version', title: 'Versión', cell: ({ version }) => <strong>Versión {version.numero_version}</strong> },
    { key: 'tipo', title: 'Tipo', cell: ({ version }) => VERSION_TYPE_LABELS[version.tipo_version] },
    { key: 'intento', title: 'Presentación', cell: ({ attempt }) => `N.º ${attempt}` },
    { key: 'envio', title: 'Enviada', cell: ({ version }) => version.enviada ? formatDateTime(version.enviada_en) : <span className="small-tag tag-muted">{isProposal ? 'Borrador sin enviar' : 'No aplica'}</span> },
    { key: 'ver', title: 'Consultar', cell: ({ version }) => version.id === selected?.id
      ? <span className="subtle-text">Mostrando</span>
      : <button type="button" className="secondary-button" onClick={() => { setSelectedId(version.id); setProblems(null) }} aria-label={`Ver versión ${version.numero_version}`}>Ver</button> },
  ]

  return <div className="content-area">
    {back}
    <div className="section-heading"><div><span className="page-eyebrow">{project.codigo ?? 'PROPUESTA SIN CÓDIGO'}</span><h2>{project.titulo ?? '(Sin título visible)'}</h2></div><StateTag project={project}/></div>

    {notice && <div className="alert-ok alert-flush" role="status">{notice}</div>}
    {loadError && <div className="card-note" role="alert"><span>{loadError}</span>
      <button type="button" className="secondary-button" onClick={() => void load()}>Reintentar</button></div>}

    <div className="data-card card-body"><dl className="detail-grid">
      <div><dt>Unidad responsable</dt><dd>{project.unidad_codigo} · {project.unidad_nombre}</dd></div>
      <div><dt>Investigador principal</dt><dd>{project.investigador_principal?.nombre_completo ?? 'Sin investigador principal vigente'}</dd></div>
      <div className="detail-span"><dt>Líneas de investigación</dt><dd>{project.lineas.map(line => `${line.codigo} · ${line.nombre}`).join('; ') || '—'}</dd></div>
      <div><dt>Referencia institucional</dt><dd>{project.referencia_institucional || '—'}</dd></div>
      <div><dt>Registrado</dt><dd>{formatDateTime(project.creado_en)}</dd></div>
    </dl></div>

    {!project.anulado && project.estado_propuesta === 'EN_REVISION' && <div className="info-banner">La propuesta está en revisión: la versión enviada no se puede modificar. La resolución llegará con el módulo de evaluación (M03).</div>}
    {!project.anulado && project.estado_propuesta === 'EN_CORRECCION' && <div className="info-banner">Hay una corrección en preparación. La versión enviada se conserva sin cambios.</div>}

    {!selected ? <div className="message-panel stack-gap">No hay versiones que puedas consultar.</div> : <>
      <section className="data-card stack-gap" aria-label="Contenido de la propuesta">
        <div className="data-card-head"><div><h3>Versión {selected.numero_version} · {VERSION_TYPE_LABELS[selected.tipo_version]}</h3>
          <p>{selected.enviada ? `Enviada el ${formatDateTime(selected.enviada_en)}. Solo lectura.` : unsentText}</p></div>
          <div className="row-actions">
            {onDraft && permisos.editar_borrador && <button type="button" className="secondary-button" disabled={busy} onClick={() => setEditing(true)}><Pencil size={13}/> Editar borrador</button>}
            {onDraft && permisos.eliminar_borrador && <button type="button" className="secondary-button danger-button" disabled={busy} onClick={() => discard(selected)}><Trash2 size={13}/> Descartar borrador</button>}
            {onDraft && permisos.enviar && <button type="button" className="primary-button" disabled={busy} onClick={() => send(selected)}><Send size={14}/> Enviar a revisión</button>}
            {permisos.crear_version && <button type="button" className="primary-button" disabled={busy} onClick={openCorrection}><FilePlus2 size={14}/> Crear corrección</button>}
          </div>
        </div>
        {problems?.area === 'version' && <div className="alert-error alert-inline" role="alert">
          {problems.messages.length === 1 ? problems.messages[0] : <ul>{problems.messages.map(message => <li key={message}>{message}</li>)}</ul>}
        </div>}
        {/* Si el servidor ya explicó por qué rechazó el envío, no se repite el aviso previo. */}
        {missing.length > 0 && problems?.area !== 'version' && <div className="card-note">Antes de enviar completa: {missing.join(', ')}.</div>}
        {!onDraft && draft && permisos.editar_borrador && <div className="card-note"><span>Estás viendo una versión enviada.</span>
          <button type="button" className="secondary-button" onClick={() => setSelectedId(draft.id)}>Ir al borrador</button></div>}
        <div className="card-body"><dl className="detail-grid">
          {TEXT_FIELDS.map(field => <div key={field.key} className="detail-span"><dt>{field.label}</dt><dd className="long-text">{selected[field.key] || '—'}</dd></div>)}
          <div><dt>Inicio previsto</dt><dd>{formatDate(selected.fecha_inicio_prevista)}</dd></div>
          <div><dt>Fin previsto</dt><dd>{formatDate(selected.fecha_fin_prevista)}</dd></div>
        </dl></div>
      </section>

      <div className="stack-gap"><TeamSection key={selected.id} token={token} project={project} version={selected}
        editable={onDraft && permisos.gestionar_equipo} busy={busy} problems={problems?.area === 'team' ? problems.messages : []}
        run={(action, success) => run('team', action, success)}/></div>

      <section className="data-card stack-gap" aria-label="Historial de versiones">
        <div className="data-card-head"><div><h3>Historial de versiones</h3><p>Cada envío queda guardado tal como se presentó.</p></div></div>
        <DataTable columns={historyColumns} rows={history} rowKey={entry => entry.version.id}/>
      </section>
    </>}

    {editing && draft && <EditDraftModal token={token} projectId={project.id} version={draft} onClose={() => { setEditing(false); void load() }}
      onSaved={() => { setEditing(false); setProblems(null); setNotice('Borrador guardado.'); void load() }}/>}
  </div>
}
