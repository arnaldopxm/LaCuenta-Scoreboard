import { describe, expect, it } from 'vitest'
import { calcularCuenta } from '../calculoRonda.ts'
import {
  alternarDobleEn,
  cartaSumada,
  cuentaDeCartas,
  cuentaDeSumandos,
  duplicarImporte,
  importeEfectivo,
  quitarCartaEn,
  sumarCartas,
  sumarImportes,
} from '../sumador.ts'
import { MAX_IMPORTE } from '../validacion.ts'

describe('sumar cartas', () => {
  it('sin nada sumado el total es cero', () => {
    expect(sumarImportes([])).toBe(0)
  })

  it('suma las cartas cantadas una a una', () => {
    expect(sumarImportes([12, 8, 15, 6])).toBe(41)
  })

  it('ignora lo que no sea un entero de euros', () => {
    expect(sumarImportes([10, 12.5, Number.NaN, 20])).toBe(30)
  })

  it('no se pasa del tope por muchas cartas que se metan', () => {
    expect(sumarImportes(Array.from({ length: 50 }, () => MAX_IMPORTE))).toBe(MAX_IMPORTE)
  })
})

/*
 * Un plato quemado RESTA: vale −10, −30... No es un cero, y no es basura.
 * Es de donde sale el importe de cuenta negativo que el reglamento contempla.
 */
describe('platos quemados, que restan', () => {
  it('una carta negativa baja el total', () => {
    expect(sumarImportes([20, -10, 15])).toBe(25)
  })

  it('el total puede quedar por debajo de cero', () => {
    expect(sumarImportes([10, -30])).toBe(-20)
  })

  it('solo platos quemados dejan el total en negativo', () => {
    expect(sumarImportes([-10, -30])).toBe(-40)
  })

  it('el total negativo NO se recorta aquí a cero', () => {
    // Recortarlo antes de tiempo rompería el cálculo: la propina se suma
    // después, y el max(0, ...) va al final. Ver el test de abajo.
    expect(sumarImportes([-25])).toBe(-25)
  })

  it('tampoco se pasa del tope por abajo', () => {
    expect(sumarImportes(Array.from({ length: 50 }, () => -MAX_IMPORTE))).toBe(-MAX_IMPORTE)
  })

  it('un cero sigue siendo distinto de una carta que resta', () => {
    expect(sumarImportes([14, 0, 9])).toBe(23)
    expect(sumarImportes([14, -0, 9])).toBe(23)
  })
})

/*
 * El punto delicado de todo esto: el orden de las operaciones. La propina se
 * suma al total ANTES del recorte a cero, así que un total negativo se come
 * parte de la propina en vez de dejarla intacta.
 */
describe('el negativo llega hasta el cálculo de la cuenta', () => {
  it('un total negativo absorbe la propina antes del recorte', () => {
    const total = sumarImportes([10, -30]) // −20
    expect(calcularCuenta(total, 5)).toBe(0) // max(0, −20 + 5) = 0
  })

  it('si el negativo es pequeño, la propina sobrevive en parte', () => {
    const total = sumarImportes([10, -13]) // −3
    expect(calcularCuenta(total, 5)).toBe(2) // max(0, −3 + 5) = 2
  })

  it('recortar el total a cero antes de tiempo daría un resultado distinto', () => {
    // La prueba de por qué sumarImportes no debe recortar: con el total real
    // se pagan 0 €, con el total recortado se pagarían 5 €.
    const real = calcularCuenta(sumarImportes([10, -30]), 5)
    const recortado = calcularCuenta(Math.max(0, sumarImportes([10, -30])), 5)
    expect(real).toBe(0)
    expect(recortado).toBe(5)
    expect(real).not.toBe(recortado)
  })
})

