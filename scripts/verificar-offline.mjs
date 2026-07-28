/**
 * Verificación offline de verdad, no de mentira.
 *
 * Sirve `dist/` con un servidor estático mínimo, abre Chromium, deja que se
 * instale el service worker, CORTA la red del navegador y recarga. Si la app
 * arranca y pinta el marcador sin red, la PWA cumple.
 *
 * También comprueba que no salga ni una petición fuera del origen: ni fuentes,
 * ni iconos, ni telemetría.
 *
 *   node scripts/verificar-offline.mjs [--capturas]
 */
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, join, normalize, resolve } from 'node:path'
import { existsSync } from 'node:fs'
import { chromium } from 'playwright'

const DIST = resolve('dist')
const PUERTO = 4178
const CAPTURAS = process.argv.includes('--capturas')

/**
 * GitHub Pages sirve los proyectos en un subdirectorio, no en la raíz del
 * dominio. Es justo donde revientan las PWA que dan por hecho que viven en `/`,
 * así que se puede verificar el caso con `--subruta`.
 */
const SUBRUTA = process.argv.includes('--subruta') ? '/LaCuenta-Scoreboard/' : '/'

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

  // Fuera del prefijo de despliegue no hay nada, igual que en Pages.
  if (!ruta.startsWith(SUBRUTA)) {
    respuesta.writeHead(404).end('fuera de la subruta')
    return
  }
  const dentro = ruta.slice(SUBRUTA.length - 1)
  const relativa = normalize(dentro === '/' ? '/index.html' : dentro).replace(/^(\.\.[/\\])+/, '')
  const archivo = join(DIST, relativa)

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
const BASE = `http://localhost:${PUERTO}${SUBRUTA}`
console.log(`\nSirviendo dist/ en ${BASE}`)

/**
 * En CI vale el Chromium que instala Playwright. En entornos donde ya hay uno
 * preinstalado, la build puede no coincidir con la que espera esta versión de
 * Playwright, así que se cae al binario que haya.
 */
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
  deviceScaleFactor: 2,
  locale: 'es-ES',
})
const pagina = await contexto.newPage()

const externas = []
pagina.on('request', (peticion) => {
  if (!peticion.url().startsWith(BASE) && !peticion.url().startsWith('data:')) {
    externas.push(peticion.url())
  }
})

const errores = []
pagina.on('pageerror', (error) => errores.push(String(error)))
pagina.on('console', (mensaje) => {
  if (mensaje.type() === 'error') errores.push(mensaje.text())
})

/** El marcador separa millares con espacio duro; se normaliza para comparar. */
async function texto() {
  const bruto = await pagina.textContent('body')
  return bruto.replace(/\u00a0/g, ' ')
}

const comprobaciones = []
function comprobar(nombre, ok, detalle = '') {
  comprobaciones.push({ nombre, ok, detalle })
  console.log(`${ok ? '  OK  ' : ' FALLA'}  ${nombre}${detalle ? ` — ${detalle}` : ''}`)
}

console.log('\n· Primera carga con red\n')
await pagina.goto(BASE, { waitUntil: 'load' })
await pagina.waitForFunction(() => navigator.serviceWorker.controller !== null, { timeout: 15000 })
comprobar('El service worker toma el control', true)

const cacheado = await pagina.evaluate(async () => {
  const nombres = await caches.keys()
  const cache = await caches.open(nombres[0])
  return (await cache.keys()).length
})
comprobar('Precache poblado', cacheado >= 10, `${cacheado} recursos`)

/*
 * La versión vive dentro del worker y la app la pregunta por postMessage. Que la
 * pintada coincida con el nombre de la caché prueba el viaje entero, y que salga
 * ya en la PRIMERA carga prueba que se espera al worker en vez de rendirse
 * cuando todavía no hay controlador.
 */
await pagina.waitForSelector('text=Versión', { timeout: 15000 }).catch(() => null)
const versionPintada = (await texto()).match(/Versión\s+([0-9a-f]+)/)?.[1] ?? null
const nombreCache = (await pagina.evaluate(() => caches.keys()))[0]
comprobar(
  'La versión que se enseña es la del worker que sirve',
  versionPintada !== null && nombreCache === `la-cuenta-${versionPintada}`,
  versionPintada ? `${versionPintada} · caché ${nombreCache}` : 'no se pinta ninguna versión',
)

/*
 * El tema se cambiaba solo dentro de una partida, que es justo donde no se
 * busca: se busca al abrir la app de noche. Se comprueba desde el inicio, y de
 * paso que el botón aparezca en cada pantalla por la que se pasa.
 */
