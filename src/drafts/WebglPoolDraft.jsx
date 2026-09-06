import { createPoolFeltMaterial, createPhenolicBallMaterial } from './photorealMaterials.js'
import { createApronGeometry, createSlateGeometry, createRailAssembly } from './photorealGeometry.js'
import { useLayoutEffect, useRef } from 'react'
import * as THREE from 'three'
import { DecalGeometry } from 'three/addons/geometries/DecalGeometry.js'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js'
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js'
import brandLogo from '../assets/8BALL-V4.jpg'

// Initialize RectAreaLight uniforms for WebGLRenderer
RectAreaLightUniformsLib.init()
import { STORY_TIMING } from '../storyTiming'
import {
  getBreakSimulation,
  sampleDraft2BreakState,
} from './poolBreakPhysics'
import {
  createPointerParallax,
  DRAFT2_SCENE_SCALE,
  resolveIntroCameraFraming,
} from './cameraFraming'
import {
  isFramingDiagnosticsEnabled,
  publishFramingDiagnostics,
} from './framingDiagnostics'
import { createDemandFrameScheduler } from './demandFrameScheduler'
import { TABLE_PALETTE } from './tablePalette'
import { POOL_QUALITY_TIERS as DRAFT2_QUALITY_TIERS, getPoolQualitySignals as getDraft2QualitySignals, selectPoolQualityTier as selectDraft2QualityTier, createQualityMonitor } from './renderQuality.js'
import { createFeltTextures, createBallSurfaceTextures, createWoodTextures, createPocketLeatherTextures, createStudioEnvironment } from './poolSurfaceTextures.js'

const clamp = ( value, min = 0, max = 1 ) => Math.min( max, Math.max( min, value ) )
const lerp = ( start, end, progress ) => start + ( end - start ) * progress

const BALL_COLORS = [
  '#f5b818', '#1b46a2', '#cb242a', '#59287a', '#e76317',
  '#126d40', '#7a1d33', '#0a0c0a', '#f5b818', '#1b46a2',
  '#cb242a', '#59287a', '#e76317', '#126d40', '#7a1d33',
]

const RACK_BALL_NUMBERS = [
  1,
  5, 11,
  3, 8, 10,
  4, 13, 14, 2,
  9, 12, 15, 6, 7,
]

// Dimensions aligned with standard 9-foot tournament table proportions scaled for WebGL scene
const TABLE_WIDTH = 9.6
const TABLE_LENGTH = 19.2
const PHYSICS_SCALE = DRAFT2_SCENE_SCALE // Scale factor between SI-unit physics (2.54m) and WebGL table (19.2)
const BALL_RADIUS = 0.035 * PHYSICS_SCALE // Scale ball radius proportionally (approx 0.2646)
const POCKET_RADIUS = 0.54
const ROOM_FLOOR_Z = -4

const POCKET_POSITIONS = [
  [ -4.45, -9.25 ], [ 4.45, -9.25 ],
  [ -4.65, 0 ], [ 4.65, 0 ],
  [ -4.45, 9.25 ], [ 4.45, 9.25 ],
]

/**
 * Creates tier-sized procedural textures for tournament pool balls with ivory base and stripe belts.
 */
const createPoolBallTexture = ( color, number, width, height, anisotropy = 16 ) =>
{
  const canvas = document.createElement( 'canvas' )
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext( '2d' )
  const isStripe = number > 8
  // The original artwork was authored at 2048x1024. Scaling every mark together
  // keeps number-disk proportions and stripe boundaries identical across tiers.
  const scale = width / 2048

  // Rich ivory background for stripe balls; solid tournament color for solid balls
  context.fillStyle = isStripe ? '#f5f1e4' : color
  context.fillRect( 0, 0, canvas.width, canvas.height )
  if ( isStripe )
  {
    context.fillStyle = color
    context.fillRect( 0, 318 * scale, canvas.width, 388 * scale )
  }

  // Dual opposing number disks stay legible through print contrast and physical lighting, without a painted contour.
  ;[ 512 * scale, 1536 * scale ].forEach( ( centerX ) =>
  {
    context.fillStyle = '#f7f4ec'
    context.beginPath()
    context.arc( centerX, 512 * scale, 136 * scale, 0, Math.PI * 2 )
    context.fill()
    context.fillStyle = '#0a0d0b'
    context.font = "800 " + 148 * scale + "px Arial, sans-serif"
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText( String( number ), centerX, 520 * scale )

    if ( number === 6 || number === 9 )
    {
      context.fillRect( centerX - 42 * scale, 584 * scale, 84 * scale, 10 * scale )
    }
  } )

  const texture = new THREE.CanvasTexture( canvas )
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = anisotropy
  // Mipmaps and anisotropy keep the smaller tier textures stable as balls roll away.
  texture.generateMipmaps = true
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  return texture
}

/**
 * Soft radial Gaussian gradient for ball contact shadows and ambient occlusion.
 */
const createContactShadowTexture = ( anisotropy = 1 ) =>
{
  const canvas = document.createElement( 'canvas' )
  canvas.width = 128
  canvas.height = 128
  const context = canvas.getContext( '2d' )
  const gradient = context.createRadialGradient( 64, 64, 0, 64, 64, 64 )
  gradient.addColorStop( 0, 'rgba(0, 0, 0, 0.95)' )
  gradient.addColorStop( 0.28, 'rgba(0, 0, 0, 0.8)' )
  gradient.addColorStop( 0.62, 'rgba(0, 0, 0, 0.25)' )
  gradient.addColorStop( 1, 'rgba(0, 0, 0, 0)' )
  context.fillStyle = gradient
  context.fillRect( 0, 0, 128, 128 )
  const texture = new THREE.CanvasTexture( canvas )
  texture.anisotropy = anisotropy
  texture.generateMipmaps = true
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  return texture
}

