import { MAX_JUGADORES, MIN_JUGADORES } from './reglas.ts'
import type { Partida, Reparto, Ronda } from './tipos.ts'

export const MAX_LONGITUD_NOMBRE = 20

/** Techo defensivo al teclear importes. Nadie cena por 100.000 €. */
export const MAX_IMPORTE = 99_999

/**
 * Limpia un nombre tecleado a mano.
 *
 * React ya escapa al renderizar, así que esto no va de XSS: va de que un nombre
 * con saltos de línea, caracteres de control o 300 caracteres no reviente la
 * fila del marcador. La entrada es local, pero local no es sinónimo de fiable.
 */
export function sanearNombre(entrada: string): string {
  return Array.from(entrada)
    .map((caracter) => {
      const codigo = caracter.codePointAt(0) ?? 0
      // Controles C0 y C1 (saltos de línea, tabuladores...) pasan a ser un
      // espacio en vez de desaparecer: si no, "Ana\nMaría" quedaría "AnaMaría".
      const esControl = codigo < 0x20 || (codigo >= 0x7f && codigo <= 0x9f)
      return esControl ? ' ' : caracter
    })
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_LONGITUD_NOMBRE)
}

/**
 * Importes que no pueden bajar de cero: la propina y lo que paga cada jugador.
 * La propina es el precio de una tapa, y un precio no es negativo.
 */
export function esImporteValido(valor: unknown): valor is number {
  return (
    typeof valor === 'number' &&
    Number.isSafeInteger(valor) &&
    valor >= 0 &&
    valor <= MAX_IMPORTE
  )
}

/**
 * Importes que SÍ pueden ser negativos: las cartas de la mesa y el total que
 * suman.
 *
 * Un plato quemado resta (−10, −30...), así que tanto una carta como el total
 * de las cartas pueden salir por debajo de cero. Es de donde viene el importe
 * de cuenta negativo que el reglamento contempla, y por eso `calcularCuenta`
 * remata con `max(0, ...)`: la propina se suma ANTES de ese corte, o el
 * resultado no cuadra.
 */
export function esImporteConSigno(valor: unknown): valor is number {
  return (
    typeof valor === 'number' &&
    Number.isSafeInteger(valor) &&
    valor >= -MAX_IMPORTE &&
    valor <= MAX_IMPORTE
  )
}

/**
 * Convierte lo tecleado en un importe no negativo.
 * Devuelve null si no hay forma de interpretarlo.
 */
export function parsearImporte(texto: string): number | null {
  const limpio = texto.replace(/[^\d]/g, '')
  if (limpio === '') return null
  const valor = Number.parseInt(limpio, 10)
  return esImporteValido(valor) ? valor : null
}

/** Igual que `parsearImporte` pero respetando un menos por delante. */
export function parsearImporteConSigno(texto: string): number | null {
  const negativo = texto.trimStart().startsWith('-')
  const digitos = texto.replace(/[^\d]/g, '')
  if (digitos === '') return null
  const magnitud = Number.parseInt(digitos, 10)
  const valor = negativo ? -magnitud : magnitud
  return esImporteConSigno(valor) ? valor : null
}

export function validarNumeroJugadores(cantidad: number): string | null {
  if (!Number.isInteger(cantidad) || cantidad < MIN_JUGADORES || cantidad > MAX_JUGADORES) {
    return `La partida es de ${MIN_JUGADORES} a ${MAX_JUGADORES} jugadores.`
  }
  return null
}

export function validarNombres(nombres: string[]): string | null {
  const limpios = nombres.map(sanearNombre)
  if (limpios.some((nombre) => nombre.length === 0)) {
    return 'Todos los jugadores necesitan un nombre.'
  }
  const unicos = new Set(limpios.map((nombre) => nombre.toLocaleLowerCase('es')))
  if (unicos.size !== limpios.length) {
    return 'Hay nombres repetidos. Distínguelos para no liarla en la mesa.'
  }
  return null
}

/** Datos que llegan del formulario de cerrar ronda, antes de convertirse en Ronda. */
export interface BorradorRonda {
  pagadorId: string
  totalCartas: number
  propina: number
  reparto: Reparto
  aumentoMano: boolean
}

/**
 * Valida un borrador contra la partida. Devuelve la lista de problemas en
 * castellano, vacía si todo está en orden.
 */
export function validarBorrador(partida: Partida, borrador: BorradorRonda): string[] {
  const errores: string[] = []
  const ids = new Set(partida.jugadores.map((j) => j.id))

  if (!ids.has(borrador.pagadorId)) {
    errores.push('Hay que indicar quién pidió la cuenta.')
  }
  // El total de las cartas puede ser negativo: los platos quemados restan.
  if (!esImporteConSigno(borrador.totalCartas)) {
    errores.push('El total de las cartas tiene que ser un número entero de euros.')
  }
  if (!esImporteValido(borrador.propina)) {
    errores.push('La propina tiene que ser un número entero de euros.')
  }

  switch (borrador.reparto.tipo) {
    case 'normal':
      break

    case 'a-medias': {
      const coPagadorId = borrador.reparto.coPagadorId
      if (!ids.has(coPagadorId)) {
        errores.push('A medias necesita que elijas con quién se parte la cuenta.')
      } else if (coPagadorId === borrador.pagadorId) {
        errores.push('No se puede ir a medias con uno mismo.')
      }
      break
    }

    case 'a-pachas': {
      const participantes = borrador.reparto.participantesIds
      if (participantes.some((id) => !ids.has(id))) {
        errores.push('Hay alguien marcado que no juega esta partida.')
      }
      if (new Set(participantes).size !== participantes.length) {
        errores.push('Hay jugadores marcados por duplicado.')
      }
      if (participantes.length === 0) {
        errores.push('A pachas necesita al menos un jugador marcado.')
      }
      break
    }
  }

  return errores
}

/** Comprobación de forma para lo que sale de IndexedDB. */
export function esPartidaValida(valor: unknown): valor is Partida {
  if (typeof valor !== 'object' || valor === null) return false
  const partida = valor as Partial<Partida>
  return (
    typeof partida.id === 'string' &&
    typeof partida.fechaInicio === 'number' &&
    Array.isArray(partida.jugadores) &&
    partida.jugadores.length >= MIN_JUGADORES &&
    partida.jugadores.length <= MAX_JUGADORES &&
    partida.jugadores.every((j) => typeof j?.id === 'string' && typeof j?.nombre === 'string') &&
    Array.isArray(partida.rondas) &&
    partida.rondas.every(esRondaValida) &&
    (partida.estado === 'en-curso' || partida.estado === 'terminada')
  )
}

function esRondaValida(valor: unknown): valor is Ronda {
  if (typeof valor !== 'object' || valor === null) return false
  const ronda = valor as Partial<Ronda>
  if (
    typeof ronda.id !== 'string' ||
    typeof ronda.pagadorId !== 'string' ||
    !esImporteConSigno(ronda.totalCartas) ||
    !esImporteValido(ronda.propina) ||
    typeof ronda.aumentoMano !== 'boolean'
  ) {
    return false
  }
  const reparto = ronda.reparto
  if (typeof reparto !== 'object' || reparto === null) return false
  switch (reparto.tipo) {
    case 'normal':
      return true
    case 'a-medias':
      return typeof reparto.coPagadorId === 'string'
    case 'a-pachas':
      return (
        Array.isArray(reparto.participantesIds) &&
        reparto.participantesIds.every((id) => typeof id === 'string')
      )
    default:
      return false
  }
}
