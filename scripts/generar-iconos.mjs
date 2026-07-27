/**
 * Genera los iconos de la PWA a partir de un SVG dibujado aquí mismo.
 *
 * Se ejecuta a mano cuando cambia el icono; los PNG resultantes se comitean.
 * `sharp` es una devDependency solo para esto y no entra en el bundle.
 *
 *   node scripts/generar-iconos.mjs
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import sharp from 'sharp'

const DESTINO = resolve('public/iconos')

const NARANJA = '#E8933A'
const CREMA = '#F7EBD5'
const TINTA = '#1E1A17'
const MOSTAZA = '#F2C14E'
const PIZARRA = '#14110F'

/**
 * La cuenta pinchada en el palillo del bar.
 *
 * @param {object} opciones
 * @param {number} opciones.escala  1 = a sangre, 0.72 = con zona segura maskable
 * @param {boolean} opciones.fondo  pinta el fondo naranja completo
 */
function dibujo({ escala = 1, fondo = true } = {}) {
  const desplazamiento = (512 - 512 * escala) / 2

  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  ${fondo ? `<rect width="512" height="512" fill="${NARANJA}"/>` : ''}
  <g transform="translate(${desplazamiento} ${desplazamiento}) scale(${escala})">
    <!-- Palillo -->
    <rect x="243" y="60" width="26" height="392" rx="13" fill="${TINTA}"/>
    <circle cx="256" cy="58" r="30" fill="${MOSTAZA}" stroke="${TINTA}" stroke-width="14"/>

    <!-- Base del portacuentas -->
    <ellipse cx="256" cy="446" rx="118" ry="30" fill="${MOSTAZA}" stroke="${TINTA}" stroke-width="14"/>

    <!-- El ticket, con el borde inferior dentado -->
    <path d="M116 132 H396 V368
             l-28 -22 l-28 22 l-28 -22 l-28 22 l-28 -22 l-28 22 l-28 -22 l-28 22 l-28 -22 l-28 22 Z"
          fill="${CREMA}" stroke="${TINTA}" stroke-width="16" stroke-linejoin="round"/>

    <!-- Renglones de la cuenta -->
    <rect x="158" y="192" width="150" height="18" rx="9" fill="${TINTA}"/>
    <rect x="158" y="240" width="196" height="18" rx="9" fill="${TINTA}"/>
    <rect x="158" y="288" width="118" height="18" rx="9" fill="${TINTA}"/>
    <rect x="316" y="288" width="38" height="18" rx="9" fill="${NARANJA}"/>
  </g>
</svg>`
}

/** Favicon: mismo dibujo, sin la base, para que se lea a 16 px. */
const FAVICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="${NARANJA}"/>
  <rect x="243" y="70" width="26" height="330" rx="13" fill="${TINTA}"/>
  <path d="M116 132 H396 V352 l-35 -26 l-35 26 l-35 -26 l-35 26 l-35 -26 l-35 26 l-35 -26 l-35 26 Z"
        fill="${CREMA}" stroke="${TINTA}" stroke-width="18" stroke-linejoin="round"/>
  <rect x="158" y="196" width="196" height="24" rx="12" fill="${TINTA}"/>
  <rect x="158" y="252" width="140" height="24" rx="12" fill="${TINTA}"/>
</svg>`

await mkdir(DESTINO, { recursive: true })

const trabajos = [
  { archivo: 'icono-192.png', tamano: 192, svg: dibujo() },
  { archivo: 'icono-512.png', tamano: 512, svg: dibujo() },
  // Maskable: el recorte circular de Android se come los bordes, así que el
  // dibujo se encoge para caber entero en la zona segura.
  { archivo: 'icono-maskable-192.png', tamano: 192, svg: dibujo({ escala: 0.7 }) },
  { archivo: 'icono-maskable-512.png', tamano: 512, svg: dibujo({ escala: 0.7 }) },
  // iOS no aplica máscara y recorta las esquinas él mismo: sin transparencia.
  { archivo: 'apple-touch-icon.png', tamano: 180, svg: dibujo({ escala: 0.86 }) },
]

for (const { archivo, tamano, svg } of trabajos) {
  const png = await sharp(Buffer.from(svg)).resize(tamano, tamano).png({ compressionLevel: 9 }).toBuffer()
  await writeFile(resolve(DESTINO, archivo), png)
  console.log(`${archivo.padEnd(28)} ${tamano}×${tamano}  ${(png.length / 1024).toFixed(1)} kB`)
}

await writeFile(resolve(DESTINO, 'favicon.svg'), FAVICON)
console.log('favicon.svg')
