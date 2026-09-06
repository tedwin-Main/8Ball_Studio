import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import {
  createSlateGeometry,
  createRailAssembly,
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

test( 'actual rail bodies leave six pocket cavities unobstructed', () =>
{
  const group = new THREE.Group()
  const material = new THREE.MeshBasicMaterial( { side: THREE.DoubleSide } )
  const geometries = new Set()
  createRailAssembly( material, group, geometries )
  group.updateMatrixWorld( true )
  assert.equal( group.children.length, 10 )
  for ( const [ x, z ] of POCKET_COORDS )
  {
    for ( let i = 0; i < 16; i += 1 )
    {
      const angle = i * Math.PI / 8
      const ray = new THREE.Raycaster( new THREE.Vector3( x + Math.cos( angle ) * 0.39, 2, z + Math.sin( angle ) * 0.39 ), new THREE.Vector3( 0, -1, 0 ) )
      assert.equal( ray.intersectObject( group, true ).length, 0 )
    }
  }
  geometries.forEach( geometry => geometry.dispose() )
  material.dispose()
} )

test( 'corner castings close rail junction gaps while keeping the pocket throats open', () =>
{
  const group = new THREE.Group()
  const material = new THREE.MeshBasicMaterial( { side: THREE.DoubleSide } )
  const geometries = new Set()
  createRailAssembly( material, group, geometries )
  group.updateMatrixWorld( true )

  assert.deepEqual(
    group.children.slice( 6 ).map( ( child ) => child.name ),
    [
      'corner-casting-corner-tl',
      'corner-casting-corner-tr',
      'corner-casting-corner-bl',
      'corner-casting-corner-br',
    ],
  )

  POCKET_COORDS.filter( ( [ , , name ] ) => name.startsWith( 'corner-' ) ).forEach( ( [ x, z, name ] ) =>
  {
    const seamPoint = new THREE.Vector3( x + Math.sign( x ) * -0.55, 2, z + Math.sign( z ) * 0.30 )
    const seamRay = new THREE.Raycaster( seamPoint, new THREE.Vector3( 0, -1, 0 ) )
    assert.ok( seamRay.intersectObject( group, true ).length > 0, `rail junction ${name} must be covered` )

    const throatRay = new THREE.Raycaster( new THREE.Vector3( x, 2, z ), new THREE.Vector3( 0, -1, 0 ) )
    assert.equal( throatRay.intersectObject( group, true ).length, 0, `pocket ${name} throat must remain open` )
  } )

  geometries.forEach( ( geometry ) => geometry.dispose() )
  material.dispose()
} )
