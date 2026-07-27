import { clasificar } from './finPartida.ts'
import { nuevoId } from './id.ts'
import { MAX_JUGADORES, MIN_JUGADORES } from './reglas.ts'
import type { Partida, Ronda } from './tipos.ts'
import { sanearNombre, type BorradorRonda } from './validacion.ts'

/**
 * Todas las mutaciones son puras: reciben una partida y devuelven otra nueva.
 * Ninguna toca los ahorros, porque los ahorros no se guardan. Se cambia la
 * lista de rondas y el estado derivado sale solo.
 */

export function nombresPorDefecto(cantidad: number): string[] {
  return Array.from({ length: cantidad }, (_, i) => `Jugador ${i + 1}`)
}

export function crearPartida(nombres: string[], ahora: number = Date.now()): Partida {
  if (nombres.length < MIN_JUGADORES || nombres.length > MAX_JUGADORES) {
    throw new RangeError(
      `La partida es de ${MIN_JUGADORES} a ${MAX_JUGADORES} jugadores, no ${nombres.length}.`,
    )
  }
  return {
    id: nuevoId(),
    fechaInicio: ahora,
    jugadores: nombres.map((nombre) => ({ id: nuevoId(), nombre: sanearNombre(nombre) })),
    rondas: [],
    estado: 'en-curso',
  }
}

export function anadirRonda(partida: Partida, borrador: BorradorRonda): Partida {
  const ronda: Ronda = { id: nuevoId(), indice: partida.rondas.length, ...borrador }
  return sincronizar({ ...partida, rondas: [...partida.rondas, ronda] })
}

/**
 * Sustituye una ronda pasada. Todas las posteriores se recalculan en cascada
 * sin hacer nada especial: la derivación vuelve a recorrer la lista entera.
 */
export function editarRonda(
  partida: Partida,
  rondaId: string,
  borrador: BorradorRonda,
): Partida {
  const rondas = partida.rondas.map((ronda) =>
    ronda.id === rondaId ? { ...ronda, ...borrador } : ronda,
  )
  return sincronizar({ ...partida, rondas })
}

export function borrarRonda(partida: Partida, rondaId: string): Partida {
  const rondas = partida.rondas.filter((ronda) => ronda.id !== rondaId)
  return sincronizar({ ...partida, rondas })
}

export function deshacerUltimaRonda(partida: Partida): Partida {
  if (partida.rondas.length === 0) return partida
  return sincronizar({ ...partida, rondas: partida.rondas.slice(0, -1) })
}

/**
 * Cierra un empate a mano. Las reglas dicen que gana quien lleve más dinero
 * encima en la vida real, dato que la app no tiene ni puede tener.
 */
export function resolverDesempate(partida: Partida, ganadorId: string): Partida {
  const clasificacion = clasificar(partida)
  if (!clasificacion.empatadosIds.includes(ganadorId)) {
    throw new Error('El ganador del desempate tiene que ser uno de los empatados.')
  }
  return { ...partida, estado: 'terminada', ganadorId }
}

export function renombrarJugador(partida: Partida, jugadorId: string, nombre: string): Partida {
  return {
    ...partida,
    jugadores: partida.jugadores.map((jugador) =>
      jugador.id === jugadorId ? { ...jugador, nombre: sanearNombre(nombre) } : jugador,
    ),
  }
}

/**
 * Reindexa las rondas y recalcula estado y ganador desde cero.
 *
 * Un ganador elegido a mano se descarta aquí a propósito: si las rondas
 * cambian, el desempate anterior ya no vale y hay que volver a preguntar.
 */
function sincronizar(partida: Partida): Partida {
  const rondas = partida.rondas.map((ronda, indice) => ({ ...ronda, indice }))
  const base: Partida = { ...partida, rondas, estado: 'en-curso' }
  delete base.ganadorId

  const clasificacion = clasificar(base)
  if (!clasificacion.terminada) return base

  base.estado = 'terminada'
  if (clasificacion.ganadorId !== null) base.ganadorId = clasificacion.ganadorId
  return base
}
