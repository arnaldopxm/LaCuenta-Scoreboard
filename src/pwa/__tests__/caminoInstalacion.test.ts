import { describe, expect, it } from 'vitest'
import { caminoDeInstalacion, estaInstalada, pareceIOS } from '../caminoInstalacion.ts'

/** Agentes de usuario reales, recortados a lo que se mira. */
const UA = {
  iphone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
  ipadOS:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15',
  mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
  android:
    'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36',
}

describe('por dónde se instala', () => {
  it('con prompt guardado se instala de un botón', () => {
    expect(caminoDeInstalacion({ tienePrompt: true, esIOS: false })).toBe('directa')
  })

  it('el prompt manda sobre el sistema: un iPad con Chromium instalable se instala solo', () => {
    // Equivocarse aquí sería enseñar el gesto de Safari a quien tiene un botón.
    expect(caminoDeInstalacion({ tienePrompt: true, esIOS: true })).toBe('directa')
  })

  it('en iOS sin prompt se explica el gesto, que no hay API que lo provoque', () => {
    expect(caminoDeInstalacion({ tienePrompt: false, esIOS: true })).toBe('ios')
  })

  it('sin prompt y sin iOS quedan las instrucciones del menú', () => {
    // Firefox, escritorio, o un Chromium que todavía no ha disparado el evento.
    expect(caminoDeInstalacion({ tienePrompt: false, esIOS: false })).toBe('manual')
  })
})

describe('reconocer iOS para saber qué gesto explicar', () => {
  it('un iPhone es un iPhone', () => {
    expect(pareceIOS({ ua: UA.iphone, maxTouchPoints: 5, standaloneDefinido: true })).toBe(true)
  })

  it('iPadOS dice que es un Mac, y se le pilla por el táctil', () => {
    expect(pareceIOS({ ua: UA.ipadOS, maxTouchPoints: 5, standaloneDefinido: true })).toBe(true)
  })

  it('un Mac de verdad no lo es: no tiene puntos de contacto', () => {
    expect(pareceIOS({ ua: UA.mac, maxTouchPoints: 0, standaloneDefinido: false })).toBe(false)
  })

  it('un Android no lo es', () => {
    expect(pareceIOS({ ua: UA.android, maxTouchPoints: 5, standaloneDefinido: false })).toBe(false)
  })

  it('`navigator.standalone` definido delata a Safari aunque el UA no diga nada', () => {
    expect(pareceIOS({ ua: 'algo raro', maxTouchPoints: 0, standaloneDefinido: true })).toBe(true)
  })

  it('un UA desconocido sin más señales no se da por iOS', () => {
    expect(pareceIOS({ ua: 'algo raro', maxTouchPoints: 0, standaloneDefinido: false })).toBe(false)
  })
})

/*
 * Si esto se equivoca en falso positivo, la app ofrece instalar algo que ya está
 * instalado, que es justo la clase de insistencia que el encargo prohibía.
 */
describe('saber si ya está instalada', () => {
  it('en modo app de Android o escritorio, lo está', () => {
    expect(estaInstalada({ enModoApp: true, standaloneIOS: false })).toBe(true)
  })

  it('en iOS basta con `navigator.standalone`, que no implementa display-mode', () => {
    expect(estaInstalada({ enModoApp: false, standaloneIOS: true })).toBe(true)
  })

  it('en una pestaña normal, no', () => {
    expect(estaInstalada({ enModoApp: false, standaloneIOS: false })).toBe(false)
  })
})
