/**
 * Qué pasa con las rondas que quedan por detrás del fin de partida.
 *
 * Solo se puede llegar aquí corrigiendo una ronda pasada: la interfaz no deja
 * cerrar rondas nuevas cuando la partida ya ha terminado. Si al corregir la
 * ronda 2 resulta que alguien se arruinó ahí, las rondas 3, 4 y 5 nunca se
 * jugaron. No se borran, pero tampoco cuentan.
 */
import { describe, expect, it } from 'vitest'
import { derivar, instantaneasDeRondas } from '../derivarEstado.ts'
import { clasificar } from '../finPartida.ts'
import { borrarRonda, editarRonda } from '../mutaciones.ts'
import { ahorrosDe, partidaDe, ronda } from './ayudas.ts'

/** Cinco rondas suaves: nadie se arruina, todo el mundo llega vivo al final. */
function partidaDeCinco() {
  return partidaDe(3, [
    ronda({ id: 'r1', pagadorId: 'j1', totalCartas: 100 }),
    ronda({ id: 'r2', pagadorId: 'j2', totalCartas: 100 }),
    ronda({ id: 'r3', pagadorId: 'j3', totalCartas: 100 }),
    ronda({ id: 'r4', pagadorId: 'j2', totalCartas: 100 }),
    ronda({ id: 'r5', pagadorId: 'j1', totalCartas: 100 }),
  ])
}

describe('sin fin de partida no hay nada que ignorar', () => {
  it('las cinco rondas cuentan', () => {
    const { indiceRondaFinal, rondasIgnoradas } = derivar(
      partidaDeCinco().jugadores,
      partidaDeCinco().rondas,
    )
    expect(indiceRondaFinal).toBeNull()
    expect(rondasIgnoradas).toEqual([])
  })

  it('ninguna instantánea del historial va marcada', () => {
    const instantaneas = instantaneasDeRondas(partidaDeCinco())
    expect(instantaneas.every((i) => !i.ignorada)).toBe(true)
  })
})

describe('corregir una ronda pasada de forma que la partida acabe antes', () => {
  // La ronda 2 pasa a ser un despropósito de 900 €: j2 se queda a 0 ahí mismo.
  const corregida = editarRonda(partidaDeCinco(), 'r2', {
    pagadorId: 'j2',
    totalCartas: 900,
    propina: 0,
    reparto: { tipo: 'normal' },
    aumentoMano: false,
  })

  it('la partida termina en la ronda corregida', () => {
    const { indiceRondaFinal } = derivar(corregida.jugadores, corregida.rondas)
    expect(indiceRondaFinal).toBe(1)
    expect(corregida.estado).toBe('terminada')
  })

  it('las tres rondas posteriores dejan de contar', () => {
    const { rondasIgnoradas } = derivar(corregida.jugadores, corregida.rondas)
    expect(rondasIgnoradas.map((r) => r.id)).toEqual(['r3', 'r4', 'r5'])
  })

  it('el dinero se para en la ronda que cerró la partida', () => {
    const { estados } = derivar(corregida.jugadores, corregida.rondas)
    expect(ahorrosDe(estados, 'j1')).toBe(800) // solo pagó la ronda 1
    expect(ahorrosDe(estados, 'j2')).toBe(0)
    expect(ahorrosDe(estados, 'j3')).toBe(900) // su ronda 3 ya no se jugó
  })

  it('pero las rondas huérfanas siguen guardadas, no se borran', () => {
    expect(corregida.rondas.map((r) => r.id)).toEqual(['r1', 'r2', 'r3', 'r4', 'r5'])
  })

  it('el historial las marca como ignoradas', () => {
    const instantaneas = instantaneasDeRondas(corregida)
    expect(instantaneas.map((i) => i.ignorada)).toEqual([false, false, true, true, true])
  })

  it('las instantáneas ignoradas repiten el estado final sin moverlo', () => {
    const instantaneas = instantaneasDeRondas(corregida)
    const final = instantaneas[1]!.estados
    for (const ignorada of instantaneas.slice(2)) {
      expect(ignorada.estados).toEqual(final)
    }
  })

  it('la clasificación las expone para poder avisar en pantalla', () => {
    expect(clasificar(corregida).rondasIgnoradas).toHaveLength(3)
  })
})

