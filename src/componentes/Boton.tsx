import type { ButtonHTMLAttributes, ReactNode } from 'react'
import estilos from './Boton.module.css'

type Variante = 'primario' | 'secundario' | 'fantasma' | 'peligro' | 'pizarra'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante
  bloque?: boolean
  children: ReactNode
}

export function Boton({ variante = 'secundario', bloque = false, children, ...resto }: Props) {
  const clases = [estilos.boton, estilos[variante], bloque ? estilos.bloque : '']
    .filter(Boolean)
    .join(' ')

  return (
    <button type="button" className={clases} {...resto}>
      {children}
    </button>
  )
}
