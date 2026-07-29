import { Boton } from '../componentes/Boton.tsx'
import { BotonTema } from '../componentes/BotonTema.tsx'
import { MesaVacia } from '../componentes/Ilustraciones.tsx'
import { estadosDePartida, type Partida } from '../dominio/index.ts'
import estilos from './Inicio.module.css'

interface Props {
  partida: Partida | null
  numTerminadas: number
  /** Versión que sirve el service worker, o null si aún no se sabe. */
  version: string | null
  onContinuar: () => void
  onNueva: () => void
  onHistorial: () => void
  /** Sin definir cuando ya está instalada: entonces no hay nada que ofrecer. */
  onInstalar?: () => void
}

export function Inicio({
  partida,
  numTerminadas,
  version,
  onContinuar,
  onNueva,
  onHistorial,
  onInstalar,
}: Props) {
  return (
    <div className={estilos.inicio}>
      {/* El inicio no usa `Pantalla`, así que aquí el tema se pone a mano. */}
      <div className={estilos.chrome}>
        <BotonTema />
      </div>

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

      {/*
        Acceso discreto a cómo instalar, y solo si no lo está: el encargo pedía
        que no hubiera prompt intrusivo, así que esto no insiste ni aparece solo.
        Desaparece en cuanto la app está instalada.
      */}
      {onInstalar ? (
        <p className={estilos.instalar}>
          <button type="button" className={estilos.enlace} onClick={onInstalar}>
            Instalar en el móvil
          </button>
        </p>
      ) : null}

      {/*
        La versión, en pequeño. No es decoración: es lo primero que hay que
        preguntar cuando algo va raro en una terraza. En desarrollo no hay
        service worker que la sirva, así que no sale nada.
      */}
      {version ? (
        <p className={estilos.version}>
          Versión <span className="cifra">{version}</span>
        </p>
      ) : null}
    </div>
  )
}

function lider(partida: Partida): string {
  const estados = estadosDePartida(partida)
  const mejor = estados.reduce((a, b) => (b.ahorros > a.ahorros ? b : a))
  return `va ${mejor.nombre} con ${mejor.ahorros} €`
}
