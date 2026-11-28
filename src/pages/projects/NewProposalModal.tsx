import { useCallback, useEffect, useState, type FormEvent } from 'react'
import type { Persona } from '../../api/auth'
import { fetchActiveLines, type Line, type Unit } from '../../api/catalogs'
import { ApiError } from '../../api/http'
import { createProposal, type PersonOption, type ProjectDetail } from '../../api/projects'
import { Modal } from '../../components/ui/Modal'
import { hasErrors, joinFieldErrors, type FormErrors } from '../../lib/catalogValidation'
import { contentPayload, emptyContent, validateContent, type ContentForm } from '../../lib/proposal'
import { PersonPicker } from './PersonPicker'
import { ProposalFields } from './ProposalFields'

type Props = {
  token: string
  units: Unit[]
  /** Persona de quien registra. Como investigador, es siempre el investigador principal. */
  me: Persona | null
  /** El administrador técnico puede registrar la propuesta a nombre de otra persona. */
  chooseInvestigator: boolean
  onClose: () => void
  onCreated: (project: ProjectDetail) => void
}

export function NewProposalModal({ token, units, me, chooseInvestigator, onClose, onCreated }: Props) {
  const [unidad, setUnidad] = useState('')
  const [lines, setLines] = useState<Line[]>([])
  const [selectedLines, setSelectedLines] = useState<number[]>([])
  const [principal, setPrincipal] = useState<PersonOption | null>(null)
  const [reference, setReference] = useState('')
  const [content, setContent] = useState<ContentForm>(emptyContent)
  const [errors, setErrors] = useState<FormErrors>({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const dirty = !!(unidad || principal || reference || Object.values(content).some(value => value.trim()))
  // Es un formulario largo: se confirma antes de perder lo escrito (Esc, clic fuera o Cancelar).
  const close = useCallback(() => {
    if (!dirty || window.confirm('¿Cerrar sin guardar? Se perderá lo que escribiste.')) onClose()
  }, [dirty, onClose])

  useEffect(() => {
    setLines([]); setSelectedLines([])
    if (!unidad) return
    let cancelled = false
    fetchActiveLines(token, unidad)
      .then(all => { if (!cancelled) setLines(all) })
      .catch((failure: unknown) => { if (!cancelled) setFormError(failure instanceof Error ? failure.message : 'No se pudieron cargar las líneas.') })
    return () => { cancelled = true }
  }, [token, unidad])

  const investigatorId = chooseInvestigator ? principal?.id : me?.id

  async function submit(event: FormEvent) {
    event.preventDefault()
    const found = validateContent(content)
    if (!unidad) found.unidad = 'Selecciona la unidad responsable.'
    if (!investigatorId) found.investigador_principal = chooseInvestigator
      ? 'Elige al investigador principal.' : 'Tu cuenta no tiene una persona asociada. Pide al administrador que la complete.'
    setErrors(found)
    setFormError('')
    if (hasErrors(found) || !investigatorId) return
    setSaving(true)
    try {
      onCreated(await createProposal(token, {
        ...contentPayload(content), unidad: Number(unidad), lineas: selectedLines,
        investigador_principal: investigatorId, referencia_institucional: reference.trim(),
      }))
    } catch (failure) {
      if (failure instanceof ApiError && Object.keys(failure.fields).length > 0) {
        setErrors(joinFieldErrors(failure.fields))
        setFormError('Revisa los datos: ' + failure.message)
      } else setFormError(failure instanceof Error ? failure.message : 'No se pudo registrar la propuesta.')
      setSaving(false)
    }
  }

  return <Modal wide title="Nueva propuesta" subtitle="Se guarda como borrador. Podrás completarla antes de enviarla." onClose={close}>
    <form className="form-grid" onSubmit={event => void submit(event)} noValidate>
      {formError && <div className="alert-error form-span" role="alert">{formError}</div>}

      <label className={`field form-span${errors.unidad ? ' field--invalid' : ''}`}>Unidad responsable
        <select value={unidad} onChange={event => setUnidad(event.target.value)} aria-invalid={!!errors.unidad}>
          <option value="">Selecciona una unidad…</option>
          {units.filter(unit => unit.activa).map(unit => <option key={unit.id} value={unit.id}>{unit.codigo} · {unit.nombre}</option>)}
        </select>
        {errors.unidad && <small className="field-error" role="alert">{errors.unidad}</small>}
      </label>

      <fieldset className="check-group form-span">
        <legend>Líneas de investigación (opcional)</legend>
        {!unidad && <small>Primero elige la unidad.</small>}
        {unidad && lines.length === 0 && <small>Esta unidad no tiene líneas activas.</small>}
        {lines.map(line => <label key={line.id}>
          <input type="checkbox" checked={selectedLines.includes(line.id)}
            onChange={event => setSelectedLines(current => event.target.checked ? [...current, line.id] : current.filter(id => id !== line.id))}/>
          {line.codigo} · {line.nombre}
        </label>)}
        {errors.lineas && <small className="field-error" role="alert">{errors.lineas}</small>}
      </fieldset>

      <div className={`field form-span${errors.investigador_principal ? ' field--invalid' : ''}`}>
        <span>Investigador principal</span>
        {chooseInvestigator
          ? <PersonPicker token={token} label="Investigador principal" value={principal} onChange={setPrincipal}/>
          : <span className="read-value">{me ? `${me.nombre_completo} (tú)` : 'Sin persona asociada'}</span>}
        {errors.investigador_principal && <small className="field-error" role="alert">{errors.investigador_principal}</small>}
      </div>

      <ProposalFields values={content} errors={errors} onChange={(key, value) => setContent(current => ({ ...current, [key]: value }))}/>

      <label className={`field form-span${errors.referencia_institucional ? ' field--invalid' : ''}`}>Referencia institucional (opcional)
        <input value={reference} maxLength={240} onChange={event => setReference(event.target.value)}/>
        {errors.referencia_institucional && <small className="field-error" role="alert">{errors.referencia_institucional}</small>}
      </label>

      <div className="form-actions form-span">
        <button type="button" className="secondary-button" onClick={close}>Cancelar</button>
        <button type="submit" className="primary-button" disabled={saving}>{saving ? 'Guardando…' : 'Guardar borrador'}</button>
      </div>
    </form>
  </Modal>
}
