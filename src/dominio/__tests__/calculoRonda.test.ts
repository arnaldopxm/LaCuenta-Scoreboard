import { describe, expect, it } from 'vitest'
import { calcularCuenta, calcularPagos, receptorDelAumento } from '../calculoRonda.ts'
import { ronda } from './ayudas.ts'

describe('importe de la cuenta', () => {
  it('suma la propina al total de las cartas', () => {
    expect(calcularCuenta(80, 5)).toBe(85)
  })

  it('sin propina se queda en el total de las cartas', () => {
    expect(calcularCuenta(80, 0)).toBe(80)
  })

  it('un importe negativo se queda en cero: nadie paga nada', () => {
    expect(calcularCuenta(-40, 0)).toBe(0)
    expect(calcularCuenta(-40, 10)).toBe(0)
  })
})

describe('reparto normal', () => {
  it('paga solo quien pidió la cuenta', () => {
    const pagos = calcularPagos(ronda({ pagadorId: 'j1', totalCartas: 120 }))
    expect(pagos).toEqual([{ jugadorId: 'j1', importe: 120 }])
  })

  it('con cuenta a cero no genera ningún pago', () => {
    expect(calcularPagos(ronda({ pagadorId: 'j1', totalCartas: 0 }))).toEqual([])
  })
})

describe('reparto a medias', () => {
  it('parte la cuenta impar redondeando hacia arriba a los dos', () => {
    const pagos = calcularPagos(
      ronda({
        pagadorId: 'j1',
        totalCartas: 75,
        reparto: { tipo: 'a-medias', coPagadorId: 'j2' },
      }),
    )
    expect(pagos).toEqual([
      { jugadorId: 'j1', importe: 38 },
      { jugadorId: 'j2', importe: 38 },
    ])
    // 38 + 38 = 76 contra una cuenta de 75. Sobrepagar un euro es la decisión
    // tomada: céntimos limpios por encima del cuadre exacto.
    expect(pagos.reduce((total, pago) => total + pago.importe, 0)).toBe(76)
  })

  it('con cuenta par sale exacto', () => {
    const pagos = calcularPagos(
      ronda({
        pagadorId: 'j1',
        totalCartas: 80,
        reparto: { tipo: 'a-medias', coPagadorId: 'j3' },
      }),
    )
    expect(pagos.map((p) => p.importe)).toEqual([40, 40])
  })
})

describe('reparto a pachas', () => {
  it('divide entre los marcados redondeando hacia arriba', () => {
    const pagos = calcularPagos(
      ronda({
        pagadorId: 'j1',
        totalCartas: 100,
        reparto: { tipo: 'a-pachas', participantesIds: ['j1', 'j2', 'j3'] },
      }),
    )
    expect(pagos).toEqual([
      { jugadorId: 'j1', importe: 34 },
      { jugadorId: 'j2', importe: 34 },
      { jugadorId: 'j3', importe: 34 },
    ])
    // 102 € para una cuenta de 100 €. Por diseño.
    expect(pagos.reduce((total, pago) => total + pago.importe, 0)).toBe(102)
  })

  it('excluye a quien esté desmarcado: 6 en mesa, 2 en el baño, se divide entre 4', () => {
    const pagos = calcularPagos(
      ronda({
        pagadorId: 'j1',
        totalCartas: 200,
        reparto: { tipo: 'a-pachas', participantesIds: ['j1', 'j2', 'j5', 'j6'] },
      }),
    )
    expect(pagos).toHaveLength(4)
    expect(pagos.map((p) => p.importe)).toEqual([50, 50, 50, 50])
    expect(pagos.map((p) => p.jugadorId)).not.toContain('j3')
    expect(pagos.map((p) => p.jugadorId)).not.toContain('j4')
  })

  it('sin nadie marcado no divide entre cero', () => {
    const pagos = calcularPagos(
      ronda({
        pagadorId: 'j1',
        totalCartas: 100,
        reparto: { tipo: 'a-pachas', participantesIds: [] },
      }),
    )
    expect(pagos).toEqual([])
  })
})

describe('la propina entra antes del reparto', () => {
  it('a medias: (90 + 10) / 2 = 50, no 45 + 10', () => {
    const pagos = calcularPagos(
      ronda({
        pagadorId: 'j1',
        totalCartas: 90,
        propina: 10,
        reparto: { tipo: 'a-medias', coPagadorId: 'j2' },
      }),
    )
    expect(pagos.map((p) => p.importe)).toEqual([50, 50])
  })

  it('a pachas: (60 + 6) / 3 = 22, no 20 + 6', () => {
    const pagos = calcularPagos(
      ronda({
        pagadorId: 'j1',
        totalCartas: 60,
        propina: 6,
        reparto: { tipo: 'a-pachas', participantesIds: ['j1', 'j2', 'j3'] },
      }),
    )
    expect(pagos.map((p) => p.importe)).toEqual([22, 22, 22])
  })
})

describe('quién recibe el aumento', () => {
  it('siempre el pagador, nunca el co-pagador de A medias', () => {
    const r = ronda({
      pagadorId: 'j1',
      totalCartas: 50,
      reparto: { tipo: 'a-medias', coPagadorId: 'j2' },
      aumentoMano: true,
    })
    expect(receptorDelAumento(r)).toBe('j1')
  })

  it('nadie si la ronda no concede aumento', () => {
    expect(receptorDelAumento(ronda({ pagadorId: 'j1', totalCartas: 50 }))).toBeNull()
  })
})
