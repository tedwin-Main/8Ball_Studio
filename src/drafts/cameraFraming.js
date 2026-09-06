// Draft 2's camera is the source of truth. Consumers scale this contract into
// their own scene units while keeping the same viewport composition.
const clamp = ( value, min = 0, max = 1 ) => Math.min( max, Math.max( min, value ) )
const lerp = ( start, end, progress ) => start + ( end - start ) * progress
const smoothstep = ( progress ) => progress * progress * ( 3 - 2 * progress )

// Draft 2 uses this scale to turn the physics table (2.54m) into its 19.2-unit scene.
// Keeping it here makes the normalized camera contract explicit for Draft 1's photo plate.
export const DRAFT2_SCENE_SCALE = 19.2 / 2.54
// Camera parallax is opt-in only when the primary input can hover and point precisely.
export const CAMERA_POINTER_QUERY = '(hover: hover) and (pointer: fine)'

// This one shared baseline is calibrated to the unchanged Draft 1 plate at the
// opening rack. Draft 2 still owns the contract; the calibration prevents a
// per-renderer camera fork from making the two foregrounds visibly disagree.
const PHOTO_ALIGNED_TARGET_Y = -0.0312 * DRAFT2_SCENE_SCALE
const PHOTO_ALIGNED_TARGET_Z = -0.344 * DRAFT2_SCENE_SCALE
const PHOTO_ALIGNED_PORTRAIT_TARGET_Y = -0.348

const CAMERA_SOURCE = Object.freeze( {
  fov: Object.freeze( { landscape: 38, portrait: 44 } ),
  portrait: Object.freeze( { aspectStart: 0.86, aspectRange: 0.36 } ),
  path: Object.freeze( {
    // Draft 2 scene units remain canonical; consumers scale this path as needed.
    start: Object.freeze( {
      camera: Object.freeze( [ 0, 0.78, 0.5 * DRAFT2_SCENE_SCALE + 2.05 ] ),
      target: Object.freeze( [ 0, PHOTO_ALIGNED_TARGET_Y, PHOTO_ALIGNED_TARGET_Z ] ),
    } ),
    end: Object.freeze( {
      camera: Object.freeze( [ 0, 1.35, 1.2 ] ),
      target: Object.freeze( [ 0, PHOTO_ALIGNED_TARGET_Y, -5.4 ] ),
    } ),
    portraitStart: Object.freeze( [ 0, 0.45, 1.2 ] ),
    portraitEnd: Object.freeze( [ 0, 0.55, 1.0 ] ),
    portraitTargetY: PHOTO_ALIGNED_PORTRAIT_TARGET_Y,
  } ),
  pointer: Object.freeze( {
    camera: Object.freeze( [ 0.12, 0.05 ] ),
    target: Object.freeze( [ 0.05, 0.02 ] ),
  } ),
} )

// This damping keeps desktop parallax tactile without making the camera jump to each pointer event.
export const CAMERA_POINTER_DAMPING = 0.045
// Stop the pointer loop once the remaining offset is below a visually sub-pixel tolerance.
const CAMERA_POINTER_SETTLE_TOLERANCE = 0.0015