describe('deshacer el destrozo devuelve las rondas huérfanas al juego', () => {
  const corregida = editarRonda(partidaDeCinco(), 'r2', {
    pagadorId: 'j2',
    totalCartas: 900,
    propina: 0,
    reparto: { tipo: 'normal' },
    aumentoMano: false,
  })

  it('volver a corregir la ronda reabre la partida y todo vuelve a contar', () => {
    const arreglada = editarRonda(corregida, 'r2', {
      pagadorId: 'j2',
      totalCartas: 100,
      propina: 0,
      reparto: { tipo: 'normal' },
      aumentoMano: false,
    })

    const { indiceRondaFinal, rondasIgnoradas, estados } = derivar(
      arreglada.jugadores,
      arreglada.rondas,
    )
    expect(indiceRondaFinal).toBeNull()
    expect(rondasIgnoradas).toEqual([])
    expect(arreglada.estado).toBe('en-curso')
    expect(ahorrosDe(estados, 'j1')).toBe(700)
    expect(ahorrosDe(estados, 'j3')).toBe(800)
  })

  it('borrar la ronda que arruinó a alguien también las recupera', () => {
    const sinLaMala = borrarRonda(corregida, 'r2')
    const { rondasIgnoradas, estados } = derivar(sinLaMala.jugadores, sinLaMala.rondas)
    expect(rondasIgnoradas).toEqual([])
    expect(sinLaMala.estado).toBe('en-curso')
    // Quedan cuatro rondas de 100 €: j1 dos, j2 una, j3 una.
    expect(ahorrosDe(estados, 'j1')).toBe(700)
    expect(ahorrosDe(estados, 'j2')).toBe(800)
    expect(ahorrosDe(estados, 'j3')).toBe(800)
  })
})

describe('la ronda que cierra la partida sí se aplica entera', () => {
  it('el pagador se queda a 0 y el resto de esa misma ronda también paga', () => {
    const partida = partidaDe(3, [
      ronda({ id: 'r1', pagadorId: 'j1', totalCartas: 800 }),
      ronda({
        id: 'r2',
        pagadorId: 'j1',
        totalCartas: 300,
        reparto: { tipo: 'a-medias', coPagadorId: 'j2' },
      }),
      ronda({ id: 'r3', pagadorId: 'j3', totalCartas: 100 }),
    ])

    const { estados, indiceRondaFinal } = derivar(partida.jugadores, partida.rondas)
    expect(indiceRondaFinal).toBe(1)
    // j1: 900 − 800 − 150 con clamp = 0. j2 paga su mitad igualmente.
    expect(ahorrosDe(estados, 'j1')).toBe(0)
    expect(ahorrosDe(estados, 'j2')).toBe(750)
    // La ronda 3 ya no se jugó.
    expect(ahorrosDe(estados, 'j3')).toBe(900)
  })

  it('un aumento de mano en la ronda final sí se concede', () => {
    const partida = partidaDe(3, [
      ronda({ id: 'r1', pagadorId: 'j1', totalCartas: 900, aumentoMano: true }),
      ronda({ id: 'r2', pagadorId: 'j2', totalCartas: 100, aumentoMano: true }),
    ])
    const { estados } = derivar(partida.jugadores, partida.rondas)
    expect(estados.find((e) => e.jugadorId === 'j1')?.limiteMano).toBe(6)
    // El de la ronda huérfana no.
    expect(estados.find((e) => e.jugadorId === 'j2')?.limiteMano).toBe(5)
  })
})
