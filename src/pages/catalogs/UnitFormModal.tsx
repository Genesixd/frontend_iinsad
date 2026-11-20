import { useState, type FormEvent } from 'react'
import { createUnit, updateUnit, type Unit } from '../../api/catalogs'
import { ApiError } from '../../api/http'
import { Modal } from '../../components/ui/Modal'
import {
  CODE_MAX, UNIT_NAME_MAX, hasErrors, joinFieldErrors, normalizeCode, normalizeName, validateUnit, type FormErrors,
} from '../../lib/catalogValidation'

type Props = {
  token: string
  /** Sin `unit` se crea una unidad nueva; con `unit` se edita la existente. */
  unit?: Unit
  onClose: () => void
  onSaved: (unit: Unit) => void
}

export function UnitFormModal({ token, unit, onClose, onSaved }: Props) {
  const editing = !!unit
  const [codigo, setCodigo] = useState(unit?.codigo ?? '')
  const [nombre, setNombre] = useState(unit?.nombre ?? '')
  const [activa, setActiva] = useState(unit?.activa ?? true)
  const [errors, setErrors] = useState<FormErrors>({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    const found = validateUnit({ codigo, nombre })
    setErrors(found)
    setFormError('')
    if (hasErrors(found)) return
    setSaving(true)
    const payload = { codigo: normalizeCode(codigo), nombre: normalizeName(nombre), activa }
    try {
      const saved = unit ? await updateUnit(token, unit.id, payload) : await createUnit(token, payload)
      onSaved(saved)
    } catch (failure) {
      if (failure instanceof ApiError && Object.keys(failure.fields).length > 0) setErrors(joinFieldErrors(failure.fields))
      else setFormError(failure instanceof Error ? failure.message : 'No se pudo guardar.')
      setSaving(false)
    }
  }

  return <Modal title={editing ? 'Editar unidad' : 'Nueva unidad'}
    subtitle={editing ? `${unit.codigo} · ${unit.nombre}` : 'Registra una unidad de investigación del instituto.'} onClose={onClose}>
    <form className="form-grid" onSubmit={event => void submit(event)} noValidate>
      {formError && <div className="alert-error form-span" role="alert">{formError}</div>}

      <label className={`field${errors.codigo ? ' field--invalid' : ''}`}>Código
        <input value={codigo} onChange={event => setCodigo(event.target.value)} maxLength={CODE_MAX} placeholder="EC"
          aria-invalid={!!errors.codigo} autoComplete="off"/>
        {errors.codigo ? <small className="field-error" role="alert">{errors.codigo}</small> : <small>Se guarda en mayúsculas.</small>}
      </label>
      <label className={`field${errors.nombre ? ' field--invalid' : ''}`}>Nombre
        <input value={nombre} onChange={event => setNombre(event.target.value)} maxLength={UNIT_NAME_MAX} placeholder="Epidemiología Clínica"
          aria-invalid={!!errors.nombre} autoComplete="off"/>
        {errors.nombre && <small className="field-error" role="alert">{errors.nombre}</small>}
      </label>

      <label className="field form-span checkbox-field">
        <span><input type="checkbox" checked={activa} onChange={event => setActiva(event.target.checked)}/> Unidad activa</span>
        {errors.activa && <small className="field-error" role="alert">{errors.activa}</small>}
      </label>

      <div className="form-actions form-span">
        <button type="button" className="secondary-button" onClick={onClose}>Cancelar</button>
        <button type="submit" className="primary-button" disabled={saving}>{saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear unidad'}</button>
      </div>
    </form>
  </Modal>
}
