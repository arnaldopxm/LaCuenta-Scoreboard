import { describe, expect, it } from 'vitest'
import { estadosDePartida, instantaneasDeRondas } from '../derivarEstado.ts'
import { clasificar } from '../finPartida.ts'
import {
  anadirRonda,
  borrarRonda,
  crearPartida,
  deshacerUltimaRonda,
  editarRonda,
  nombresPorDefecto,
  resolverDesempate,
} from '../mutaciones.ts'
import { ahorrosDe, partidaDe, ronda } from './ayudas.ts'

describe('crear partida', () => {
  it('arranca con los ahorros de la tabla y sin rondas', () => {
    const partida = crearPartida(nombresPorDefecto(5), 1234)
    expect(partida.jugadores).toHaveLength(5)
    expect(partida.rondas).toEqual([])
    expect(partida.estado).toBe('en-curso')
    expect(partida.fechaInicio).toBe(1234)
    expect(estadosDePartida(partida).every((e) => e.ahorros === 1100)).toBe(true)
  })

  it('limpia los nombres al crearlos', () => {
    const partida = crearPartida(['  Arnaldo \n', 'Luis\t\tM', 'Ana'])
    expect(partida.jugadores.map((j) => j.nombre)).toEqual(['Arnaldo', 'Luis M', 'Ana'])
  })

  it('rechaza partidas fuera de 3..8', () => {
    expect(() => crearPartida(nombresPorDefecto(2))).toThrow(RangeError)
    expect(() => crearPartida(Array.from({ length: 9 }, (_, i) => `J${i}`))).toThrow(RangeError)
  })
})

describe('añadir rondas', () => {
  it('numera los índices en orden', () => {
    let partida = crearPartida(nombresPorDefecto(4))
    const [j1, j2] = partida.jugadores
    partida = anadirRonda(partida, {
      pagadorId: j1!.id,
      totalCartas: 100,
      propina: 0,
      reparto: { tipo: 'normal' },
      aumentoMano: false,
    })
    partida = anadirRonda(partida, {
      pagadorId: j2!.id,
      totalCartas: 50,
      propina: 0,
      reparto: { tipo: 'normal' },
      aumentoMano: false,
    })
    expect(partida.rondas.map((r) => r.indice)).toEqual([0, 1])
  })

  it('cierra la partida en cuanto alguien se queda a 0', () => {
    let partida = crearPartida(nombresPorDefecto(3))
    const pagador = partida.jugadores[0]!
    partida = anadirRonda(partida, {
      pagadorId: pagador.id,
      totalCartas: 900,
      propina: 0,
      reparto: { tipo: 'normal' },
      aumentoMano: false,
    })
    expect(partida.estado).toBe('terminada')
  })
})

describe('editar una ronda pasada', () => {
  it('editar la ronda 2 de 5 recalcula en cascada las rondas 3, 4 y 5', () => {
    const rondas = [
      ronda({ id: 'r1', pagadorId: 'j1', totalCartas: 100 }),
      ronda({ id: 'r2', pagadorId: 'j2', totalCartas: 100 }),
      ronda({ id: 'r3', pagadorId: 'j3', totalCartas: 100 }),
      ronda({ id: 'r4', pagadorId: 'j2', totalCartas: 100 }),
      ronda({ id: 'r5', pagadorId: 'j1', totalCartas: 100 }),
    ]
    const partida = partidaDe(3, rondas)

    // De partida: j1 paga 200, j2 paga 200, j3 paga 100.
    const antes = estadosDePartida(partida)
    expect(ahorrosDe(antes, 'j1')).toBe(700)
    expect(ahorrosDe(antes, 'j2')).toBe(700)
    expect(ahorrosDe(antes, 'j3')).toBe(800)

    // La ronda 2 pasa a ser de 400 € y encima la paga j3 a medias con j1.
    const corregida = editarRonda(partida, 'r2', {
      pagadorId: 'j3',
      totalCartas: 400,
      propina: 0,
      reparto: { tipo: 'a-medias', coPagadorId: 'j1' },
      aumentoMano: false,
    })

    const despues = estadosDePartida(corregida)
    expect(ahorrosDe(despues, 'j1')).toBe(500) // 900 - 100 - 200 - 100
    expect(ahorrosDe(despues, 'j2')).toBe(800) // 900 - 100
    expect(ahorrosDe(despues, 'j3')).toBe(600) // 900 - 200 - 100

    // Las rondas posteriores siguen intactas y en su sitio.
    expect(corregida.rondas.map((r) => r.id)).toEqual(['r1', 'r2', 'r3', 'r4', 'r5'])
    expect(corregida.rondas.map((r) => r.indice)).toEqual([0, 1, 2, 3, 4])

    // Y los estados intermedios del historial también se han movido.
    const historial = instantaneasDeRondas(corregida)
    expect(ahorrosDe(historial[1]!.estados, 'j1')).toBe(600)
  })

  it('editar una ronda puede terminar la partida', () => {
    const partida = partidaDe(3, [
      ronda({ id: 'r1', pagadorId: 'j1', totalCartas: 100 }),
      ronda({ id: 'r2', pagadorId: 'j2', totalCartas: 100 }),
    ])
    const corregida = editarRonda(partida, 'r1', {
      pagadorId: 'j1',
      totalCartas: 900,
      propina: 0,
      reparto: { tipo: 'normal' },
      aumentoMano: false,
    })
    expect(corregida.estado).toBe('terminada')
  })

  it('editar una ronda puede reabrir una partida que se había cerrado por error', () => {
    const partida = partidaDe(3, [ronda({ id: 'r1', pagadorId: 'j1', totalCartas: 900 })])
    expect(clasificar(partida).terminada).toBe(true)

    const corregida = editarRonda(partida, 'r1', {
      pagadorId: 'j1',
      totalCartas: 90,
      propina: 0,
      reparto: { tipo: 'normal' },
      aumentoMano: false,
    })
    expect(corregida.estado).toBe('en-curso')
    expect(corregida.ganadorId).toBeUndefined()
  })
})

