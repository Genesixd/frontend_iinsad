import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '../../api/http'
import type { Page } from '../../api/users'

/**
 * Carga una lista paginada desde la API cada vez que cambian los filtros o se llama a `reload()`.
 * Si la página pedida ya no existe (p. ej. se borró el último registro de ella) llama a `onOutOfRange`.
 */
export function useRemoteList<T, F>(
  fetcher: (token: string, filters: F) => Promise<Page<T>>,
  token: string | undefined,
  enabled: boolean,
  filters: F,
  onOutOfRange: () => void,
) {
  const [rows, setRows] = useState<T[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  const reload = useCallback(() => { setLoading(true); setReloadKey(key => key + 1) }, [])

  useEffect(() => {
    if (!enabled || !token) return
    let cancelled = false
    fetcher(token, filters)
      .then(data => { if (!cancelled) { setRows(data.results); setCount(data.count); setError('') } })
      .catch((failure: unknown) => {
        if (cancelled) return
        if (failure instanceof ApiError && failure.status === 404) onOutOfRange()
        else setError(failure instanceof Error ? failure.message : 'Error de carga')
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
    // `fetcher` y `onOutOfRange` son estables en los usos; solo reaccionamos a datos y recarga.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, token, filters, reloadKey])

  return { rows, count, loading, error, setError, reload, setLoading }
}
