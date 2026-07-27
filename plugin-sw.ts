import { createHash } from 'node:crypto'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join, relative, resolve } from 'node:path'
import { transformWithOxc, type Plugin } from 'vite'

/**
 * Plugin que genera `dist/sw.js` a partir de `src/sw/sw.ts`.
 *
 * Hace exactamente tres cosas:
 *   1. Recorre `dist/` y lista todo lo que hay dentro.
 *   2. Calcula una versión a partir del contenido de esos archivos.
 *   3. Transpila el service worker y sustituye los dos marcadores.
 *
 * Sustituye a Workbox, que arrastraba ocho CVEs high a través de workbox-build
 * en todas sus versiones. Para una app que precachea su shell entero y no
 * habla con ningún servidor, Workbox no aportaba nada que compense eso.
 */
export function servicioWorker(): Plugin {
  let carpetaSalida = 'dist'
  let raiz = process.cwd()

  return {
    name: 'la-cuenta-sw',
    apply: 'build',

    configResolved(config) {
      raiz = config.root
      carpetaSalida = resolve(config.root, config.build.outDir)
    },

    async closeBundle() {
      const archivos = (await listarRecursivo(carpetaSalida))
        .map((ruta) => relative(carpetaSalida, ruta).split('\\').join('/'))
        // El propio worker nunca se precachea a sí mismo.
        .filter((ruta) => ruta !== 'sw.js')
        .sort()

      const huella = createHash('sha256')
      for (const ruta of archivos) {
        huella.update(ruta)
        huella.update(await readFile(join(carpetaSalida, ruta)))
      }
      const version = huella.digest('hex').slice(0, 12)

      const fuente = await readFile(resolve(raiz, 'src/sw/sw.ts'), 'utf8')
      // Oxc es el transpilador que trae Vite 8; solo hay que quitar los tipos,
      // el worker no importa nada.
      const { code } = await transformWithOxc(fuente, 'sw.ts', { lang: 'ts', target: 'es2022' })

      const generado = code
        .replace('__PRECACHE__', JSON.stringify(archivos))
        .replace('__VERSION__', version)

      if (generado.includes('__PRECACHE__') || generado.includes('__VERSION__')) {
        throw new Error('No se pudieron sustituir los marcadores del service worker.')
      }

      await writeFile(join(carpetaSalida, 'sw.js'), generado, 'utf8')
      this.info(`sw.js generado · ${archivos.length} recursos · versión ${version}`)
    },
  }
}

async function listarRecursivo(carpeta: string): Promise<string[]> {
  const entradas = await readdir(carpeta, { withFileTypes: true })
  const rutas = await Promise.all(
    entradas.map(async (entrada) => {
      const ruta = join(carpeta, entrada.name)
      return entrada.isDirectory() ? listarRecursivo(ruta) : [ruta]
    }),
  )
  return rutas.flat()
}
