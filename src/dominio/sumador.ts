import { MAX_IMPORTE, esImporteConSigno } from './validacion.ts'

/**
 * Aritmética del sumador de cartas.
 *
 * La app no sabe cuánto vale cada tapa —el catálogo de cartas está fuera de
 * alcance a propósito— así que esto no consulta precios: solo suma lo que el
 * usuario va tecleando mientras canta las cartas de la mesa.
 */

/**
 * Suma una lista de cartas, ignorando lo que no sea un entero válido.
 *
 * Las cartas pueden restar: un plato quemado vale −10, −30... así que tanto
 * los sumandos como el resultado pueden ser negativos. Quien recorte esto a
 * cero se lleva por delante el cálculo, porque la propina se suma DESPUÉS y
 * antes del `max(0, ...)` final.
 */
export function sumarImportes(importes: number[]): number {
  const total = importes.reduce(
    (suma, importe) => suma + (esImporteConSigno(importe) ? importe : 0),
    0,
  )
  return Math.max(-MAX_IMPORTE, Math.min(total, MAX_IMPORTE))
}

/**
 * Dobla un importe, para la carta Premium.
 *
 * Es el único guiño a una carta concreta en todo el sumador, y se queda en
 * aritmética: no hay catálogo de por medio, solo multiplicar por dos lo que ya
 * había tecleado el usuario.
 */
export function duplicarImporte(importe: number): number {
  if (!esImporteConSigno(importe)) return 0
  // Doblar un plato quemado dobla el descuento, que es lo que cabe esperar.
  return Math.max(-MAX_IMPORTE, Math.min(importe * 2, MAX_IMPORTE))
}

/** Cuántas cartas se llevan sumadas. Sirve para la casilla del aumento. */
export function cuentaDeSumandos(importes: number[]): number {
  return importes.filter(esImporteConSigno).length
}

/**
 * Una carta cantada en el sumador.
 *
 * El doble de Premium se guarda como **estado de la carta** y no aplicado al
 * importe, y eso es lo que hace que el sumador no mienta. Cuando doblar era
 * multiplicar el número:
 *
 *   - se podía doblar la misma carta una y otra vez, ×4, ×8, sin tope ninguno,
 *     y en la mesa una carta lleva Premium o no lo lleva;
 *   - no quedaba rastro: una carta de 24 podía ser un plato de 24 o uno de 12
 *     doblado, así que no había forma de revisar lo cantado ni de deshacerlo.
 *
 * Con el estado aparte, el importe sigue siendo el que dice la carta en la mesa,
 * el doble se ve, se quita, y no se puede poner dos veces.
 */
export interface CartaSumada {
  /** Lo que dice la carta en la mesa. Puede ser negativo: los platos quemados. */
  importe: number
  /** Premium jugado encima: cuenta el doble. */
  doblada: boolean
}

/** Carta recién cantada, sin Premium. */
export function cartaSumada(importe: number): CartaSumada {
  return { importe, doblada: false }
}

/**
 * Lo que cuenta esa carta: el doble si lleva Premium.
 *
 * Pasa por `duplicarImporte`, así que el signo y el tope los sigue gobernando
 * un solo sitio: un plato quemado de −15 cuenta −30.
 */
export function importeEfectivo(carta: CartaSumada): number {
  return carta.doblada ? duplicarImporte(carta.importe) : carta.importe
}

/** Total de las cartas cantadas, con los Premium ya aplicados. */
export function sumarCartas(cartas: CartaSumada[]): number {
  return sumarImportes(cartas.map(importeEfectivo))
}

/**
 * Cuántas cartas se llevan. El Premium no añade una carta a la mesa: dobla los
 * euros de la que ya está, y la regla del aumento cuenta cartas, no euros.
 */
export function cuentaDeCartas(cartas: CartaSumada[]): number {
  return cuentaDeSumandos(cartas.map((carta) => carta.importe))
}

/**
 * Pone o quita el Premium de la carta que está en esa posición.
 *
 * Es un interruptor y no una multiplicación acumulable, a propósito: doblar dos
 * veces daría un ×4 que en la mesa no existe.
 */
export function alternarDobleEn(cartas: CartaSumada[], indice: number): CartaSumada[] {
  if (!esIndiceDeCarta(cartas, indice)) return cartas
  return cartas.map((carta, i) => (i === indice ? { ...carta, doblada: !carta.doblada } : carta))
}

/** Quita la carta que está en esa posición. */
export function quitarCartaEn(cartas: CartaSumada[], indice: number): CartaSumada[] {
  if (!esIndiceDeCarta(cartas, indice)) return cartas
  return cartas.filter((_, i) => i !== indice)
}

/**
 * Fuera de rango no se toca nada y se devuelve la MISMA lista: quien nos llama
 * la mete en un estado de React, y un array nuevo idéntico sería un cambio de
 * estado por nada.
 */
function esIndiceDeCarta(cartas: readonly unknown[], indice: number): boolean {
  return Number.isInteger(indice) && indice >= 0 && indice < cartas.length
}
