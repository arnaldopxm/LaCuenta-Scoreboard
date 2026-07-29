import { useSyncExternalStore } from 'react'
import { estadoInstalacion, suscribirseALaInstalacion } from './instalacion.ts'

/**
 * Si la app ya está instalada y por qué camino se instalaría si no.
 * El estado vive fuera de React (`instalacion.ts`); esto es el enchufe.
 */
export function useInstalacion() {
  return useSyncExternalStore(suscribirseALaInstalacion, estadoInstalacion)
}
