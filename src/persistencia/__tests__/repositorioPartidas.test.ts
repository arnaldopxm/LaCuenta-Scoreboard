import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { anadirRonda, crearPartida, nombresPorDefecto } from '../../dominio/index.ts'
import { BaseDeDatos } from '../db.ts'
import { RepositorioPartidas } from '../repositorioPartidas.ts'

let base: BaseDeDatos
let repo: RepositorioPartidas

beforeEach(async () => {
  base = new BaseDeDatos(`prueba-${Math.random().toString(36).slice(2)}`)
  repo = new RepositorioPartidas(base)
  await base.open()
})

describe('guardar y recuperar', () => {
  it('una partida sobrevive al viaje de ida y vuelta', async () => {
    const partida = crearPartida(nombresPorDefecto(4), 1000)
    await repo.guardar(partida)
    expect(await repo.obtener(partida.id)).toEqual(partida)
  })

  it('las rondas viajan dentro de la partida', async () => {
    let partida = crearPartida(nombresPorDefecto(3), 1000)
    partida = anadirRonda(partida, {
      pagadorId: partida.jugadores[0]!.id,
      totalCartas: 120,
      propina: 8,
      reparto: { tipo: 'a-pachas', participantesIds: partida.jugadores.map((j) => j.id) },
      aumentoMano: true,
    })
    await repo.guardar(partida)

    const recuperada = await repo.obtener(partida.id)
    expect(recuperada?.rondas).toHaveLength(1)
    expect(recuperada?.rondas[0]?.propina).toBe(8)
    expect(recuperada?.rondas[0]?.reparto).toEqual({
      tipo: 'a-pachas',
      participantesIds: partida.jugadores.map((j) => j.id),
    })
  })

  it('guardar dos veces la misma partida la actualiza en vez de duplicarla', async () => {
    let partida = crearPartida(nombresPorDefecto(3), 1000)
    await repo.guardar(partida)
    partida = anadirRonda(partida, {
      pagadorId: partida.jugadores[0]!.id,
      totalCartas: 50,
      propina: 0,
      reparto: { tipo: 'normal' },
      aumentoMano: false,
    })
    await repo.guardar(partida)

    expect(await base.partidas.count()).toBe(1)
    expect((await repo.obtener(partida.id))?.rondas).toHaveLength(1)
  })

  it('devuelve null si no existe', async () => {
    expect(await repo.obtener('no-existe')).toBeNull()
  })
})

describe('partida en curso', () => {
  it('no hay ninguna al principio', async () => {
    expect(await repo.enCurso()).toBeNull()
  })

  it('recupera la partida abierta para poder continuarla', async () => {
    const partida = crearPartida(nombresPorDefecto(5), 1000)
    await repo.guardar(partida)
    expect((await repo.enCurso())?.id).toBe(partida.id)
  })

  it('ignora las terminadas', async () => {
    let partida = crearPartida(nombresPorDefecto(3), 1000)
    partida = anadirRonda(partida, {
      pagadorId: partida.jugadores[0]!.id,
      totalCartas: 900,
      propina: 0,
      reparto: { tipo: 'normal' },
      aumentoMano: false,
    })
    expect(partida.estado).toBe('terminada')
    await repo.guardar(partida)

    expect(await repo.enCurso()).toBeNull()
    expect(await repo.terminadas()).toHaveLength(1)
  })

  it('si hubiera varias abiertas se queda con la más reciente', async () => {
    await repo.guardar(crearPartida(nombresPorDefecto(3), 1000))
    const nueva = crearPartida(nombresPorDefecto(4), 5000)
    await repo.guardar(nueva)
    expect((await repo.enCurso())?.id).toBe(nueva.id)
  })
})

describe('historial de terminadas', () => {
  it('ordena de la más reciente a la más antigua', async () => {
    for (const fecha of [1000, 9000, 5000]) {
      const partida = { ...crearPartida(nombresPorDefecto(3), fecha), estado: 'terminada' as const }
      await repo.guardar(partida)
    }
    expect((await repo.terminadas()).map((p) => p.fechaInicio)).toEqual([9000, 5000, 1000])
  })
})

describe('resistencia a datos corruptos', () => {
  it('descarta un registro que no tiene forma de partida', async () => {
    // Simula un registro escrito por una versión anterior de la app.
    await base.partidas.put({ id: 'roto', estado: 'en-curso' } as never)
    expect(await repo.obtener('roto')).toBeNull()
    expect(await repo.enCurso()).toBeNull()
  })

  it('una partida con una ronda corrupta no se da por buena', async () => {
    const partida = crearPartida(nombresPorDefecto(3), 1000)
    await base.partidas.put({
      ...partida,
      rondas: [{ id: 'r1', indice: 0, pagadorId: 'x', totalCartas: -9 }],
    } as never)
    expect(await repo.obtener(partida.id)).toBeNull()
  })

  it('los registros buenos conviven con los rotos', async () => {
    const buena = crearPartida(nombresPorDefecto(3), 2000)
    await repo.guardar(buena)
    await base.partidas.put({ id: 'roto', estado: 'en-curso' } as never)
    expect((await repo.enCurso())?.id).toBe(buena.id)
  })
})

describe('borrado', () => {
  it('borra una partida concreta', async () => {
    const partida = crearPartida(nombresPorDefecto(3), 1000)
    await repo.guardar(partida)
    await repo.borrar(partida.id)
    expect(await repo.obtener(partida.id)).toBeNull()
  })

  it('vacía todo el historial', async () => {
    await repo.guardar(crearPartida(nombresPorDefecto(3), 1000))
    await repo.guardar(crearPartida(nombresPorDefecto(4), 2000))
    await repo.borrarTodo()
    expect(await base.partidas.count()).toBe(0)
  })
})
