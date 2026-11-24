import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { KeyRound, Pencil, Plus, Power, Search, ShieldCheck, Users } from 'lucide-react'
import { ApiError } from '../api/http'
import { deactivateUser, listUsers, updateUser, type UserFilters, type UserRow } from '../api/users'
import { useAuth } from '../auth/useAuth'
import { DataTable, type Column } from '../components/ui/DataTable'
import { ROLES, isRoleCode } from '../config/roles'
import { UserFormModal } from './users/UserFormModal'
import { UserRolesModal } from './users/UserRolesModal'

const PAGE_SIZE = 20

const DEMO_USERS: UserRow[] = [
  { id: 1, email: 'investigador@ejemplo.test', persona: { nombres: 'Investigador', apellido_paterno: 'de demostración', apellido_materno: '', nombre_completo: 'Investigador de demostración' }, is_active: true, activado_en: '2026-01-01', asignaciones: [] },
  { id: 2, email: 'responsable@ejemplo.test', persona: { nombres: 'Responsable', apellido_paterno: 'de demostración', apellido_materno: '', nombre_completo: 'Responsable de demostración' }, is_active: true, activado_en: '2026-01-01', asignaciones: [] },
  { id: 3, email: 'ctc@ejemplo.test', persona: { nombres: 'Miembro', apellido_paterno: 'CTC de demostración', apellido_materno: '', nombre_completo: 'Miembro CTC de demostración' }, is_active: false, activado_en: '2026-01-01', asignaciones: [] },
]

function accountState(user: UserRow) {
  if (!user.is_active) return { text: 'Inactivo', cls: 'tag-muted' }
  if (!user.activado_en) return { text: 'Pendiente de activación', cls: 'tag-warning' }
  return { text: 'Activo', cls: 'tag-positive' }
}

