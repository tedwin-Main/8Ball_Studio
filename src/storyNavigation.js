// Story navigation is framework-agnostic. Browser and in-memory adapters provide
// scrolling, timing, and event delivery while this module owns Story behavior.

const DEFAULT_RESIZE_SETTLE_MS = 150
// Responsive timeline rebuilds can follow the first refresh; keep the retained
// normalized position guarded after the settle window has completed.
const RESIZE_RESTORE_GUARD_MS = 320
const DEFAULT_TRANSITION_BUFFER_MS = 350

// Clamp a number between a minimum and maximum.
function clamp( value, min = 0, max = 1 )
{
  if ( value < min )
  {
    return min
  }
  if ( value > max )
  {
    return max
  }
  return value
}

const defaultClock = Object.freeze( {
  now: () => Date.now(),
  setTimeout: ( callback, delay ) => setTimeout( callback, delay ),
  clearTimeout: ( timer ) => clearTimeout( timer ),
} )

function noop() {}

// Reset touch tracking state back to default empty values.
function resetTouchGesture( gesture )
{
  gesture.active = false
  gesture.lastY = null
  gesture.accumulated = 0
  gesture.direction = 0
  gesture.committed = false
}

// Check if an event target is an interactive form element or editable field.
function isEditableTarget( target )
{
  if ( !target || typeof target !== 'object' )
  {
    return false
  }

  if ( target.isContentEditable )
  {
    return true
  }

  if ( typeof target.matches === 'function' && target.matches( 'input, textarea, select, option' ) )
  {
    return true
  }

  return false
}

// Touch deltas vary by browser; use the finger coordinate when it exists.
function getTouchY( event )
{
  const point = event?.touches?.[ 0 ] || event?.changedTouches?.[ 0 ] || event?.targetTouches?.[ 0 ]
  if ( Number.isFinite( point?.clientY ) )
  {
    return point.clientY
  }
  return null
}

function preventDefault( event )
{
  if ( event?.cancelable )
  {
    event.preventDefault()
  }
}

// Helper to find a page object in a list by its unique string id.
function findPageById( pageList, pageId )
{
  for ( let i = 0; i < pageList.length; i++ )
  {
    if ( pageList[ i ].id === pageId )
    {
      return pageList[ i ]
    }
  }
  return null
}

// Helper to find the index of a page in a list by its unique string id.
function findPageIndex( pageList, pageId )
{
  for ( let i = 0; i < pageList.length; i++ )
  {
    if ( pageList[ i ].id === pageId )
    {
      return i
    }
  }
  return -1
}

// Validate input pages and format them with default progress numbers.
function normalizePages( suppliedPages )
{
  if ( !Array.isArray( suppliedPages ) || suppliedPages.length === 0 )
  {
    throw new TypeError( 'Story navigation requires at least one Page.' )
  }

  const ids = new Set()
  const normalizedList = []

  for ( let i = 0; i < suppliedPages.length; i++ )
  {
    const page = suppliedPages[ i ]
    if ( !page || typeof page.id !== 'string' || page.id.length === 0 )
    {
      throw new TypeError( 'Every Story Page needs a non-empty id.' )
    }
    if ( ids.has( page.id ) )
    {
      throw new TypeError( `Duplicate Story Page id: ${page.id}` )
    }
    ids.add( page.id )

    let startProgress = 0
    if ( Number.isFinite( page.startProgress ) )
    {
      startProgress = page.startProgress
    }

    let targetProgress = 0
    if ( Number.isFinite( page.targetProgress ) )
    {
      targetProgress = page.targetProgress
    }

    normalizedList.push( Object.freeze( {
      ...page,
      startProgress: startProgress,
      targetProgress: targetProgress,
    } ) )
  }

  return normalizedList
}

// Keep page index within valid 0 to pageCount - 1 bounds.
function clampPageIndex( index, pageCount )
{
  const maxIndex = pageCount - 1
  if ( index < 0 )
  {
    return 0
  }
  if ( index > maxIndex )
  {
    return maxIndex
  }
  return index
}

/**
 * Owns Story gesture semantics and transition state behind a small interface.
 * The adapter is the only place this module expects browser or test I/O.
 */
