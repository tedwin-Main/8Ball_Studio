import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Two pages in one build: the Studio site (index.html) and Studio2 (studio2.html), which has its own
// stylesheet because its global html/body rules would break Main's layout on the same page.
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve( import.meta.dirname, 'index.html' ),
        studio2: resolve( import.meta.dirname, 'studio2.html' ),
      },
    },
  },
})
