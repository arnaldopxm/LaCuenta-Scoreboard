import type { ReactNode } from 'react'
import { BotonTema } from './BotonTema.tsx'
import { Cartucho } from './Cartucho.tsx'
import estilos from './Pantalla.module.css'

interface Props {
  titulo: string
  children: ReactNode
  onAtras?: () => void
  pie?: ReactNode
  tituloGrande?: boolean
}

export function Pantalla({ titulo, children, onAtras, pie, tituloGrande }: Props) {
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
        {/*
          El tema, en toda pantalla que use esta cabecera. Antes era una acción
          que pasaba el marcador, así que fuera de la partida no había forma de
          cambiarlo.
        */}
        <BotonTema />
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