export function createStoryNavigation ( {
  pages: suppliedPages,
  initialPage = null,
  adapter,
  getMetrics,
  eventTarget = null,
  clock = defaultClock,
  prefersReducedMotion = () => false,
  transitionFor = () => ( { duration: 1 } ),
  resizeSettleMs = DEFAULT_RESIZE_SETTLE_MS,
  transitionBufferMs = DEFAULT_TRANSITION_BUFFER_MS,
  gestureThresholdPx = 14,
  gestureResetMs = 120,
  // Free scroll: wheel and touch move the page continuously (Lenis-smoothed) instead of
  // being qualified into one-Page jumps. Stable Page and indicator then follow the scroll
  // position; page marks, nav links, and keys still glide to a Page on request.
  freeScroll = false,
  onPageChange,
  onIndicatorPageChange,
  onTransitionChange,
  onProgress,
} = {} )
{
  if ( !adapter || typeof adapter.getScrollPosition !== 'function' || typeof adapter.scrollTo !== 'function' )
  {
    throw new TypeError( 'Story navigation requires a scroll adapter.' )
  }
  if ( typeof getMetrics !== 'function' ) throw new TypeError( 'Story navigation requires Story metrics.' )

  let pages = normalizePages( suppliedPages )
  let activePage = typeof initialPage === 'string' ? initialPage : null
  let targetPage = activePage
  // Stable Page state owns navigation locking; indicatorPage follows the visible
  // Page activation boundary so pagination does not wait for autoplay completion.
  let indicatorPage = activePage
  let transitioning = false
  let mounted = false
  let destroyed = false
  let transitionTimer = null
  let resizeTimer = null
  let resizeRestoreTimer = null
  let pendingResizeProgress = 0
  let pendingResizeTargetPage = null
  let preservingResizeProgress = false
  let lastScrollProgress = 0
  let unsubscribeScroll = noop
  let unsubscribeVirtualScroll = noop
  const touchGesture = {
    active: false,
    lastY: null,
    accumulated: 0,
    direction: 0,
    committed: false,
  }
  let accumulatedDelta = 0
  let lastGestureTime = 0

  // Find a page by id or numeric index.
  function resolvePage( requestedPage )
  {
    if ( typeof requestedPage === 'string' )
    {
      const found = findPageById( pages, requestedPage )
      if ( found )
      {
        return found
      }
      return null
    }

    if ( Number.isInteger( requestedPage ) )
    {
      const validIndex = clampPageIndex( requestedPage, pages.length )
      return pages[ validIndex ] || null
    }

    return null
  }

  // Find the active page based on current scroll progress.
  function pageAtProgress( progress )
  {
    let selectedPage = pages[ 0 ]
    for ( let i = 0; i < pages.length; i++ )
    {
      const page = pages[ i ]
      if ( progress >= page.startProgress )
      {
        selectedPage = page
      }
    }
    return selectedPage
  }

  const setIndicatorPage = ( nextPage ) =>
  {
    if ( !nextPage || nextPage.id === indicatorPage ) return
    indicatorPage = nextPage.id
    onIndicatorPageChange?.( indicatorPage )
  }

  const getProgress = () =>
  {
    const metrics = getMetrics()
    if ( !metrics || !Number.isFinite( metrics.range ) || metrics.range <= 0 ) return 0

    const scrollPosition = adapter.getScrollPosition()
    if ( !Number.isFinite( scrollPosition ) ) return 0

    return clamp( ( scrollPosition - metrics.top ) / metrics.range )
  }

  const getTargetY = ( page ) =>
  {
    const metrics = getMetrics()
    if ( !metrics || !Number.isFinite( metrics.range ) || !page ) return null
    return Math.round( metrics.top + metrics.range * page.targetProgress )
  }

  const getCurrentPage = () => resolvePage( transitioning ? targetPage : activePage ) || pageAtProgress( getProgress() )

  const notifyProgress = () =>
  {
    const progress = getProgress()
    if ( !preservingResizeProgress ) lastScrollProgress = progress
    onProgress?.( progress )

    // The visible Page and its indicator share the same scheduled activation
    // threshold, even while Stable Page state remains locked during autoplay.
    const nextPage = pageAtProgress( progress )
    setIndicatorPage( nextPage )

    if ( !transitioning )
    {
      if ( nextPage && nextPage.id !== activePage )
      {
        activePage = nextPage.id
        targetPage = nextPage.id
        onPageChange?.( nextPage.id )
      }
    }

    return progress
  }

  const setTransitioning = ( nextTransitioning ) =>
  {
    if ( transitioning === nextTransitioning ) return
    transitioning = nextTransitioning
    onTransitionChange?.( transitioning, { activePage, targetPage, indicatorPage } )
  }

  const clearTransitionTimer = () =>
  {
    if ( transitionTimer === null ) return
    clock.clearTimeout( transitionTimer )
    transitionTimer = null
  }

  const completeTransition = ( destinationId ) =>
  {
    if ( destroyed ) return
    clearTransitionTimer()
    setTransitioning( false )
    activePage = destinationId
    targetPage = destinationId
    setIndicatorPage( resolvePage( destinationId ) )
    accumulatedDelta = 0
    resetTouchGesture( touchGesture )
    onPageChange?.( destinationId )
    notifyProgress()
  }

  const goToPage = ( requestedPage, options = {} ) =>
  {
    if ( destroyed ) return false
    if ( transitioning && options.immediate !== true ) return false

    const fromPage = getCurrentPage()
    const destination = resolvePage( requestedPage )
    if ( !destination ) return false

    const targetY = getTargetY( destination )
    if ( targetY === null ) return false

    if ( destination.id === fromPage?.id && options.immediate !== true )
    {
      activePage = destination.id
      targetPage = destination.id
      setIndicatorPage( destination )
      onPageChange?.( destination.id )
      return true
    }

    const isImmediate = options.immediate === true || Boolean( prefersReducedMotion() )
    const transition = transitionFor( { fromPage, toPage: destination } ) || {}
    const duration = Number.isFinite( transition.duration ) && transition.duration > 0
      ? transition.duration
      : 1

    targetPage = destination.id
    accumulatedDelta = 0
    resetTouchGesture( touchGesture )

    if ( isImmediate )
    {
      setTransitioning( false )
      adapter.scrollTo( targetY, {
        immediate: true,
        force: true,
        programmatic: true,
      } )
      completeTransition( destination.id )
      return true
    }

    // Lock incoming Story gestures until the scroll adapter confirms settlement.
    setTransitioning( true )
    adapter.scrollTo( targetY, {
      duration,
      easing: transition.easing,
      immediate: false,
      lock: true,
      force: true,
      programmatic: true,
      onComplete: () => completeTransition( destination.id ),
    } )

    // A paused background tab must not leave Story navigation permanently locked.
    clearTransitionTimer()
    transitionTimer = clock.setTimeout( () =>
    {
      if ( transitioning ) completeTransition( destination.id )
    }, Math.round( ( duration + transitionBufferMs / 1000 ) * 1000 ) )

    return true
  }

  // Check if current window scroll is within the Story container bounds.
  function isStoryActive()
  {
    const metrics = getMetrics()
    if ( !metrics || !Number.isFinite( metrics.range ) )
    {
      return false
    }

    const scrollPosition = adapter.getScrollPosition()
    if ( !Number.isFinite( scrollPosition ) )
    {
      return false
    }

    const storyStart = metrics.top - 2
    const storyEnd = metrics.top + metrics.range + 2
    if ( scrollPosition >= storyStart && scrollPosition <= storyEnd )
    {
      return true
    }
    return false
  }

  const handleVirtualScroll = ( scrollInput = {} ) =>
  {
    const { deltaY = 0, event } = scrollInput
    const eventType = event?.type || ''
    const isWheel = eventType.includes( 'wheel' )
    const isTouch = eventType.includes( 'touch' )

    if ( !( isWheel || isTouch ) || !isStoryActive() ) return true

    // Free scroll hands input straight to the scroller unless a requested Page glide is running.
    if ( freeScroll && !transitioning ) return true

    // Let the scroll adapter observe touchend while a transition lock is active.
    if ( transitioning )
    {
      if ( isTouch && eventType === 'touchend' ) resetTouchGesture( touchGesture )
      else preventDefault( event )
      return eventType === 'touchend'
    }

    if ( isTouch )
    {
      if ( eventType === 'touchstart' )
      {
        touchGesture.active = true
        touchGesture.lastY = getTouchY( event )
        touchGesture.accumulated = 0
        touchGesture.direction = 0
        touchGesture.committed = false
        accumulatedDelta = 0
        lastGestureTime = clock.now()
        return true
      }

      if ( eventType === 'touchcancel' )
      {
        resetTouchGesture( touchGesture )
        accumulatedDelta = 0
        return true
      }

      if ( !touchGesture.active )
      {
        touchGesture.active = true
        touchGesture.lastY = null
      }

      const currentY = getTouchY( event )
      let fingerDelta = 0
      if ( currentY !== null && touchGesture.lastY !== null )
      {
        fingerDelta = touchGesture.lastY - currentY
      }
      else if ( Number.isFinite( deltaY ) )
      {
        fingerDelta = deltaY
      }

      if ( currentY !== null )
      {
        touchGesture.lastY = currentY
      }

      if ( fingerDelta !== 0 )
      {
        const direction = Math.sign( fingerDelta )
        if ( touchGesture.direction !== 0 && direction !== touchGesture.direction )
        {
          touchGesture.accumulated = 0
        }
        touchGesture.direction = direction
        touchGesture.accumulated += fingerDelta
        accumulatedDelta = touchGesture.accumulated
      }

      if ( Math.abs( touchGesture.accumulated ) >= gestureThresholdPx )
      {
        const currentPage = getCurrentPage()
        const currentIndex = findPageIndex( pages, currentPage?.id )
        let step = 1
        if ( touchGesture.accumulated < 0 )
        {
          step = -1
        }
        const nextIndex = currentIndex + step

        if ( nextIndex < 0 || nextIndex >= pages.length )
        {
          resetTouchGesture( touchGesture )
          accumulatedDelta = 0
          preventDefault( event )
          return false
        }

        preventDefault( event )
        touchGesture.committed = true
        const didStart = goToPage( pages[ nextIndex ].id )
        if ( !didStart )
        {
          resetTouchGesture( touchGesture )
        }
        return false
      }

      if ( eventType === 'touchend' )
      {
        resetTouchGesture( touchGesture )
      }
      return true
    }

    const now = clock.now()
    if ( now - lastGestureTime > gestureResetMs )
    {
      accumulatedDelta = 0
    }
    lastGestureTime = now

    if ( !Number.isFinite( deltaY ) || deltaY === 0 )
    {
      return true
    }

    if ( accumulatedDelta !== 0 && Math.sign( accumulatedDelta ) !== Math.sign( deltaY ) )
    {
      accumulatedDelta = 0
    }
    accumulatedDelta += deltaY

    if ( Math.abs( accumulatedDelta ) >= gestureThresholdPx )
    {
      const currentPage = getCurrentPage()
      const currentIndex = findPageIndex( pages, currentPage?.id )
      let step = 1
      if ( accumulatedDelta < 0 )
      {
        step = -1
      }
      const nextIndex = currentIndex + step

      if ( nextIndex < 0 || nextIndex >= pages.length )
      {
        accumulatedDelta = 0
        preventDefault( event )
        return false
      }

      preventDefault( event )
      goToPage( pages[ nextIndex ].id )
      return false
    }

    return true
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

    const currentPage = getCurrentPage()
    const currentIndex = findPageIndex( pages, currentPage?.id )
    let requestedIndex = null

    if ( event.key === 'ArrowDown' || event.key === 'PageDown' || event.key === ' ' )
    {
      let step = 1
      if ( event.key === ' ' && event.shiftKey )
      {
        step = -1
      }
      requestedIndex = currentIndex + step
    }
    else if ( event.key === 'ArrowUp' || event.key === 'PageUp' )
    {
      requestedIndex = currentIndex - 1
    }
    else if ( event.key === 'Home' )
    {
      requestedIndex = 0
    }
    else if ( event.key === 'End' )
    {
      requestedIndex = pages.length - 1
    }

    if ( requestedIndex === null )
    {
      return
    }

    preventDefault( event )
    const targetPageIndex = clampPageIndex( requestedIndex, pages.length )
    goToPage( pages[ targetPageIndex ].id )
  }

  const handleResize = () =>
  {
    if ( destroyed ) return
    // Capture before the adapter's resize observers can rewrite the pixel scroll position.
    if ( resizeTimer === null )
    {
      pendingResizeProgress = lastScrollProgress
      pendingResizeTargetPage = transitioning ? targetPage : null
      preservingResizeProgress = true
    }
    if ( resizeTimer !== null ) clock.clearTimeout( resizeTimer )
    if ( resizeRestoreTimer !== null ) clock.clearTimeout( resizeRestoreTimer )
    resizeTimer = clock.setTimeout( () =>
    {
      resizeTimer = null
      if ( destroyed ) return

      // Refresh can synchronously emit a scroll update, so use the position captured
      // when the resize burst began rather than the adapter's rewritten pixel range.
      const preservedProgress = pendingResizeProgress
      adapter.refresh?.()
      const restore = () =>
      {
        const destination = resolvePage( pendingResizeTargetPage || ( transitioning ? targetPage : activePage ) )
        const metrics = getMetrics()
        const targetY = ( pendingResizeTargetPage || transitioning )
          ? getTargetY( destination )
          : metrics && Number.isFinite( metrics.range )
            ? Math.round( metrics.top + metrics.range * preservedProgress )
            : null
        if ( targetY === null ) return

        adapter.scrollTo( targetY, {
          immediate: true,
          force: true,
          programmatic: true,
        } )
        adapter.update?.()
        notifyProgress()
      }

      restore()

      // GSAP matchMedia can rebuild a responsive timeline after the adapter refresh.
      // Reapply once after that seam so the final pixel position still represents the
      // captured normalized Story progress under a slow WebGL frame.
      resizeRestoreTimer = clock.setTimeout( () =>
      {
        resizeRestoreTimer = null
        if ( destroyed ) return
        restore()
        // New user scroll updates may replace the retained position after this guard.
        lastScrollProgress = preservedProgress
        preservingResizeProgress = false
      }, RESIZE_RESTORE_GUARD_MS )
    }, resizeSettleMs )
  }

  // Update story page definitions and sync active page.
  function setPages( nextPages )
  {
    pages = normalizePages( nextPages )
    let nextCurrent = resolvePage( activePage )
    if ( !nextCurrent )
    {
      nextCurrent = pageAtProgress( getProgress() )
    }
    activePage = nextCurrent.id

    const resolvedTarget = resolvePage( targetPage )
    if ( resolvedTarget )
    {
      targetPage = resolvedTarget.id
    }
    else
    {
      targetPage = nextCurrent.id
    }

    notifyProgress()
  }

  // Jump directly to a given progress position.
  function seekProgress( suppliedProgress )
  {
    const metrics = getMetrics()
    if ( !metrics || !Number.isFinite( metrics.range ) )
    {
      return null
    }

    let rawProgress = 0
    if ( Number.isFinite( suppliedProgress ) )
    {
      rawProgress = suppliedProgress
    }
    const progress = clamp( rawProgress )
    const targetY = Math.round( metrics.top + metrics.range * progress )

    adapter.scrollTo( targetY, {
      immediate: true,
      force: true,
      programmatic: true,
    } )
    notifyProgress()
    return { targetScroll: targetY, currentScroll: adapter.getScrollPosition() }
  }

  // Attach event listeners and initialize starting page.
  function mount()
  {
    if ( mounted || destroyed )
    {
      return
    }
    mounted = true

    if ( adapter.onScroll )
    {
      unsubscribeScroll = adapter.onScroll( notifyProgress ) || noop
    }
    else
    {
      unsubscribeScroll = noop
    }

    if ( adapter.onVirtualScroll )
    {
      unsubscribeVirtualScroll = adapter.onVirtualScroll( handleVirtualScroll ) || noop
    }
    else
    {
      unsubscribeVirtualScroll = noop
    }

    if ( eventTarget && typeof eventTarget.addEventListener === 'function' )
    {
      eventTarget.addEventListener( 'keydown', handleKeyDown )
      // Capture resize before ScrollTrigger's global refresh listener can rewrite Lenis's pixel position.
      eventTarget.addEventListener( 'resize', handleResize, true )
    }

    let initial = pageAtProgress( getProgress() )
    if ( !initial )
    {
      initial = resolvePage( initialPage )
    }
    if ( !initial )
    {
      initial = pages[ 0 ]
    }

    activePage = initial.id
    targetPage = initial.id
    indicatorPage = initial.id

    if ( typeof onIndicatorPageChange === 'function' )
    {
      onIndicatorPageChange( indicatorPage )
    }
    if ( typeof onPageChange === 'function' )
    {
      onPageChange( initial.id )
    }
    notifyProgress()
  }

  // Clean up timers and event listeners.
  function destroy()
  {
    if ( destroyed )
    {
      return
    }
    destroyed = true

    clearTransitionTimer()
    if ( resizeTimer !== null )
    {
      clock.clearTimeout( resizeTimer )
      resizeTimer = null
    }
    if ( resizeRestoreTimer !== null )
    {
      clock.clearTimeout( resizeRestoreTimer )
      resizeRestoreTimer = null
    }

    unsubscribeScroll()
    unsubscribeVirtualScroll()

    if ( eventTarget && typeof eventTarget.removeEventListener === 'function' )
    {
      eventTarget.removeEventListener( 'keydown', handleKeyDown )
      eventTarget.removeEventListener( 'resize', handleResize, true )
    }

    resetTouchGesture( touchGesture )
    if ( adapter && typeof adapter.destroy === 'function' )
    {
      adapter.destroy()
    }
  }

  return {
    mount,
    destroy,
    goToPage,
    handleVirtualScroll,
    setPages,
    seekProgress,
    getProgress,
    getState: () => ( {
      activePage,
      targetPage,
      indicatorPage,
      isTransitioning: transitioning,
      progress: getProgress(),
    } ),
    get isTransitioning () { return transitioning },
  }
}
