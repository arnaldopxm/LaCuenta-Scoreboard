import { Boton } from '../componentes/Boton.tsx'
import { FilaJugador } from '../componentes/FilaJugador.tsx'
import { Pantalla } from '../componentes/Pantalla.tsx'
import { SelectorJugador } from '../componentes/Controles.tsx'
import { clasificar, type Partida } from '../dominio/index.ts'
import estilos from './FinPartida.module.css'

interface Props {
  partida: Partida
  onDesempatar: (ganadorId: string) => void
  /** No se ofrece al consultar una partida archivada. */
  onHistorialRondas?: () => void
  onCerrar: () => void
  /** En modo consulta desde el historial no se puede tocar nada. */
  soloLectura?: boolean
}

export function FinPartida({
  partida,
  onDesempatar,
  onHistorialRondas,
  onCerrar,
  soloLectura = false,
}: Props) {
  const { puestos, empatadosIds, requiereDesempate } = clasificar(partida)
  const ganadorId = partida.ganadorId ?? null
  const empatados = partida.jugadores.filter((j) => empatadosIds.includes(j.id))
  const faltaDesempate = requiereDesempate && ganadorId === null

  const ganador = puestos.find((p) => p.jugadorId === ganadorId)

  return (
    <Pantalla
      titulo="Fin de partida"
      onAtras={onCerrar}
      pie={
        <>
          {onHistorialRondas ? (
            <Boton variante="fantasma" bloque onClick={onHistorialRondas}>
              Ver las rondas
            </Boton>
          ) : null}
          <Boton variante="primario" bloque onClick={onCerrar}>
            {soloLectura ? 'Volver' : 'Guardar y salir'}
          </Boton>
        </>
      }
    >
      {faltaDesempate && !soloLectura ? (
        <section className={estilos.desempate}>
          <h2 className={estilos.tituloDesempate}>Empate a {puestos[0]?.ahorros ?? 0} €</h2>
          <p className={estilos.explicacion}>
            Las reglas lo resuelven mirando quién lleva más dinero encima en la vida real. Eso la
            app no lo sabe: contadlo y decidid vosotros.
          </p>
          <SelectorJugador
            etiqueta="Ganador del desempate"
            jugadores={empatados}
            elegidoId={null}
            onElegir={onDesempatar}
            // El bloque de desempate es pizarra: sin esto las fichas saldrían
            // en papel crema con el texto crema heredado, o sea en blanco.
            enPizarra
          />
        </section>
      ) : null}

      {faltaDesempate && soloLectura ? (
        <p className={estilos.explicacion}>Esta partida quedó en empate sin resolver.</p>
      ) : null}

      {ganador ? (
        <section className={estilos.banda}>
          <span className={estilos.gana}>Gana</span>
          <span className={estilos.nombreGanador}>{ganador.nombre}</span>
          <span className={`${estilos.dineroGanador} cifra`}>{ganador.ahorros} €</span>
        </section>
      ) : null}

      <ul className={estilos.lista}>
        {puestos.map((estado, indice) => (
          <li key={estado.jugadorId}>
            <FilaJugador estado={estado} puesto={indice + 1} />
          </li>
        ))}
      </ul>

      <p className={estilos.pie}>
        {partida.rondas.length} {partida.rondas.length === 1 ? 'ronda' : 'rondas'} ·{' '}
        {new Date(partida.fechaInicio).toLocaleDateString('es-ES', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}
      </p>
    </Pantalla>
  )
}
