import type { ReactNode } from 'react'
import estilos from './Ticket.module.css'

interface TicketProps {
  titulo: string
  nota?: string
  children: ReactNode
}

export function Ticket({ titulo, nota, children }: TicketProps) {
  return (
    <div className={estilos.envoltorio}>
      <div className={estilos.dentadoSuperior} aria-hidden="true" />
      <div className={estilos.cuerpo}>
        <div className={estilos.encabezado}>{titulo}</div>
        {children}
        {nota ? <div className={estilos.nota}>{nota}</div> : null}
      </div>
      <div className={estilos.dentadoInferior} aria-hidden="true" />
    </div>
  )
}

interface LineaProps {
  concepto: ReactNode
  importe: ReactNode
  destacada?: boolean
  tenue?: boolean
}

export function LineaTicket({ concepto, importe, destacada, tenue }: LineaProps) {
  const clases = [estilos.linea, destacada ? estilos.destacada : '', tenue ? estilos.tenue : '']
    .filter(Boolean)
    .join(' ')

  return (
    <div className={clases}>
      <span className={estilos.etiqueta}>{concepto}</span>
      <span className={estilos.puntos} aria-hidden="true" />
      <span className={estilos.valor}>{importe}</span>
    </div>
  )
}

export function SeparadorTicket() {
  return <div className={estilos.separador} aria-hidden="true" />
}
