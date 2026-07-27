import { esPartidaValida, type Partida } from '../dominio/index.ts'
import { db, type BaseDeDatos } from './db.ts'

/**
 * Acceso a las partidas guardadas.
 *
 * Todo lo que sale de IndexedDB pasa por `esPartidaValida`: un registro de una
 * versión anterior o corrupto se descarta en vez de reventar el marcador a
 * media noche en una terraza.
 */
export class RepositorioPartidas {
  constructor(private readonly base: BaseDeDatos = db) {}

  async guardar(partida: Partida): Promise<void> {
    await this.base.partidas.put(partida)
  }

  async obtener(id: string): Promise<Partida | null> {
    return validar(await this.base.partidas.get(id))
  }

  /**
   * La partida abierta, si la hay. Solo debería existir una; si por lo que sea
   * hubiera varias, gana la más reciente.
   */
  async enCurso(): Promise<Partida | null> {
    const abiertas = await this.base.partidas.where('estado').equals('en-curso').toArray()
    const validas = abiertas.filter((p): p is Partida => esPartidaValida(p))
    if (validas.length === 0) return null
    return validas.reduce((masReciente, actual) =>
      actual.fechaInicio > masReciente.fechaInicio ? actual : masReciente,
    )
  }

  /** Historial de partidas terminadas, de la más reciente a la más antigua. */
  async terminadas(): Promise<Partida[]> {
    const cerradas = await this.base.partidas.where('estado').equals('terminada').toArray()
    return cerradas
      .filter((p): p is Partida => esPartidaValida(p))
      .sort((a, b) => b.fechaInicio - a.fechaInicio)
  }

  async borrar(id: string): Promise<void> {
    await this.base.partidas.delete(id)
  }

  /** Solo para la opción de vaciar datos desde ajustes. */
  async borrarTodo(): Promise<void> {
    await this.base.partidas.clear()
  }
}

function validar(valor: unknown): Partida | null {
  return esPartidaValida(valor) ? valor : null
}

export const repositorio = new RepositorioPartidas()
