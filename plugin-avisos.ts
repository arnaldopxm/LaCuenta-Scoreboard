import { copyFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import type { Plugin } from 'vite'

/**
 * Copia los avisos legales a `dist/`.
 *
 * No es adorno: la SIL Open Font License exige que la licencia acompañe a los
 * archivos de fuente cuando se distribuyen, y el sitio publicado sirve los
 * `.woff2`. Dejar los avisos solo en la raíz del repositorio no cumple eso.
 *
 * Se copian desde la raíz en vez de duplicarlos en `public/` a propósito: dos
 * copias de un texto legal en el mismo repositorio acaban divergiendo, y la que
 * se publica sería justo la que nadie revisa.
 *
 * Tiene que registrarse ANTES del plugin del service worker, que recorre
 * `dist/` en `closeBundle` para armar el precache: así los avisos entran en él
 * y quedan disponibles sin conexión.
 */
export function avisosLegales(): Plugin {
  const ARCHIVOS = ['LICENSE', 'TERCEROS.md']
  let carpetaSalida = 'dist'
  let raiz = process.cwd()

  return {
    name: 'la-cuenta-avisos',
    apply: 'build',

    configResolved(config) {
      raiz = config.root
      carpetaSalida = resolve(config.root, config.build.outDir)
    },

    async closeBundle() {
      for (const archivo of ARCHIVOS) {
        // Si falta uno, el build debe fallar: publicar sin avisos es el
        // incumplimiento que este plugin existe para evitar.
        await copyFile(resolve(raiz, archivo), join(carpetaSalida, archivo))
      }
      this.info(`avisos legales copiados: ${ARCHIVOS.join(', ')}`)
    },
  }
}
