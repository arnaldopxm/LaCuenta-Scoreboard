/**
 * Registro del service worker y control de actualizaciones.
 *
 * La regla es que la app NUNCA se recarga sola. Cuando hay una versión nueva
 * esperando, se avisa y se recarga solo si el usuario acepta: recargar a mitad
 * de teclear una cuenta sería perder el trabajo de la ronda.
 */

import { anunciarActualizacion } from './estadoActualizacion.ts'
import { tocaComprobar } from './ritmoComprobacion.ts'

const SALTAR_ESPERA = 'la-cuenta:saltar-espera'
const PEDIR_VERSION = 'la-cuenta:version'

/**
 * Lo que se espera a que el worker conteste la versión. Un worker de un build
 * anterior a esto no entiende el mensaje y no va a contestar nunca, así que sin
 * plazo la promesa se quedaría colgada para siempre.
 */
const ESPERA_VERSION = 2000

/**
 * Lo que se espera a que haya un worker al mando. En la primera visita la app
 * arranca sin controlador: el worker se instala, precachea el shell entero y
 * reclama los clientes un rato después. Sin esta espera la versión no saldría
 * hasta la siguiente carga.
 */
const ESPERA_CONTROLADOR = 10_000

export function registrarServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return

  window.addEventListener('load', () => {
    void (async () => {
      try {
        const registro = await navigator.serviceWorker.register('sw.js', { scope: './' })
        // `register()` ya trae una comprobación consigo: cuenta como la primera.
        ultimaComprobacion = Date.now()

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

        comprobarAlVolverAPrimerPlano(registro)
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

/**
 * Pregunta al worker que sirve la app qué versión es. Devuelve `null` si no hay
 * ninguno —en desarrollo no se registra— o si el que hay es de un build anterior
 * a este mensaje y no sabe contestar.
 *
 * Se enseña en el inicio: "¿qué versión tienes?" es la primera pregunta cuando
 * algo falla en una terraza, y sin esto no hay forma de responderla.
 */
export async function versionEnUso(): Promise<string | null> {
  if (!('serviceWorker' in navigator)) return null

  const controlador = await esperarControlador()
  if (!controlador) return null

  return await new Promise<string | null>((resolver) => {
    const canal = new MessageChannel()

    const cerrar = (version: string | null) => {
      clearTimeout(plazo)
      canal.port1.close()
      resolver(version)
    }

    const plazo = setTimeout(() => cerrar(null), ESPERA_VERSION)

    canal.port1.onmessage = (evento: MessageEvent) => {
      const version: unknown = evento.data?.version
      cerrar(typeof version === 'string' && version.length > 0 ? version : null)
    }

    controlador.postMessage(PEDIR_VERSION, [canal.port2])
  })
}

let actualizacionPedida = false
let recargando = false
let ultimaComprobacion: number | null = null

/** El worker que sirve la app, esperando si acaba de instalarse. */
function esperarControlador(): Promise<ServiceWorker | null> {
  const { serviceWorker } = navigator
  if (serviceWorker.controller) return Promise.resolve(serviceWorker.controller)

  return new Promise<ServiceWorker | null>((resolver) => {
    const alCambiar = () => {
      limpiar()
      resolver(serviceWorker.controller)
    }
    const limpiar = () => {
      clearTimeout(plazo)
      serviceWorker.removeEventListener('controllerchange', alCambiar)
    }

    const plazo = setTimeout(() => {
      limpiar()
      resolver(null)
    }, ESPERA_CONTROLADOR)

    serviceWorker.addEventListener('controllerchange', alCambiar)
  })
}

function activar(worker: ServiceWorker | null) {
  if (!worker) return
  actualizacionPedida = true
  worker.postMessage(SALTAR_ESPERA)
}

/**
 * Comprobación activa de versión nueva. Sin esto se depende de cuándo lo mire el
 * navegador por su cuenta, que en una app instalada y nunca cerrada puede ser
 * días. Ver `ritmoComprobacion.ts` para el mínimo entre comprobaciones.
 */
function comprobarAlVolverAPrimerPlano(registro: ServiceWorkerRegistration): void {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return

    const ahora = Date.now()
    if (!tocaComprobar(ahora, ultimaComprobacion)) return
    ultimaComprobacion = ahora

    // Sin red `update()` rechaza, y es el caso normal en el bar. No es un fallo
    // del que haya que enterarse: se comprueba otra vez a la siguiente.
    void registro.update().catch(() => undefined)
  })
}
