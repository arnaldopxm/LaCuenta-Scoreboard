/**
 * Registro del service worker y control de actualizaciones.
 *
 * La regla es que la app NUNCA se recarga sola. Cuando hay una versión nueva
 * esperando, se avisa y se recarga solo si el usuario acepta: recargar a mitad
 * de teclear una cuenta sería perder el trabajo de la ronda.
 */

import { anunciarActualizacion } from './estadoActualizacion.ts'

const SALTAR_ESPERA = 'la-cuenta:saltar-espera'

export function registrarServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return

  window.addEventListener('load', () => {
    void (async () => {
      try {
        const registro = await navigator.serviceWorker.register('sw.js', { scope: './' })

        // Ya había uno esperando de una visita anterior.
        if (registro.waiting && navigator.serviceWorker.controller) {
          anunciarActualizacion(() => activar(registro.waiting))
        }

        registro.addEventListener('updatefound', () => {
          const entrante = registro.installing
          if (!entrante) return

          entrante.addEventListener('statechange', () => {
            // Sin controlador es la primera instalación, no una actualización:
            // ahí no hay nada que avisar.
            if (entrante.state === 'installed' && navigator.serviceWorker.controller) {
              anunciarActualizacion(() => activar(entrante))
            }
          })
        })
      } catch {
        // Sin service worker la app sigue funcionando, solo que sin offline.
      }
    })()
  })

  /*
   * Solo se recarga si el usuario ha pedido actualizar.
   *
   * En la primera instalación, `clients.claim()` también dispara
   * `controllerchange`, y recargar ahí sería exactamente el fogonazo bajo los
   * pies que se quiere evitar.
   */
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!actualizacionPedida || recargando) return
    recargando = true
    window.location.reload()
  })
}

let actualizacionPedida = false
let recargando = false

function activar(worker: ServiceWorker | null) {
  if (!worker) return
  actualizacionPedida = true
  worker.postMessage(SALTAR_ESPERA)
}
