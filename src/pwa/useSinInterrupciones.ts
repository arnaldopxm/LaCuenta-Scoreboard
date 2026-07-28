import { useEffect } from 'react'
import { reservarSinInterrupciones } from './estadoActualizacion.ts'

/**
 * Mientras `activo` sea true, el aviso de actualización no sale.
 *
 * Lo usan las pantallas con un formulario a medias: aceptar la actualización
 * recarga la página y lo tecleado no está persistido. Callarse es más simple que
 * persistir borradores y no hace falta explicar nada al usuario.
 */
export function useSinInterrupciones(activo: boolean): void {
  useEffect(() => {
    if (!activo) return
    return reservarSinInterrupciones()
  }, [activo])
}
