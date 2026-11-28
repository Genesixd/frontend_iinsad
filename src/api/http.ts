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
  titulo: 'Título', resumen: 'Resumen', justificacion: 'Justificación', objetivo_general: 'Objetivo general',
  objetivos_especificos: 'Objetivos específicos', metodologia: 'Metodología', resultados_esperados: 'Resultados esperados',
  fecha_inicio_prevista: 'Inicio previsto', fecha_fin_prevista: 'Fin previsto', equipo: 'Equipo', persona: 'Persona',
  funcion: 'Función', funciones: 'Responsabilidades', procedencia: 'Procedencia', lineas: 'Líneas',
  investigador_principal: 'Investigador principal', referencia_institucional: 'Referencia institucional', search: 'Búsqueda',
  identificador_institucional: 'Identificador institucional', is_active: 'Cuenta activa',
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

let sessionExpiredHandler: (() => void) | undefined

/** Quien mantiene la sesión se registra aquí para cerrarla cuando el servidor responde 401. */
export function onSessionExpired(handler?: () => void) { sessionExpiredHandler = handler }

async function toApiError(response: Response, authenticated: boolean) {
  // Un cuerpo que no es JSON (p. ej. una página de error) no aporta detalle: se usa el mensaje genérico.
  const data: unknown = await response.json().catch(() => null)
  if (response.status === 401 && authenticated) {
    sessionExpiredHandler?.()
    return new ApiError(401, 'Tu sesión terminó. Vuelve a iniciar sesión.')
  }
  // Solo un 400 trae errores de campos; en otros códigos `code` o `messages` no son campos.
  return new ApiError(response.status, messageFrom(data, response.status), response.status === 400 ? fieldErrorsFrom(data) : {})
}

const NO_CONNECTION = 'No se pudo conectar con Django. Verifica que el backend esté encendido en el puerto 8000.'

export async function apiRequest<T>(path: string, options: RequestInit = {}, accessToken?: string): Promise<T> {
  const headers = new Headers(options.headers)
  if (!headers.has('Content-Type') && options.body) headers.set('Content-Type', 'application/json')
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)
  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, { ...options, headers })
  } catch {
    throw new ApiError(0, NO_CONNECTION)
  }
  if (!response.ok) throw await toApiError(response, !!accessToken)
  if (response.status === 204) return undefined as T
  try {
    return await response.json() as T
  } catch {
    throw new ApiError(response.status, 'El servidor respondió con un formato inesperado.')
  }
}

type Paged<T> = { next: string | null; results: T[] }

/** Recorre todas las páginas de una lista (para selectores que no pueden quedar cortados). */
export async function fetchAllPages<T>(path: string, query: Record<string, string>, accessToken: string): Promise<T[]> {
  const rows: T[] = []
  for (let page = 1; ; page += 1) {
    const params = new URLSearchParams({ ...query, page: String(page), page_size: '100' })
    const data = await apiRequest<Paged<T>>(`${path}?${params}`, {}, accessToken)
    rows.push(...data.results)
    if (!data.next) return rows
  }
}

/** Descarga un archivo (Excel, PDF…) con el token Bearer. Devuelve el contenido como Blob. */
export async function apiDownload(path: string, accessToken: string): Promise<Blob> {
  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, { headers: { Authorization: `Bearer ${accessToken}` } })
  } catch {
    throw new ApiError(0, NO_CONNECTION)
  }
  if (!response.ok) throw await toApiError(response, true)
  return response.blob()
}
