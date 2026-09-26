// Story navigation is framework-agnostic. Browser and in-memory adapters provide
// scrolling, timing, and event delivery while this module owns Story behavior.

const DEFAULT_RESIZE_SETTLE_MS = 150
// Responsive timeline rebuilds can follow the first refresh; keep the retained
// normalized position guarded after the settle window has completed.
const RESIZE_RESTORE_GUARD_MS = 320
const DEFAULT_TRANSITION_BUFFER_MS = 350
// Playing the break back needs more intent than playing it: upward input at Studio must add up to
// this many px (a deliberate swipe, or two wheel notches) before the rewind starts. Separate upward
// gestures keep adding up while each follows the last within the memory window.
const DEFAULT_REWIND_THRESHOLD_PX = 120
const DEFAULT_REWIND_MEMORY_MS = 800
// Tolerance, in px, for "at" a Page's scroll target.
const SPAN_EDGE_PX = 2
// A glide turned around partway takes this share of its full duration at least, so a short way
// back never snaps.
const MIN_REDIRECT_SHARE = 0.3
// How far one key press scrolls natively: an arrow is about one line; Space about one screen.
const ARROW_STEP_PX = 60
const SPACE_STEP_SHARE = 0.875
const FALLBACK_VIEWPORT_PX = 800

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

