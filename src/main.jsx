import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles.css'
// Whole-site looks: each sheet is scoped to .experience[data-look='<id>'] and only wins while selected.
// Cyc Wall is the base sheet (styles.css); Main (the default, acid.css) and Pool Table (downlight.css) layer over it.
import './looks/looks-base.css'
import './looks/acid.css'
import './looks/downlight.css'
// Themes over Main (data-look="acid" plus data-theme): re-colour and re-set Main, so they load after it.
import './looks/themes.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
