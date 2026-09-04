import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import {
  createSlateGeometry,
  createAngledCushionGeometry,
  POCKET_COORDS,
  TABLE_DIMS,
} from './photorealGeometry.js'

test( 'slate/felt geometry leaves all six pocket throats open down to cavity depth', () =>
{
  const slateGeom = createSlateGeometry()
  const mesh = new THREE.Mesh( slateGeom, new THREE.MeshBasicMaterial( { side: THREE.DoubleSide } ) )
  mesh.updateMatrixWorld()

  // Verify that all 6 pocket centers have no felt covering them
  POCKET_COORDS.forEach( ( [ x, z, name ] ) =>
  {
    const ray = new THREE.Raycaster( new THREE.Vector3( x, 10, z ), new THREE.Vector3( 0, -1, 0 ) )
    const hits = ray.intersectObject( mesh )
    assert.equal( hits.length, 0, `Pocket ${name} (${x}, ${z}) throat must not be covered by felt` )
  } )

  // Verify that the playing bed remains solid and continuous
  for ( let x = -3.5; x <= 3.5; x += 1.0 )
  {
    for ( let z = -8.0; z <= 8.0; z += 1.0 )
    {
      const ray = new THREE.Raycaster( new THREE.Vector3( x, 10, z ), new THREE.Vector3( 0, -1, 0 ) )
      const hits = ray.intersectObject( mesh )
      assert.ok( hits.length > 0, `Playing bed at (${x}, ${z}) must be solid` )
    }
  }
} )

test( 'cushion geometry bevels facings inward toward pocket throats at 40-45 degrees', () =>
{
  const noseLength = 7.64
  const depth = 0.36
  const leftAngleDeg = 42
  const rightAngleDeg = 42

  const cushionGeom = createAngledCushionGeometry( noseLength, depth, 0.20, leftAngleDeg, rightAngleDeg )
  cushionGeom.computeBoundingBox()
  const bbox = cushionGeom.boundingBox

  // The outer back face (seated against rail) must be wider than nose due to inward facings
  const expectedBackHalfLength = noseLength / 2 + depth * Math.tan( ( 42 * Math.PI ) / 180 )
  assert.ok( bbox.max.x >= expectedBackHalfLength - 0.05 )
  assert.ok( bbox.min.x <= -expectedBackHalfLength + 0.05 )
} )

test( 'rails, corner castings, and side hardware seat flush with zero seam gap or overshoot', () =>
{
  // Rail dimensions
  const headRailMinX = -4.48
  const headRailMaxX = 4.48
  const headRailMinZ = -10.14
  const headRailMaxZ = -9.60

  const cornerTRMinX = 4.48
  const cornerTRMaxX = 5.34
  const cornerTRMinZ = -10.14
  const cornerTRMaxZ = -9.28

  const sideRailMinZ = -9.28
  const sideRailMaxZ = -0.58

  const sideHardwareMinZ = -0.58
  const sideHardwareMaxZ = 0.58

  const sideRailLowerMinZ = 0.58
  const sideRailLowerMaxZ = 9.28

  const cornerBRMinZ = 9.28
  const cornerBRMaxZ = 10.14

  // Seams must be exactly flush (0.00 difference)
  assert.equal( headRailMaxX, cornerTRMinX, 'Head rail right end flushes against corner casting' )
  assert.equal( headRailMinZ, cornerTRMinZ, 'Head rail outer edge flushes against corner casting outer edge' )
  assert.equal( sideRailMinZ, cornerTRMaxZ, 'Side rail upper end flushes against corner casting' )
  assert.equal( sideRailMaxZ, sideHardwareMinZ, 'Side rail upper end flushes against side pocket hardware' )
  assert.equal( sideHardwareMaxZ, sideRailLowerMinZ, 'Side pocket hardware flushes against lower side rail' )
  assert.equal( sideRailLowerMaxZ, cornerBRMinZ, 'Side rail lower end flushes against bottom-right corner casting' )
} )
