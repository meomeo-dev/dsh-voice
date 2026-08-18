import { fileURLToPath, URL } from 'node:url'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const websiteRoot = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  root: websiteRoot,
  plugins: [react()],
  server: {
    fs: {
      allow: [resolve(websiteRoot, '..')],
    },
  },
  build: {
    outDir: resolve(websiteRoot, 'dist'),
    emptyOutDir: true,
  },
})
