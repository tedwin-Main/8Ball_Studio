// Dedicated regulation pool table geometry and cue stick for Draft 4 Photoreal Break.
import * as THREE from "three"
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js"
import { DRAFT2_SCENE_SCALE } from "./cameraFraming.js"

export const TABLE_DIMS = Object.freeze( {
  width: 9.6,
  length: 19.2,
  height: 0.45,
  pocketRadius: 0.54,
  // Ball radius matching physical collision radius scaled to scene units (0.035m * 7.559 ~ 0.2646)
  ballRadius: 0.035 * DRAFT2_SCENE_SCALE,
  railWidth: 0.54,
  cushionHeight: 0.20,
} )

export const POCKET_COORDS = Object.freeze( [
  [ -4.45, -9.25, "corner-tl" ],
  [ 4.45, -9.25, "corner-tr" ],
  [ -4.65, 0, "side-l" ],
  [ 4.65, 0, "side-r" ],
  [ -4.45, 9.25, "corner-bl" ],
  [ 4.45, 9.25, "corner-br" ],
] )

// Creates slate/cloth bed with pocket openings cut into all six pocket locations.
// The green felt curves inward around pocket throats, leaving dark cavities open and visible.
export const createSlateGeometry = () =>
{
  const shape = new THREE.Shape()
  const radius = 0.55
  const cornerAngle = Math.asin( 0.35 / radius )
  const sideAngle = Math.acos( 0.15 / radius )
  const cornerInset = Math.sqrt( radius * radius - 0.35 * 0.35 )
  const sideInset = Math.sqrt( radius * radius - 0.15 * 0.15 )
  const arc = ( x, y, start, end ) =>
  {
    for ( let i = 0; i <= 32; i += 1 )
    {
      const angle = start + ( end - start ) * i / 32
      shape.lineTo( x + Math.cos( angle ) * radius, y + Math.sin( angle ) * radius )
    }
  }
  shape.moveTo( -4.45 + cornerInset, 9.6 )
  shape.lineTo( 4.45 - cornerInset, 9.6 )
  arc( 4.45, 9.25, Math.PI - cornerAngle, Math.PI * 1.5 + cornerAngle )
  shape.lineTo( 4.8, sideInset )
  arc( 4.65, 0, sideAngle, Math.PI * 2 - sideAngle )
  shape.lineTo( 4.8, -9.25 + cornerInset )
  arc( 4.45, -9.25, Math.PI / 2 - cornerAngle, Math.PI + cornerAngle )
  shape.lineTo( -4.45 + cornerInset, -9.6 )
  arc( -4.45, -9.25, -cornerAngle, Math.PI / 2 + cornerAngle )
  shape.lineTo( -4.8, -sideInset )
  arc( -4.65, 0, Math.PI + sideAngle, Math.PI * 3 - sideAngle )
  shape.lineTo( -4.8, 9.25 - cornerInset )
  arc( -4.45, 9.25, Math.PI * 1.5 - cornerAngle, Math.PI * 2 + cornerAngle )
  shape.closePath()

  // Triangulate 2D bed polygon and rotate to horizontal XZ plane
  const geometry = new THREE.ShapeGeometry( shape, 24 )
  geometry.rotateX( -Math.PI / 2 )
  const uv = geometry.attributes.uv
  const position = geometry.attributes.position
  for ( let i = 0; i < uv.count; i += 1 ) uv.setXY( i, position.getX( i ) / TABLE_DIMS.width + 0.5, -position.getZ( i ) / TABLE_DIMS.length + 0.5 )
  geometry.computeVertexNormals()
  return geometry
}

