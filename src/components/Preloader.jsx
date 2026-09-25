import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { STORY_TIMING } from '../storyTiming'
import brandLogo from '../assets/8BALL-V4.jpg'

// Set once the preloader has played, so reloads in the same browser session skip it.
const SESSION_KEY = '8ball:preloaded'

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
 * STORY_TIMING.flow.preloaderMinMs (no flash) and never longer than preloaderMaxMs, then lifts away.
 */
export function Preloader ( { whenReady, stopScroll, startScroll } )
{
  const rootRef = useRef( null )
  const countRef = useRef( null )
  const [ done, setDone ] = useState( alreadyShown )

  useEffect( () =>
  {
    if ( done ) return undefined
    const root = rootRef.current
    const count = countRef.current
    const { preloaderMinMs, preloaderMaxMs } = STORY_TIMING.flow
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
      : gsap.to( counter, { value: 90, duration: preloaderMaxMs / 1000, ease: 'power2.out', onUpdate: render } )

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
        gsap.to( root, { autoAlpha: 0, duration: 0.2, onComplete: lift } )
        return
      }
      gsap.timeline( { onComplete: lift } )
        .to( counter, { value: 100, duration: 0.35, ease: 'power2.out', onUpdate: render } )
        // The cover lifts off the Intro like a sheet pulled upward.
        .to( root, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.8, ease: 'expo.inOut' }, '+=0.1' )
    }

    const capTimer = window.setTimeout( finish, preloaderMaxMs )
    Promise.resolve( whenReady?.() )
      .catch( () => {} )
      .then( () =>
      {
        const remaining = Math.max( 0, preloaderMinMs - ( performance.now() - startedAt ) )
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
  }, [ done, whenReady, stopScroll, startScroll ] )

  if ( done ) return null
  return (
    <div className="preloader" ref={ rootRef } role="status" aria-live="polite">
      <img className="preloader-mark" src={ brandLogo } alt="" />
      <p className="preloader-count" aria-hidden="true"><span ref={ countRef }>000</span></p>
      <span className="visually-hidden">Loading 8 Ball Studio</span>
    </div>
  )
}
