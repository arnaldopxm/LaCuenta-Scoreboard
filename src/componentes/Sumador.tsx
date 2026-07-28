import { useState } from 'react'
import { duplicarImporte, parsearImporteConSigno, sumarImportes } from '../dominio/index.ts'
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

  const total = sumarImportes(importes)
  const valorEntrada = parsearImporteConSigno(`${negativo ? '-' : ''}${digitos}`)
  const hayEntrada = valorEntrada !== null

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
  }

  function doblarEntrada() {
    if (valorEntrada === null) return
    const doblado = duplicarImporte(valorEntrada)
    setNegativo(doblado < 0)
    setDigitos(String(Math.abs(doblado)))
  }

  function quitarCarta(indice: number) {
    onCambio(importes.filter((_, i) => i !== indice))
  }

  function cerrar() {
    setDigitos('')
    setNegativo(false)
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
              key={`${indice}-${importe}`}
              type="button"
              className={
                importe < 0 ? `${estilos.carta} ${estilos.cartaNegativa}` : estilos.carta
              }
              onClick={() => quitarCarta(indice)}
              aria-label={`Quitar la carta de ${importe} euros`}
            >
              {conSigno(importe)} €<span className={estilos.quitar} aria-hidden="true">×</span>
            </button>
          ))
        )}
      </div>

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
        Toca una carta ya sumada para quitarla. El total va directo al campo de arriba. Un plato
        quemado va con <strong>±</strong>: resta, y cuenta como carta.
      </p>
    </section>
  )
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
