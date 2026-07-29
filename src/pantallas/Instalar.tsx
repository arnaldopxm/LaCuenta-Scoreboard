import type { ReactNode } from 'react'
import { Boton } from '../componentes/Boton.tsx'
import { Pantalla } from '../componentes/Pantalla.tsx'
import { pedirInstalacion } from '../pwa/instalacion.ts'
import { useInstalacion } from '../pwa/useInstalacion.ts'
import estilos from './Instalar.module.css'

interface Props {
  onAtras: () => void
}

/**
 * Cómo instalar el marcador en el móvil.
 *
 * Es una pantalla y no un modal al arrancar: el encargo pedía un acceso discreto
 * y ningún prompt intrusivo, así que esto solo se ve si se pide desde el inicio.
 *
 * Tres caminos, porque las plataformas no se parecen (ver `caminoInstalacion.ts`):
 * en Chromium hay un botón de verdad, en iOS hay que explicar un gesto porque no
 * existe API que lo provoque, y en el resto se dice dónde mirar en el menú.
 */
export function Instalar({ onAtras }: Props) {
  const { instalada, camino } = useInstalacion()

  return (
    <Pantalla titulo="Instalar" onAtras={onAtras}>
      {instalada ? (
        <p className={estilos.entradilla}>
          Ya está instalada: esto que estás usando es la app, no una pestaña. Se abre desde el icono
          de tu pantalla de inicio y funciona sin conexión.
        </p>
      ) : (
        <>
          <p className={estilos.entradilla}>
            Instalada se abre desde su icono, a pantalla completa y sin barra del navegador, y
            funciona igual sin cobertura. No baja nada de internet: lo que ya está en el móvil es
            todo lo que hay.
          </p>

          {camino === 'directa' ? <Directa /> : null}
          {camino === 'ios' ? <PasosIOS /> : null}
          {camino === 'manual' ? <PasosManuales /> : null}
        </>
      )}
    </Pantalla>
  )
}

/** Chromium: hay diálogo del navegador y se puede abrir de verdad. */
function Directa() {
  return (
    <section className={estilos.bloque}>
      <Boton variante="primario" bloque onClick={() => void pedirInstalacion()}>
        Instalar ahora
      </Boton>
      <p className={estilos.nota}>
        Tu navegador se encarga del resto: sale su propio aviso y tú confirmas. Si lo cierras sin
        querer, vuelve a entrar aquí.
      </p>
    </section>
  )
}

/**
 * iOS: no hay API. `beforeinstallprompt` no existe en Safari y el diálogo no se
 * puede provocar, así que esto es una instrucción y no un botón. El icono de
 * compartir va dibujado para que se reconozca de un vistazo.
 */
function PasosIOS() {
  return (
    <section className={estilos.bloque}>
      <h2 className={estilos.subtitulo}>En iPhone o iPad</h2>
      <ol className={estilos.pasos}>
        <Paso numero={1}>
          Toca <strong>Compartir</strong> en la barra de Safari, el cuadrado con la flecha hacia
          arriba.
          <IconoCompartir />
        </Paso>
        <Paso numero={2}>
          Baja en la lista hasta <strong>Añadir a pantalla de inicio</strong>.
        </Paso>
        <Paso numero={3}>
          Confirma con <strong>Añadir</strong>. El icono aparece con el resto de tus apps.
        </Paso>
      </ol>
      <p className={estilos.nota}>
        Tiene que ser Safari: los demás navegadores de iPhone no pueden añadir nada a la pantalla de
        inicio, aunque parezca que sí.
      </p>
    </section>
  )
}

/** Todo lo demás: Firefox, escritorio, o un Chromium que aún no ha ofrecido nada. */
function PasosManuales() {
  return (
    <section className={estilos.bloque}>
      <h2 className={estilos.subtitulo}>Desde el menú del navegador</h2>
      <ol className={estilos.pasos}>
        <Paso numero={1}>
          Abre el menú del navegador, normalmente tres puntos o tres rayas.
          <IconoMenu />
        </Paso>
        <Paso numero={2}>
          Busca <strong>Instalar aplicación</strong> o <strong>Añadir a pantalla de inicio</strong>.
        </Paso>
        <Paso numero={3}>Confirma, y el icono queda en el móvil.</Paso>
      </ol>
      <p className={estilos.nota}>
        Si no aparece ninguna de las dos opciones, este navegador no instala apps. Sigue
        funcionando en la pestaña, y offline también.
      </p>
    </section>
  )
}

function Paso({ numero, children }: { numero: number; children: ReactNode }) {
  return (
    <li className={estilos.paso}>
      <span className={`${estilos.numero} cifra`} aria-hidden="true">
        {numero}
      </span>
      <span className={estilos.texto}>{children}</span>
    </li>
  )
}

/**
 * El icono de compartir de iOS, dibujado a mano: no se puede tirar de una fuente
 * de iconos, y menos de una remota.
 */
function IconoCompartir() {
  return (
    <span className={estilos.icono}>
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 3.5v10"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M8.5 7 12 3.5 15.5 7"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M7.5 10.5H6a1.5 1.5 0 0 0-1.5 1.5v7A1.5 1.5 0 0 0 6 20.5h12a1.5 1.5 0 0 0 1.5-1.5v-7a1.5 1.5 0 0 0-1.5-1.5h-1.5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </span>
  )
}

/** Los tres puntos del menú de Chromium. */
function IconoMenu() {
  return (
    <span className={estilos.icono}>
      <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <circle cx="12" cy="5" r="2" />
        <circle cx="12" cy="12" r="2" />
        <circle cx="12" cy="19" r="2" />
      </svg>
    </span>
  )
}
