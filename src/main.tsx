import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App.tsx'
import { registrarServiceWorker } from './pwa/registro.ts'
import './estilos/base.css'

const raiz = document.getElementById('raiz')
if (!raiz) throw new Error('Falta el contenedor #raiz en el HTML.')

createRoot(raiz).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// En desarrollo no hay service worker: molesta más que ayuda al recargar.
if (import.meta.env.PROD) registrarServiceWorker()
