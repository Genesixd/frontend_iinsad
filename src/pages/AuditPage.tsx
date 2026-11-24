import { useState, type FormEvent } from 'react'
import { Download, Eye, ScrollText, Search, ShieldCheck, X } from 'lucide-react'
import {
  EMPTY_AUDIT_FILTERS, exportAudit, exportFileName, fetchAudit, type AuditFilters, type AuditRecord, type ExportFormat,
} from '../api/audit'
import { useAuth } from '../auth/useAuth'
import { DataTable, type Column } from '../components/ui/DataTable'
import { ACTION_LABELS, ENTITY_LABELS, actionLabel, actorText, entityLabel, formatDateTime } from '../lib/auditLabels'
import { saveBlob } from '../lib/download'
import { ActorPicker, type Actor } from './audit/ActorPicker'
import { AuditDetailModal } from './audit/AuditDetailModal'
import { useRemoteList } from './catalogs/useRemoteList'

const PAGE_SIZE = 20
const EXPORT_MAX = 10_000
const FORMAT_NAME: Record<ExportFormat, string> = { xlsx: 'Excel', pdf: 'PDF' }

export function AuditPage() {
  const { session } = useAuth()
  const allowed = session?.activeRole === 'ADMIN_TECNICO'
  const demo = session?.demo === true
  const token = session?.token ?? undefined

  const [filters, setFilters] = useState<AuditFilters>(EMPTY_AUDIT_FILTERS)
  const [draft, setDraft] = useState<AuditFilters>(EMPTY_AUDIT_FILTERS) // lo escrito, aún sin aplicar
  const [actor, setActor] = useState<Actor | null>(null)
  const [dateError, setDateError] = useState('')
  const [notice, setNotice] = useState('')
  const [exporting, setExporting] = useState<ExportFormat | null>(null)
  const [detail, setDetail] = useState<AuditRecord | null>(null)
  const { rows, count, loading, error, setError, setLoading } = useRemoteList(
    fetchAudit, token, allowed && !demo, filters, () => setFilters(current => ({ ...current, page: 1 })))

  const setField = (key: keyof AuditFilters) => (value: string) => setDraft(current => ({ ...current, [key]: value }))

  function chooseActor(next: Actor | null) {
    setActor(next)
    setField('actor_usuario')(next ? String(next.id) : '')
  }

  function apply(event: FormEvent) {
    event.preventDefault()
    if (draft.desde && draft.hasta && draft.desde > draft.hasta) {
      setDateError('La fecha "desde" no puede ser posterior a "hasta".')
      return
    }
    setDateError('')
    setNotice('')
    setLoading(true)
    setFilters({ ...draft, page: 1 })
  }

  function clear() {
    setDateError('')
    setNotice('')
    setActor(null)
    setDraft(EMPTY_AUDIT_FILTERS)
    setLoading(true)
    setFilters(EMPTY_AUDIT_FILTERS)
  }

  // Una operación puede tener registros de varias acciones y entidades: se quitan los demás filtros
  // para no ocultar ninguno.
  function filterByRequest(requestId: string) {
    const only = { ...EMPTY_AUDIT_FILTERS, peticion_id: requestId }
    setDetail(null)
    setDateError('')
    setNotice('')
    setActor(null)
    setDraft(only)
    setLoading(true)
    setFilters(only)
  }

  function removeRequestFilter() {
    setDraft(current => ({ ...current, peticion_id: '' }))
    setLoading(true)
    setFilters(current => ({ ...current, peticion_id: '', page: 1 }))
  }

  function goToPage(page: number) {
    setLoading(true)
    setFilters(current => ({ ...current, page }))
  }

  async function exportFile(format: ExportFormat) {
    if (!token) return
    setExporting(format)
    setError('')
    setNotice('')
    try {
      // Se exporta con los filtros YA aplicados (los que se ven en la tabla), no con lo escrito sin aplicar.
      saveBlob(await exportAudit(token, filters, format), exportFileName(format, new Date()))
      setNotice(`Se descargó el archivo ${FORMAT_NAME[format]} con ${count} registro${count === 1 ? '' : 's'}.`)
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'No se pudo exportar.')
    } finally {
      setExporting(null)
    }
  }

  const columns: Column<AuditRecord>[] = [
    { key: 'fecha', title: 'Fecha', cell: row => formatDateTime(row.ocurrido_en) },
    { key: 'actor', title: 'Actor', cell: row => <div><div>{actorText(row.actor_email)}</div>{row.rol_codigo_snapshot && <small className="subtle-text">{row.rol_codigo_snapshot}</small>}</div> },
    { key: 'accion', title: 'Acción', cell: row => actionLabel(row.accion) },
    { key: 'entidad', title: 'Entidad', cell: row => `${entityLabel(row.entidad_tipo)}${row.entidad_id !== null ? ` #${row.entidad_id}` : ''}` },
    { key: 'resultado', title: 'Resultado', cell: row => <span className={`small-tag ${row.resultado === 'EXITOSO' ? 'tag-positive' : 'tag-warning'}`}>{row.resultado === 'EXITOSO' ? 'Exitoso' : 'Fallido'}</span> },
    { key: 'ver', title: '', cell: row => <button type="button" className="secondary-button" onClick={() => setDetail(row)} aria-label={`Ver detalle del registro ${row.id}`}><Eye size={13}/> Ver</button> },
  ]

  if (!allowed) return <div className="content-area"><div className="message-panel"><h2>Acceso restringido</h2><p>Solo el administrador técnico puede consultar la auditoría.</p></div></div>

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE))
  const hasFilters = Object.entries(filters).some(([key, value]) => key !== 'page' && value !== '')
  const pending = (Object.keys(EMPTY_AUDIT_FILTERS) as (keyof AuditFilters)[]).some(key => key !== 'page' && draft[key] !== filters[key])
  const cannotExport = demo || count === 0 || exporting !== null

  return <div className="content-area">
    <div className="section-heading"><div><span className="page-eyebrow">M01 · AUDITORÍA INSTITUCIONAL</span><h2>Registro de auditoría</h2><p>Consulta quién hizo qué y cuándo. Es de solo lectura: los registros no se pueden editar ni borrar.</p></div><div className="heading-icon"><ScrollText size={23}/></div></div>

    <div className="data-card">
      <div className="data-card-head"><div><h3>Eventos registrados</h3><p>{demo ? 'La auditoría solo está disponible con datos reales (no en modo demostración).' : `${count} registro${count === 1 ? '' : 's'} · del más reciente al más antiguo.`}</p></div>
        <div className="row-actions">
          {(['xlsx', 'pdf'] as const).map(format => <button key={format} type="button" className="secondary-button" disabled={cannotExport}
            onClick={() => void exportFile(format)} aria-label={`Exportar a ${FORMAT_NAME[format]}`}>
            <Download size={13}/> {exporting === format ? 'Generando…' : FORMAT_NAME[format]}
          </button>)}
        </div>
      </div>
      {!demo && <p className="export-hint">
        Exportar descarga <strong>todos</strong> los registros que coinciden con los filtros aplicados (máximo {EXPORT_MAX.toLocaleString('es-BO')}), no solo esta página.
        {pending && <> Tienes filtros sin aplicar: pulsa «Aplicar filtros» antes de exportar.</>}
      </p>}

      {!demo && <form className="audit-filters" onSubmit={apply}>
        <label className="field audit-search">Buscar
          <span className="search-box"><Search size={15}/><input placeholder="Acción, entidad o motivo" value={draft.search} onChange={event => setField('search')(event.target.value)} aria-label="Buscar en auditoría"/></span>
        </label>
        <label className="field">Desde
          <input type="date" value={draft.desde} onChange={event => setField('desde')(event.target.value)}/>
        </label>
        <label className="field">Hasta
          <input type="date" value={draft.hasta} onChange={event => setField('hasta')(event.target.value)}/>
        </label>
        <label className="field">Acción
          <select value={draft.accion} onChange={event => setField('accion')(event.target.value)}>
            <option value="">Todas</option>
            {Object.entries(ACTION_LABELS).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
          </select>
        </label>
        <label className="field">Entidad
          <select title="Sobre qué tipo de elemento se actuó (usuario, unidad, línea…). Se combina con «Acción»." value={draft.entidad_tipo} onChange={event => setField('entidad_tipo')(event.target.value)}>
            <option value="">Todas</option>
            {Object.entries(ENTITY_LABELS).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
          </select>
        </label>
        <label className="field">Resultado
          <select value={draft.resultado} onChange={event => setField('resultado')(event.target.value)}>
            <option value="">Todos</option><option value="EXITOSO">Exitoso</option><option value="FALLIDO">Fallido</option>
          </select>
        </label>
        <div className="field">Actor
          {token && <ActorPicker token={token} value={actor} onChange={chooseActor}/>}
        </div>
        <div className="audit-filter-actions">
          <button type="submit" className="primary-button">Aplicar filtros</button>
          <button type="button" className="secondary-button" onClick={clear} disabled={!hasFilters && !pending}>Limpiar</button>
        </div>
      </form>}

      {dateError && <div className="alert-error alert-inline" role="alert">{dateError}</div>}
      {notice && <div className="alert-ok" role="status">{notice}</div>}
      {filters.peticion_id && <div className="alert-ok" role="status">
        Mostrando solo los registros de una misma operación.{' '}
        <button type="button" className="link-button" onClick={removeRequestFilter}><X size={12}/> Quitar este filtro</button>
      </div>}
      {error && <div className="alert-error alert-inline" role="alert">{error}</div>}
      {loading && !demo ? <div className="empty-state">Cargando registros…</div>
        : <DataTable columns={columns} rows={demo ? [] : rows} rowKey={row => row.id} emptyText={demo ? 'Sin datos en modo demostración.' : 'No hay registros que coincidan con los filtros.'}/>}

      {!demo && totalPages > 1 && <div className="pager">
        <button type="button" className="secondary-button" disabled={filters.page <= 1} onClick={() => goToPage(filters.page - 1)}>Anterior</button>
        <span>Página {filters.page} de {totalPages}</span>
        <button type="button" className="secondary-button" disabled={filters.page >= totalPages} onClick={() => goToPage(filters.page + 1)}>Siguiente</button>
      </div>}
    </div>

    <p className="note-below"><ShieldCheck size={12}/> La bitácora es de solo agregar: ni la aplicación ni la base de datos permiten modificar o borrar sus registros. Cada exportación también queda registrada. El acceso lo controla Django.</p>

    {detail && <AuditDetailModal record={detail} onClose={() => setDetail(null)} onFilterByRequest={filterByRequest}/>}
  </div>
}
