import { useState } from 'react'
import { AvisoActualizacion } from './componentes/AvisoActualizacion.tsx'
import type { BorradorRonda } from './dominio/index.ts'
import { usePartida } from './estado/usePartida.ts'
import { useTema } from './estado/useTema.ts'
import { CerrarRonda } from './pantallas/CerrarRonda.tsx'
import { FinPartida } from './pantallas/FinPartida.tsx'
import { HistorialPartidas } from './pantallas/HistorialPartidas.tsx'
import { HistorialRondas } from './pantallas/HistorialRondas.tsx'
import { Inicio } from './pantallas/Inicio.tsx'
import { Marcador } from './pantallas/Marcador.tsx'
import { NuevaPartida } from './pantallas/NuevaPartida.tsx'
import estilos from './App.module.css'

/**
 * Navegación por estado interno, sin router ni URLs: son siete pantallas y el
 * móvil se pasa de mano en mano, así que cada una lleva su propio botón de
 * volver bien visible.
 */
type Vista =
  | { nombre: 'inicio' }
  | { nombre: 'nueva' }
  | { nombre: 'marcador' }
  | { nombre: 'cerrar'; rondaId?: string }
  | { nombre: 'rondas' }
  | { nombre: 'archivo' }
  | { nombre: 'ver'; partidaId: string }

export function App() {
  const control = usePartida()
  const { alternar, oscuro } = useTema()
  const [vista, setVista] = useState<Vista>({ nombre: 'inicio' })

  const { partida, terminadas, cargando, errorGuardado } = control

  if (cargando) {
    return <div className={estilos.cargando}>Poniendo la mesa…</div>
  }

  return (
    <>
      {errorGuardado ? <p className={estilos.errorGuardado}>{errorGuardado}</p> : null}
      <AvisoActualizacion />
      <Pantallas />
    </>
  )

  function Pantallas() {
    const alInicio = () => setVista({ nombre: 'inicio' })
    const inicio = (
      <Inicio
        partida={partida}
        numTerminadas={terminadas.length}
        onContinuar={() => setVista({ nombre: 'marcador' })}
        onNueva={() => setVista({ nombre: 'nueva' })}
        onHistorial={() => setVista({ nombre: 'archivo' })}
      />
    )

    switch (vista.nombre) {
      case 'inicio':
        return inicio

      case 'nueva':
        return (
          <NuevaPartida
            onAtras={alInicio}
            onCrear={async (nombres) => {
              await control.nueva(nombres)
              setVista({ nombre: 'marcador' })
            }}
          />
        )

      case 'archivo':
        return (
          <HistorialPartidas
            partidas={terminadas}
            onAtras={alInicio}
            onVer={(elegida) => setVista({ nombre: 'ver', partidaId: elegida.id })}
            onBorrar={(id) => void control.borrarDelHistorial(id)}
          />
        )

      case 'ver': {
        const guardada = terminadas.find((p) => p.id === vista.partidaId)
        // Si se ha borrado desde otra pestaña, el archivo sigue siendo válido.
        if (!guardada) {
          return (
            <HistorialPartidas
              partidas={terminadas}
              onAtras={alInicio}
              onVer={(elegida) => setVista({ nombre: 'ver', partidaId: elegida.id })}
              onBorrar={(id) => void control.borrarDelHistorial(id)}
            />
          )
        }
        return (
          <FinPartida
            partida={guardada}
            soloLectura
            onDesempatar={() => undefined}
            onCerrar={() => setVista({ nombre: 'archivo' })}
          />
        )
      }

      case 'marcador':
      case 'cerrar':
      case 'rondas': {
        // Sin partida abierta no hay nada que enseñar: se cae al inicio.
        if (!partida) return inicio

        // Una partida terminada no admite más rondas. El historial sí se puede
        // seguir consultando y corrigiendo, que es como se reabre si hubo un
        // error de tecleo.
        if (partida.estado === 'terminada' && vista.nombre !== 'rondas') {
          return (
            <FinPartida
              partida={partida}
              onDesempatar={(ganadorId) => void control.desempatar(ganadorId)}
              onHistorialRondas={() => setVista({ nombre: 'rondas' })}
              onCerrar={async () => {
                await control.archivar()
                alInicio()
              }}
            />
          )
        }

        if (vista.nombre === 'rondas') {
          return (
            <HistorialRondas
              partida={partida}
              onAtras={() => setVista({ nombre: 'marcador' })}
              onEditar={(ronda) => setVista({ nombre: 'cerrar', rondaId: ronda.id })}
              onBorrar={(rondaId) => void control.borrarRonda(rondaId)}
            />
          )
        }

        if (vista.nombre === 'cerrar') {
          const rondaEditada = vista.rondaId
            ? partida.rondas.find((r) => r.id === vista.rondaId)
            : undefined
          const volverA: Vista = { nombre: vista.rondaId ? 'rondas' : 'marcador' }
          const rondaId = vista.rondaId

          return (
            <CerrarRonda
              partida={partida}
              rondaEditada={rondaEditada}
              onAtras={() => setVista(volverA)}
              onConfirmar={async (borrador: BorradorRonda) => {
                if (rondaId) {
                  await control.editarRonda(rondaId, borrador)
                  setVista({ nombre: 'rondas' })
                } else {
                  await control.cerrarRonda(borrador)
                  setVista({ nombre: 'marcador' })
                }
              }}
            />
          )
        }

        return (
          <Marcador
            partida={partida}
            oscuro={oscuro}
            onAlternarTema={alternar}
            onCerrarRonda={() => setVista({ nombre: 'cerrar' })}
            onHistorial={() => setVista({ nombre: 'rondas' })}
            onDeshacer={() => void control.deshacer()}
            onSalir={alInicio}
          />
        )
      }
    }
  }
}
