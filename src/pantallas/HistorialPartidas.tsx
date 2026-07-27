import { useState } from 'react'
import { Boton } from '../componentes/Boton.tsx'
import { ArchivoVacio } from '../componentes/Ilustraciones.tsx'
import { Pantalla } from '../componentes/Pantalla.tsx'
import { clasificar, type Partida } from '../dominio/index.ts'
import estilos from './HistorialPartidas.module.css'

interface Props {
  partidas: Partida[]
  onAtras: () => void
  onVer: (partida: Partida) => void
  onBorrar: (id: string) => void
}

export function HistorialPartidas({ partidas, onAtras, onVer, onBorrar }: Props) {
  const [confirmando, setConfirmando] = useState<string | null>(null)

  return (
    <Pantalla titulo="Historial" onAtras={onAtras}>
      {partidas.length === 0 ? (
        <ArchivoVacio>Todavía no habéis terminado ninguna partida.</ArchivoVacio>
      ) : (
        <ul className={estilos.lista}>
          {partidas.map((partida) => {
            const { puestos } = clasificar(partida)
            const ganadorId = partida.ganadorId
            const ganador = puestos.find((p) => p.jugadorId === ganadorId)
            const borrando = confirmando === partida.id

            return (
              <li key={partida.id} className={estilos.tarjeta}>
                <button type="button" className={estilos.resumen} onClick={() => onVer(partida)}>
                  <span className={estilos.fecha}>
                    {new Date(partida.fechaInicio).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                  <span className={estilos.ganador}>
                    {ganador ? ganador.nombre : 'Empate sin resolver'}
                  </span>
                  <span className={estilos.datos}>
                    {partida.jugadores.length} jugadores · {partida.rondas.length}{' '}
                    {partida.rondas.length === 1 ? 'ronda' : 'rondas'}
                    {ganador ? (
                      <>
                        {' · '}
                        <span className="cifra">{ganador.ahorros} €</span>
                      </>
                    ) : null}
                  </span>
                </button>

                {borrando ? (
                  <div className={estilos.confirmacion}>
                    <span>¿Borrarla del historial?</span>
                    <div className={estilos.botones}>
                      <Boton variante="fantasma" onClick={() => setConfirmando(null)}>
                        No
                      </Boton>
                      <Boton
                        variante="peligro"
                        onClick={() => {
                          setConfirmando(null)
                          onBorrar(partida.id)
                        }}
                      >
                        Sí, borrar
                      </Boton>
                    </div>
                  </div>
                ) : (
                  <Boton variante="fantasma" bloque onClick={() => setConfirmando(partida.id)}>
                    Borrar
                  </Boton>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </Pantalla>
  )
}
