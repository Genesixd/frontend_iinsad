import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Ban, Plus } from 'lucide-react'
import {
  createAssignment, getUser, listUnits, revokeAssignment, ROLE_SCOPE,
  type Assignment, type UnitOption, type UserRow,
} from '../../api/users'
import { Modal } from '../../components/ui/Modal'
import { ROLE_CODES, ROLES, isRoleCode, type RoleCode } from '../../config/roles'

type Props = { token: string; user: UserRow; onClose: () => void; onChanged: () => void }

const SCOPE_TEXT = { GLOBAL: 'Global', UNIDAD: 'Por unidad', PROYECTO: 'Por proyecto' } as const

function roleName(code: string) { return isRoleCode(code) ? ROLES[code] : code }

function scopeDetail(a: Assignment) {
  if (a.ambito === 'UNIDAD') return a.unidad_nombre ?? `Unidad ${a.unidad}`
  if (a.ambito === 'PROYECTO') return a.proyecto_id ? `Proyecto ${a.proyecto_id}` : 'Proyecto: sin asignar aún'
  return SCOPE_TEXT.GLOBAL
}

function state(a: Assignment) {
  if (a.revocada_en) return { text: 'Revocada', cls: 'tag-muted' }
  return a.vigente ? { text: 'Vigente', cls: 'tag-positive' } : { text: 'Fuera de vigencia', cls: 'tag-muted' }
}

export function UserRolesModal({ token, user, onClose, onChanged }: Props) {
  const [assignments, setAssignments] = useState<Assignment[]>(user.asignaciones)
  const [units, setUnits] = useState<UnitOption[]>([])
  const [error, setError] = useState('')

  // formulario de nueva asignación
  const [rol, setRol] = useState<RoleCode>('INVESTIGADOR')
  const [unidad, setUnidad] = useState('')
  const [proyecto, setProyecto] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [motivo, setMotivo] = useState('')
  const [saving, setSaving] = useState(false)

  // revocación en curso
  const [revoking, setRevoking] = useState<number | null>(null)
  const [revokeReason, setRevokeReason] = useState('')

  const scope = ROLE_SCOPE[rol]

  const reload = useCallback(async () => {
    const fresh = await getUser(token, user.id)
    setAssignments(fresh.asignaciones)
    onChanged()
  }, [token, user.id, onChanged])

  useEffect(() => {
    let cancelled = false
    listUnits(token).then(page => { if (!cancelled) setUnits(page.results.filter(unit => unit.activa)) })
      .catch(() => { if (!cancelled) setError('No se pudo cargar la lista de unidades.') })
    return () => { cancelled = true }
  }, [token])

  async function add(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await createAssignment(token, {
        usuario: user.id, rol,
        unidad: scope === 'UNIDAD' ? Number(unidad) : null,
        proyecto_id: scope === 'PROYECTO' && proyecto ? Number(proyecto) : null,
        vigente_desde: desde || null, vigente_hasta: hasta || null, motivo: motivo.trim(),
      })
      setUnidad(''); setProyecto(''); setDesde(''); setHasta(''); setMotivo('')
      await reload()
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'No se pudo asignar el rol.')
    } finally {
      setSaving(false)
    }
  }

  async function revoke(id: number) {
  const reason = revokeReason.trim()

  // Validar el motivo antes de llamar al backend
  if (!reason) {
    setError('Debes indicar el motivo de la revocación.')
    return
  }

  // Si el motivo es válido, continuar con la revocación
  setError('')

  try {
    await revokeAssignment(token, id, reason)

    setRevoking(null)
    setRevokeReason('')

    await reload()
  } catch (failure) {
    setError(
      failure instanceof Error
        ? failure.message
        : 'No se pudo revocar la asignación.'
    )
  }
}

  return <Modal wide title="Roles del usuario" subtitle={`${user.persona?.nombre_completo ?? 'Sin nombre'} · ${user.email}`} onClose={onClose}>
    {error && <div className="alert-error">{error}</div>}

    <h4 className="modal-section">Asignaciones</h4>
    <p className="subtle-text">Un usuario siempre conserva al menos un rol vigente: para quitar el último, asigna primero el nuevo.</p>
    {assignments.length === 0
      ? <div className="empty-state">Este usuario todavía no tiene roles. Sin un rol vigente no puede entrar al sistema.</div>
      : <div className="table-scroll"><table className="compact-table">
        <thead><tr><th>Rol</th><th>Ámbito</th><th>Vigencia</th><th>Estado</th><th/></tr></thead>
        <tbody>{assignments.map(a => {
          const st = state(a)
          return <tr key={a.id}>
            <td>{roleName(a.rol)}</td>
            <td>{scopeDetail(a)}</td>
            <td>{a.vigente_desde ?? 'sin inicio'} → {a.vigente_hasta ?? 'sin fin'}</td>
            <td><span className={`small-tag ${st.cls}`}>{st.text}</span>{a.revocada_en && a.motivo && <small className="row-note">{a.motivo}</small>}</td>
            <td className="cell-actions">
              {!a.revocada_en && (revoking === a.id
                ? <div className="inline-revoke">
                  <input placeholder="Motivo de la revocación" value={revokeReason} onChange={event => setRevokeReason(event.target.value)} autoFocus/>
                  <button type="button" className="secondary-button" onClick={() => void revoke(a.id)}>Confirmar</button>
                  <button type="button" className="secondary-button" onClick={() => { setRevoking(null); setRevokeReason('') }}>Cancelar</button>
                </div>
                : <button type="button" className="secondary-button" onClick={() => { setRevoking(a.id); setRevokeReason('') }}><Ban size={13}/> Revocar</button>)}
            </td>
          </tr>
        })}</tbody>
      </table></div>}

    <h4 className="modal-section">Asignar un rol nuevo</h4>
    <form className="form-grid" onSubmit={event => void add(event)}>
      <label className="field">Rol
        <select value={rol} onChange={event => setRol(event.target.value as RoleCode)}>
          {ROLE_CODES.map(code => <option key={code} value={code}>{ROLES[code]}</option>)}
        </select>
        <small>Ámbito: {SCOPE_TEXT[scope]}. Lo define el rol, no se elige.</small>
      </label>

      {scope === 'UNIDAD' && <label className="field">Unidad
        <select value={unidad} onChange={event => setUnidad(event.target.value)} required>
          <option value="">Selecciona una unidad…</option>
          {units.map(unit => <option key={unit.id} value={unit.id}>{unit.codigo} · {unit.nombre}</option>)}
        </select>
      </label>}
      {scope === 'PROYECTO' && <label className="field">ID del proyecto (opcional)
        <input type="number" min={1} value={proyecto} onChange={event => setProyecto(event.target.value)}/>
        <small>Puede quedar vacío hasta que exista el módulo de proyectos.</small>
      </label>}

      <label className="field">Vigente desde (opcional)
        <input type="date" value={desde} onChange={event => setDesde(event.target.value)}/>
      </label>
      <label className="field">Vigente hasta (opcional)
        <input type="date" value={hasta} onChange={event => setHasta(event.target.value)} min={desde || undefined}/>
      </label>
      <label className="field form-span">Motivo (opcional)
        <input value={motivo} onChange={event => setMotivo(event.target.value)} placeholder="Ej.: asume la dirección de la unidad"/>
      </label>
      <div className="form-actions form-span">
        <button type="submit" className="primary-button" disabled={saving}><Plus size={15}/> {saving ? 'Asignando…' : 'Asignar rol'}</button>
      </div>
    </form>
  </Modal>
}
