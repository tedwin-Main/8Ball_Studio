import { useLayoutEffect, useRef } from 'react'
import * as THREE from 'three'
import { DecalGeometry } from 'three/addons/geometries/DecalGeometry.js'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js'
import brandLogo from '../assets/8BALL-V4.jpg'

// Initialize RectAreaLight uniforms for WebGLRenderer
RectAreaLightUniformsLib.init()
import {
  getBreakSimulation,
  sampleBreakState,
  CINEMATIC_EXIT_START,
  CINEMATIC_EXIT_END,
} from './poolBreakPhysics'

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
const PHYSICS_SCALE = TABLE_LENGTH / 2.54 // Scale factor between SI-unit physics (2.54m) and WebGL table (19.2)
const BALL_RADIUS = 0.035 * PHYSICS_SCALE // Scale ball radius proportionally (approx 0.2646)
const POCKET_RADIUS = 0.54
const ROOM_FLOOR_Z = -4

const POCKET_POSITIONS = [
  [ -4.18, -9.08 ], [ 4.18, -9.08 ],
  [ -4.24, 0 ], [ 4.24, 0 ],
  [ -4.18, 9.08 ], [ 4.18, 9.08 ],
]

/**
 * Creates high-resolution procedural textures for tournament pool balls with ivory base and stripe belts.
 */
const createPoolBallTexture = ( color, number, anisotropy = 16 ) =>
{
  const canvas = document.createElement( 'canvas' )
  canvas.width = 2048
  canvas.height = 1024
  const context = canvas.getContext( '2d' )
  const isStripe = number > 8

  // Rich ivory background for stripe balls; solid tournament color for solid balls
  context.fillStyle = isStripe ? '#f5f1e4' : color
  context.fillRect( 0, 0, canvas.width, canvas.height )
  if ( isStripe )
  {
    context.fillStyle = color
    context.fillRect( 0, 318, canvas.width, 388 )
  }

  // Dual opposing number disks so the number remains legible as the ball rolls
  ;[ 512, 1536 ].forEach( ( centerX ) =>
  {
    context.fillStyle = '#f7f4ec'
    context.beginPath()
    context.arc( centerX, 512, 136, 0, Math.PI * 2 )
    context.fill()
    context.strokeStyle = 'rgba(15, 15, 12, 0.18)'
    context.lineWidth = 6
    context.stroke()
    context.fillStyle = '#0a0d0b'
    context.font = '800 148px Arial, sans-serif'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText( String( number ), centerX, 520 )

    if ( number === 6 || number === 9 )
    {
      context.fillRect( centerX - 42, 584, 84, 10 )
    }
  } )

  const texture = new THREE.CanvasTexture( canvas )
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = anisotropy
  return texture
}

/**
 * Procedural Simonis 860 worsted wool microfiber cloth textures.
 * Generates interwoven warp/weft yarn bundles with twisted ply striations, micro-fiber nap fuzz,
 * and high-precision tangent-space normal gradients.
 */
