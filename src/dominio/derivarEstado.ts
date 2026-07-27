import { aplicarPago, sinAhorros } from './aplicarPago.ts'
import { calcularCuenta, calcularPagos, receptorDelAumento } from './calculoRonda.ts'
import { ahorrosIniciales, limiteMano, puedeAumentar } from './reglas.ts'
import type { EstadoJugador, Jugador, Pago, Partida, Ronda } from './tipos.ts'

/**
 * Corazón del modelo event-sourced: recorre las rondas en orden desde los
 * ahorros iniciales y devuelve el estado de cada jugador.
 *
 * Nada de deltas incrementales sobre un saldo guardado. Esto es lo que hace que
 * editar o borrar la ronda 2 de 7 sea trivial: se recalcula entero y ya está.
 */
export function derivarEstados(jugadores: Jugador[], rondas: Ronda[]): EstadoJugador[] {
  const inicial = ahorrosIniciales(jugadores.length)
  const ahorros = new Map(jugadores.map((j) => [j.id, inicial]))
  const aumentos = new Map(jugadores.map((j) => [j.id, 0]))

  for (const ronda of rondas) {
    aplicarRondaA(ahorros, aumentos, ronda)
  }

  return jugadores.map((jugador) => componer(jugador, ahorros, aumentos))
}

/** Igual que `derivarEstados` pero partiendo de una partida completa. */
export function estadosDePartida(partida: Partida): EstadoJugador[] {
  return derivarEstados(partida.jugadores, partida.rondas)
}

/**
 * Estado tras cada ronda, para el historial: la posición `i` es cómo quedaba la
 * mesa justo después de jugar `rondas[i]`.
 */
export function estadosTrasCadaRonda(partida: Partida): EstadoJugador[][] {
  const inicial = ahorrosIniciales(partida.jugadores.length)
  const ahorros = new Map(partida.jugadores.map((j) => [j.id, inicial]))
  const aumentos = new Map(partida.jugadores.map((j) => [j.id, 0]))

  return partida.rondas.map((ronda) => {
    aplicarRondaA(ahorros, aumentos, ronda)
    return partida.jugadores.map((jugador) => componer(jugador, ahorros, aumentos))
  })
}

export interface Previsualizacion {
  cuenta: number
  pagos: Pago[]
  /** Cómo quedaría la mesa si se confirmase la ronda. */
  estadosResultantes: EstadoJugador[]
  /** Quién se llevaría el +1 de mano, si alguien. */
  receptorAumentoId: string | null
  /** El aumento se pierde porque el pagador ya está en límite de mano 10. */
  aumentoDesperdiciado: boolean
  /** Jugadores que se quedarían a 0 y por tanto cerrarían la partida. */
  jugadoresArruinadosIds: string[]
}

/**
 * Qué pasaría si se cerrase la ronda tal y como está en el formulario.
 * Alimenta la previsualización obligatoria antes de confirmar: sin esto el
 * error de tecleo se descubre demasiado tarde.
 */
export function previsualizarRonda(partida: Partida, borrador: Ronda): Previsualizacion {
  const antes = estadosDePartida(partida)
  const despues = derivarEstados(partida.jugadores, [...partida.rondas, borrador])
  const pagos = calcularPagos(borrador)

  const receptorAumentoId = receptorDelAumento(borrador)
  const aumentosPrevios = antes.find((e) => e.jugadorId === borrador.pagadorId)?.aumentos ?? 0

  return {
    cuenta: calcularCuenta(borrador.totalCartas, borrador.propina),
    pagos,
    estadosResultantes: despues,
    receptorAumentoId,
    aumentoDesperdiciado: receptorAumentoId !== null && !puedeAumentar(aumentosPrevios),
    jugadoresArruinadosIds: despues.filter((e) => e.sinAhorros).map((e) => e.jugadorId),
  }
}

function aplicarRondaA(
  ahorros: Map<string, number>,
  aumentos: Map<string, number>,
  ronda: Ronda,
): void {
  for (const pago of calcularPagos(ronda)) {
    const actual = ahorros.get(pago.jugadorId)
    // Un pago de un jugador que no está en la partida se ignora en vez de
    // reventar: datos viejos o corruptos no deben tumbar el marcador.
    if (actual === undefined) continue
    ahorros.set(pago.jugadorId, aplicarPago(actual, pago.importe))
  }

  const receptorId = receptorDelAumento(ronda)
  if (receptorId === null) return
  const acumulados = aumentos.get(receptorId)
  if (acumulados === undefined) return
  // El tope de 10 cartas es duro: el sexto aumento simplemente no se aplica.
  if (puedeAumentar(acumulados)) aumentos.set(receptorId, acumulados + 1)
}

function componer(
  jugador: Jugador,
  ahorros: Map<string, number>,
  aumentos: Map<string, number>,
): EstadoJugador {
  const dinero = ahorros.get(jugador.id) ?? 0
  const subidas = aumentos.get(jugador.id) ?? 0
  return {
    jugadorId: jugador.id,
    nombre: jugador.nombre,
    ahorros: dinero,
    aumentos: subidas,
    limiteMano: limiteMano(subidas),
    sinAhorros: sinAhorros(dinero),
  }
}
