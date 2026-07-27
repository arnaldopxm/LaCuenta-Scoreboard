import { MAX_IMPORTE, esImporteValido } from './validacion.ts'

/**
 * Aritmética del sumador de cartas.
 *
 * La app no sabe cuánto vale cada tapa —el catálogo de cartas está fuera de
 * alcance a propósito— así que esto no consulta precios: solo suma lo que el
 * usuario va tecleando mientras canta las cartas de la mesa.
 */

/** Suma una lista de importes, ignorando lo que no sea un entero válido. */
export function sumarImportes(importes: number[]): number {
  const total = importes.reduce(
    (suma, importe) => suma + (esImporteValido(importe) ? importe : 0),
    0,
  )
  return Math.min(total, MAX_IMPORTE)
}

/**
 * Dobla un importe, para la carta Premium.
 *
 * Es el único guiño a una carta concreta en todo el sumador, y se queda en
 * aritmética: no hay catálogo de por medio, solo multiplicar por dos lo que ya
 * había tecleado el usuario.
 */
export function duplicarImporte(importe: number): number {
  if (!esImporteValido(importe)) return 0
  return Math.min(importe * 2, MAX_IMPORTE)
}

/** Cuántas cartas se llevan sumadas. Sirve para la casilla del aumento. */
export function cuentaDeSumandos(importes: number[]): number {
  return importes.filter(esImporteValido).length
}
