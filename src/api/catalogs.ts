import { apiRequest } from './http'
import type { Page } from './users'

export type Unit = {
  id: number
  codigo: string
  nombre: string
  activa: boolean
  total_lineas: number
  lineas_activas: number
  creado_en: string
}

export type Line = {
  id: number
  unidad: number
  unidad_codigo: string
  unidad_nombre: string
  codigo: string
  nombre: string
  activa: boolean
  creado_en: string
}

export type Estado = '' | 'true' | 'false'
export type CatalogFilters = { page: number; search: string; estado: Estado }
export type LineFilters = CatalogFilters & { unidad: string }

export type UnitInput = { codigo: string; nombre: string; activa: boolean }
export type LineInput = { unidad: number; codigo: string; nombre: string; activa: boolean; motivo?: string }

function query(entries: Record<string, string | number | undefined>) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(entries)) {
    if (value !== undefined && String(value).trim() !== '') params.set(key, String(value).trim())
  }
  return params.toString()
}

// ---------- Unidades ----------
export function fetchUnits(token: string, { page, search, estado }: CatalogFilters, pageSize?: number) {
  const qs = query({ page, search, activa: estado, page_size: pageSize })
  return apiRequest<Page<Unit>>(`/usuarios/unidades/?${qs}`, {}, token)
}

export function createUnit(token: string, data: UnitInput) {
  return apiRequest<Unit>('/usuarios/unidades/', { method: 'POST', body: JSON.stringify(data) }, token)
}

export function updateUnit(token: string, id: number, data: Partial<UnitInput>) {
  return apiRequest<Unit>(`/usuarios/unidades/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }, token)
}

export function deleteUnit(token: string, id: number) {
  return apiRequest<void>(`/usuarios/unidades/${id}/`, { method: 'DELETE' }, token)
}

// ---------- Líneas de investigación ----------
export function fetchLines(token: string, { page, search, estado, unidad }: LineFilters) {
  const qs = query({ page, search, activa: estado, unidad })
  return apiRequest<Page<Line>>(`/usuarios/lineas/?${qs}`, {}, token)
}

export function createLine(token: string, data: LineInput) {
  return apiRequest<Line>('/usuarios/lineas/', { method: 'POST', body: JSON.stringify(data) }, token)
}

export function updateLine(token: string, id: number, data: Partial<LineInput>) {
  return apiRequest<Line>(`/usuarios/lineas/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }, token)
}

export function deleteLine(token: string, id: number) {
  return apiRequest<void>(`/usuarios/lineas/${id}/`, { method: 'DELETE' }, token)
}
