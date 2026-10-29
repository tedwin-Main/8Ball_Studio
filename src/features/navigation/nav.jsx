/**
 * FILE: src/features/navigation/nav.jsx
 * PURPOSE: header nav pill, chapter links with scroll meters, live studio clock, WhatsApp cta, mobile drawer menu
 * UI: Shell > Header > Navigation
 * USED BY: app.jsx
 * KEY EXPORTS: Nav, StudioClock, RAIL_CHAPTERS
 */

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { List, X } from '@phosphor-icons/react'
import { PRIMARY_CONTACT, STUDIO } from '../../config/site-content'
import { progressBetween } from '../../common/utils/math-helpers'
import { RollText } from '../cursor/index'
import brandLogo from '../../images/8ball-logo.jpg'

// each chapter link: its section, and section that ends it (null runs to page end)
const CHAPTERS = [
  { href: '#services', label: 'Services', until: '#clients' },
  { href: '#clients', label: 'Clients', until: '#contact' },
  { href: '#contact', label: 'Contact Us', until: null },
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

// rail draft: one cell per chapter on 8-col page grid; spans sum to 8. Brand owns hero
export const RAIL_CHAPTERS = [
  { href: '#top', label: '8ightBall Studio', span: 2 },
  { href: '#studio', label: 'Title', span: 2 },
  { href: '#services', label: 'Services', span: 1 },
  { href: '#clients', label: 'Clients', span: 1 },
  { href: '#contact', label: 'Contact Us', span: 2, clock: true },
]

// share of screen height: chapter starts once its section top passes this line (matches pill meters)
const CHAPTER_LINE = 0.55

// Shell > Header > menu: drawer open state; closes on outside click and Escape
function useMenu( wrapRef ) {
  const [ menuOpen, setMenuOpen ] = useState( false )
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
  return [ menuOpen, setMenuOpen ]
}

// Shell > Header > phone drawer: chapter links list
function MobileTray( { chapters, onPick } ) {
  return (
    <div className="nav-mobile-tray" role="dialog" aria-label="Mobile Navigation">
      <ul className="nav-mobile-links">
        { chapters.map( ( chapter ) => (
          <li key={ chapter.href }>
            <a href={ chapter.href } onClick={ onPick }>
              <span>{ chapter.label }</span>
            </a>
          </li>
        ) ) }
      </ul>
    </div>
  )
}

// Shell > Header > menu toggle: list icon, X while open
function MenuToggle( { open, onToggle, className = 'nav-toggle' } ) {
  return (
    <button type="button" className={ className } aria-expanded={ open } aria-label={ open ? 'Close menu' : 'Open menu' } onClick={ onToggle }>
      { open ? <X size={ 20 } weight="bold" /> : <List size={ 20 } weight="bold" /> }
    </button>
  )
}

// Shell > Header: pill drafts (right, center) or Santa Larch style rail (?nav=rail)
export function Nav( { align = 'right', layoutKey = '' } ) {
  return align === 'rail' ? <RailNav layoutKey={ layoutKey } /> : <PillNav align={ align } layoutKey={ layoutKey } />
}

// Shell > Header > Rail: full-width blended bar on page grid; hairline under links fills chapter by chapter, so one
// line grows left to right across whole page scroll
function RailNav( { layoutKey } ) {
  const menuRef = useRef( null )
  const barRef = useRef( null )
  const [ menuOpen, setMenuOpen ] = useMenu( menuRef )

  useLayoutEffect( () => {
    const cells = [ ...barRef.current.querySelectorAll( '.rail-cell' ) ]
    const fills = [ ...barRef.current.querySelectorAll( '.rail-fill' ) ].map( ( fill ) => gsap.quickSetter( fill, 'scaleX' ) )
    let bounds = []
    let current = -1
    // Rail > fill: chapter i runs from its boundary to next one; missing section (draft off) collapses to zero length
    const measure = ( self ) => {
      const max = self.end
      const line = window.innerHeight * CHAPTER_LINE
      const starts = RAIL_CHAPTERS.map( ( chapter, index ) => {
        if ( index === 0 ) return 0
        const el = document.querySelector( chapter.href )
        return el ? el.getBoundingClientRect().top + window.scrollY - line : null
      } )
      // absent chapter starts where next present one does
      for ( let i = starts.length - 1; i > 0; i -= 1 ) if ( starts[ i ] === null ) starts[ i ] = starts[ i + 1 ] ?? max
      // last chapter keeps at least half a screen of travel, so contact never fills in one frame at page end
      starts[ starts.length - 1 ] = Math.min( starts[ starts.length - 1 ], max - window.innerHeight * 0.5 )
      bounds = starts.map( ( start, i ) => [ Math.max( 0, Math.min( start, max ) ), Math.min( starts[ i + 1 ] ?? max, max ) ] )
    }
    const paint = ( self ) => {
      const y = self.scroll()
      let next = 0
      bounds.forEach( ( [ from, to ], i ) => {
        fills[ i ]( to > from ? progressBetween( from, to, y ) : Number( y >= to ) )
        if ( y >= from && to > from ) next = i
      } )
      if ( next !== current ) {
        current = next
        cells.forEach( ( cell, i ) => cell.classList.toggle( 'is-current', i === next ) )
      }
    }
    const trigger = ScrollTrigger.create( {
      start: 0,
      end: 'max',
      onRefresh: ( self ) => {
        measure( self )
        paint( self )
      },
      onUpdate: paint,
    } )
    return () => trigger.kill()
  }, [ layoutKey ] )

  return (
    <>
      <header className="rail-wrap">
        <nav className="rail-bar" aria-label="Primary" ref={ barRef }>
          { RAIL_CHAPTERS.map( ( chapter, index ) => (
            <div className={ `rail-cell${ index === 0 ? ' is-brand' : '' }` } style={ { '--span': chapter.span } } key={ chapter.href }>
              <a className="rail-link" href={ chapter.href }>{ chapter.label }</a>
              { chapter.clock && <StudioClock className="rail-clock" /> }
            </div>
          ) ) }
          <div className="rail-track" aria-hidden="true">
            { RAIL_CHAPTERS.map( ( chapter ) => (
              <span className="rail-seg" style={ { '--span': chapter.span } } key={ chapter.href }>
                <span className="rail-fill" />
              </span>
            ) ) }
          </div>
        </nav>
      </header>
      {/* outside blended header: difference blend would turn drawer and toggle unreadable */}
      <div className="rail-menu" ref={ menuRef }>
        <MenuToggle open={ menuOpen } onToggle={ () => setMenuOpen( ( prev ) => !prev ) } />
        { menuOpen && <MobileTray chapters={ RAIL_CHAPTERS.slice( 1 ) } onPick={ () => setMenuOpen( false ) } /> }
      </div>
    </>
  )
}

// Shell > Header > Navigation Pill: floating glass pill with chapter anchors and mobile drawer
function PillNav( { align, layoutKey } ) {
  const wrapRef = useRef( null )
  const linksRef = useRef( null )
  const [ menuOpen, setMenuOpen ] = useMenu( wrapRef )

  // Shell > Header > chapter links: accent meter under each link fills while its chapter scrolls by
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
  }, [ layoutKey ] )

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
              <a href={ chapter.href }>{ chapter.label }</a>
              <span className="nav-meter" aria-hidden="true" />
            </li>
          ) ) }
        </ul>
        <div className="nav-end">
          <StudioClock className="nav-clock" />
          <a className="btn btn-accent nav-cta" href={ PRIMARY_CONTACT.href } target="_blank" rel="noreferrer">
            <RollText>WhatsApp</RollText>
          </a>
        </div>
        <MenuToggle open={ menuOpen } onToggle={ () => setMenuOpen( ( prev ) => !prev ) } />
        { menuOpen && <MobileTray chapters={ CHAPTERS } onPick={ () => setMenuOpen( false ) } /> }
      </nav>
    </header>
  )
}
