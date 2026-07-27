import Dexie, { type EntityTable } from 'dexie'
import type { Partida } from '../dominio/index.ts'

/**
 * IndexedDB local y nada más. Sin backend, sin sincronización, sin cuentas.
 * Los datos no salen del dispositivo en ningún momento.
 *
 * `localStorage` queda descartado a propósito: es síncrono, tiene un límite
 * ridículo y el navegador lo purga antes que IndexedDB.
 */
export class BaseDeDatos extends Dexie {
  partidas!: EntityTable<Partida, 'id'>

  constructor(nombre = 'la-cuenta') {
    super(nombre)
    // Solo se indexan los campos por los que se consulta. Las rondas viajan
    // dentro del documento: una partida es la unidad atómica de guardado.
    this.version(1).stores({
      partidas: 'id, fechaInicio, estado',
    })
  }
}

export const db = new BaseDeDatos()
