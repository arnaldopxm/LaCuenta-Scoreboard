/**
 * Baja los subsets latinos de las tres tipografías y los deja en src/fuentes/.
 * Se ejecuta UNA VEZ, a mano. Los .woff2 se comitean al repositorio: la app en
 * runtime no habla con ningún CDN.
 */
import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const DESTINO = resolve(process.argv[2] ?? 'src/fuentes')
const UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'

const URL_CSS =
  'https://fonts.googleapis.com/css2?family=Alfa+Slab+One&family=Source+Sans+3:wght@400;600;700&family=Courier+Prime:wght@400;700&display=swap'

const respuesta = await fetch(URL_CSS, { headers: { 'User-Agent': UA } })
if (!respuesta.ok) throw new Error(`Google Fonts respondió ${respuesta.status}`)
const css = await respuesta.text()

// El CSS viene como: /* subset */ \n @font-face { ... }
const bloques = css.split('/*').slice(1)
await mkdir(DESTINO, { recursive: true })

/**
 * Varias familias de Google Fonts son variables: sirven EL MISMO archivo para
 * todos los pesos y solo cambian el `font-weight` del @font-face. Bajarlo una
 * vez por peso duplicaría decenas de kB en el precache, así que se agrupa por
 * contenido y se emite un único @font-face con rango de pesos.
 */
const porContenido = new Map()

for (const bloque of bloques) {
  const subset = bloque.slice(0, bloque.indexOf('*/')).trim()
  if (subset !== 'latin') continue

  const familia = /font-family:\s*'([^']+)'/.exec(bloque)?.[1]
  const peso = /font-weight:\s*(\d+)/.exec(bloque)?.[1]
  const estilo = /font-style:\s*(\w+)/.exec(bloque)?.[1] ?? 'normal'
  const url = /url\((https:\/\/fonts\.gstatic\.com[^)]+)\)/.exec(bloque)?.[1]
  const rango = /unicode-range:\s*([^;]+);/.exec(bloque)?.[1]
  if (!familia || !peso || !url) continue

  const binario = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!binario.ok) throw new Error(`No se pudo bajar ${url}`)
  const bytes = Buffer.from(await binario.arrayBuffer())
  const huella = createHash('sha256').update(bytes).digest('hex')

  const existente = porContenido.get(huella)
  if (existente) {
    existente.pesos.push(Number(peso))
    continue
  }
  porContenido.set(huella, { familia, estilo, rango, bytes, pesos: [Number(peso)] })
}

const declaraciones = []

for (const fuente of porContenido.values()) {
  const pesos = [...fuente.pesos].sort((a, b) => a - b)
  const variable = pesos.length > 1
  const sufijo = variable ? 'variable' : String(pesos[0])
  const archivo = `${fuente.familia.toLowerCase().replace(/\s+/g, '-')}-${sufijo}.woff2`

  await writeFile(resolve(DESTINO, archivo), fuente.bytes)
  console.log(
    `${archivo.padEnd(32)} ${(fuente.bytes.length / 1024).toFixed(1).padStart(6)} kB` +
      `  pesos ${pesos.join(', ')}`,
  )

  declaraciones.push({
    familia: fuente.familia,
    estilo: fuente.estilo,
    rango: fuente.rango,
    archivo,
    peso: variable ? `${pesos[0]} ${pesos.at(-1)}` : String(pesos[0]),
  })
}

const cabecera = `/*
 * Tipografías self-hosted. Ninguna petición sale del dispositivo.
 *
 * Los .woff2 están descargados de Google Fonts pero servidos desde el propio
 * bundle. Las tres son SIL Open Font License 1.1:
 *   Alfa Slab One  — rótulo de bar para los titulares
 *   Source Sans 3  — humanista con numerales tabulares para las cifras
 *   Courier Prime  — máquina de escribir para el ticket
 *
 * Generado por scripts/bajar-fuentes.mjs. No editar a mano.
 */
`

const cuerpo = declaraciones
  .map(
    (d) => `@font-face {
  font-family: '${d.familia}';
  font-style: ${d.estilo};
  font-weight: ${d.peso};
  font-display: block;
  src: url('./${d.archivo}') format('woff2');${d.rango ? `\n  unicode-range: ${d.rango};` : ''}
}`,
  )
  .join('\n\n')

await writeFile(resolve(DESTINO, 'fuentes.css'), `${cabecera}\n${cuerpo}\n`)
console.log(`\n${declaraciones.length} fuentes en ${DESTINO}`)
