import { useCallback, useEffect, useRef, useState } from 'react'
import {
  STORY_TIMING,
  easeCinematicBreakTransition,
  easeStoryTransition,
} from '../storyTiming'

// Wait for viewport resizing to settle before refreshing scroll metrics.
const RESIZE_SETTLE_MS = 150

const clampPageIndex = ( index, pageCount ) =>
  Math.min( pageCount - 1, Math.max( 0, index ) )

const isEditableTarget = ( target ) =>
{
  if ( !( target instanceof HTMLElement ) ) return false

  return (
    target.isContentEditable ||
    target.matches( 'input, textarea, select, option' )
  )
}

export function useStoryPager ( {
  storyRef,
  pages,
  activePage,
  onPageChange,
} )
{
  const activePageRef = useRef( activePage )
  const [ isTransitioning, setIsTransitioning ] = useState( false )
  const isTransitioningRef = useRef( false )
  const targetPageRef = useRef( activePage )
  const accumulatedDeltaRef = useRef( 0 )
  const lastGestureTimeRef = useRef( 0 )
  const transitionCleanupTimerRef = useRef( 0 )

  useEffect( () =>
  {
    activePageRef.current = activePage
  }, [ activePage ] )

  const getStoryMetrics = useCallback( () =>
  {
    const story = storyRef.current
    if ( !story ) return null

    const bounds = story.getBoundingClientRect()
    return {
      top: window.scrollY + bounds.top,
      range: Math.max( 0, story.offsetHeight - window.innerHeight ),
    }
  }, [ storyRef ] )

  const getTargetY = useCallback( ( pageIndex ) =>
  {
    const metrics = getStoryMetrics()
    const page = pages[ pageIndex ]

    if ( !metrics || !page ) return null

    return Math.round( metrics.top + metrics.range * page.targetProgress )
  }, [ getStoryMetrics, pages ] )

  const getNearestPageIndex = useCallback( () =>
  {
    const metrics = getStoryMetrics()
    if ( !metrics || metrics.range === 0 ) return 0

    const progress = Math.min(
      1,
      Math.max( 0, ( window.scrollY - metrics.top ) / metrics.range ),
    )

    return pages.reduce(
      ( currentIndex, page, index ) =>
        progress >= page.startProgress ? index : currentIndex,
      0,
    )
  }, [ getStoryMetrics, pages ] )

  const completeTransition = useCallback( ( destinationIndex ) =>
  {
    window.clearTimeout( transitionCleanupTimerRef.current )
    isTransitioningRef.current = false
    setIsTransitioning( false )
    activePageRef.current = destinationIndex
    targetPageRef.current = destinationIndex
    accumulatedDeltaRef.current = 0
    onPageChange?.( destinationIndex )
  }, [ onPageChange ] )

  const goToPage = useCallback( ( requestedIndex, options = {} ) =>
  {
    const fromIndex = activePageRef.current
    const destinationIndex = clampPageIndex( requestedIndex, pages.length )
    const targetY = getTargetY( destinationIndex )

    if ( targetY === null ) return false

    const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    const isImmediate = options.immediate === true || prefersReducedMotion

    // Lock incoming gestures immediately to prevent skipping
    isTransitioningRef.current = !isImmediate
    setIsTransitioning( !isImmediate )
    targetPageRef.current = destinationIndex
    accumulatedDeltaRef.current = 0

    if ( isImmediate )
    {
      if ( window.lenis )
      {
        window.lenis.scrollTo( targetY, {
          immediate: true,
          force: true,
          programmatic: true,
        } )
      }
      else
      {
        window.scrollTo( { top: targetY, left: 0, behavior: 'auto' } )
      }

      completeTransition( destinationIndex )
      return true
    }

    // Determine per-edge duration and easing curve
    let duration = STORY_TIMING.navigation.defaultEdgeSeconds
    let easing = easeStoryTransition

    if ( fromIndex === 0 && destinationIndex === 1 )
    {
      duration = STORY_TIMING.navigation.introToStudioSeconds
      easing = easeCinematicBreakTransition
    }
    else if ( fromIndex === 1 && destinationIndex === 0 )
    {
      duration = STORY_TIMING.navigation.studioToIntroSeconds
      easing = easeCinematicBreakTransition
    }

    if ( window.lenis )
    {
      window.lenis.scrollTo( targetY, {
        duration,
        easing,
        immediate: false,
        lock: true,
        force: true,
        programmatic: true,
        onComplete: () =>
        {
          completeTransition( destinationIndex )
        },
      } )
    }
    else
    {
      window.scrollTo( { top: targetY, left: 0, behavior: 'smooth' } )
      completeTransition( destinationIndex )
    }

    // Safety timeout ensures input re-arms even if frame loop is throttled
    window.clearTimeout( transitionCleanupTimerRef.current )
    transitionCleanupTimerRef.current = window.setTimeout( () =>
    {
      if ( isTransitioningRef.current )
      {
        completeTransition( destinationIndex )
      }
    }, Math.round( ( duration + 0.25 ) * 1000 ) )

    return true
  }, [ completeTransition, getTargetY, pages.length ] )

  const handleVirtualScroll = useCallback( ( scrollInput ) =>
  {
    const { deltaY, event } = scrollInput
    const isWheel = event?.type?.includes( 'wheel' )
    const isTouch = event?.type?.includes( 'touch' )

    if ( !( isWheel || isTouch ) ) return true

    // Consume all scroll input during in-flight transition
    if ( isTransitioningRef.current )
    {
      if ( event?.cancelable ) event.preventDefault()
      return false
    }

    const now = Date.now()
    if ( now - lastGestureTimeRef.current > STORY_TIMING.navigation.gestureResetMs )
    {
      accumulatedDeltaRef.current = 0
    }
    lastGestureTimeRef.current = now

    // Support touch-end inertia and continuous wheel delta
    const isTouchEnd = event?.type === 'touchend'
    const effectiveDelta = isTouchEnd && window.lenis
      ? Math.sign( window.lenis.velocity ) * Math.pow(
        Math.abs( window.lenis.velocity ),
        window.lenis.options?.touchInertiaExponent ?? 1,
      )
      : deltaY

    if ( effectiveDelta === 0 ) return true

    // Reset accumulated delta if user reverses gesture direction
    if (
      accumulatedDeltaRef.current !== 0 &&
      Math.sign( accumulatedDeltaRef.current ) !== Math.sign( effectiveDelta )
    )
    {
      accumulatedDeltaRef.current = 0
    }

    accumulatedDeltaRef.current += effectiveDelta

    const threshold = STORY_TIMING.navigation.gestureThresholdPx
    if ( Math.abs( accumulatedDeltaRef.current ) >= threshold )
    {
      const forward = accumulatedDeltaRef.current > 0
      const currentPage = activePageRef.current
      const nextTarget = forward ? currentPage + 1 : currentPage - 1

      // Clamp boundary input without overscrolling
      if ( nextTarget < 0 || nextTarget >= pages.length )
      {
        accumulatedDeltaRef.current = 0
        if ( event?.cancelable ) event.preventDefault()
        return false
      }

      if ( event?.cancelable ) event.preventDefault()
      goToPage( nextTarget )
      return false
    }

    return true
  }, [ goToPage, pages.length ] )

  useEffect( () =>
  {
    const story = storyRef.current
    if ( !story ) return undefined

    let resizeTimer = 0

    const isStoryActive = () =>
    {
      const metrics = getStoryMetrics()
      if ( !metrics ) return false
      const storyEnd = metrics.top + metrics.range
      return (
        window.scrollY >= metrics.top - 2 &&
        window.scrollY <= storyEnd + 2
      )
    }

    const handleKeyDown = ( event ) =>
    {
      if (
        !isStoryActive() ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        isEditableTarget( event.target )
      )
      {
        return
      }

      const currentBasePage = isTransitioningRef.current
        ? targetPageRef.current
        : activePageRef.current

      let requestedIndex = null

      if ( event.key === 'ArrowDown' || event.key === 'PageDown' )
      {
        requestedIndex = currentBasePage + 1
      }
      else if ( event.key === 'ArrowUp' || event.key === 'PageUp' )
      {
        requestedIndex = currentBasePage - 1
      }
      else if ( event.key === ' ' )
      {
        requestedIndex = currentBasePage + ( event.shiftKey ? -1 : 1 )
      }
      else if ( event.key === 'Home' )
      {
        requestedIndex = 0
      }
      else if ( event.key === 'End' )
      {
        requestedIndex = pages.length - 1
      }

      if ( requestedIndex === null ) return

      event.preventDefault()
      goToPage( requestedIndex )
    }

    const settleAfterResize = () =>
    {
      window.clearTimeout( resizeTimer )
      resizeTimer = window.setTimeout( () =>
      {
        const destination = isTransitioningRef.current
          ? targetPageRef.current
          : activePageRef.current

        const newTargetY = getTargetY( destination )
        if ( newTargetY !== null && window.lenis )
        {
          window.lenis.scrollTo( newTargetY, {
            immediate: true,
            force: true,
            programmatic: true,
          } )
        }
      }, RESIZE_SETTLE_MS )
    }

    // Initial page load: resolve to nearest stable page immediately
    const initialPageIndex = getNearestPageIndex()
    activePageRef.current = initialPageIndex
    targetPageRef.current = initialPageIndex
    onPageChange?.( initialPageIndex )

    window.addEventListener( 'keydown', handleKeyDown )
    window.addEventListener( 'resize', settleAfterResize )

    return () =>
    {
      window.removeEventListener( 'keydown', handleKeyDown )
      window.removeEventListener( 'resize', settleAfterResize )
      window.clearTimeout( resizeTimer )
      window.clearTimeout( transitionCleanupTimerRef.current )
    }
  }, [
    getNearestPageIndex,
    getStoryMetrics,
    getTargetY,
    goToPage,
    onPageChange,
    pages.length,
    storyRef,
  ] )

  return {
    goToPage,
    handleVirtualScroll,
    isTransitioning,
    targetPage: targetPageRef.current,
  }
}