const createLogoTexture = ( anisotropy, requestRender ) =>
{
  const canvas = document.createElement( 'canvas' )
  canvas.width = 512
  canvas.height = 512
  const context = canvas.getContext( '2d' )
  const image = new Image()
  const texture = new THREE.CanvasTexture( canvas )
  let disposed = false
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = anisotropy

  const paint = () =>
  {
    if ( disposed ) return
    context.clearRect( 0, 0, canvas.width, canvas.height )
    context.save()
    context.beginPath()
    context.arc( 256, 256, 230, 0, Math.PI * 2 )
    context.clip()
    context.drawImage( image, 24, 24, 464, 464 )
    context.restore()
    texture.needsUpdate = true
    requestRender?.()
  }

  const handleLoad = () =>
  {
    image.removeEventListener( 'load', handleLoad )
    paint()
  }
  image.addEventListener( 'load', handleLoad )
  image.src = brandLogo
  if ( image.complete ) paint()
  return {
    texture,
    dispose ()
    {
      disposed = true
      image.removeEventListener( 'load', handleLoad )
      image.src = ''
    },
  }
}

// Polished resin shares the same finish as Draft 4.
const createBallMaterial = ( color, texture, surfaceTextures ) =>
  createPhenolicBallMaterial( color, texture, null, surfaceTextures )

const addRoundedBox = ( parent, size, position, material, radius = 0.08 ) =>
{
  const mesh = new THREE.Mesh(
    new RoundedBoxGeometry( ...size, 5, radius ),
    material,
  )
  mesh.position.set( ...position )
  mesh.castShadow = true
  mesh.receiveShadow = true
  parent.add( mesh )
  return mesh
}

// Cut pocket openings into the cloth/slate bed at all six pocket locations.
// The green felt curves inward around pocket throats, leaving dark cavities open and visible.
const createFeltGeometry = createSlateGeometry

// Generates billiard rail cushion geometry with 40-45 degree beveled facings at both ends.
const createAngledCushionGeometry = ( noseLength, depth = 0.36, height = 0.20, leftAngleDeg = 42, rightAngleDeg = 42 ) =>
{
  const leftTan = Math.tan( ( leftAngleDeg * Math.PI ) / 180 )
  const rightTan = Math.tan( ( rightAngleDeg * Math.PI ) / 180 )

  const shape = new THREE.Shape()
  // Nose runs along X from -noseLength/2 to +noseLength/2 at Y=0
  shape.moveTo( -noseLength / 2, 0 )
  shape.lineTo( noseLength / 2, 0 )
  // Right facing angled inward toward pocket throat
  shape.lineTo( noseLength / 2 + depth * rightTan, depth )
  // Outer back face seated against the wooden rail
  shape.lineTo( -noseLength / 2 - depth * leftTan, depth )
  // Left facing angled inward toward pocket throat
  shape.lineTo( -noseLength / 2, 0 )
  shape.closePath()

  const geom = new THREE.ExtrudeGeometry( shape, {
    depth: height,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 2,
  } )

  // Rotate so extrusion depth aligns with vertical Y axis, and depth aligns with Z
  geom.rotateX( -Math.PI / 2 )
  geom.computeVertexNormals()
  return geom
}

// Keep the room floor open beneath each pocket so the deep cavity is not capped by the studio floor.
const createRoomFloorGeometry = () =>
{
  const shape = new THREE.Shape()
  shape.moveTo( -22, -27 )
  shape.lineTo( 22, -27 )
  shape.lineTo( 22, 27 )
  shape.lineTo( -22, 27 )
  shape.closePath()

  POCKET_POSITIONS.forEach( ( [ x, z ] ) =>
  {
    const hole = new THREE.Path()
    // Convert pocket world Z into the floor's local XY coordinates before its mesh rotation/offset.
    hole.absarc( x, -( z - ROOM_FLOOR_Z ), POCKET_RADIUS * 1.25, 0, Math.PI * 2, false )
    shape.holes.push( hole )
  } )

  // Return the shape in its native XY plane; the floor mesh applies the world-space rotation once.
  return new THREE.ShapeGeometry( shape, 32 )
}

