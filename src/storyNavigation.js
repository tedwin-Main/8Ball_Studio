// Story navigation is framework-agnostic. Browser and in-memory adapters provide
// scrolling, timing, and event delivery while this module owns Story behavior.

const DEFAULT_RESIZE_SETTLE_MS = 150
// Responsive timeline rebuilds can follow the first refresh; keep the retained
// normalized position guarded after the settle window has completed.
const RESIZE_RESTORE_GUARD_MS = 320
const DEFAULT_TRANSITION_BUFFER_MS = 350

const clamp = ( value, min = 0, max = 1 ) => Math.min( max, Math.max( min, value ) )

const defaultClock = Object.freeze( {
  now: () => Date.now(),
  setTimeout: ( callback, delay ) => setTimeout( callback, delay ),
  clearTimeout: ( timer ) => clearTimeout( timer ),
} )

const noop = () => {}

const resetTouchGesture = ( gesture ) =>
{
  gesture.active = false
  gesture.lastY = null
  gesture.accumulated = 0
  gesture.direction = 0
  gesture.committed = false
}

const isEditableTarget = ( target ) =>
{
  if ( !target || typeof target !== 'object' ) return false

  return Boolean(
    target.isContentEditable ||
    typeof target.matches === 'function' && target.matches( 'input, textarea, select, option' ),
  )
}

// Touch deltas vary by browser; use the finger coordinate when it exists.
const getTouchY = ( event ) =>
{
  const point = event?.touches?.[ 0 ] || event?.changedTouches?.[ 0 ] || event?.targetTouches?.[ 0 ]
  return Number.isFinite( point?.clientY ) ? point.clientY : null
}

const preventDefault = ( event ) =>
{
  if ( event?.cancelable ) event.preventDefault()
}

const normalizePages = ( suppliedPages ) =>
{
  if ( !Array.isArray( suppliedPages ) || suppliedPages.length === 0 )
  {
    throw new TypeError( 'Story navigation requires at least one Page.' )
  }

  const ids = new Set()
  return suppliedPages.map( ( page ) =>
  {
    if ( !page || typeof page.id !== 'string' || page.id.length === 0 )
    {
      throw new TypeError( 'Every Story Page needs a non-empty id.' )
    }
    if ( ids.has( page.id ) ) throw new TypeError( `Duplicate Story Page id: ${page.id}` )
    ids.add( page.id )

    return Object.freeze( {
      ...page,
      startProgress: Number.isFinite( page.startProgress ) ? page.startProgress : 0,
      targetProgress: Number.isFinite( page.targetProgress ) ? page.targetProgress : 0,
    } )
  } )
}

