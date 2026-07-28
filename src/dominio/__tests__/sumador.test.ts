import { describe, expect, it } from 'vitest'
import { cuentaDeSumandos, duplicarImporte, sumarImportes } from '../sumador.ts'
import { MAX_IMPORTE } from '../validacion.ts'

describe('sumar importes', () => {
  it('sin nada sumado el total es cero', () => {
    expect(sumarImportes([])).toBe(0)
  })

  it('suma las cartas cantadas una a una', () => {
    expect(sumarImportes([12, 8, 15, 6])).toBe(41)
  })

  it('ignora lo que no sea un entero de euros válido', () => {
    expect(sumarImportes([10, -5, 12.5, Number.NaN, 20])).toBe(30)
  })

  it('no se pasa del tope de importe por muchas cartas que se metan', () => {
    expect(sumarImportes(Array.from({ length: 50 }, () => MAX_IMPORTE))).toBe(MAX_IMPORTE)
  })

  it('un importe de cero no altera el total', () => {
    // Aritmética trivial, pero fija que el cero es una entrada legítima y no
    // algo a descartar: quien lo descarte rompe el recuento de más abajo.
    expect(sumarImportes([14, 0, 9])).toBe(23)
  })
})

describe('doblar un importe para Premium', () => {
  it('multiplica por dos', () => {
    expect(duplicarImporte(14)).toBe(28)
  })

  it('doblar cero sigue siendo cero', () => {
    expect(duplicarImporte(0)).toBe(0)
  })

  it('respeta el tope', () => {
    expect(duplicarImporte(MAX_IMPORTE)).toBe(MAX_IMPORTE)
  })

  it('con basura devuelve cero en vez de NaN', () => {
    expect(duplicarImporte(Number.NaN)).toBe(0)
    expect(duplicarImporte(-3)).toBe(0)
  })
})

describe('cuántas cartas se llevan', () => {
  /*
   * Este recuento alimenta la pista de la casilla "se jugaron al menos N
   * cartas", y la regla del aumento de mano cuenta CARTAS, no euros. De ahí
   * que el caso del cero sea el que de verdad importa aquí.
   */
  it('un plato quemado cuenta como carta aunque valga 0 €', () => {
    expect(cuentaDeSumandos([14, 0, 9])).toBe(3)
  })

  it('un plato quemado no infla el total mientras sí cuenta como carta', () => {
    const cartas = [14, 0, 9]
    expect(sumarImportes(cartas)).toBe(23)
    expect(cuentaDeSumandos(cartas)).toBe(3)
  })

  it('descarta la basura, que no es lo mismo que un cero', () => {
    expect(cuentaDeSumandos([10, 0, 5, -2, Number.NaN, 12.5])).toBe(3)
  })

  it('sin cartas, cero', () => {
    expect(cuentaDeSumandos([])).toBe(0)
  })
})
