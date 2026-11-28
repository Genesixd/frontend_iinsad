import { useEffect, useState, type FormEvent } from 'react'
import { createUser, listUnits, ROLE_SCOPE, updateUser, type PersonaData, type UnitOption, type UserRow } from '../../api/users'
import { ApiError } from '../../api/http'
import { Modal } from '../../components/ui/Modal'
import { ROLE_CODES, ROLES, isRoleCode, type RoleCode } from '../../config/roles'
import { hasErrors, joinFieldErrors, validateInitialRole, type FormErrors } from '../../lib/catalogValidation'

type Props = {
  token: string
  /** Sin `user` se crea una cuenta nueva; con `user` se edita la existente. */
  user?: UserRow
  onClose: () => void
  onSaved: () => void
}

const SCOPE_HINT = {
  GLOBAL: 'Rol global: no depende de una unidad ni de un proyecto.',
  UNIDAD: 'Rol por unidad: elige la unidad que supervisará.',
  PROYECTO: 'Rol por proyecto: puede limitarse a un proyecto desde la pantalla de roles.',
} as const

export function UserFormModal({ token, user, onClose, onSaved }: Props) {
  const editing = !!user
  const [email, setEmail] = useState(user?.email ?? '')
  const [persona, setPersona] = useState<PersonaData>({
    nombres: user?.persona?.nombres ?? '',
    apellido_paterno: user?.persona?.apellido_paterno ?? '',
    apellido_materno: user?.persona?.apellido_materno ?? '',
    identificador_institucional: user?.persona?.identificador_institucional ?? '',
    procedencia: user?.persona?.procedencia ?? '',
  })
  const [password, setPassword] = useState('')
  const [rol, setRol] = useState('')
  const [unidad, setUnidad] = useState('')
  const [units, setUnits] = useState<UnitOption[]>([])
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const scope = isRoleCode(rol) ? ROLE_SCOPE[rol] : undefined

  // Las unidades solo hacen falta para elegir el rol inicial al crear la cuenta.
  useEffect(() => {
    if (editing) return
    let cancelled = false
    listUnits(token).then(all => { if (!cancelled) setUnits(all.filter(unit => unit.activa)) })
      .catch(() => { if (!cancelled) setError('No se pudo cargar la lista de unidades.') })
    return () => { cancelled = true }
  }, [editing, token])

  const setField = (key: keyof PersonaData) => (value: string) => setPersona(current => ({ ...current, [key]: value }))

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    if (!user) {
      const found = validateInitialRole(rol, scope, unidad)
      setFieldErrors(found)
      if (hasErrors(found)) return
    }
    setSaving(true)
    try {
      if (user) {
        await updateUser(token, user.id, { persona, ...(password ? { password } : {}) })
      } else {
        await createUser(token, {
          email: email.trim(), persona, ...(password ? { password } : {}),
          rol: rol as RoleCode, ...(scope === 'UNIDAD' ? { unidad: Number(unidad) } : {}),
        })
      }
      onSaved()
    } catch (failure) {
      if (failure instanceof ApiError) {
        const fields = joinFieldErrors(failure.fields)
        setFieldErrors(fields)
        // Errores de rol/unidad salen junto a su campo; el resto, en el aviso general.
        if (Object.keys(fields).some(key => key !== 'rol' && key !== 'unidad') || Object.keys(fields).length === 0) setError(failure.message)
      } else {
        setError(failure instanceof Error ? failure.message : 'No se pudo guardar.')
      }
      setSaving(false)
    }
  }

  return <Modal title={editing ? 'Editar usuario' : 'Nuevo usuario'}
    subtitle={editing ? user.email : 'Crea una cuenta institucional con su rol inicial. Después podrás asignar o quitar otros roles.'} onClose={onClose}>
    <form className="form-grid" onSubmit={event => void submit(event)}>
      {error && <div className="alert-error form-span" role="alert">{error}</div>}

      <label className="field form-span">Correo electrónico
        <input type="email" value={email} onChange={event => setEmail(event.target.value)} required disabled={editing}
          placeholder="nombre@iinsad.umsa.bo" autoComplete="off"/>
        {editing && <small>El correo no se puede cambiar.</small>}
      </label>

      <label className="field">Nombres
        <input value={persona.nombres} onChange={event => setField('nombres')(event.target.value)} required maxLength={160}/>
      </label>
      <label className="field">Apellido paterno
        <input value={persona.apellido_paterno} onChange={event => setField('apellido_paterno')(event.target.value)} required maxLength={120}/>
      </label>
      <label className="field">Apellido materno
        <input value={persona.apellido_materno} onChange={event => setField('apellido_materno')(event.target.value)} maxLength={120}/>
      </label>
      <label className="field">Identificador institucional
        <input value={persona.identificador_institucional ?? ''} onChange={event => setField('identificador_institucional')(event.target.value)} maxLength={80}/>
      </label>
      <label className="field form-span">Procedencia
        <input value={persona.procedencia ?? ''} onChange={event => setField('procedencia')(event.target.value)} maxLength={240}/>
      </label>

      {!editing && <>
        <label className={`field${fieldErrors.rol ? ' field--invalid' : ''}${scope === 'UNIDAD' ? '' : ' form-span'}`}>Rol inicial
          <select value={rol} onChange={event => { setRol(event.target.value); setUnidad('') }} aria-invalid={!!fieldErrors.rol}>
            <option value="">Selecciona un rol…</option>
            {ROLE_CODES.map(code => <option key={code} value={code}>{ROLES[code]}</option>)}
          </select>
          {fieldErrors.rol
            ? <small className="field-error" role="alert">{fieldErrors.rol}</small>
            : <small>{scope ? SCOPE_HINT[scope] : 'Toda cuenta nace con un rol; luego se pueden agregar o quitar otros.'}</small>}
        </label>
        {scope === 'UNIDAD' && <label className={`field${fieldErrors.unidad ? ' field--invalid' : ''}`}>Unidad
          <select value={unidad} onChange={event => setUnidad(event.target.value)} aria-invalid={!!fieldErrors.unidad}>
            <option value="">Selecciona una unidad…</option>
            {units.map(unit => <option key={unit.id} value={unit.id}>{unit.codigo} · {unit.nombre}</option>)}
          </select>
          {fieldErrors.unidad && <small className="field-error" role="alert">{fieldErrors.unidad}</small>}
        </label>}
      </>}

      <label className="field form-span">{editing ? 'Nueva contraseña (opcional)' : 'Contraseña inicial (opcional)'}
        <input type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="new-password"/>
        <small>
          {editing
            ? 'Si la defines, se cierran todas las sesiones abiertas de este usuario.'
            : 'Sin contraseña la cuenta queda pendiente de activación y no podrá entrar todavía.'}
        </small>
      </label>

      <div className="form-actions form-span">
        <button type="button" className="secondary-button" onClick={onClose}>Cancelar</button>
        <button type="submit" className="primary-button" disabled={saving}>{saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear usuario'}</button>
      </div>
    </form>
  </Modal>
}
