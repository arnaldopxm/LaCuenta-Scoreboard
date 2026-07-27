import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Navegación por pila, sincronizada con el historial del navegador.
 *
 * No hay router ni URLs: son siete pantallas y la app se instala, así que no
 * tiene sentido que cada una tenga dirección propia. Pero el botón físico de
 * atrás de Android y el gesto de deslizar de iOS SÍ tienen que funcionar, y
 * para eso basta con empujar una entrada de historial por pantalla.
 *
 * La profundidad viaja dentro del `state` de cada entrada. Así, al volver, se
 * sabe a qué altura de la pila hay que recortar en vez de ir quitando de una en
 * una a ciegas: si el usuario mantiene pulsado el atrás y salta tres pantallas
 * de golpe, la pila queda igual de bien.
 */

const CLAVE = 'profundidadLaCuenta'

export function useNavegacion<V>(inicial: V) {
  const [pila, setPilaEstado] = useState<V[]>([inicial])

  // Espejo de la pila para que las funciones no dependan del render actual.
  const pilaRef = useRef<V[]>([inicial])
  const fijar = useCallback((siguiente: V[]) => {
    pilaRef.current = siguiente
    setPilaEstado(siguiente)
  }, [])

  useEffect(() => {
    // La entrada con la que se abre la app es la profundidad 0.
    window.history.replaceState({ ...window.history.state, [CLAVE]: 0 }, '')

    const alVolver = (evento: PopStateEvent) => {
      const profundidad: number = evento.state?.[CLAVE] ?? 0
      const recortada = pilaRef.current.slice(0, profundidad + 1)
      if (recortada.length !== pilaRef.current.length) fijar(recortada)
    }

    window.addEventListener('popstate', alVolver)
    return () => window.removeEventListener('popstate', alVolver)
  }, [fijar])

  /** Entra en una pantalla nueva. Suma una entrada al historial. */
  const ir = useCallback(
    (vista: V) => {
      window.history.pushState({ [CLAVE]: pilaRef.current.length }, '')
      fijar([...pilaRef.current, vista])
    },
    [fijar],
  )

  /**
   * Cambia la pantalla actual sin dejar rastro.
   * Para pasos que no tiene sentido revisitar, como el formulario de partida
   * nueva una vez creada.
   */
  const reemplazar = useCallback(
    (vista: V) => {
      fijar([...pilaRef.current.slice(0, -1), vista])
    },
    [fijar],
  )

  /**
   * Vuelve a la pantalla anterior delegando en el historial, para que el botón
   * de la cabecera y el del móvil hagan exactamente lo mismo.
   */
  const volver = useCallback(() => {
    if (pilaRef.current.length > 1) window.history.back()
  }, [])

  /** Deshace toda la pila y deja una pantalla sola en la base. */
  const reiniciar = useCallback(
    (vista: V) => {
      const saltos = pilaRef.current.length - 1
      fijar([vista])
      if (saltos > 0) window.history.go(-saltos)
    },
    [fijar],
  )

  return {
    vista: pila[pila.length - 1]!,
    profundidad: pila.length,
    ir,
    volver,
    reemplazar,
    reiniciar,
  }
}
