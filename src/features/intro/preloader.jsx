/**
 * FILE: src/features/intro/preloader.jsx
 * PURPOSE: rack preloader, 15 balls fill triangle with 0-100 counter, break scatters them, panel lifts into hero
 * UI: Site > Preloader
 * USED BY: app.jsx
 * KEY EXPORTS: Preloader
 */

import { useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { finishIntro, intro } from './intro-state'
import { STUDIO } from '../../config/site-content'

// rack rows, apex first: 1 + 2 + 3 + 4 + 5 = 15 balls
const RACK = [ 1, 2, 3, 4, 5 ]
// shortest intro, even on warm cache: counter needs time to read as a count, not a flash
const MIN_SECONDS = 1.5

// Preloader > rack: triangle of 15 balls, apex at top, 8 ball in middle of row 3 like a real rack
function Rack() {
  let n = 0
  return (
    <div className="rack" aria-hidden="true">
      { RACK.map( ( count, row ) => (
        <div className="rack-row" key={ row }>
          { Array.from( { length: count }, ( _, col ) => {
            n += 1
            return <span className={ `rack-ball${ row === 2 && col === 1 ? ' is-eight' : '' }` } data-n={ n } key={ col } />
          } ) }
        </div>
      ) ) }
    </div>
  )
}

// Preloader > panel: counts real readiness (fonts, then window load), then breaks rack and lifts away
export function Preloader() {
  const [ gone, setGone ] = useState( intro.skip )
  const rootRef = useRef( null )
  const countRef = useRef( null )

  useLayoutEffect( () => {
    if ( intro.skip ) return undefined
    const root = rootRef.current
    const balls = [ ...root.querySelectorAll( '.rack-ball' ) ]
    // fresh visit always starts at table, not restored mid-page scroll
    window.history.scrollRestoration = 'manual'
    window.scrollTo( 0, 0 )
    document.documentElement.classList.add( 'is-loading' )

    const state = { shown: 0, target: 10 }
    const started = performance.now()
    let finished = false

    // Run engine: lit balls and counter follow shown value
    const paint = () => {
      const value = Math.round( state.shown )
      countRef.current.textContent = String( value ).padStart( 3, '0' )
      balls.forEach( ( ball, index ) => ball.classList.toggle( 'is-lit', value >= ( ( index + 1 ) / balls.length ) * 100 ) )
    }

    // Run engine: shown value chases target, never jumps
    const chase = () => gsap.to( state, {
      shown: state.target,
      duration: 0.9,
      ease: 'power2.out',
      overwrite: true,
      onUpdate: paint,
      onComplete: () => {
        if ( state.shown >= 100 ) leave()
      },
    } )

    const raise = ( value ) => {
      state.target = Math.max( state.target, value )
      chase()
    }

    // Preloader > exit: rack breaks (balls scatter like hero break), counter drops, panel wipes up
    const leave = () => {
      if ( finished ) return
      finished = true
      const wait = Math.max( 0, MIN_SECONDS - ( performance.now() - started ) / 1000 )
      gsap.timeline( {
        delay: wait,
        onComplete: () => {
          document.documentElement.classList.remove( 'is-loading' )
          setGone( true )
        },
      } )
        .to( balls, {
          x: () => gsap.utils.random( -260, 260 ),
          y: () => gsap.utils.random( -160, 220 ),
          rotation: () => gsap.utils.random( -180, 180 ),
          autoAlpha: 0,
          duration: 0.9,
          ease: 'expo.out',
          stagger: { each: 0.012, from: 'start' },
        } )
        .to( root.querySelectorAll( '.preloader-count, .preloader-meta' ), { yPercent: 110, duration: 0.6, ease: 'power3.in' }, 0 )
        .to( root, { clipPath: 'inset(0% 0% 100% 0%)', duration: 1.05, ease: 'power3.inOut' }, 0.35 )
        // hero title starts rising while panel still lifting, so hand-off reads as one move
        .call( finishIntro, null, 0.75 )
    }

    raise( 35 )
    document.fonts?.ready.then( () => raise( 70 ) )
    if ( document.readyState === 'complete' ) raise( 100 )
    else window.addEventListener( 'load', () => raise( 100 ), { once: true } )

    return () => {
      gsap.killTweensOf( state )
      document.documentElement.classList.remove( 'is-loading' )
    }
  }, [] )

  if ( gone ) return null

  return (
    <div className="preloader" ref={ rootRef } role="status" aria-label="Loading 8ightBall Studio">
      <Rack />
      <div className="preloader-foot">
        <span className="preloader-mask"><span className="preloader-meta">Racking up</span></span>
        <span className="preloader-mask"><span className="preloader-count" ref={ countRef }>000</span></span>
        <span className="preloader-mask"><span className="preloader-meta">{ STUDIO.city }</span></span>
      </div>
    </div>
  )
}
