import { describe, expect, it, vi } from 'vitest'
import { saveBlob } from './download'

describe('saveBlob', () => {
  it('descarga el archivo con el nombre indicado y libera la URL temporal', () => {
    URL.createObjectURL = vi.fn(() => 'blob:abc')
    URL.revokeObjectURL = vi.fn()
    const enlaces: HTMLAnchorElement[] = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { enlaces.push(this) })

    const blob = new Blob(['x'])
    saveBlob(blob, 'auditoria_20261105_0907.xlsx')

    expect(URL.createObjectURL).toHaveBeenCalledWith(blob)
    expect(enlaces).toHaveLength(1)
    expect(enlaces[0]?.download).toBe('auditoria_20261105_0907.xlsx')
    expect(enlaces[0]?.href).toBe('blob:abc')
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:abc')
    expect(document.querySelector('a[download]')).toBeNull() // no deja el enlace en la página
  })
})