const buildScene = ( canvas, simulation, onTextureReady, onQualityState ) =>
{
  const scene = new THREE.Scene()
  scene.background = new THREE.Color( '#040605' )
  // Keep the room atmospheric without extinguishing the far rail behind the rack.
  scene.fog = new THREE.FogExp2( '#090d0b', 0.009 )

  const initialFraming = resolveIntroCameraFraming( {
    progress: 0,
    aspect: 1,
    sourceScale: 1,
  } )
  const camera = new THREE.PerspectiveCamera( initialFraming.fov, 1, 0.1, 100 )
  camera.position.set( ...initialFraming.camera )
  camera.lookAt( ...initialFraming.target )

  const renderer = new THREE.WebGLRenderer( {
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  } )
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  // Keep midtones rich enough for cloth and wood grain to survive the studio highlights.
  renderer.toneMappingExposure = 1.05
  renderer.shadowMap.enabled = true
  // PCFShadowMap keeps the tuned contact-shadow bias while avoiding the deprecated soft-shadow path.
  renderer.shadowMap.type = THREE.PCFShadowMap

  const maxAnisotropy = Math.min( 16, renderer.capabilities.getMaxAnisotropy() )
  const initialWidth = canvas.clientWidth || window.innerWidth
  const initialHeight = canvas.clientHeight || window.innerHeight
  const initialQualitySignals = getDraft2QualitySignals( initialWidth, initialHeight )
  const initialQualityTier = selectDraft2QualityTier( initialQualitySignals )
  // Every generated canvas texture is tracked independently because material.dispose()
  // releases shader state but does not release the texture allocation.
  const disposableTextures = new Set()
  const ownTextures = ( ...textures ) => textures.forEach( ( texture ) => disposableTextures.add( texture ) )
  const environmentTarget = createStudioEnvironment( renderer )
  scene.environment = environmentTarget.texture
  // Reflections stay present, while direct lights carry the table's form and color.
  scene.environmentIntensity = 0.68

  const table = new THREE.Group()
  scene.add( table )

  const roomMaterial = new THREE.MeshStandardMaterial( {
    color: '#101411',
    roughness: 0.94,
    metalness: 0,
  } )
  const floorMaterial = new THREE.MeshStandardMaterial( {
    color: '#141310',
    roughness: 0.92,
    metalness: 0,
  } )
  const floor = new THREE.Mesh( createRoomFloorGeometry(), floorMaterial )
  floor.rotation.x = -Math.PI / 2
  floor.position.set( 0, -1.18, ROOM_FLOOR_Z )
  floor.receiveShadow = true
  scene.add( floor )

  const backWall = new THREE.Mesh( new THREE.PlaneGeometry( 40, 16 ), roomMaterial )
  backWall.position.set( 0, 5, -16 )
  backWall.receiveShadow = true
  scene.add( backWall )

  const battenMaterial = new THREE.MeshStandardMaterial( {
    color: '#22261e',
    roughness: 0.72,
  } )
  ;[ -10, -6, -2, 2, 6, 10 ].forEach( ( x ) =>
  {
    addRoundedBox( scene, [ 0.08, 9, 0.12 ], [ x, 4, -15.92 ], battenMaterial, 0.025 )
  } )

  // Slice 1: Simonis 860 worsted wool cloth with grazing sheen and micro-weave normal map.
  // The table is 2:1, so square cloth threads need twice as many repeats along Z.
  const feltTextures = createFeltTextures( maxAnisotropy, 72, 144 )
  ownTextures( ...Object.values( feltTextures ) )
  const feltMaterial = createPoolFeltMaterial( feltTextures )
  const felt = new THREE.Mesh( createFeltGeometry(), feltMaterial )
  felt.receiveShadow = true
  table.add( felt )

  // Regulation tournament cloth markings
  const spotGeometry = new THREE.CircleGeometry( 0.085, 32 )
  spotGeometry.rotateX( -Math.PI / 2 )
  const spotMaterial = new THREE.MeshBasicMaterial( {
    color: '#080a09',
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  } )
  // Foot spot where the 1-ball / rack apex is spotted
  const footSpot = new THREE.Mesh( spotGeometry, spotMaterial )
  footSpot.position.set( 0, 0.002, -0.9 * PHYSICS_SCALE )
  table.add( footSpot )

  // Chalk-drawn tournament head string line across the breaking kitchen
  const headStringGeo = new THREE.PlaneGeometry( 7.6, 0.016 )
  headStringGeo.rotateX( -Math.PI / 2 )
  const headStringMat = new THREE.MeshBasicMaterial( {
    color: '#1a6344',
    transparent: true,
    opacity: 0.42,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  } )
  const headString = new THREE.Mesh( headStringGeo, headStringMat )
  headString.position.set( 0, 0.002, 0.5 * PHYSICS_SCALE )
  table.add( headString )

  // Head spot where striker sits for break
  const headSpot = new THREE.Mesh( new THREE.CircleGeometry( 0.045, 24 ).rotateX( -Math.PI / 2 ), spotMaterial )
  headSpot.position.set( 0, 0.002, 0.5 * PHYSICS_SCALE )
  table.add( headSpot )

  // Slice 2: Ebonized wood rails with a separate dense-cloth cushion surface.
  const woodTextures = createWoodTextures( maxAnisotropy, onTextureReady )
  ownTextures( ...Object.values( woodTextures ) )
  const pianoBlackRailMaterial = new THREE.MeshPhysicalMaterial( {
    map: woodTextures.map,
    normalMap: woodTextures.normalMap,
    normalScale: new THREE.Vector2( 0.16, 0.16 ),
    roughnessMap: woodTextures.roughnessMap,
    color: TABLE_PALETTE.rail,
    roughness: 0.65,
    metalness: 0.0,
    clearcoat: 0.42,
    clearcoatRoughness: 0.24,
    ior: 1.52,
    reflectivity: 0.64,
    envMapIntensity: 0.4,
  } )
  const apronMaterial = new THREE.MeshPhysicalMaterial( {
    map: woodTextures.map,
    normalMap: woodTextures.normalMap,
    normalScale: new THREE.Vector2( 0.035, 0.035 ),
    roughnessMap: woodTextures.roughnessMap,
    color: TABLE_PALETTE.apron,
    roughness: 0.72,
    metalness: 0.0,
    clearcoat: 0.42,
    clearcoatRoughness: 0.2,
    envMapIntensity: 0.34,
  } )
  const cushionTextures = createFeltTextures( maxAnisotropy, 16, 16 )
  ownTextures( ...Object.values( cushionTextures ) )
  const cushionMaterial = new THREE.MeshPhysicalMaterial( {
    map: cushionTextures.map,
    normalMap: cushionTextures.normalMap,
    normalScale: new THREE.Vector2( 0.075, 0.075 ),
    roughnessMap: cushionTextures.roughnessMap,
    roughness: 1.0,
    metalness: 0.0,
    sheen: 0.24,
    sheenRoughness: 0.86,
    sheenColor: new THREE.Color( TABLE_PALETTE.feltSheen ),
    color: TABLE_PALETTE.cushion,
    clearcoat: 0,
  } )

  // Slice 2: Recessed leather-lined pockets with dark interior cavity walls and drop cups
  const pocketLeatherTextures = createPocketLeatherTextures( maxAnisotropy )
  ownTextures( ...Object.values( pocketLeatherTextures ) )
  const pocketInteriorMaterial = new THREE.MeshPhysicalMaterial( {
    map: pocketLeatherTextures.map,
    normalMap: pocketLeatherTextures.normalMap,
    normalScale: new THREE.Vector2( 0.22, 0.22 ),
    roughnessMap: pocketLeatherTextures.roughnessMap,
    color: TABLE_PALETTE.pocketInterior,
    roughness: 0.82,
    metalness: 0.05,
    envMapIntensity: 0.25,
    side: THREE.DoubleSide,
  } )
  const pocketBottomMaterial = new THREE.MeshPhysicalMaterial( {
    map: pocketLeatherTextures.map,
    normalMap: pocketLeatherTextures.normalMap,
    normalScale: new THREE.Vector2( 0.18, 0.18 ),
    roughnessMap: pocketLeatherTextures.roughnessMap,
    color: TABLE_PALETTE.pocketBottom,
    roughness: 0.86,
    metalness: 0.02,
    envMapIntensity: 0.15,
  } )
  const pocketCollarMaterial = new THREE.MeshPhysicalMaterial( {
    color: TABLE_PALETTE.pocketCollar,
    metalness: 0.72,
    roughness: 0.28,
    clearcoat: 0.42,
    clearcoatRoughness: 0.14,
    ior: 1.52,
    envMapIntensity: 0.6,
  } )

  // Apron skirt box
  const apronGeometry = createApronGeometry()
  const apronMesh = new THREE.Mesh( apronGeometry, apronMaterial )
  apronMesh.position.y = -0.42
  apronMesh.receiveShadow = true
  table.add( apronMesh )

  createRailAssembly( pianoBlackRailMaterial, table, new Set(), pocketCollarMaterial )

  // 5. Cushions with 40-45 degree beveled facings angled inward toward pocket throats
  const headFootCushionGeom = createAngledCushionGeometry( 7.64, 0.36, 0.20, 42, 42 )
  const sideCushionGeom = createAngledCushionGeometry( 8.06, 0.36, 0.20, 42, 42 )

  // Head rail cushion (facing inward toward table center +Z)
  const headCushion = new THREE.Mesh( headFootCushionGeom, cushionMaterial )
  headCushion.position.set( 0, 0.22, -9.24 )
  headCushion.castShadow = true
  table.add( headCushion )

  // Foot rail cushion (facing inward toward table center -Z)
  const footCushion = new THREE.Mesh( headFootCushionGeom, cushionMaterial )
  footCushion.rotation.y = Math.PI
  footCushion.position.set( 0, 0.22, 9.24 )
  footCushion.castShadow = true
  table.add( footCushion )

  // Side cushions (4 segments with facings angled inward toward corner and side pockets)
  const sideCushionConfigs = [
    { x: 4.44, z: 4.65, rotY: -Math.PI / 2 },
    { x: 4.44, z: -4.65, rotY: -Math.PI / 2 },
    { x: -4.44, z: 4.65, rotY: Math.PI / 2 },
    { x: -4.44, z: -4.65, rotY: Math.PI / 2 },
  ]
  sideCushionConfigs.forEach( ( cfg ) =>
  {
    const cushion = new THREE.Mesh( sideCushionGeom, cushionMaterial )
    cushion.rotation.y = cfg.rotY
    cushion.position.set( cfg.x, 0.22, cfg.z )
    cushion.castShadow = true
    table.add( cushion )
  } )

  POCKET_POSITIONS.forEach( ( [ x, z ] ) =>
  {
    // Dark interior cavity cylinder showing realistic spatial depth
    const cylinder = new THREE.Mesh(
      new THREE.CylinderGeometry( POCKET_RADIUS * 0.96, POCKET_RADIUS * 0.88, 3.5, 36, 6, true ),
      pocketInteriorMaterial,
    )
    cylinder.position.set( x, -1.75, z )
    cylinder.receiveShadow = true
    table.add( cylinder )

    // Drop cup bottom beneath each pocket opening
    const bottom = new THREE.Mesh(
      new THREE.CircleGeometry( POCKET_RADIUS * 0.88, 32 ).rotateX( -Math.PI / 2 ),
      pocketBottomMaterial,
    )
    bottom.position.set( x, -3.5, z )
    bottom.receiveShadow = true
    table.add( bottom )

    // Dark leather/rubber pocket liner around throat aperture
    const liner = new THREE.Mesh(
      new THREE.TorusGeometry( POCKET_RADIUS * 0.92, 0.075, 16, 48 ),
      pocketInteriorMaterial,
    )
    liner.rotation.x = Math.PI / 2
    liner.position.set( x, 0.015, z )
    liner.castShadow = true
    table.add( liner )

    // Beveled metallic collar bracket around pocket aperture
    const collar = new THREE.Mesh(
      new THREE.TorusGeometry( POCKET_RADIUS * 0.96, 0.045, 16, 48 ),
      pocketCollarMaterial,
    )
    collar.rotation.x = Math.PI / 2
    collar.position.set( x, 0.02, z )
    collar.castShadow = true
    collar.receiveShadow = true
    table.add( collar )
  } )

  // Mother-of-pearl diamond sights seated on rail top surface
  const sightMaterial = new THREE.MeshPhysicalMaterial( {
    color: '#e8d5a3',
    metalness: 0.22,
    roughness: 0.18,
    clearcoat: 0.75,
    clearcoatRoughness: 0.05,
    ior: 1.6,
  } )
  const addSight = ( x, z ) =>
  {
    const sight = new THREE.Mesh( new THREE.OctahedronGeometry( 0.075, 0 ), sightMaterial )
    sight.scale.set( 1, 0.18, 1 )
    sight.position.set( x, 0.49, z )
    sight.castShadow = true
    table.add( sight )
  }
  ;[ -7.35, -3.68, 3.68, 7.35 ].forEach( ( z ) =>
  {
    addSight( -4.91, z )
    addSight( 4.91, z )
  } )
  ;[ -2.65, 0, 2.65 ].forEach( ( x ) =>
  {
    addSight( x, -9.87 )
    addSight( x, 9.87 )
  } )

  // Dynamic Contact Shadow and AO system
  const contactShadowTexture = createContactShadowTexture( maxAnisotropy )
  ownTextures( contactShadowTexture )
  const contactShadowMaterial = new THREE.MeshBasicMaterial( {
    map: contactShadowTexture,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  } )
  const contactShadowGeometry = new THREE.PlaneGeometry( BALL_RADIUS * 2.4, BALL_RADIUS * 2.4 )
  contactShadowGeometry.rotateX( -Math.PI / 2 )

  const shadowGroup = new THREE.Group()
  table.add( shadowGroup )
  const ballShadows = []

  // Physics-driven Ball Mesh Generation (16 balls: 0 = striker, 1..15 = rack)
  // Geometry is shared by all 16 balls. It is selected once at mount so a settled
  // screen-quality change never recreates meshes or causes a visual pop mid-break.
  const ballQuality = DRAFT2_QUALITY_TIERS[ initialQualityTier ]
  const ballGeometry = new THREE.SphereGeometry(
    BALL_RADIUS,
    ballQuality.ballWidthSegments,
    ballQuality.ballHeightSegments,
  )
  const ballMeshes = []
  const disposableMaterials = []
  const ballSurfaceTextures = createBallSurfaceTextures( maxAnisotropy )
  ownTextures( ...Object.values( ballSurfaceTextures ) )

  // Cue / Striker 8-Ball with double-sided front and back brand decals
  // Texture readiness is a render invalidation, so the scheduler can repaint once the logo is available.
  const logoAsset = createLogoTexture( maxAnisotropy, onTextureReady )
  const logoTexture = logoAsset.texture
  ownTextures( logoTexture )
  const strikerGroup = new THREE.Group()
  const strikerMaterial = createBallMaterial( '#070807', null, ballSurfaceTextures )
  disposableMaterials.push( strikerMaterial )
  const strikerSphere = new THREE.Mesh( ballGeometry, strikerMaterial )
  strikerSphere.castShadow = true
  strikerSphere.receiveShadow = true
  strikerSphere.updateMatrixWorld( true )

  const decalMaterial = new THREE.MeshPhysicalMaterial( {
    map: logoTexture,
    color: '#ffffff',
    transparent: true,
    roughness: 0.12,
    metalness: 0,
    clearcoat: 0.85,
    clearcoatRoughness: 0.075,
    clearcoatNormalMap: ballSurfaceTextures.normalMap,
    clearcoatNormalScale: new THREE.Vector2( 0.035, 0.035 ),
    ior: 1.54,
    depthTest: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  } )
  disposableMaterials.push( decalMaterial )

  ;[ [ BALL_RADIUS, 0 ], [ -BALL_RADIUS, Math.PI ] ].forEach( ( [ decalZ, yaw ] ) =>
  {
    const decal = new THREE.Mesh(
      new DecalGeometry(
        strikerSphere,
        new THREE.Vector3( 0, 0, decalZ ),
        new THREE.Euler( 0, yaw, 0 ),
        new THREE.Vector3( BALL_RADIUS * 1.58, BALL_RADIUS * 1.58, BALL_RADIUS * 0.42 ),
      ),
      decalMaterial,
    )
    decal.renderOrder = 2
    strikerGroup.add( decal )
  } )
  strikerGroup.add( strikerSphere )
  table.add( strikerGroup )
  ballMeshes.push( strikerGroup )

  const strikerShadow = new THREE.Mesh( contactShadowGeometry, contactShadowMaterial )
  strikerShadow.position.y = 0.001
  shadowGroup.add( strikerShadow )
  ballShadows.push( strikerShadow )

  // 15 Regulation Rack Balls
  RACK_BALL_NUMBERS.forEach( ( number ) =>
  {
    const texture = createPoolBallTexture(
      BALL_COLORS[ number - 1 ],
      number,
      ballQuality.ballTextureWidth,
      ballQuality.ballTextureHeight,
      maxAnisotropy,
    )
    ownTextures( texture )
    const material = createBallMaterial( BALL_COLORS[ number - 1 ], texture, ballSurfaceTextures )
    disposableMaterials.push( material )
    const mesh = new THREE.Mesh( ballGeometry, material )
    mesh.castShadow = true
    mesh.receiveShadow = true
    table.add( mesh )
    ballMeshes.push( mesh )

    const shadow = new THREE.Mesh( contactShadowGeometry, contactShadowMaterial )
    shadow.position.y = 0.001
    shadowGroup.add( shadow )
    ballShadows.push( shadow )
  } )

  // Slice 3: Studio Lighting Rig + Overhead RectAreaLight + Angled Chamfer Fills + Contact Shadows
  // Overhead luminaire provides bright, broad, diffused tournament table illumination.
  const overheadRectLight = new THREE.RectAreaLight( 0xfff4e5, 2.1, 2.8, 12.0 )
  overheadRectLight.position.set( -2.8, 6.0, 1.5 )
  overheadRectLight.lookAt( 0, 0, -1 )
  scene.add( overheadRectLight )

  // Cool directional fill to illuminate the left cushions and pocket openings.
  const leftChamferFill = new THREE.DirectionalLight( '#d4eae0', 0.24 )
  leftChamferFill.position.set( -8.5, 3.8, 0 )
  leftChamferFill.target.position.set( 0, 0, 0 )
  scene.add( leftChamferFill, leftChamferFill.target )

  // Warm directional fill to bring out right rail textures and wood grain.
  const rightChamferFill = new THREE.DirectionalLight( '#f0e6d6', 0.18 )
  rightChamferFill.position.set( 8.5, 3.8, 0 )
  rightChamferFill.target.position.set( 0, 0, 0 )
  scene.add( rightChamferFill, rightChamferFill.target )

  // Local far-rail fill preserves the rack silhouette while lifting the cushion and sights.
  const farRailFill = new THREE.DirectionalLight( '#dcf2e4', 0.55 )
  farRailFill.position.set( 0, 6.2, -12.8 )
  farRailFill.target.position.set( 0, 0.48, -9.68 )
  scene.add( farRailFill, farRailFill.target )

  // Key directional light provides clear form definition, highlights, and crisp shadows.
  const keyLight = new THREE.DirectionalLight( '#ffe9cf', 1.55 )
  keyLight.position.set( -4.8, 5.6, 4.2 )
  keyLight.target.position.set( 0, 0, -2.5 )
  keyLight.castShadow = true
  keyLight.shadow.mapSize.set( 2048, 2048 )
  keyLight.shadow.camera.left = -7
  keyLight.shadow.camera.right = 7
  keyLight.shadow.camera.top = 8
  keyLight.shadow.camera.bottom = -13
  keyLight.shadow.camera.near = 0.1
  keyLight.shadow.camera.far = 28
  keyLight.shadow.bias = -0.00008
  keyLight.shadow.normalBias = 0.015
  scene.add( keyLight, keyLight.target )

  // Overhead spotlight focuses radiance on the active rack and balls corridor.
  const overheadSpot = new THREE.SpotLight( '#fff3da', 2.8, 26, Math.PI / 3.2, 0.8, 1.3 )
  overheadSpot.position.set( 0, 8.5, -3.2 )
  overheadSpot.target.position.set( 0, 0, -3.2 )
  overheadSpot.castShadow = false
  scene.add( overheadSpot, overheadSpot.target )

  // Ambient felt bounce light softens dark shadows under balls and rail returns.
  const feltBounce = new THREE.HemisphereLight( TABLE_PALETTE.feltBounce, '#030504', 0.34 )
  scene.add( feltBounce )

  // Warm rim light sharpens ball silhouettes and gloss edge catchlights.
  const rimLight = new THREE.DirectionalLight( '#df9654', 0.68 )
  rimLight.position.set( 5.5, 4.8, -7.5 )
  rimLight.target.position.set( 0, 0, -3 )
  scene.add( rimLight, rimLight.target )

  // Bloom was near-zero but still paid for a full-screen pass. Removing it keeps the
  // existing exposure and lighting balance while preserving the physically grounded image.
  const createComposer = () =>
  {
    const nextComposer = new EffectComposer( renderer )
    const renderPass = new RenderPass( scene, camera )
    const nextSsaoPass = new SSAOPass( scene, camera, 1, 1, 32 )
    nextSsaoPass.kernelRadius = 14
    nextSsaoPass.minDistance = 0.001
    nextSsaoPass.maxDistance = 0.18
    const outputPass = new OutputPass()
    nextComposer.addPass( renderPass )
    nextComposer.addPass( nextSsaoPass )
    nextComposer.addPass( outputPass )
    return { composer: nextComposer, ssaoPass: nextSsaoPass }
  }

  let composer = null
  let ssaoPass = null
  let qualityTierId = initialQualityTier

  const applyQualityTier = ( nextTierId ) =>
  {
    const tier = DRAFT2_QUALITY_TIERS[ nextTierId ]
    qualityTierId = tier.id

    // Rebuild the shadow target only when a settled quality change is applied; tuned bias
    // and normal-bias values remain untouched so balls stay grounded at every tier.
    if ( keyLight.shadow.map )
    {
      keyLight.shadow.map.dispose()
      keyLight.shadow.map = null
    }
    keyLight.shadow.mapSize.set( tier.shadowMapSize, tier.shadowMapSize )
    keyLight.shadow.needsUpdate = true
    renderer.shadowMap.needsUpdate = true

    if ( tier.useSsao )
    {
      if ( !composer )
      {
        const pipeline = createComposer()
        composer = pipeline.composer
        ssaoPass = pipeline.ssaoPass
      }
      ssaoPass.enabled = true
    }
    else
    {
      // Low/mobile tiers render directly. No composer or disabled pass is paid for here.
      composer?.dispose()
      composer = null
      ssaoPass = null
    }

    onQualityState?.( {
      id: tier.id,
      pixelRatioCap: tier.pixelRatioCap,
      shadowMapSize: tier.shadowMapSize,
      ssao: tier.useSsao,
    } )
  }

  applyQualityTier( initialQualityTier )
  const qualityMonitor = createQualityMonitor( initialQualityTier, initialQualitySignals, applyQualityTier )

  const resize = () =>
  {
    const width = canvas.clientWidth || window.innerWidth
    const height = canvas.clientHeight || window.innerHeight
    const signals = getDraft2QualitySignals( width, height )
    qualityMonitor.suggestFromSignals( signals )
    const pixelRatioCap = DRAFT2_QUALITY_TIERS[ qualityTierId ].pixelRatioCap
    const pixelRatio = Math.min( window.devicePixelRatio || 1, pixelRatioCap )

    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.setPixelRatio( pixelRatio )
    renderer.setSize( width, height, false )
    composer?.setPixelRatio( pixelRatio )
    composer?.setSize( width, height )
  }

  const render = () =>
  {
    if ( composer ) composer.render()
    else renderer.render( scene, camera )
  }

  const dispose = () =>
  {
    logoAsset.dispose()
    // Shared ball and shadow assets occur on many meshes; dispose each GPU resource once.
    const geometries = new Set()
    const materials = new Set( disposableMaterials )
    scene.traverse( ( object ) =>
    {
      if ( object.geometry ) geometries.add( object.geometry )
      if ( object.material )
      {
        const objectMaterials = Array.isArray( object.material ) ? object.material : [ object.material ]
        objectMaterials.forEach( ( material ) => materials.add( material ) )
      }
    } )
    geometries.forEach( ( geometry ) => geometry.dispose() )
    materials.forEach( ( material ) => material.dispose() )
    disposableTextures.forEach( ( texture ) => texture.dispose() )
    composer?.dispose()
    scene.environment = null
    environmentTarget.dispose()
    renderer.renderLists.dispose()
    renderer.dispose()
  }

  return {
    camera,
    ballMeshes,
    ballShadows,
    renderer,
    resize,
    render,
    // Scheduler-owned frame timing feeds measured quality changes without creating a second loop.
    observeRender ( durationMs, sceneSettled )
    {
      return qualityMonitor.observe( durationMs, sceneSettled )
    },
    hasPendingQuality ()
    {
      return qualityMonitor.pending
    },
    getResourceSnapshot ()
    {
      // Publish renderer-owned counts only for diagnostics. This does not retain
      // Three.js objects, so certification can compare lifecycle stability safely.
      return {
        geometries: renderer.info.memory.geometries,
        textures: renderer.info.memory.textures,
        programs: renderer.info.programs?.length ?? 0,
      }
    },
    dispose,
  }
}

