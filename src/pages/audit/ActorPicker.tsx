import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { Search, X } from 'lucide-react'
import { listUsers, type UserRow } from '../../api/users'
import { actorLabel } from '../../lib/auditLabels'

export type Actor = { id: number; label: string }

type Props = {
  token: string
  value: Actor | null
  onChange: (actor: Actor | null) => void
}

const PAGE_SIZE = 8
const DEBOUNCE_MS = 300

/**
 * Selector de usuario con búsqueda en el servidor (nombre o correo). No carga todos los usuarios:
 * pide pocos resultados a la vez, así funciona igual con 10 que con 10.000 cuentas.
 */
export function ActorPicker({ token, value, onChange }: Props) {
  const listId = useId()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [results, setResults] = useState<UserRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const [active, setActive] = useState(-1)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    // Con el cuadro vacío se muestran los primeros enseguida; al escribir se espera un instante.
    timer.current = setTimeout(() => {
      listUsers(token, { page: 1, search: query, estado: '' }, PAGE_SIZE)
        .then(page => { if (!cancelled) { setResults(page.results); setTotal(page.count); setFailed(false); setActive(-1) } })
        .catch(() => { if (!cancelled) { setResults([]); setTotal(0); setFailed(true) } })
        .finally(() => { if (!cancelled) setLoading(false) })
    }, query ? DEBOUNCE_MS : 0)
    return () => { cancelled = true; clearTimeout(timer.current) }
  }, [open, query, token])

  function choose(user: UserRow) {
    onChange({ id: user.id, label: actorLabel(user) })
    setQuery('')
    setOpen(false)
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') { event.preventDefault(); setOpen(true); setActive(index => Math.min(index + 1, results.length - 1)) }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setActive(index => Math.max(index - 1, 0)) }
    else if (event.key === 'Enter' && open && active >= 0 && results[active]) { event.preventDefault(); choose(results[active]) }
    else if (event.key === 'Escape') setOpen(false)
  }

  if (value) {
    return <span className="actor-chip">
      <span>{value.label}</span>
      <button type="button" aria-label="Quitar actor seleccionado" onClick={() => onChange(null)}><X size={13}/></button>
    </span>
  }

  return <div className="actor-picker">
    <span className="search-box">
      <Search size={15}/>
      <input role="combobox" aria-label="Actor" aria-expanded={open} aria-controls={listId} aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined} placeholder="Buscar por nombre o correo"
        value={query} autoComplete="off"
        onChange={event => { setQuery(event.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)} onClick={() => setOpen(true)} onBlur={() => setOpen(false)} onKeyDown={onKeyDown}/>
    </span>
    {open && <div className="actor-list">
      <ul id={listId} role="listbox" aria-label="Usuarios encontrados">
        {results.map((user, index) => <li key={user.id} id={`${listId}-${index}`} role="option" aria-selected={index === active}
          className={index === active ? 'actor-option actor-option--active' : 'actor-option'}
          onMouseDown={event => { event.preventDefault(); choose(user) }}>{actorLabel(user)}</li>)}
      </ul>
      {loading && <div className="actor-note">Buscando…</div>}
      {!loading && failed && <div className="actor-note">No se pudo buscar usuarios.</div>}
      {!loading && !failed && results.length === 0 && <div className="actor-note">No hay usuarios que coincidan.</div>}
      {!loading && !failed && total > results.length && <div className="actor-note">Mostrando {results.length} de {total}. Sigue escribiendo para acotar.</div>}
    </div>}
  </div>
}
