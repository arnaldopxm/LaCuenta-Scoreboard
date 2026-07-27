import { estadosDePartida } from './derivarEstado.ts'
import type { EstadoJugador, Partida } from './tipos.ts'

export interface Clasificacion {
  /** Alguien se quedó a 0: la partida ha terminado. */
  terminada: boolean
  /** Jugadores ordenados de más a menos ahorros. El orden de la mesa no cambia. */
  puestos: EstadoJugador[]
  /** Ahorros del primer puesto. */
  maximo: number
  /** Todos los que empatan en el máximo. Si hay uno solo, ese es el ganador. */
  empatadosIds: string[]
  /**
   * Hay más de un jugador en cabeza. Las reglas lo resuelven mirando quién
   * lleva más dinero encima en la vida real, así que la app no puede decidirlo:
   * toca pantalla de desempate manual.
   */
  requiereDesempate: boolean
  /** Ganador automático, solo cuando no hay empate. */
  ganadorId: string | null
}

/**
 * Estado final de una partida a partir de sus rondas.
 *
 * En cuanto un jugador queda a 0 tras aplicar una ronda, la partida termina y
 * gana quien más ahorros conserve.
 */
export function clasificar(partida: Partida): Clasificacion {
  const estados = estadosDePartida(partida)
  const terminada = estados.some((e) => e.sinAhorros)

  const puestos = [...estados].sort((a, b) => b.ahorros - a.ahorros)
  const maximo = puestos.length > 0 ? puestos[0]!.ahorros : 0
  const empatadosIds = puestos.filter((e) => e.ahorros === maximo).map((e) => e.jugadorId)
  const requiereDesempate = empatadosIds.length > 1

  return {
    terminada,
    puestos,
    maximo,
    empatadosIds,
    requiereDesempate,
    ganadorId: !requiereDesempate && empatadosIds.length === 1 ? empatadosIds[0]! : null,
  }
}

/** ¿Se pueden seguir cerrando rondas? */
export function admiteMasRondas(partida: Partida): boolean {
  return !clasificar(partida).terminada
}
