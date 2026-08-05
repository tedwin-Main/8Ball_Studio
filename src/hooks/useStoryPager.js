import { useCallback, useEffect, useRef } from 'react'

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

  useEffect( () =>
  {
    activePageRef.current = activePage
  }, [ activePage ] )

  const getTargetY = useCallback( ( pageIndex ) =>
  {
    const story = storyRef.current
    const page = pages[ pageIndex ]

    if ( !story || !page ) return null

    const bounds = story.getBoundingClientRect()
    const storyTop = window.scrollY + bounds.top
    // Map the stable scene target onto the exact scroll range used by ScrollTrigger.
    const scrollRange = Math.max( 0, story.offsetHeight - window.innerHeight )

    return Math.round( storyTop + scrollRange * page.targetProgress )
  }, [ pages, storyRef ] )

  const goToPage = useCallback( ( requestedIndex, options = {} ) =>
  {
    const pageIndex = clampPageIndex( requestedIndex, pages.length )
    const targetY = getTargetY( pageIndex )

    if ( targetY === null ) return false

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    // Native smooth scrolling keeps controls simple while ScrollTrigger scrubs the same playhead.
    const behavior = options.immediate === true || prefersReducedMotion
      ? 'auto'
      : 'smooth'

    if ( window.lenis )
    {
      // Route controls through Lenis so they share the reference site's scroll weight.
      window.lenis.scrollTo( targetY, { immediate: behavior === 'auto' } )
    }
    else
    {
      window.scrollTo( {
        top: targetY,
        left: 0,
        behavior,
      } )
    }

    activePageRef.current = pageIndex
    onPageChange( pageIndex )

    return true
  }, [ getTargetY, onPageChange, pages.length ] )

  useEffect( () =>
  {
    const story = storyRef.current

    if ( !story ) return undefined

    let resizeTimer = 0

    let storyTop = 0
    let storyScrollRange = 0

    const refreshStoryMetrics = () =>
    {
      const bounds = story.getBoundingClientRect()

      storyTop = window.scrollY + bounds.top
      storyScrollRange = Math.max( 0, story.offsetHeight - window.innerHeight )
    }

    const isStoryActive = () =>
    {
      const storyEnd = storyTop + storyScrollRange

      return (
        window.scrollY >= storyTop - 2 &&
        window.scrollY <= storyEnd + 2
      )
    }

    const getNearestPageIndex = () =>
    {
      // Convert scroll position to the normalized progress used by every page definition.
      const progress = storyScrollRange === 0
        ? 0
        : Math.min( 1, Math.max( 0, ( window.scrollY - storyTop ) / storyScrollRange ) )

      return pages.reduce(
        ( currentIndex, page, index ) =>
          progress >= page.startProgress ? index : currentIndex,
        0,
      )
    }

    // Shared page definitions keep keyboard navigation on the same progress map.
    const getNavigationBasePage = () => activePageRef.current

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

      resizeTimer = window.setTimeout( refreshStoryMetrics, RESIZE_SETTLE_MS )
    }

    refreshStoryMetrics()

    // Keep the browser's current scroll position so reloads remain continuous too.
    const initialPageIndex = getNearestPageIndex()
    activePageRef.current = initialPageIndex
    onPageChange( initialPageIndex )
    window.addEventListener( 'keydown', handleKeyDown )
    window.addEventListener( 'resize', settleAfterResize )

    return () =>
    {
      window.removeEventListener( 'keydown', handleKeyDown )
      window.removeEventListener( 'resize', settleAfterResize )
      window.clearTimeout( resizeTimer )
    }
  }, [
    getTargetY,
    goToPage,
    onPageChange,
    pages,
    storyRef,
  ] )

  return { goToPage }
}
