import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles.css'
// Whole-site looks: each sheet is scoped to .experience[data-look='<id>'] and only wins while selected.
// Cyc Wall is the base sheet (styles.css); Acid Night (the default) and Downlight layer over it.
import './looks/looks-base.css'
import './looks/acid.css'
import './looks/downlight.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
