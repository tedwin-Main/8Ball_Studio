import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles.css'
// Main's sheets: looks-base (faces and scenery), then acid.css (Main's layout and type). contact-table.css
// adds Main's Contact table, the lamp-lit cloth the last Page lies on.
import './looks/looks-base.css'
import './looks/acid.css'
import './looks/contact-table.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