describe('doblar una carta para Premium', () => {
  it('multiplica por dos', () => {
    expect(duplicarImporte(14)).toBe(28)
  })

  it('doblar cero sigue siendo cero', () => {
    expect(duplicarImporte(0)).toBe(0)
  })

  it('doblar un plato quemado dobla el descuento', () => {
    expect(duplicarImporte(-15)).toBe(-30)
  })

  it('respeta el tope por arriba y por abajo', () => {
    expect(duplicarImporte(MAX_IMPORTE)).toBe(MAX_IMPORTE)
    expect(duplicarImporte(-MAX_IMPORTE)).toBe(-MAX_IMPORTE)
  })

  it('con basura devuelve cero en vez de NaN', () => {
    expect(duplicarImporte(Number.NaN)).toBe(0)
    expect(duplicarImporte(12.5)).toBe(0)
  })
})

/*
 * El Premium de una carta ya sumada, que es lo que abre el menú de la ficha.
 *
 * Está guardado como estado y no aplicado al importe, y los dos defectos que
 * eso arregla son justo lo que fijan estos tests: no se puede apilar, y la carta
 * sigue sabiendo lo que decía en la mesa para poder deshacerlo y enseñarlo.
 */
describe('el Premium de una carta ya sumada', () => {
  const mesa = () => [cartaSumada(12), cartaSumada(8), cartaSumada(15)]

  it('doblar marca esa carta y deja el resto igual', () => {
    expect(alternarDobleEn(mesa(), 1)).toEqual([
      { importe: 12, doblada: false },
      { importe: 8, doblada: true },
      { importe: 15, doblada: false },
    ])
  })

  it('la carta guarda lo que dice en la mesa, no el doble', () => {
    const doblada = alternarDobleEn([cartaSumada(12)], 0)[0]!
    expect(doblada.importe).toBe(12)
    expect(importeEfectivo(doblada)).toBe(24)
  })

  it('doblar dos veces NO da un ×4: es un interruptor', () => {
    const unaVez = alternarDobleEn([cartaSumada(9)], 0)
    const dosVeces = alternarDobleEn(unaVez, 0)
    expect(sumarCartas(unaVez)).toBe(18)
    // Vuelve a la carta de la mesa, que es lo que hace el botón de quitar el doble.
    expect(sumarCartas(dosVeces)).toBe(9)
    expect(dosVeces).toEqual([{ importe: 9, doblada: false }])
  })

  it('tres veces sigue sin acumular', () => {
    let cartas = [cartaSumada(9)]
    for (let i = 0; i < 3; i++) cartas = alternarDobleEn(cartas, 0)
    expect(sumarCartas(cartas)).toBe(18)
  })

  it('doblar un plato quemado dobla el descuento, no lo convierte en tapa', () => {
    const cartas = alternarDobleEn([cartaSumada(20), cartaSumada(-15)], 1)
    expect(sumarCartas(cartas)).toBe(-10)
    expect(importeEfectivo(cartas[1]!)).toBe(-30)
  })

  it('el doble respeta el tope, igual que duplicarImporte', () => {
    expect(sumarCartas(alternarDobleEn([cartaSumada(MAX_IMPORTE)], 0))).toBe(MAX_IMPORTE)
    expect(sumarCartas(alternarDobleEn([cartaSumada(-MAX_IMPORTE)], 0))).toBe(-MAX_IMPORTE)
  })

  it('el total sale del fold, así que doblar lo recalcula solo', () => {
    expect(sumarCartas(mesa())).toBe(35)
    expect(sumarCartas(alternarDobleEn(mesa(), 1))).toBe(43)
  })

  it('el Premium no añade una carta a la mesa: el recuento del aumento no se mueve', () => {
    expect(cuentaDeCartas(alternarDobleEn(mesa(), 0))).toBe(cuentaDeCartas(mesa()))
    expect(cuentaDeCartas(mesa())).toBe(3)
  })

  it('una carta con importe de basura no cuenta, ni doblada', () => {
    const cartas = alternarDobleEn([cartaSumada(10), cartaSumada(Number.NaN)], 1)
    expect(sumarCartas(cartas)).toBe(10)
    expect(cuentaDeCartas(cartas)).toBe(1)
  })
})

