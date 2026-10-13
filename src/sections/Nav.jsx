/**
 * FILE: src/sections/Nav.jsx
 * PURPOSE: header nav pill, desktop chapter jumps, WhatsApp cta, mobile drawer menu
 * UI: Shell > Header > Navigation
 * USED BY: src/App.jsx
 * KEY EXPORTS: Nav
 */

import { useEffect, useRef, useState } from 'react'
import { List, X } from '@phosphor-icons/react'
import { PRIMARY_CONTACT } from '../content'
import brandLogo from '../assets/8BALL-V4.jpg'

// Shell > Header > Navigation Pill: floating glass pill with chapter anchors and mobile drawer
export function Nav( { align = 'right' } ) {
  const [ menuOpen, setMenuOpen ] = useState( false )
  const wrapRef = useRef( null )

  useEffect( () => {
    // composedPath keeps original click chain if icon unmounts
    const onDocClick = ( event ) => {
      if ( !event.composedPath().includes( wrapRef.current ) ) setMenuOpen( false )
    }
    // escape key closes drawer
    const onKey = ( event ) => {
      if ( event.key === 'Escape' ) setMenuOpen( false )
    }
    document.addEventListener( 'click', onDocClick )
    document.addEventListener( 'keydown', onKey )
    return () => {
      document.removeEventListener( 'click', onDocClick )
      document.removeEventListener( 'keydown', onKey )
    }
  }, [] )

  return (
    <header className="nav-wrap" ref={ wrapRef }>
      <nav className={ `nav-pill${ align === 'center' ? ' is-links-centered' : '' }` } aria-label="Primary">
        <a className="nav-brand" href="#top" aria-label="8ightBall Studio, back to top" onClick={ () => setMenuOpen( false ) }>
          <img src={ brandLogo } alt="" width="30" height="30" />
          <span>8ightBall Studio</span>
        </a>
        <ul className="nav-links">
          <li><a href="#services">Services</a></li>
          <li><a href="#clients">Clients</a></li>
          <li><a href="#contact">Contact</a></li>
        </ul>
        <a className="btn btn-lime nav-cta" href={ PRIMARY_CONTACT.href } target="_blank" rel="noreferrer">
          WhatsApp
        </a>
        <button
          type="button"
          className="nav-toggle"
          aria-expanded={ menuOpen }
          aria-label={ menuOpen ? 'Close menu' : 'Open menu' }
          onClick={ () => setMenuOpen( ( prev ) => !prev ) }
        >
          { menuOpen ? <X size={ 20 } weight="bold" /> : <List size={ 20 } weight="bold" /> }
        </button>
        { menuOpen && (
          <div className="nav-mobile-tray" role="dialog" aria-label="Mobile Navigation">
            <ul className="nav-mobile-links">
              <li>
                <a href="#services" onClick={ () => setMenuOpen( false ) }>
                  <span>Services</span>
                </a>
              </li>
              <li>
                <a href="#clients" onClick={ () => setMenuOpen( false ) }>
                  <span>Clients</span>
                </a>
              </li>
              <li>
                <a href="#contact" onClick={ () => setMenuOpen( false ) }>
                  <span>Contact</span>
                </a>
              </li>
            </ul>
          </div>
        ) }
      </nav>
    </header>
  )
}
