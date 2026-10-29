// Configures Vite for the site build with the React plugin.
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// React plugin only: styling is plain CSS, loaded through index.css imports.
export default defineConfig({
  plugins: [react()],
})
