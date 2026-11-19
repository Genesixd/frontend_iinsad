import { useState, type FormEvent } from 'react'
import { createUser, updateUser, type PersonaData, type UserRow } from '../../api/users'
import { Modal } from '../../components/ui/Modal'

type Props = {
  token: string
  /** Sin `user` se crea una cuenta nueva; con `user` se edita la existente. */
  user?: UserRow
  onClose: () => void
  onSaved: () => void
}

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
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const setField = (key: keyof PersonaData) => (value: string) => setPersona(current => ({ ...current, [key]: value }))

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (user) {
        await updateUser(token, user.id, { persona, ...(password ? { password } : {}) })
      } else {
        await createUser(token, { email: email.trim(), persona, ...(password ? { password } : {}) })
      }
      onSaved()
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'No se pudo guardar.')
      setSaving(false)
    }
  }

  return <Modal title={editing ? 'Editar usuario' : 'Nuevo usuario'}
    subtitle={editing ? user.email : 'Crea una cuenta institucional. El rol se asigna después.'} onClose={onClose}>
    <form className="form-grid" onSubmit={event => void submit(event)}>
      {error && <div className="alert-error form-span">{error}</div>}

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
