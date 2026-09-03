// Dedicated regulation pool table geometry and cue stick for Draft 5 Photoreal Break.
import * as THREE from "three"
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js"

export const TABLE_DIMS = Object.freeze( {
  width: 9.8,
  length: 19.6,
  height: 0.45,
  pocketRadius: 0.54,
  ballRadius: 0.38,
  railWidth: 0.46,
  cushionHeight: 0.22,
} )

export const POCKET_COORDS = Object.freeze( [
  [ -TABLE_DIMS.width / 2 + 0.16, -TABLE_DIMS.length / 2 + 0.16, "corner-tl" ],
  [ TABLE_DIMS.width / 2 - 0.16, -TABLE_DIMS.length / 2 + 0.16, "corner-tr" ],
  [ -TABLE_DIMS.width / 2 + 0.04, 0, "side-l" ],
  [ TABLE_DIMS.width / 2 - 0.04, 0, "side-r" ],
  [ -TABLE_DIMS.width / 2 + 0.16, TABLE_DIMS.length / 2 - 0.16, "corner-bl" ],
  [ TABLE_DIMS.width / 2 - 0.16, TABLE_DIMS.length / 2 - 0.16, "corner-br" ],
] )

// Creates slate bed with 6 real 3D pocket cutouts.
export const createSlateGeometry = () =>
{
  const shape = new THREE.Shape()
  const hw = TABLE_DIMS.width / 2
  const hl = TABLE_DIMS.length / 2

  shape.moveTo( -hw, -hl )
  shape.lineTo( hw, -hl )
  shape.lineTo( hw, hl )
  shape.lineTo( -hw, hl )
  shape.closePath()

  POCKET_COORDS.forEach( ( [ x, z ] ) =>
  {
    const hole = new THREE.Path()
    hole.absarc( x, z, TABLE_DIMS.pocketRadius, 0, Math.PI * 2, true )
    shape.holes.push( hole )
  } )

  const geometry = new THREE.ShapeGeometry( shape, 32 )
  geometry.rotateX( -Math.PI / 2 )
  return geometry
}

// Triangular chamfered cushion profile (K-66 nose)
export const createCushionGeometry = ( length, width = 0.26, height = 0.18 ) =>
{
  const shape = new THREE.Shape()
  shape.moveTo( 0, 0 )
  shape.lineTo( width, 0 )
  shape.lineTo( width * 0.45, height )
  shape.lineTo( 0, height * 0.75 )
  shape.closePath()

  const extrudeSettings = {
    steps: 1,
    depth: length,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 3,
  }

  const geometry = new THREE.ExtrudeGeometry( shape, extrudeSettings )
  return geometry
}

// 3D pocket drop cavity with inner leather liner and drop cup.
export const createPocketAssembly = ( pocketCoords, materials, group, disposables ) =>
{
  pocketCoords.forEach( ( [ x, z, type ] ) =>
  {
    // Real 3D cavity cylinder drop down into table
    const cavityGeom = new THREE.CylinderGeometry(
      TABLE_DIMS.pocketRadius * 0.98,
      TABLE_DIMS.pocketRadius * 0.75,
      0.65,
      24,
      1,
      true,
    )
    const cavityMesh = new THREE.Mesh( cavityGeom, materials.pocketLiner )
    cavityMesh.position.set( x, -0.22, z )
    group.add( cavityMesh )
    disposables.add( cavityGeom )

    // Drop cup bottom
    const bottomGeom = new THREE.CircleGeometry( TABLE_DIMS.pocketRadius * 0.75, 24 )
    bottomGeom.rotateX( -Math.PI / 2 )
    const bottomMesh = new THREE.Mesh( bottomGeom, materials.pocketLiner )
    bottomMesh.position.set( x, -0.54, z )
    group.add( bottomMesh )
    disposables.add( bottomGeom )

    // Metallic pocket casting rim
    const isCorner = type.startsWith( "corner" )
    const rimGeom = isCorner
      ? new RoundedBoxGeometry( 1.15, 0.14, 1.15, 3, 0.06 )
      : new RoundedBoxGeometry( 0.42, 0.14, 1.05, 3, 0.04 )
    const rimMesh = new THREE.Mesh( rimGeom, materials.metalCastings )
    rimMesh.position.set( x * ( isCorner ? 1.02 : 1.03 ), 0.28, z * ( isCorner ? 1.01 : 1 ) )
    rimMesh.castShadow = true
    group.add( rimMesh )
    disposables.add( rimGeom )
  } )
}

