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

// Lenis forwards the native event, so read the finger coordinate directly. This
// avoids treating touch deltas like wheel deltas when a browser reports signs differently.
const getTouchY = ( event ) =>
{
  const point = event?.touches?.[ 0 ] || event?.changedTouches?.[ 0 ] || event?.targetTouches?.[ 0 ]
  return Number.isFinite( point?.clientY ) ? point.clientY : null
}

const resetTouchGesture = ( gesture ) =>
{
  gesture.active = false
  gesture.lastY = null
  gesture.accumulated = 0
  gesture.direction = 0
  gesture.committed = false
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
  const lastScrollProgressRef = useRef( 0 )
  const touchGestureRef = useRef( {
    active: false,
    lastY: null,
    accumulated: 0,
    direction: 0,
    committed: false,
  } )

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

    // Map the stable scene target onto the exact scroll range used by ScrollTrigger.
    return Math.round( metrics.top + metrics.range * page.targetProgress )
  }, [ getStoryMetrics, pages ] )

  const getScrollProgress = useCallback( () =>
  {
    const metrics = getStoryMetrics()
    if ( !metrics || metrics.range === 0 ) return 0

    const lenisScroll = typeof window !== 'undefined' ? window.lenis?.scroll : null
    const scrollPosition = Number.isFinite( lenisScroll ) ? lenisScroll : window.scrollY

    return Math.min(
      1,
      Math.max( 0, ( scrollPosition - metrics.top ) / metrics.range ),
    )
  }, [ getStoryMetrics ] )

  const rememberScrollProgress = useCallback( () =>
  {
    lastScrollProgressRef.current = getScrollProgress()
  }, [ getScrollProgress ] )

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
    resetTouchGesture( touchGestureRef.current )
    onPageChange?.( destinationIndex )
  }, [ onPageChange ] )

  const goToPage = useCallback( ( requestedIndex, options = {} ) =>
  {
    // Input received during forced autoplay belongs to the active gesture and is consumed.
    if ( isTransitioningRef.current && options.immediate !== true ) return false

    const fromIndex = isTransitioningRef.current
      ? targetPageRef.current
      : activePageRef.current
    const destinationIndex = clampPageIndex( requestedIndex, pages.length )
    const targetY = getTargetY( destinationIndex )

    if ( targetY === null ) return false

    if ( destinationIndex === fromIndex && options.immediate !== true )
    {
      onPageChange?.( destinationIndex )
      return true
    }

    const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    const isImmediate = options.immediate === true || prefersReducedMotion

    // Lock incoming gestures immediately so one touch or wheel burst cannot skip a page.
    isTransitioningRef.current = !isImmediate
    setIsTransitioning( !isImmediate )
    targetPageRef.current = destinationIndex
    accumulatedDeltaRef.current = 0
    resetTouchGesture( touchGestureRef.current )

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

    // Intro gets a longer curve so the rack impact and spread remain readable.
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
    }

    // Safety timeout re-arms input if a backgrounded tab pauses Lenis' frame loop.
    window.clearTimeout( transitionCleanupTimerRef.current )
    transitionCleanupTimerRef.current = window.setTimeout( () =>
    {
      if ( isTransitioningRef.current )
      {
        completeTransition( destinationIndex )
      }
    }, Math.round( ( duration + 0.35 ) * 1000 ) )

    return true
  }, [ completeTransition, getTargetY, onPageChange, pages.length ] )

  const handleVirtualScroll = useCallback( ( scrollInput = {} ) =>
  {
    const { deltaY = 0, event } = scrollInput
    const eventType = event?.type || ''
    const isWheel = eventType.includes( 'wheel' )
    const isTouch = eventType.includes( 'touch' )

    if ( !( isWheel || isTouch ) ) return true

    const metrics = getStoryMetrics()
    if ( !metrics ) return true

    const storyEnd = metrics.top + metrics.range
    const isStoryActive =
      window.scrollY >= metrics.top - 2 && window.scrollY <= storyEnd + 2

    if ( !isStoryActive ) return true

    // Let Lenis observe touchend while its lock is active so it can clear isTouching.
    if ( isTransitioningRef.current )
    {
      if ( isTouch && eventType === 'touchend' )
      {
        resetTouchGesture( touchGestureRef.current )
        return true
      }

      if ( event?.cancelable ) event.preventDefault()
      return false
    }

    if ( isTouch )
    {
      const touchGesture = touchGestureRef.current

      if ( eventType === 'touchstart' )
      {
        touchGesture.active = true
        touchGesture.lastY = getTouchY( event )
        touchGesture.accumulated = 0
        touchGesture.direction = 0
        touchGesture.committed = false
        accumulatedDeltaRef.current = 0
        lastGestureTimeRef.current = Date.now()
        return true
      }

      if ( eventType === 'touchcancel' )
      {
        resetTouchGesture( touchGesture )
        accumulatedDeltaRef.current = 0
        return true
      }

      if ( !touchGesture.active )
      {
        touchGesture.active = true
        touchGesture.lastY = null
      }

      const currentY = getTouchY( event )
      const fingerDelta = currentY !== null && touchGesture.lastY !== null
        ? touchGesture.lastY - currentY
        : Number.isFinite( deltaY ) ? deltaY : 0

      if ( currentY !== null ) touchGesture.lastY = currentY

      if ( fingerDelta !== 0 )
      {
        const direction = Math.sign( fingerDelta )

        // A reversal before qualification starts a fresh intent inside this touch sequence.
        if ( touchGesture.direction !== 0 && direction !== touchGesture.direction )
        {
          touchGesture.accumulated = 0
        }

        touchGesture.direction = direction
        touchGesture.accumulated += fingerDelta
        accumulatedDeltaRef.current = touchGesture.accumulated
      }

      if ( Math.abs( touchGesture.accumulated ) >= STORY_TIMING.navigation.gestureThresholdPx )
      {
        const currentPage = activePageRef.current
        const nextTarget = currentPage + ( touchGesture.accumulated > 0 ? 1 : -1 )

        if ( nextTarget < 0 || nextTarget >= pages.length )
        {
          resetTouchGesture( touchGesture )
          accumulatedDeltaRef.current = 0
          if ( event?.cancelable ) event.preventDefault()
          return false
        }

        if ( event?.cancelable ) event.preventDefault()
        touchGesture.committed = true
        const didStart = goToPage( nextTarget )

        if ( !didStart ) resetTouchGesture( touchGesture )
        return false
      }

      if ( eventType === 'touchend' )
      {
        // Let Lenis apply its normal bounded inertia only when no page intent qualified.
        resetTouchGesture( touchGesture )
      }

      return true
    }

    const now = Date.now()
    if ( now - lastGestureTimeRef.current > STORY_TIMING.navigation.gestureResetMs )
    {
      accumulatedDeltaRef.current = 0
    }
    lastGestureTimeRef.current = now

    if ( !Number.isFinite( deltaY ) || deltaY === 0 ) return true

    // Wheel and trackpad deltas already use the browser convention: positive is forward.
    if (
      accumulatedDeltaRef.current !== 0 &&
      Math.sign( accumulatedDeltaRef.current ) !== Math.sign( deltaY )
    )
    {
      accumulatedDeltaRef.current = 0
    }

    accumulatedDeltaRef.current += deltaY

    if ( Math.abs( accumulatedDeltaRef.current ) >= STORY_TIMING.navigation.gestureThresholdPx )
    {
      const currentPage = activePageRef.current
      const nextTarget = currentPage + ( accumulatedDeltaRef.current > 0 ? 1 : -1 )

      // Consume boundary input without allowing the browser to leave the story unexpectedly.
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
  }, [ getStoryMetrics, goToPage, pages.length ] )

  useEffect( () =>
  {
    const story = storyRef.current
    if ( !story ) return undefined

    let resizeTimer = 0
    const lenis = typeof window !== 'undefined' ? window.lenis : null

    // Keep the current playhead so a viewport change does not snap an in-progress scene to page zero.
    rememberScrollProgress()
    window.addEventListener( 'scroll', rememberScrollProgress, { passive: true } )
    lenis?.on?.( 'scroll', rememberScrollProgress )

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

      // Always stop the browser's native page jump for handled keys.
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

        const metrics = getStoryMetrics()
        const newTargetY = isTransitioningRef.current
          ? getTargetY( destination )
          : metrics
            ? Math.round( metrics.top + metrics.range * lastScrollProgressRef.current )
            : null
        if ( newTargetY === null ) return

        if ( window.lenis )
        {
          window.lenis.scrollTo( newTargetY, {
            immediate: true,
            force: true,
            programmatic: true,
          } )
        }
        else
        {
          window.scrollTo( { top: newTargetY, left: 0, behavior: 'auto' } )
        }
      }, RESIZE_SETTLE_MS )
    }

    // Initial page load resolves to the nearest stable page without autoplay.
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
      window.removeEventListener( 'scroll', rememberScrollProgress )
      lenis?.off?.( 'scroll', rememberScrollProgress )
      window.clearTimeout( resizeTimer )
      window.clearTimeout( transitionCleanupTimerRef.current )
      resetTouchGesture( touchGestureRef.current )
    }
  }, [
    getNearestPageIndex,
    getStoryMetrics,
    getTargetY,
    goToPage,
    onPageChange,
    pages.length,
    rememberScrollProgress,
    storyRef,
  ] )

  return {
    goToPage,
    handleVirtualScroll,
    isTransitioning,
    // App animation callbacks use this stable ref to avoid changing page state mid-autoplay.
    isTransitioningRef,
    targetPage: targetPageRef.current,
  }
}
