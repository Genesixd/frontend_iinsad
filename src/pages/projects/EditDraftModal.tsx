import { useCallback, useState, type FormEvent } from 'react'
import { ApiError } from '../../api/http'
import { updateDraft, type Version } from '../../api/projects'
import { Modal } from '../../components/ui/Modal'
import { hasErrors, joinFieldErrors, type FormErrors } from '../../lib/catalogValidation'
import { contentForm, contentPayload, validateContent, type ContentForm } from '../../lib/proposal'
import { ProposalFields } from './ProposalFields'

type Props = {
  token: string
  projectId: number
  version: Version
  onClose: () => void
  onSaved: () => void
}

export function EditDraftModal({ token, projectId, version, onClose, onSaved }: Props) {
  const [initial] = useState<ContentForm>(() => contentForm(version))
  const [content, setContent] = useState<ContentForm>(initial)
  const [errors, setErrors] = useState<FormErrors>({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const dirty = (Object.keys(initial) as Array<keyof ContentForm>).some(key => initial[key] !== content[key])
  const close = useCallback(() => {
    if (!dirty || window.confirm('¿Cerrar sin guardar? Se perderán los cambios.')) onClose()
  }, [dirty, onClose])

  async function submit(event: FormEvent) {
    event.preventDefault()
    const found = validateContent(content)
    setErrors(found)
    setFormError('')
    if (hasErrors(found)) return
    // Solo se envía lo modificado: un formulario antiguo no revierte cambios hechos en otro lugar.
    const changed = (Object.keys(content) as Array<keyof ContentForm>).filter(key => content[key] !== initial[key])
    if (changed.length === 0) { onClose(); return }
    setSaving(true)
    try {
      const payload = contentPayload(content)
      await updateDraft(token, projectId, version.id, Object.fromEntries(changed.map(key => [key, payload[key]])))
      onSaved()
    } catch (failure) {
      if (failure instanceof ApiError && Object.keys(failure.fields).length > 0) setErrors(joinFieldErrors(failure.fields))
      // El mensaje general se muestra siempre: p. ej. si otra persona ya envió esta versión.
      setFormError(failure instanceof Error ? failure.message : 'No se pudo guardar.')
      setSaving(false)
    }
  }

  return <Modal wide title="Editar borrador" subtitle={`Versión ${version.numero_version}`} onClose={close}>
    <form className="form-grid" onSubmit={event => void submit(event)} noValidate>
      {formError && <div className="alert-error form-span" role="alert">{formError}</div>}
      <ProposalFields values={content} errors={errors} onChange={(key, value) => setContent(current => ({ ...current, [key]: value }))}/>
      <div className="form-actions form-span">
        <button type="button" className="secondary-button" onClick={close}>Cancelar</button>
        <button type="submit" className="primary-button" disabled={saving}>{saving ? 'Guardando…' : 'Guardar cambios'}</button>
      </div>
    </form>
  </Modal>
}
