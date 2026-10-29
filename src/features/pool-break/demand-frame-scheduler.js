/**
 * Own one demand-driven animation frame for a renderer.
 *
 * Invalidations only retain the fact that the newest visual state is dirty;
 * callers keep the actual state in their existing controller closure. A dirty
 * paint arms one bounded confirmation callback so a progress callback that runs
 * before the renderer's callback cannot leave the next display interval with
 * no frame available. The confirmation callback does not paint by itself when
 * the state has already settled.
 */
export const createDemandFrameScheduler = ( {
  // Use browser window functions as defaults when running in DOM environment.
  requestAnimationFrame = typeof window !== 'undefined' ? ( cb ) => window.requestAnimationFrame( cb ) : undefined,
  cancelAnimationFrame = typeof window !== 'undefined' ? ( id ) => window.cancelAnimationFrame( id ) : undefined,
  render,
  renderFrame,
  shouldContinue = () => false,
  active = true,
} = {} ) =>
{
  // Support renderFrame as alias for render.
  const actualRender = render || renderFrame

  if ( typeof requestAnimationFrame !== 'function' )
  {
    throw new TypeError( 'A requestAnimationFrame function is required.' )
  }
  if ( typeof cancelAnimationFrame !== 'function' )
  {
    throw new TypeError( 'A cancelAnimationFrame function is required.' )
  }
  if ( typeof actualRender !== 'function' )
  {
    throw new TypeError( 'A render function is required.' )
  }

  let isActive = Boolean( active )
  let destroyed = false
  let dirty = false
  let confirmationPending = false
  let frameHandle = null
  let isRendering = false

  const cancelPendingFrame = () =>
  {
    if ( frameHandle === null ) return
    cancelAnimationFrame( frameHandle )
    frameHandle = null
  }

  const schedule = () =>
  {
    if ( destroyed || !isActive || frameHandle !== null || isRendering ) return
    frameHandle = requestAnimationFrame( onAnimationFrame )
  }

  const invalidate = () =>
  {
    if ( destroyed ) return
    // Keep only the newest state in the controller; one paint consumes it.
    dirty = true
    schedule()
  }

  const onAnimationFrame = ( timestamp ) =>
  {
    frameHandle = null
    if ( destroyed || !isActive ) return

    const renderDirty = dirty
    const continuationBeforeRender = Boolean( shouldContinue() )
    confirmationPending = false

    // A confirmation callback is deliberately cheap once both the dirty flag
    // and renderer-specific continuation have settled.
    if ( !renderDirty && !continuationBeforeRender ) return

    dirty = false
    isRendering = true
    try
    {
      actualRender( { timestamp, dirty: renderDirty } )
    }
    finally
    {
      isRendering = false
    }

    // Keep one callback armed after every dirty paint. If progress arrives
    // after this callback, it is consumed on the next display frame instead of
    // waiting for a later invalidation cycle.
    if ( renderDirty ) confirmationPending = true

    if ( dirty || confirmationPending || shouldContinue() ) schedule()
  }

  const setActive = ( nextActive ) =>
  {
    if ( destroyed ) return

    isActive = Boolean( nextActive )
    if ( !isActive )
    {
      // Inactive Drafts cancel their browser callback immediately. Keep dirty
      // state so reactivation can paint the latest Story progress.
      cancelPendingFrame()
      confirmationPending = false
      return
    }

    // Activation is a visual invalidation even when the progress value did not
    // change while this Draft was hidden.
    dirty = true
    schedule()
  }

  const destroy = () =>
  {
    if ( destroyed ) return
    destroyed = true
    isActive = false
    dirty = false
    confirmationPending = false
    cancelPendingFrame()
  }

  return {
    invalidate,
    // Provide requestRender alias for component callers.
    requestRender: invalidate,
    setActive,
    destroy,
    get isDirty () { return dirty },
    get isConfirmationPending () { return confirmationPending },
  }
}
