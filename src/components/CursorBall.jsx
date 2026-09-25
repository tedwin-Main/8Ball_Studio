import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { STORY_TIMING } from '../storyTiming'

// Where the system cursor comes back: controls the ball would only get in the way of.
const NATIVE_CURSOR_ZONES = '.look-switcher, .draft-switcher, .tune-panel, select, input, textarea'
// Anything clickable swells the ball a little, even without a label.
const INTERACTIVE = 'a, button, [role="button"], label'

// Mouse and trackpad only, and only when the visitor has not asked for reduced motion (the ball
// trails the pointer, which is motion). Touch screens and pens keep their own pointer.
const canUseBall = () =>
  typeof window !== 'undefined' &&
  window.matchMedia( '(hover: hover) and (pointer: fine)' ).matches &&
  !window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches

// The part of the Story under the pointer, so the ball can take that section's colours.
const sectionOf = ( element ) =>
{
  if ( element?.closest( '.contact-screen' ) ) return 'contact'
  if ( element?.closest( '.projects-screen' ) ) return 'projects'
  return 'stage'
}

/**
 * Cue-ball cursor: a small ball replaces the pointer and trails it by STORY_TIMING.flow.cursorLagSeconds.
 * Over anything carrying data-cursor it shows that action as a label ("Message", "Contact"...);
 * over other links and buttons it swells. Its colours come from the look and the section under it.
 */
export function CursorBall ()
{
  const ballRef = useRef( null )
  const labelRef = useRef( null )
  const [ enabled ] = useState( canUseBall )

  useEffect( () =>
  {
    if ( !enabled ) return undefined
    const ball = ballRef.current
    const label = labelRef.current
    const root = ball.closest( '.experience' )
    root?.classList.add( 'has-cursor-ball' )

    const lag = STORY_TIMING.flow.cursorLagSeconds
    // quickTo keeps one tween per axis and retargets it, instead of a new tween per pointer event.
    const toX = gsap.quickTo( ball, 'x', { duration: lag, ease: 'power3.out' } )
    const toY = gsap.quickTo( ball, 'y', { duration: lag, ease: 'power3.out' } )
    let shown = false

    const onMove = ( event ) =>
    {
      if ( event.pointerType && event.pointerType !== 'mouse' ) return
      if ( !shown )
      {
        // First contact: appear at the pointer instead of flying in from the corner.
        gsap.set( ball, { x: event.clientX, y: event.clientY } )
        shown = true
        ball.dataset.visible = 'true'
      }
      toX( event.clientX )
      toY( event.clientY )

      const target = event.target instanceof Element ? event.target : null
      const labelled = target?.closest( '[data-cursor]' )
      let state = 'rest'
      if ( target?.closest( NATIVE_CURSOR_ZONES ) ) state = 'hidden'
      else if ( labelled?.dataset.cursor ) state = 'label'
      else if ( target?.closest( INTERACTIVE ) ) state = 'hover'
      const text = state === 'label' ? labelled.dataset.cursor : ''
      const section = sectionOf( target )

      // Touch the DOM only when something changed: pointermove fires far more often than frames.
      if ( ball.dataset.state !== state ) ball.dataset.state = state
      if ( ball.dataset.section !== section ) ball.dataset.section = section
      if ( text && label.textContent !== text ) label.textContent = text
    }
    const onLeave = () =>
    {
      shown = false
      ball.dataset.visible = 'false'
    }
    const onDown = () => { ball.dataset.pressed = 'true' }
    const onUp = () => { ball.dataset.pressed = 'false' }

    window.addEventListener( 'pointermove', onMove, { passive: true } )
    window.addEventListener( 'pointerdown', onDown, { passive: true } )
    window.addEventListener( 'pointerup', onUp, { passive: true } )
    document.documentElement.addEventListener( 'pointerleave', onLeave )
    window.addEventListener( 'blur', onLeave )

    return () =>
    {
      window.removeEventListener( 'pointermove', onMove )
      window.removeEventListener( 'pointerdown', onDown )
      window.removeEventListener( 'pointerup', onUp )
      document.documentElement.removeEventListener( 'pointerleave', onLeave )
      window.removeEventListener( 'blur', onLeave )
      gsap.killTweensOf( ball )
      root?.classList.remove( 'has-cursor-ball' )
    }
  }, [ enabled ] )

  if ( !enabled ) return null
  return (
    <div className="cursor-ball" ref={ ballRef } aria-hidden="true" data-visible="false" data-state="rest" data-section="stage">
      <span className="cursor-ball-dot" />
      <span className="cursor-ball-label" ref={ labelRef } />
    </div>
  )
}