// Generates billiard rail cushion geometry with 40-45 degree beveled facings at both ends.
export const createAngledCushionGeometry = ( noseLength, depth = 0.36, height = 0.20, leftAngleDeg = 42, rightAngleDeg = 42 ) =>
{
  const leftTan = Math.tan( ( leftAngleDeg * Math.PI ) / 180 )
  const rightTan = Math.tan( ( rightAngleDeg * Math.PI ) / 180 )

  const shape = new THREE.Shape()
  shape.moveTo( -noseLength / 2, 0 )
  shape.lineTo( noseLength / 2, 0 )
  shape.lineTo( noseLength / 2 + depth * rightTan, depth )
  shape.lineTo( -noseLength / 2 - depth * leftTan, depth )
  shape.lineTo( -noseLength / 2, 0 )
  shape.closePath()

  const geom = new THREE.ExtrudeGeometry( shape, {
    depth: height,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 2,
  } )

  geom.rotateX( -Math.PI / 2 )
  geom.computeVertexNormals()
  return geom
}

// 3D pocket drop cavity with inner leather liner, drop cup, corner castings, and side pocket hardware.
export const createPocketAssembly = ( pocketCoords, materials, group, disposables ) =>
{
  // 3. Drop cavity walls, cup bottoms, and dark leather liners at each pocket opening
  pocketCoords.forEach( ( [ x, z ] ) =>
  {
    // Real 3D cavity cylinder drop down into table showing realistic spatial depth
    const cavityGeom = new THREE.CylinderGeometry(
      TABLE_DIMS.pocketRadius * 0.96,
      TABLE_DIMS.pocketRadius * 0.88,
      2.4,
      32,
      1,
      true,
    )
    const cavityMesh = new THREE.Mesh( cavityGeom, materials.pocketLiner )
    cavityMesh.position.set( x, -1.2, z )
    cavityMesh.receiveShadow = true
    group.add( cavityMesh )
    disposables.add( cavityGeom )

    // Drop cup bottom
    const bottomGeom = new THREE.CircleGeometry( TABLE_DIMS.pocketRadius * 0.88, 32 )
    bottomGeom.rotateX( -Math.PI / 2 )
    const bottomMesh = new THREE.Mesh( bottomGeom, materials.pocketLiner )
    bottomMesh.position.set( x, -2.4, z )
    bottomMesh.receiveShadow = true
    group.add( bottomMesh )
    disposables.add( bottomGeom )

    // Dark leather/rubber pocket liner around throat aperture
    const linerGeom = new THREE.TorusGeometry( TABLE_DIMS.pocketRadius * 0.92, 0.075, 16, 48 )
    linerGeom.rotateX( Math.PI / 2 )
    const linerMesh = new THREE.Mesh( linerGeom, materials.pocketLiner )
    linerMesh.position.set( x, 0.015, z )
    linerMesh.castShadow = true
    group.add( linerMesh )
    disposables.add( linerGeom )

    // Beveled metallic collar bracket around pocket aperture
    const collarGeom = new THREE.TorusGeometry( TABLE_DIMS.pocketRadius * 0.96, 0.045, 16, 48 )
    collarGeom.rotateX( Math.PI / 2 )
    const collarMesh = new THREE.Mesh( collarGeom, materials.metalCastings )
    collarMesh.position.set( x, 0.02, z )
    collarMesh.castShadow = true
    collarMesh.receiveShadow = true
    group.add( collarMesh )
    disposables.add( collarGeom )
  } )
}

