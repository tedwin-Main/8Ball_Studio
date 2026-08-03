import { useCallback, useEffect, useRef } from 'react'
import gsap from 'gsap'

// Adjacent pages use the full cinematic transition duration.
export const PAGE_TRANSITION_SECONDS = 0.3

// Long pagination jumps stay readable but finish faster than adjacent moves.
export const MIN_PAGE_TRANSITION_SECONDS = 0.3

// Remove this much time for every additional page crossed.
export const PAGE_DISTANCE_SPEEDUP_SECONDS = 0.18

// Small trackpad events accumulate until they represent one intentional gesture.
export const WHEEL_THRESHOLD_PX = 12

// Inertial wheel events must stop for this long before another page can start.
export const WHEEL_RELEASE_MS = 90

// A mobile swipe must travel this far before it changes a page.
export const TOUCH_THRESHOLD_PX = 52

// Wait for viewport resizing to settle before restoring the active page position.
const RESIZE_SETTLE_MS = 150

// A gap this large means the user lifted and started a new trackpad gesture.
const WHEEL_NEW_GESTURE_MS = 90

const clampPageIndex = ( index, pageCount ) =>
  Math.min( pageCount - 1, Math.max( 0, index ) )

const getPageTransitionSeconds = ( startIndex, endIndex ) =>
{
  const pageDistance = Math.max( 1, Math.abs( endIndex - startIndex ) )

  return Math.max(
    MIN_PAGE_TRANSITION_SECONDS,
    PAGE_TRANSITION_SECONDS -
      ( pageDistance - 1 ) * PAGE_DISTANCE_SPEEDUP_SECONDS,
  )
}

