import { describe, expect, it } from 'vitest'
import { actionLabel, actorText, changedFields, entityLabel, fieldLabel, formatValue } from './auditLabels'

describe('etiquetas', () => {
  it('traduce acciones y entidades conocidas', () => {
    expect(actionLabel('asignacion.revocar')).toBe('Revocar rol')
    expect(entityLabel('AsignacionRol')).toBe('Asignación de rol')
  })

  it('si la acción o entidad es desconocida muestra el código tal cual', () => {
    expect(actionLabel('modulo.nuevo')).toBe('modulo.nuevo')
    expect(entityLabel('Proyecto')).toBe('Proyecto')
  })

  it('etiqueta campos, incluso anidados', () => {
    expect(fieldLabel('email')).toBe('Correo')
    expect(fieldLabel('persona.nombres')).toBe('persona › Nombres')
    expect(fieldLabel('campo_raro')).toBe('campo_raro')
  })

  it('sin actor se indica Sistema', () => {
    expect(actorText('a@t.test')).toBe('a@t.test')
    expect(actorText(null)).toBe('Sistema / sin sesión')
  })
})

describe('formatValue', () => {
  it('formatea nulos, booleanos, texto y objetos', () => {
    expect(formatValue(null)).toBe('—')
    expect(formatValue('')).toBe('—')
    expect(formatValue(true)).toBe('Sí')
    expect(formatValue(false)).toBe('No')
    expect(formatValue('hola')).toBe('hola')
    expect(formatValue(5)).toBe('5')
    expect(formatValue([1, 2])).toBe('[1,2]')
  })

  it('formatea fechas ISO como fecha legible', () => {
    expect(formatValue('2026-11-22T10:30:00Z')).not.toContain('T10:30')
  })
})

describe('changedFields', () => {
  it('creación: antes vacío y después con el estado completo (aplanando anidados)', () => {
    const rows = changedFields(null, { email: 'a@t.test', activado: true, persona: { nombres: 'Ana', procedencia: '' } })
    expect(rows).toEqual([
      { field: 'Correo', before: '—', after: 'a@t.test' },
      { field: 'Cuenta activada', before: '—', after: 'Sí' },
      { field: 'persona › Nombres', before: '—', after: 'Ana' },
      { field: 'persona › Procedencia', before: '—', after: '—' },
    ])
  })

  it('edición: solo aparecen los campos que cambiaron', () => {
    expect(changedFields({ nombre: 'Epi' }, { nombre: 'Epi Social' }))
      .toEqual([{ field: 'Nombre', before: 'Epi', after: 'Epi Social' }])
  })

  it('revocación: antes nulo y después con la fecha', () => {
    const rows = changedFields({ revocada_en: null }, { revocada_en: '2026-11-22T10:30:00Z' })
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ field: 'Revocada en', before: '—' })
    expect(rows[0]?.after).not.toBe('—')
  })

  it('sin datos devuelve una lista vacía', () => expect(changedFields(null, null)).toEqual([]))
})
