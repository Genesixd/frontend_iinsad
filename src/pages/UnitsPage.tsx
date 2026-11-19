import { useEffect, useState } from 'react'
import { Building2 } from 'lucide-react'
import { apiRequest } from '../api/http'
import { useAuth } from '../auth/useAuth'
import { DataTable, type Column } from '../components/ui/DataTable'

type UnitRow = { id: number; codigo: string; nombre: string; activa: boolean }
type UnitList = { results: UnitRow[]; count: number }
const DEMO_UNITS: UnitRow[] = [
  { id: 1, codigo: 'EC', nombre: 'Epidemiología Clínica', activa: true },
  { id: 2, codigo: 'ES', nombre: 'Epidemiología Social', activa: true },
  { id: 3, codigo: 'CD', nombre: 'Crecimiento y Desarrollo Infanto Juvenil', activa: true },
  { id: 4, codigo: 'PM', nombre: 'Parasitología, Medicina Tropical y Medio Ambiente', activa: true },
]
const columns: Column<UnitRow>[] = [
  { key: 'codigo', title: 'Código', cell: row => row.codigo },
  { key: 'nombre', title: 'Unidad', cell: row => row.nombre },
  { key: 'estado', title: 'Estado', cell: row => <span className={`small-tag ${row.activa ? 'tag-positive' : 'tag-muted'}`}>{row.activa ? 'Activa' : 'Inactiva'}</span> },
]
export function UnitsPage() {
  const { session } = useAuth()
  const allowed = session?.activeRole === 'ADMIN_TECNICO'
  const demo = session?.demo === true
  const token = session?.token ?? undefined
  const [rows, setRows] = useState<UnitRow[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (!allowed || demo) return
    let cancelled = false
    apiRequest<UnitList>('/usuarios/unidades/', {}, token).then(data => { if (!cancelled) setRows(data.results) })
      .catch((failure: unknown) => { if (!cancelled) setError(failure instanceof Error ? failure.message : 'Error de carga') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [allowed, demo, token])
  if (!allowed) return <div className="content-area"><div className="message-panel"><h2>Acceso restringido</h2><p>Esta vista es exclusiva del administrador técnico.</p></div></div>
  return <div className="content-area"><div className="section-heading"><div><span className="page-eyebrow">M01 · CATÁLOGOS</span><h2>Unidades de investigación</h2><p>Consulta inicial de las unidades del instituto.</p></div><div className="heading-icon"><Building2 size={23}/></div></div>
    <div className="data-card"><div className="data-card-head"><div><h3>Unidades</h3><p>{demo ? 'Datos de demostración.' : 'Datos proporcionados por Django.'}</p></div></div>
      {loading && !demo ? <div className="empty-state">Cargando unidades…</div> : error ? <div className="alert-error">{error}</div> : <DataTable columns={columns} rows={demo ? DEMO_UNITS : rows} rowKey={row => row.id}/>}</div>
    <p className="note-below">La gestión de líneas de investigación y las operaciones CRUD se incorporarán en las siguientes tareas del M01.</p>
  </div>
}
