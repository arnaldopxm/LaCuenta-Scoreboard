import { aplicarPago, sinAhorros } from './aplicarPago.ts'
import { calcularCuenta, calcularPagos, receptorDelAumento } from './calculoRonda.ts'
import { ahorrosIniciales, limiteMano, puedeAumentar } from './reglas.ts'
import type { EstadoJugador, Jugador, Pago, Partida, Ronda } from './tipos.ts'

export interface Derivacion {
  estados: EstadoJugador[]
  /**
   * Índice de la ronda tras la cual alguien se quedó a 0 y la partida acabó.
   * `null` mientras siga en curso.
   */
  indiceRondaFinal: number | null
  /**
   * Rondas guardadas por detrás de la que cerró la partida. En una partida
   * normal esto es siempre 0: la interfaz no deja cerrar más rondas cuando ya
   * ha terminado. Solo aparecen al corregir una ronda pasada de forma que la
   * partida se acabe antes de lo que se acabó.
   */
  rondasIgnoradas: Ronda[]
}

/**
 * Corazón del modelo event-sourced: recorre las rondas en orden desde los
 * ahorros iniciales y devuelve el estado de cada jugador.
 *
 * Nada de deltas incrementales sobre un saldo guardado. Esto es lo que hace que
 * editar o borrar la ronda 2 de 7 sea trivial: se recalcula entero y ya está.
 *
 * El recorrido PARA en cuanto una ronda deja a alguien sin ahorros. Las reglas
 * son claras: ahí se acabó la partida, así que las rondas posteriores no se
 * jugaron nunca y no pueden mover el dinero de nadie. No se borran —siguen
 * guardadas y se pueden corregir— pero no cuentan.
 */
export function derivar(jugadores: Jugador[], rondas: Ronda[]): Derivacion {
  const inicial = ahorrosIniciales(jugadores.length)
  const ahorros = new Map(jugadores.map((j) => [j.id, inicial]))
  const aumentos = new Map(jugadores.map((j) => [j.id, 0]))

  let indiceRondaFinal: number | null = null

  for (const [indice, ronda] of rondas.entries()) {
    aplicarRondaA(ahorros, aumentos, ronda)
    if ([...ahorros.values()].some(sinAhorros)) {
      indiceRondaFinal = indice
      break
    }
  }

  return {
    estados: jugadores.map((jugador) => componer(jugador, ahorros, aumentos)),
    indiceRondaFinal,
    rondasIgnoradas: indiceRondaFinal === null ? [] : rondas.slice(indiceRondaFinal + 1),
  }
}

export function derivarEstados(jugadores: Jugador[], rondas: Ronda[]): EstadoJugador[] {
  return derivar(jugadores, rondas).estados
}

/** Igual que `derivar` pero partiendo de una partida completa. */
export function derivacionDePartida(partida: Partida): Derivacion {
  return derivar(partida.jugadores, partida.rondas)
}

export function estadosDePartida(partida: Partida): EstadoJugador[] {
  return derivar(partida.jugadores, partida.rondas).estados
}

export interface InstantaneaRonda {
  /** Cómo quedaba la mesa justo después de jugar esta ronda. */
  estados: EstadoJugador[]
  /**
   * La partida ya había terminado antes de llegar aquí, así que esta ronda no
   * se aplica. El historial la marca para que se vea por qué no cuadra.
   */
  ignorada: boolean
}

/**
 * Estado tras cada ronda, para el historial: la posición `i` corresponde a
 * `partida.rondas[i]`.
 *
 * A partir de la ronda que cierra la partida, las instantáneas repiten el
 * estado final y van marcadas como ignoradas.
 */
export function instantaneasDeRondas(partida: Partida): InstantaneaRonda[] {
  const inicial = ahorrosIniciales(partida.jugadores.length)
  const ahorros = new Map(partida.jugadores.map((j) => [j.id, inicial]))
  const aumentos = new Map(partida.jugadores.map((j) => [j.id, 0]))
  let terminada = false

  return partida.rondas.map((ronda) => {
    if (terminada) {
      return {
        estados: partida.jugadores.map((jugador) => componer(jugador, ahorros, aumentos)),
        ignorada: true,
      }
    }

    aplicarRondaA(ahorros, aumentos, ronda)
    if ([...ahorros.values()].some(sinAhorros)) terminada = true

    return {
      estados: partida.jugadores.map((jugador) => componer(jugador, ahorros, aumentos)),
      ignorada: false,
    }
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
