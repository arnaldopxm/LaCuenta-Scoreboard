/**
 * Verificación del flujo de actualización, con dos versiones de verdad.
 *
 * Es lo que no se podía comprobar de ninguna otra forma: hace falta una versión
 * instalada, otra publicada después, y un navegador real que note el cambio. Los
 * tests unitarios cubren el ritmo de comprobación y el bus del aviso; esto cubre
 * el viaje entero.
 *
 * Cómo se fabrica la segunda versión: se copia `dist/` dos veces y en la copia B
 * se cambia el `VERSION` del worker y un texto del bundle. Un `sw.js` distinto
 * byte a byte es exactamente lo que hace que el navegador vea un worker nuevo,
 * que es lo que pasa en un despliegue real.
 *
 *   node scripts/verificar-actualizacion.mjs
 */
import { createReadStream, existsSync } from 'node:fs'
import { cp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, join, normalize, resolve } from 'node:path'
import { chromium } from 'playwright'

const DIST = resolve('dist')
const TRABAJO = resolve('.tmp-actualizacion')
const A = join(TRABAJO, 'a')
const B = join(TRABAJO, 'b')
const PUERTO = 4179

/** El cambio visible que distingue la versión B de la A en la pantalla. */
const TEXTO_ORIGINAL = 'Marcador de partidas'
const TEXTO_NUEVO = 'Marcador de otra versión'

if (!existsSync(join(DIST, 'sw.js'))) {
  console.error('Falta dist/sw.js. Haz `npm run build` antes.')
  process.exit(1)
}

await rm(TRABAJO, { recursive: true, force: true })
await cp(DIST, A, { recursive: true })
await cp(DIST, B, { recursive: true })

// Versión nueva del worker: basta con que el archivo cambie.
const swB = join(B, 'sw.js')
const fuenteSw = await readFile(swB, 'utf8')
const versionA = fuenteSw.match(/VERSION = "([0-9a-f]+)"/)?.[1]
if (!versionA) {
  console.error('No se encuentra la VERSION dentro de dist/sw.js.')
  process.exit(1)
}
const versionB = `${versionA.slice(0, -2)}00`
await writeFile(swB, fuenteSw.replace(versionA, versionB), 'utf8')

// Y un texto distinto en el bundle, para ver a simple vista cuál se está sirviendo.
const assets = join(B, 'assets')
const bundle = (await readdir(assets)).find((n) => n.startsWith('index-') && n.endsWith('.js'))
const rutaBundle = join(assets, bundle)
const fuenteBundle = await readFile(rutaBundle, 'utf8')
if (!fuenteBundle.includes(TEXTO_ORIGINAL)) {
  console.error(`No se encuentra "${TEXTO_ORIGINAL}" en el bundle: revisa la pantalla de inicio.`)
  process.exit(1)
}
await writeFile(rutaBundle, fuenteBundle.replace(TEXTO_ORIGINAL, TEXTO_NUEVO), 'utf8')

let raiz = A

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
}

const servidor = createServer(async (peticion, respuesta) => {
  const ruta = decodeURIComponent((peticion.url ?? '/').split('?')[0])
  const relativa = normalize(ruta === '/' ? '/index.html' : ruta).replace(/^(\.\.[/\\])+/, '')
  const archivo = join(raiz, relativa)
  try {
    const info = await stat(archivo)
    if (!info.isFile()) throw new Error('no es archivo')
    respuesta.writeHead(200, {
      'Content-Type': TIPOS[extname(archivo)] ?? 'application/octet-stream',
      'Cache-Control': 'no-cache',
    })
    createReadStream(archivo).pipe(respuesta)
  } catch {
    respuesta.writeHead(404).end('no encontrado')
  }
})

await new Promise((listo) => servidor.listen(PUERTO, listo))
const BASE = `http://localhost:${PUERTO}/`
console.log(`\nSirviendo la versión A en ${BASE}`)

/** Igual que en la verificación offline: se acepta un Chromium ya instalado. */
async function abrirNavegador() {
  if (process.env.CHROMIUM_BIN) {
    return chromium.launch({ executablePath: process.env.CHROMIUM_BIN })
  }
  try {
    return await chromium.launch()
  } catch (error) {
    const preinstalado = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
    if (!existsSync(preinstalado)) throw error
    return chromium.launch({ executablePath: preinstalado })
  }
}

const navegador = await abrirNavegador()
const contexto = await navegador.newContext({
  viewport: { width: 390, height: 844 },
  locale: 'es-ES',
})
const pagina = await contexto.newPage()

const errores = []
pagina.on('pageerror', (error) => errores.push(String(error)))
pagina.on('console', (mensaje) => {
  if (mensaje.type() === 'error') errores.push(mensaje.text())
})

const comprobaciones = []
function comprobar(nombre, ok, detalle = '') {
  comprobaciones.push({ nombre, ok })
  console.log(`${ok ? '  OK  ' : ' FALLA'}  ${nombre}${detalle ? ` — ${detalle}` : ''}`)
}

async function versionPintada() {
  const cuerpo = await pagina.textContent('body')
  return cuerpo.match(/Versión\s+([0-9a-f]+)/)?.[1] ?? null
}

