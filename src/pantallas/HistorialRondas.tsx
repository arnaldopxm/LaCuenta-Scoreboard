import { useState } from 'react'
import { Boton } from '../componentes/Boton.tsx'
import { CuentaVacia } from '../componentes/Ilustraciones.tsx'
import { Pantalla } from '../componentes/Pantalla.tsx'
import {
  calcularCuenta,
  calcularPagos,
  estadosTrasCadaRonda,
  type Partida,
  type Reparto,
  type Ronda,
} from '../dominio/index.ts'
import estilos from './HistorialRondas.module.css'

interface Props {
  partida: Partida
  onAtras: () => void
  onEditar: (ronda: Ronda) => void
  onBorrar: (rondaId: string) => void
}

export function HistorialRondas({ partida, onAtras, onEditar, onBorrar }: Props) {
  const [confirmando, setConfirmando] = useState<string | null>(null)
  const instantaneas = estadosTrasCadaRonda(partida)
  const nombreDe = (id: string) => partida.jugadores.find((j) => j.id === id)?.nombre ?? '¿?'

  if (partida.rondas.length === 0) {
    return (
      <Pantalla titulo="Historial" onAtras={onAtras}>
        <CuentaVacia>Aún no se ha cerrado ninguna ronda.</CuentaVacia>
      </Pantalla>
    )
  }

  return (
    <Pantalla titulo="Historial" onAtras={onAtras}>
      <p className={estilos.intro}>
        Cualquier ronda se puede corregir o borrar. Las posteriores se recalculan solas.
      </p>

      <ul className={estilos.lista}>
        {partida.rondas.map((ronda, indice) => {
          const cuenta = calcularCuenta(ronda.totalCartas, ronda.propina)
          const pagos = calcularPagos(ronda)
          const tras = instantaneas[indice] ?? []
          const borrando = confirmando === ronda.id

          return (
            <li key={ronda.id} className={estilos.tarjeta}>
              <div className={estilos.cabecera}>
                <span className={estilos.indice}>{indice + 1}</span>
                <div className={estilos.titular}>
                  <span className={estilos.pagador}>{nombreDe(ronda.pagadorId)}</span>
                  <span className={estilos.modo}>{describirReparto(ronda.reparto, nombreDe)}</span>
                </div>
                <span className={`${estilos.importe} cifra`}>{cuenta} €</span>
              </div>

              <div className={estilos.detalles}>
                {ronda.propina > 0 ? (
                  <span className={estilos.etiqueta}>
                    Propina <span className="cifra">{ronda.propina} €</span>
                  </span>
                ) : null}
                {ronda.aumentoMano ? <span className={estilos.etiqueta}>+1 mano</span> : null}
                {pagos.map((pago) => (
                  <span key={pago.jugadorId} className={estilos.pago}>
                    {nombreDe(pago.jugadorId)} <span className="cifra">−{pago.importe} €</span>
                  </span>
                ))}
              </div>

              <div className={estilos.estadoTras}>
                {tras.map((estado) => (
                  <span key={estado.jugadorId} className="cifra">
                    {estado.nombre} <span className={estilos.saldo}>{estado.ahorros} €</span>
                  </span>
                ))}
              </div>

              {borrando ? (
                <div className={estilos.confirmacion}>
                  <span>¿Borrar esta ronda?</span>
                  <div className={estilos.botonesConfirmacion}>
                    <Boton variante="fantasma" onClick={() => setConfirmando(null)}>
                      No
                    </Boton>
                    <Boton
                      variante="peligro"
                      onClick={() => {
                        setConfirmando(null)
                        onBorrar(ronda.id)
                      }}
                    >
                      Sí, borrar
                    </Boton>
                  </div>
                </div>
              ) : (
                <div className={estilos.acciones}>
                  <Boton variante="secundario" onClick={() => onEditar(ronda)}>
                    Corregir
                  </Boton>
                  <Boton variante="fantasma" onClick={() => setConfirmando(ronda.id)}>
                    Borrar
                  </Boton>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </Pantalla>
  )
}

function describirReparto(reparto: Reparto, nombreDe: (id: string) => string): string {
  switch (reparto.tipo) {
    case 'normal':
      return 'Pagó la cuenta entera'
    case 'a-medias':
      return `A medias con ${nombreDe(reparto.coPagadorId)}`
    case 'a-pachas':
      return `A pachas entre ${reparto.participantesIds.length}`
  }
}