// 18 inlaid pearloid/brass diamond rail sights.
export const createRailSights = ( materials, group, disposables ) =>
{
  const sightGeom = new THREE.CylinderGeometry( 0.045, 0.045, 0.015, 12 )
  sightGeom.rotateX( -Math.PI / 2 )
  disposables.add( sightGeom )

  // Head and foot rails (3 sights each)
  ;[ -TABLE_DIMS.length / 2, TABLE_DIMS.length / 2 ].forEach( ( z ) =>
  {
    ;[ -2.2, 0, 2.2 ].forEach( ( x ) =>
    {
      const sight = new THREE.Mesh( sightGeom, materials.sights )
      sight.position.set( x, 0.26, z > 0 ? z + 0.12 : z - 0.12 )
      group.add( sight )
    } )
  } )

  // Long side rails (6 sights on left, 6 sights on right)
  ;[ -TABLE_DIMS.width / 2 - 0.12, TABLE_DIMS.width / 2 + 0.12 ].forEach( ( x ) =>
  {
    ;[ -7.2, -4.8, -2.4, 2.4, 4.8, 7.2 ].forEach( ( z ) =>
    {
      const sight = new THREE.Mesh( sightGeom, materials.sights )
      sight.position.set( x, 0.26, z )
      group.add( sight )
    } )
  } )
}

// Two-piece tournament cue stick with maple shaft, irish linen wrap, ferrule, and chalked tip.
export const createCueStick = ( materials, disposables ) =>
{
  const cueGroup = new THREE.Group()

  // Maple shaft
  const shaftGeom = new THREE.CylinderGeometry( 0.048, 0.075, 9.5, 20 )
  shaftGeom.rotateX( Math.PI / 2 )
  const shaft = new THREE.Mesh( shaftGeom, materials.cueWood )
  shaft.position.set( 0, 0, 4.75 )
  shaft.castShadow = true
  cueGroup.add( shaft )
  disposables.add( shaftGeom )

  // Irish linen textured grip wrap
  const wrapGeom = new THREE.CylinderGeometry( 0.075, 0.092, 4.2, 20 )
  wrapGeom.rotateX( Math.PI / 2 )
  const wrap = new THREE.Mesh( wrapGeom, materials.cueWrap )
  wrap.position.set( 0, 0, 11.6 )
  wrap.castShadow = true
  cueGroup.add( wrap )
  disposables.add( wrapGeom )

  // White phenolic ferrule
  const ferruleGeom = new THREE.CylinderGeometry( 0.048, 0.048, 0.18, 16 )
  ferruleGeom.rotateX( Math.PI / 2 )
  const ferrule = new THREE.Mesh( ferruleGeom, materials.cueFerrule )
  ferrule.position.set( 0, 0, -0.09 )
  ferrule.castShadow = true
  cueGroup.add( ferrule )
  disposables.add( ferruleGeom )

  // Master blue chalked leather tip
  const tipGeom = new THREE.CylinderGeometry( 0.048, 0.048, 0.07, 16 )
  tipGeom.rotateX( Math.PI / 2 )
  const tip = new THREE.Mesh( tipGeom, materials.cueTip )
  tip.position.set( 0, 0, -0.215 )
  tip.castShadow = true
  cueGroup.add( tip )
  disposables.add( tipGeom )

  return cueGroup
}
