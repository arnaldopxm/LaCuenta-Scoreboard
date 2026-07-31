import type { ReactNode } from 'react'
import { Pantalla } from '../componentes/Pantalla.tsx'
import { LIMITE_MANO_MAX } from '../dominio/index.ts'
import estilos from './Dudas.module.css'

interface Props {
  onAtras: () => void
}

/**
 * Las dudas que salen de verdad en la mesa.
 *
 * No es un FAQ de relleno: casi todas son sitios donde el marcador hace algo que
 * parece un error y no lo es —el redondeo al alza, el cero sin deuda, la propina
 * antes del recorte— y tenerlas dentro de la app ahorra la discusión.
 *
 * Pantalla propia y no un desplegable en cada pantalla implicada: se lee peor en
 * el momento exacto de la duda, pero no ensucia el formulario de cerrar ronda,
 * que es donde menos margen hay. Las respuestas van plegadas para que la lista
 * se pueda barrer de un vistazo.
 */
export function Dudas({ onAtras }: Props) {
  return (
    <Pantalla titulo="Dudas" onAtras={onAtras}>
      <p className={estilos.entradilla}>
        Casi todo lo de aquí abajo parece un error del marcador y no lo es. Toca una pregunta para
        ver la respuesta.
      </p>

      <div className={estilos.lista}>
        <Duda pregunta="La suma de lo pagado no cuadra con la cuenta">
          Es a propósito. Cada jugador paga redondeando <strong>hacia arriba</strong>: 100 € a pachas
          entre 3 son 34 € cada uno, o sea 102 €. Se prefieren céntimos limpios en la mesa a que el
          total cuadre al euro.
        </Duda>

        <Duda pregunta="La cuenta era más alta que mis ahorros y me he quedado en 0, no en negativo">
          También a propósito. No hay deuda: te quedas a cero y eso termina la partida. Las reglas no
          aclaran este caso, así que es una asunción del marcador.
        </Duda>

        <Duda pregunta="Metí un plato quemado y la cuenta salió 0 aunque había propina">
          Correcto. La propina se suma al total <strong>antes</strong> del recorte a cero. Con las
          cartas en −20 y 5 de propina no paga nadie. Si el marcador recortara el total a cero antes
          de sumar la propina saldrían 5 € y alguien pagaría de más.
        </Duda>

        <Duda pregunta="Añadí una carta y luego me acordé del Premium">
          Toca la ficha de esa carta y elige <strong>Doblar</strong>: queda con un sello{' '}
          <strong>×2</strong> y enseña lo que cuenta ya doblado. Si te has equivocado, ese mismo
          botón pasa a <strong>Quitar el doble</strong>. No se puede doblar dos veces, porque una
          carta lleva Premium o no lo lleva. Y si te acuerdas <em>antes</em> de añadirla, el{' '}
          <strong>×2</strong> del teclado se queda pulsado y la pantalla enseña la cuenta hecha.
        </Duda>

        <Duda pregunta="Un plato quemado, ¿cuenta como carta para el aumento de mano?">
          Sí. Resta euros pero es una carta puesta en la mesa, y la regla del aumento cuenta{' '}
          <strong>cartas jugadas, no euros</strong>. En el sumador se mete con <strong>±</strong>.
        </Duda>

        <Duda pregunta="El +1 al límite de mano viene marcado sin que yo lo pida">
          A propósito. La mayoría de rondas llegan al mínimo de cartas, y quien se pone a contarlas
          es porque quiere el aumento. El marcador no ve la mesa, así que lo da por hecho y lo dice:
          si no se jugaron cartas suficientes, se desmarca. En el tope de {LIMITE_MANO_MAX} cartas no
          se puede marcar.
        </Duda>

        <Duda pregunta="Fui a medias y solo subió la mano de uno">
          Así es. El aumento se lo lleva <strong>únicamente quien jugó la carta de división</strong>,
          nunca el co-pagador, aunque los dos paguen. Igual en A pachas.
        </Duda>

        <Duda pregunta="Corregí una ronda antigua y varias rondas posteriores aparecen tachadas">
          Si al corregir resulta que alguien se arruinó antes, la partida terminó ahí y las rondas
          siguientes no se jugaron nunca. No se borran: se marcan y vuelven al juego en cuanto
          arregles o quites la ronda culpable.
        </Duda>

        <Duda pregunta="¿Se puede corregir una ronda de hace rato?">
          Cualquiera, desde el historial. Todo lo posterior se recalcula solo, porque el dinero no se
          guarda: se deriva de la lista de rondas cada vez.
        </Duda>

        <Duda pregunta="Hay empate y la app no declara ganador">
          No puede. Las reglas lo resuelven mirando quién lleva más dinero encima en la vida real, y
          eso el móvil no lo sabe. Contadlo y elegid en la pantalla de desempate.
        </Duda>

        <Duda pregunta="¿Los nombres o las partidas salen del móvil?">
          No. Todo vive en el propio dispositivo y no hay ni una petición saliente. El propio HTML
          lleva una regla de seguridad que se lo impide al navegador.
        </Duda>
      </div>
    </Pantalla>
  )
}

/**
 * Una duda plegada, con `details` del navegador: sin estado, sin JavaScript y
 * accesible de serie. El pulsable es el `summary` entero, no solo el texto.
 */
function Duda({ pregunta, children }: { pregunta: string; children: ReactNode }) {
  return (
    <details className={estilos.duda}>
      <summary className={estilos.pregunta}>{pregunta}</summary>
      <div className={estilos.respuesta}>{children}</div>
    </details>
  )
}