const createFeltTextures = ( anisotropy = 16, repeatX = 38.4, repeatY = 76.8 ) =>
{
  const width = 512
  const height = 512
  const numThreads = 32 // 16 pixels per yarn thread
  const threadSize = width / numThreads

  const canvas = document.createElement( 'canvas' )
  const normalCanvas = document.createElement( 'canvas' )
  const roughnessCanvas = document.createElement( 'canvas' )
  const bumpCanvas = document.createElement( 'canvas' )

  canvas.width = width
  canvas.height = height
  normalCanvas.width = width
  normalCanvas.height = height
  roughnessCanvas.width = width
  roughnessCanvas.height = height
  bumpCanvas.width = width
  bumpCanvas.height = height

  const context = canvas.getContext( '2d' )
  const normalContext = normalCanvas.getContext( '2d' )
  const roughnessContext = roughnessCanvas.getContext( '2d' )
  const bumpContext = bumpCanvas.getContext( '2d' )

  const albedoImage = context.createImageData( width, height )
  const normalImage = normalContext.createImageData( width, height )
  const roughnessImage = roughnessContext.createImageData( width, height )
  const bumpImage = bumpContext.createImageData( width, height )

  const albedoData = albedoImage.data
  const normalData = normalImage.data
  const roughnessData = roughnessImage.data
  const bumpData = bumpImage.data

  const heightMap = new Float32Array( width * height )

  // Step 1: Generate worsted wool yarn heightmap with weave, twist striations, and fiber nap
  for ( let y = 0; y < height; y += 1 )
  {
    const wy = Math.floor( y / threadSize )
    const ty = ( y % threadSize ) / threadSize
    const ny = ty * 2 - 1
    const hy = Math.sqrt( Math.max( 0, 1 - ny * ny ) )

    for ( let x = 0; x < width; x += 1 )
    {
      const wx = Math.floor( x / threadSize )
      const tx = ( x % threadSize ) / threadSize
      const nx = tx * 2 - 1
      const hx = Math.sqrt( Math.max( 0, 1 - nx * nx ) )

      // Over-1-Under-1 plain worsted weave pattern
      const warpOnTop = ( wx + wy ) % 2 === 0

      // Micro-fiber twist striation along each yarn bundle
      let twist = 0
      if ( warpOnTop )
      {
        const fiberPhase = ( y + nx * 3.6 ) * 0.48
        twist = Math.sin( fiberPhase ) * 0.075 * hy
      }
      else
      {
        const fiberPhase = ( x + ny * 3.6 ) * 0.48
        twist = Math.sin( fiberPhase ) * 0.075 * hx
      }

      // High-frequency wool fuzz / nap micro-noise
      const seed = ( ( x * 374761393 + y * 668265263 ) ^ ( x * y ) ) & 0xffffff
      const fuzz = ( ( seed % 1000 ) / 1000 - 0.5 ) * 0.05

      // Warp/weft interlocking yarn undulation
      let baseH = 0
      if ( warpOnTop )
      {
        const undulation = 0.65 + 0.35 * Math.cos( Math.PI * ny )
        baseH = hx * undulation * 0.84 + ( 1 - hy ) * 0.16
      }
      else
      {
        const undulation = 0.65 + 0.35 * Math.cos( Math.PI * nx )
        baseH = hy * undulation * 0.84 + ( 1 - hx ) * 0.16
      }

      const totalH = Math.max( 0, Math.min( 1, baseH + twist + fuzz ) )
      heightMap[ y * width + x ] = totalH
    }
  }

  // Step 2: Compute tangent-space normals from height gradient, plus albedo and roughness maps
  const normalStrength = 3.2
  for ( let y = 0; y < height; y += 1 )
  {
    const ym1 = ( y - 1 + height ) % height
    const yp1 = ( y + 1 ) % height

    for ( let x = 0; x < width; x += 1 )
    {
      const xm1 = ( x - 1 + width ) % width
      const xp1 = ( x + 1 ) % width
      const idx = y * width + x
      const pixelIdx = idx * 4

      const hL = heightMap[ y * width + xm1 ]
      const hR = heightMap[ y * width + xp1 ]
      const hU = heightMap[ ym1 * width + x ]
      const hD = heightMap[ yp1 * width + x ]

      const dx = ( hR - hL ) * normalStrength
      const dy = ( hD - hU ) * normalStrength
      const len = Math.sqrt( dx * dx + dy * dy + 1.0 )
      const nx = -dx / len
      const ny = -dy / len
      const nz = 1.0 / len

      // Normal Map (RGB encoding [-1, 1] to [0, 255])
      normalData[ pixelIdx ] = Math.round( ( nx * 0.5 + 0.5 ) * 255 )
      normalData[ pixelIdx + 1 ] = Math.round( ( ny * 0.5 + 0.5 ) * 255 )
      normalData[ pixelIdx + 2 ] = Math.round( ( nz * 0.5 + 0.5 ) * 255 )
      normalData[ pixelIdx + 3 ] = 255

      // Albedo Map: Rich tournament green base (#0e4c36) with yarn crest illumination and crevice shadow
      const h = heightMap[ idx ]
      // Low-frequency organic dye mottling
      const dyeShift = Math.sin( x * 0.035 ) * Math.cos( y * 0.035 ) * 4
      const r = Math.max( 0, Math.min( 255, Math.round( 8 + h * 24 + dyeShift ) ) )
      const g = Math.max( 0, Math.min( 255, Math.round( 48 + h * 76 + dyeShift * 1.5 ) ) )
      const b = Math.max( 0, Math.min( 255, Math.round( 32 + h * 50 + dyeShift ) ) )

      albedoData[ pixelIdx ] = r
      albedoData[ pixelIdx + 1 ] = g
      albedoData[ pixelIdx + 2 ] = b
      albedoData[ pixelIdx + 3 ] = 255

      // Roughness Map: 0.74 on yarn crests, up to 0.96 in crevices
      const roughnessVal = Math.round( ( 0.96 - h * 0.22 ) * 255 )
      roughnessData[ pixelIdx ] = roughnessVal
      roughnessData[ pixelIdx + 1 ] = roughnessVal
      roughnessData[ pixelIdx + 2 ] = roughnessVal
      roughnessData[ pixelIdx + 3 ] = 255

      // Bump Map: Grayscale height
      const bumpVal = Math.round( h * 255 )
      bumpData[ pixelIdx ] = bumpVal
      bumpData[ pixelIdx + 1 ] = bumpVal
      bumpData[ pixelIdx + 2 ] = bumpVal
      bumpData[ pixelIdx + 3 ] = 255
    }
  }

  context.putImageData( albedoImage, 0, 0 )
  normalContext.putImageData( normalImage, 0, 0 )
  roughnessContext.putImageData( roughnessImage, 0, 0 )
  bumpContext.putImageData( bumpImage, 0, 0 )

  const map = new THREE.CanvasTexture( canvas )
  const normalMap = new THREE.CanvasTexture( normalCanvas )
  const roughnessMap = new THREE.CanvasTexture( roughnessCanvas )
  const bumpMap = new THREE.CanvasTexture( bumpCanvas )

  ;[ map, normalMap, roughnessMap, bumpMap ].forEach( ( texture ) =>
  {
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set( repeatX, repeatY )
    texture.anisotropy = anisotropy
    // Mipmaps keep the 64x64 weave stable at distance while linear filtering avoids hard tile edges.
    texture.generateMipmaps = true
    texture.minFilter = THREE.LinearMipmapLinearFilter
    texture.magFilter = THREE.LinearFilter
  } )

  map.colorSpace = THREE.SRGBColorSpace
  return { map, normalMap, roughnessMap, bumpMap }
}

