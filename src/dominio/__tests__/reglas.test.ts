import { describe, expect, it } from 'vitest'
import {
  ahorrosIniciales,
  concedeAumento,
  cumpleMinimoCartas,
  limiteMano,
  puedeAumentar,
} from '../reglas.ts'

describe('ahorros iniciales', () => {
  it.each([
    [3, 900],
    [4, 1000],
    [5, 1100],
    [6, 1200],
    [7, 1300],
    [8, 1400],
  ])('con %i jugadores se empieza con %i €', (jugadores, esperado) => {
    expect(ahorrosIniciales(jugadores)).toBe(esperado)
  })

  it.each([0, 1, 2, 9, 12, -3, 4.5])('rechaza %s jugadores', (jugadores) => {
    expect(() => ahorrosIniciales(jugadores)).toThrow(RangeError)
  })
})

describe('límite de mano', () => {
  it('empieza en 5 cartas sin aumentos', () => {
    expect(limiteMano(0)).toBe(5)
  })

  it('sube de uno en uno', () => {
    expect(limiteMano(1)).toBe(6)
    expect(limiteMano(3)).toBe(8)
    expect(limiteMano(5)).toBe(10)
  })

  it('nunca pasa de 10 aunque se acumulen más aumentos', () => {
    expect(limiteMano(6)).toBe(10)
    expect(limiteMano(99)).toBe(10)
  })

  it('deja de admitir aumentos al llegar a 5', () => {
    expect(puedeAumentar(4)).toBe(true)
    expect(puedeAumentar(5)).toBe(false)
  })
})

describe('condición de aumento', () => {
  it('exige tantas cartas jugadas como participantes', () => {
    expect(cumpleMinimoCartas(7, 7)).toBe(true)
    expect(cumpleMinimoCartas(9, 7)).toBe(true)
    expect(cumpleMinimoCartas(6, 7)).toBe(false)
  })

  it('no concede el aumento si se jugaron menos cartas que jugadores', () => {
    expect(
      concedeAumento({ minimoCartasConfirmado: false, solicitado: true, aumentosActuales: 0 }),
    ).toBe(false)
  })

  it('no concede el aumento si el pagador no lo pide', () => {
    expect(
      concedeAumento({ minimoCartasConfirmado: true, solicitado: false, aumentosActuales: 0 }),
    ).toBe(false)
  })

  it('no concede el sexto aumento: el límite de mano 10 es tope duro', () => {
    expect(
      concedeAumento({ minimoCartasConfirmado: true, solicitado: true, aumentosActuales: 5 }),
    ).toBe(false)
  })

  it('concede el aumento cuando se cumplen las tres condiciones', () => {
    expect(
      concedeAumento({ minimoCartasConfirmado: true, solicitado: true, aumentosActuales: 4 }),
    ).toBe(true)
  })
})
