/**
 * Por dónde se instala la app, que no es lo mismo en cada plataforma.
 *
 * Son tres caminos y no dos porque el navegador manda más que el sistema:
 *
 *   - `directa`: hay un `beforeinstallprompt` guardado, así que existe un botón
 *     de verdad que abre el diálogo del navegador. Es Chromium (Android y
 *     escritorio) con la PWA cumpliendo los criterios de instalabilidad.
 *   - `ios`: **no hay API**. `beforeinstallprompt` no existe en Safari y el
 *     diálogo no se puede provocar. Lo único posible es explicar el gesto.
 *   - `manual`: cualquier otro caso —Firefox, un Chromium que aún no ha
 *     disparado el evento, escritorio sin soporte—. Se explica dónde mirar en el
 *     menú y punto.
 *
 * La decisión está aquí, sin tocar el DOM, para poder probarla.
 */

export type Camino = 'directa' | 'ios' | 'manual'

export function caminoDeInstalacion(senales: { tienePrompt: boolean; esIOS: boolean }): Camino {
  // El prompt manda: si el navegador nos deja instalar de verdad, se instala de
  // verdad. Un iPad con Chromium instalable entra por aquí, y hace bien.
  if (senales.tienePrompt) return 'directa'
  return senales.esIOS ? 'ios' : 'manual'
}

/**
 * ¿Esto es un iOS/iPadOS? Se pregunta para saber qué gesto explicar, no para
 * cambiar comportamiento, así que equivocarse cuesta una instrucción de más y no
 * una función rota.
 */
export function pareceIOS(senales: {
  ua: string
  maxTouchPoints: number
  standaloneDefinido: boolean
}): boolean {
  if (/iPhone|iPad|iPod/i.test(senales.ua)) return true

  // iPadOS miente y se anuncia como un Mac de escritorio. Se le pilla por el
  // táctil: un Mac de verdad no tiene puntos de contacto.
  if (/Macintosh/i.test(senales.ua) && senales.maxTouchPoints > 1) return true

  // `navigator.standalone` solo lo define Safari de iOS. Va al final porque es
  // la señal más indirecta de las tres.
  return senales.standaloneDefinido
}

/**
 * ¿Ya está instalada? Si lo está, no se ofrece instalar: es la diferencia entre
 * un acceso discreto y una app que insiste.
 *
 * `display-mode: standalone` cubre Android y el escritorio. iOS no lo implementa
 * de forma fiable en todas las versiones, y para eso está `navigator.standalone`.
 */
export function estaInstalada(senales: { enModoApp: boolean; standaloneIOS: boolean }): boolean {
  return senales.enModoApp || senales.standaloneIOS
}