/**
 * Soft radial Gaussian gradient for ball contact shadows and ambient occlusion.
 */
const createContactShadowTexture = () =>
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
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = anisotropy

  const paint = () =>
  {
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

  image.addEventListener( 'load', paint, { once: true } )
  image.src = brandLogo
  if ( image.complete ) paint()
  return texture
}

/**
 * Builds warm studio PMREM environment cubemap with softboxes, mahogany cards, and green felt bounce.
 */
const createWarmStudioEnvironment = ( renderer ) =>
{
  const environmentScene = new THREE.Scene()
  environmentScene.background = new THREE.Color( '#040504' )
  const resources = []

  const addCard = ( geometry, color, intensity, position, target = [ 0, 0, 0 ] ) =>
  {
    const material = new THREE.MeshBasicMaterial( {
      color,
      side: THREE.DoubleSide,
      toneMapped: false,
    } )
    material.color.multiplyScalar( intensity )
    const card = new THREE.Mesh( geometry, material )
    card.position.set( ...position )
    card.lookAt( ...target )
    environmentScene.add( card )
    resources.push( geometry, material )
  }

  // Overhead warm diffused softbox light card
  addCard( new THREE.CircleGeometry( 4.5, 48 ), '#fff2d6', 2.6, [ 0, 8.5, -2 ], [ 0, 0, -2 ] )
  // Warm mahogany wood side reflection cards
  addCard( new THREE.PlaneGeometry( 12, 3.5 ), '#c57d48', 0.85, [ 6.5, 3.2, 0 ], [ 0, 0, 0 ] )
  addCard( new THREE.PlaneGeometry( 12, 3.5 ), '#c57d48', 0.85, [ -6.5, 3.2, 0 ], [ 0, 0, 0 ] )
  // Emerald felt upward bounce card
  addCard( new THREE.PlaneGeometry( 14, 24 ), '#367256', 0.45, [ 0, -0.6, 0 ], [ 0, 10, 0 ] )

  const generator = new THREE.PMREMGenerator( renderer )
  generator.compileCubemapShader()
  const target = generator.fromScene( environmentScene, 0.04 )
  resources.forEach( ( resource ) => resource.dispose() )
  generator.dispose()
  return target
}

