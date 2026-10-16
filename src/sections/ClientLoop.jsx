/**
 * FILE: src/sections/ClientLoop.jsx
 * PURPOSE: client logo loop (original) and client grid draft, both with popping title
 * UI: Site > Clients
 * USED BY: src/App.jsx
 * KEY EXPORTS: ClientLoop, ClientGrid
 */

import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { startMarqueeLoop } from '../marqueeLoop'
import { CLIENTS } from '../content'
import { useSplitTitle } from '../titleMotion'
import { scaleFade } from '../mediaMotion'

// How many times the client logos repeat inside one group, so one group is always wider than a wide screen.
const REPEATS = 3

// Desire: an endless row of client logos that drifts to the right, the opposite way to the services marquee below.
// Two identical groups sit side by side and the track moves exactly one group's width, so the loop never shows a gap.
// Clients > title: letters pop in one by one as title rises from screen bottom
// Scrubbed to scroll: each letter scales up from nothing with back-ease overshoot and random tilt.
function usePopTitle( titleRef ) {
  useSplitTitle( titleRef, { type: 'chars' }, ( split ) =>
    gsap.from( split.chars, {
      scale: 0,
      rotation: () => gsap.utils.random( -45, 45 ),
      transformOrigin: '50% 60%',
      ease: 'back.out(2.5)',
      stagger: 0.08,
      scrollTrigger: { trigger: titleRef.current, start: 'top bottom', end: 'top 55%', scrub: 0.8 },
    } ) )
}

// Clients > Grid draft (?clients=grid): gapless hairline grid, 4x1 desktop, 2x2 phone; cells light in turn
export function ClientGrid() {
  const titleRef = useRef( null )
  const gridRef = useRef( null )
  usePopTitle( titleRef )

  useLayoutEffect( () => {
    const grid = gridRef.current
    if ( window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches ) return undefined
    const killFade = scaleFade( grid, { from: 0.94 } )
    // Clients > Grid: touch has no hover, so cells light one after another while grid is in view
    const lit = window.matchMedia( '(hover: none)' ).matches && ScrollTrigger.create( {
      trigger: grid,
      start: 'top 70%',
      end: 'bottom 30%',
      onToggle: ( self ) => grid.querySelectorAll( '.client-cell' ).forEach( ( cell, i ) => {
        cell.style.transitionDelay = self.isActive ? `${ i * 0.12 }s` : '0s'
        cell.classList.toggle( 'is-lit', self.isActive )
      } ),
    } )
    return () => {
      killFade()
      if ( lit ) lit.kill()
    }
  }, [] )

  return (
    <section className="section clients clients-grid-section" id="clients" aria-labelledby="clients-title">
      <h2 id="clients-title" className="section-title" ref={ titleRef }>Our clients</h2>
      <ul className="client-grid" ref={ gridRef }>
        { CLIENTS.map( ( client ) => (
          <li className="client-cell" key={ client.name }>
            <img src={ client.src } alt={ client.name } loading="lazy" decoding="async" />
            <span className="client-name" aria-hidden="true">{ client.name }</span>
          </li>
        ) ) }
      </ul>
    </section>
  )
}

export function ClientLoop() {
  const trackRef = useRef( null )
  const titleRef = useRef( null )
  usePopTitle( titleRef )

  useLayoutEffect( () => {
    // Reduced-motion visitors get a still row, no loop.
    if ( window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches ) return undefined
    // Runs to the right, the opposite way to the services marquee.
    return startMarqueeLoop( trackRef.current, { reverse: true } )
  }, [] )

  // Clients > Loop: logos light up in view, touch has no hover
  useLayoutEffect( () => {
    if ( !window.matchMedia( '(hover: none)' ).matches ) return undefined
    const loop = trackRef.current.parentElement
    const trigger = ScrollTrigger.create( { trigger: loop, start: 'top 75%', end: 'bottom 25%', toggleClass: 'is-lit' } )
    return () => {
      trigger.kill()
      loop.classList.remove( 'is-lit' )
    }
  }, [] )

  // Only the first group is read by screen readers; the second is a visual copy that makes the loop seamless.
  const renderGroup = ( copy ) => (
    <ul className="clients-group" aria-hidden={ copy ? 'true' : undefined }>
      { Array.from( { length: REPEATS }, ( _, repeat ) => CLIENTS.map( ( client ) => (
        <li key={ `${ copy }-${ repeat }-${ client.name }` } className={ repeat ? 'clients-repeat' : undefined }>
          <img src={ client.src } alt={ copy || repeat ? '' : client.name } loading="lazy" decoding="async" />
        </li>
      ) ) ) }
    </ul>
  )

  return (
    <section className="section clients" id="clients" aria-labelledby="clients-title">
      <h2 id="clients-title" className="section-title" ref={ titleRef }>Our clients</h2>
      <div className="clients-loop">
        <div className="clients-track" ref={ trackRef }>
          { renderGroup( 0 ) }
          { renderGroup( 1 ) }
        </div>
      </div>
    </section>
  )
}
