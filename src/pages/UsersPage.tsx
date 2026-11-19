import { useEffect, useState } from 'react'
import { ShieldCheck, Users } from 'lucide-react'
import { apiRequest } from '../api/http'
import { useAuth } from '../auth/useAuth'
import { DataTable, type Column } from '../components/ui/DataTable'

type UserRow = { id: number; email: string; persona?: { nombre_completo?: string } | null; is_active: boolean }
type UserList = { results: UserRow[]; count: number }
const DEMO_USERS: UserRow[] = [
  { id: 1, email: 'investigador@ejemplo.test', persona: { nombre_completo: 'Investigador de demostración' }, is_active: true },
  { id: 2, email: 'responsable@ejemplo.test', persona: { nombre_completo: 'Responsable de demostración' }, is_active: true },
  { id: 3, email: 'ctc@ejemplo.test', persona: { nombre_completo: 'Miembro CTC de demostración' }, is_active: false },
]
const columns: Column<UserRow>[] = [
  { key: 'nombre', title: 'Nombre', cell: row => row.persona?.nombre_completo || 'Sin registrar' },
  { key: 'email', title: 'Correo', cell: row => row.email },
  { key: 'status', title: 'Estado', cell: row => <span className={`small-tag ${row.is_active ? 'tag-positive' : 'tag-muted'}`}>{row.is_active ? 'Activo' : 'Inactivo'}</span> },
]

export function UsersPage() {
  const { session } = useAuth()
  const [rows, setRows] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const roleAllowed = session?.activeRole === 'ADMIN_TECNICO'
  const demo = session?.demo === true
  const token = session?.token ?? undefined

  useEffect(() => {
    if (!roleAllowed) return
    if (demo) return
    let cancelled = false
    apiRequest<UserList>('/usuarios/usuarios/', {}, token)
      .then(data => { if (!cancelled) setRows(data.results) })
      .catch((failure: unknown) => { if (!cancelled) setError(failure instanceof Error ? failure.message : 'Error de carga') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [roleAllowed, demo, token])

  if (!roleAllowed) return <div className="content-area"><div className="message-panel"><h2>Acceso restringido</h2><p>Solo el administrador técnico puede consultar esta pantalla.</p></div></div>
  const shownRows = demo ? DEMO_USERS : rows
  return <div className="content-area"><div className="section-heading"><div><span className="page-eyebrow">M01 · USUARIOS Y ESTRUCTURA INSTITUCIONAL</span><h2>Administración de usuarios</h2><p>Consulta de cuentas registradas en el sistema.</p></div><div className="heading-icon"><Users size={23}/></div></div>
    <div className="data-card"><div className="data-card-head"><div><h3>Cuentas institucionales</h3><p>{demo ? 'Datos ficticios para revisar el diseño.' : 'Datos consultados desde Django.'}</p></div><span className="small-tag tag-positive"><ShieldCheck size={14}/> Vista restringida</span></div>
      {loading && !demo ? <div className="empty-state">Cargando usuarios…</div> : error ? <div className="alert-error">{error}</div> : <DataTable columns={columns} rows={shownRows} rowKey={row => row.id} />}
    </div><p className="note-below">El CRUD definitivo se integrará con los endpoints del M01 y sus controles de permisos; esta vista inicial no modifica datos.</p>
  </div>
}
