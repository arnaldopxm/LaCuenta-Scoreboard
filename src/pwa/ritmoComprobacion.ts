/**
 * Cada cuánto se puede preguntar si hay versión nueva.
 *
 * El navegador comprueba por su cuenta cuando le parece: en una navegación, o
 * cada 24 h. Un móvil con la app instalada y abierta días puede no enterarse
 * nunca, así que se comprueba también al volver a primer plano. Y como volver a
 * primer plano pasa muchas veces en una sobremesa —se mira el móvil, se deja, se
 * vuelve a mirar—, hace falta un mínimo entre comprobaciones para no pedir
 * `sw.js` a cada tirón de pantalla.
 *
 * Está en su propio archivo, sin tocar el DOM, para poder probarlo.
 */

/** Quince minutos: mucho menos que una partida y bastante para no machacar. */
export const MINIMO_ENTRE_COMPROBACIONES = 15 * 60 * 1000

export function tocaComprobar(
  ahora: number,
  ultima: number | null,
  minimo: number = MINIMO_ENTRE_COMPROBACIONES,
): boolean {
  // Nunca se ha comprobado: toca.
  if (ultima === null) return true

  /*
   * Reloj que va hacia atrás (cambio de hora, el móvil despertando de una
   * suspensión larga). Bloquear la comprobación hasta que el reloj recupere
   * dejaría la app sin actualizar horas, así que se deja pasar.
   */
  if (ahora < ultima) return true

  return ahora - ultima >= minimo
}
