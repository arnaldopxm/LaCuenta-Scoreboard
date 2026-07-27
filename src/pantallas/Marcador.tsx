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
  onAlternarTema: () => void
  oscuro: boolean
}

export function Marcador({
  partida,
  onCerrarRonda,
  onHistorial,
  onDeshacer,
  onSalir,
  onAlternarTema,
  oscuro,
}: Props) {
  // El orden es siempre el de la mesa: nunca se reordena por dinero, que la
  // posición baile confunde más que ayuda.
  const estados = estadosDePartida(partida)
  const rondas = partida.rondas.length

  return (
    <Pantalla
      titulo={`Ronda ${rondas + 1}`}
      onAtras={onSalir}
      acciones={
        <button
          type="button"
          className={estilos.tema}
          onClick={onAlternarTema}
          aria-label={oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        >
          {oscuro ? <IconoSol /> : <IconoLuna />}
        </button>
      }
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

function IconoLuna() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconoSol() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}
