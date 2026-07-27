import { useState } from 'react'
import { Boton } from '../componentes/Boton.tsx'
import { Pantalla } from '../componentes/Pantalla.tsx'
import { LineaTicket, Ticket } from '../componentes/Ticket.tsx'
import {
  MAX_JUGADORES,
  MAX_LONGITUD_NOMBRE,
  MIN_JUGADORES,
  ahorrosIniciales,
  nombresPorDefecto,
  sanearNombre,
  validarNombres,
} from '../dominio/index.ts'
import estilos from './NuevaPartida.module.css'

interface Props {
  onAtras: () => void
  onCrear: (nombres: string[]) => void
}

const CANTIDADES = Array.from(
  { length: MAX_JUGADORES - MIN_JUGADORES + 1 },
  (_, i) => MIN_JUGADORES + i,
)

export function NuevaPartida({ onAtras, onCrear }: Props) {
  const [cantidad, setCantidad] = useState(4)
  const [nombres, setNombres] = useState<string[]>(() => nombresPorDefecto(MAX_JUGADORES))

  const enJuego = nombres.slice(0, cantidad)
  const error = validarNombres(enJuego)
  const ahorros = ahorrosIniciales(cantidad)

  function cambiarNombre(indice: number, valor: string) {
    setNombres((actuales) => actuales.map((n, i) => (i === indice ? valor : n)))
  }

  return (
    <Pantalla
      titulo="Nueva partida"
      onAtras={onAtras}
      pie={
        <>
          {error ? <p className={estilos.error}>{error}</p> : null}
          <Boton
            variante="primario"
            bloque
            disabled={error !== null}
            onClick={() => onCrear(enJuego.map(sanearNombre))}
          >
            Empezar
          </Boton>
        </>
      }
    >
      <section>
        <h2 className={estilos.subtitulo}>¿Cuántos sois?</h2>
        <div className={estilos.cantidades} role="radiogroup" aria-label="Número de jugadores">
          {CANTIDADES.map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={n === cantidad}
              className={
                n === cantidad ? `${estilos.numero} ${estilos.numeroElegido}` : estilos.numero
              }
              onClick={() => setCantidad(n)}
            >
              <span className="cifra">{n}</span>
            </button>
          ))}
        </div>
      </section>

      <Ticket titulo="Ahorros iniciales" nota="Según la tabla del reglamento">
        <LineaTicket concepto={`${cantidad} participantes`} importe={`${ahorros} €`} destacada />
        <LineaTicket concepto="Cada uno empieza con" importe={`${ahorros} €`} tenue />
        <LineaTicket concepto="Límite de mano" importe="5 cartas" tenue />
      </Ticket>

      <section>
        <h2 className={estilos.subtitulo}>Nombres</h2>
        <ul className={estilos.lista}>
          {enJuego.map((nombre, indice) => (
            <li key={indice} className={estilos.filaNombre}>
              <span className={estilos.orden} aria-hidden="true">
                {indice + 1}
              </span>
              <input
                className={estilos.entradaNombre}
                value={nombre}
                maxLength={MAX_LONGITUD_NOMBRE}
                autoComplete="off"
                autoCapitalize="words"
                spellCheck={false}
                aria-label={`Nombre del jugador ${indice + 1}`}
                onChange={(evento) => cambiarNombre(indice, evento.target.value)}
                onFocus={(evento) => evento.target.select()}
              />
            </li>
          ))}
        </ul>
        <p className={estilos.pista}>
          El orden es el de la mesa y no cambia en toda la partida.
        </p>
      </section>
    </Pantalla>
  )
}
