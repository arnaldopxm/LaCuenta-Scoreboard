import { useSyncExternalStore } from 'react'
import { alternarTema, esOscuro, suscribirseAlTema } from './tema.ts'

/**
 * El tema, para pintar. La preferencia vive fuera de React (`tema.ts`), así que
 * esto es solo el enchufe: lo pueden usar tantos componentes como haga falta y
 * todos ven lo mismo.
 */
export function useTema() {
  const oscuro = useSyncExternalStore(suscribirseAlTema, esOscuro)
  return { oscuro, alternar: alternarTema }
}
