/**
 * Estado de instalación de la PWA, en un almacén de módulo.
 *
 * Fuera de React porque el evento que lo hace todo posible,
 * `beforeinstallprompt`, lo dispara el navegador cuando quiere —normalmente
 * antes de que React haya montado nada— y si no se captura, se pierde. Igual que
 * el bus del aviso de actualización.
 *
 * El evento se guarda y **no** se usa solo: `preventDefault()` calla la barrita
 * que Chrome saca por su cuenta, y el diálogo se abre cuando el usuario lo pide.
 * El encargo pedía "sin prompt de instalación intrusivo. Un acceso discreto".
 */

import { caminoDeInstalacion, estaInstalada, pareceIOS, type Camino } from './caminoInstalacion.ts'

/**
 * `beforeinstallprompt` no está en la librería estándar de TypeScript: es de
 * Chromium y no está estandarizado. Solo se declara lo que se usa.
 */
interface EventoInstalacion extends Event {
  prompt: () => Promise<void>
}

let guardado: EventoInstalacion | null = null
let instalada = false
let vigilando = false
const suscriptores = new Set<() => void>()

function notificar(): void {
  for (const suscriptor of suscriptores) suscriptor()
}

/**
 * Se llama al arrancar, antes de pintar: el evento puede llegar en el primer
 * segundo de vida de la página.
 */
export function vigilarInstalacion(): void {
  if (vigilando || typeof window === 'undefined') return
  vigilando = true

  instalada = mirarSiEstaInstalada()

  window.addEventListener('beforeinstallprompt', (evento) => {
    // Sin esto, Chrome saca su propia barrita de instalación.
    evento.preventDefault()
    guardado = evento as EventoInstalacion
    notificar()
  })

  // Instalada desde el diálogo del navegador: el acceso desaparece en el momento.
  window.addEventListener('appinstalled', () => {
    guardado = null
    instalada = true
    notificar()
  })

  /*
   * En iOS se sale de la app instalada y se vuelve al navegador sin recargar, así
   * que el modo se vuelve a mirar al volver a primer plano.
   */
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return
    const ahora = mirarSiEstaInstalada()
    if (ahora === instalada) return
    instalada = ahora
    notificar()
  })
}

/** Instantánea para React. Es un objeto, así que se memoiza para no repintar. */
export function estadoInstalacion(): { instalada: boolean; camino: Camino } {
  const camino = caminoDeInstalacion({ tienePrompt: guardado !== null, esIOS: esteEsIOS() })
  if (!ultima || ultima.instalada !== instalada || ultima.camino !== camino) {
    ultima = { instalada, camino }
  }
  return ultima
}

let ultima: { instalada: boolean; camino: Camino } | null = null

export function suscribirseALaInstalacion(suscriptor: () => void): () => void {
  suscriptores.add(suscriptor)
  return () => {
    suscriptores.delete(suscriptor)
  }
}

/**
 * Abre el diálogo del navegador. Solo tiene sentido en el camino `directa`.
 *
 * El evento guardado **se gasta**: una vez usado ya no vale, así que se suelta
 * pase lo que pase. Si el usuario dice que no, el navegador volverá a dispararlo
 * cuando le parezca.
 */
export async function pedirInstalacion(): Promise<void> {
  const evento = guardado
  if (!evento) return

  guardado = null
  notificar()

  try {
    await evento.prompt()
  } catch {
    // El navegador puede negarse (ya instalada, o el gesto no le vale). No hay
    // nada que hacer: quedan las instrucciones a mano.
  }
}

function mirarSiEstaInstalada(): boolean {
  return estaInstalada({
    enModoApp: window.matchMedia('(display-mode: standalone)').matches,
    standaloneIOS: (navigator as Navigator & { standalone?: boolean }).standalone === true,
  })
}

function esteEsIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  return pareceIOS({
    ua: navigator.userAgent,
    maxTouchPoints: navigator.maxTouchPoints ?? 0,
    standaloneDefinido:
      (navigator as Navigator & { standalone?: boolean }).standalone !== undefined,
  })
}
