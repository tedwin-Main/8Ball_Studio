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
  pageIds,
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
  }, [ getTargetY, onPageChange, pageIds.length ] )

  useEffect( () =>
  {
    const story = storyRef.current

    if ( !story ) return undefined

    let resizeTimer = 0

    let storyTop = 0
    let storyHeight = 0

    const refreshStoryMetrics = () =>
    {
      const bounds = story.getBoundingClientRect()

      storyTop = window.scrollY + bounds.top
      storyHeight = story.offsetHeight
    }

    const isStoryActive = () =>
    {
      const storyEnd = storyTop + storyHeight - window.innerHeight

      return (
        window.scrollY >= storyTop - 2 &&
        window.scrollY <= storyEnd + 2
      )
    }

    const getNearestPageIndex = () =>
    {
      let nearestPageIndex = 0

      pageIds.forEach( ( pageId, index ) =>
      {
        const page = document.getElementById( pageId )

        if ( !page ) return

        const pageTop = window.scrollY + page.getBoundingClientRect().top

        if ( window.scrollY >= pageTop - 2 ) nearestPageIndex = index
      } )

      return nearestPageIndex
    }

    // Section markers keep keyboard navigation without adding a second page state machine.
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
    pageIds.length,
    storyRef,
  ] )

  return { goToPage }
}
