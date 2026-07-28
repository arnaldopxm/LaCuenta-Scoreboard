/**
 * Preferencia de tema, en un almacén de módulo.
 *
 * Vive en localStorage y no en IndexedDB, a propósito: no es estado de partida,
 * es una preferencia de dos bytes que hay que poder leer de forma síncrona antes
 * del primer pintado para no soltar un fogonazo blanco en una terraza de noche.
 * Eso lo hace el script en línea de `index.html`; esto de aquí solo la mantiene.
 *
 * Está fuera de React —como el bus del aviso de actualización— porque el botón
 * de tema se pinta en todas las pantallas: si cada uno tuviera su propio
 * `useState`, cambiarlo en una no se enteraría en la siguiente. Aquí hay un solo
 * valor y todos los botones leen de él.
 */

export type Tema = 'sistema' | 'claro' | 'oscuro'

const CLAVE = 'la-cuenta:tema'

let tema: Tema = leerGuardado()

/**
 * Se lee al cargar el módulo, no en la primera suscripción: React pide el
 * snapshot durante el render y antes de suscribirse, y con el valor a medias el
 * icono saldría al revés durante un fotograma.
 */
let sistemaOscuro = preguntarAlSistema()

const suscriptores = new Set<() => void>()
let escuchandoAlSistema = false

/** El tema que se está pintando de verdad, resolviendo ya "sistema". */
export function esOscuro(): boolean {
  return tema === 'sistema' ? sistemaOscuro : tema === 'oscuro'
}

/** Del claro al oscuro y al revés. Deja de seguir al sistema, que es lo pedido. */
export function alternarTema(): void {
  tema = esOscuro() ? 'claro' : 'oscuro'
  aplicar()
  for (const suscriptor of suscriptores) suscriptor()
}

export function suscribirseAlTema(suscriptor: () => void): () => void {
  escucharAlSistema()
  suscriptores.add(suscriptor)
  return () => {
    suscriptores.delete(suscriptor)
  }
}

function aplicar(): void {
  const raiz = document.documentElement
  if (tema === 'sistema') {
    raiz.removeAttribute('data-tema')
  } else {
    raiz.setAttribute('data-tema', tema)
  }

  // La barra de estado del móvil tiene que ir a juego con el fondo real.
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', esOscuro() ? '#14110F' : '#E8933A')

  try {
    localStorage.setItem(CLAVE, tema)
  } catch {
    // Modo privado sin almacenamiento: el tema simplemente no se recuerda.
  }
}

/**
 * La preferencia del sistema puede cambiar con la app abierta. El oyente se pone
 * una vez y no se quita: es uno, la app vive en una sola pestaña, y quitarlo y
 * ponerlo en cada navegación no gana nada.
 */
function escucharAlSistema(): void {
  if (escuchandoAlSistema || typeof window === 'undefined') return
  escuchandoAlSistema = true

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (evento) => {
    sistemaOscuro = evento.matches
    if (tema === 'sistema') aplicar()
    for (const suscriptor of suscriptores) suscriptor()
  })
}

function leerGuardado(): Tema {
  try {
    const guardado = localStorage.getItem(CLAVE)
    if (guardado === 'claro' || guardado === 'oscuro' || guardado === 'sistema') return guardado
  } catch {
    // Sin acceso a localStorage se sigue al sistema y punto.
  }
  return 'sistema'
}

function preguntarAlSistema(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}
