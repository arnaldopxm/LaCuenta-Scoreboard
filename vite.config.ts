import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { avisosLegales } from './plugin-avisos.ts'
import { politicaDeSeguridad } from './plugin-csp.ts'
import { servicioWorker } from './plugin-sw.ts'

export default defineConfig({
  // Rutas relativas: la app funciona igual en la raíz de un dominio que en un
  // subdirectorio de GitHub Pages, sin recompilar.
  base: './',

  // avisosLegales va antes que servicioWorker: este último recorre dist/ para
  // armar el precache, así que los avisos tienen que estar ya copiados.
  plugins: [react(), politicaDeSeguridad(), avisosLegales(), servicioWorker()],

  build: {
    target: 'es2022',
    // Todo el shell se precachea, así que no interesa inlinear nada como data
    // URI: los archivos reales se cachean y se revalidan por nombre.
    assetsInlineLimit: 0,
  },

  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
