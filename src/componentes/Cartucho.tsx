import type { ReactNode } from 'react'
import estilos from './Cartucho.module.css'

interface Props {
  children: ReactNode
  grande?: boolean
  sobrePizarra?: boolean
  como?: 'h1' | 'h2' | 'h3'
}

export function Cartucho({ children, grande = false, sobrePizarra = false, como = 'h2' }: Props) {
  const Etiqueta = como
  const clases = [
    estilos.cartucho,
    grande ? estilos.grande : '',
    sobrePizarra ? estilos.sobrePizarra : '',
  ]
    .filter(Boolean)
    .join(' ')

  return <Etiqueta className={clases}>{children}</Etiqueta>
}
