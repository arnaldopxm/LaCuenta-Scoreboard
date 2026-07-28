import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { actualizacionPendiente, suscribirseAlAviso } from '../pwa/estadoActualizacion.ts'
import { Boton } from './Boton.tsx'
import estilos from './AvisoActualizacion.module.css'

/**
 * Alto real del aviso, publicado como variable CSS en el `body`.
 *
 * El aviso está fijo abajo y el pie de las pantallas está pegado abajo también,
 * así que sin esto el aviso tapaba el botón de acción primaria: *Confirmar
 * ronda*, *Empezar*, *Cerrar ronda*. Quien tuviera una actualización esperando
 * tenía que descartar el aviso para poder pulsar.
 *
 * Se mide en vez de reservar un hueco a ojo porque el aviso cambia de alto: el
 * texto envuelve distinto según el ancho, y las tipografías del sistema no miden
 * lo mismo en todos los móviles.
 */
const VARIABLE_ALTO = '--alto-aviso'

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
  const [nodo, setNodo] = useState<HTMLDivElement | null>(null)

  const visible = Boolean(aplicar) && !descartado

  useEffect(() => {
    if (!nodo) return

    const publicarAlto = () => {
      document.body.style.setProperty(VARIABLE_ALTO, `${nodo.offsetHeight}px`)
    }

    publicarAlto()
    const observador = new ResizeObserver(publicarAlto)
    observador.observe(nodo)

    return () => {
      observador.disconnect()
      // Al irse el aviso, el pie recupera su sitio.
      document.body.style.removeProperty(VARIABLE_ALTO)
    }
  }, [nodo])

  // La referencia va en el estado, no en un `ref`: hace falta que el efecto se
  // vuelva a ejecutar cuando el nodo aparece o desaparece.
  const referencia = useCallback((elemento: HTMLDivElement | null) => setNodo(elemento), [])

  if (!visible) return null

  return (
    <div className={estilos.aviso} role="status" ref={referencia}>
      <span className={estilos.texto}>Hay una versión nueva del marcador.</span>
      <div className={estilos.botones}>
        {/*
          El aviso es una pizarra oscura en los dos temas, así que sus botones no
          pueden depender del tema:

            - "Ahora no" era `fantasma`, que pinta el texto con `--tinta`. En modo
              claro eso es tinta oscura sobre negro: no se leía nada.
            - "Actualizar" era `secundario`, cuyo fondo es `--superficie`. En modo
              oscuro eso es casi el color del aviso y la acción se perdía.

          `pizarra` y `primario` usan colores que no cambian con el tema. El
          tamaño del primario lo baja el CSS de aquí: esto es una tira, no una
          pantalla.
        */}
        <Boton variante="pizarra" onClick={() => setDescartado(true)}>
          Ahora no
        </Boton>
        <Boton variante="primario" onClick={aplicar ?? undefined}>
          Actualizar
        </Boton>
      </div>
    </div>
  )
}
