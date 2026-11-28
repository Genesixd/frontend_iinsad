import { describe, expect, it } from 'vitest'
import { project, sentVersion, version } from '../test/projects'
import {
  contentForm, contentPayload, emptyContent, formatDate, formatDateTime, missingToSend, validateContent, versionHistory,
} from './proposal'

describe('validación del contenido', () => {
  it('exige título (los espacios no cuentan) y limita su largo', () => {
    expect(validateContent({ ...emptyContent(), titulo: '   ' }).titulo).toBe('El título es obligatorio.')
    expect(validateContent({ ...emptyContent(), titulo: 'x'.repeat(601) }).titulo).toMatch(/600/)
    expect(validateContent({ ...emptyContent(), titulo: 'x'.repeat(600) })).toEqual({})
  })

  it('compara las fechas solo cuando están las dos; el mismo día vale', () => {
    const base = { ...emptyContent(), titulo: 'T' }
    expect(validateContent({ ...base, fecha_inicio_prevista: '2027-01-02', fecha_fin_prevista: '2027-01-01' })).toHaveProperty('fecha_fin_prevista')
    expect(validateContent({ ...base, fecha_inicio_prevista: '2027-01-02', fecha_fin_prevista: '2027-01-02' })).toEqual({})
    expect(validateContent({ ...base, fecha_fin_prevista: '2027-01-01' })).toEqual({})
  })

  it('limpia el texto y convierte las fechas vacías en null', () => {
    const payload = contentPayload({ ...emptyContent(), titulo: '  Un   título ', metodologia: '  línea 1\nlínea 2  ' })
    expect(payload).toMatchObject({ titulo: 'Un título', metodologia: 'línea 1\nlínea 2', fecha_inicio_prevista: null, fecha_fin_prevista: null })
  })

  it('rellena el formulario desde una versión sin arrastrar campos que no se editan', () => {
    const form = contentForm(version({ resumen: 'R', fecha_fin_prevista: '2027-05-01' }))
    expect(form).toMatchObject({ resumen: 'R', fecha_inicio_prevista: '', fecha_fin_prevista: '2027-05-01' })
    expect(Object.keys(form)).toEqual(Object.keys(emptyContent()))
  })

  it('enumera lo que falta para enviar', () => {
    expect(missingToSend(version({ resumen: '  ' }))).toEqual(['el resumen', 'el objetivo general'])
    expect(missingToSend(sentVersion())).toEqual([])
  })
})

describe('historial y fechas', () => {
  it('ordena por presentación y número de versión, de la más reciente a la más antigua', () => {
    const detail = project({ presentaciones: [
      { id: 1, numero_intento: 1, estado: 'NO_APROBADA', enviada_en: null, resuelta_en: null, versiones: [sentVersion({ id: 1 }), sentVersion({ id: 2, numero_version: 2 })] },
      { id: 2, numero_intento: 2, estado: 'BORRADOR', enviada_en: null, resuelta_en: null, versiones: [version({ id: 3 })] },
    ] })
    expect(versionHistory(detail).map(entry => entry.version.id)).toEqual([3, 2, 1])
  })

  it('muestra las fechas sin correrlas por la zona horaria', () => {
    expect(formatDate('2027-01-01')).toBe('01/01/2027')
    expect(formatDate(null)).toBe('—')
  })

  it('muestra la hora de Bolivia', () => {
    // 02:30 UTC del día 27 todavía es el 26 en La Paz (UTC-4).
    expect(formatDateTime('2026-11-27T02:30:00Z')).toMatch(/^26\/11\/(20)?26.*22:30|^26\/11\/(20)?26.*10:30/)
    expect(formatDateTime(null)).toBe('—')
  })
})