const aviso = pagina.getByText('Hay una versión nueva del marcador.')

console.log('\n· Versión A instalada\n')
await pagina.goto(BASE, { waitUntil: 'load' })
await pagina.waitForFunction(() => navigator.serviceWorker.controller !== null, { timeout: 15000 })
await pagina.waitForSelector('text=Versión', { timeout: 15000 })
comprobar(
  'La versión se enseña ya en la primera carga',
  (await versionPintada()) === versionA,
  `${await versionPintada()} · esperada ${versionA}`,
)
comprobar('Sin nada nuevo publicado no hay aviso', !(await aviso.isVisible()))

console.log('\n· Se publica la versión B\n')
raiz = B
await pagina.evaluate(async () => {
  const registro = await navigator.serviceWorker.getRegistration()
  await registro.update()
})
await aviso.waitFor({ state: 'visible', timeout: 15000 })
comprobar('El aviso sale cuando hay versión nueva esperando', true)
comprobar('Nada se recarga por su cuenta: sigue corriendo la A', (await versionPintada()) === versionA)

console.log('\n· Con el formulario a medias el aviso se calla\n')
await pagina.getByRole('button', { name: 'Nueva partida' }).click()
await pagina.waitForSelector('text=¿Cuántos sois?')
comprobar('Recién abierto, sin tocar nada, el aviso sigue visible', await aviso.isVisible())

await pagina.getByLabel('Nombre del jugador 1').fill('Arnaldo')
await aviso.waitFor({ state: 'hidden', timeout: 5000 })
comprobar('Al teclear un nombre el aviso desaparece', true)

await pagina.getByRole('button', { name: 'Empezar' }).click()
await pagina.waitForSelector('text=Ronda 1')
await aviso.waitFor({ state: 'visible', timeout: 5000 })
comprobar('Creada la partida, el aviso vuelve', true)

/*
 * El aviso está fijo abajo, justo donde el pie de las pantallas ancla la acción
 * primaria. Tapaba el botón, y quien tuviera una actualización esperando no podía
 * pulsarlo sin descartar el aviso primero. Se mira a mano con `elementFromPoint`
 * en vez de fiarse de que el click de abajo falle: así el fallo dice qué pasa.
 */
const pieDestapado = await pagina.evaluate(() => {
  const boton = [...document.querySelectorAll('button')].find(
    (candidato) => candidato.textContent?.trim() === 'Cerrar ronda',
  )
  if (!boton) return false
  const caja = boton.getBoundingClientRect()
  const encima = document.elementFromPoint(caja.left + caja.width / 2, caja.top + caja.height / 2)
  return encima !== null && boton.contains(encima)
})
comprobar('Con el aviso a la vista, el botón del pie no queda tapado', pieDestapado)

console.log('\n· Y con un borrador de ronda, igual\n')
await pagina.getByRole('button', { name: 'Cerrar ronda' }).click()
await pagina.waitForSelector('text=¿Quién pidió la cuenta?')
comprobar('El borrador vacío no silencia nada', await aviso.isVisible())

await pagina.getByLabel('Total de las cartas').fill('137')
await aviso.waitFor({ state: 'hidden', timeout: 5000 })
comprobar('Con el total tecleado, el aviso se calla', true)

await pagina.getByLabel('Quién pidió la cuenta').getByRole('radio', { name: 'Arnaldo' }).click()
await pagina.getByRole('button', { name: 'Confirmar ronda' }).click()
await pagina.waitForSelector('text=Ronda 2')
await aviso.waitFor({ state: 'visible', timeout: 5000 })
comprobar('Confirmada la ronda, el aviso vuelve sin haberse perdido', true)

console.log('\n· El usuario acepta\n')
await pagina.getByRole('button', { name: 'Actualizar' }).click()
await pagina.waitForSelector('text=Versión', { timeout: 15000 })
comprobar('Tras aceptar corre la versión B', (await versionPintada()) === versionB, `${versionA} → ${versionB}`)

const cuerpoFinal = await pagina.textContent('body')
comprobar('Lo que se sirve es el bundle nuevo', cuerpoFinal.includes(TEXTO_NUEVO))
comprobar('El aviso ya no está', !(await aviso.isVisible()))
comprobar('La partida sobrevive a la actualización', cuerpoFinal.includes('Continuar partida'))

const cachesVivas = await pagina.evaluate(() => caches.keys())
comprobar('Solo queda la caché de la versión nueva', cachesVivas.length === 1, cachesVivas.join(', '))

console.log('\n· En modo avión\n')
await contexto.setOffline(true)
await pagina.reload({ waitUntil: 'load' })
await pagina.waitForSelector('text=Continuar partida', { timeout: 15000 })
comprobar('La versión nueva arranca sin red', true)

const erroresReales = errores.filter((e) => !e.includes('Failed to load resource'))
comprobar('Sin errores de JavaScript', erroresReales.length === 0, erroresReales.join(' | '))

await navegador.close()
servidor.close()
await rm(TRABAJO, { recursive: true, force: true })

const fallos = comprobaciones.filter((c) => !c.ok)
console.log(`\n${comprobaciones.length - fallos.length}/${comprobaciones.length} comprobaciones\n`)
process.exit(fallos.length === 0 ? 0 : 1)
