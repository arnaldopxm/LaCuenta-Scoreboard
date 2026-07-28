import { useTema } from '../estado/useTema.ts'
import estilos from './BotonTema.module.css'

/**
 * Cambio de claro a oscuro. Sale en todas las pantallas: estaba solo dentro de
 * una partida y ahí no es donde se busca —se busca al abrir la app de noche, o
 * al mirar el historial en una terraza a mediodía—.
 *
 * Se enchufa él solo al tema (`estado/tema.ts`), sin props que atravesar: así
 * cualquier pantalla nueva lo tiene sin acordarse de nada.
 */
export function BotonTema() {
  const { oscuro, alternar } = useTema()

  return (
    <button
      type="button"
      className={estilos.tema}
      onClick={alternar}
      aria-label={oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
    >
      {oscuro ? <IconoSol /> : <IconoLuna />}
    </button>
  )
}

function IconoLuna() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconoSol() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}