describe('borrar rondas', () => {
  it('borrar una ronda intermedia recalcula el resto y reindexa', () => {
    const partida = partidaDe(4, [
      ronda({ id: 'r1', pagadorId: 'j1', totalCartas: 100 }),
      ronda({ id: 'r2', pagadorId: 'j2', totalCartas: 250 }),
      ronda({ id: 'r3', pagadorId: 'j1', totalCartas: 100, aumentoMano: true }),
    ])

    const sinLaSegunda = borrarRonda(partida, 'r2')

    expect(sinLaSegunda.rondas.map((r) => r.id)).toEqual(['r1', 'r3'])
    expect(sinLaSegunda.rondas.map((r) => r.indice)).toEqual([0, 1])

    const estados = estadosDePartida(sinLaSegunda)
    expect(ahorrosDe(estados, 'j1')).toBe(800)
    expect(ahorrosDe(estados, 'j2')).toBe(1000) // le devolvemos sus 250 €
    // El aumento de la ronda que sobrevive sigue en pie.
    expect(estados.find((e) => e.jugadorId === 'j1')?.limiteMano).toBe(6)
  })

  it('deshacer la última quita solo esa', () => {
    const partida = partidaDe(3, [
      ronda({ id: 'r1', pagadorId: 'j1', totalCartas: 100 }),
      ronda({ id: 'r2', pagadorId: 'j2', totalCartas: 100 }),
    ])
    const deshecha = deshacerUltimaRonda(partida)
    expect(deshecha.rondas.map((r) => r.id)).toEqual(['r1'])
    expect(ahorrosDe(estadosDePartida(deshecha), 'j2')).toBe(900)
  })

  it('deshacer sin rondas no rompe nada', () => {
    const partida = partidaDe(3)
    expect(deshacerUltimaRonda(partida).rondas).toEqual([])
  })
})

describe('inmutabilidad', () => {
  it('las mutaciones no tocan la partida original', () => {
    const partida = partidaDe(3, [ronda({ id: 'r1', pagadorId: 'j1', totalCartas: 100 })])
    const copia = structuredClone(partida)

    borrarRonda(partida, 'r1')
    editarRonda(partida, 'r1', {
      pagadorId: 'j2',
      totalCartas: 500,
      propina: 0,
      reparto: { tipo: 'normal' },
      aumentoMano: false,
    })
    anadirRonda(partida, {
      pagadorId: 'j3',
      totalCartas: 10,
      propina: 0,
      reparto: { tipo: 'normal' },
      aumentoMano: false,
    })

    expect(partida).toEqual(copia)
  })
})

describe('desempate manual', () => {
  it('fija el ganador elegido entre los empatados', () => {
    const partida = partidaDe(3, [ronda({ id: 'r1', pagadorId: 'j1', totalCartas: 900 })])
    expect(clasificar(partida).requiereDesempate).toBe(true)

    const resuelta = resolverDesempate(partida, 'j3')
    expect(resuelta.estado).toBe('terminada')
    expect(resuelta.ganadorId).toBe('j3')
  })

  it('no deja coronar a alguien que no estaba empatado en cabeza', () => {
    const partida = partidaDe(3, [ronda({ id: 'r1', pagadorId: 'j1', totalCartas: 900 })])
    expect(() => resolverDesempate(partida, 'j1')).toThrow()
  })
})
