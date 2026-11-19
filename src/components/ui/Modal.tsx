import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

export function Modal({ title, subtitle, onClose, wide = false, children }:
  { title: string; subtitle?: string; onClose: () => void; wide?: boolean; children: ReactNode }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <div className={`modal${wide ? ' modal--wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
      <header className="modal-head">
        <div><h3>{title}</h3>{subtitle && <p>{subtitle}</p>}</div>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Cerrar"><X size={18}/></button>
      </header>
      <div className="modal-body">{children}</div>
    </div>
  </div>
}
