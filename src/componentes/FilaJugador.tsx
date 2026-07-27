import { LIMITE_MANO_MAX, type EstadoJugador } from '../dominio/index.ts'
import estilos from './FilaJugador.module.css'

interface Props {
  estado: EstadoJugador
  /** Número de puesto, solo en la clasificación final. */
  puesto?: number
}

export function FilaJugador({ estado, puesto }: Props) {
  const enTope = estado.limiteMano >= LIMITE_MANO_MAX

  return (
    <div className={estado.sinAhorros ? `${estilos.fila} ${estilos.arruinado}` : estilos.fila}>
      {puesto !== undefined ? <span className={estilos.medalla}>{puesto}</span> : null}

      <div className={estilos.identidad}>
        <div className={estilos.nombre}>{estado.nombre}</div>
        <div className={enTope ? `${estilos.mano} ${estilos.manoTope}` : estilos.mano}>
          <Cartas />
          <span className="cifra">{estado.limiteMano} cartas en mano</span>
        </div>
      </div>

      <div className={estilos.dinero}>
        <span className={estilos.cifraDinero}>{estado.ahorros}&nbsp;€</span>
        {estado.sinAhorros ? <span className={estilos.etiquetaFuera}>Sin ahorros</span> : null}
      </div>
    </div>
  )
}

/** Iconito de línea, al estilo de los dibujos del manual. */
function Cartas() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect
        x="1.5"
        y="3.5"
        width="8"
        height="11"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M6 3 L11.5 1.6 A1.5 1.5 0 0 1 13.3 2.7 L15 9.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  )
}
