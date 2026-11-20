import { useEffect, useState, type FormEvent } from 'react'
import { Pencil, Plus, Power, Search, Trash2 } from 'lucide-react'
import {
  deleteLine, fetchLines, fetchUnits, updateLine, type Estado, type Line, type LineFilters, type Unit,
} from '../../api/catalogs'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { LineFormModal } from './LineFormModal'
import { useRemoteList } from './useRemoteList'

const PAGE_SIZE = 20

const DEMO_LINES: Line[] = [
  { id: 1, unidad: 1, unidad_codigo: 'EC', unidad_nombre: 'Epidemiología Clínica', codigo: 'EC-01', nombre: 'Enfermedades crónicas no transmisibles', activa: true, creado_en: '' },
  { id: 2, unidad: 2, unidad_codigo: 'ES', unidad_nombre: 'Epidemiología Social', codigo: 'ES-01', nombre: 'Determinantes sociales de la salud', activa: true, creado_en: '' },
  { id: 3, unidad: 3, unidad_codigo: 'CD', unidad_nombre: 'Crecimiento y Desarrollo Infanto Juvenil', codigo: 'CD-01', nombre: 'Nutrición y crecimiento infantil', activa: true, creado_en: '' },
]

export function LinesTab({ token, demo }: { token: string | undefined; demo: boolean }) {
  const [filters, setFilters] = useState<LineFilters>({ page: 1, search: '', estado: '', unidad: '' })
  const [searchInput, setSearchInput] = useState('')
  const [notice, setNotice] = useState('')
  const [units, setUnits] = useState<Unit[]>([])
  const [formFor, setFormFor] = useState<Line | 'new' | null>(null)
  const { rows, count, loading, error, setError, reload, setLoading } = useRemoteList(
    fetchLines, token, !demo, filters, () => setFilters(current => ({ ...current, page: 1 })))

  // Unidades para el filtro y para el selector del formulario.
  useEffect(() => {
    if (demo || !token) return
    let cancelled = false
    fetchUnits(token, { page: 1, search: '', estado: '' }, 100)
      .then(data => { if (!cancelled) setUnits(data.results) })
      .catch((failure: unknown) => { if (!cancelled) setError(failure instanceof Error ? failure.message : 'No se pudieron cargar las unidades.') })
    return () => { cancelled = true }
  }, [demo, token, setError])

  function applySearch(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setFilters(current => ({ ...current, search: searchInput, page: 1 }))
  }

  async function run(action: () => Promise<unknown>, success: string) {
    setNotice(''); setError('')
    try { await action(); setNotice(success); reload() }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'No se pudo completar la acción.') }
  }

  function toggleActive(line: Line) {
    if (!token) return
    if (line.activa && !window.confirm(`¿Desactivar la línea ${line.codigo}?`)) return
    void run(() => updateLine(token, line.id, { activa: !line.activa }), `Línea ${line.codigo} ${line.activa ? 'desactivada' : 'reactivada'}.`)
  }

  function remove(line: Line) {
    if (!token) return
    if (!window.confirm(`¿Eliminar la línea ${line.codigo} (${line.nombre})? Esta acción no se puede deshacer.`)) return
    void run(() => deleteLine(token, line.id), `Línea ${line.codigo} eliminada.`)
  }

  const columns: Column<Line>[] = [
    { key: 'codigo', title: 'Código', cell: row => <strong>{row.codigo}</strong> },
    { key: 'nombre', title: 'Línea de investigación', cell: row => row.nombre },
    { key: 'unidad', title: 'Unidad', cell: row => <span title={row.unidad_nombre}>{row.unidad_codigo} · {row.unidad_nombre}</span> },
    { key: 'estado', title: 'Estado', cell: row => <span className={`small-tag ${row.activa ? 'tag-positive' : 'tag-muted'}`}>{row.activa ? 'Activa' : 'Inactiva'}</span> },
    { key: 'acciones', title: 'Acciones', cell: row => <div className="row-actions">
      <button type="button" className="secondary-button" disabled={demo} onClick={() => setFormFor(row)} aria-label={`Editar línea ${row.codigo}`}><Pencil size={13}/> Editar</button>
      <button type="button" className="secondary-button" disabled={demo} onClick={() => toggleActive(row)} aria-label={`${row.activa ? 'Desactivar' : 'Reactivar'} línea ${row.codigo}`}><Power size={13}/> {row.activa ? 'Desactivar' : 'Reactivar'}</button>
      <button type="button" className="secondary-button danger-button" disabled={demo} onClick={() => remove(row)} aria-label={`Eliminar línea ${row.codigo}`}><Trash2 size={13}/> Eliminar</button>
    </div> },
  ]

  const shown = demo ? DEMO_LINES : rows
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE))

  return <div className="data-card">
    <div className="data-card-head"><div><h3>Líneas de investigación</h3><p>{demo ? 'Datos ficticios. Las acciones están desactivadas.' : `${count} línea${count === 1 ? '' : 's'} · datos consultados desde Django.`}</p></div>
      <button type="button" className="primary-button" disabled={demo} onClick={() => setFormFor('new')}><Plus size={15}/> Nueva línea</button></div>

    {!demo && <form className="toolbar" onSubmit={applySearch}>
      <div className="search-box"><Search size={15}/><input placeholder="Buscar por código, nombre o unidad" value={searchInput} onChange={event => setSearchInput(event.target.value)} aria-label="Buscar líneas"/></div>
      <select value={filters.unidad} aria-label="Filtrar líneas por unidad" onChange={event => { setLoading(true); setFilters(current => ({ ...current, unidad: event.target.value, page: 1 })) }}>
        <option value="">Todas las unidades</option>
        {units.map(unit => <option key={unit.id} value={unit.id}>{unit.codigo} · {unit.nombre}</option>)}
      </select>
      <select value={filters.estado} aria-label="Filtrar líneas por estado" onChange={event => { setLoading(true); setFilters(current => ({ ...current, estado: event.target.value as Estado, page: 1 })) }}>
        <option value="">Todos los estados</option><option value="true">Solo activas</option><option value="false">Solo inactivas</option>
      </select>
      <button type="submit" className="secondary-button">Buscar</button>
    </form>}

    {notice && <div className="alert-ok" role="status">{notice}</div>}
    {error && <div className="alert-error alert-inline" role="alert">{error}</div>}
    {loading && !demo ? <div className="empty-state">Cargando líneas…</div> : <DataTable columns={columns} rows={shown} rowKey={row => row.id} emptyText="No hay líneas que coincidan con la búsqueda."/>}

    {!demo && totalPages > 1 && <div className="pager">
      <button type="button" className="secondary-button" disabled={filters.page <= 1} onClick={() => { setLoading(true); setFilters(current => ({ ...current, page: current.page - 1 })) }}>Anterior</button>
      <span>Página {filters.page} de {totalPages}</span>
      <button type="button" className="secondary-button" disabled={filters.page >= totalPages} onClick={() => { setLoading(true); setFilters(current => ({ ...current, page: current.page + 1 })) }}>Siguiente</button>
    </div>}

    {token && formFor && <LineFormModal token={token} units={units} line={formFor === 'new' ? undefined : formFor}
      defaultUnit={formFor === 'new' && filters.unidad ? Number(filters.unidad) : undefined} onClose={() => setFormFor(null)}
      onSaved={line => { const wasNew = formFor === 'new'; setFormFor(null); setNotice(wasNew ? `Línea ${line.codigo} creada.` : `Línea ${line.codigo} actualizada.`); reload() }}/>}
  </div>
}
