import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'

// Vite always injects type="module" + crossorigin for production builds.
// Electron's file:// protocol can't satisfy the CORS + module requirements,
// so we strip both attributes to get a plain <script src="..."> that always works.
const fixElectronScript: Plugin = {
  name: 'fix-electron-script',
  transformIndexHtml: (html) =>
    html
      .replace(/<script type="module" crossorigin/g, '<script defer')
      .replace(/ crossorigin/g, ''),
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    plugins: [react(), fixElectronScript],
    css: {
      postcss: './postcss.config.js'
    },
    build: {
      rollupOptions: {
        output: {
          format: 'iife',
          inlineDynamicImports: true,
        }
      }
    }
  }
})
