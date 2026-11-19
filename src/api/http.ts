export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

const API_BASE = import.meta.env.VITE_API_BASE || '/api/v1'

export async function apiRequest<T>(path: string, options: RequestInit = {}, accessToken?: string): Promise<T> {
  const headers = new Headers(options.headers)
  if (!headers.has('Content-Type') && options.body) headers.set('Content-Type', 'application/json')
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)
  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, { ...options, headers })
  } catch {
    throw new ApiError(0, 'No se pudo conectar con Django. Verifica que el backend esté encendido en el puerto 8000.')
  }
  if (!response.ok) {
    const data: unknown = await response.json().catch(() => null)
    let message = `Error del servidor (${response.status}).`
    if (data && typeof data === 'object') {
      const detail = 'detail' in data ? data.detail : null
      if (typeof detail === 'string') message = detail
    }
    throw new ApiError(response.status, message)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}
