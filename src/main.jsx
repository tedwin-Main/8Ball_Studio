import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Geist Variable: the site's UI and display face (self-hosted through npm, no network font request).
import '@fontsource-variable/geist'
import App from './App.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
