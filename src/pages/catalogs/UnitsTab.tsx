import { useState, type FormEvent } from 'react'
import { Pencil, Plus, Power, Search, Trash2 } from 'lucide-react'
import { deleteUnit, fetchUnits, updateUnit, type CatalogFilters, type Estado, type Unit } from '../../api/catalogs'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { UnitFormModal } from './UnitFormModal'
import { useRemoteList } from './useRemoteList'

const PAGE_SIZE = 20

const DEMO_UNITS: Unit[] = [
  { id: 1, codigo: 'EC', nombre: 'Epidemiología Clínica', activa: true, total_lineas: 2, lineas_activas: 2, creado_en: '' },
  { id: 2, codigo: 'ES', nombre: 'Epidemiología Social', activa: true, total_lineas: 1, lineas_activas: 1, creado_en: '' },
  { id: 3, codigo: 'CD', nombre: 'Crecimiento y Desarrollo Infanto Juvenil', activa: true, total_lineas: 1, lineas_activas: 1, creado_en: '' },
  { id: 4, codigo: 'PM', nombre: 'Parasitología, Medicina Tropical y Medio Ambiente', activa: true, total_lineas: 1, lineas_activas: 1, creado_en: '' },
]

export function UnitsTab({ token, demo }: { token: string | undefined; demo: boolean }) {
  const [filters, setFilters] = useState<CatalogFilters>({ page: 1, search: '', estado: '' })
  const [searchInput, setSearchInput] = useState('')
  const [notice, setNotice] = useState('')
  const [formFor, setFormFor] = useState<Unit | 'new' | null>(null)
  const { rows, count, loading, error, setError, reload, setLoading } = useRemoteList(
    fetchUnits, token, !demo, filters, () => setFilters(current => ({ ...current, page: 1 })))

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

  function toggleActive(unit: Unit) {
    if (!token) return
    if (unit.activa && !window.confirm(`¿Desactivar la unidad ${unit.codigo}? Dejará de ofrecerse al crear líneas.`)) return
    void run(() => updateUnit(token, unit.id, { activa: !unit.activa }), `Unidad ${unit.codigo} ${unit.activa ? 'desactivada' : 'reactivada'}.`)
  }

  function remove(unit: Unit) {
    if (!token) return
    if (!window.confirm(`¿Eliminar la unidad ${unit.codigo} (${unit.nombre})? Esta acción no se puede deshacer.`)) return
    void run(() => deleteUnit(token, unit.id), `Unidad ${unit.codigo} eliminada.`)
  }

  const columns: Column<Unit>[] = [
    { key: 'codigo', title: 'Código', cell: row => <strong>{row.codigo}</strong> },
    { key: 'nombre', title: 'Unidad', cell: row => row.nombre },
    { key: 'lineas', title: 'Líneas', cell: row => `${row.lineas_activas} activa${row.lineas_activas === 1 ? '' : 's'} de ${row.total_lineas}` },
    { key: 'estado', title: 'Estado', cell: row => <span className={`small-tag ${row.activa ? 'tag-positive' : 'tag-muted'}`}>{row.activa ? 'Activa' : 'Inactiva'}</span> },
    { key: 'acciones', title: 'Acciones', cell: row => <div className="row-actions">
      <button type="button" className="secondary-button" disabled={demo} onClick={() => setFormFor(row)} aria-label={`Editar unidad ${row.codigo}`}><Pencil size={13}/> Editar</button>
      <button type="button" className="secondary-button" disabled={demo} onClick={() => toggleActive(row)} aria-label={`${row.activa ? 'Desactivar' : 'Reactivar'} unidad ${row.codigo}`}><Power size={13}/> {row.activa ? 'Desactivar' : 'Reactivar'}</button>
      <button type="button" className="secondary-button danger-button" disabled={demo} onClick={() => remove(row)} aria-label={`Eliminar unidad ${row.codigo}`}><Trash2 size={13}/> Eliminar</button>
    </div> },
  ]

  const shown = demo ? DEMO_UNITS : rows
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE))

  return <div className="data-card">
    <div className="data-card-head"><div><h3>Unidades</h3><p>{demo ? 'Datos ficticios. Las acciones están desactivadas.' : `${count} unidad${count === 1 ? '' : 'es'} · datos consultados desde Django.`}</p></div>
      <button type="button" className="primary-button" disabled={demo} onClick={() => setFormFor('new')}><Plus size={15}/> Nueva unidad</button></div>

    {!demo && <form className="toolbar" onSubmit={applySearch}>
      <div className="search-box"><Search size={15}/><input placeholder="Buscar por código o nombre" value={searchInput} onChange={event => setSearchInput(event.target.value)} aria-label="Buscar unidades"/></div>
      <select value={filters.estado} aria-label="Filtrar unidades por estado" onChange={event => { setLoading(true); setFilters(current => ({ ...current, estado: event.target.value as Estado, page: 1 })) }}>
        <option value="">Todos los estados</option><option value="true">Solo activas</option><option value="false">Solo inactivas</option>
      </select>
      <button type="submit" className="secondary-button">Buscar</button>
    </form>}

    {notice && <div className="alert-ok" role="status">{notice}</div>}
    {error && <div className="alert-error alert-inline" role="alert">{error}</div>}
    {loading && !demo ? <div className="empty-state">Cargando unidades…</div> : <DataTable columns={columns} rows={shown} rowKey={row => row.id} emptyText="No hay unidades que coincidan con la búsqueda."/>}

    {!demo && totalPages > 1 && <div className="pager">
      <button type="button" className="secondary-button" disabled={filters.page <= 1} onClick={() => { setLoading(true); setFilters(current => ({ ...current, page: current.page - 1 })) }}>Anterior</button>
      <span>Página {filters.page} de {totalPages}</span>
      <button type="button" className="secondary-button" disabled={filters.page >= totalPages} onClick={() => { setLoading(true); setFilters(current => ({ ...current, page: current.page + 1 })) }}>Siguiente</button>
    </div>}

    {token && formFor && <UnitFormModal token={token} unit={formFor === 'new' ? undefined : formFor} onClose={() => setFormFor(null)}
      onSaved={unit => { const wasNew = formFor === 'new'; setFormFor(null); setNotice(wasNew ? `Unidad ${unit.codigo} creada.` : `Unidad ${unit.codigo} actualizada.`); reload() }}/>}
  </div>
}
