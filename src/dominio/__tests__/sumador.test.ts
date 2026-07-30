import { describe, expect, it } from 'vitest'
import { calcularCuenta } from '../calculoRonda.ts'
import {
  cuentaDeSumandos,
  doblarCartaEn,
  duplicarImporte,
  quitarCartaEn,
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
 * Doblar y quitar una carta YA sumada, que es lo que abre el menú de la ficha.
 * Antes solo se podía doblar lo que se estaba tecleando, así que acordarse del
 * Premium a posteriori obligaba a rehacer la carta.
 */
describe('tocar una carta ya sumada', () => {
  it('doblar una carta deja el resto igual', () => {
    expect(doblarCartaEn([12, 8, 15], 1)).toEqual([12, 16, 15])
  })

  it('doblar un plato quemado dobla el descuento, no lo convierte en tapa', () => {
    expect(doblarCartaEn([20, -15], 1)).toEqual([20, -30])
  })

  it('doblar dos veces multiplica por cuatro', () => {
    expect(doblarCartaEn(doblarCartaEn([9], 0), 0)).toEqual([36])
  })

  it('doblar respeta el tope, igual que duplicarImporte', () => {
    expect(doblarCartaEn([MAX_IMPORTE], 0)).toEqual([MAX_IMPORTE])
    expect(doblarCartaEn([-MAX_IMPORTE], 0)).toEqual([-MAX_IMPORTE])
  })

  it('el total sale del fold, así que doblar lo recalcula solo', () => {
    const cartas = [12, 8, 15]
    expect(sumarImportes(cartas)).toBe(35)
    expect(sumarImportes(doblarCartaEn(cartas, 1))).toBe(43)
  })

  it('doblar no cambia el recuento de cartas: la del aumento sigue igual', () => {
    const cartas = [12, 8, 15]
    expect(cuentaDeSumandos(doblarCartaEn(cartas, 0))).toBe(cuentaDeSumandos(cartas))
  })

  it('quitar saca solo esa carta', () => {
    expect(quitarCartaEn([12, 8, 15], 1)).toEqual([12, 15])
  })

  it('quitar la única carta deja la lista vacía', () => {
    expect(quitarCartaEn([12], 0)).toEqual([])
  })

  it('quitar sí baja el recuento de cartas', () => {
    expect(cuentaDeSumandos(quitarCartaEn([12, 8, 15], 2))).toBe(2)
  })

  it('con cartas repetidas se quita la de esa posición y no todas', () => {
    expect(quitarCartaEn([10, 10, 10], 0)).toEqual([10, 10])
  })

  /*
   * Fuera de rango pasa de verdad: el desglose se descarta si se teclea el total
   * a mano, así que el índice que tenía el menú abierto puede dejar de existir.
   */
  it('un índice que no existe no toca nada y devuelve la misma lista', () => {
    const cartas = [12, 8]
    expect(doblarCartaEn(cartas, 5)).toBe(cartas)
    expect(quitarCartaEn(cartas, 5)).toBe(cartas)
    expect(doblarCartaEn(cartas, -1)).toBe(cartas)
    expect(quitarCartaEn(cartas, -1)).toBe(cartas)
    expect(doblarCartaEn([], 0)).toEqual([])
  })

  it('un índice que no es entero tampoco toca nada', () => {
    const cartas = [12, 8]
    expect(doblarCartaEn(cartas, 1.5)).toBe(cartas)
    expect(quitarCartaEn(cartas, Number.NaN)).toBe(cartas)
  })

  it('ninguna de las dos muta la lista de entrada', () => {
    const cartas = [12, 8, 15]
    doblarCartaEn(cartas, 0)
    quitarCartaEn(cartas, 0)
    expect(cartas).toEqual([12, 8, 15])
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
