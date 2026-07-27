/**
 * Modelo de datos de La Cuenta.
 *
 * Diseño event-sourced: los ahorros y los aumentos de mano NUNCA se guardan.
 * La única fuente de verdad es la lista ordenada de rondas; todo lo demás se
 * deriva recorriéndola desde el principio (ver `derivarEstado.ts`).
 */

export interface Jugador {
  id: string
  nombre: string
}

/** Cómo se reparte el importe de la cuenta en una ronda. */
export type Reparto =
  /** Paga solo quien pidió la cuenta. */
  | { tipo: 'normal' }
  /** Carta "A medias": el pagador elige un participante y pagan mitad y mitad. */
  | { tipo: 'a-medias'; coPagadorId: string }
  /**
   * Carta "A pachas": se divide entre los participantes marcados. La app no
   * conoce quién está en el baño ni quién cumple años, así que la lista la
   * decide el usuario desmarcando en la interfaz.
   */
  | { tipo: 'a-pachas'; participantesIds: string[] }

export type TipoReparto = Reparto['tipo']

export interface Ronda {
  id: string
  /**
   * Posición de la ronda, empezando en 0. Se recalcula en cada mutación: el
   * orden del array `Partida.rondas` es la verdad, este campo es una comodidad
   * para mostrarlo en la interfaz.
   */
  indice: number
  /** Quien pide y paga la cuenta. Es siempre quien puede recibir el aumento. */
  pagadorId: string
  /** Suma de las cartas de la mesa, en euros enteros. Lo teclea el usuario. */
  totalCartas: number
  /** Precio de la tapa más barata si se jugó Propina; 0 si no aplica. */
  propina: number
  reparto: Reparto
  /**
   * true si el pagador se lleva +1 al límite de mano. La condición previa
   * ("se jugaron al menos tantas cartas como jugadores") la confirma el usuario
   * en la interfaz; aquí solo llega el resultado.
   */
  aumentoMano: boolean
}

export type EstadoPartida = 'en-curso' | 'terminada'

export interface Partida {
  id: string
  /** Epoch en milisegundos. */
  fechaInicio: number
  /** Entre 3 y 8 jugadores, en orden fijo. El orden no cambia nunca. */
  jugadores: Jugador[]
  rondas: Ronda[]
  estado: EstadoPartida
  /** Solo se rellena al cerrar la partida, incluido el desempate manual. */
  ganadorId?: string
}

/** Estado derivado de un jugador. No se persiste jamás: se recalcula al vuelo. */
export interface EstadoJugador {
  jugadorId: string
  nombre: string
  ahorros: number
  aumentos: number
  /** 5 + aumentos, con tope en 10. */
  limiteMano: number
  sinAhorros: boolean
}

/** Lo que paga un jugador concreto en una ronda concreta. */
export interface Pago {
  jugadorId: string
  importe: number
}
