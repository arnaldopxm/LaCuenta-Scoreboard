import { createHash } from 'node:crypto'
import type { Plugin } from 'vite'

/**
 * Rellena el `script-src` de la Content Security Policy con el hash de cada
 * script en línea del HTML.
 *
 * La app tiene un script en línea imprescindible: el que aplica el tema
 * guardado ANTES del primer pintado. Sin él hay fogonazo claro al abrir la app
 * de noche; con `'unsafe-inline'` la CSP dejaría de servir para nada. El hash
 * es la única opción que cumple las dos cosas.
 *
 * Corre también en desarrollo, donde Vite y el plugin de React inyectan sus
 * propios scripts en línea: por eso se calculan todos y no uno fijo.
 */
export function politicaDeSeguridad(): Plugin {
  return {
    name: 'la-cuenta-csp',
    // Después de que todo el mundo haya inyectado lo suyo en el HTML.
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        const hashes = new Set<string>()
        const scripts = html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/gi)

        for (const script of scripts) {
          const contenido = script[1] ?? ''
          if (contenido.trim() === '') continue
          hashes.add(`'sha256-${createHash('sha256').update(contenido, 'utf8').digest('base64')}'`)
        }

        const valor = ['\'self\'', ...hashes].join(' ')
        return html.replace('__SCRIPT_SRC__', valor)
      },
    },
  }
}