// Keep pointer capability, touch reset, and interpolation behavior identical in both renderers.
export const createPointerParallax = ( {
  windowObject = globalThis.window,
  isActive = () => true,
  requestRender = () => {},
  onResize = () => {},
  enabled = true,
} = {} ) =>
{
  const capability = windowObject?.matchMedia?.( CAMERA_POINTER_QUERY ) || { matches: false }
  const state = {
    enabled: enabled && Boolean( capability.matches ),
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
  }
  let pointerListenersAttached = false

  const reset = () =>
  {
    state.x = 0
    state.y = 0
    state.targetX = 0
    state.targetY = 0
  }

  const syncCapability = () =>
  {
    const nextEnabled = enabled && Boolean( capability.matches )
    if ( nextEnabled === state.enabled ) return false
    state.enabled = nextEnabled
    reset()
    if ( nextEnabled ) addPointerListeners()
    else removePointerListeners()
    return true
  }

  const isFineHoverPointer = ( event ) =>
  {
    // Touch must never become a camera or hover coordinate on hybrid devices.
    const pointerType = event?.pointerType
    return !pointerType || pointerType === 'mouse' || pointerType === 'pen'
  }

  const neutralize = ( { immediate = false } = {} ) =>
  {
    const changed = state.targetX !== 0 ||
      state.targetY !== 0 ||
      ( immediate && ( state.x !== 0 || state.y !== 0 ) )
    state.targetX = 0
    state.targetY = 0
    if ( immediate )
    {
      state.x = 0
      state.y = 0
    }
    return changed
  }

  const handlePointerMove = ( event ) =>
  {
    syncCapability()
    if ( !isFineHoverPointer( event ) )
    {
      if ( neutralize( { immediate: true } ) ) requestRender()
      return
    }
    if ( !isActive() || !state.enabled ) return
    const width = windowObject?.innerWidth || 1
    const height = windowObject?.innerHeight || 1
    state.targetX = ( event.clientX / width - 0.5 ) * 2
    state.targetY = ( event.clientY / height - 0.5 ) * -2
    requestRender()
  }

  const handlePointerLeave = () =>
  {
    if ( !state.enabled || !neutralize( { immediate: true } ) ) return
    // Pointer exit should not leave a stale hover cue while the browser is elsewhere.
    requestRender()
  }

  const handlePointerOut = ( event ) =>
  {
    // Window pointerleave is inconsistent across browsers; a null relatedTarget means the pointer left the document.
    if ( !event?.relatedTarget ) handlePointerLeave()
  }

  const addPointerListeners = () =>
  {
    if ( pointerListenersAttached || !enabled || !capability.matches ) return
    windowObject?.addEventListener?.( 'pointermove', handlePointerMove, { passive: true } )
    windowObject?.addEventListener?.( 'pointerleave', handlePointerLeave, { passive: true } )
    windowObject?.addEventListener?.( 'pointerout', handlePointerOut, { passive: true } )
    pointerListenersAttached = true
  }

  const removePointerListeners = () =>
  {
    if ( !pointerListenersAttached ) return
    windowObject?.removeEventListener?.( 'pointermove', handlePointerMove )
    windowObject?.removeEventListener?.( 'pointerleave', handlePointerLeave )
    windowObject?.removeEventListener?.( 'pointerout', handlePointerOut )
    pointerListenersAttached = false
  }

  const handleResize = () =>
  {
    syncCapability()
    // A resize/orientation change invalidates the old pointer coordinate; require a fresh hover sample.
    neutralize( { immediate: true } )
    onResize()
    requestRender()
  }

  const handleCapabilityChange = () =>
  {
    if ( syncCapability() ) requestRender()
  }

  const addListeners = () =>
  {
    addPointerListeners()
    windowObject?.addEventListener?.( 'resize', handleResize )
    windowObject?.addEventListener?.( 'blur', handlePointerLeave )
    capability.addEventListener?.( 'change', handleCapabilityChange )
    if ( !capability.addEventListener ) capability.addListener?.( handleCapabilityChange )
  }

  const removeListeners = () =>
  {
    removePointerListeners()
    windowObject?.removeEventListener?.( 'resize', handleResize )
    windowObject?.removeEventListener?.( 'blur', handlePointerLeave )
    capability.removeEventListener?.( 'change', handleCapabilityChange )
    if ( !capability.removeEventListener ) capability.removeListener?.( handleCapabilityChange )
  }

  const advance = () =>
  {
    state.x += ( state.targetX - state.x ) * CAMERA_POINTER_DAMPING
    state.y += ( state.targetY - state.y ) * CAMERA_POINTER_DAMPING
    return Math.abs( state.targetX - state.x ) <= CAMERA_POINTER_SETTLE_TOLERANCE &&
      Math.abs( state.targetY - state.y ) <= CAMERA_POINTER_SETTLE_TOLERANCE
  }

  return {
    state,
    reset,
    syncCapability,
    addListeners,
    removeListeners,
    advance,
  }
}

const scaleVector = ( vector, scale ) => vector.map( ( value ) => value * scale )

// Draft 1 consumes pointer input as bounded camera and lighting response on the 3D ball layer.
export const resolvePhotoHoverResponse = ( {
  pointerX = 0,
  pointerY = 0,
  pointerEnabled = false,
} = {} ) =>
{
  const enabled = pointerEnabled === true
  const x = enabled && Number.isFinite( pointerX ) ? clamp( pointerX, -1, 1 ) : 0
  const y = enabled && Number.isFinite( pointerY ) ? clamp( pointerY, -1, 1 ) : 0

  return Object.freeze( {
    enabled,
    x,
    y,
    strength: Math.min( 1, Math.hypot( x, y ) ),
  } )
}

/**
 * Resolve one Intro camera from Story progress, viewport aspect, and input capability.
 * `sourceScale` converts Draft 2 scene units into the consumer renderer's units.
 * `lockToPlate` keeps a photo-backed renderer on its calibrated table projection.
 */
