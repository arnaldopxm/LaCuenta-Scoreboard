import { useState, useSyncExternalStore } from 'react'
import { actualizacionPendiente, suscribirseAlAviso } from '../pwa/estadoActualizacion.ts'
import { Boton } from './Boton.tsx'
import estilos from './AvisoActualizacion.module.css'

/**
 * Aviso discreto de versión nueva. Nunca recarga por su cuenta: la decisión es
 * del usuario, que puede estar a mitad de una ronda.
 *
 * Dos silencios, los dos a propósito:
 *
 *   - Mientras una pantalla tenga un formulario a medias, el aviso no sale (ver
 *     `estadoActualizacion.ts`). Aparece en cuanto se confirma o se sale.
 *   - Descartado con "Ahora no", no vuelve a salir en esta sesión. Reaparece al
 *     recargar, porque el worker nuevo sigue esperando su turno.
 */
export function AvisoActualizacion() {
  const aplicar = useSyncExternalStore(suscribirseAlAviso, actualizacionPendiente)
  const [descartado, setDescartado] = useState(false)

  if (!aplicar || descartado) return null

  return (
    <div className={estilos.aviso} role="status">
      <span className={estilos.texto}>Hay una versión nueva del marcador.</span>
      <div className={estilos.botones}>
        <Boton variante="fantasma" onClick={() => setDescartado(true)}>
          Ahora no
        </Boton>
        <Boton variante="secundario" onClick={aplicar}>
          Actualizar
        </Boton>
      </div>
    </div>
  )
}
