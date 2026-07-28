import { describe, expect, it } from 'vitest'
import { MINIMO_ENTRE_COMPROBACIONES, tocaComprobar } from '../ritmoComprobacion.ts'

const AHORA = 1_800_000_000_000

describe('cada cuánto se comprueba si hay versión nueva', () => {
  it('la primera vez siempre toca', () => {
    expect(tocaComprobar(AHORA, null)).toBe(true)
  })

  it('volver a primer plano al minuto no dispara otra comprobación', () => {
    expect(tocaComprobar(AHORA + 60_000, AHORA)).toBe(false)
  })

  it('justo en el mínimo ya toca', () => {
    expect(tocaComprobar(AHORA + MINIMO_ENTRE_COMPROBACIONES, AHORA)).toBe(true)
  })

  it('un instante antes del mínimo todavía no', () => {
    expect(tocaComprobar(AHORA + MINIMO_ENTRE_COMPROBACIONES - 1, AHORA)).toBe(false)
  })

  it('mirar el móvil diez veces seguidas solo comprueba una', () => {
    let ultima: number | null = null
    let comprobaciones = 0
    for (let i = 0; i < 10; i += 1) {
      const instante = AHORA + i * 30_000
      if (tocaComprobar(instante, ultima)) {
        comprobaciones += 1
        ultima = instante
      }
    }
    expect(comprobaciones).toBe(1)
  })

  it('el reloj hacia atrás no deja la app sin comprobar', () => {
    // Cambio de hora o móvil despertando de una suspensión larga: si esto
    // devolviera false, la app se quedaría sin actualizar hasta recuperar.
    expect(tocaComprobar(AHORA - 3_600_000, AHORA)).toBe(true)
  })

  it('el mínimo se puede afinar sin tocar la función', () => {
    expect(tocaComprobar(AHORA + 5000, AHORA, 1000)).toBe(true)
    expect(tocaComprobar(AHORA + 500, AHORA, 1000)).toBe(false)
  })
})
