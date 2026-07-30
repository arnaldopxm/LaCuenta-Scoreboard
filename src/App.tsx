import { AvisoActualizacion } from './componentes/AvisoActualizacion.tsx'
import type { BorradorRonda } from './dominio/index.ts'
import { useNavegacion } from './estado/useNavegacion.ts'
import { usePartida } from './estado/usePartida.ts'
import { CerrarRonda } from './pantallas/CerrarRonda.tsx'
import { Dudas } from './pantallas/Dudas.tsx'
import { FinPartida } from './pantallas/FinPartida.tsx'
import { HistorialPartidas } from './pantallas/HistorialPartidas.tsx'
import { HistorialRondas } from './pantallas/HistorialRondas.tsx'
import { Inicio } from './pantallas/Inicio.tsx'
import { Instalar } from './pantallas/Instalar.tsx'
import { Marcador } from './pantallas/Marcador.tsx'
import { NuevaPartida } from './pantallas/NuevaPartida.tsx'
import { useInstalacion } from './pwa/useInstalacion.ts'
import { useVersion } from './pwa/useVersion.ts'
import estilos from './App.module.css'

/**
 * Navegación por pila sobre el historial del navegador: sin router ni URLs,
 * pero con el botón físico de atrás funcionando. Ver `useNavegacion`.
 */
type Vista =
  | { nombre: 'inicio' }
  | { nombre: 'nueva' }
  | { nombre: 'marcador' }
  | { nombre: 'cerrar'; rondaId?: string }
  | { nombre: 'rondas' }
  | { nombre: 'archivo' }
  | { nombre: 'ver'; partidaId: string }
  | { nombre: 'instalar' }
  | { nombre: 'dudas' }

const INICIO: Vista = { nombre: 'inicio' }

export function App() {
  const control = usePartida()
  const { vista, ir, volver, reemplazar, reiniciar } = useNavegacion<Vista>(INICIO)
  const version = useVersion()
  const { instalada } = useInstalacion()

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
    const archivo = (
      <HistorialPartidas
        partidas={terminadas}
        onAtras={volver}
        onVer={(elegida) => ir({ nombre: 'ver', partidaId: elegida.id })}
        onBorrar={(id) => void control.borrarDelHistorial(id)}
      />
    )
    const inicio = (
      <Inicio
        partida={partida}
        numTerminadas={terminadas.length}
        version={version}
        onContinuar={() => ir({ nombre: 'marcador' })}
        onNueva={() => ir({ nombre: 'nueva' })}
        onHistorial={() => ir({ nombre: 'archivo' })}
        onDudas={() => ir({ nombre: 'dudas' })}
        // Instalada no se ofrece instalar: sería insistir con algo hecho.
        onInstalar={instalada ? undefined : () => ir({ nombre: 'instalar' })}
      />
    )

    switch (vista.nombre) {
      case 'inicio':
        return inicio

      case 'nueva':
        return (
          <NuevaPartida
            onAtras={volver}
            onCrear={async (nombres) => {
              await control.nueva(nombres)
              // Sustituye al formulario: volver atrás desde el marcador tiene
              // que llevar al inicio, no a crear otra partida encima.
              reemplazar({ nombre: 'marcador' })
            }}
          />
        )

      case 'archivo':
        return archivo

      case 'instalar':
        return <Instalar onAtras={volver} />

      case 'dudas':
        return <Dudas onAtras={volver} />


      case 'ver': {
        const guardada = terminadas.find((p) => p.id === vista.partidaId)
        // Si se ha borrado mientras se miraba, el archivo sigue siendo válido.
        if (!guardada) return archivo
        return (
          <FinPartida
            partida={guardada}
            soloLectura
            onDesempatar={() => undefined}
            onCerrar={volver}
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
              onHistorialRondas={() => ir({ nombre: 'rondas' })}
              onCerrar={async () => {
                await control.archivar()
                reiniciar(INICIO)
              }}
            />
          )
        }

        if (vista.nombre === 'rondas') {
          return (
            <HistorialRondas
              partida={partida}
              onAtras={volver}
              onEditar={(ronda) => ir({ nombre: 'cerrar', rondaId: ronda.id })}
              onBorrar={(rondaId) => void control.borrarRonda(rondaId)}
            />
          )
        }

        if (vista.nombre === 'cerrar') {
          const rondaId = vista.rondaId
          const rondaEditada = rondaId ? partida.rondas.find((r) => r.id === rondaId) : undefined

          return (
            <CerrarRonda
              partida={partida}
              rondaEditada={rondaEditada}
              onAtras={volver}
              onConfirmar={async (borrador: BorradorRonda) => {
                if (rondaId) {
                  await control.editarRonda(rondaId, borrador)
                } else {
                  await control.cerrarRonda(borrador)
                }
                // Se sale igual que con el botón de atrás: al historial si se
                // venía de corregir, al marcador si era una ronda nueva.
                volver()
              }}
            />
          )
        }

        return (
          <Marcador
            partida={partida}
            onCerrarRonda={() => ir({ nombre: 'cerrar' })}
            onHistorial={() => ir({ nombre: 'rondas' })}
            onDeshacer={() => void control.deshacer()}
            onSalir={volver}
          />
        )
      }
    }
  }
}
