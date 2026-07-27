import { useCallback, useEffect, useRef, useState } from 'react'
import {
  anadirRonda,
  borrarRonda as borrarRondaDominio,
  crearPartida,
  deshacerUltimaRonda,
  editarRonda as editarRondaDominio,
  resolverDesempate,
  type BorradorRonda,
  type Partida,
} from '../dominio/index.ts'
import { repositorio } from '../persistencia/repositorioPartidas.ts'

/**
 * Puente entre el dominio puro y React.
 *
 * Aquí no se calcula nada: solo se aplica una mutación del dominio, se guarda
 * el resultado en IndexedDB y se refresca el estado de la interfaz. Los ahorros
 * siguen sin existir como dato guardado.
 */
export function usePartida() {
  const [cargando, setCargando] = useState(true)
  const [partida, setPartida] = useState<Partida | null>(null)
  const [terminadas, setTerminadas] = useState<Partida[]>([])
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null)

  // Evita pisar el estado si el componente se desmonta a media escritura.
  const montado = useRef(true)
  useEffect(() => {
    montado.current = true
    return () => {
      montado.current = false
    }
  }, [])

  const recargar = useCallback(async () => {
    const [enCurso, cerradas] = await Promise.all([repositorio.enCurso(), repositorio.terminadas()])
    if (!montado.current) return
    setPartida(enCurso)
    setTerminadas(cerradas)
    setCargando(false)
  }, [])

  useEffect(() => {
    void recargar()
  }, [recargar])

  /**
   * Guarda primero y actualiza la pantalla después. Si IndexedDB falla, la
   * interfaz no puede quedarse enseñando algo que no está en disco.
   */
  const persistir = useCallback(async (siguiente: Partida) => {
    try {
      await repositorio.guardar(siguiente)
      if (!montado.current) return
      setPartida(siguiente)
      setErrorGuardado(null)
      // Una partida recién cerrada tiene que aparecer ya en el historial.
      if (siguiente.estado === 'terminada') {
        setTerminadas(await repositorio.terminadas())
      }
    } catch (error) {
      if (!montado.current) return
      setErrorGuardado(
        'No se ha podido guardar en el dispositivo. Comprueba que quede espacio libre.',
      )
      throw error
    }
  }, [])

  const aplicar = useCallback(
    async (transformar: (actual: Partida) => Partida) => {
      if (!partida) return
      await persistir(transformar(partida))
    },
    [partida, persistir],
  )

  const nueva = useCallback(
    async (nombres: string[]) => {
      const creada = crearPartida(nombres)
      await persistir(creada)
      return creada
    },
    [persistir],
  )

  const cerrarRonda = useCallback(
    (borrador: BorradorRonda) => aplicar((actual) => anadirRonda(actual, borrador)),
    [aplicar],
  )

  const editarRonda = useCallback(
    (rondaId: string, borrador: BorradorRonda) =>
      aplicar((actual) => editarRondaDominio(actual, rondaId, borrador)),
    [aplicar],
  )

  const borrarRonda = useCallback(
    (rondaId: string) => aplicar((actual) => borrarRondaDominio(actual, rondaId)),
    [aplicar],
  )

  const deshacer = useCallback(
    () => aplicar((actual) => deshacerUltimaRonda(actual)),
    [aplicar],
  )

  const desempatar = useCallback(
    (ganadorId: string) => aplicar((actual) => resolverDesempate(actual, ganadorId)),
    [aplicar],
  )

  /** Tira la partida en curso sin guardarla en el historial. */
  const abandonar = useCallback(async () => {
    if (!partida) return
    await repositorio.borrar(partida.id)
    if (!montado.current) return
    setPartida(null)
  }, [partida])

  /** Cierra la partida terminada y vuelve al inicio dejándola en el historial. */
  const archivar = useCallback(async () => {
    if (!montado.current) return
    setPartida(null)
    setTerminadas(await repositorio.terminadas())
  }, [])

  const borrarDelHistorial = useCallback(async (id: string) => {
    await repositorio.borrar(id)
    if (!montado.current) return
    setTerminadas(await repositorio.terminadas())
  }, [])

  return {
    cargando,
    partida,
    terminadas,
    errorGuardado,
    nueva,
    cerrarRonda,
    editarRonda,
    borrarRonda,
    deshacer,
    desempatar,
    abandonar,
    archivar,
    borrarDelHistorial,
    recargar,
  }
}

export type ControlPartida = ReturnType<typeof usePartida>