// 18 inlaid pearloid/brass diamond rail sights seated flush on rail top surfaces.
export const createRailSights = ( materials, group, disposables ) =>
{
  const sightGeom = new THREE.CylinderGeometry( 0.045, 0.045, 0.015, 12 )
  disposables.add( sightGeom )

  // Head and foot rails (3 sights each)
  ;[ -9.87, 9.87 ].forEach( ( z ) =>
  {
    ;[ -2.65, 0, 2.65 ].forEach( ( x ) =>
    {
      const sight = new THREE.Mesh( sightGeom, materials.sights )
      sight.position.set( x, 0.49, z )
      group.add( sight )
    } )
  } )

  // Long side rails (2 sights per side rail segment, 4 on each side)
  ;[ -4.91, 4.91 ].forEach( ( x ) =>
  {
    ;[ -7.35, -3.68, 3.68, 7.35 ].forEach( ( z ) =>
    {
      const sight = new THREE.Mesh( sightGeom, materials.sights )
      sight.position.set( x, 0.49, z )
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

// A recessed apron follows the bed notches; six circular throats continue through it.
export const createApronGeometry = () =>
{
  const shape = new THREE.Shape()
  shape.moveTo( -5.35, -10.25 )
  shape.lineTo( 5.35, -10.25 )
  shape.lineTo( 5.35, 10.25 )
  shape.lineTo( -5.35, 10.25 )
  shape.closePath()
  POCKET_COORDS.forEach( ( [ x, z ] ) =>
  {
    const hole = new THREE.Path()
    hole.absarc( x, -z, TABLE_DIMS.pocketRadius * 1.08, 0, Math.PI * 2, true )
    shape.holes.push( hole )
  } )
  const geometry = new THREE.ExtrudeGeometry( shape, { depth: 0.72, bevelEnabled: false, curveSegments: 24 } )
  geometry.rotateX( -Math.PI / 2 )
  geometry.translate( 0, -0.36, 0 )
  return geometry
}

// Project the top grain along each rail's long axis, without allocating more maps.
export const orientRailGrain = ( geometry ) =>
{
  geometry.computeBoundingBox()
  const size = geometry.boundingBox.getSize( new THREE.Vector3() )
  const position = geometry.attributes.position
  const uv = geometry.attributes.uv
  const alongX = size.x > size.z
  for ( let i = 0; i < uv.count; i += 1 )
  {
    const along = alongX ? position.getX( i ) : position.getZ( i )
    const across = alongX ? position.getZ( i ) : position.getX( i )
    uv.setXY( i, across / 0.6 + 0.5, along / 5 + 0.5 )
  }
  return geometry
}

const createCornerCastingGeometry = ( x, z ) =>
{
  const innerRadius = TABLE_DIMS.pocketRadius * 1.15
  const outerRadius = TABLE_DIMS.pocketRadius * 1.45
  const shape = new THREE.Shape()
  shape.absarc( 0, 0, outerRadius, 0, Math.PI * 2, false )
  const hole = new THREE.Path()
  hole.absarc( 0, 0, innerRadius, 0, Math.PI * 2, true )
  shape.holes.push( hole )

  const geometry = new THREE.ExtrudeGeometry( shape, {
    depth: 0.48,
    bevelEnabled: true,
    bevelThickness: 0.025,
    bevelSize: 0.035,
    bevelSegments: 2,
    curveSegments: 32,
  } )
  geometry.rotateX( -Math.PI / 2 )
  geometry.translate( x, 0, z )
  return geometry
}

// Six bevelled rail bodies plus four corner castings close the rail returns without covering the open throats.
export const createRailAssembly = ( material, group, disposables = new Set(), castingMaterial = material ) =>
{
  const segments = [
    ...[ -9.87, 9.87 ].map( z => ( { size: [ 7.64, 0.48, 0.54 ], position: [ 0, 0.24, z ] } ) ),
    ...[ -4.91, 4.91 ].flatMap( x => [ -4.93, 4.93 ].map( z => ( { size: [ 0.54, 0.48, 8.06 ], position: [ x, 0.24, z ] } ) ) ),
  ]
  segments.forEach( ( { size, position } ) =>
  {
    const geometry = orientRailGrain( new RoundedBoxGeometry( ...size, 3, 0.08 ) )
    disposables.add( geometry )
    const rail = new THREE.Mesh( geometry, material )
    rail.position.set( ...position )
    rail.castShadow = rail.receiveShadow = true
    group.add( rail )
  } )

  POCKET_COORDS.filter( ( [ , , name ] ) => name.startsWith( "corner-" ) ).forEach( ( [ x, z, name ] ) =>
  {
    const geometry = createCornerCastingGeometry( x, z )
    disposables.add( geometry )
    const casting = new THREE.Mesh( geometry, castingMaterial )
    casting.name = `corner-casting-${name}`
    casting.castShadow = true
    casting.receiveShadow = true
    group.add( casting )
  } )
}
