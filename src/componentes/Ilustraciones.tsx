/**
 * Ilustraciones de línea al estilo de los dibujos del manual, para estados
 * vacíos. Todo inline: ni un icono viene de la red.
 */
import estilos from './Ilustraciones.module.css'

interface Props {
  children?: string
}

const TRAZO = {
  stroke: 'currentColor',
  strokeWidth: 2.2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  fill: 'none',
}

/** Mesa de bar con tapas y vino. Para cuando no hay ninguna partida. */
export function MesaVacia({ children }: Props) {
  return (
    <div className={estilos.hueco}>
      <svg viewBox="0 0 160 110" className={estilos.dibujo} aria-hidden="true">
        {/* Plato grande */}
        <ellipse cx="58" cy="70" rx="34" ry="12" {...TRAZO} />
        <path d="M24 70 q34 16 68 0" {...TRAZO} />
        {/* Tapas apiladas */}
        <path d="M42 62 q16 -12 32 0" {...TRAZO} />
        <path d="M48 56 q10 -8 20 0" {...TRAZO} />
        {/* Palillo */}
        <path d="M58 52 L58 38" {...TRAZO} />
        <circle cx="58" cy="35" r="3" {...TRAZO} />
        {/* Copa de vino */}
        <path d="M112 30 L132 30 L128 52 L116 52 Z" {...TRAZO} />
        <path d="M122 52 L122 74" {...TRAZO} />
        <path d="M112 74 L132 74" {...TRAZO} />
        <path d="M114 40 L130 40" {...TRAZO} />
        {/* Mesa */}
        <path d="M12 86 L148 86" {...TRAZO} />
        <path d="M30 86 L26 102 M130 86 L134 102" {...TRAZO} />
      </svg>
      {children ? <p className={estilos.texto}>{children}</p> : null}
    </div>
  )
}

/** Cuenta pinchada en el palillo. Para el historial vacío. */
export function CuentaVacia({ children }: Props) {
  return (
    <div className={estilos.hueco}>
      <svg viewBox="0 0 160 110" className={estilos.dibujo} aria-hidden="true">
        {/* Pinchito portacuentas */}
        <path d="M80 96 L80 26" {...TRAZO} />
        <ellipse cx="80" cy="98" rx="26" ry="8" {...TRAZO} />
        <circle cx="80" cy="22" r="4" {...TRAZO} />
        {/* Papel pinchado */}
        <path d="M52 40 L108 40 L108 82 L100 76 L92 82 L84 76 L76 82 L68 76 L60 82 L52 76 Z" {...TRAZO} />
        <path d="M62 52 L98 52 M62 62 L90 62" {...TRAZO} />
      </svg>
      {children ? <p className={estilos.texto}>{children}</p> : null}
    </div>
  )
}

/** Camarero con bandeja. Para el historial de partidas vacío. */
export function ArchivoVacio({ children }: Props) {
  return (
    <div className={estilos.hueco}>
      <svg viewBox="0 0 160 110" className={estilos.dibujo} aria-hidden="true">
        {/* Bandeja */}
        <ellipse cx="80" cy="46" rx="42" ry="10" {...TRAZO} />
        <path d="M38 46 q42 12 84 0" {...TRAZO} />
        {/* Vasos encima */}
        <path d="M64 40 L64 26 L74 26 L74 40" {...TRAZO} />
        <path d="M88 40 L88 30 L98 30 L98 40" {...TRAZO} />
        {/* Brazo */}
        <path d="M80 56 L80 72 q0 8 -10 8 L44 80" {...TRAZO} />
        <path d="M44 74 L38 80 L44 86" {...TRAZO} />
      </svg>
      {children ? <p className={estilos.texto}>{children}</p> : null}
    </div>
  )
}
