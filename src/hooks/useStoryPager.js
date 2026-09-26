import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createStoryNavigation } from '../storyNavigation'
import { createStoryScrollAdapter } from '../storyNavigationBrowser'
import { easeStoryTransition } from '../storyStage'
import { getTuning } from '../motion/runtimeTuning'
import { createLayoutResizeFilter } from '../viewportResize'

// Glide seconds back up to the Intro and between the other Pages; a wheel burst ends after a pause
// this long, and a gesture must move this far to count. The rewind is quick: the visitor asked for it.
const REWIND_SECONDS = 1
// Page glides take a base time plus a little per screen travelled, capped: a short hop is quick,
// a long one is unhurried, and none drags.
const GLIDE_BASE_SECONDS = 0.7
const GLIDE_SECONDS_PER_SCREEN = 0.14
const GLIDE_MAX_SECONDS = 1.5
const GESTURE_RESET_MS = 120
const GESTURE_THRESHOLD_PX = 14

// Keep DOM measurement in the React adapter; Story navigation itself stays framework-agnostic.
// Navigation spans the whole document: the pinned Intro → Studio stage and the normal-scroll
// sections after it, so Page progress is a share of the page's full scroll range. The viewport height
// tells navigation how far one Space press scrolls natively.
const getStoryMetrics = () => ( {
  top: 0,
  range: Math.max( 0, document.documentElement.scrollHeight - window.innerHeight ),
  viewport: window.innerHeight,
} )

// Scroll distance of the pinned stage alone (the Story section minus the sticky screen).
const getPinnedRange = ( storyRef ) =>
{
  const story = storyRef.current
  return story ? Math.max( 0, story.offsetHeight - window.innerHeight ) : 0
}

const getTransition = ( { fromPage, toPage } ) =>
{
  if ( fromPage?.id === 'intro' && toPage.id === 'studio' )
  {
    return {
      duration: getTuning().introSeconds,
      easing: easeStoryTransition,
    }
  }

  if ( fromPage?.id === 'studio' && toPage.id === 'intro' )
  {
    return {
      duration: REWIND_SECONDS,
      easing: easeStoryTransition,
    }
  }

  // Every other glide leaves at speed and settles softly (quart ease-out), like a camera landing on
  // its mark; its length follows the distance. Expo was too abrupt: it covered half the way in the
  // first ~80 ms, which reads as a jump on phones.
  const range = getStoryMetrics().range
  const screens = fromPage && range > 0
    ? Math.abs( toPage.targetProgress - fromPage.targetProgress ) * range / Math.max( 1, window.innerHeight )
    : 1
  return {
    duration: Math.min( GLIDE_MAX_SECONDS, GLIDE_BASE_SECONDS + GLIDE_SECONDS_PER_SCREEN * screens ),
    easing: easeGlideOut,
  }
}

// Quart ease-out: half the way in the first 16% of the time, then a long soft landing.
const easeGlideOut = ( t ) => 1 - Math.pow( 1 - Math.min( 1, Math.max( 0, t ) ), 4 )

/**
 * Thin React adapter for the deep Story navigation module. It mirrors stable
 * Page state while browser scroll ownership remains outside React rendering.
 */
