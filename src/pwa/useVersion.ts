import { useEffect, useState } from 'react'
import { versionEnUso } from './registro.ts'

/**
 * Versión que está sirviendo el service worker, o `null` mientras no se sepa.
 *
 * Se pregunta una sola vez al montar: la versión de un worker no cambia en
 * caliente. Cuando entra una nueva hay recarga por medio, y con ella un montaje
 * nuevo.
 */
export function useVersion(): string | null {
  const [version, setVersion] = useState<string | null>(null)

  useEffect(() => {
    // En desarrollo no se registra el worker (ver `main.tsx`), así que no hay a
    // quién preguntar y esperarlo sería esperar a nadie.
    if (!import.meta.env.PROD) return

    let vivo = true
    void versionEnUso().then((encontrada) => {
      if (vivo) setVersion(encontrada)
    })
    return () => {
      vivo = false
    }
  }, [])

  return version
}
