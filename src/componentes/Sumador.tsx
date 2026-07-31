import { useState } from 'react'
import {
  alternarDobleEn,
  cartaSumada,
  duplicarImporte,
  importeEfectivo,
  parsearImporteConSigno,
  quitarCartaEn,
  sumarCartas,
  type CartaSumada,
} from '../dominio/index.ts'
import estilos from './Sumador.module.css'

interface Props {
  /** Las cartas cantadas hasta ahora. La lista la guarda quien nos usa. */
  cartas: CartaSumada[]
  onCambio: (cartas: CartaSumada[]) => void
}

/** Con el menos tipográfico, que el guion del teclado queda pobre en cifras. */
function conSigno(valor: number): string {
  return valor < 0 ? `−${Math.abs(valor)}` : String(valor)
}

/**
 * Suma las cartas de la mesa una a una.
 *
 * Teclado propio en vez del nativo del móvil: el del sistema tapa media
 * pantalla justo cuando hace falta ver el desglose, y aquí se necesitan
 * pulsables grandes para ir cantando cartas deprisa. Tampoco trae un menos, y
 * aquí hace falta: los platos quemados restan.
 *
 * No sabe cuánto vale ninguna tapa. El catálogo de cartas está fuera de
 * alcance a propósito, así que esto solo suma lo que se teclea.
 *
 * El Premium es un **interruptor** en los dos sitios donde se pone —el `×2` del
 * teclado mientras se teclea, y el menú de una ficha ya sumada— y se ve en los
 * dos. Cuando era multiplicar el número se podía pulsar tres veces y dejarte un
 * ×8 sin rastro de dónde salía. Ver `CartaSumada` en el dominio.
 */
