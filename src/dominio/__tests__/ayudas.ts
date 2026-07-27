import type { Partida, Reparto, Ronda } from '../tipos.ts'

/** Partida con jugadores de ids predecibles: j1, j2, j3... */
export function partidaDe(numJugadores: number, rondas: Ronda[] = []): Partida {
  return {
    id: 'partida-test',
    fechaInicio: 0,
    jugadores: Array.from({ length: numJugadores }, (_, i) => ({
      id: `j${i + 1}`,
      nombre: `Jugador ${i + 1}`,
    })),
    rondas: rondas.map((ronda, indice) => ({ ...ronda, indice })),
    estado: 'en-curso',
  }
}

let contador = 0

export function ronda(parcial: {
  id?: string
  pagadorId: string
  totalCartas: number
  propina?: number
  reparto?: Reparto
  aumentoMano?: boolean
}): Ronda {
  contador += 1
  return {
    id: parcial.id ?? `r${contador}`,
    indice: 0,
    pagadorId: parcial.pagadorId,
    totalCartas: parcial.totalCartas,
    propina: parcial.propina ?? 0,
    reparto: parcial.reparto ?? { tipo: 'normal' },
    aumentoMano: parcial.aumentoMano ?? false,
  }
}

/** Ahorros de un jugador concreto, para que los asserts se lean bien. */
export function ahorrosDe(estados: { jugadorId: string; ahorros: number }[], id: string): number {
  const estado = estados.find((e) => e.jugadorId === id)
  if (!estado) throw new Error(`No existe el jugador ${id}`)
  return estado.ahorros
}
