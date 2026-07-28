import { Boton } from '../componentes/Boton.tsx'
import { FilaJugador } from '../componentes/FilaJugador.tsx'
import { Pantalla } from '../componentes/Pantalla.tsx'
import { estadosDePartida, type Partida } from '../dominio/index.ts'
import estilos from './Marcador.module.css'

interface Props {
  partida: Partida
  onCerrarRonda: () => void
  onHistorial: () => void
  onDeshacer: () => void
  onSalir: () => void
}

export function Marcador({
  partida,
  onCerrarRonda,
  onHistorial,
  onDeshacer,
  onSalir,
}: Props) {
  // El orden es siempre el de la mesa: nunca se reordena por dinero, que la
  // posición baile confunde más que ayuda.
  const estados = estadosDePartida(partida)
  const rondas = partida.rondas.length

  return (
    <Pantalla
      titulo={`Ronda ${rondas + 1}`}
      onAtras={onSalir}
      pie={
        <>
          <Boton variante="primario" bloque onClick={onCerrarRonda}>
            Cerrar ronda
          </Boton>
          <div className={estilos.secundarias}>
            <Boton variante="fantasma" onClick={onHistorial} disabled={rondas === 0}>
              Historial
            </Boton>
            <Boton variante="fantasma" onClick={onDeshacer} disabled={rondas === 0}>
              Deshacer última
            </Boton>
          </div>
        </>
      }
    >
      <ul className={estilos.lista}>
        {estados.map((estado) => (
          <li key={estado.jugadorId}>
            <FilaJugador estado={estado} />
          </li>
        ))}
      </ul>

      <p className={estilos.resumen}>
        {rondas === 0
          ? 'Todavía no ha pagado nadie.'
          : `${rondas} ${rondas === 1 ? 'bar' : 'bares'} · ${totalGastado(partida)} € gastados entre todos`}
      </p>
    </Pantalla>
  )
}

function totalGastado(partida: Partida): number {
  const inicial = estadosDePartida({ ...partida, rondas: [] })
  const ahora = estadosDePartida(partida)
  return inicial.reduce((total, estado, indice) => total + estado.ahorros - ahora[indice]!.ahorros, 0)
}
