/* eslint-disable react-refresh/only-export-components -- ayudas de prueba, no componentes de la aplicación */
// Datos y montaje compartidos por las pruebas de M02.
import { render } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi } from 'vitest'
import type { Member, ProjectDetail, ProposalPermissions, Version } from '../api/projects'
import { AuthContext, type AuthContextValue, type Session } from '../auth/auth-context'
import type { RoleCode } from '../config/roles'
import { ProjectDetailPage } from '../pages/projects/ProjectDetailPage'
import { ProjectsPage } from '../pages/projects/ProjectsPage'

export const ME = { id: 5, nombres: 'Ana', apellido_paterno: 'Quispe', apellido_materno: 'Choque', nombre_completo: 'Ana Quispe Choque' }

export const NO_PERMISSIONS: ProposalPermissions = {
  editar_borrador: false, enviar: false, eliminar_borrador: false, crear_version: false, gestionar_equipo: false,
}

export const member = (extra: Partial<Member> = {}): Member => ({
  id: 1, participacion: 1, persona: { id: ME.id, nombre_completo: ME.nombre_completo }, funcion: 'INVESTIGADOR_PRINCIPAL',
  funcion_texto: 'Investigador principal', funciones: '', procedencia: '', ...extra,
})

export const version = (extra: Partial<Version> = {}): Version => ({
  id: 11, numero_version: 1, tipo_version: 'INICIAL', version_anterior: null, unidad: 1, titulo: 'Chagas en el valle',
  resumen: '', justificacion: '', objetivo_general: '', objetivos_especificos: '', metodologia: '', resultados_esperados: '',
  fecha_inicio_prevista: null, fecha_fin_prevista: null, enviada: false, enviada_en: null, integrantes: [member()], ...extra,
})

export const sentVersion = (extra: Partial<Version> = {}) =>
  version({ resumen: 'Resumen enviado', objetivo_general: 'Medir', enviada: true, enviada_en: '2026-11-26T18:00:00Z', ...extra })

export const project = (extra: Partial<ProjectDetail> = {}, versions: Version[] = [version()]): ProjectDetail => ({
  id: 7, codigo: null, titulo: versions.at(-1)?.titulo ?? null, origen: 'PROPUESTA', estado_ejecucion: 'SIN_INICIAR',
  unidad: 1, unidad_codigo: 'EC', unidad_nombre: 'Epidemiología Clínica', lineas: [{ id: 10, codigo: 'EC-01', nombre: 'Crónicas' }],
  investigador_principal: { id: ME.id, nombre_completo: ME.nombre_completo }, estado_propuesta: 'BORRADOR', anulado: false,
  creado_en: '2026-11-25T12:00:00Z', referencia_institucional: '',
  presentaciones: [{ id: 3, numero_intento: 1, estado: 'BORRADOR', enviada_en: null, resuelta_en: null, versiones: versions }],
  permisos: NO_PERMISSIONS, ...extra,
})

export const page = <T,>(results: T[], count = results.length) => ({ count, next: null, previous: null, results })

export const UNITS = page([
  { id: 1, codigo: 'EC', nombre: 'Epidemiología Clínica', activa: true, total_lineas: 1, lineas_activas: 1, creado_en: '' },
  { id: 2, codigo: 'ES', nombre: 'Epidemiología Social', activa: true, total_lineas: 1, lineas_activas: 1, creado_en: '' },
  { id: 3, codigo: 'XX', nombre: 'Unidad cerrada', activa: false, total_lineas: 0, lineas_activas: 0, creado_en: '' },
])

type Options = { role?: RoleCode; demo?: boolean; persona?: typeof ME | null }

export function renderRoute(path: string, { role = 'INVESTIGADOR', demo = false, persona = ME }: Options = {}) {
  const session: Session = {
    profile: { id: 1, email: 'investigador@iinsad.test', persona, roles: [role], asignaciones: [] },
    roles: [role], activeRole: role, token: demo ? null : 'tok', demo,
  }
  const value: AuthContextValue = { session, signIn: vi.fn(), signInDemo: vi.fn(), setActiveRole: vi.fn(), signOut: vi.fn() }
  return render(<AuthContext.Provider value={value}>
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/proyectos" element={<ProjectsPage/>}/>
        <Route path="/proyectos/:id" element={<ProjectDetailPage/>}/>
      </Routes>
    </MemoryRouter>
  </AuthContext.Provider>)
}
