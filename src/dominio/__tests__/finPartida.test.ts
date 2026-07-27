import { describe, expect, it } from 'vitest'
import { admiteMasRondas, clasificar } from '../finPartida.ts'
import { partidaDe, ronda } from './ayudas.ts'

describe('detección de fin de partida', () => {
  it('sigue en curso mientras nadie llegue a 0', () => {
    const partida = partidaDe(4, [ronda({ pagadorId: 'j1', totalCartas: 999 })])
    const resultado = clasificar(partida)
    expect(resultado.terminada).toBe(false)
    expect(admiteMasRondas(partida)).toBe(true)
  })

  it('termina en cuanto un jugador se queda sin ahorros', () => {
    const partida = partidaDe(4, [ronda({ pagadorId: 'j1', totalCartas: 1000 })])
    expect(clasificar(partida).terminada).toBe(true)
    expect(admiteMasRondas(partida)).toBe(false)
  })
})

describe('clasificación', () => {
  it('ordena de más a menos ahorros sin tocar el orden de la mesa', () => {
    const partida = partidaDe(4, [
      ronda({ pagadorId: 'j1', totalCartas: 1000 }),
      ronda({ pagadorId: 'j2', totalCartas: 300 }),
      ronda({ pagadorId: 'j3', totalCartas: 100 }),
    ])
    const { puestos } = clasificar(partida)
    expect(puestos.map((p) => p.jugadorId)).toEqual(['j4', 'j3', 'j2', 'j1'])
    expect(puestos.map((p) => p.ahorros)).toEqual([1000, 900, 700, 0])
    // La partida en sí conserva el orden original.
    expect(partida.jugadores.map((j) => j.id)).toEqual(['j1', 'j2', 'j3', 'j4'])
  })

  it('declara ganador automático cuando hay un único líder', () => {
    const partida = partidaDe(3, [
      ronda({ pagadorId: 'j1', totalCartas: 900 }),
      ronda({ pagadorId: 'j2', totalCartas: 100 }),
    ])
    const resultado = clasificar(partida)
    expect(resultado.ganadorId).toBe('j3')
    expect(resultado.requiereDesempate).toBe(false)
    expect(resultado.empatadosIds).toEqual(['j3'])
  })
})

describe('empate en el primer puesto', () => {
  it('no declara ganador automáticamente y pide desempate', () => {
    // j1 se arruina; j2 y j3 acaban los dos con 900 €.
    const partida = partidaDe(3, [ronda({ pagadorId: 'j1', totalCartas: 900 })])
    const resultado = clasificar(partida)

    expect(resultado.terminada).toBe(true)
    expect(resultado.maximo).toBe(900)
    expect(resultado.empatadosIds).toEqual(['j2', 'j3'])
    expect(resultado.requiereDesempate).toBe(true)
    expect(resultado.ganadorId).toBeNull()
  })

  it('el empate puede ser a tres bandas', () => {
    const partida = partidaDe(4, [
      ronda({ pagadorId: 'j1', totalCartas: 1000 }),
      ronda({ pagadorId: 'j1', totalCartas: 50 }),
    ])
    const resultado = clasificar(partida)
    expect(resultado.empatadosIds).toEqual(['j2', 'j3', 'j4'])
    expect(resultado.requiereDesempate).toBe(true)
  })

  it('el empate a 0 entre todos tampoco corona a nadie', () => {
    const partida = partidaDe(3, [
      ronda({
        pagadorId: 'j1',
        totalCartas: 900,
        reparto: { tipo: 'a-pachas', participantesIds: ['j1', 'j2', 'j3'] },
      }),
      ronda({
        pagadorId: 'j1',
        totalCartas: 1800,
        reparto: { tipo: 'a-pachas', participantesIds: ['j1', 'j2', 'j3'] },
      }),
    ])
    const resultado = clasificar(partida)
    expect(resultado.puestos.every((p) => p.ahorros === 0)).toBe(true)
    expect(resultado.requiereDesempate).toBe(true)
    expect(resultado.ganadorId).toBeNull()
  })
})
