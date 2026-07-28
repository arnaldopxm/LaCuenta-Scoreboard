import type { ReactNode } from 'react'
import { useId } from 'react'
import type { Jugador } from '../dominio/index.ts'
import estilos from './Controles.module.css'

/* -------------------------------------------------------------------------
 * Campo numérico
 * ---------------------------------------------------------------------- */

interface CampoNumeroProps {
  etiqueta: string
  valor: string
  onCambio: (texto: string) => void
  ayuda?: ReactNode
  enPizarra?: boolean
  /**
   * Deja meter importes negativos. Solo para el total de las cartas: los platos
   * quemados restan. La propina no lo lleva, que un precio no es negativo.
   */
  permiteSigno?: boolean
}

/**
 * Ojo: aquí no hay `autoFocus` a propósito.
 *
 * "Cerrar ronda" abría con el foco en el total, y el teclado del móvil se
 * comía media pantalla antes de tocar nada: el primer paso de la pantalla es
 * elegir quién pidió la cuenta, y eso quedaba tapado. El teclado sale cuando el
 * usuario toca el campo, no al entrar.
 */
export function CampoNumero({
  etiqueta,
  valor,
  onCambio,
  ayuda,
  enPizarra = false,
  permiteSigno = false,
}: CampoNumeroProps) {
  const id = useId()

  /** El teclado numérico del móvil no trae menos, así que se filtra a mano. */
  function limpiar(bruto: string): string {
    const digitos = bruto.replace(/[^\d]/g, '')
    if (!permiteSigno) return digitos
    return bruto.trimStart().startsWith('-') ? `-${digitos}` : digitos
  }

  function alternarSigno() {
    onCambio(valor.startsWith('-') ? valor.slice(1) : `-${valor.replace(/^-/, '')}`)
  }

  return (
    <div className={enPizarra ? `${estilos.campo} ${estilos.enPizarra}` : estilos.campo}>
      <label className={estilos.etiqueta} htmlFor={id}>
        {etiqueta}
      </label>
      <div className={estilos.cajaNumero}>
        {permiteSigno ? (
          <button
            type="button"
            className={estilos.signo}
            onClick={alternarSigno}
            aria-label="Cambiar el signo del importe"
          >
            ±
          </button>
        ) : null}
        <input
          id={id}
          className={`${estilos.entradaNumero} cifra`}
          // Teclado numérico en el móvil sin las flechitas de <input type=number>.
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          value={valor}
          onChange={(evento) => onCambio(limpiar(evento.target.value))}
          onFocus={(evento) => evento.target.select()}
        />
        <span className={estilos.euro} aria-hidden="true">
          €
        </span>
      </div>
      {ayuda ? <p className={estilos.ayuda}>{ayuda}</p> : null}
    </div>
  )
}

/* -------------------------------------------------------------------------
 * Casilla
 * ---------------------------------------------------------------------- */

interface CasillaProps {
  marcada: boolean
  onCambio: (marcada: boolean) => void
  children: ReactNode
  subtexto?: ReactNode
  enPizarra?: boolean
  disabled?: boolean
}

export function Casilla({
  marcada,
  onCambio,
  children,
  subtexto,
  enPizarra = false,
  disabled = false,
}: CasillaProps) {
  const clases = [estilos.casilla, enPizarra ? estilos.casillaPizarra : ''].filter(Boolean).join(' ')

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={marcada}
      className={clases}
      disabled={disabled}
      onClick={() => onCambio(!marcada)}
    >
      <span
        className={marcada ? `${estilos.marca} ${estilos.marcaActiva}` : estilos.marca}
        aria-hidden="true"
      >
        {marcada ? <Palomita /> : null}
      </span>
      <span className={estilos.textoCasilla}>
        {children}
        {subtexto ? <span className={estilos.subtexto}>{subtexto}</span> : null}
      </span>
    </button>
  )
}

function Palomita() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M3 9.5 L7 13.5 L15 4.5"
        stroke="#1E1A17"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/* -------------------------------------------------------------------------
 * Selector de jugador
 * ---------------------------------------------------------------------- */

interface SelectorJugadorProps {
  jugadores: Jugador[]
  elegidoId: string | null
  onElegir: (id: string) => void
  excluirIds?: string[]
  enPizarra?: boolean
  etiqueta: string
}

export function SelectorJugador({
  jugadores,
  elegidoId,
  onElegir,
  excluirIds = [],
  enPizarra = false,
  etiqueta,
}: SelectorJugadorProps) {
  return (
    <div role="radiogroup" aria-label={etiqueta} className={estilos.rejilla}>
      {jugadores.map((jugador) => {
        const excluido = excluirIds.includes(jugador.id)
        const elegido = jugador.id === elegidoId
        const clases = [
          estilos.ficha,
          enPizarra ? estilos.fichaPizarra : '',
          elegido ? estilos.fichaElegida : '',
        ]
          .filter(Boolean)
          .join(' ')

        return (
          <button
            key={jugador.id}
            type="button"
            role="radio"
            aria-checked={elegido}
            className={clases}
            disabled={excluido}
            onClick={() => onElegir(jugador.id)}
          >
            {jugador.nombre}
          </button>
        )
      })}
    </div>
  )
}

/* -------------------------------------------------------------------------
 * Grupo de opciones exclusivas
 * ---------------------------------------------------------------------- */

interface Opcion<T extends string> {
  valor: T
  titulo: string
  descripcion: string
}

interface GrupoOpcionesProps<T extends string> {
  etiqueta: string
  opciones: Opcion<T>[]
  elegida: T
  onElegir: (valor: T) => void
}

export function GrupoOpciones<T extends string>({
  etiqueta,
  opciones,
  elegida,
  onElegir,
}: GrupoOpcionesProps<T>) {
  return (
    <div role="radiogroup" aria-label={etiqueta} className={estilos.opciones}>
      {opciones.map((opcion) => (
        <button
          key={opcion.valor}
          type="button"
          role="radio"
          aria-checked={opcion.valor === elegida}
          className={
            opcion.valor === elegida ? `${estilos.opcion} ${estilos.opcionElegida}` : estilos.opcion
          }
          onClick={() => onElegir(opcion.valor)}
        >
          <span>{opcion.titulo}</span>
          <span className={estilos.opcionDescripcion}>{opcion.descripcion}</span>
        </button>
      ))}
    </div>
  )
}
