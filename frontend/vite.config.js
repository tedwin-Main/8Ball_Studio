import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// React plugin only: styling is plain CSS in index.css.
export default defineConfig({
  plugins: [react()],
})
