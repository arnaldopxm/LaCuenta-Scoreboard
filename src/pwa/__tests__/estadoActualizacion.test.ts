import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * El bus guarda estado de módulo, así que cada test arranca con un módulo
 * recién importado en vez de arrastrar lo del anterior.
 */
type Bus = typeof import('../estadoActualizacion.ts')

let bus: Bus

beforeEach(async () => {
  vi.resetModules()
  bus = await import('../estadoActualizacion.ts')
})

describe('avisar de que hay versión nueva', () => {
  it('sin nada anunciado no hay aviso', () => {
    expect(bus.actualizacionPendiente()).toBeNull()
  })

  it('lo anunciado queda disponible aunque React monte después', () => {
    const aplicar = () => undefined
    bus.anunciarActualizacion(aplicar)
    expect(bus.actualizacionPendiente()).toBe(aplicar)
  })

  it('avisa a quien esté suscrito', () => {
    const suscriptor = vi.fn()
    bus.suscribirseAlAviso(suscriptor)
    bus.anunciarActualizacion(() => undefined)
    expect(suscriptor).toHaveBeenCalledTimes(1)
  })

  it('desuscribirse corta los avisos', () => {
    const suscriptor = vi.fn()
    bus.suscribirseAlAviso(suscriptor)()
    bus.anunciarActualizacion(() => undefined)
    expect(suscriptor).not.toHaveBeenCalled()
  })

  it('el snapshot es estable entre lecturas', () => {
    // Si devolviera una función nueva cada vez, React repintaría sin parar.
    bus.anunciarActualizacion(() => undefined)
    expect(bus.actualizacionPendiente()).toBe(bus.actualizacionPendiente())
  })
})

/*
 * El punto del que va todo esto: aceptar la actualización recarga la página, y
 * el borrador de una ronda es estado de React sin persistir. Con el formulario a
 * medias el aviso no puede salir.
 */
describe('con un formulario a medias el aviso se calla', () => {
  it('una reserva viva esconde la actualización que ya estaba esperando', () => {
    bus.anunciarActualizacion(() => undefined)
    bus.reservarSinInterrupciones()
    expect(bus.actualizacionPendiente()).toBeNull()
  })

  it('también esconde una que llegue durante la reserva', () => {
    bus.reservarSinInterrupciones()
    bus.anunciarActualizacion(() => undefined)
    expect(bus.actualizacionPendiente()).toBeNull()
  })

  it('al liberar, el aviso vuelve: no se pierde por callarse', () => {
    const aplicar = () => undefined
    bus.anunciarActualizacion(aplicar)
    const liberar = bus.reservarSinInterrupciones()
    liberar()
    expect(bus.actualizacionPendiente()).toBe(aplicar)
  })

  it('dos pantallas reservando exigen que las dos liberen', () => {
    const aplicar = () => undefined
    bus.anunciarActualizacion(aplicar)
    const liberarUna = bus.reservarSinInterrupciones()
    const liberarOtra = bus.reservarSinInterrupciones()

    liberarUna()
    expect(bus.actualizacionPendiente()).toBeNull()

    liberarOtra()
    expect(bus.actualizacionPendiente()).toBe(aplicar)
  })

  it('liberar dos veces no descuenta de más', () => {
    // StrictMode monta, desmonta y vuelve a montar los efectos: si la liberación
    // no fuera idempotente, el contador se iría a negativo y el aviso saldría
    // con el formulario a medias.
    const aplicar = () => undefined
    bus.anunciarActualizacion(aplicar)
    const liberar = bus.reservarSinInterrupciones()
    const otraReserva = bus.reservarSinInterrupciones()

    liberar()
    liberar()
    expect(bus.actualizacionPendiente()).toBeNull()

    otraReserva()
    expect(bus.actualizacionPendiente()).toBe(aplicar)
  })

  it('reservar y liberar notifican, para que el aviso se repinte', () => {
    const suscriptor = vi.fn()
    bus.suscribirseAlAviso(suscriptor)
    bus.reservarSinInterrupciones()()
    expect(suscriptor).toHaveBeenCalledTimes(2)
  })
})