describe('quitar una carta ya sumada', () => {
  const mesa = () => [cartaSumada(12), cartaSumada(8), cartaSumada(15)]

  it('saca solo esa carta', () => {
    expect(quitarCartaEn(mesa(), 1)).toEqual([
      { importe: 12, doblada: false },
      { importe: 15, doblada: false },
    ])
  })

  it('quitar la única carta deja la lista vacía', () => {
    expect(quitarCartaEn([cartaSumada(12)], 0)).toEqual([])
  })

  it('sí baja el recuento de cartas', () => {
    expect(cuentaDeCartas(quitarCartaEn(mesa(), 2))).toBe(2)
  })

  it('con cartas repetidas se quita la de esa posición y no todas', () => {
    expect(quitarCartaEn([cartaSumada(10), cartaSumada(10), cartaSumada(10)], 0)).toHaveLength(2)
  })

  it('quitar una doblada se lleva su doble por delante', () => {
    const cartas = alternarDobleEn([cartaSumada(12), cartaSumada(8)], 0)
    expect(sumarCartas(cartas)).toBe(32)
    expect(sumarCartas(quitarCartaEn(cartas, 0))).toBe(8)
  })
})

/*
 * Fuera de rango pasa de verdad: el desglose se descarta si se teclea el total
 * a mano, así que el índice que tenía el menú abierto puede dejar de existir.
 */
describe('índices que no existen', () => {
  it('no tocan nada y devuelven la misma lista', () => {
    const cartas = [cartaSumada(12), cartaSumada(8)]
    expect(alternarDobleEn(cartas, 5)).toBe(cartas)
    expect(quitarCartaEn(cartas, 5)).toBe(cartas)
    expect(alternarDobleEn(cartas, -1)).toBe(cartas)
    expect(quitarCartaEn(cartas, -1)).toBe(cartas)
    expect(alternarDobleEn([], 0)).toEqual([])
  })

  it('un índice que no es entero tampoco toca nada', () => {
    const cartas = [cartaSumada(12), cartaSumada(8)]
    expect(alternarDobleEn(cartas, 1.5)).toBe(cartas)
    expect(quitarCartaEn(cartas, Number.NaN)).toBe(cartas)
  })

  it('ninguna de las dos muta la lista de entrada', () => {
    const cartas = [cartaSumada(12), cartaSumada(8), cartaSumada(15)]
    alternarDobleEn(cartas, 0)
    quitarCartaEn(cartas, 0)
    expect(cartas).toEqual([
      { importe: 12, doblada: false },
      { importe: 8, doblada: false },
      { importe: 15, doblada: false },
    ])
  })
})

describe('sumar cartas con Premium de por medio', () => {
  it('sin cartas el total es cero', () => {
    expect(sumarCartas([])).toBe(0)
  })

  it('una carta sin Premium cuenta lo que dice', () => {
    expect(importeEfectivo(cartaSumada(14))).toBe(14)
  })

  it('el total no se recorta a cero aunque los quemados manden', () => {
    // Mismo contrato que sumarImportes: el recorte va al final, tras la propina.
    const cartas = alternarDobleEn([cartaSumada(10), cartaSumada(-30)], 1)
    expect(sumarCartas(cartas)).toBe(-50)
  })
})

describe('cuántas cartas se llevan', () => {
  /*
   * Este recuento alimenta la pista de la casilla "se jugaron al menos N
   * cartas", y la regla del aumento de mano cuenta CARTAS, no euros. De ahí
   * que los casos raros de importe sean justo los que importan aquí.
   */
  it('un plato quemado cuenta como carta aunque reste', () => {
    expect(cuentaDeSumandos([14, -30, 9])).toBe(3)
  })

  it('una carta de cero también cuenta', () => {
    expect(cuentaDeSumandos([14, 0, 9])).toBe(3)
  })

  it('el recuento no depende del signo ni del total', () => {
    const cartas = [14, -30, 0, 9]
    expect(sumarImportes(cartas)).toBe(-7)
    expect(cuentaDeSumandos(cartas)).toBe(4)
  })

  it('descarta la basura, que no es lo mismo que un negativo', () => {
    expect(cuentaDeSumandos([10, 0, -5, Number.NaN, 12.5])).toBe(3)
  })

  it('sin cartas, cero', () => {
    expect(cuentaDeSumandos([])).toBe(0)
  })
})
