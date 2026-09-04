// Dedicated regulation pool table geometry and cue stick for Draft 5 Photoreal Break.
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
// The green felt does not run flat through the pocket throat.
export const createSlateGeometry = () =>
{
  const shape = new THREE.Shape()
  // Boundary coordinates matching cushion-felt interface in XY shape coordinates (y becomes -z in world)
  const xHeadCorner = 4.14
  const yHead = 9.60
  const xRail = 4.80
  const yCornerSide = 9.00
  const ySidePocket = 0.32
  const cornerArcRadius = 0.54
  const sideArcRadius = 0.48

  // 1. Head rail edge (from Top-Left to Top-Right)
  shape.moveTo( -xHeadCorner, yHead )
  shape.lineTo( xHeadCorner, yHead )

  // 2. Top-Right corner pocket cutout
  shape.absarc( 4.45, 9.25, cornerArcRadius, Math.PI / 2, 0, true )
  shape.lineTo( xRail, yCornerSide )

  // 3. Right head-side edge
  shape.lineTo( xRail, ySidePocket )

  // 4. Right side pocket cutout
  shape.absarc( 4.65, 0, sideArcRadius, Math.PI / 2, -Math.PI / 2, true )
  shape.lineTo( xRail, -ySidePocket )

  // 5. Right foot-side edge
  shape.lineTo( xRail, -yCornerSide )

  // 6. Bottom-Right corner pocket cutout
  shape.absarc( 4.45, -9.25, cornerArcRadius, 0, -Math.PI / 2, true )
  shape.lineTo( xHeadCorner, -yHead )

  // 7. Foot rail edge (from Bottom-Right to Bottom-Left)
  shape.lineTo( -xHeadCorner, -yHead )

  // 8. Bottom-Left corner pocket cutout
  shape.absarc( -4.45, -9.25, cornerArcRadius, -Math.PI / 2, -Math.PI, true )
  shape.lineTo( -xRail, -yCornerSide )

  // 9. Left foot-side edge
  shape.lineTo( -xRail, -ySidePocket )

  // 10. Left side pocket cutout
  shape.absarc( -4.65, 0, sideArcRadius, -Math.PI / 2, Math.PI / 2, true )
  shape.lineTo( -xRail, ySidePocket )

  // 11. Left head-side edge
  shape.lineTo( -xRail, yCornerSide )

  // 12. Top-Left corner pocket cutout
  shape.absarc( -4.45, 9.25, cornerArcRadius, Math.PI, Math.PI / 2, true )
  shape.lineTo( -xHeadCorner, yHead )
  shape.closePath()

  const geometry = new THREE.ShapeGeometry( shape, 24 )
  geometry.rotateX( -Math.PI / 2 )
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
  // 1. Corner pocket castings seated flush with rail ends at table corners
  ;[ [ -4.91, -9.71 ], [ 4.91, -9.71 ], [ -4.91, 9.71 ], [ 4.91, 9.71 ] ].forEach( ( [ cx, cz ] ) =>
  {
    const cornerGeom = new RoundedBoxGeometry( 0.86, 0.48, 0.86, 3, 0.08 )
    disposables.add( cornerGeom )
    const cornerMesh = new THREE.Mesh( cornerGeom, materials.metalCastings )
    cornerMesh.position.set( cx, 0.24, cz )
    cornerMesh.castShadow = true
    cornerMesh.receiveShadow = true
    group.add( cornerMesh )
  } )

  // 2. Side pocket matching rail hardware bridging head-side and foot-side rails
  ;[ -4.91, 4.91 ].forEach( ( sx ) =>
  {
    const sideGeom = new RoundedBoxGeometry( 0.54, 0.48, 1.16, 3, 0.08 )
    disposables.add( sideGeom )
    const sideMesh = new THREE.Mesh( sideGeom, materials.metalCastings )
    sideMesh.position.set( sx, 0.24, 0 )
    sideMesh.castShadow = true
    sideMesh.receiveShadow = true
    group.add( sideMesh )
  } )

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
  sightGeom.rotateX( -Math.PI / 2 )
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
