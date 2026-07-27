import type { ReactNode } from 'react'
import { Cartucho } from './Cartucho.tsx'
import estilos from './Pizarra.module.css'

interface Props {
  titulo: string
  children: ReactNode
  pie?: ReactNode
}

export function Pizarra({ titulo, children, pie }: Props) {
  return (
    <section className={estilos.pizarra}>
      <div className={estilos.cabecera}>
        <Cartucho como="h3" sobrePizarra>
          {titulo}
        </Cartucho>
      </div>
      {children}
      {pie ? <p className={estilos.pie}>{pie}</p> : null}
    </section>
  )
}
