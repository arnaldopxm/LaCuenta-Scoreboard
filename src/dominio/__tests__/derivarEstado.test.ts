import { describe, expect, it } from 'vitest'
import { derivarEstados, estadosDePartida, previsualizarRonda } from '../derivarEstado.ts'
import { clasificar } from '../finPartida.ts'
import { ahorrosDe, partidaDe, ronda } from './ayudas.ts'

describe('ronda normal aplicada a los ahorros', () => {
  it('resta exacto al pagador y deja al resto intacto', () => {
    const partida = partidaDe(4, [ronda({ pagadorId: 'j2', totalCartas: 120 })])
    const estados = estadosDePartida(partida)

    expect(ahorrosDe(estados, 'j2')).toBe(880)
    expect(ahorrosDe(estados, 'j1')).toBe(1000)
    expect(ahorrosDe(estados, 'j3')).toBe(1000)
    expect(ahorrosDe(estados, 'j4')).toBe(1000)
  })

  it('una cuenta negativa no mueve el dinero de nadie', () => {
    const partida = partidaDe(4, [ronda({ pagadorId: 'j2', totalCartas: -50 })])
    const estados = estadosDePartida(partida)
    expect(estados.every((e) => e.ahorros === 1000)).toBe(true)
  })
})

describe('clamp a 0 cuando la cuenta supera los ahorros', () => {
  it('300 € contra 200 € de ahorros deja al jugador en 0 y termina la partida', () => {
    // Primera ronda: 900 - 700 = 200 €. Segunda: una cuenta de 300 € que no
    // puede pagar. Se para en 0, sin deuda negativa.
    const partida = partidaDe(3, [
      ronda({ pagadorId: 'j1', totalCartas: 700 }),
      ronda({ pagadorId: 'j1', totalCartas: 300 }),
    ])
    const estados = estadosDePartida(partida)

    expect(ahorrosDe(estados, 'j1')).toBe(0)
    expect(estados.find((e) => e.jugadorId === 'j1')?.sinAhorros).toBe(true)
    expect(clasificar(partida).terminada).toBe(true)
    // Los demás siguen con sus 900 € intactos.
    expect(ahorrosDe(estados, 'j2')).toBe(900)
  })

  it('nunca aparecen ahorros negativos', () => {
    const partida = partidaDe(3, [ronda({ pagadorId: 'j1', totalCartas: 5000 })])
    expect(ahorrosDe(estadosDePartida(partida), 'j1')).toBe(0)
  })
})

describe('acumulación de aumentos de mano', () => {
  it('cada ronda con aumento sube el límite en 1 al pagador', () => {
    const partida = partidaDe(5, [
      ronda({ pagadorId: 'j1', totalCartas: 10, aumentoMano: true }),
      ronda({ pagadorId: 'j1', totalCartas: 10, aumentoMano: true }),
    ])
    const j1 = estadosDePartida(partida).find((e) => e.jugadorId === 'j1')!
    expect(j1.aumentos).toBe(2)
    expect(j1.limiteMano).toBe(7)
  })

  it('el sexto aumento no se aplica: tope en límite de mano 10', () => {
    const rondas = Array.from({ length: 6 }, () =>
      ronda({ pagadorId: 'j1', totalCartas: 10, aumentoMano: true }),
    )
    const j1 = estadosDePartida(partidaDe(5, rondas)).find((e) => e.jugadorId === 'j1')!
    expect(j1.aumentos).toBe(5)
    expect(j1.limiteMano).toBe(10)
  })

  it('el co-pagador de A medias no recibe aumento', () => {
    const partida = partidaDe(4, [
      ronda({
        pagadorId: 'j1',
        totalCartas: 100,
        reparto: { tipo: 'a-medias', coPagadorId: 'j2' },
        aumentoMano: true,
      }),
    ])
    const estados = estadosDePartida(partida)
    const j1 = estados.find((e) => e.jugadorId === 'j1')!
    const j2 = estados.find((e) => e.jugadorId === 'j2')!

    expect(j1.aumentos).toBe(1)
    expect(j1.limiteMano).toBe(6)
    expect(j2.aumentos).toBe(0)
    expect(j2.limiteMano).toBe(5)
    // Pero pagar, pagan los dos.
    expect(j2.ahorros).toBe(950)
  })

  it('en A pachas tampoco: solo quien jugó la carta de división', () => {
    const partida = partidaDe(4, [
      ronda({
        pagadorId: 'j3',
        totalCartas: 100,
        reparto: { tipo: 'a-pachas', participantesIds: ['j1', 'j2', 'j3', 'j4'] },
        aumentoMano: true,
      }),
    ])
    const estados = estadosDePartida(partida)
    expect(estados.filter((e) => e.aumentos === 1).map((e) => e.jugadorId)).toEqual(['j3'])
  })
})

describe('previsualización antes de confirmar', () => {
  it('anticipa pagos y ahorros resultantes sin tocar la partida', () => {
    const partida = partidaDe(3)
    const borrador = ronda({
      pagadorId: 'j1',
      totalCartas: 100,
      reparto: { tipo: 'a-pachas', participantesIds: ['j1', 'j2', 'j3'] },
    })

    const vista = previsualizarRonda(partida, borrador)

    expect(vista.cuenta).toBe(100)
    expect(vista.pagos.map((p) => p.importe)).toEqual([34, 34, 34])
    expect(vista.estadosResultantes.map((e) => e.ahorros)).toEqual([866, 866, 866])
    expect(partida.rondas).toHaveLength(0)
  })

  it('avisa de que el aumento se perdería por estar ya en límite 10', () => {
    const previas = Array.from({ length: 5 }, () =>
      ronda({ pagadorId: 'j1', totalCartas: 10, aumentoMano: true }),
    )
    const partida = partidaDe(3, previas)
    const borrador = ronda({ pagadorId: 'j1', totalCartas: 20, aumentoMano: true })

    const vista = previsualizarRonda(partida, borrador)
    expect(vista.aumentoDesperdiciado).toBe(true)
  })

  it('avisa de quién se quedaría sin ahorros', () => {
    const partida = partidaDe(3, [ronda({ pagadorId: 'j2', totalCartas: 800 })])
    const vista = previsualizarRonda(partida, ronda({ pagadorId: 'j2', totalCartas: 200 }))
    expect(vista.jugadoresArruinadosIds).toEqual(['j2'])
  })
})

describe('derivación directa desde jugadores y rondas', () => {
  it('sin rondas todo el mundo está como al principio', () => {
    const { jugadores } = partidaDe(8)
    const estados = derivarEstados(jugadores, [])
    expect(estados.every((e) => e.ahorros === 1400)).toBe(true)
    expect(estados.every((e) => e.limiteMano === 5)).toBe(true)
    expect(estados.every((e) => !e.sinAhorros)).toBe(true)
  })

  it('mantiene el orden de la mesa, no reordena por dinero', () => {
    const partida = partidaDe(4, [ronda({ pagadorId: 'j1', totalCartas: 500 })])
    expect(estadosDePartida(partida).map((e) => e.jugadorId)).toEqual(['j1', 'j2', 'j3', 'j4'])
  })
})