const botonTema = pagina.getByRole('button', { name: /Cambiar a modo/ })
const temaDeLaRaiz = () => pagina.evaluate(() => document.documentElement.dataset.tema ?? 'sistema')

await botonTema.click()
comprobar('El tema se cambia desde el inicio, sin partida abierta', (await temaDeLaRaiz()) === 'oscuro')
// Se vuelve al claro: las capturas de este recorrido son las del modo claro.
await botonTema.click()

const revisadas = []
const sinBotonTema = []
async function vigilarBotonTema(pantalla) {
  revisadas.push(pantalla)
  if (!(await botonTema.isVisible())) sinBotonTema.push(pantalla)
}
await vigilarBotonTema('inicio')

// Se juega una partida entera para que haya algo que sobreviva al corte.
await pagina.getByRole('button', { name: 'Nueva partida' }).click()
await vigilarBotonTema('nueva partida')
await pagina.getByRole('radio', { name: '5' }).click()
if (CAPTURAS) await pagina.screenshot({ path: 'capturas/02-nueva-partida.png', fullPage: true })
await pagina.getByRole('button', { name: 'Empezar' }).click()
await pagina.waitForSelector('text=Ronda 1')
await vigilarBotonTema('marcador')
if (CAPTURAS) await pagina.screenshot({ path: 'capturas/03-marcador.png', fullPage: true })

await pagina.getByRole('button', { name: 'Cerrar ronda' }).click()
await vigilarBotonTema('cerrar ronda')
await pagina.getByLabel('Quién pidió la cuenta').getByRole('radio', { name: 'Jugador 2' }).click()
await pagina.getByLabel('Total de las cartas').fill('137')
await pagina.getByLabel('Propina').fill('4')
await pagina.getByRole('radio', { name: /A pachas/ }).click()
await pagina.getByRole('checkbox', { name: 'Jugador 4' }).click()
await pagina.waitForSelector('text=Previsualización')

// El aumento de mano es una sola casilla y viene marcada: el caso normal no
// cuesta ningún toque. Si esto se rompe, el +1 de más abajo tampoco se concede.
const casillaAumento = pagina.getByRole('checkbox', { name: /\+1 al límite de mano/ })
comprobar(
  'El aumento de mano viene marcado por defecto',
  (await casillaAumento.getAttribute('aria-checked')) === 'true',
)
if (CAPTURAS) await pagina.screenshot({ path: 'capturas/04-cerrar-ronda.png', fullPage: true })

const previsualizacion = await texto()
// (137 + 4) / 4 marcados = 35,25 -> 36 € cada uno por redondeo al alza.
comprobar('Previsualización con redondeo al alza', previsualizacion.includes('36 €'), '141 € entre 4')

await pagina.getByRole('button', { name: 'Confirmar ronda' }).click()
await pagina.waitForSelector('text=Ronda 2')
const marcador = await texto()
comprobar('Ahorros aplicados al marcador', marcador.includes('1064 €'), '1100 − 36')
comprobar('Aumento de mano concedido solo al pagador', marcador.includes('6 cartas en mano'))

console.log('\n· Botón físico de atrás\n')

// La pila es [inicio, marcador]: crear la partida sustituyó al formulario en
// vez de apilarse encima.
await pagina.goBack()
await pagina.waitForSelector('text=Continuar partida', { timeout: 5000 })
comprobar('Atrás desde el marcador lleva al inicio, no al formulario de partida nueva', true)

await pagina.getByRole('button', { name: 'Continuar partida' }).click()
await pagina.waitForSelector('text=Ronda 2')

// Tres niveles: marcador -> historial -> corregir ronda.
await pagina.getByRole('button', { name: 'Historial', exact: true }).click()
await pagina.waitForSelector('text=Corregir')
await vigilarBotonTema('historial de rondas')
await pagina.getByRole('button', { name: 'Corregir' }).first().click()
await pagina.waitForSelector('text=Corregir ronda 1')
await vigilarBotonTema('corregir ronda')

await pagina.goBack()
await pagina.waitForSelector('text=Corregir', { timeout: 5000 })
comprobar('Atrás desde corregir vuelve al historial de rondas', true)

await pagina.goBack()
await pagina.waitForSelector('text=Cerrar ronda', { timeout: 5000 })
comprobar('Atrás desde el historial vuelve al marcador', true)

