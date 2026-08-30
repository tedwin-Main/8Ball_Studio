import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createStoryNavigation } from '../storyNavigation'
import { createStoryScrollAdapter } from '../storyNavigationBrowser'
import { STORY_TIMING, easeCinematicBreakTransition, easeStoryTransition } from '../storyTiming'

// Keep DOM measurement in the React adapter; Story navigation itself stays framework-agnostic.
const getStoryMetrics = ( storyRef ) =>
{
  const story = storyRef.current
  if ( !story ) return null

  const bounds = story.getBoundingClientRect()
  return {
    top: window.scrollY + bounds.top,
    range: Math.max( 0, story.offsetHeight - window.innerHeight ),
  }
}

const getTransition = ( { fromPage, toPage } ) =>
{
  if ( fromPage?.id === 'intro' && toPage.id === 'studio' )
  {
    return {
      duration: STORY_TIMING.navigation.introToStudioSeconds,
      easing: easeCinematicBreakTransition,
    }
  }

  if ( fromPage?.id === 'studio' && toPage.id === 'intro' )
  {
    return {
      duration: STORY_TIMING.navigation.studioToIntroSeconds,
      easing: easeCinematicBreakTransition,
    }
  }

  return {
    duration: STORY_TIMING.navigation.defaultEdgeSeconds,
    easing: easeStoryTransition,
  }
}

/**
 * Thin React adapter for the deep Story navigation module. It mirrors stable
 * Page state while browser scroll ownership remains outside React rendering.
 */
export function useStoryPager ( {
  storyRef,
  pages,
  activePage,
  onPageChange,
} )
{
  const controllerRef = useRef( null )
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
    const navigation = createStoryNavigation( {
      pages: pagesRef.current,
      initialPage: activePage,
      adapter,
      getMetrics: () => getStoryMetrics( storyRef ),
      eventTarget: window,
      clock: {
        now: () => Date.now(),
        setTimeout: ( callback, delay ) => window.setTimeout( callback, delay ),
        clearTimeout: ( timer ) => window.clearTimeout( timer ),
      },
      prefersReducedMotion: () => window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches,
      transitionFor: getTransition,
      gestureThresholdPx: STORY_TIMING.navigation.gestureThresholdPx,
      gestureResetMs: STORY_TIMING.navigation.gestureResetMs,
      onPageChange: ( pageId ) =>
      {
        targetPageRef.current = pageId
        onPageChange?.( pageId )
      },
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
    const benchmarkHandle = benchmarkRequested
      ? Object.freeze( {
        seekProgress: ( progress ) => navigation.seekProgress( progress ),
        getProgress: () => navigation.getProgress(),
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
      isTransitioningRef.current = false
      setIsTransitioning( false )
    }
  }, [ onPageChange, storyRef ] )

  const goToPage = ( requestedPage, options = {} ) =>
    controllerRef.current?.goToPage( requestedPage, options ) ?? false

  return {
    goToPage,
    isTransitioning,
    isTransitioningRef,
    targetPage: targetPageRef.current,
  }
}
