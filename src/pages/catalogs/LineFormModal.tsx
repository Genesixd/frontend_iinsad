import { useState, type FormEvent } from 'react'
import { createLine, updateLine, type Line, type Unit } from '../../api/catalogs'
import { ApiError } from '../../api/http'
import { Modal } from '../../components/ui/Modal'
import {
  CODE_MAX, LINE_NAME_MAX, hasErrors, joinFieldErrors, normalizeCode, normalizeName, validateLine, type FormErrors,
} from '../../lib/catalogValidation'

type Props = {
  token: string
  /** Unidades disponibles para elegir. */
  units: Unit[]
  /** Sin `line` se crea una línea nueva; con `line` se edita la existente. */
  line?: Line
  /** Unidad preseleccionada al crear (p. ej. la del filtro activo). */
  defaultUnit?: number
  onClose: () => void
  onSaved: (line: Line) => void
}

export function LineFormModal({ token, units, line, defaultUnit, onClose, onSaved }: Props) {
  const editing = !!line
  const [unidad, setUnidad] = useState(line ? String(line.unidad) : defaultUnit ? String(defaultUnit) : '')
  const [codigo, setCodigo] = useState(line?.codigo ?? '')
  const [nombre, setNombre] = useState(line?.nombre ?? '')
  const [activa, setActiva] = useState(line?.activa ?? true)
  const [motivo, setMotivo] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const changingUnit = editing && unidad !== '' && Number(unidad) !== line.unidad
  // Solo se ofrecen unidades activas; al editar también la actual aunque esté inactiva.
  const options = units.filter(unit => unit.activa || unit.id === line?.unidad)

  async function submit(event: FormEvent) {
    event.preventDefault()
    const found = validateLine({ unidad, codigo, nombre, motivo }, line?.unidad)
    setErrors(found)
    setFormError('')
    if (hasErrors(found)) return
    setSaving(true)
    const payload = {
      unidad: Number(unidad), codigo: normalizeCode(codigo), nombre: normalizeName(nombre), activa,
      ...(changingUnit ? { motivo: motivo.trim() } : {}),
    }
    try {
      const saved = line ? await updateLine(token, line.id, payload) : await createLine(token, payload)
      onSaved(saved)
    } catch (failure) {
      if (failure instanceof ApiError && Object.keys(failure.fields).length > 0) setErrors(joinFieldErrors(failure.fields))
      else setFormError(failure instanceof Error ? failure.message : 'No se pudo guardar.')
      setSaving(false)
    }
  }

  return <Modal title={editing ? 'Editar línea de investigación' : 'Nueva línea de investigación'}
    subtitle={editing ? `${line.codigo} · ${line.unidad_nombre}` : 'Cada línea pertenece a una unidad.'} onClose={onClose}>
    <form className="form-grid" onSubmit={event => void submit(event)} noValidate>
      {formError && <div className="alert-error form-span" role="alert">{formError}</div>}

      <label className={`field form-span${errors.unidad ? ' field--invalid' : ''}`}>Unidad
        <select value={unidad} onChange={event => setUnidad(event.target.value)} aria-invalid={!!errors.unidad}>
          <option value="">Selecciona una unidad…</option>
          {options.map(unit => <option key={unit.id} value={unit.id}>{unit.codigo} · {unit.nombre}{unit.activa ? '' : ' (inactiva)'}</option>)}
        </select>
        {errors.unidad && <small className="field-error" role="alert">{errors.unidad}</small>}
      </label>

      <label className={`field${errors.codigo ? ' field--invalid' : ''}`}>Código
        <input value={codigo} onChange={event => setCodigo(event.target.value)} maxLength={CODE_MAX} placeholder="EC-01"
          aria-invalid={!!errors.codigo} autoComplete="off"/>
        {errors.codigo ? <small className="field-error" role="alert">{errors.codigo}</small> : <small>Único dentro de la unidad. Se guarda en mayúsculas.</small>}
      </label>
      <label className={`field${errors.nombre ? ' field--invalid' : ''}`}>Nombre
        <input value={nombre} onChange={event => setNombre(event.target.value)} maxLength={LINE_NAME_MAX}
          aria-invalid={!!errors.nombre} autoComplete="off"/>
        {errors.nombre && <small className="field-error" role="alert">{errors.nombre}</small>}
      </label>

      {changingUnit && <label className={`field form-span${errors.motivo ? ' field--invalid' : ''}`}>Motivo del cambio de unidad
        <input value={motivo} onChange={event => setMotivo(event.target.value)} aria-invalid={!!errors.motivo} placeholder="Ej.: reorganización institucional"/>
        {errors.motivo ? <small className="field-error" role="alert">{errors.motivo}</small> : <small>Queda registrado en la auditoría.</small>}
      </label>}

      <label className="field form-span checkbox-field">
        <span><input type="checkbox" checked={activa} onChange={event => setActiva(event.target.checked)}/> Línea activa</span>
      </label>

      <div className="form-actions form-span">
        <button type="button" className="secondary-button" onClick={onClose}>Cancelar</button>
        <button type="submit" className="primary-button" disabled={saving}>{saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear línea'}</button>
      </div>
    </form>
  </Modal>
}