// Check if Space would press the focused element (a button or a control acting as one).
// The browser's own rule wins there: the Story never takes Space from it.
function isPressableTarget( target )
{
  return Boolean(
    target &&
    typeof target.matches === 'function' &&
    target.matches( 'button, summary, [role="button"], [role="switch"], [role="checkbox"], [role="menuitem"], [role="tab"]' )
  )
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
  rewindThresholdPx = DEFAULT_REWIND_THRESHOLD_PX,
  rewindMemoryMs = DEFAULT_REWIND_MEMORY_MS,
  // { from, to } Page ids whose span plays by itself (the Intro break). One gesture
  // inside it glides the whole way to the Page it points at, instead of scrubbing the span by hand.
  autoplaySpan = null,
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
  // One gesture in the autoplay span: a burst of wheel events (no pause longer than gestureResetMs)
  // or one touch. Once it has started a glide, the rest of it is swallowed, so trackpad inertia
  // cannot carry on past the destination or immediately turn the glide around.
  const autoplayGesture = {
    lastTime: -Infinity,
    startY: 0,
    accumulated: 0,
    touchY: null,
    consumed: false,
  }
  // Upward input at Studio, added up across nearby gestures until it counts as a rewind.
  const rewindIntent = { accumulated: 0, lastTime: -Infinity }
  // The glide in flight ({ fromY, toY }), or null. Each glide is its own object, so a completion
  // from a glide that was stopped or turned around can never settle the Story.
  let glide = null
  // Input against the running glide, added up until it counts as intent to take the page back.
  const reversal = { accumulated: 0, touchY: null }

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
    glide = null
    setTransitioning( false )
    activePage = destinationId
    targetPage = destinationId
    setIndicatorPage( resolvePage( destinationId ) )
    onPageChange?.( destinationId )
    notifyProgress()
  }

  const goToPage = ( requestedPage, options = {} ) =>
  {
    if ( destroyed ) return false
    // A running glide blocks new ones, except an immediate jump or a turn-around (options.redirect).
    if ( transitioning && options.immediate !== true && options.redirect !== true ) return false

    const fromPage = getCurrentPage()
    const destination = resolvePage( requestedPage )
    if ( !destination ) return false

    const targetY = getTargetY( destination )
    if ( targetY === null ) return false

    // Already on this Page *and* at its target: nothing to do. Being on a Page partway down (a
    // normal-scroll section scrolled into) still glides back to its target.
    const atTarget = Math.abs( adapter.getScrollPosition() - targetY ) <= 2
    if ( destination.id === fromPage?.id && atTarget && options.immediate !== true )
    {
      activePage = destination.id
      targetPage = destination.id
      setIndicatorPage( destination )
      onPageChange?.( destination.id )
      return true
    }

    const isImmediate = options.immediate === true || Boolean( prefersReducedMotion() )
    const transition = transitionFor( { fromPage, toPage: destination } ) || {}
    // A glide turned around partway covers only part of its usual distance, so it takes that share
    // of the time (options.durationScale).
    const scale = Number.isFinite( options.durationScale ) && options.durationScale > 0 ? options.durationScale : 1
    const duration = ( Number.isFinite( transition.duration ) && transition.duration > 0
      ? transition.duration
      : 1 ) * scale

    targetPage = destination.id

    if ( isImmediate )
    {
      glide = null
      setTransitioning( false )
      adapter.scrollTo( targetY, {
        immediate: true,
        force: true,
        programmatic: true,
      } )
      completeTransition( destination.id )
      return true
    }

    // Lock incoming Story gestures until the scroll adapter confirms settlement. Input against the
    // glide can still take the page back (see handleVirtualScroll), so the glide remembers its way.
    const current = { fromY: adapter.getScrollPosition(), toY: targetY }
    glide = current
    reversal.accumulated = 0
    setTransitioning( true )
    adapter.scrollTo( targetY, {
      duration,
      easing: transition.easing,
      immediate: false,
      lock: true,
      force: true,
      programmatic: true,
      onComplete: () =>
      {
        if ( glide === current ) completeTransition( destination.id )
      },
    } )

    // A paused background tab must not leave Story navigation permanently locked.
    clearTransitionTimer()
    transitionTimer = clock.setTimeout( () =>
    {
      if ( transitioning && glide === current ) completeTransition( destination.id )
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

  // The autoplay span's two ends, as Pages and scroll positions, or null when there is none.
  const getSpan = () =>
  {
    if ( !autoplaySpan ) return null
    const fromPage = resolvePage( autoplaySpan.from )
    const toPage = resolvePage( autoplaySpan.to )
    const fromY = getTargetY( fromPage )
    const toY = getTargetY( toPage )
    if ( fromY === null || toY === null ) return null
    return { fromPage, toPage, fromY, toY }
  }

  // Free-scroll input inside the autoplay span. Returns null to leave the input to the free scroller
  // (or to the glide lock while one runs), or whether the scroller may still use it.
  // - Down inside the span glides to `to`; up inside it (or from `to` itself) glides back to `from`.
  // - Scrolling up from below that would carry into the span stops on `to` instead, so the break is
  //   never left half-scrubbed by a long flick up from Projects.
  const handleAutoplayInput = ( { deltaY, event, eventType, isTouch } ) =>
  {
    const now = clock.now()
    const y = adapter.getScrollPosition()
    const isNewGesture = isTouch ? eventType === 'touchstart' : now - autoplayGesture.lastTime > gestureResetMs
    if ( isNewGesture )
    {
      autoplayGesture.startY = y
      autoplayGesture.accumulated = 0
      autoplayGesture.touchY = null
      autoplayGesture.consumed = false
    }
    // The gesture clock keeps running during a glide, so its inertia still counts as the same gesture.
    autoplayGesture.lastTime = now
    if ( transitioning || !Number.isFinite( y ) ) return null

    // Taps and lifts pass through; a touch is judged on its moves.
    if ( isTouch && eventType !== 'touchmove' )
    {
      if ( eventType === 'touchstart' ) autoplayGesture.touchY = getTouchY( event )
      return null
    }
    if ( autoplayGesture.consumed )
    {
      preventDefault( event )
      return false
    }

    let delta = deltaY
    if ( isTouch )
    {
      const touchY = getTouchY( event )
      if ( touchY !== null && autoplayGesture.touchY !== null ) delta = autoplayGesture.touchY - touchY
      if ( touchY !== null ) autoplayGesture.touchY = touchY
    }
    if ( !Number.isFinite( delta ) || delta === 0 ) return null
    // Any downward input clears a half-built rewind.
    if ( delta > 0 ) rewindIntent.accumulated = 0

    const span = getSpan()
    if ( !span ) return null
    const { fromPage, toPage, fromY, toY } = span

    const edge = SPAN_EDGE_PX
    const inSpan = y > fromY - edge && y < toY - edge
    const atOrInSpan = y > fromY + edge && y <= toY + edge
    let destination = null
    let needsIntent = true
    if ( delta > 0 && inSpan )
    {
      destination = toPage
    }
    else if ( delta < 0 && atOrInSpan )
    {
      // A gesture that began below the span and carried into it settles on `to`.
      const beganBelow = autoplayGesture.startY > toY + edge
      destination = beganBelow ? toPage : fromPage
      needsIntent = !beganBelow
    }
    else if ( delta < 0 && y > toY + edge )
    {
      const target = adapter.getScrollTarget?.()
      const landing = ( Number.isFinite( target ) ? target : y ) + delta
      if ( landing >= toY - edge ) return null
      destination = toPage
      needsIntent = false
    }
    if ( !destination ) return null

    // Hold the page still until the gesture has moved far enough to count as intent.
    preventDefault( event )
    if ( needsIntent && destination === fromPage )
    {
      // A rewind: trackpad drift or one stray notch up after Studio lands must not send the visitor
      // back to the start. Upward input adds up across gestures that follow each other closely.
      if ( now - rewindIntent.lastTime > rewindMemoryMs ) rewindIntent.accumulated = 0
      rewindIntent.lastTime = now
      rewindIntent.accumulated += Math.abs( delta )
      if ( rewindIntent.accumulated < rewindThresholdPx ) return false
      rewindIntent.accumulated = 0
    }
    else if ( needsIntent )
    {
      if ( autoplayGesture.accumulated !== 0 && Math.sign( autoplayGesture.accumulated ) !== Math.sign( delta ) )
      {
        autoplayGesture.accumulated = 0
      }
      autoplayGesture.accumulated += delta
      if ( Math.abs( autoplayGesture.accumulated ) < gestureThresholdPx ) return false
    }

    autoplayGesture.consumed = true
    goToPage( destination.id )
    return false
  }

  // Input against the running glide, added up until it counts as intent (the Story gesture
  // threshold). Returns the direction the visitor wants (1 down, -1 up), or 0 while there is none.
  // Input along the glide (its own gesture's inertia) never counts and clears the sum.
  const readReversal = ( { deltaY, event, eventType, isTouch } ) =>
  {
    const direction = glide ? Math.sign( glide.toY - glide.fromY ) : 0
    if ( direction === 0 ) return 0

    let delta = deltaY
    if ( isTouch )
    {
      const touchY = getTouchY( event )
      delta = eventType === 'touchmove' && touchY !== null && reversal.touchY !== null ? reversal.touchY - touchY : 0
      reversal.touchY = touchY
    }
    if ( !Number.isFinite( delta ) || delta === 0 ) return 0
    if ( Math.sign( delta ) === direction )
    {
      reversal.accumulated = 0
      return 0
    }

    reversal.accumulated += Math.abs( delta )
    if ( reversal.accumulated < gestureThresholdPx ) return 0
    reversal.accumulated = 0
    return -direction
  }

  // The visitor takes the page back from a glide. Inside the autoplay span the glide turns around
  // to the span's end in the visitor's direction, so the break is never left half-played. Anywhere
  // else the glide stops where it is and this input scrolls the page freely.
  const interruptGlide = ( direction, event ) =>
  {
    const y = adapter.getScrollPosition()
    const span = getSpan()
    if ( span && Number.isFinite( y ) && y > span.fromY + SPAN_EDGE_PX && y < span.toY - SPAN_EDGE_PX )
    {
      const destination = direction > 0 ? span.toPage : span.fromPage
      const share = Math.abs( getTargetY( destination ) - y ) / Math.max( 1, span.toY - span.fromY )
      preventDefault( event )
      goToPage( destination.id, { redirect: true, durationScale: Math.max( MIN_REDIRECT_SHARE, share ) } )
      return false
    }

    // Stop here: the Page under the visitor becomes the Stable page, and free scroll resumes.
    clearTransitionTimer()
    glide = null
    const here = pageAtProgress( getProgress() )
    activePage = here.id
    targetPage = here.id
    setTransitioning( false )
    setIndicatorPage( here )
    onPageChange?.( here.id )
    // A scrollTo to the current position cannot stop Lenis mid-glide (its target already equals the
    // animated position), so adapters end a glide through their own cancelGlide.
    if ( typeof adapter.cancelGlide === 'function' ) adapter.cancelGlide()
    else adapter.scrollTo( y, { immediate: true, force: true, programmatic: true } )
    return true
  }

  const handleVirtualScroll = ( scrollInput = {} ) =>
  {
    const { deltaY = 0, event } = scrollInput
    const eventType = event?.type || ''
    const isWheel = eventType.includes( 'wheel' )
    const isTouch = eventType.includes( 'touch' )

    if ( !( isWheel || isTouch ) || !isStoryActive() ) return true

    // The page scrolls freely, except inside the autoplay span and while a Page glide holds it.
    const autoplayResult = autoplaySpan ? handleAutoplayInput( { deltaY, event, eventType, isTouch } ) : null
    if ( autoplayResult !== null ) return autoplayResult
    if ( !transitioning ) return true

    // A glide never takes the page away from the visitor: input against it takes the page back.
    const against = readReversal( { deltaY, event, eventType, isTouch } )
    if ( against !== 0 ) return interruptGlide( against, event )

    // Let the scroll adapter observe touchend while a glide holds the page.
    if ( eventType !== 'touchend' ) preventDefault( event )
    return eventType === 'touchend'
  }

  // Which way a scrolling key moves the page (1 down, -1 up), or 0 for any other key.
  const getKeyDirection = ( event ) =>
  {
    if ( event.key === 'ArrowDown' || event.key === 'PageDown' ) return 1
    if ( event.key === 'ArrowUp' || event.key === 'PageUp' ) return -1
    if ( event.key === ' ' ) return event.shiftKey ? -1 : 1
    return 0
  }

  // Inside the autoplay span every scrolling key is a Story gesture, so the break is never scrubbed
  // by hand: down plays it, up plays it back. A key step up from just below the span that would land
  // inside it settles on the span's end instead. Returns the Page to glide to, or null.
  const getKeySpanDestination = ( event ) =>
  {
    const direction = getKeyDirection( event )
    const span = direction === 0 ? null : getSpan()
    const y = adapter.getScrollPosition()
    if ( !span || !Number.isFinite( y ) ) return null

    if ( direction > 0 )
    {
      return y >= span.fromY - SPAN_EDGE_PX && y < span.toY - SPAN_EDGE_PX ? span.toPage : null
    }
    if ( y > span.fromY + SPAN_EDGE_PX && y <= span.toY + SPAN_EDGE_PX ) return span.fromPage

    const viewport = getMetrics()?.viewport
    const step = event.key === ' '
      ? ( Number.isFinite( viewport ) && viewport > 0 ? viewport : FALLBACK_VIEWPORT_PX ) * SPACE_STEP_SHARE
      : ARROW_STEP_PX
    return y > span.toY + SPAN_EDGE_PX && y - step < span.toY - SPAN_EDGE_PX ? span.toPage : null
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
    // Space presses a focused button; the Story never takes that key from it.
    if ( event.key === ' ' && isPressableTarget( event.target ) ) return

    const spanDestination = getKeySpanDestination( event )
    if ( spanDestination )
    {
      preventDefault( event )
      goToPage( spanDestination.id )
      return
    }

    // Outside the autoplay span the arrows and Space scroll natively, like any page, so the Projects
    // run is never skipped. The Page keys (PageUp, PageDown, Home, End) glide one Page at a time.
    const currentPage = getCurrentPage()
    const currentIndex = findPageIndex( pages, currentPage?.id )
    let requestedIndex = null

    if ( event.key === 'PageDown' )
    {
      requestedIndex = currentIndex + 1
    }
    else if ( event.key === 'PageUp' )
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
