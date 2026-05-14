import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'

const removeCrossOrigin: Plugin = {
  name: 'remove-crossorigin',
  transformIndexHtml: (html) => html.replace(/ crossorigin/g, ''),
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    plugins: [react(), removeCrossOrigin],
    css: {
      postcss: './postcss.config.js'
    }
  }
})
