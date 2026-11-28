import { useEffect, useId, useState, type KeyboardEvent } from 'react'
import { Search, X } from 'lucide-react'
import { searchPeople, type PersonOption } from '../../api/projects'

type Props = {
  token: string
  label: string
  value: PersonOption | null
  onChange: (person: PersonOption | null) => void
}

const MIN_LETTERS = 2
const DEBOUNCE_MS = 300

/** Selector de persona: busca en el servidor mientras se escribe (no carga el directorio completo). */
export function PersonPicker({ token, label, value, onChange }: Props) {
  const listId = useId()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [results, setResults] = useState<PersonOption[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [failure, setFailure] = useState('')
  const [active, setActive] = useState(-1)
  const ready = query.trim().length >= MIN_LETTERS

  useEffect(() => {
    // Al cambiar el texto se descartan los resultados anteriores para no elegir uno que ya no corresponde.
    setResults([]); setTotal(0); setActive(-1); setFailure('')
    if (!ready) { setLoading(false); return }
    let cancelled = false
    setLoading(true)
    const timer = setTimeout(() => {
      searchPeople(token, query)
        .then(page => { if (!cancelled) { setResults(page.results); setTotal(page.count) } })
        .catch((error: unknown) => { if (!cancelled) setFailure(error instanceof Error ? error.message : 'No se pudo buscar.') })
        .finally(() => { if (!cancelled) setLoading(false) })
    }, DEBOUNCE_MS)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [query, ready, token])

  function choose(person: PersonOption) {
    onChange(person)
    setQuery('')
    setOpen(false)
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') { event.preventDefault(); setOpen(true); setActive(index => Math.min(index + 1, results.length - 1)) }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setActive(index => Math.max(index - 1, 0)) }
    else if (event.key === 'Enter') {
      event.preventDefault() // Enter dentro del buscador nunca envía el formulario que lo contiene.
      const person = results[active]
      if (open && person) choose(person)
    } else if (event.key === 'Escape' && open) {
      event.stopPropagation() // cierra la lista sin cerrar el cuadro de diálogo
      setOpen(false)
    }
  }

  if (value) {
    return <span className="actor-chip">
      <span>{value.nombre_completo}</span>
      <button type="button" aria-label={`Quitar a ${value.nombre_completo}`} onClick={() => onChange(null)}><X size={13}/></button>
    </span>
  }

  return <div className="actor-picker">
    <span className="search-box">
      <Search size={15}/>
      <input role="combobox" aria-label={label} aria-expanded={open} aria-controls={listId} aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined} placeholder="Escribe nombre o apellido"
        value={query} autoComplete="off"
        onChange={event => { setQuery(event.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)} onClick={() => setOpen(true)} onBlur={() => setOpen(false)} onKeyDown={onKeyDown}/>
    </span>
    {open && <div className="actor-list">
      <ul id={listId} role="listbox" aria-label="Personas encontradas">
        {results.map((person, index) => <li key={person.id} id={`${listId}-${index}`} role="option" aria-selected={index === active}
          className={index === active ? 'actor-option actor-option--active' : 'actor-option'}
          onMouseDown={event => { event.preventDefault(); choose(person) }}>
          {person.nombre_completo}{person.procedencia && ` · ${person.procedencia}`}
        </li>)}
      </ul>
      {!ready && <div className="actor-note">Escribe al menos {MIN_LETTERS} letras.</div>}
      {ready && loading && <div className="actor-note">Buscando…</div>}
      {ready && !loading && failure && <div className="actor-note">{failure}</div>}
      {ready && !loading && !failure && results.length === 0 && <div className="actor-note">No hay personas que coincidan. Revisa las tildes; si no está registrada, pídelo al administrador técnico.</div>}
      {ready && !loading && !failure && total > results.length && <div className="actor-note">Mostrando {results.length} de {total}. Sigue escribiendo para acotar.</div>}
    </div>}
  </div>
}
