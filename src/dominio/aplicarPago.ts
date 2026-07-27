/**
 * PUNTO DE DECISIÓN AISLADO.
 *
 * Las reglas oficiales dicen que la partida acaba cuando a alguien "se le
 * acaban los ahorros", pero no aclaran qué ocurre si la cuenta supera lo que
 * ese jugador tiene encima.
 *
 * Asunción tomada aquí: se aplica un clamp a 0. No existe deuda negativa; el
 * jugador se queda a cero y eso dispara el fin de la partida.
 *
 * Esta función está sola en su archivo a propósito: si algún día se decide que
 * sí hay deuda (ahorros negativos, o que el resto cubre la diferencia), se
 * cambia solo aquí y ni el cálculo del reparto ni la derivación de estado ni la
 * detección de fin de partida se enteran.
 */
export function aplicarPago(ahorros: number, importe: number): number {
  return Math.max(0, ahorros - importe)
}

/** Un jugador está fuera cuando se queda literalmente sin nada. */
export function sinAhorros(ahorros: number): boolean {
  return ahorros <= 0
}
