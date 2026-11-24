// Validación del lado del cliente: da respuesta inmediata al usuario, pero NO sustituye al servidor.
// Las reglas son las mismas que aplica Django (apps/usuarios/serializers/catalogos.py).

export const CODE_MAX = 40
export const UNIT_NAME_MAX = 240
export const LINE_NAME_MAX = 300
const CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]*$/

export type FormErrors = Record<string, string>

/** "  ec " → "EC". Igual que el servidor: recorta y pasa a mayúsculas. */
export const normalizeCode = (value: string) => value.trim().toUpperCase()

/** Colapsa espacios repetidos: "Epidemiología   Social " → "Epidemiología Social". */
export const normalizeName = (value: string) => value.split(/\s+/).filter(Boolean).join(' ')

function checkCode(raw: string): string | undefined {
  const code = normalizeCode(raw)
  if (!code) return 'El código es obligatorio.'
  if (code.length > CODE_MAX) return `El código admite hasta ${CODE_MAX} caracteres.`
  if (!CODE_PATTERN.test(code)) return 'Solo letras sin tilde, números, guion y guion bajo (sin espacios).'
  return undefined
}

function checkName(raw: string, max: number): string | undefined {
  const name = normalizeName(raw)
  if (!name) return 'El nombre es obligatorio.'
  if (name.length > max) return `El nombre admite hasta ${max} caracteres.`
  return undefined
}

export type UnitValues = { codigo: string; nombre: string }

export function validateUnit(values: UnitValues): FormErrors {
  const errors: FormErrors = {}
  const code = checkCode(values.codigo)
  const name = checkName(values.nombre, UNIT_NAME_MAX)
  if (code) errors.codigo = code
  if (name) errors.nombre = name
  return errors
}

export type LineValues = { unidad: string; codigo: string; nombre: string; motivo: string }

/** `originalUnit` es la unidad que tenía la línea al abrir el formulario de edición (si se edita). */
export function validateLine(values: LineValues, originalUnit?: number): FormErrors {
  const errors: FormErrors = {}
  if (!values.unidad) errors.unidad = 'Selecciona la unidad a la que pertenece la línea.'
  const code = checkCode(values.codigo)
  const name = checkName(values.nombre, LINE_NAME_MAX)
  if (code) errors.codigo = code
  if (name) errors.nombre = name
  if (originalUnit !== undefined && values.unidad && Number(values.unidad) !== originalUnit && !values.motivo.trim()) {
    errors.motivo = 'Indica el motivo para cambiar la línea de unidad.'
  }
  return errors
}

export const hasErrors = (errors: FormErrors) => Object.keys(errors).length > 0

/** Une los errores por campo que devuelve Django en un texto por campo. */
export function joinFieldErrors(fields: Record<string, string[]>): FormErrors {
  return Object.fromEntries(Object.entries(fields).map(([key, messages]) => [key, messages.join(' ')]))
}

/** Rol inicial al crear una cuenta (CUN-001). `scope` es el ámbito que deriva el servidor del rol. */
export function validateInitialRole(rol: string, scope: 'GLOBAL' | 'UNIDAD' | 'PROYECTO' | undefined, unidad: string): FormErrors {
  const errors: FormErrors = {}
  if (!rol) errors.rol = 'Selecciona el rol inicial de la cuenta.'
  else if (scope === 'UNIDAD' && !unidad) errors.unidad = 'Este rol requiere indicar la unidad.'
  return errors
}
