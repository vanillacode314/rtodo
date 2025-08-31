import type { Plugin } from 'vite'

import tailwindcss from '@tailwindcss/vite'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import path from 'node:path'
import UnoCSS from 'unocss/vite'
import { defineConfig } from 'vite'
import solidPlugin from 'vite-plugin-solid'

const sqlocal: Plugin = {
  name: 'configure-response-headers',
  configureServer: (server) => {
    server.middlewares.use((_req, res, next) => {
      res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp')
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
      next()
    })
  },
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    TanStackRouterVite({ target: 'solid', autoCodeSplitting: true }),
    UnoCSS(),
    solidPlugin(),
    tailwindcss(),
    sqlocal,
  ],
  worker: {
    format: 'es',
  },
  resolve: {
    alias: {
      '~': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    exclude: ['sqlocal'],
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3002',
    },
  },
})
