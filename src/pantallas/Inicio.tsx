import { Boton } from '../componentes/Boton.tsx'
import { MesaVacia } from '../componentes/Ilustraciones.tsx'
import { estadosDePartida, type Partida } from '../dominio/index.ts'
import estilos from './Inicio.module.css'

interface Props {
  partida: Partida | null
  numTerminadas: number
  onContinuar: () => void
  onNueva: () => void
  onHistorial: () => void
}

export function Inicio({ partida, numTerminadas, onContinuar, onNueva, onHistorial }: Props) {
  return (
    <div className={estilos.inicio}>
      <header className={estilos.rotulo}>
        <h1 className={estilos.titulo}>
          <span className={estilos.la}>La</span>
          <span className={estilos.cuenta}>Cuenta</span>
        </h1>
        <p className={estilos.subtitulo}>Marcador de partidas</p>
      </header>

      <div className={estilos.acciones}>
        {partida ? (
          <>
            <Boton variante="primario" bloque onClick={onContinuar}>
              Continuar partida
            </Boton>
            <p className={estilos.detalle}>
              {partida.jugadores.length} jugadores · ronda {partida.rondas.length + 1} ·{' '}
              <span className="cifra">{lider(partida)}</span>
            </p>
          </>
        ) : (
          <MesaVacia>No hay ninguna partida abierta. Sentaos y pedid algo.</MesaVacia>
        )}

        <Boton variante={partida ? 'secundario' : 'primario'} bloque onClick={onNueva}>
          Nueva partida
        </Boton>

        <Boton variante="fantasma" bloque onClick={onHistorial} disabled={numTerminadas === 0}>
          {numTerminadas === 0
            ? 'Sin partidas terminadas'
            : `Historial (${numTerminadas} ${numTerminadas === 1 ? 'partida' : 'partidas'})`}
        </Boton>
      </div>
    </div>
  )
}

function lider(partida: Partida): string {
  const estados = estadosDePartida(partida)
  const mejor = estados.reduce((a, b) => (b.ahorros > a.ahorros ? b : a))
  return `va ${mejor.nombre} con ${mejor.ahorros} €`
}