const normalizeWheelDelta = ( event ) =>
{
  if ( event.deltaMode === 1 ) return event.deltaY * 16
  if ( event.deltaMode === 2 ) return event.deltaY * window.innerHeight
  return event.deltaY
}

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
  pageIds,
  activePage,
  onPageChange,
} )
{
  const activePageRef = useRef( activePage )
  const targetPageRef = useRef( activePage )
  const isTransitioningRef = useRef( false )
  const scrollTweenRef = useRef( null )
  const releaseWheelRef = useRef( () => {} )

  useEffect( () =>
  {
    activePageRef.current = activePage

    // Do not replace the intended destination with intermediate ScrollTrigger states.
    if ( !isTransitioningRef.current )
    {
      targetPageRef.current = activePage
    }
  }, [ activePage ] )

  const getTargetY = useCallback( ( pageIndex ) =>
  {
    const pageId = pageIds[ pageIndex ]
    const page = document.getElementById( pageId )

    if ( !page ) return null

    return Math.round(
      window.scrollY + page.getBoundingClientRect().top,
    )
  }, [ pageIds ] )

  const goToPage = useCallback( ( requestedIndex, options = {} ) =>
  {
    const pageIndex = clampPageIndex( requestedIndex, pageIds.length )
    const targetY = getTargetY( pageIndex )

    if ( targetY === null ) return false

    const transitionStartPage = isTransitioningRef.current
      ? targetPageRef.current
      : activePageRef.current

    // New input interrupts the current tween and retargets from live scroll position.
    if ( isTransitioningRef.current )
    {
      scrollTweenRef.current?.kill()
      scrollTweenRef.current = null
      isTransitioningRef.current = false
    }

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    const immediate = options.immediate === true || prefersReducedMotion
    const alreadyAtTarget = Math.abs( window.scrollY - targetY ) <= 1

    targetPageRef.current = pageIndex

    if ( immediate || alreadyAtTarget )
    {
      window.scrollTo( {
        top: targetY,
        left: 0,
        behavior: 'auto',
      } )

      activePageRef.current = pageIndex
      onPageChange( pageIndex )
      releaseWheelRef.current()
      return true
    }

    isTransitioningRef.current = true

    const scrollState = { y: window.scrollY }
    const transitionSeconds = getPageTransitionSeconds(
      transitionStartPage,
      pageIndex,
    )

    // Animate a plain number; farther pagination targets use a shorter duration.
    scrollTweenRef.current = gsap.to( scrollState, {
      y: targetY,
      duration: transitionSeconds,
      overwrite: true,
      onUpdate: () =>
      {
        window.scrollTo( 0, scrollState.y )
      },
      onComplete: () =>
      {
        window.scrollTo( 0, targetY )
        scrollTweenRef.current = null
        isTransitioningRef.current = false
        activePageRef.current = pageIndex
        targetPageRef.current = pageIndex
        onPageChange( pageIndex )
        releaseWheelRef.current()
      },
    } )

    return true
  }, [ getTargetY, onPageChange, pageIds.length ] )

  useEffect( () =>
  {
    const story = storyRef.current

    if ( !story ) return undefined

    const html = document.documentElement

    let wheelAccumulator = 0
    let wheelLocked = false
    let lastWheelAt = 0
    let wheelReleaseTimer = 0
    let resizeTimer = 0

    let touchIdentifier = null
    let touchStartY = null
    let touchLastY = null

    const isStoryActive = () =>
    {
      const bounds = story.getBoundingClientRect()

      return (
        bounds.top <= 2 &&
        bounds.bottom >= window.innerHeight - 2
      )
    }

    const getNearestPageIndex = () =>
    {
      const bounds = story.getBoundingClientRect()
      const storyTop = window.scrollY + bounds.top
      const scrollRange = Math.max(
        1,
        story.offsetHeight - window.innerHeight,
      )

      const rawProgress = ( window.scrollY - storyTop ) / scrollRange
      const progress = Math.min( 1, Math.max( 0, rawProgress ) )

      return Math.round( progress * ( pageIds.length - 1 ) )
    }

    const getNavigationBasePage = () =>
      isTransitioningRef.current
        ? targetPageRef.current
        : activePageRef.current

    const unlockWheelIfReady = () =>
    {
      if ( isTransitioningRef.current ) return

      const remainingQuietTime =
        WHEEL_RELEASE_MS - ( performance.now() - lastWheelAt )

      if ( remainingQuietTime > 0 )
      {
        window.clearTimeout( wheelReleaseTimer )
        wheelReleaseTimer = window.setTimeout(
          unlockWheelIfReady,
          remainingQuietTime,
        )
        return
      }

      wheelAccumulator = 0
      wheelLocked = false
    }

    releaseWheelRef.current = unlockWheelIfReady

    const scheduleWheelRelease = () =>
    {
      window.clearTimeout( wheelReleaseTimer )
      wheelReleaseTimer = window.setTimeout(
        unlockWheelIfReady,
        WHEEL_RELEASE_MS,
      )
    }

    const handleWheel = ( event ) =>
    {
      // Preserve browser pinch-to-zoom and trackpad zoom gestures.
      if ( event.ctrlKey ) return

      // Do not convert horizontal trackpad gestures into page navigation.
      if ( Math.abs( event.deltaX ) > Math.abs( event.deltaY ) ) return

      if ( !isStoryActive() ) return

      // passive:false is required or preventDefault() will be ignored.
      event.preventDefault()

      const delta = normalizeWheelDelta( event )

      if ( Math.abs( delta ) < 1 ) return

      const now = performance.now()
      const wheelGap = lastWheelAt === 0
        ? Number.POSITIVE_INFINITY
        : now - lastWheelAt
      const startsNewGesture = wheelGap >= WHEEL_NEW_GESTURE_MS

      lastWheelAt = now
      scheduleWheelRelease()

      if ( startsNewGesture )
      {
        wheelAccumulator = 0
        // A fresh gesture may interrupt the current page tween.
        wheelLocked = false
      }

      if ( wheelLocked ) return

      // Reversing direction starts a fresh gesture instead of using stale delta.
      if (
        wheelAccumulator !== 0 &&
        Math.sign( wheelAccumulator ) !== Math.sign( delta )
      )
      {
        wheelAccumulator = 0
      }

      wheelAccumulator += delta

      if ( Math.abs( wheelAccumulator ) < WHEEL_THRESHOLD_PX ) return

      const direction = Math.sign( wheelAccumulator )
      const navigationBasePage = isTransitioningRef.current
        ? targetPageRef.current
        : activePageRef.current
      const requestedIndex = navigationBasePage + direction

      wheelAccumulator = 0
      wheelLocked = true

      // clampPageIndex prevents movement past Intro or Contact.
      goToPage( requestedIndex )
    }

    const resetTouch = () =>
    {
      touchIdentifier = null
      touchStartY = null
      touchLastY = null
    }

    const handleTouchStart = ( event ) =>
    {
      if ( event.touches.length !== 1 || !isStoryActive() )
      {
        resetTouch()
        return
      }

      const touch = event.touches[ 0 ]

      touchIdentifier = touch.identifier
      touchStartY = touch.clientY
      touchLastY = touch.clientY
    }

    const handleTouchMove = ( event ) =>
    {
      if ( touchIdentifier === null ) return

      const touch = Array.from( event.touches ).find(
        ( item ) => item.identifier === touchIdentifier,
      )

      if ( !touch ) return

      // Prevent native touch momentum from moving through multiple story pages.
      event.preventDefault()
      touchLastY = touch.clientY
    }

    const handleTouchEnd = () =>
    {
      if ( touchStartY === null || touchLastY === null )
      {
        resetTouch()
        return
      }

      const delta = touchStartY - touchLastY

      resetTouch()

      if ( Math.abs( delta ) < TOUCH_THRESHOLD_PX )
      {
        return
      }

      goToPage(
        getNavigationBasePage() + Math.sign( delta ),
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

      let requestedIndex = null

      if ( event.key === 'ArrowDown' || event.key === 'PageDown' )
      {
        requestedIndex = getNavigationBasePage() + 1
      }
      else if ( event.key === 'ArrowUp' || event.key === 'PageUp' )
      {
        requestedIndex = getNavigationBasePage() - 1
      }
      else if ( event.key === ' ' )
      {
        requestedIndex =
          getNavigationBasePage() + ( event.shiftKey ? -1 : 1 )
      }
      else if ( event.key === 'Home' )
      {
        requestedIndex = 0
      }
      else if ( event.key === 'End' )
      {
        requestedIndex = pageIds.length - 1
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
        const pageIndex = targetPageRef.current
        const targetY = getTargetY( pageIndex )

        scrollTweenRef.current?.kill()
        scrollTweenRef.current = null
        isTransitioningRef.current = false

        if ( targetY !== null )
        {
          window.scrollTo( {
            top: targetY,
            left: 0,
            behavior: 'auto',
          } )
        }

        activePageRef.current = pageIndex
        onPageChange( pageIndex )
        releaseWheelRef.current()
      }, RESIZE_SETTLE_MS )
    }

    html.classList.add( 'story-pager-enabled' )

    // Reloading in the middle of the document should land on a stable story page.
    const initialPageIndex = getNearestPageIndex()
    activePageRef.current = initialPageIndex
    targetPageRef.current = initialPageIndex
    onPageChange( initialPageIndex )

    const initialTargetY = getTargetY( initialPageIndex )

    if ( initialTargetY !== null )
    {
      window.scrollTo( {
        top: initialTargetY,
        left: 0,
        behavior: 'auto',
      } )
    }

    window.addEventListener( 'wheel', handleWheel, { passive: false } )
    window.addEventListener( 'keydown', handleKeyDown )
    window.addEventListener( 'resize', settleAfterResize )

    story.addEventListener( 'touchstart', handleTouchStart, {
      passive: true,
    } )
    story.addEventListener( 'touchmove', handleTouchMove, {
      passive: false,
    } )
    story.addEventListener( 'touchend', handleTouchEnd, {
      passive: true,
    } )
    story.addEventListener( 'touchcancel', resetTouch, {
      passive: true,
    } )

    return () =>
    {
      html.classList.remove( 'story-pager-enabled' )

      window.removeEventListener( 'wheel', handleWheel )
      window.removeEventListener( 'keydown', handleKeyDown )
      window.removeEventListener( 'resize', settleAfterResize )

      story.removeEventListener( 'touchstart', handleTouchStart )
      story.removeEventListener( 'touchmove', handleTouchMove )
      story.removeEventListener( 'touchend', handleTouchEnd )
      story.removeEventListener( 'touchcancel', resetTouch )

      window.clearTimeout( wheelReleaseTimer )
      window.clearTimeout( resizeTimer )

      scrollTweenRef.current?.kill()
      scrollTweenRef.current = null
      isTransitioningRef.current = false
      releaseWheelRef.current = () => {}
    }
  }, [
    getTargetY,
    goToPage,
    onPageChange,
    pageIds.length,
    storyRef,
  ] )

  return { goToPage }
}
