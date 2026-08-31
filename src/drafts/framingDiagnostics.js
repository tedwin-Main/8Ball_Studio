import * as THREE from 'three'

// Keep viewport projection serialization out of normal visitor renders; the browser benchmark opts in explicitly.
export const isFramingDiagnosticsEnabled = ( windowObject = globalThis.window ) =>
  new URLSearchParams( windowObject?.location?.search || '' ).get( 'benchmark' ) === 'draft2'

const projectViewportPoint = ( point, camera ) =>
{
  const projected = point.clone().project( camera )
  return {
    x: ( projected.x + 1 ) / 2,
    y: ( 1 - projected.y ) / 2,
  }
}

// Keep the browser seam limited to visitor-visible viewport facts, never scene objects.
export const publishFramingDiagnostics = ( canvas, camera, balls, radius, framing, photoRegistration = null ) =>
{
  const width = Math.max( 1, canvas.clientWidth || window.innerWidth )
  const height = Math.max( 1, canvas.clientHeight || window.innerHeight )
  const project = ( position ) => projectViewportPoint(
    new THREE.Vector3( position.x, position.y, position.z ),
    camera,
  )
  const eightBall = balls[ 0 ]
  const eightBallPoint = project( eightBall.position )
  const cameraRight = new THREE.Vector3().setFromMatrixColumn( camera.matrixWorld, 0 ).normalize()
  const ballEdge = new THREE.Vector3(
    eightBall.position.x,
    eightBall.position.y,
    eightBall.position.z,
  ).addScaledVector( cameraRight, radius )
  const ballEdgePoint = project( ballEdge )
  const rackPoints = balls.slice( 1 ).map( ( ball ) => project( ball.position ) )
  const rackApex = rackPoints[ 0 ] || eightBallPoint
  const rackBounds = rackPoints.reduce( ( bounds, point ) => ( {
    minX: Math.min( bounds.minX, point.x ),
    maxX: Math.max( bounds.maxX, point.x ),
    minY: Math.min( bounds.minY, point.y ),
    maxY: Math.max( bounds.maxY, point.y ),
  } ), {
    minX: Infinity,
    maxX: -Infinity,
    minY: Infinity,
    maxY: -Infinity,
  } )
  const snapshot = {
    width,
    height,
    fov: framing.fov,
    portraitMix: framing.portraitMix,
    trackProgress: framing.trackProgress,
    pointerEnabled: framing.pointerEnabled,
    pointerX: framing.pointerX,
    pointerY: framing.pointerY,
    photoPlateLocked: framing.photoPlateLocked,
    camera: framing.camera,
    target: framing.target,
    eightBall: eightBallPoint,
    rackApex,
    rackBounds,
    photoRegistration,
    eightBallDiameter: Math.hypot(
      ( ballEdgePoint.x - eightBallPoint.x ) * width,
      ( ballEdgePoint.y - eightBallPoint.y ) * height,
    ),
    centerlineError: Math.max(
      Math.abs( eightBallPoint.x - 0.5 ),
      Math.abs( rackApex.x - 0.5 ),
    ),
  }
  canvas.dataset.framing = JSON.stringify( snapshot )
  if ( photoRegistration ) canvas.dataset.anchorError = photoRegistration.anchorError.toFixed( 2 )
}