export function UsersPage() {
  const { session } = useAuth()
  const roleAllowed = session?.activeRole === 'ADMIN_TECNICO'
  const demo = session?.demo === true
  const token = session?.token ?? undefined
  const myId = session?.profile.id

  const [rows, setRows] = useState<UserRow[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [filters, setFilters] = useState<UserFilters>({ page: 1, search: '', estado: '' })
  const [searchInput, setSearchInput] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [formFor, setFormFor] = useState<UserRow | 'new' | null>(null)
  const [rolesFor, setRolesFor] = useState<UserRow | null>(null)

  const reload = useCallback(() => setReloadKey(key => key + 1), [])

  useEffect(() => {
    if (!roleAllowed || demo || !token) return
    let cancelled = false
    listUsers(token, filters)
      .then(data => { if (!cancelled) { setRows(data.results); setCount(data.count); setError('') } })
      .catch((failure: unknown) => {
        if (cancelled) return
        // una página que quedó vacía tras desactivar/filtrar: volver a la primera
        if (failure instanceof ApiError && failure.status === 404 && filters.page > 1) setFilters(current => ({ ...current, page: 1 }))
        else setError(failure instanceof Error ? failure.message : 'Error de carga')
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [roleAllowed, demo, token, filters, reloadKey])

  function applySearch(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setFilters(current => ({ ...current, search: searchInput, page: 1 }))
  }

  async function toggleActive(user: UserRow) {
    if (!token) return
    const turningOff = user.is_active
    const name = user.persona?.nombre_completo || user.email
    if (turningOff && !window.confirm(`¿Desactivar la cuenta de ${name}? Se cerrarán sus sesiones y no podrá entrar.`)) return
    setNotice(''); setError('')
    try {
      if (turningOff) await deactivateUser(token, user.id)
      else await updateUser(token, user.id, { is_active: true })
      setNotice(`Cuenta de ${name} ${turningOff ? 'desactivada' : 'reactivada'}.`)
      reload()
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'No se pudo cambiar el estado.')
    }
  }

  const columns: Column<UserRow>[] = [
    { key: 'nombre', title: 'Nombre', cell: row => row.persona?.nombre_completo || 'Sin registrar' },
    { key: 'email', title: 'Correo', cell: row => row.email },
    { key: 'roles', title: 'Roles vigentes', cell: row => {
      const vigentes = row.asignaciones.filter(a => a.vigente && !a.revocada_en)
      return vigentes.length
        ? <div className="tag-list">{vigentes.map(a => <span key={a.id} className="small-tag tag-info">{isRoleCode(a.rol) ? ROLES[a.rol] : a.rol}</span>)}</div>
        : <span className="subtle-text">Sin rol</span>
    } },
    { key: 'status', title: 'Estado', cell: row => { const st = accountState(row); return <span className={`small-tag ${st.cls}`}>{st.text}</span> } },
    { key: 'acciones', title: 'Acciones', cell: row => <div className="row-actions">
      <button type="button" className="secondary-button" disabled={demo} onClick={() => setFormFor(row)}><Pencil size={13}/> Editar</button>
      <button type="button" className="secondary-button" disabled={demo} onClick={() => setRolesFor(row)}><KeyRound size={13}/> Roles</button>
      {row.id !== myId && <button type="button" className="secondary-button" disabled={demo} onClick={() => void toggleActive(row)}><Power size={13}/> {row.is_active ? 'Desactivar' : 'Reactivar'}</button>}
    </div> },
  ]

  if (!roleAllowed) return <div className="content-area"><div className="message-panel"><h2>Acceso restringido</h2><p>Solo el administrador técnico puede consultar esta pantalla.</p></div></div>

  const shownRows = demo ? DEMO_USERS : rows
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE))

  return <div className="content-area">
    <div className="section-heading"><div><span className="page-eyebrow">M01 · USUARIOS Y ESTRUCTURA INSTITUCIONAL</span><h2>Administración de usuarios</h2><p>Crea cuentas, asigna roles y controla quién puede entrar al sistema.</p></div><div className="heading-icon"><Users size={23}/></div></div>

    <div className="data-card">
      <div className="data-card-head"><div><h3>Cuentas institucionales</h3><p>{demo ? 'Datos ficticios para revisar el diseño. Las acciones están desactivadas.' : `${count} cuenta${count === 1 ? '' : 's'} · datos consultados desde Django.`}</p></div>
        <button type="button" className="primary-button" disabled={demo} onClick={() => setFormFor('new')}><Plus size={15}/> Nuevo usuario</button></div>

      {!demo && <form className="toolbar" onSubmit={applySearch}>
        <div className="search-box"><Search size={15}/><input placeholder="Buscar por nombre o correo" value={searchInput} onChange={event => setSearchInput(event.target.value)} aria-label="Buscar usuarios"/></div>
        <select value={filters.estado} aria-label="Filtrar por estado" onChange={event => { setLoading(true); setFilters(current => ({ ...current, estado: event.target.value as UserFilters['estado'], page: 1 })) }}>
          <option value="">Todos los estados</option><option value="true">Solo activos</option><option value="false">Solo inactivos</option>
        </select>
        <button type="submit" className="secondary-button">Buscar</button>
      </form>}

      {notice && <div className="alert-ok">{notice}</div>}
      {error && <div className="alert-error alert-inline">{error}</div>}
      {loading && !demo ? <div className="empty-state">Cargando usuarios…</div> : <DataTable columns={columns} rows={shownRows} rowKey={row => row.id} emptyText="No hay usuarios que coincidan con la búsqueda."/>}

      {!demo && totalPages > 1 && <div className="pager">
        <button type="button" className="secondary-button" disabled={filters.page <= 1} onClick={() => { setLoading(true); setFilters(current => ({ ...current, page: current.page - 1 })) }}>Anterior</button>
        <span>Página {filters.page} de {totalPages}</span>
        <button type="button" className="secondary-button" disabled={filters.page >= totalPages} onClick={() => { setLoading(true); setFilters(current => ({ ...current, page: current.page + 1 })) }}>Siguiente</button>
      </div>}
    </div>

    <p className="note-below"><ShieldCheck size={12}/> Los permisos se verifican en el servidor: aunque esta pantalla se manipule, Django solo acepta estas operaciones del administrador técnico.</p>

    {token && formFor && <UserFormModal token={token} user={formFor === 'new' ? undefined : formFor} onClose={() => setFormFor(null)}
      onSaved={() => { const wasNew = formFor === 'new'; setFormFor(null); setNotice(wasNew ? 'Usuario creado con su rol inicial. Puedes asignarle más roles desde "Roles".' : 'Cambios guardados.'); reload() }}/>}
    {token && rolesFor && <UserRolesModal token={token} user={rolesFor} onClose={() => setRolesFor(null)} onChanged={reload}/>}
  </div>
}
