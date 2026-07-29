import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App.tsx'
import { vigilarInstalacion } from './pwa/instalacion.ts'
import { registrarServiceWorker } from './pwa/registro.ts'
import './estilos/base.css'

/*
 * Antes de pintar: `beforeinstallprompt` lo dispara el navegador cuando quiere,
 * y si no hay nadie escuchando se pierde con él la posibilidad de instalar de un
 * botón. Va también en desarrollo, que ahí no molesta a nadie.
 */
vigilarInstalacion()

const raiz = document.getElementById('raiz')
if (!raiz) throw new Error('Falta el contenedor #raiz en el HTML.')

createRoot(raiz).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// En desarrollo no hay service worker: molesta más que ayuda al recargar.
if (import.meta.env.PROD) registrarServiceWorker()
