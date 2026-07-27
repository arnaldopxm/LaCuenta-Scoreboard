import type { Pago, Ronda } from './tipos.ts'

/**
 * Importe total de la cuenta de una ronda.
 *
 * La propina (precio de la tapa más barata en mesa) se suma ANTES de repartir,
 * nunca después. El `max(0, ...)` es defensivo: las reglas contemplan que el
 * importe pueda quedar en negativo y aquí eso significa simplemente que nadie
 * paga nada.
 */
export function calcularCuenta(totalCartas: number, propina: number): number {
  return Math.max(0, totalCartas + propina)
}

/**
 * Reparte el importe entre quien corresponda.
 *
 * REDONDEO HACIA ARRIBA POR JUGADOR, y es intencional: 100 € a pachas entre 3
 * son 34 € cada uno, o sea 102 € pagados en total. Se prefieren céntimos
 * limpios en la mesa a que la suma cuadre al euro. No repartas el resto ni
 * guardes decimales.
 *
 * Devuelve una entrada por jugador que paga; los demás simplemente no aparecen.
 */
export function calcularPagos(ronda: Ronda): Pago[] {
  const cuenta = calcularCuenta(ronda.totalCartas, ronda.propina)
  if (cuenta === 0) return []

  switch (ronda.reparto.tipo) {
    case 'normal':
      return [{ jugadorId: ronda.pagadorId, importe: cuenta }]

    case 'a-medias': {
      const mitad = Math.ceil(cuenta / 2)
      return [
        { jugadorId: ronda.pagadorId, importe: mitad },
        { jugadorId: ronda.reparto.coPagadorId, importe: mitad },
      ]
    }

    case 'a-pachas': {
      const participantes = ronda.reparto.participantesIds
      // Sin nadie marcado no hay entre quién dividir. Defensivo: la validación
      // impide llegar aquí, pero mejor no dividir entre cero.
      if (participantes.length === 0) return []
      const parte = Math.ceil(cuenta / participantes.length)
      return participantes.map((jugadorId) => ({ jugadorId, importe: parte }))
    }
  }
}

/**
 * Quién recibe el aumento de mano en esta ronda, si es que alguien lo recibe.
 *
 * Siempre el pagador y nadie más: en A medias y A pachas el co-pagador no se
 * lleva nada porque no jugó la carta de división.
 */
export function receptorDelAumento(ronda: Ronda): string | null {
  return ronda.aumentoMano ? ronda.pagadorId : null
}
