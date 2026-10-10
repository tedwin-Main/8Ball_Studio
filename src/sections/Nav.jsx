import { PRIMARY_CONTACT } from '../content'
import brandLogo from '../assets/8BALL-V4.jpg'

// Floating glass pill at the top of every view. Anchors jump to the page's chapters.
export function Nav() {
  return (
    <header className="nav-wrap">
      <nav className="nav-pill" aria-label="Primary">
        <a className="nav-brand" href="#top" aria-label="8ightBall Studio, back to top">
          <img src={brandLogo} alt="" width="30" height="30" />
          <span>8ightBall Studio</span>
        </a>
        <ul className="nav-links">
          <li><a href="#services">Services</a></li>
          <li><a href="#clients">Clients</a></li>
          <li><a href="#contact">Contact</a></li>
        </ul>
        <a className="btn btn-lime nav-cta" href={PRIMARY_CONTACT.href} target="_blank" rel="noreferrer">
          WhatsApp
        </a>
      </nav>
    </header>
  )
}
