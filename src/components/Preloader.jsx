import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import brandLogo from '../assets/8BALL-V4.jpg'

// Set once the preloader has played, so reloads in the same browser session skip it.
const SESSION_KEY = '8ball:preloaded'
// Shown at least this long (no flash) and never longer than the cap.
const MIN_MS = 600
const MAX_MS = 2500
// When the preloader is skipped (a reload in the same session), the Intro is revealed as soon as it
// is ready, but never later than this.
const SKIPPED_REVEAL_CAP_MS = 1200

// Storage can be missing or throw (private windows, blocked site data): treat that as "not shown yet"
// when reading and ignore it when writing, so the site always renders.
const alreadyShown = () =>
{
  try { return window.sessionStorage.getItem( SESSION_KEY ) === '1' }
  catch { return false }
}

const rememberShown = () =>
{
  try { window.sessionStorage.setItem( SESSION_KEY, '1' ) }
  catch { /* the preloader simply plays again next time */ }
}

const padCount = ( value ) => String( Math.round( value ) ).padStart( 3, '0' )

/**
 * Preloader: covers the Story only while its fonts and the active intro Draft load, once per
 * session. It holds the scroll still, counts 000 → 100 in the look's label face, stays at least
 * MIN_MS (no flash) and never longer than MAX_MS, then lifts away.
 * onReveal marks the moment the Intro starts to show, so its opening shot can play: as the cover
 * starts to lift, or, when the preloader is skipped, as soon as the Intro is ready.
 */
export function Preloader ( { whenReady, stopScroll, startScroll, onReveal } )
{
  const rootRef = useRef( null )
  const countRef = useRef( null )
  const [ done, setDone ] = useState( alreadyShown )
  // Whether this page load skipped the preloader (read once: `done` changes when it lifts).
  const skippedRef = useRef( done )

  useEffect( () =>
  {
    if ( !skippedRef.current ) return undefined
    let revealed = false
    const reveal = () =>
    {
      if ( revealed ) return
      revealed = true
      onReveal?.()
    }
    const cap = window.setTimeout( reveal, SKIPPED_REVEAL_CAP_MS )
    Promise.resolve( whenReady?.() ).catch( () => {} ).then( reveal )
    return () =>
    {
      revealed = true
      window.clearTimeout( cap )
    }
  }, [ whenReady, onReveal ] )

  useEffect( () =>
  {
    if ( done ) return undefined
    const root = rootRef.current
    const count = countRef.current
    const reduceMotion = window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches
    const startedAt = performance.now()
    const counter = { value: 0 }
    const render = () => { count.textContent = padCount( counter.value ) }
    let finished = false
    let settleTimer = 0

    stopScroll?.()
    // While loading, the count creeps toward 90 over the longest allowed wait; it only reaches
    // 100 once everything is ready, so it never claims more than it knows.
    const creep = reduceMotion
      ? null
      : gsap.to( counter, { value: 90, duration: MAX_MS / 1000, ease: 'power2.out', onUpdate: render } )

    const lift = () =>
    {
      rememberShown()
      startScroll?.()
      setDone( true )
    }

    const finish = () =>
    {
      if ( finished ) return
      finished = true
      window.clearTimeout( settleTimer )
      creep?.kill()
      if ( reduceMotion )
      {
        counter.value = 100
        render()
        onReveal?.()
        gsap.to( root, { autoAlpha: 0, duration: 0.2, onComplete: lift } )
        return
      }
      gsap.timeline( { onComplete: lift } )
        .to( counter, { value: 100, duration: 0.35, ease: 'power2.out', onUpdate: render } )
        // The Intro's opening shot starts with the lift, so it plays as the cover uncovers it.
        .call( () => onReveal?.(), null, '+=0.1' )
        // The cover lifts off the Intro like a sheet pulled upward.
        .to( root, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.8, ease: 'expo.inOut' }, '<' )
    }

    const capTimer = window.setTimeout( finish, MAX_MS )
    Promise.resolve( whenReady?.() )
      .catch( () => {} )
      .then( () =>
      {
        const remaining = Math.max( 0, MIN_MS - ( performance.now() - startedAt ) )
        settleTimer = window.setTimeout( finish, remaining )
      } )

    return () =>
    {
      window.clearTimeout( capTimer )
      window.clearTimeout( settleTimer )
      gsap.killTweensOf( [ counter, root ] )
      // Never leave the page frozen if the preloader unmounts mid-way.
      startScroll?.()
    }
  }, [ done, whenReady, stopScroll, startScroll, onReveal ] )

  if ( done ) return null
  return (
    <div className="preloader" ref={ rootRef } role="status" aria-live="polite">
      <img className="preloader-mark" src={ brandLogo } alt="" />
      <p className="preloader-count" aria-hidden="true"><span ref={ countRef }>000</span></p>
      <span className="visually-hidden">Loading 8 Ball Studio</span>
    </div>
  )
}
