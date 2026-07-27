/**
 * Constantes de las reglas oficiales. Todo número mágico del juego vive aquí.
 */

export const MIN_JUGADORES = 3
export const MAX_JUGADORES = 8

/** Límite de mano con el que empieza todo el mundo. */
export const LIMITE_MANO_BASE = 5

/** Tope absoluto de cartas en mano. Nadie puede pasar de aquí. */
export const LIMITE_MANO_MAX = 10

/** Cinco aumentos como mucho: de 5 cartas a 10. */
export const MAX_AUMENTOS = LIMITE_MANO_MAX - LIMITE_MANO_BASE

/**
 * Ahorros iniciales según número de participantes, tal cual la tabla del
 * reglamento. Deliberadamente explícita en vez de una fórmula: si algún día
 * 2Tomatoes cambia un valor, se cambia aquí y ya.
 */
const AHORROS_INICIALES: Readonly<Record<number, number>> = {
  3: 900,
  4: 1000,
  5: 1100,
  6: 1200,
  7: 1300,
  8: 1400,
}

/**
 * Ahorros con los que arranca cada jugador.
 * @throws si el número de participantes está fuera de 3..8.
 */
export function ahorrosIniciales(numJugadores: number): number {
  const ahorros = AHORROS_INICIALES[numJugadores]
  if (ahorros === undefined) {
    throw new RangeError(
      `La Cuenta se juega de ${MIN_JUGADORES} a ${MAX_JUGADORES} jugadores, no ${numJugadores}.`,
    )
  }
  return ahorros
}

/** Límite de mano correspondiente a un número de aumentos acumulados. */
export function limiteMano(aumentos: number): number {
  return Math.min(LIMITE_MANO_BASE + aumentos, LIMITE_MANO_MAX)
}

/** ¿Le queda margen a este jugador para otro aumento? */
export function puedeAumentar(aumentos: number): boolean {
  return aumentos < MAX_AUMENTOS
}

/**
 * Solo hay derecho a aumento si en la ronda se jugaron al menos tantas cartas
 * como participantes hay en la partida. La app no ve la mesa, así que este dato
 * lo confirma el usuario con una casilla.
 */
export function cumpleMinimoCartas(cartasJugadas: number, numJugadores: number): boolean {
  return cartasJugadas >= numJugadores
}

/**
 * Decide si el pagador se lleva el +1 de mano. Tres condiciones, todas
 * necesarias: se jugaron cartas suficientes, el usuario lo pide, y queda
 * margen bajo el tope de 10 cartas.
 */
export function concedeAumento(opciones: {
  minimoCartasConfirmado: boolean
  solicitado: boolean
  aumentosActuales: number
}): boolean {
  return (
    opciones.minimoCartasConfirmado &&
    opciones.solicitado &&
    puedeAumentar(opciones.aumentosActuales)
  )
}
