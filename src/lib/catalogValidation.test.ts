import { describe, expect, it } from 'vitest'
import {
  CODE_MAX, hasErrors, joinFieldErrors, normalizeCode, normalizeName, validateInitialRole, validateLine, validateUnit,
} from './catalogValidation'

describe('normalización', () => {
  it('el código se recorta y pasa a mayúsculas', () => expect(normalizeCode('  ec-01 ')).toBe('EC-01'))
  it('el nombre colapsa espacios repetidos', () => expect(normalizeName('  Epidemiología    Social ')).toBe('Epidemiología Social'))
})

describe('validateUnit', () => {
  it('acepta una unidad correcta', () => {
    expect(validateUnit({ codigo: 'ec', nombre: 'Epidemiología Clínica' })).toEqual({})
  })

  it.each([
    ['vacío', ''], ['solo espacios', '   '], ['con espacios internos', 'E C'], ['con tilde', 'ÉC'],
    ['empieza con guion', '-EC'], ['demasiado largo', 'A'.repeat(CODE_MAX + 1)],
  ])('rechaza código %s', (_caso, codigo) => {
    expect(validateUnit({ codigo, nombre: 'Nombre' }).codigo).toBeTruthy()
  })

  it('rechaza nombre vacío o demasiado largo', () => {
    expect(validateUnit({ codigo: 'EC', nombre: '   ' }).nombre).toBeTruthy()
    expect(validateUnit({ codigo: 'EC', nombre: 'N'.repeat(241) }).nombre).toBeTruthy()
  })
})

describe('validateLine', () => {
  const base = { unidad: '1', codigo: 'EC-01', nombre: 'Línea', motivo: '' }

  it('acepta una línea correcta al crear', () => expect(validateLine(base)).toEqual({}))
  it('exige unidad', () => expect(validateLine({ ...base, unidad: '' }).unidad).toBeTruthy())
  it('exige código y nombre', () => {
    const errors = validateLine({ ...base, codigo: '', nombre: '' })
    expect(errors.codigo).toBeTruthy()
    expect(errors.nombre).toBeTruthy()
  })

  it('al cambiar de unidad exige motivo', () => {
    expect(validateLine({ ...base, unidad: '2' }, 1).motivo).toBeTruthy()
    expect(validateLine({ ...base, unidad: '2', motivo: 'Reorganización' }, 1)).toEqual({})
  })

  it('sin cambio de unidad no pide motivo', () => expect(validateLine(base, 1)).toEqual({}))
})

describe('utilidades', () => {
  it('hasErrors distingue vacío de con errores', () => {
    expect(hasErrors({})).toBe(false)
    expect(hasErrors({ codigo: 'x' })).toBe(true)
  })

  it('joinFieldErrors une varios mensajes por campo', () => {
    expect(joinFieldErrors({ codigo: ['A.', 'B.'], nombre: ['C.'] })).toEqual({ codigo: 'A. B.', nombre: 'C.' })
  })
})

describe('validateInitialRole (CUN-001)', () => {
  it('exige elegir un rol', () => expect(validateInitialRole('', undefined, '').rol).toBeTruthy())
  it('el rol de unidad exige la unidad', () => {
    expect(validateInitialRole('RESPONSABLE_UNIDAD', 'UNIDAD', '').unidad).toBeTruthy()
    expect(validateInitialRole('RESPONSABLE_UNIDAD', 'UNIDAD', '3')).toEqual({})
  })
  it('los roles global y de proyecto no piden unidad', () => {
    expect(validateInitialRole('CTC', 'GLOBAL', '')).toEqual({})
    expect(validateInitialRole('INVESTIGADOR', 'PROYECTO', '')).toEqual({})
  })
})
