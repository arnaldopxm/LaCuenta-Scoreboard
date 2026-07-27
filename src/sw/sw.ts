/**
 * Service worker de La Cuenta. Escrito a mano, sin Workbox.
 *
 * La app es pequeña y no habla con ningún servidor, así que la estrategia
 * correcta es la más simple que existe: precachear el shell entero en la
 * instalación y servirlo siempre desde caché. En modo avión funciona igual que
 * conectado, incluido el primer arranque después de instalar.
 *
 * Los dos marcadores se sustituyen en tiempo de build por `plugin-sw.ts`. Si
 * ves los literales tal cual en dist/sw.js, el build no ha pasado por ahí.
 *
 * Se comprueba con su propio tsconfig (`tsconfig.sw.json`), con la librería
 * WebWorker en vez de DOM.
 */

declare const __PRECACHE__: string[]

/** `self` en un worker es WorkerGlobalScope a secas; aquí sabemos que es más. */
const trabajador = self as unknown as ServiceWorkerGlobalScope

const VERSION = '__VERSION__'
const RECURSOS: string[] = __PRECACHE__
const CACHE = `la-cuenta-${VERSION}`

/** Mensaje que manda la app cuando el usuario acepta actualizar. */
const SALTAR_ESPERA = 'la-cuenta:saltar-espera'

trabajador.addEventListener('install', (evento) => {
  evento.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE)
      // `reload` evita que la caché HTTP del navegador cuele una versión vieja.
      await cache.addAll(RECURSOS.map((url) => new Request(url, { cache: 'reload' })))
      // Ojo: no se llama a skipWaiting(). El worker nuevo espera a que el
      // usuario acepte, para no recargar la app a mitad de una ronda.
    })(),
  )
})

trabajador.addEventListener('activate', (evento) => {
  evento.waitUntil(
    (async () => {
      const nombres = await caches.keys()
      await Promise.all(
        nombres
          .filter((nombre) => nombre.startsWith('la-cuenta-') && nombre !== CACHE)
          .map((nombre) => caches.delete(nombre)),
      )
      await trabajador.clients.claim()
    })(),
  )
})

trabajador.addEventListener('message', (evento) => {
  if (evento.data === SALTAR_ESPERA) void trabajador.skipWaiting()
})

trabajador.addEventListener('fetch', (evento) => {
  const peticion = evento.request

  // Solo lecturas del propio origen. No hay nada más que pedir: la app no
  // habla con ningún tercero y así se queda.
  if (peticion.method !== 'GET') return
  if (new URL(peticion.url).origin !== trabajador.location.origin) return

  // Navegaciones: siempre el shell desde caché. Es lo que hace que arranque
  // sin red aunque el usuario abra la app por primera vez tras instalarla.
  if (peticion.mode === 'navigate') {
    evento.respondWith(servirShell())
    return
  }

  evento.respondWith(cachePrimero(peticion))
})

async function servirShell(): Promise<Response> {
  const cache = await caches.open(CACHE)
  const shell = await cache.match('index.html')
  if (shell) return shell
  try {
    return await fetch('index.html')
  } catch {
    return new Response('<h1>La Cuenta no está disponible sin conexión.</h1>', {
      status: 503,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }
}

async function cachePrimero(peticion: Request): Promise<Response> {
  const cache = await caches.open(CACHE)
  const guardado = await cache.match(peticion, { ignoreSearch: true })
  if (guardado) return guardado

  try {
    const respuesta = await fetch(peticion)
    // Se guarda lo que venga bien del propio origen, por si el precache se
    // quedó corto con algún trozo cargado en diferido.
    if (respuesta.ok && respuesta.type === 'basic') {
      void cache.put(peticion, respuesta.clone())
    }
    return respuesta
  } catch {
    return new Response('', { status: 504, statusText: 'Sin conexión' })
  }
}
