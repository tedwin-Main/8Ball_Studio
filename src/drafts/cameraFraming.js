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

const CAMERA_SOURCE = Object.freeze( {
  fov: Object.freeze( { landscape: 38, portrait: 44 } ),
  portrait: Object.freeze( { aspectStart: 0.86, aspectRange: 0.36 } ),
  path: Object.freeze( {
    // These values are the existing Draft 2 camera, expressed in its scene units.
    start: Object.freeze( {
      camera: Object.freeze( [ 0, 0.78, 0.5 * DRAFT2_SCENE_SCALE + 2.05 ] ),
      target: Object.freeze( [ 0, 0.18, -2.6 ] ),
    } ),
    end: Object.freeze( {
      camera: Object.freeze( [ 0, 1.35, 1.2 ] ),
      target: Object.freeze( [ 0, 0.18, -5.4 ] ),
    } ),
    portraitStart: Object.freeze( [ 0, 0.45, 1.2 ] ),
    portraitEnd: Object.freeze( [ 0, 0.55, 1.0 ] ),
  } ),
  pointer: Object.freeze( {
    camera: Object.freeze( [ 0.12, 0.05 ] ),
    target: Object.freeze( [ 0.05, 0.02 ] ),
  } ),
} )

export const CAMERA_POINTER_DAMPING = 0.045

const scaleVector = ( vector, scale ) => vector.map( ( value ) => value * scale )

/**
 * Resolve one Intro camera from Story progress, viewport aspect, and input capability.
 * `sourceScale` converts Draft 2 scene units into the consumer renderer's units.
 */
export const resolveIntroCameraFraming = ( {
  progress = 0,
  transitionReadyProgress = 0.5,
  aspect = 1,
  sourceScale = 1,
  pointerX = 0,
  pointerY = 0,
  pointerEnabled = false,
} = {} ) =>
{
  const safeAspect = Number.isFinite( aspect ) && aspect > 0 ? aspect : 1
  const safeTransition = Math.max( Number.EPSILON, transitionReadyProgress )
  const portraitMix = clamp(
    ( CAMERA_SOURCE.portrait.aspectStart - safeAspect ) / CAMERA_SOURCE.portrait.aspectRange,
  )
  const trackProgress = clamp( progress / safeTransition )
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
    lerp( startTarget[ 1 ], endTarget[ 1 ], trackEase ),
    lerp( startTarget[ 2 ], endTarget[ 2 ], trackEase ),
  ]
  const hasPointer = pointerEnabled === true
  const normalizedPointerX = hasPointer && Number.isFinite( pointerX ) ? pointerX : 0
  const normalizedPointerY = hasPointer && Number.isFinite( pointerY ) ? pointerY : 0

  camera[ 0 ] += normalizedPointerX * CAMERA_SOURCE.pointer.camera[ 0 ]
  camera[ 1 ] += normalizedPointerY * CAMERA_SOURCE.pointer.camera[ 1 ]
  target[ 0 ] += normalizedPointerX * CAMERA_SOURCE.pointer.target[ 0 ]
  target[ 1 ] += normalizedPointerY * CAMERA_SOURCE.pointer.target[ 1 ]

  return Object.freeze( {
    fov: lerp( CAMERA_SOURCE.fov.landscape, CAMERA_SOURCE.fov.portrait, portraitMix ),
    portraitMix,
    trackProgress,
    trackEase,
    pointerEnabled: hasPointer,
    pointerX: normalizedPointerX,
    pointerY: normalizedPointerY,
    camera: Object.freeze( scaleVector( camera, sourceScale ) ),
    target: Object.freeze( scaleVector( target, sourceScale ) ),
  } )
}
