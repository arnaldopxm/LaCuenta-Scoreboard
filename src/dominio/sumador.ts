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