const clampPageIndex = ( index, pageCount ) =>
  Math.min( pageCount - 1, Math.max( 0, index ) )

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

  const resolvePage = ( requestedPage ) =>
  {
    if ( typeof requestedPage === 'string' ) return pages.find( ( page ) => page.id === requestedPage ) || null
    if ( Number.isInteger( requestedPage ) ) return pages[ clampPageIndex( requestedPage, pages.length ) ] || null
    return null
  }

  const pageAtProgress = ( progress ) => pages.reduce(
    ( currentPage, page ) => progress >= page.startProgress ? page : currentPage,
    pages[ 0 ],
  )

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
    if ( transitioning && options.immediate !== true && options.interrupt !== true ) return false

    if ( transitioning && options.interrupt === true )
    {
      // Direct Page controls may intentionally replace an in-flight autoplay target;
      // wheel/touch/key gestures still use the normal lock above.
      clearTransitionTimer()
      setTransitioning( false )
    }

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

  const isStoryActive = () =>
  {
    const metrics = getMetrics()
    if ( !metrics || !Number.isFinite( metrics.range ) ) return false
    const scrollPosition = adapter.getScrollPosition()
    if ( !Number.isFinite( scrollPosition ) ) return false
    const storyEnd = metrics.top + metrics.range
    return scrollPosition >= metrics.top - 2 && scrollPosition <= storyEnd + 2
  }

  const handleVirtualScroll = ( scrollInput = {} ) =>
  {
    const { deltaY = 0, event } = scrollInput
    const eventType = event?.type || ''
    const isWheel = eventType.includes( 'wheel' )
    const isTouch = eventType.includes( 'touch' )

    if ( !( isWheel || isTouch ) || !isStoryActive() ) return true

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
      const fingerDelta = currentY !== null && touchGesture.lastY !== null
        ? touchGesture.lastY - currentY
        : Number.isFinite( deltaY ) ? deltaY : 0

      if ( currentY !== null ) touchGesture.lastY = currentY

      if ( fingerDelta !== 0 )
      {
        const direction = Math.sign( fingerDelta )
        if ( touchGesture.direction !== 0 && direction !== touchGesture.direction ) touchGesture.accumulated = 0
        touchGesture.direction = direction
        touchGesture.accumulated += fingerDelta
        accumulatedDelta = touchGesture.accumulated
      }

      if ( Math.abs( touchGesture.accumulated ) >= gestureThresholdPx )
      {
        const currentPage = getCurrentPage()
        const currentIndex = pages.findIndex( ( page ) => page.id === currentPage?.id )
        const nextIndex = currentIndex + ( touchGesture.accumulated > 0 ? 1 : -1 )

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
        if ( !didStart ) resetTouchGesture( touchGesture )
        return false
      }

      if ( eventType === 'touchend' ) resetTouchGesture( touchGesture )
      return true
    }

    const now = clock.now()
    if ( now - lastGestureTime > gestureResetMs ) accumulatedDelta = 0
    lastGestureTime = now
    if ( !Number.isFinite( deltaY ) || deltaY === 0 ) return true

    if ( accumulatedDelta !== 0 && Math.sign( accumulatedDelta ) !== Math.sign( deltaY ) ) accumulatedDelta = 0
    accumulatedDelta += deltaY

    if ( Math.abs( accumulatedDelta ) >= gestureThresholdPx )
    {
      const currentPage = getCurrentPage()
      const currentIndex = pages.findIndex( ( page ) => page.id === currentPage?.id )
      const nextIndex = currentIndex + ( accumulatedDelta > 0 ? 1 : -1 )

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
    ) return

    const currentPage = getCurrentPage()
    const currentIndex = pages.findIndex( ( page ) => page.id === currentPage?.id )
    let requestedIndex = null

    if ( event.key === 'ArrowDown' || event.key === 'PageDown' || event.key === ' ' )
    {
      requestedIndex = currentIndex + ( event.key === ' ' && event.shiftKey ? -1 : 1 )
    }
    else if ( event.key === 'ArrowUp' || event.key === 'PageUp' )
    {
      requestedIndex = currentIndex - 1
    }
    else if ( event.key === 'Home' ) requestedIndex = 0
    else if ( event.key === 'End' ) requestedIndex = pages.length - 1

    if ( requestedIndex === null ) return

    preventDefault( event )
    goToPage( pages[ clampPageIndex( requestedIndex, pages.length ) ].id )
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

  const setPages = ( nextPages ) =>
  {
    pages = normalizePages( nextPages )
    const nextCurrent = resolvePage( activePage ) || pageAtProgress( getProgress() )
    activePage = nextCurrent.id
    targetPage = resolvePage( targetPage )?.id || nextCurrent.id
    notifyProgress()
  }

  const seekProgress = ( suppliedProgress ) =>
  {
    const metrics = getMetrics()
    if ( !metrics || !Number.isFinite( metrics.range ) ) return null
    const progress = clamp( Number.isFinite( suppliedProgress ) ? suppliedProgress : 0 )
    const targetY = Math.round( metrics.top + metrics.range * progress )
    adapter.scrollTo( targetY, {
      immediate: true,
      force: true,
      programmatic: true,
    } )
    notifyProgress()
    return { targetScroll: targetY, currentScroll: adapter.getScrollPosition() }
  }

  const mount = () =>
  {
    if ( mounted || destroyed ) return
    mounted = true
    unsubscribeScroll = adapter.onScroll?.( notifyProgress ) || noop
    unsubscribeVirtualScroll = adapter.onVirtualScroll?.( handleVirtualScroll ) || noop
    eventTarget?.addEventListener?.( 'keydown', handleKeyDown )
    // Capture resize before ScrollTrigger's global refresh listener can rewrite Lenis's pixel position.
    eventTarget?.addEventListener?.( 'resize', handleResize, true )

    const initial = pageAtProgress( getProgress() ) || resolvePage( initialPage ) || pages[ 0 ]
    activePage = initial.id
    targetPage = initial.id
    indicatorPage = initial.id
    onIndicatorPageChange?.( indicatorPage )
    onPageChange?.( initial.id )
    notifyProgress()
  }

  const destroy = () =>
  {
    if ( destroyed ) return
    destroyed = true
    clearTransitionTimer()
    if ( resizeTimer !== null ) clock.clearTimeout( resizeTimer )
    if ( resizeRestoreTimer !== null ) clock.clearTimeout( resizeRestoreTimer )
    resizeTimer = null
    resizeRestoreTimer = null
    unsubscribeScroll()
    unsubscribeVirtualScroll()
    eventTarget?.removeEventListener?.( 'keydown', handleKeyDown )
    eventTarget?.removeEventListener?.( 'resize', handleResize, true )
    resetTouchGesture( touchGesture )
    adapter.destroy?.()
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
