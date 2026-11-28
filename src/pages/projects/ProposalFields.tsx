import type { FormErrors } from '../../lib/catalogValidation'
import { TEXT_FIELDS, TITLE_MAX, type ContentForm } from '../../lib/proposal'

type Props = { values: ContentForm; errors: FormErrors; onChange: (key: keyof ContentForm, value: string) => void }

/** Campos de contenido compartidos por «Nueva propuesta» y «Editar borrador». */
export function ProposalFields({ values, errors, onChange }: Props) {
  return <>
    {TEXT_FIELDS.map(field => <label key={field.key} className={`field form-span${errors[field.key] ? ' field--invalid' : ''}`}>
      {field.label}
      <textarea rows={field.rows} value={values[field.key]} aria-invalid={!!errors[field.key]}
        maxLength={field.key === 'titulo' ? TITLE_MAX : undefined}
        onChange={event => onChange(field.key, event.target.value)}/>
      {errors[field.key]
        ? <small className="field-error" role="alert">{errors[field.key]}</small>
        : field.requiredToSend && field.key !== 'titulo' && <small>Obligatorio para enviar a revisión.</small>}
    </label>)}

    {([['fecha_inicio_prevista', 'Inicio previsto'], ['fecha_fin_prevista', 'Fin previsto']] as const).map(([key, label]) =>
      <label key={key} className={`field${errors[key] ? ' field--invalid' : ''}`}>{label}
        <input type="date" value={values[key]} aria-invalid={!!errors[key]} onChange={event => onChange(key, event.target.value)}/>
        {errors[key] && <small className="field-error" role="alert">{errors[key]}</small>}
      </label>)}
  </>
}
