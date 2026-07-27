import type { ReactNode } from 'react'
import { Cartucho } from './Cartucho.tsx'
import estilos from './Pantalla.module.css'

interface Props {
  titulo: string
  children: ReactNode
  onAtras?: () => void
  acciones?: ReactNode
  pie?: ReactNode
  tituloGrande?: boolean
}

export function Pantalla({ titulo, children, onAtras, acciones, pie, tituloGrande }: Props) {
  return (
    <div className={estilos.pantalla}>
      <header className={estilos.cabecera}>
        {onAtras ? (
          <button type="button" className={estilos.atras} onClick={onAtras} aria-label="Volver">
            <FlechaAtras />
          </button>
        ) : null}
        <div className={estilos.tituloZona}>
          <Cartucho como="h1" grande={tituloGrande}>
            {titulo}
          </Cartucho>
        </div>
        {acciones ? <div className={estilos.acciones}>{acciones}</div> : null}
      </header>

      <main className={estilos.contenido}>{children}</main>

      {pie ? <div className={estilos.pie}>{pie}</div> : null}
    </div>
  )
}

function FlechaAtras() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M15 4 L7 12 L15 20"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
