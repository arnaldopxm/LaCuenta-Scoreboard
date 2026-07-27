import { useEffect, useState } from 'react'
import { alHaberActualizacion } from '../pwa/estadoActualizacion.ts'
import { Boton } from './Boton.tsx'
import estilos from './AvisoActualizacion.module.css'

/**
 * Aviso discreto de versión nueva. Nunca recarga por su cuenta: la decisión es
 * del usuario, que puede estar a mitad de una ronda.
 */
export function AvisoActualizacion() {
  const [aplicar, setAplicar] = useState<(() => void) | null>(null)
  const [descartado, setDescartado] = useState(false)

  useEffect(() => alHaberActualizacion((accion) => setAplicar(() => accion)), [])

  if (!aplicar || descartado) return null

  return (
    <div className={estilos.aviso} role="status">
      <span className={estilos.texto}>Hay una versión nueva del marcador.</span>
      <div className={estilos.botones}>
        <Boton variante="fantasma" onClick={() => setDescartado(true)}>
          Ahora no
        </Boton>
        <Boton variante="secundario" onClick={aplicar}>
          Actualizar
        </Boton>
      </div>
    </div>
  )
}