export const resolveIntroCameraFraming = ( {
  progress = 0,
  transitionReadyProgress = 0.5,
  aspect = 1,
  sourceScale = 1,
  pointerX = 0,
  pointerY = 0,
  pointerEnabled = false,
  lockToPlate = false,
  treatment = 'aligned',
} = {} ) =>
{
  const safeAspect = Number.isFinite( aspect ) && aspect > 0 ? aspect : 1
  const safeTransition = Math.max( Number.EPSILON, transitionReadyProgress )
  const portraitMix = clamp(
    ( CAMERA_SOURCE.portrait.aspectStart - safeAspect ) / CAMERA_SOURCE.portrait.aspectRange,
  )
  // Keep the calibrated Story track locked for the photo plate; pointer offsets can still orbit the 3D ball layer.
  const trackProgress = lockToPlate ? 0 : clamp( progress / safeTransition )
  const trackEase = smoothstep( trackProgress )
  const startCamera = CAMERA_SOURCE.path.start.camera
  const endCamera = CAMERA_SOURCE.path.end.camera
  const startTarget = CAMERA_SOURCE.path.start.target
  const endTarget = CAMERA_SOURCE.path.end.target
  const portraitCameraStart = CAMERA_SOURCE.path.portraitStart
  const portraitCameraEnd = CAMERA_SOURCE.path.portraitEnd
  const camera = [
    lerp( startCamera[ 0 ], endCamera[ 0 ], trackEase ),
    lerp( startCamera[ 1 ] + portraitCameraStart[ 1 ] * portraitMix,
      endCamera[ 1 ] + portraitCameraEnd[ 1 ] * portraitMix, trackEase ),
    lerp( startCamera[ 2 ] + portraitCameraStart[ 2 ] * portraitMix,
      endCamera[ 2 ] + portraitCameraEnd[ 2 ] * portraitMix, trackEase ),
  ]
  const target = [
    lerp( startTarget[ 0 ], endTarget[ 0 ], trackEase ),
    lerp(
      lerp( startTarget[ 1 ], CAMERA_SOURCE.path.portraitTargetY, portraitMix ),
      lerp( endTarget[ 1 ], CAMERA_SOURCE.path.portraitTargetY, portraitMix ),
      trackEase,
    ),
    lerp( startTarget[ 2 ], endTarget[ 2 ], trackEase ),
  ]
  // Explicit treatments remain in the shared progress contract. Rise finishes before
  // impact so scatter stays readable, and reverse seeks retrace the same path.
  if ( !lockToPlate && ( treatment === 'break' || treatment === 'photoreal' ) )
  {
    const rise = smoothstep( clamp( progress / ( safeTransition * 0.48 ) ) )
    const photoreal = treatment === 'photoreal'
    const opening = photoreal ? [ 0.48, 1.1, 6.9 ] : [ 0, 0.9, 6.5 ]
    const overview = photoreal ? [ 3.5, 9.8, 12.8 ] : [ 0.5, 5.8, 4.8 ]
    const openingTarget = [ 0, -0.25, -1.8 ]
    const overviewTarget = [ 0, 0, -2.5 ]
    for ( let axis = 0; axis < 3; axis += 1 )
    {
      camera[ axis ] = lerp( opening[ axis ], overview[ axis ], rise )
      target[ axis ] = lerp( openingTarget[ axis ], overviewTarget[ axis ], rise )
    }
    camera[ 0 ] *= 1 - portraitMix * 0.7
    camera[ 1 ] += portraitMix * lerp( 0.7, 4, rise )
    camera[ 2 ] += portraitMix * lerp( 2.3, 6, rise )
    target[ 1 ] += portraitMix * 0.8
  }
  // Draft 1 uses a transparent WebGL layer, so camera parallax is safe while its Story track stays plate-locked.
  const hasPointer = pointerEnabled === true
  const normalizedPointerX = hasPointer && Number.isFinite( pointerX ) ? pointerX : 0
  const normalizedPointerY = hasPointer && Number.isFinite( pointerY ) ? pointerY : 0

  camera[ 0 ] += normalizedPointerX * CAMERA_SOURCE.pointer.camera[ 0 ]
  camera[ 1 ] += normalizedPointerY * CAMERA_SOURCE.pointer.camera[ 1 ]
  target[ 0 ] += normalizedPointerX * CAMERA_SOURCE.pointer.target[ 0 ]
  target[ 1 ] += normalizedPointerY * CAMERA_SOURCE.pointer.target[ 1 ]

  return Object.freeze( {
    // Keep the controller's timeline-unit playhead in diagnostics so browser checks can reject stale frames.
    progress: clamp( progress ),
    fov: lerp( CAMERA_SOURCE.fov.landscape, CAMERA_SOURCE.fov.portrait, portraitMix ),
    portraitMix,
    trackProgress,
    trackEase,
    pointerEnabled: hasPointer,
    pointerX: normalizedPointerX,
    pointerY: normalizedPointerY,
    photoPlateLocked: lockToPlate,
    camera: Object.freeze( scaleVector( camera, sourceScale ) ),
    target: Object.freeze( scaleVector( target, sourceScale ) ),
  } )
}