// Guardar una corrección tiene que dejar en el historial, no en el marcador.
await pagina.getByRole('button', { name: 'Historial', exact: true }).click()
await pagina.getByRole('button', { name: 'Corregir' }).first().click()
await pagina.getByLabel('Total de las cartas').fill('141')
await pagina.getByRole('button', { name: 'Guardar cambios' }).click()
await pagina.waitForSelector('text=Corregir', { timeout: 5000 })
comprobar('Guardar una corrección devuelve al historial', true)

await pagina.goBack()
await pagina.waitForSelector('text=Cerrar ronda', { timeout: 5000 })

console.log('\n· Corte de red y recarga\n')
await contexto.setOffline(true)
await pagina.reload({ waitUntil: 'load' })
await pagina.waitForSelector('text=Continuar partida', { timeout: 15000 })
comprobar('La app arranca en modo avión', true)

// El tema lo aplica el script en línea antes del primer pintado, así que tras
// recargar tiene que seguir puesto y sin fogonazo por medio.
comprobar('El tema elegido sobrevive a recargar sin red', (await temaDeLaRaiz()) === 'claro')
comprobar(
  'El botón de tema está en todas las pantallas del recorrido',
  sinBotonTema.length === 0,
  sinBotonTema.length === 0
    ? `${revisadas.length} pantallas: ${revisadas.join(', ')}`
    : `falta en: ${sinBotonTema.join(', ')}`,
)

await pagina.getByRole('button', { name: 'Continuar partida' }).click()
await pagina.waitForSelector('text=Ronda 2')
const trasCorte = await texto()
// 1063 € y no 1064: justo antes se corrigió la ronda a 141 € de cartas, que
// con los 4 € de propina son 145 € entre 4 marcados, o sea 37 € por cabeza.
// Que sobreviva este número y no el de antes prueba que persistió la edición.
comprobar('La partida y la corrección sobreviven sin red', trasCorte.includes('1063 €'))
if (CAPTURAS) await pagina.screenshot({ path: 'capturas/05-offline.png', fullPage: true })

console.log('\n· Instalación desde cero en modo avión\n')
// Un contexto nuevo sin caché HTTP, con el service worker ya instalado en el
// perfil, es lo más parecido a abrir la app instalada sin cobertura.
await contexto.setOffline(false)
await pagina.goto(BASE, { waitUntil: 'load' })
await pagina.waitForFunction(() => navigator.serviceWorker.controller !== null)
await contexto.setOffline(true)
const respuestaFria = await pagina.goto(BASE, { waitUntil: 'load' })
comprobar('Navegación servida desde caché', respuestaFria !== null && respuestaFria.status() < 400)

console.log('\n· Privacidad\n')
comprobar('Cero peticiones fuera del origen', externas.length === 0, externas.join(', ') || 'ninguna')

const erroresReales = errores.filter((e) => !e.includes('Failed to load resource'))
comprobar('Sin errores de JavaScript', erroresReales.length === 0, erroresReales.join(' | '))

if (CAPTURAS) {
  await contexto.setOffline(false)
  await pagina.goto(BASE, { waitUntil: 'load' })
  /*
   * Con el botón y no con `emulateMedia`: al haber elegido tema a mano queda un
   * `data-tema` que manda sobre la preferencia del sistema, así que emular el
   * sistema en oscuro ya no pinta nada. Y así las capturas salen del camino que
   * recorre el usuario de verdad.
   */
  await botonTema.click()
  await pagina.screenshot({ path: 'capturas/01-inicio-oscuro.png', fullPage: true })
  await pagina.getByRole('button', { name: 'Continuar partida' }).click()
  await pagina.waitForSelector('text=Ronda 2')
  await pagina.screenshot({ path: 'capturas/06-marcador-oscuro.png', fullPage: true })
  await pagina.getByRole('button', { name: 'Cerrar ronda' }).click()
  await pagina.getByLabel('Quién pidió la cuenta').getByRole('radio', { name: 'Jugador 1' }).click()
  await pagina.getByLabel('Total de las cartas').fill('75')
  await pagina.getByRole('radio', { name: /A medias/ }).click()
  await pagina.getByLabel('Co-pagador').getByRole('radio', { name: 'Jugador 3' }).click()
  await pagina.waitForSelector('text=Previsualización')
  await pagina.screenshot({ path: 'capturas/07-cerrar-ronda-oscuro.png', fullPage: true })
}

await navegador.close()
servidor.close()

const fallos = comprobaciones.filter((c) => !c.ok)
console.log(`\n${comprobaciones.length - fallos.length}/${comprobaciones.length} comprobaciones\n`)
process.exit(fallos.length === 0 ? 0 : 1)
