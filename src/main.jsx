import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles.css'
// Whole-site looks: each sheet is scoped to .experience[data-look='<id>'] and only wins while selected.
import './looks/looks-base.css'
import './looks/baize.css'
import './looks/crucible.css'
import './looks/develop.css'
import './looks/chit.css'
import './looks/film.css'
import './looks/noir.css'
import './looks/flap.css'
import './looks/poster.css'
import './looks/marker.css'
import './looks/downlight.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