export function Sumador({ cartas, onCambio }: Props) {
  const [abierto, setAbierto] = useState(false)
  const [digitos, setDigitos] = useState('')
  const [negativo, setNegativo] = useState(false)
  /** Premium sobre la carta que se está tecleando, antes de añadirla. */
  const [dobleEntrada, setDobleEntrada] = useState(false)
  /** Posición de la ficha que tiene el menú abierto. */
  const [fichaTocada, setFichaTocada] = useState<number | null>(null)

  const total = sumarCartas(cartas)
  const valorEntrada = parsearImporteConSigno(`${negativo ? '-' : ''}${digitos}`)
  const hayEntrada = valorEntrada !== null

  /*
   * El menú se deriva en vez de fiarse del índice guardado a secas: la lista la
   * manda quien nos usa y puede acortarse por debajo —al teclear el total a mano
   * el desglose se descarta entero—, así que un índice que ya no existe tiene
   * que dejar de contar sin pasar por un efecto.
   */
  const menu =
    fichaTocada !== null && fichaTocada < cartas.length
      ? { indice: fichaTocada, carta: cartas[fichaTocada]! }
      : null

  if (!abierto) {
    return (
      <button type="button" className={estilos.abrir} onClick={() => setAbierto(true)}>
        <IconoSumar />
        Sumar las cartas una a una
      </button>
    )
  }

  function pulsarDigito(digito: string) {
    setDigitos((actual) => {
      const siguiente = (actual + digito).replace(/^0+(?=\d)/, '')
      return siguiente.length > 5 ? actual : siguiente
    })
  }

  function anadirCarta() {
    if (valorEntrada === null) return
    const carta = cartaSumada(valorEntrada)
    onCambio([...cartas, dobleEntrada ? { ...carta, doblada: true } : carta])
    setDigitos('')
    setNegativo(false)
    setDobleEntrada(false)
    setFichaTocada(null)
  }

  /*
   * Poner y quitar el Premium de una carta ya sumada. El menú se queda abierto:
   * lo normal después de dudar es mirar el total y volver a cambiarlo.
   */
  function alternarDoble(indice: number) {
    onCambio(alternarDobleEn(cartas, indice))
  }

  function quitarCarta(indice: number) {
    onCambio(quitarCartaEn(cartas, indice))
    setFichaTocada(null)
  }

  function cerrar() {
    setDigitos('')
    setNegativo(false)
    setDobleEntrada(false)
    setFichaTocada(null)
    setAbierto(false)
  }

  return (
    <section className={estilos.panel} aria-label="Sumador de cartas">
      <header className={estilos.cabecera}>
        <span className={estilos.rotulo}>Sumando cartas</span>
        <button type="button" className={estilos.cerrar} onClick={cerrar}>
          Cerrar
        </button>
      </header>

      <div className={estilos.cartas}>
        {cartas.length === 0 ? (
          <span className={estilos.vacio}>Todavía no has sumado ninguna carta.</span>
        ) : (
          cartas.map((carta, indice) => (
            <button
              // Por posición y no por posición e importe: el Premium cambia lo
              // que cuenta la carta, y con eso dentro de la clave se remontaría
              // la ficha justo cuando el dedo está encima y el menú abierto.
              key={indice}
              type="button"
              className={clases(
                estilos.carta,
                importeEfectivo(carta) < 0 ? estilos.cartaNegativa : '',
                menu?.indice === indice ? estilos.cartaTocada : '',
              )}
              onClick={() => setFichaTocada((actual) => (actual === indice ? null : indice))}
              aria-expanded={menu?.indice === indice}
              aria-label={etiquetaFicha(carta)}
            >
              {/*
                La cifra de la ficha es lo que la carta CUENTA, no lo que dice en
                la mesa: así las fichas suman el total que se ve al lado y nadie
                tiene que fiarse. De dónde sale ese número lo cuenta el sello, y
                el menú lo dice con palabras.
              */}
              {conSigno(importeEfectivo(carta))} €
              {carta.doblada ? (
                <span className={estilos.sello} aria-hidden="true">
                  ×2
                </span>
              ) : null}
              <span className={estilos.mas} aria-hidden="true">
                ⋯
              </span>
            </button>
          ))
        )}
      </div>

      {/*
        Menú de la ficha tocada. Antes, tocar una ficha la borraba en el acto, y
        con eso no había forma de doblar una carta ya sumada. Quitar se queda con
        el peso visual porque es lo que ya hacía el gesto, y quien viene de usar
        la app lo espera.
      */}
      {menu ? (
        <div className={estilos.menu} role="group" aria-label={descripcionCarta(menu.carta)}>
          <span className={estilos.menuRotulo}>
            Carta de <strong className="cifra">{conSigno(menu.carta.importe)} €</strong>
            {menu.carta.doblada ? (
              <>
                , doblada a{' '}
                <strong className="cifra">{conSigno(importeEfectivo(menu.carta))} €</strong>
              </>
            ) : null}
          </span>
          <div className={estilos.menuAcciones}>
            {/*
              Un solo botón que pone y quita, no dos: una carta lleva Premium o
              no lo lleva, y con "Doblar" siempre disponible se podía apilar un
              ×4 que en la mesa no existe.
            */}
            <button
              type="button"
              className={clases(
                estilos.tecla,
                estilos.teclaAuxiliar,
                menu.carta.doblada ? estilos.doblePuesto : '',
              )}
              onClick={() => alternarDoble(menu.indice)}
              aria-pressed={menu.carta.doblada}
            >
              {menu.carta.doblada ? 'Quitar el doble' : '×2 Doblar'}
            </button>
            <button
              type="button"
              className={estilos.quitar}
              onClick={() => quitarCarta(menu.indice)}
            >
              Quitar
            </button>
          </div>
        </div>
      ) : null}

      <div className={estilos.pantalla}>
        <div>
          <div className={estilos.etiquetaPantalla}>Carta</div>
          <div className={negativo ? `${estilos.entrada} ${estilos.entradaResta}` : estilos.entrada}>
            {digitos === '' ? (negativo ? '−0' : '0') : conSigno(valorEntrada ?? 0)}
            {/*
              Con el ×2 pulsado se enseña la cuenta hecha en vez de cambiar la
              cifra tecleada: el número de arriba sigue siendo el de la carta que
              tienes en la mano, y debajo pone lo que va a contar.
            */}
            {dobleEntrada && hayEntrada ? (
              <span className={estilos.dobleEntrada}>
                ×2 = {conSigno(duplicarImporte(valorEntrada))} €
              </span>
            ) : null}
          </div>
        </div>
        <div className={estilos.totalZona}>
          <div className={estilos.etiquetaPantalla}>
            Total · {cartas.length} {cartas.length === 1 ? 'carta' : 'cartas'}
          </div>
          <div className={total < 0 ? `${estilos.total} ${estilos.totalResta}` : estilos.total}>
            {conSigno(total)} €
          </div>
        </div>
      </div>

      <div className={estilos.teclado}>
        {['7', '8', '9', '4', '5', '6', '1', '2', '3'].map((digito) => (
          <button
            key={digito}
            type="button"
            className={estilos.tecla}
            onClick={() => pulsarDigito(digito)}
          >
            {digito}
          </button>
        ))}

        <button
          type="button"
          className={`${estilos.tecla} ${estilos.teclaSigno}`}
          onClick={() => setNegativo((actual) => !actual)}
          aria-label="Cambiar el signo, para los platos quemados"
          aria-pressed={negativo}
        >
          ±
        </button>
        <button type="button" className={estilos.tecla} onClick={() => pulsarDigito('0')}>
          0
        </button>
        <button
          type="button"
          className={`${estilos.tecla} ${estilos.teclaAuxiliar}`}
          onClick={() => setDigitos((actual) => actual.slice(0, -1))}
          disabled={digitos === ''}
          aria-label="Borrar el último dígito"
        >
          ←
        </button>
      </div>

      <div className={estilos.acciones}>
        {/*
          Interruptor como el ±, no una tecla que multiplica lo tecleado: pulsado
          tres veces, aquello dejaba un ×8 sin que se viera de dónde salía. Se
          puede pulsar antes de teclear la cifra, igual que el signo.
        */}
        <button
          type="button"
          className={`${estilos.tecla} ${estilos.teclaDoble}`}
          onClick={() => setDobleEntrada((actual) => !actual)}
          aria-label="Doblar esta carta, para Premium"
          aria-pressed={dobleEntrada}
        >
          ×2
        </button>
        <button
          type="button"
          className={estilos.anadir}
          onClick={anadirCarta}
          disabled={!hayEntrada}
        >
          Añadir carta
        </button>
      </div>

      <p className={estilos.pista}>
        Toca una carta ya sumada para doblarla o quitarla. El total va directo al campo de arriba. Un
        plato quemado va con <strong>±</strong>: resta, y cuenta como carta.
      </p>
    </section>
  )
}

/**
 * Cómo se lee una carta. Empieza siempre por el importe de la mesa, doblada o
 * no, para que sea el mismo sitio donde buscarlo.
 */
function descripcionCarta(carta: CartaSumada): string {
  const base = `Carta de ${carta.importe} euros`
  return carta.doblada
    ? `${base} doblada, cuenta ${importeEfectivo(carta)} euros`
    : base
}

/**
 * Nombre accesible de la ficha. Las acciones NO van aquí: viven en el menú, y
 * nombrarlas dos veces hace que "Quitar" case con la ficha además del botón.
 */
function etiquetaFicha(carta: CartaSumada): string {
  return `${descripcionCarta(carta)}. Opciones de la carta`
}

/**
 * Junta clases saltándose las vacías, que si no quedan dobles espacios. Admite
 * `undefined` porque con `noUncheckedIndexedAccess` los módulos CSS lo son.
 */
function clases(...nombres: (string | undefined)[]): string {
  return nombres.filter(Boolean).join(' ')
}

function IconoSumar() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M9 3 V15 M3 9 H15"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  )
}
