import { useCallback, useEffect, useState } from 'react'

export type Tema = 'sistema' | 'claro' | 'oscuro'

const CLAVE = 'la-cuenta:tema'

/**
 * Preferencia de tema.
 *
 * Esto sí vive en localStorage y no en IndexedDB, a propósito: no es estado de
 * partida, es una preferencia de dos bytes que hay que poder leer de forma
 * síncrona antes del primer pintado para no soltar un fogonazo blanco en una
 * terraza de noche.
 */
export function useTema() {
  const [tema, setTema] = useState<Tema>(leerTema)
  const [sistemaOscuro, setSistemaOscuro] = useState(preferenciaDelSistema)

  const oscuro = tema === 'sistema' ? sistemaOscuro : tema === 'oscuro'

  // La preferencia del sistema puede cambiar con la app abierta.
  useEffect(() => {
    const consulta = window.matchMedia('(prefers-color-scheme: dark)')
    const alCambiar = (evento: MediaQueryListEvent) => setSistemaOscuro(evento.matches)
    consulta.addEventListener('change', alCambiar)
    return () => consulta.removeEventListener('change', alCambiar)
  }, [])

  useEffect(() => {
    const raiz = document.documentElement
    if (tema === 'sistema') {
      raiz.removeAttribute('data-tema')
    } else {
      raiz.setAttribute('data-tema', tema)
    }

    try {
      localStorage.setItem(CLAVE, tema)
    } catch {
      // Modo privado sin almacenamiento: el tema simplemente no se recuerda.
    }
  }, [tema])

  // La barra de estado del móvil tiene que ir a juego con el fondo real.
  useEffect(() => {
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', oscuro ? '#14110F' : '#E8933A')
  }, [oscuro])

  const alternar = useCallback(() => {
    setTema(oscuro ? 'claro' : 'oscuro')
  }, [oscuro])

  return { tema, setTema, alternar, oscuro }
}

function leerTema(): Tema {
  try {
    const guardado = localStorage.getItem(CLAVE)
    if (guardado === 'claro' || guardado === 'oscuro' || guardado === 'sistema') return guardado
  } catch {
    // Sin acceso a localStorage se sigue al sistema y punto.
  }
  return 'sistema'
}

function preferenciaDelSistema(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}
