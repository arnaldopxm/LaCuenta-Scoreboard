/**
 * Pequeño bus entre el registro del service worker (que corre fuera de React,
 * al cargar la página) y el componente que enseña el aviso.
 *
 * Guarda la última actualización pendiente para que el aviso aparezca aunque el
 * worker termine de instalarse antes de que React haya montado nada.
 */

type Aplicar = () => void

let pendiente: Aplicar | null = null
const suscriptores = new Set<(aplicar: Aplicar) => void>()

/** Lo llama el registro del service worker cuando hay una versión esperando. */
export function anunciarActualizacion(aplicar: Aplicar): void {
  pendiente = aplicar
  for (const suscriptor of suscriptores) suscriptor(aplicar)
}

/** Lo usa el componente de aviso. Devuelve la función para desuscribirse. */
export function alHaberActualizacion(suscriptor: (aplicar: Aplicar) => void): () => void {
  suscriptores.add(suscriptor)
  if (pendiente) suscriptor(pendiente)
  return () => {
    suscriptores.delete(suscriptor)
  }
}
