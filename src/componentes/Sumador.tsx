import { useState } from 'react'
import {
  doblarCartaEn,
  duplicarImporte,
  parsearImporteConSigno,
  quitarCartaEn,
  sumarImportes,
} from '../dominio/index.ts'
import estilos from './Sumador.module.css'

interface Props {
  /** Las cartas cantadas hasta ahora. La lista la guarda quien nos usa. */
  importes: number[]
  onCambio: (importes: number[]) => void
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
 */
export function Sumador({ importes, onCambio }: Props) {
  const [abierto, setAbierto] = useState(false)
  const [digitos, setDigitos] = useState('')
  const [negativo, setNegativo] = useState(false)
  /** Posición de la ficha que tiene el menú de doblar y quitar abierto. */
  const [fichaTocada, setFichaTocada] = useState<number | null>(null)

  const total = sumarImportes(importes)
  const valorEntrada = parsearImporteConSigno(`${negativo ? '-' : ''}${digitos}`)
  const hayEntrada = valorEntrada !== null

  /*
   * El menú se deriva en vez de fiarse del índice guardado a secas: la lista la
   * manda quien nos usa y puede acortarse por debajo —al teclear el total a mano
   * el desglose se descarta entero—, así que un índice que ya no existe tiene
   * que dejar de contar sin pasar por un efecto.
   */
  const menu =
    fichaTocada !== null && fichaTocada < importes.length
      ? { indice: fichaTocada, importe: importes[fichaTocada]! }
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
    onCambio([...importes, valorEntrada])
    setDigitos('')
    setNegativo(false)
    setFichaTocada(null)
  }

  function doblarEntrada() {
    if (valorEntrada === null) return
    const doblado = duplicarImporte(valorEntrada)
    setNegativo(doblado < 0)
    setDigitos(String(Math.abs(doblado)))
  }

  /*
   * El menú se queda abierto al doblar, así que un Premium sobre un plato ya
   * doblado —×4— son dos toques en el mismo sitio. Al quitar se cierra, que la
   * ficha ya no está.
   */
  function doblarCarta(indice: number) {
    onCambio(doblarCartaEn(importes, indice))
  }

  function quitarCarta(indice: number) {
    onCambio(quitarCartaEn(importes, indice))
    setFichaTocada(null)
  }

  function cerrar() {
    setDigitos('')
    setNegativo(false)
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
        {importes.length === 0 ? (
          <span className={estilos.vacio}>Todavía no has sumado ninguna carta.</span>
        ) : (
          importes.map((importe, indice) => (
            <button
              // Por posición y no por posición e importe: doblar cambia el
              // importe, y con la clave dentro se remontaría la ficha justo
              // cuando el dedo está encima y el menú abierto.
              key={indice}
              type="button"
              className={clases(
                estilos.carta,
                importe < 0 ? estilos.cartaNegativa : '',
                menu?.indice === indice ? estilos.cartaTocada : '',
              )}
              onClick={() => setFichaTocada((actual) => (actual === indice ? null : indice))}
              aria-expanded={menu?.indice === indice}
              aria-label={`Carta de ${importe} euros: doblar o quitar`}
            >
              {conSigno(importe)} €
              <span className={estilos.mas} aria-hidden="true">
                ⋯
              </span>
            </button>
          ))
        )}
      </div>

      {/*
        Menú de la ficha tocada. Antes, tocar una ficha la borraba en el acto, y
        con eso no había forma de doblar una carta ya sumada: el ×2 solo actúa
        sobre lo que se está tecleando. Quitar se queda con el peso visual porque
        es lo que ya hacía el gesto, y quien viene de usar la app lo espera.
      */}
      {menu ? (
        <div className={estilos.menu} role="group" aria-label={`Carta de ${menu.importe} euros`}>
          <span className={estilos.menuRotulo}>
            Carta de <strong className="cifra">{conSigno(menu.importe)} €</strong>
          </span>
          <div className={estilos.menuAcciones}>
            <button
              type="button"
              className={`${estilos.tecla} ${estilos.teclaAuxiliar}`}
              onClick={() => doblarCarta(menu.indice)}
              // Premium sobre una carta ya puesta: dobla el importe, y si es un
              // plato quemado dobla el descuento.
              aria-label={`Doblar a ${duplicarImporte(menu.importe)} euros`}
            >
              ×2 Doblar
            </button>
            <button type="button" className={estilos.quitar} onClick={() => quitarCarta(menu.indice)}>
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
          </div>
        </div>
        <div className={estilos.totalZona}>
          <div className={estilos.etiquetaPantalla}>
            Total · {importes.length} {importes.length === 1 ? 'carta' : 'cartas'}
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
        <button
          type="button"
          className={`${estilos.tecla} ${estilos.teclaAuxiliar}`}
          onClick={doblarEntrada}
          disabled={!hayEntrada}
          // Premium dobla un plato: aquí es multiplicar por dos lo tecleado.
          aria-label="Doblar la carta, para Premium"
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