export function useStoryPager ( {
  storyRef,
  pages,
  activePage,
  onPageChange,
  onIndicatorPageChange,
  onProgress,
} )
{
  const controllerRef = useRef( null )
  // The browser scroll adapter (Lenis or native): the flow choreography reads its velocity and
  // subscribes to its scroll events, the preloader holds it still, and ?tune changes its feel.
  const adapterRef = useRef( null )
  const pagesRef = useRef( pages )
  const targetPageRef = useRef( activePage )
  const isTransitioningRef = useRef( false )
  const [ isTransitioning, setIsTransitioning ] = useState( false )

  useEffect( () =>
  {
    pagesRef.current = pages
    controllerRef.current?.setPages( pages )
  }, [ pages ] )

  useLayoutEffect( () =>
  {
    const adapter = createStoryScrollAdapter()
    adapterRef.current = adapter
    const navigation = createStoryNavigation( {
      pages: pagesRef.current,
      initialPage: activePage,
      adapter,
      getMetrics: getStoryMetrics,
      eventTarget: window,
      clock: {
        now: () => Date.now(),
        setTimeout: ( callback, delay ) => window.setTimeout( callback, delay ),
        clearTimeout: ( timer ) => window.clearTimeout( timer ),
      },
      prefersReducedMotion: () => window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches,
      transitionFor: getTransition,
      gestureThresholdPx: GESTURE_THRESHOLD_PX,
      gestureResetMs: GESTURE_RESET_MS,
      // One gesture on the Intro plays the whole break to Studio (and back up from Studio).
      autoplaySpan: { from: 'intro', to: 'studio' },
      // Mobile address-bar slides must not refresh and snap the Story mid-glide.
      isLayoutResize: createLayoutResizeFilter( window ),
      onPageChange: ( pageId ) =>
      {
        targetPageRef.current = pageId
        onPageChange?.( pageId )
      },
      onIndicatorPageChange,
      // Mirror Lenis progress immediately so draft switches can restore the current playhead.
      onProgress,
      onTransitionChange: ( nextTransitioning, state ) =>
      {
        isTransitioningRef.current = nextTransitioning
        targetPageRef.current = state.targetPage || targetPageRef.current
        setIsTransitioning( nextTransitioning )
      },
    } )

    controllerRef.current = navigation
    navigation.mount()

    const story = storyRef.current
    const benchmarkRequested = new URLSearchParams( window.location.search ).get( 'benchmark' )
    // Expose controlled progress only for benchmark URLs; production has no scroll global.
    // Benchmarks drive the pinned Intro → Studio stage, so seekProgress/getProgress speak that
    // stage's 0-1 progress (the timeline's own units) and convert to the document position here.
    // The normal-scroll sections are reached by id through goToPage.
    const pinnedShare = () =>
    {
      const range = getStoryMetrics().range
      return range > 0 ? getPinnedRange( storyRef ) / range : 0
    }
    const benchmarkHandle = benchmarkRequested
      ? Object.freeze( {
        seekProgress: ( progress ) => navigation.seekProgress( progress * pinnedShare() ),
        getProgress: () =>
        {
          const share = pinnedShare()
          return share > 0 ? Math.min( 1, navigation.getProgress() / share ) : 0
        },
        goToPage: ( pageId ) => navigation.goToPage( pageId, { immediate: true } ),
        getState: () => navigation.getState(),
      } )
      : null
    if ( benchmarkHandle ) window.__storyNavigationBenchmark = benchmarkHandle
    story?.setAttribute( 'data-story-navigation-ready', 'true' )

    return () =>
    {
      story?.removeAttribute( 'data-story-navigation-ready' )
      if ( window.__storyNavigationBenchmark === benchmarkHandle ) delete window.__storyNavigationBenchmark
      navigation.destroy()
      controllerRef.current = null
      adapterRef.current = null
      isTransitioningRef.current = false
      setIsTransitioning( false )
    }
  }, [ onIndicatorPageChange, onPageChange, onProgress, storyRef ] )

  const goToPage = ( requestedPage, options = {} ) =>
    controllerRef.current?.goToPage( requestedPage, options ) ?? false
  // Keep controlled benchmark seeks behind the same adapter boundary as visitor navigation.
  const seekProgress = useCallback( ( progress ) =>
    controllerRef.current?.seekProgress( progress ) ?? null,
  [] )
  // Read the adapter's normalized position in the whole document so draft switches can preserve it.
  const getProgress = useCallback( () =>
    controllerRef.current?.getProgress() ?? 0,
  [] )

  // Adapter passthroughs. Each is stable for the life of the component and safe before mount.
  const subscribeScroll = useCallback( ( listener ) =>
    adapterRef.current?.onScroll( listener ) ?? ( () => {} ),
  [] )
  const getVelocity = useCallback( () => adapterRef.current?.getVelocity() ?? 0, [] )
  const stopScroll = useCallback( () => adapterRef.current?.stop(), [] )
  const startScroll = useCallback( () => adapterRef.current?.start(), [] )
  const setScrollFeel = useCallback( ( feel ) => adapterRef.current?.setFeel( feel ), [] )
  const scrollToY = useCallback( ( y, options ) => adapterRef.current?.scrollTo( y, options ), [] )

  return {
    goToPage,
    seekProgress,
    getProgress,
    subscribeScroll,
    getVelocity,
    stopScroll,
    startScroll,
    setScrollFeel,
    scrollToY,
    isTransitioning,
    isTransitioningRef,
    targetPage: targetPageRef.current,
  }
}