export function WebglPoolDraft ( {
  active,
  onController,
  onUnavailable,
  draftId = 'webgl',
  variant = 'break',
} )
{
  const rootRef = useRef( null )
  const canvasRef = useRef( null )
  const controllerRef = useRef( null )

  useLayoutEffect( () =>
  {
    const root = rootRef.current
    const canvas = canvasRef.current
    if ( !root || !canvas ) return undefined

    const phaseLabel = root.querySelector( '.webgl-phase' )
    const simulation = getBreakSimulation()

    let world = null
    let isActive = active
    let progress = 0
    let failed = false
    let resizePending = true
    let destroyed = false
    let renderFrame = () => {}
    let renderContinuation = false
    let lastRenderedProgress = null
    let stableProgressFrames = 0
    const diagnosticsEnabled = isFramingDiagnosticsEnabled( window )

    // One scheduler owns every WebGL repaint; callers only mark the latest state dirty.
    const scheduler = createDemandFrameScheduler( {
      active: isActive,
      requestAnimationFrame: ( callback ) => window.requestAnimationFrame( callback ),
      cancelAnimationFrame: ( handle ) => window.cancelAnimationFrame( handle ),
      render: ( frameState ) => renderFrame( frameState ),
      shouldContinue: () => renderContinuation,
    } )
    const requestRender = () => scheduler.invalidate()

    const pointer = createPointerParallax( {
      windowObject: window,
      isActive: () => isActive,
      requestRender,
      onResize: () => { resizePending = true },
    } )

    try
    {
      world = buildScene( canvas, simulation, requestRender, ( qualityState ) =>
      {
        // Dataset diagnostics make the active budget visible to browser acceptance tests
        // without coupling those tests to Three.js internals.
        root.dataset.webglQuality = qualityState.id
        root.dataset.webglDprCap = String( qualityState.pixelRatioCap )
        root.dataset.webglSsao = String( qualityState.ssao )
        root.dataset.webglShadowMap = String( qualityState.shadowMapSize )
      } )
      root.dataset.webglError = 'false'
    }
    catch ( error )
    {
      failed = true
      root.dataset.webglError = 'true'
      console.warn( `Draft ${draftId} WebGL setup failed; fallback active.`, error )
      onUnavailable?.( draftId )
    }

    const cameraPosition = new THREE.Vector3()
    const cameraTarget = new THREE.Vector3()

    const renderScene = () =>
    {
      if ( failed || !world ) return

      const state = sampleDraft2BreakState( progress, simulation )

      if ( phaseLabel )
      {
        phaseLabel.textContent = progress <= STORY_TIMING.intro.visual.draft2TableSettleProgress
          ? 'TABLE  /  SET'
          : progress < STORY_TIMING.intro.draft2.exitStart
            ? 'BREAK  /  RUN'
            : progress < STORY_TIMING.intro.draft2.exitEnd
              ? 'POCKET  /  CLEAR'
              : 'STUDIO  /  CUT'
      }

      const exitProgress = clamp( ( progress - STORY_TIMING.intro.draft2.exitStart ) /
        STORY_TIMING.intro.draft2.transitionDurationProgress )

      // Sync physical ball meshes and contact shadows to deterministic physics state
      state.balls.forEach( ( ball, index ) =>
      {
        const mesh = world.ballMeshes[ index ]
        const shadow = world.ballShadows[ index ]
        if ( !mesh ) return

        const posX = ball.position.x * PHYSICS_SCALE
        const posY = ball.position.y * PHYSICS_SCALE
        const posZ = ball.position.z * PHYSICS_SCALE

        mesh.position.set( posX, posY, posZ )
        mesh.quaternion.set(
          ball.quaternion.x,
          ball.quaternion.y,
          ball.quaternion.z,
          ball.quaternion.w,
        )
        mesh.visible = ball.visibility && exitProgress < 0.99

        if ( shadow )
        {
          shadow.position.set( posX, 0.001, posZ )
          // Contact shadow stays locked to felt and shrinks as ball drops below table into pockets
          const heightOffset = Math.max( 0, ( posY - BALL_RADIUS ) / BALL_RADIUS )
          const pocketFade = ball.pocketDepth ? Math.max( 0, 1 - ball.pocketDepth * 4 ) : 1
          const shadowScale = ( 1 - exitProgress ) * ( 1 - heightOffset * 0.8 ) * pocketFade
          shadow.scale.setScalar( Math.max( 0.001, shadowScale ) )
          shadow.visible = ball.visibility && shadowScale > 0.02
        }
      } )

      // Both Drafts consume the same semantic camera path; this renderer stays in Draft 2 scene units.
      const framing = resolveIntroCameraFraming( {
        progress,
        treatment: 'break',
        transitionReadyProgress: STORY_TIMING.intro.draft2.transitionReady,
        aspect: world.camera.aspect,
        sourceScale: 1,
        pointerX: pointer.state.x,
        pointerY: pointer.state.y,
        pointerEnabled: pointer.state.enabled,
      } )

      cameraPosition.set( ...framing.camera )
      cameraTarget.set( ...framing.target )

      world.camera.position.copy( cameraPosition )
      world.camera.lookAt( cameraTarget )
      world.camera.fov = framing.fov
      world.camera.updateProjectionMatrix()
      world.camera.updateMatrixWorld( true )
      if ( diagnosticsEnabled )
      {
        publishFramingDiagnostics( canvas, world.camera, state.balls.map( ( ball ) => ( {
          position: {
            x: ball.position.x * PHYSICS_SCALE,
            y: ball.position.y * PHYSICS_SCALE,
            z: ball.position.z * PHYSICS_SCALE,
          },
        } ) ), BALL_RADIUS, framing )
      }

      // Overall layer fade at chapter exit
      canvas.style.opacity = String( 1 - exitProgress )
    }

    const updateScene = ( nextProgress ) =>
    {
      progress = clamp( nextProgress )
      // Keep the source-of-truth scroll playhead observable across resize checks.
      root.dataset.webglProgress = progress.toFixed( 4 )
      requestRender()
    }

    renderFrame = () =>
    {
      renderContinuation = false
      if ( destroyed || !isActive || failed || !world ) return

      if ( resizePending )
      {
        world.resize()
        resizePending = false
      }

      const progressChanged = lastRenderedProgress === null || Math.abs( progress - lastRenderedProgress ) > 0.0005
      stableProgressFrames = progressChanged ? 0 : stableProgressFrames + 1
      const renderStartedAt = performance.now()
      renderScene()
      world.render()
      // This timestamp is a narrow browser-test seam: it changes only after Draft 2 paints.
      root.dataset.webglRenderAt = performance.now().toFixed( 3 )
      const resources = world.getResourceSnapshot()
      root.dataset.webglGeometries = String( resources.geometries )
      root.dataset.webglTextures = String( resources.textures )
      root.dataset.webglPrograms = String( resources.programs )
      const renderDurationMs = performance.now() - renderStartedAt
      lastRenderedProgress = progress

      const pointerSettled = pointer.advance()
      const sceneSettled = stableProgressFrames >= 4 && pointerSettled && !resizePending
      if ( world.observeRender( renderDurationMs, sceneSettled ) )
      {
        // Apply a pending tier only after motion settles; the next scheduler frame picks up
        // the new DPR/effects/shadow target without popping during a swipe or break gesture.
        resizePending = true
      }
      // Pointer damping, a settled quality change, or a resize are renderer-owned
      // continuations. The shared scheduler keeps them alive until all settle.
      renderContinuation = !pointerSettled || resizePending || world.hasPendingQuality()
    }

    const controller = {
      setProgress ( value )
      {
        updateScene( value )
      },
      setActive ( nextActive )
      {
        isActive = nextActive
        // Keep the declared status above the 2.5D fallback if WebGL setup failed.
        // It remains readable even after App switches the active visual to Draft 1.
        const showFallback = failed
        root.classList.toggle( 'is-active', nextActive || showFallback )
        root.setAttribute( 'aria-hidden', String( !nextActive && !showFallback ) )
        if ( !nextActive )
        {
          pointer.reset()
        }

        if ( nextActive ) pointer.syncCapability()
        // Activation paints the latest progress on the next frame, then idles again when settled.
        scheduler.setActive( nextActive )
      },
    }

    controllerRef.current = controller
    onController?.( controller )
    controller.setProgress( progress )
    controller.setActive( active )
    if ( world )
    {
      pointer.addListeners()
    }

    return () =>
    {
      destroyed = true
      scheduler.destroy()
      pointer.removeListeners()
      onController?.( null )
      if ( controllerRef.current === controller ) controllerRef.current = null
      world?.dispose()
    }
  }, [ onController, onUnavailable, draftId ] )

  useLayoutEffect( () =>
  {
    controllerRef.current?.setActive( active )
  }, [ active ] )

  return (
    <div
      className={ `draft-layer draft-layer-webgl draft-layer-webgl-${variant}` }
      ref={ rootRef }
      aria-hidden={ !active }
      data-draft-id={ draftId }
    >
      <canvas ref={ canvasRef } className="webgl-pool-canvas" aria-hidden="true" />
      <div className="webgl-vignette" aria-hidden="true" />
      <p className="webgl-phase" aria-hidden="true">TABLE / SET</p>
      <p className="webgl-fallback" role="status">3D draft unavailable on this device. Showing 2.5D draft.</p>
    </div>
  )
}
