/** Errores por campo tal como los valida Django: `{ codigo: ['Ya existe ...'] }`. */
export type FieldErrors = Record<string, string[]>

export class ApiError extends Error {
  constructor(public readonly status: number, message: string, public readonly fields: FieldErrors = {}) {
    super(message)
    this.name = 'ApiError'
  }
}

/** Extrae los mensajes de nivel superior por campo (los anidados y `detail` quedan en `message`). */
export function fieldErrorsFrom(data: unknown): FieldErrors {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return {}
  const result: FieldErrors = {}
  for (const [key, value] of Object.entries(data)) {
    if (key === 'detail') continue
    const messages = flattenErrors(value, '')
    if (messages.length) result[key] = messages
  }
  return result
}

const API_BASE = import.meta.env.VITE_API_BASE || '/api/v1'

const FIELD_LABELS: Record<string, string> = {
  email: 'Correo', password: 'Contraseña', nombres: 'Nombres', apellido_paterno: 'Apellido paterno',
  apellido_materno: 'Apellido materno', rol: 'Rol', unidad: 'Unidad', proyecto_id: 'Proyecto',
  vigente_desde: 'Vigente desde', vigente_hasta: 'Vigente hasta', motivo: 'Motivo',
  codigo: 'Código', nombre: 'Nombre', activa: 'Estado',
}

// Django devuelve `{detail}` o `{campo: ["mensaje"]}` (y anidado: `{persona: {campo: [...]}}`).
function flattenErrors(value: unknown, field: string): string[] {
  if (typeof value === 'string') return [field ? `${FIELD_LABELS[field] ?? field}: ${value}` : value]
  if (Array.isArray(value)) return value.flatMap(item => flattenErrors(item, field))
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, inner]) => flattenErrors(inner, key === 'non_field_errors' ? '' : key))
  }
  return []
}

function messageFrom(data: unknown, status: number): string {
  if (data && typeof data === 'object' && 'detail' in data && typeof data.detail === 'string') return data.detail
  const messages = flattenErrors(data, '')
  return messages.length ? messages.join(' ') : `Error del servidor (${status}).`
}

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
    throw new ApiError(response.status, messageFrom(data, response.status), fieldErrorsFrom(data))
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}
