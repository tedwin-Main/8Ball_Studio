import gsap from 'gsap'
import Lenis from 'lenis'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { STORY_TIMING } from './storyTiming'

gsap.registerPlugin( ScrollTrigger )

// Story navigation owns the debounced resize seam; prevent ScrollTrigger's separate
// 200 ms resize refresh from racing the normalized-progress restore.
ScrollTrigger.config( {
  autoRefreshEvents: 'visibilitychange,DOMContentLoaded,load',
} )

const NATIVE_INPUT_EVENTS = [ 'wheel', 'touchstart', 'touchmove', 'touchend', 'touchcancel' ]

/**
 * Adapts Lenis or native scrolling to Story navigation. The adapter owns the
 * ticker, ScrollTrigger proxy, virtual input, and resource cleanup.
 */
export function createStoryScrollAdapter ( {
  eventTarget = window,
  documentTarget = document,
  // Weighted smoothing only when the visitor has not asked for reduced motion (as hugeinc.com does):
  // with reduced motion the page scrolls natively and the adapter's native path takes over.
  smooth = !eventTarget.matchMedia?.( '(prefers-reduced-motion: reduce)' )?.matches,
} = {} )
{
  let lenis = null
  let destroyed = false
  let virtualScrollHandler = () => true
  const scrollListeners = new Set()
  const nativeVirtualListeners = new Map()
  let nativeScrollAttached = false

  const notifyScroll = ( event ) =>
  {
    scrollListeners.forEach( ( listener ) => listener( event ) )
  }

  const handleLenisScroll = ( event ) =>
  {
    // ScrollTrigger reads the eased Lenis position before Story observes settlement.
    ScrollTrigger.update()
    notifyScroll( event )
  }

  const driveLenis = ( time ) =>
  {
    if ( !destroyed ) lenis?.raf( time * 1000 )
  }

  // Lenis measures the page once (autoResize is off, see below), but the page grows after mount:
  // the Projects run adds its length (--run-distance) on every ScrollTrigger refresh. Re-measure
  // Lenis after each refresh, or its scroll limit stays short and the wheel can't reach Contact.
  const syncLenisLimit = () =>
  {
    if ( !destroyed ) lenis?.resize()
  }

  try
  {
    if ( !smooth ) throw new Error( 'reduced motion: native scroll' )
    // Keep the adapter's production path identical to the existing weighted scroll behavior.
    lenis = new Lenis( {
      wheelMultiplier: STORY_TIMING.scroll.wheelMultiplier,
      // Free scroll leaves touch to the phone's native momentum (as the reference site does);
      // paged mode needs Lenis-owned touch so its gesture lock can hold the page still.
      syncTouch: !STORY_TIMING.navigation.freeScroll,
      syncTouchLerp: STORY_TIMING.scroll.syncTouchLerp,
      // Lenis-owned touch only (paged mode): swipe distance and how strongly a flick carries on.
      touchMultiplier: STORY_TIMING.scroll.touchMultiplier,
      touchInertiaExponent: STORY_TIMING.scroll.touchInertiaExponent,
      infinite: false,
      gestureOrientation: 'vertical',
      lerp: STORY_TIMING.scroll.lerp,
      autoRaf: false,
      // Story navigation debounces viewport changes and calls refresh explicitly;
      // disabling Lenis's delayed observer prevents it from undoing progress retention.
      autoResize: false,
      virtualScroll: ( input ) => virtualScrollHandler( input ),
    } )
  }
  catch ( error )
  {
    lenis = null
    // Native scrolling keeps the Story usable when Lenis cannot initialize on a device
    // (reduced motion takes this path on purpose, so it is not worth a warning).
    if ( smooth ) console.warn( 'Story Lenis unavailable; native scroll adapter active.', error )
  }

  const attachNativeScroll = () =>
  {
    if ( nativeScrollAttached || lenis ) return
    nativeScrollAttached = true
    eventTarget.addEventListener( 'scroll', notifyScroll, { passive: true } )
  }

  const detachNativeScroll = () =>
  {
    if ( !nativeScrollAttached ) return
    nativeScrollAttached = false
    eventTarget.removeEventListener( 'scroll', notifyScroll )
  }

  if ( lenis )
  {
    const body = documentTarget.body
    if ( body )
    {
      ScrollTrigger.scrollerProxy( body, {
        scrollTop ( value )
        {
          // ScrollTrigger may retain this proxy briefly while React tears down an adapter.
          // Fall back to native scroll instead of dereferencing the disposed Lenis instance.
          if ( arguments.length ) lenis?.scrollTo( value )
          const currentScroll = lenis?.scroll
          return Number.isFinite( currentScroll ) ? currentScroll : eventTarget.scrollY
        },
        getBoundingClientRect ()
        {
          return {
            top: 0,
            left: 0,
            width: eventTarget.innerWidth,
            height: eventTarget.innerHeight,
          }
        },
      } )
    }
    lenis.on( 'scroll', handleLenisScroll )
    ScrollTrigger.addEventListener( 'refresh', syncLenisLimit )
    gsap.ticker.add( driveLenis )
    // Disable ticker lag smoothing so a delayed frame cannot jump Story progress.
    gsap.ticker.lagSmoothing( 0 )
  }

  const onScroll = ( listener ) =>
  {
    if ( typeof listener !== 'function' ) return () => {}
    scrollListeners.add( listener )
    attachNativeScroll()
    return () => scrollListeners.delete( listener )
  }

  const onVirtualScroll = ( listener ) =>
  {
    virtualScrollHandler = typeof listener === 'function' ? listener : () => true
    if ( lenis )
    {
      return () =>
      {
        if ( virtualScrollHandler === listener ) virtualScrollHandler = () => true
      }
    }

    NATIVE_INPUT_EVENTS.forEach( ( type ) =>
    {
      const handler = ( event ) => virtualScrollHandler( {
        deltaY: Number.isFinite( event.deltaY ) ? event.deltaY : 0,
        event,
      } )
      nativeVirtualListeners.set( type, handler )
      eventTarget.addEventListener( type, handler, { passive: false } )
    } )

    return () =>
    {
      NATIVE_INPUT_EVENTS.forEach( ( type ) =>
      {
        const handler = nativeVirtualListeners.get( type )
        if ( !handler ) return
        eventTarget.removeEventListener( type, handler )
        nativeVirtualListeners.delete( type )
      } )
      if ( virtualScrollHandler === listener ) virtualScrollHandler = () => true
    }
  }

  const getScrollPosition = () =>
    lenis && Number.isFinite( lenis.scroll ) ? lenis.scroll : eventTarget.scrollY

  const scrollTo = ( targetY, options = {} ) =>
  {
    if ( lenis )
    {
      lenis.scrollTo( targetY, options )
      return
    }

    eventTarget.scrollTo( {
      top: targetY,
      left: 0,
      behavior: options.immediate ? 'auto' : 'smooth',
    } )
    if ( options.immediate ) options.onComplete?.()
  }

  // Scroll speed in px per frame (signed), for the velocity skew. Lenis tracks it for wheel and for
  // native touch momentum alike; the native fallback (reduced motion) reports 0, so nothing leans.
  const getVelocity = () => ( lenis && Number.isFinite( lenis.velocity ) ? lenis.velocity : 0 )

  // Holds the page still (the preloader) and lets it go again.
  const stop = () =>
  {
    if ( lenis ) lenis.stop()
    else documentTarget.documentElement.style.overflow = 'hidden'
  }

  const start = () =>
  {
    if ( lenis ) lenis.start()
    else documentTarget.documentElement.style.removeProperty( 'overflow' )
  }

  // Live scroll feel for the ?tune panel. Lenis reads lerp from its options on every input, and the
  // wheel multiplier from its VirtualScroll's options.
  const setFeel = ( { lerp, wheelMultiplier } = {} ) =>
  {
    if ( !lenis ) return
    if ( Number.isFinite( lerp ) && lerp > 0 ) lenis.options.lerp = lerp
    if ( Number.isFinite( wheelMultiplier ) && wheelMultiplier > 0 )
    {
      lenis.options.wheelMultiplier = wheelMultiplier
      if ( lenis.virtualScroll?.options ) lenis.virtualScroll.options.wheelMultiplier = wheelMultiplier
    }
  }

  const refresh = () =>
  {
    // Recompute Lenis limits before ScrollTrigger measures the Story range.
    lenis?.resize()
    ScrollTrigger.refresh()
    ScrollTrigger.update()
  }

  const destroy = () =>
  {
    if ( destroyed ) return
    destroyed = true
    detachNativeScroll()
    NATIVE_INPUT_EVENTS.forEach( ( type ) =>
    {
      const handler = nativeVirtualListeners.get( type )
      if ( !handler ) return
      eventTarget.removeEventListener( type, handler )
      nativeVirtualListeners.delete( type )
    } )
    scrollListeners.clear()
    virtualScrollHandler = () => true

    if ( lenis )
    {
      lenis.off( 'scroll', handleLenisScroll )
      ScrollTrigger.removeEventListener( 'refresh', syncLenisLimit )
      gsap.ticker.remove( driveLenis )
      lenis.destroy()
      const body = documentTarget.body
      if ( body ) ScrollTrigger.scrollerProxy( body, null )
      lenis = null
    }
  }

  return {
    getScrollPosition,
    getVelocity,
    scrollTo,
    onScroll,
    onVirtualScroll,
    stop,
    start,
    setFeel,
    refresh,
    destroy,
    get isFallback () { return !lenis },
  }
}
