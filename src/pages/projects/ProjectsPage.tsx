import { useEffect, useState, type FormEvent } from 'react'
import { Plus, Search } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchUnits, type Unit } from '../../api/catalogs'
import { fetchProjects, type ProjectFilters, type ProjectRow, type ProposalState } from '../../api/projects'
import { useAuth } from '../../auth/useAuth'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { roleCanAccess } from '../../config/navigation'
import { ORIGIN_LABELS, STATE_LABELS, STATE_TAGS } from '../../lib/proposal'
import { useRemoteList } from '../catalogs/useRemoteList'
import { NewProposalModal } from './NewProposalModal'

const PAGE_SIZE = 20
const NO_FILTERS: ProjectFilters = { page: 1, search: '', estado: '', unidad: '', persona: '' }

export function StateTag({ project }: { project: Pick<ProjectRow, 'estado_propuesta' | 'origen' | 'anulado'> }) {
  if (project.anulado) return <span className="small-tag tag-negative">Anulado</span>
  const state = project.estado_propuesta
  if (!state) return <span className="small-tag tag-muted">{ORIGIN_LABELS[project.origen]}</span>
  return <span className={`small-tag ${STATE_TAGS[state]}`}>{STATE_LABELS[state]}</span>
}

export function ProjectsPage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const role = session?.activeRole
  const demo = session?.demo === true
  const token = session?.token ?? undefined
  const me = session?.profile.persona ?? null
  const allowed = !!role && roleCanAccess(role, '/proyectos')
  const canRegister = role === 'INVESTIGADOR' || role === 'ADMIN_TECNICO'

  const [filters, setFilters] = useState<ProjectFilters>(NO_FILTERS)
  const [searchInput, setSearchInput] = useState('')
  const [units, setUnits] = useState<Unit[]>([])
  const [creating, setCreating] = useState(false)
  const { rows, count, loading, error, setError, setLoading } = useRemoteList(
    fetchProjects, token, allowed && !demo, filters, () => setFilters(current => ({ ...current, page: 1 })))

  useEffect(() => {
    if (!allowed || demo || !token) return
    let cancelled = false
    fetchUnits(token, { page: 1, search: '', estado: '' }, 100)
      .then(page => { if (!cancelled) setUnits(page.results) })
      .catch((failure: unknown) => { if (!cancelled) setError(failure instanceof Error ? failure.message : 'No se pudieron cargar las unidades.') })
    return () => { cancelled = true }
  }, [allowed, demo, token, setError])

  if (!allowed) return <div className="content-area"><div className="message-panel"><h2>Acceso restringido</h2><p>Esta opción no está disponible para el rol seleccionado.</p></div></div>

  function change(next: Partial<ProjectFilters>) {
    const updated = { ...filters, ...next, page: next.page ?? 1 }
    // Si nada cambia no se vuelve a pedir la lista (y no queda «Cargando…» para siempre).
    if ((Object.keys(updated) as Array<keyof ProjectFilters>).every(key => updated[key] === filters[key])) return
    setLoading(true)
    setFilters(updated)
  }

  function applySearch(event: FormEvent) {
    event.preventDefault()
    change({ search: searchInput })
  }

  const filtered = !!(filters.search || filters.estado || filters.unidad || filters.persona)
  const emptyText = filtered ? 'No hay proyectos que coincidan con los filtros.'
    : role === 'CTC' ? 'Todavía no tienes propuestas designadas. La designación de revisores llega con el módulo de evaluación (M03).'
      : 'Todavía no hay proyectos que puedas consultar.'

  const columns: Column<ProjectRow>[] = [
    { key: 'titulo', title: 'Proyecto', cell: row => <>
      <Link className="table-link" to={`/proyectos/${row.id}`}>{row.titulo ?? '(Sin título visible)'}</Link>
      <small className="row-note">{row.codigo ?? 'Sin código'}</small>
    </> },
    { key: 'unidad', title: 'Unidad', cell: row => <span title={row.unidad_nombre}>{row.unidad_codigo}</span> },
    { key: 'principal', title: 'Investigador principal', cell: row => row.investigador_principal?.nombre_completo ?? '—' },
    { key: 'estado', title: 'Estado', cell: row => <StateTag project={row}/> },
    { key: 'acciones', title: 'Acciones', cell: row => <Link className="secondary-button" to={`/proyectos/${row.id}`} aria-label={`Ver detalle de ${row.titulo ?? `proyecto ${row.id}`}`}>Ver detalle</Link> },
  ]

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE))

  return <div className="content-area">
    <div className="section-heading"><div><span className="page-eyebrow">M02 · PROPUESTAS</span><h2>Proyectos y propuestas</h2><p>Solo aparecen los proyectos que tu cuenta tiene permiso de consultar.</p></div></div>

    {demo ? <div className="message-panel"><h2>Requiere una cuenta</h2><p>El modo demostración no se conecta con Django. Inicia sesión para trabajar con propuestas.</p></div> : <div className="data-card">
      <div className="data-card-head"><div><h3>Listado</h3><p>{count} proyecto{count === 1 ? '' : 's'}{filtered ? ' con estos filtros' : ''}.</p></div>
        {canRegister && <button type="button" className="primary-button" onClick={() => setCreating(true)}><Plus size={15}/> Nueva propuesta</button>}</div>

      <form className="toolbar" onSubmit={applySearch}>
        <div className="search-box"><Search size={15}/><input placeholder="Buscar por título, código o referencia" value={searchInput} onChange={event => setSearchInput(event.target.value)} aria-label="Buscar proyectos"/></div>
        <select value={filters.estado} aria-label="Filtrar por estado de propuesta" onChange={event => change({ estado: event.target.value as '' | ProposalState })}>
          <option value="">Todos los estados</option>
          {Object.entries(STATE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select value={filters.unidad} aria-label="Filtrar por unidad" onChange={event => change({ unidad: event.target.value })}>
          <option value="">Todas las unidades</option>
          {units.map(unit => <option key={unit.id} value={unit.id}>{unit.codigo} · {unit.nombre}</option>)}
        </select>
        {me && <label className="toolbar-check"><input type="checkbox" checked={!!filters.persona} onChange={event => change({ persona: event.target.checked ? String(me.id) : '' })}/> Solo donde participo</label>}
        <button type="submit" className="secondary-button">Buscar</button>
        {filtered && <button type="button" className="link-button" onClick={() => { setSearchInput(''); change(NO_FILTERS) }}>Limpiar filtros</button>}
      </form>

      {error && <div className="alert-error alert-inline" role="alert">{error}</div>}
      {loading ? <div className="empty-state">Cargando proyectos…</div> : !error && <DataTable columns={columns} rows={rows} rowKey={row => row.id} emptyText={emptyText}/>}

      {totalPages > 1 && <div className="pager">
        <button type="button" className="secondary-button" disabled={filters.page <= 1} onClick={() => change({ page: filters.page - 1 })}>Anterior</button>
        <span>Página {filters.page} de {totalPages}</span>
        <button type="button" className="secondary-button" disabled={filters.page >= totalPages} onClick={() => change({ page: filters.page + 1 })}>Siguiente</button>
      </div>}
    </div>}

    {token && creating && <NewProposalModal token={token} units={units} me={me} chooseInvestigator={role === 'ADMIN_TECNICO'}
      onClose={() => setCreating(false)}
      onCreated={project => navigate(`/proyectos/${project.id}`, { state: { notice: 'Borrador guardado. Complétalo y envíalo a revisión cuando esté listo.' } })}/>}
  </div>
}
