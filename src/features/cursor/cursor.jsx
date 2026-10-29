/**
 * FILE: src/features/cursor/cursor.jsx
 * PURPOSE: custom cursor (dot + lagging ring + label + side hint), magnetic pull on buttons, roll-text link label
 * UI: Site > every screen (fine pointer only)
 * USED BY: app.jsx, features/navigation/nav.jsx, features/footer/footer.jsx
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

// x/y quickTo pair, called together with one point
const quickXY = ( el, duration ) => {
  const x = gsap.quickTo( el, 'x', { duration, ease: 'power3' } )
  const y = gsap.quickTo( el, 'y', { duration, ease: 'power3' } )
  return ( point ) => {
    x( point.x )
    y( point.y )
  }
}

// adds listener, returns its remover
const listen = ( target, type, handler, options ) => {
  target.addEventListener( type, handler, options )
  return () => target.removeEventListener( type, handler )
}

// pulls magnet toward pointer by PULL share of offset from its centre
const pullMagnet = ( magnet, moveTo, pointer ) => {
  const body = magnetBody( magnet )
  const box = magnet.getBoundingClientRect()
  // own translate removed from rect so pull settles instead of chasing itself
  const ownX = body === magnet ? gsap.getProperty( body, 'x' ) : 0
  const ownY = body === magnet ? gsap.getProperty( body, 'y' ) : 0
  moveTo( {
    x: ( pointer.x - ( box.left - ownX + box.width / 2 ) ) * PULL,
    y: ( pointer.y - ( box.top - ownY + box.height / 2 ) ) * PULL,
  } )
}

// Site > any link/button: label rolls up, copy below takes its place (pure CSS, see .roll in roll-text.css)
export function RollText( { children } ) {
  return (
    <span className="roll">
      <span className="roll-in">{ children }</span>
    </span>
  )
}

// Site > pointer: dot tracks pointer tight, ring trails with weight, grows over links, shows label over [data-cursor],
// side tag over [data-cursor-hint]
export function Cursor() {
  const dotRef = useRef( null )
  const ringRef = useRef( null )
  const labelRef = useRef( null )
  const hintRef = useRef( null )
  const hintTextRef = useRef( null )

  useLayoutEffect( () => {
    // touch and reduced motion keep native cursor, no magnets
    if ( !window.matchMedia( '(hover: hover) and (pointer: fine)' ).matches ) return undefined
    if ( window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches ) return undefined

    const dot = dotRef.current
    const ring = ringRef.current
    const label = labelRef.current
    const hint = hintRef.current
    const root = document.documentElement
    root.classList.add( 'has-cursor' )
    gsap.set( [ dot, ring ], { xPercent: -50, yPercent: -50, autoAlpha: 0 } )

    const dotTo = quickXY( dot, 0.1 )
    const ringTo = quickXY( ring, 0.55 )
    // own tweens (not ring's): ring is centred on pointer, hint sits beside it
    gsap.set( hint, { yPercent: -50 } )
    const hintTo = quickXY( hint, 0.55 )

    let pointer = null
    let magnet = null
    let magnetTo = null
    let shownLabel = ''
    let shownHint = ''
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
        magnetTo = magnet && quickXY( magnetBody( magnet ), 0.6 )
      }
      if ( magnet ) pullMagnet( magnet, magnetTo, pointer )
      const labelled = hit?.closest( '[data-cursor]' )
      const text = labelled?.dataset.cursor ?? ''
      if ( text !== shownLabel ) {
        shownLabel = text
        if ( text ) label.textContent = text
      }
      ring.classList.toggle( 'is-label', Boolean( text ) )
      const hintText = hit?.closest( '[data-cursor-hint]' )?.dataset.cursorHint ?? ''
      if ( hintText !== shownHint ) {
        shownHint = hintText
        if ( hintText ) hintTextRef.current.textContent = hintText
        hint.classList.toggle( 'is-shown', Boolean( hintText ) )
      }
      ring.classList.toggle( 'is-hover', !text && Boolean( hit?.closest( INTERACTIVE ) ) )
    }
    const queueSync = () => {
      if ( !frame ) frame = requestAnimationFrame( sync )
    }

    const onMove = ( event ) => {
      if ( event.pointerType !== 'mouse' ) return
      if ( !pointer ) {
        gsap.set( [ dot, ring, hint ], { x: event.clientX, y: event.clientY } )
        gsap.to( [ dot, ring ], { autoAlpha: 1, duration: 0.3 } )
      }
      pointer = { x: event.clientX, y: event.clientY }
      dotTo( pointer )
      ringTo( pointer )
      hintTo( pointer )
      queueSync()
    }
    const onLeave = () => {
      pointer = null
      release( magnet )
      magnet = null
      shownHint = ''
      hint.classList.remove( 'is-shown' )
      gsap.to( [ dot, ring ], { autoAlpha: 0, duration: 0.3 } )
    }
    const onDown = () => ring.classList.add( 'is-down' )
    const onUp = () => ring.classList.remove( 'is-down' )

    const unlisten = [
      listen( window, 'pointermove', onMove, { passive: true } ),
      listen( window, 'scroll', queueSync, { passive: true } ),
      listen( root, 'pointerleave', onLeave ),
      listen( window, 'pointerdown', onDown ),
      listen( window, 'pointerup', onUp ),
    ]

    return () => {
      cancelAnimationFrame( frame )
      release( magnet )
      unlisten.forEach( ( remove ) => remove() )
      root.classList.remove( 'has-cursor' )
    }
  }, [] )

  return (
    <div className="cursor" aria-hidden="true">
      <span className="cursor-dot" ref={ dotRef } />
      <span className="cursor-ring" ref={ ringRef }>
        <span className="cursor-label" ref={ labelRef } />
      </span>
      <span className="cursor-hint" ref={ hintRef }>
        <span className="break-cue" />
        <span ref={ hintTextRef } />
      </span>
    </div>
  )
}
