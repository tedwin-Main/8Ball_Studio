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

  try
  {
    // Keep the adapter's production path identical to the existing weighted scroll behavior.
    lenis = new Lenis( {
      wheelMultiplier: STORY_TIMING.scroll.wheelMultiplier,
      syncTouch: true,
      syncTouchLerp: STORY_TIMING.scroll.syncTouchLerp,
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
    // Native scrolling keeps the Story usable when Lenis cannot initialize on a device.
    console.warn( 'Story Lenis unavailable; native scroll adapter active.', error )
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
      gsap.ticker.remove( driveLenis )
      lenis.destroy()
      const body = documentTarget.body
      if ( body ) ScrollTrigger.scrollerProxy( body, null )
      lenis = null
    }
  }

  return {
    getScrollPosition,
    scrollTo,
    onScroll,
    onVirtualScroll,
    refresh,
    destroy,
    get isFallback () { return !lenis },
  }
}