/**
 * Aramith phenolic resin physical ball material with accurate IOR, clearcoat, and sheen.
 */
const createBallMaterial = ( color, texture ) => new THREE.MeshPhysicalMaterial( {
  color: texture ? '#ffffff' : color,
  map: texture,
  roughness: 0.055,
  metalness: 0,
  clearcoat: 1.0,
  clearcoatRoughness: 0.028,
  ior: 1.54,
  reflectivity: 0.84,
  envMapIntensity: 0.85,
} )

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

const createFeltGeometry = () =>
{
  const shape = new THREE.Shape()
  shape.moveTo( -TABLE_WIDTH / 2, -TABLE_LENGTH / 2 )
  shape.lineTo( TABLE_WIDTH / 2, -TABLE_LENGTH / 2 )
  shape.lineTo( TABLE_WIDTH / 2, TABLE_LENGTH / 2 )
  shape.lineTo( -TABLE_WIDTH / 2, TABLE_LENGTH / 2 )
  shape.closePath()

  POCKET_POSITIONS.forEach( ( [ x, z ] ) =>
  {
    const hole = new THREE.Path()
    hole.absarc( x, -z, POCKET_RADIUS, 0, Math.PI * 2, false )
    shape.holes.push( hole )
  } )

  const geometry = new THREE.ShapeGeometry( shape, 32 )
  geometry.rotateX( -Math.PI / 2 )
  return geometry
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

const buildScene = ( canvas, simulation, onTextureReady ) =>
{
  const scene = new THREE.Scene()
  scene.background = new THREE.Color( '#040605' )
  scene.fog = new THREE.FogExp2( '#040605', 0.018 )

  const camera = new THREE.PerspectiveCamera( 38, 1, 0.1, 100 )
  camera.position.set( 0, 0.78, 0.5 * PHYSICS_SCALE + 2.05 )
  camera.lookAt( 0, 0.18, -2.6 )

  const renderer = new THREE.WebGLRenderer( {
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  } )
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  // Keep the physically based rig below the clipped, washed-out look of the previous pass.
  renderer.toneMappingExposure = 0.82
  renderer.shadowMap.enabled = true
  // PCFShadowMap keeps the tuned contact-shadow bias while avoiding the deprecated soft-shadow path.
  renderer.shadowMap.type = THREE.PCFShadowMap

  const maxAnisotropy = Math.min( 16, renderer.capabilities.getMaxAnisotropy() )
  const environmentTarget = createWarmStudioEnvironment( renderer )
  scene.environment = environmentTarget.texture
  // Keep indirect studio reflections present without reintroducing the washed-out felt baseline.
  scene.environmentIntensity = 0.42

  const table = new THREE.Group()
  scene.add( table )

  const roomMaterial = new THREE.MeshStandardMaterial( {
    color: '#101411',
    roughness: 0.94,
    metalness: 0,
  } )
  const floorMaterial = new THREE.MeshStandardMaterial( {
    color: '#141310',
    roughness: 0.8,
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
  const feltTextures = createFeltTextures( maxAnisotropy, 64, 64 )
  const feltMaterial = new THREE.MeshPhysicalMaterial( {
    map: feltTextures.map,
    normalMap: feltTextures.normalMap,
    normalScale: new THREE.Vector2( 0.15, 0.15 ),
    roughnessMap: feltTextures.roughnessMap,
    roughness: 0.82,
    metalness: 0.0,
    sheen: 1.0,
    sheenRoughness: 0.4,
    sheenColor: new THREE.Color( 0x73d994 ),
    color: '#0e4c36',
    bumpMap: feltTextures.bumpMap,
    bumpScale: 0.004,
    // Keep cloth sheen visible without letting the studio environment bleach the felt.
    envMapIntensity: 0.28,
    clearcoat: 0,
  } )
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

  // Slice 2: Rails with dual-material separation (refined satin-piano black top rail + cloth cushion)
  const pianoBlackRailMaterial = new THREE.MeshPhysicalMaterial( {
    color: '#08080a',
    roughness: 0.1,
    metalness: 0.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
    ior: 1.52,
    reflectivity: 0.72,
    // Keep the lacquer highlight controlled while the studio lights are tuned for the felt.
    envMapIntensity: 0.24,
  } )
  const apronMaterial = new THREE.MeshPhysicalMaterial( {
    color: '#0a0a0c',
    roughness: 0.22,
    metalness: 0.0,
    clearcoat: 0.7,
    clearcoatRoughness: 0.12,
    envMapIntensity: 0.75,
  } )
  const cushionTextures = createFeltTextures( maxAnisotropy, 16, 16 )
  const cushionMaterial = new THREE.MeshPhysicalMaterial( {
    map: cushionTextures.map,
    normalMap: cushionTextures.normalMap,
    normalScale: new THREE.Vector2( 0.15, 0.15 ),
    roughnessMap: cushionTextures.roughnessMap,
    roughness: 0.82,
    metalness: 0.0,
    sheen: 1.0,
    sheenRoughness: 0.4,
    sheenColor: new THREE.Color( 0x73d994 ),
    color: '#0e4c36',
    clearcoat: 0,
  } )

  addRoundedBox( table, [ 10.75, 0.72, 20.55 ], [ 0, -0.42, 0 ], apronMaterial, 0.14 )
  ;[ -10.0, 10.0 ].forEach( ( z ) =>
  {
    addRoundedBox( table, [ 7.3, 0.48, 0.54 ], [ 0, 0.22, z ], pianoBlackRailMaterial, 0.1 )
    addRoundedBox( table, [ 0.26, 0.48, 0.54 ], [ -4.78, 0.22, z ], pianoBlackRailMaterial, 0.08 )
    addRoundedBox( table, [ 0.26, 0.48, 0.54 ], [ 4.78, 0.22, z ], pianoBlackRailMaterial, 0.08 )
    addRoundedBox( table, [ 7.2, 0.2, 0.38 ], [ 0, 0.48, z * 0.968 ], cushionMaterial, 0.08 )
  } )
  ;[ -4.96, 4.96 ].forEach( ( x ) =>
  {
    addRoundedBox( table, [ 0.38, 0.48, 19.45 ], [ x, 0.22, 0 ], pianoBlackRailMaterial, 0.1 )
    addRoundedBox( table, [ 0.38, 0.2, 7.6 ], [ x * 0.923, 0.48, -4.8 ], cushionMaterial, 0.08 )
    addRoundedBox( table, [ 0.38, 0.2, 7.6 ], [ x * 0.923, 0.48, 4.8 ], cushionMaterial, 0.08 )
  } )

  // Slice 2: Recessed 3D pocket cylinders (depth: 8.5 units) with matte black interior & beveled collars
  const pocketInteriorMaterial = new THREE.MeshStandardMaterial( {
    color: '#050505',
    roughness: 0.95,
    metalness: 0.0,
    side: THREE.BackSide,
  } )
  const pocketBottomMaterial = new THREE.MeshStandardMaterial( {
    color: '#040404',
    roughness: 0.98,
    metalness: 0.0,
  } )
  const pocketCollarMaterial = new THREE.MeshStandardMaterial( {
    color: '#151412',
    roughness: 0.86,
    metalness: 0.0,
  } )

  POCKET_POSITIONS.forEach( ( [ x, z ] ) =>
  {
    // Deep 3D recessed cylinder pocket cavity
    const cylinder = new THREE.Mesh(
      new THREE.CylinderGeometry( POCKET_RADIUS * 0.96, POCKET_RADIUS * 0.88, 8.5, 36, 6, true ),
      pocketInteriorMaterial,
    )
    cylinder.position.set( x, -4.25, z )
    cylinder.receiveShadow = true
    table.add( cylinder )

    const bottom = new THREE.Mesh(
      new THREE.CircleGeometry( POCKET_RADIUS * 0.88, 32 ).rotateX( -Math.PI / 2 ),
      pocketBottomMaterial,
    )
    bottom.position.set( x, -8.5, z )
    bottom.receiveShadow = true
    table.add( bottom )

    // Beveled collar bracket around pocket aperture
    const collar = new THREE.Mesh(
      new THREE.TorusGeometry( POCKET_RADIUS * 0.94, 0.092, 16, 48 ),
      pocketCollarMaterial,
    )
    collar.rotation.x = Math.PI / 2
    collar.position.set( x, 0.02, z )
    collar.castShadow = true
    collar.receiveShadow = true
    table.add( collar )
  } )

  // Mother-of-pearl diamond sights on rails
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
    sight.position.set( x, 0.61, z )
    sight.castShadow = true
    table.add( sight )
  }
  ;[ -7.35, -3.68, 3.68, 7.35 ].forEach( ( z ) =>
  {
    addSight( -4.96, z )
    addSight( 4.96, z )
  } )
  ;[ -2.65, 0, 2.65 ].forEach( ( x ) =>
  {
    addSight( x, -10.03 )
    addSight( x, 10.03 )
  } )

  // Dynamic Contact Shadow and AO system
  const contactShadowTexture = createContactShadowTexture()
  const contactShadowMaterial = new THREE.MeshBasicMaterial( {
    map: contactShadowTexture,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  } )
  const contactShadowGeometry = new THREE.PlaneGeometry( BALL_RADIUS * 2.8, BALL_RADIUS * 2.8 )
  contactShadowGeometry.rotateX( -Math.PI / 2 )

  const shadowGroup = new THREE.Group()
  table.add( shadowGroup )
  const ballShadows = []

  // Physics-driven Ball Mesh Generation (16 balls: 0 = striker, 1..15 = rack)
  const ballGeometry = new THREE.SphereGeometry( BALL_RADIUS, 64, 40 )
  const ballMeshes = []
  const disposableMaterials = []

  // Cue / Striker 8-Ball with double-sided front and back brand decals
  // Texture readiness is a render invalidation, so the scheduler can repaint once the logo is available.
  const logoTexture = createLogoTexture( maxAnisotropy, onTextureReady )
  const strikerGroup = new THREE.Group()
  const strikerMaterial = createBallMaterial( '#070807', null )
  disposableMaterials.push( strikerMaterial )
  const strikerSphere = new THREE.Mesh( ballGeometry, strikerMaterial )
  strikerSphere.castShadow = true
  strikerSphere.receiveShadow = true
  strikerSphere.updateMatrixWorld( true )

  const decalMaterial = new THREE.MeshPhysicalMaterial( {
    map: logoTexture,
    color: '#ffffff',
    transparent: true,
    roughness: 0.055,
    metalness: 0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.028,
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
      maxAnisotropy,
    )
    const material = createBallMaterial( BALL_COLORS[ number - 1 ], texture )
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
  const overheadRectLight = new THREE.RectAreaLight( 0xffffff, 2.4, 6.2, 14.8 )
  overheadRectLight.position.set( 0, 6.8, 0 )
  overheadRectLight.rotation.x = -Math.PI / 2
  scene.add( overheadRectLight )

  const leftChamferFill = new THREE.DirectionalLight( '#d4eae0', 0.28 )
  leftChamferFill.position.set( -8.5, 3.8, 0 )
  leftChamferFill.target.position.set( 0, 0, 0 )
  scene.add( leftChamferFill, leftChamferFill.target )

  const rightChamferFill = new THREE.DirectionalLight( '#f0e6d6', 0.24 )
  rightChamferFill.position.set( 8.5, 3.8, 0 )
  rightChamferFill.target.position.set( 0, 0, 0 )
  scene.add( rightChamferFill, rightChamferFill.target )

  const keyLight = new THREE.DirectionalLight( '#ffe8c2', 1.25 )
  keyLight.position.set( -4.8, 8.8, 5.2 )
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

  const overheadSpot = new THREE.SpotLight( '#fff3da', 5, 24, Math.PI / 3.2, 0.8, 1.3 )
  overheadSpot.position.set( 0, 8.5, -3.2 )
  overheadSpot.target.position.set( 0, 0, -3.2 )
  overheadSpot.castShadow = false
  scene.add( overheadSpot, overheadSpot.target )

  const feltBounce = new THREE.HemisphereLight( '#1c5e45', '#030504', 0.28 )
  scene.add( feltBounce )

  const rimLight = new THREE.DirectionalLight( '#df9654', 0.45 )
  rimLight.position.set( 5.5, 4.8, -7.5 )
  rimLight.target.position.set( 0, 0, -3 )
  scene.add( rimLight, rimLight.target )

  // Post-Processing Pipeline: SSAO + Bloom + Output
  const composer = new EffectComposer( renderer )
  const renderPass = new RenderPass( scene, camera )
  const ssaoPass = new SSAOPass( scene, camera, 1, 1, 32 )
  ssaoPass.kernelRadius = 14
  ssaoPass.minDistance = 0.001
  ssaoPass.maxDistance = 0.18
  const bloomPass = new UnrealBloomPass( new THREE.Vector2( 1, 1 ), 0.025, 0.22, 0.98 )
  const outputPass = new OutputPass()
  composer.addPass( renderPass )
  composer.addPass( ssaoPass )
  composer.addPass( bloomPass )
  composer.addPass( outputPass )

  const resize = () =>
  {
    const width = canvas.clientWidth || window.innerWidth
    const height = canvas.clientHeight || window.innerHeight
    const isMobile = width <= 768 || window.matchMedia( '(pointer: coarse)' ).matches

    // Mobile performance guardrail: bypass heavy SSAO and cap DPR on mobile GPUs
    ssaoPass.enabled = !isMobile
    const pixelRatioCap = isMobile ? 1.5 : 1.75
    const pixelRatio = Math.min( window.devicePixelRatio || 1, pixelRatioCap )

    camera.aspect = width / height
    camera.fov = width / height < 0.8 ? 44 : 38
    camera.updateProjectionMatrix()
    renderer.setPixelRatio( pixelRatio )
    renderer.setSize( width, height, false )
    composer.setPixelRatio( pixelRatio )
    composer.setSize( width, height )
  }

  const render = () => composer.render()

  const dispose = () =>
  {
    scene.traverse( ( object ) =>
    {
      if ( object.geometry ) object.geometry.dispose()
      if ( object.material )
      {
        if ( Array.isArray( object.material ) ) object.material.forEach( ( m ) => m.dispose() )
        else object.material.dispose()
      }
    } )
    disposableMaterials.forEach( ( m ) => m.dispose() )
    composer.dispose()
    environmentTarget.dispose()
    renderer.dispose()
  }

  return {
    camera,
    ballMeshes,
    ballShadows,
    renderer,
    resize,
    render,
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
    let frame = 0
    let isActive = active
    let progress = 0
    let failed = false
    let pointerX = 0
    let pointerY = 0
    let pointerTargetX = 0
    let pointerTargetY = 0
    let resizePending = true
    let destroyed = false
    let renderFrame = () => {}

    // One RAF owns every WebGL repaint; callers only mark the latest state dirty.
    const requestRender = () =>
    {
      if ( destroyed || failed || !world || !isActive || frame ) return
      frame = window.requestAnimationFrame( renderFrame )
    }

    try
    {
      world = buildScene( canvas, simulation, requestRender )
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

      const state = sampleBreakState( progress, simulation )

      if ( phaseLabel )
      {
        phaseLabel.textContent = progress <= 0.04
          ? 'TABLE  /  SET'
          : progress < CINEMATIC_EXIT_START
            ? 'BREAK  /  RUN'
            : progress < CINEMATIC_EXIT_END
              ? 'POCKET  /  CLEAR'
              : 'STUDIO  /  CUT'
      }

      const exitProgress = clamp( ( progress - CINEMATIC_EXIT_START ) / ( CINEMATIC_EXIT_END - CINEMATIC_EXIT_START ) )

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

      // Camera starts locked behind 8-ball and smoothly tracks forward down-table on first swipe as ball rolls and breaks
      const portraitMix = clamp( ( 0.86 - world.camera.aspect ) / 0.36 )
      const trackProgress = clamp( progress / CINEMATIC_EXIT_START )
      const trackEase = trackProgress * trackProgress * ( 3 - 2 * trackProgress )

      const camY = THREE.MathUtils.lerp( 0.78 + portraitMix * 0.45, 1.35 + portraitMix * 0.55, trackEase )
      const camZ = THREE.MathUtils.lerp( 0.5 * PHYSICS_SCALE + 2.05 + portraitMix * 1.2, 1.2 + portraitMix * 1.0, trackEase )
      const targetZ = THREE.MathUtils.lerp( -2.6, -5.4, trackEase )

      cameraPosition.set(
        pointerX * 0.12,
        camY + pointerY * 0.05,
        camZ,
      )
      cameraTarget.set(
        pointerX * 0.05,
        0.18 + pointerY * 0.02,
        targetZ,
      )

      world.camera.position.copy( cameraPosition )
      world.camera.lookAt( cameraTarget )

      // Overall layer fade at chapter exit
      canvas.style.opacity = String( 1 - exitProgress )
    }

    const updateScene = ( nextProgress ) =>
    {
      progress = clamp( nextProgress )
      requestRender()
    }

    const handlePointerMove = ( event ) =>
    {
      if ( !isActive ) return
      pointerTargetX = ( event.clientX / window.innerWidth - 0.5 ) * 2
      pointerTargetY = ( event.clientY / window.innerHeight - 0.5 ) * -2
      requestRender()
    }

    const handleResize = () =>
    {
      resizePending = true
      requestRender()
    }

    // Stop requesting frames when parallax is visually settled; the tolerance avoids sub-pixel churn.
    const pointerSettleTolerance = 0.0015
    renderFrame = () =>
    {
      frame = 0
      if ( destroyed || !isActive || failed || !world ) return

      if ( resizePending )
      {
        world.resize()
        resizePending = false
      }

      pointerX += ( pointerTargetX - pointerX ) * 0.045
      pointerY += ( pointerTargetY - pointerY ) * 0.045
      renderScene()
      world.render()

      const pointerSettled =
        Math.abs( pointerTargetX - pointerX ) <= pointerSettleTolerance &&
        Math.abs( pointerTargetY - pointerY ) <= pointerSettleTolerance
      if ( !pointerSettled ) requestRender()
    }

    const controller = {
      setProgress ( value )
      {
        updateScene( value )
      },
      setActive ( nextActive )
      {
        isActive = nextActive
        root.classList.toggle( 'is-active', nextActive )
        root.setAttribute( 'aria-hidden', String( !nextActive ) )
        if ( !nextActive )
        {
          if ( frame ) window.cancelAnimationFrame( frame )
          frame = 0
          pointerTargetX = 0
          pointerTargetY = 0
          return
        }

        // Activation paints the latest progress on the next frame, then idles again when settled.
        requestRender()
      },
    }

    controllerRef.current = controller
    onController?.( controller )
    controller.setProgress( progress )
    controller.setActive( active )
    if ( world )
    {
      window.addEventListener( 'resize', handleResize )
      window.addEventListener( 'pointermove', handlePointerMove, { passive: true } )
    }

    return () =>
    {
      destroyed = true
      if ( frame ) window.cancelAnimationFrame( frame )
      frame = 0
      if ( world )
      {
        window.removeEventListener( 'resize', handleResize )
        window.removeEventListener( 'pointermove', handlePointerMove )
      }
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
    <div className={ `draft-layer draft-layer-webgl draft-layer-webgl-${variant}` } ref={ rootRef } aria-hidden={ !active }>
      <canvas ref={ canvasRef } className="webgl-pool-canvas" aria-hidden="true" />
      <div className="webgl-vignette" aria-hidden="true" />
      <p className="webgl-phase" aria-hidden="true">TABLE / SET</p>
      <p className="webgl-fallback" role="status">3D draft unavailable on this device. Showing 2.5D draft.</p>
    </div>
  )
}
