/**
 * FILE: src/Cursor.jsx
 * PURPOSE: custom cursor (dot + lagging ring + label), magnetic pull on buttons, roll-text link label
 * UI: Site > every screen (fine pointer only)
 * USED BY: src/App.jsx, src/sections/Nav.jsx, src/sections/Footer.jsx
 * KEY EXPORTS: Cursor, RollText
 */

import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'

// what pulls toward pointer; data-magnet="inner" moves first child instead (element keeps its own CSS transform)
const MAGNET = '.btn, [data-magnet]'
// share of pointer offset magnet follows
const PULL = 0.32
const INTERACTIVE = 'a, button, select, label, [role="button"]'

const magnetBody = ( el ) => ( el.dataset.magnet === 'inner' ? el.firstElementChild ?? el : el )

// Site > any link/button: label rolls up, copy below takes its place (pure CSS, see .roll in styles/shared/roll-text.css)
export function RollText( { children } ) {
  return (
    <span className="roll">
      <span className="roll-in">{ children }</span>
    </span>
  )
}

// Site > pointer: dot tracks pointer tight, ring trails with weight, grows over links, shows label over [data-cursor]
export function Cursor() {
  const dotRef = useRef( null )
  const ringRef = useRef( null )
  const labelRef = useRef( null )

  useLayoutEffect( () => {
    // touch and reduced motion keep native cursor, no magnets
    if ( !window.matchMedia( '(hover: hover) and (pointer: fine)' ).matches ) return undefined
    if ( window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches ) return undefined

    const dot = dotRef.current
    const ring = ringRef.current
    const label = labelRef.current
    const root = document.documentElement
    root.classList.add( 'has-cursor' )
    gsap.set( [ dot, ring ], { xPercent: -50, yPercent: -50, autoAlpha: 0 } )

    const dotX = gsap.quickTo( dot, 'x', { duration: 0.1, ease: 'power3' } )
    const dotY = gsap.quickTo( dot, 'y', { duration: 0.1, ease: 'power3' } )
    const ringX = gsap.quickTo( ring, 'x', { duration: 0.55, ease: 'power3' } )
    const ringY = gsap.quickTo( ring, 'y', { duration: 0.55, ease: 'power3' } )

    let pointer = null
    let magnet = null
    let magnetTo = null
    let shownLabel = ''
    let frame = 0

    // Run engine: magnet springs home with small overshoot, like ball settling
    const release = ( el ) => {
      if ( el ) gsap.to( magnetBody( el ), { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.45)', overwrite: 'auto' } )
    }

    // Run engine: hover state from whatever sits under pointer (also re-run on scroll, page moves under still pointer)
    const sync = () => {
      frame = 0
      if ( !pointer ) return
      const hit = document.elementFromPoint( pointer.x, pointer.y )
      const nextMagnet = hit?.closest( MAGNET ) ?? null
      if ( nextMagnet !== magnet ) {
        release( magnet )
        magnet = nextMagnet
        magnetTo = magnet && {
          x: gsap.quickTo( magnetBody( magnet ), 'x', { duration: 0.6, ease: 'power3' } ),
          y: gsap.quickTo( magnetBody( magnet ), 'y', { duration: 0.6, ease: 'power3' } ),
        }
      }
      if ( magnet ) {
        const body = magnetBody( magnet )
        const box = magnet.getBoundingClientRect()
        // own translate removed from rect so pull settles instead of chasing itself
        const ownX = body === magnet ? gsap.getProperty( body, 'x' ) : 0
        const ownY = body === magnet ? gsap.getProperty( body, 'y' ) : 0
        magnetTo.x( ( pointer.x - ( box.left - ownX + box.width / 2 ) ) * PULL )
        magnetTo.y( ( pointer.y - ( box.top - ownY + box.height / 2 ) ) * PULL )
      }
      const labelled = hit?.closest( '[data-cursor]' )
      const text = labelled?.dataset.cursor ?? ''
      if ( text !== shownLabel ) {
        shownLabel = text
        if ( text ) label.textContent = text
      }
      ring.classList.toggle( 'is-label', Boolean( text ) )
      ring.classList.toggle( 'is-hover', !text && Boolean( hit?.closest( INTERACTIVE ) ) )
    }
    const queueSync = () => {
      if ( !frame ) frame = requestAnimationFrame( sync )
    }

    const onMove = ( event ) => {
      if ( event.pointerType !== 'mouse' ) return
      if ( !pointer ) {
        gsap.set( [ dot, ring ], { x: event.clientX, y: event.clientY } )
        gsap.to( [ dot, ring ], { autoAlpha: 1, duration: 0.3 } )
      }
      pointer = { x: event.clientX, y: event.clientY }
      dotX( pointer.x )
      dotY( pointer.y )
      ringX( pointer.x )
      ringY( pointer.y )
      queueSync()
    }
    const onLeave = () => {
      pointer = null
      release( magnet )
      magnet = null
      gsap.to( [ dot, ring ], { autoAlpha: 0, duration: 0.3 } )
    }
    const onDown = () => ring.classList.add( 'is-down' )
    const onUp = () => ring.classList.remove( 'is-down' )

    window.addEventListener( 'pointermove', onMove, { passive: true } )
    window.addEventListener( 'scroll', queueSync, { passive: true } )
    document.documentElement.addEventListener( 'pointerleave', onLeave )
    window.addEventListener( 'pointerdown', onDown )
    window.addEventListener( 'pointerup', onUp )

    return () => {
      cancelAnimationFrame( frame )
      release( magnet )
      window.removeEventListener( 'pointermove', onMove )
      window.removeEventListener( 'scroll', queueSync )
      document.documentElement.removeEventListener( 'pointerleave', onLeave )
      window.removeEventListener( 'pointerdown', onDown )
      window.removeEventListener( 'pointerup', onUp )
      root.classList.remove( 'has-cursor' )
    }
  }, [] )

  return (
    <div className="cursor" aria-hidden="true">
      <span className="cursor-dot" ref={ dotRef } />
      <span className="cursor-ring" ref={ ringRef }>
        <span className="cursor-label" ref={ labelRef } />
      </span>
    </div>
  )
}
