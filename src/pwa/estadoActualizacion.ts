/**
 * Pequeño bus entre el registro del service worker (que corre fuera de React,
 * al cargar la página) y el componente que enseña el aviso.
 *
 * Guarda dos cosas:
 *
 *   1. La última actualización pendiente, para que el aviso aparezca aunque el
 *      worker termine de instalarse antes de que React haya montado nada.
 *   2. Cuántas pantallas tienen trabajo a medias. Aceptar la actualización
 *      recarga la página, y el borrador de una ronda —total, propina, cartas del
 *      sumador— es estado de React sin persistir: se perdería. Mientras haya
 *      algo escrito el aviso se calla, y vuelve solo en cuanto la pantalla se
 *      cierra o se confirma. Nada se pierde por esperar: el worker nuevo sigue
 *      esperando su turno indefinidamente.
 */

type Aplicar = () => void

let pendiente: Aplicar | null = null
let reservas = 0
const suscriptores = new Set<() => void>()

function notificar(): void {
  for (const suscriptor of suscriptores) suscriptor()
}

/** Lo llama el registro del service worker cuando hay una versión esperando. */
export function anunciarActualizacion(aplicar: Aplicar): void {
  pendiente = aplicar
  notificar()
}

/**
 * La acción que aplica la actualización, o `null` si no hay ninguna esperando o
 * si alguien pidió no ser interrumpido. Sirve de snapshot para React.
 */
export function actualizacionPendiente(): Aplicar | null {
  return reservas > 0 ? null : pendiente
}

/**
 * Pide que no se interrumpa: mientras la reserva siga viva, el aviso no sale.
 * Devuelve la función que la libera; llamarla dos veces no hace daño.
 */
export function reservarSinInterrupciones(): () => void {
  reservas += 1
  notificar()

  let liberada = false
  return () => {
    if (liberada) return
    liberada = true
    reservas -= 1
    notificar()
  }
}

/** Suscripción para `useSyncExternalStore`. Devuelve cómo desuscribirse. */
export function suscribirseAlAviso(suscriptor: () => void): () => void {
  suscriptores.add(suscriptor)
  return () => {
    suscriptores.delete(suscriptor)
  }
}
