import { useState } from 'react'
import { duplicarImporte, parsearImporte, sumarImportes } from '../dominio/index.ts'
import estilos from './Sumador.module.css'

interface Props {
  /** Las cartas cantadas hasta ahora. La lista la guarda quien nos usa. */
  importes: number[]
  onCambio: (importes: number[]) => void
}

/**
 * Suma las cartas de la mesa una a una.
 *
 * Teclado propio en vez del nativo del móvil: el del sistema tapa media
 * pantalla justo cuando hace falta ver el desglose, y aquí se necesitan
 * pulsables grandes para ir cantando cartas deprisa.
 *
 * No sabe cuánto vale ninguna tapa. El catálogo de cartas está fuera de
 * alcance a propósito, así que esto solo suma lo que se teclea.
 */
export function Sumador({ importes, onCambio }: Props) {
  const [abierto, setAbierto] = useState(false)
  const [entrada, setEntrada] = useState('')

  const total = sumarImportes(importes)
  const valorEntrada = parsearImporte(entrada)
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
    setEntrada((actual) => {
      // Sin ceros a la izquierda y con el mismo techo que el campo de importes.
      const siguiente = (actual + digito).replace(/^0+(?=\d)/, '')
      return siguiente.length > 5 ? actual : siguiente
    })
  }

  function anadirCarta() {
    if (valorEntrada === null) return
    onCambio([...importes, valorEntrada])
    setEntrada('')
  }

  function doblarEntrada() {
    if (valorEntrada === null) return
    setEntrada(String(duplicarImporte(valorEntrada)))
  }

  function quitarCarta(indice: number) {
    onCambio(importes.filter((_, i) => i !== indice))
  }

  function cerrar() {
    setEntrada('')
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
              className={estilos.carta}
              onClick={() => quitarCarta(indice)}
              aria-label={`Quitar ${importe} euros`}
            >
              {importe} €<span className={estilos.quitar} aria-hidden="true">×</span>
            </button>
          ))
        )}
      </div>

      <div className={estilos.pantalla}>
        <div>
          <div className={estilos.etiquetaPantalla}>Carta</div>
          <div className={estilos.entrada}>{entrada === '' ? '0' : entrada}</div>
        </div>
        <div className={estilos.totalZona}>
          <div className={estilos.etiquetaPantalla}>
            Total · {importes.length} {importes.length === 1 ? 'carta' : 'cartas'}
          </div>
          <div className={estilos.total}>{total} €</div>
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
          className={`${estilos.tecla} ${estilos.teclaAuxiliar}`}
          onClick={doblarEntrada}
          disabled={!hayEntrada}
          // Premium dobla un plato: aquí es multiplicar por dos lo tecleado.
          aria-label="Doblar la carta, para Premium"
        >
          ×2
        </button>
        <button type="button" className={estilos.tecla} onClick={() => pulsarDigito('0')}>
          0
        </button>
        <button
          type="button"
          className={`${estilos.tecla} ${estilos.teclaAuxiliar}`}
          onClick={() => setEntrada((actual) => actual.slice(0, -1))}
          disabled={entrada === ''}
          aria-label="Borrar el último dígito"
        >
          ←
        </button>
      </div>

      <button
        type="button"
        className={estilos.anadir}
        onClick={anadirCarta}
        disabled={!hayEntrada}
      >
        Añadir carta
      </button>

      <p className={estilos.pista}>
        Toca una carta ya sumada para quitarla. El total va directo al campo de arriba.
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
