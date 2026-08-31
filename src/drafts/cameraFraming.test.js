import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CAMERA_POINTER_DAMPING,
  DRAFT2_SCENE_SCALE,
  resolveIntroCameraFraming,
} from './cameraFraming.js'

const assertClose = ( actual, expected, tolerance = 1e-12 ) =>
{
  assert.ok( Math.abs( actual - expected ) <= tolerance, `${actual} is not close to ${expected}` )
}

test( 'Draft 1 and Draft 2 resolve the same camera in their scene units', () =>
{
  const draft2 = resolveIntroCameraFraming( {
    progress: 0.31,
    transitionReadyProgress: 0.5,
    aspect: 1280 / 800,
    sourceScale: 1,
  } )
  const draft1 = resolveIntroCameraFraming( {
    progress: 0.31,
    transitionReadyProgress: 0.5,
    aspect: 1280 / 800,
    sourceScale: 1 / DRAFT2_SCENE_SCALE,
  } )

  draft2.camera.forEach( ( value, index ) => assertClose( value, draft1.camera[ index ] * DRAFT2_SCENE_SCALE ) )
  draft2.target.forEach( ( value, index ) => assertClose( value, draft1.target[ index ] * DRAFT2_SCENE_SCALE ) )
  assert.equal( draft1.fov, draft2.fov )
  assert.equal( draft2.pointerEnabled, false )
} )

test( 'portrait framing adapts coverage while retaining the centered optical axis', () =>
{
  const framing = resolveIntroCameraFraming( {
    progress: 0,
    transitionReadyProgress: 0.5,
    aspect: 390 / 844,
    sourceScale: 1,
    pointerX: 1,
    pointerY: -1,
    pointerEnabled: false,
  } )

  assert.equal( framing.fov, 44 )
  assert.equal( framing.portraitMix, 1 )
  assert.equal( framing.camera[ 0 ], 0 )
  assert.equal( framing.target[ 0 ], 0 )
  assert.equal( framing.pointerX, 0 )
  assert.equal( framing.pointerY, 0 )
} )

test( 'fine-pointer parallax uses the shared bounded offsets and damping contract', () =>
{
  const centered = resolveIntroCameraFraming( { progress: 0.5, pointerEnabled: false } )
  const moved = resolveIntroCameraFraming( {
    progress: 0.5,
    pointerX: 1,
    pointerY: -1,
    pointerEnabled: true,
  } )

  assert.equal( CAMERA_POINTER_DAMPING, 0.045 )
  assert.equal( moved.pointerEnabled, true )
  assertClose( moved.camera[ 0 ] - centered.camera[ 0 ], 0.12 )
  assertClose( moved.camera[ 1 ] - centered.camera[ 1 ], -0.05 )
  assertClose( moved.target[ 0 ] - centered.target[ 0 ], 0.05 )
  assertClose( moved.target[ 1 ] - centered.target[ 1 ], -0.02 )
} )

test( 'photo-plate framing keeps table depth fixed while the physical balls roll', () =>
{
  const start = resolveIntroCameraFraming( {
    progress: 0,
    transitionReadyProgress: 0.5,
    aspect: 1280 / 800,
    sourceScale: 1 / DRAFT2_SCENE_SCALE,
    pointerX: 1,
    pointerY: -1,
    pointerEnabled: true,
    lockToPlate: true,
  } )
  const impact = resolveIntroCameraFraming( {
    progress: 0.28,
    transitionReadyProgress: 0.5,
    aspect: 1280 / 800,
    sourceScale: 1 / DRAFT2_SCENE_SCALE,
    pointerX: -1,
    pointerY: 1,
    pointerEnabled: true,
    lockToPlate: true,
  } )
  const tracked = resolveIntroCameraFraming( {
    progress: 0.28,
    transitionReadyProgress: 0.5,
    aspect: 1280 / 800,
    sourceScale: 1 / DRAFT2_SCENE_SCALE,
  } )

  assert.deepEqual( impact.camera, start.camera )
  assert.deepEqual( impact.target, start.target )
  assert.equal( start.trackProgress, 0 )
  assert.equal( impact.trackProgress, 0 )
  assert.equal( start.pointerEnabled, false )
  assert.notDeepEqual( tracked.camera, start.camera )
} )
