/**
 * FILE: src/sections/Nav.jsx
 * PURPOSE: header nav pill, chapter links with scroll meters, live studio clock, WhatsApp cta, mobile drawer menu
 * UI: Shell > Header > Navigation
 * USED BY: src/App.jsx
 * KEY EXPORTS: Nav, StudioClock
 */

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { List, X } from '@phosphor-icons/react'
import { PRIMARY_CONTACT, STUDIO } from '../content'
import { RollText } from '../Cursor'
import brandLogo from '../assets/8BALL-V4.jpg'

// each chapter link: its section, and section that ends it (null runs to page end)
const CHAPTERS = [
  { href: '#services', label: 'Services', until: '#clients' },
  { href: '#clients', label: 'Clients', until: '#contact' },
  { href: '#contact', label: 'Contact', until: null },
]

const CLOCK = new Intl.DateTimeFormat( 'en-GB', { timeZone: STUDIO.timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' } )
const readClock = () => CLOCK.formatToParts( new Date() ).reduce( ( acc, part ) => ( part.type === 'hour' || part.type === 'minute' ? { ...acc, [ part.type ]: part.value } : acc ), {} )

// Shell > Header > Clock: studio local time, colon ticks each second
export function StudioClock( { className = '' } ) {
  const [ time, setTime ] = useState( readClock )
  useEffect( () => {
    const id = window.setInterval( () => setTime( readClock() ), 10000 )
    return () => window.clearInterval( id )
  }, [] )
  return (
    <span className={ `studio-clock ${ className }` } aria-label={ `${ STUDIO.city } time ${ time.hour }:${ time.minute }` }>
      <span className="studio-clock-city">{ STUDIO.cityShort }</span>
      <span className="studio-clock-time" aria-hidden="true">{ time.hour }<span className="studio-clock-colon">:</span>{ time.minute }</span>
    </span>
  )
}

// Shell > Header > Navigation Pill: floating glass pill with chapter anchors and mobile drawer
export function Nav( { align = 'right' } ) {
  const [ menuOpen, setMenuOpen ] = useState( false )
  const wrapRef = useRef( null )
  const linksRef = useRef( null )

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

  // Shell > Header > chapter links: lime meter under each link fills while its chapter scrolls by
  useLayoutEffect( () => {
    const items = [ ...linksRef.current.querySelectorAll( 'li' ) ]
    const triggers = CHAPTERS.map( ( chapter, index ) => {
      const start = document.querySelector( chapter.href )
      if ( !start ) return null
      const meter = items[ index ].querySelector( '.nav-meter' )
      const setScale = gsap.quickSetter( meter, 'scaleX' )
      const until = chapter.until && document.querySelector( chapter.until )
      return ScrollTrigger.create( {
        trigger: start,
        start: 'top 55%',
        ...( until ? { endTrigger: until, end: 'top 55%' } : { end: 'max' } ),
        onUpdate: ( self ) => setScale( self.progress ),
        onToggle: ( self ) => items[ index ].classList.toggle( 'is-current', self.isActive ),
        // meter rests empty before chapter, full after it
        onRefresh: ( self ) => setScale( self.progress ),
      } )
    } )
    return () => triggers.forEach( ( trigger ) => trigger?.kill() )
  }, [] )

  return (
    <header className="nav-wrap" ref={ wrapRef }>
      <nav className={ `nav-pill${ align === 'center' ? ' is-links-centered' : '' }` } aria-label="Primary">
        <a className="nav-brand" href="#top" aria-label="8ightBall Studio, back to top" onClick={ () => setMenuOpen( false ) }>
          <img src={ brandLogo } alt="" width="30" height="30" />
          <span>8ightBall Studio</span>
        </a>
        <ul className="nav-links" ref={ linksRef }>
          { CHAPTERS.map( ( chapter ) => (
            <li key={ chapter.href }>
              <a href={ chapter.href }><RollText>{ chapter.label }</RollText></a>
              <span className="nav-meter" aria-hidden="true" />
            </li>
          ) ) }
        </ul>
        <div className="nav-end">
          <StudioClock className="nav-clock" />
          <a className="btn btn-lime nav-cta" href={ PRIMARY_CONTACT.href } target="_blank" rel="noreferrer">
            <RollText>WhatsApp</RollText>
          </a>
        </div>
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
              { CHAPTERS.map( ( chapter ) => (
                <li key={ chapter.href }>
                  <a href={ chapter.href } onClick={ () => setMenuOpen( false ) }>
                    <span>{ chapter.label }</span>
                  </a>
                </li>
              ) ) }
            </ul>
          </div>
        ) }
      </nav>
    </header>
  )
}
