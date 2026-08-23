import { useLayoutEffect, useRef } from 'react'
import * as THREE from 'three'
import { DecalGeometry } from 'three/addons/geometries/DecalGeometry.js'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import brandLogo from '../assets/8BALL-V4.jpg'
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

  // Subtle organic micro-stippling prevents flat digital look
  for ( let index = 0; index < 10000; index += 1 )
  {
    const seed = ( index * 48271 ) % 2147483647
    context.fillStyle = index % 2 === 0 ? 'rgba(255, 255, 255, 0.022)' : 'rgba(0, 0, 0, 0.022)'
    context.fillRect( seed % canvas.width, Math.floor( seed / canvas.width ) % canvas.height, 1, 1 )
  }

  const texture = new THREE.CanvasTexture( canvas )
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = anisotropy
  return texture
}

/**
 * Procedural Simonis 860 worsted wool microfiber cloth textures.
 */
const createFeltTextures = () =>
{
  const canvas = document.createElement( 'canvas' )
  const normalCanvas = document.createElement( 'canvas' )
  const roughnessCanvas = document.createElement( 'canvas' )
  canvas.width = 1024
  canvas.height = 1024
  normalCanvas.width = 1024
  normalCanvas.height = 1024
  roughnessCanvas.width = 1024
  roughnessCanvas.height = 1024
  const context = canvas.getContext( '2d' )
  const normalContext = normalCanvas.getContext( '2d' )
  const roughnessContext = roughnessCanvas.getContext( '2d' )

  context.fillStyle = '#0b4a35'
  context.fillRect( 0, 0, canvas.width, canvas.height )
  normalContext.fillStyle = '#8080ff'
  normalContext.fillRect( 0, 0, normalCanvas.width, normalCanvas.height )
  roughnessContext.fillStyle = '#dcdcdc'
  roughnessContext.fillRect( 0, 0, roughnessCanvas.width, roughnessCanvas.height )

  for ( let index = 0; index < 75000; index += 1 )
  {
    const seed = ( index * 16807 ) % 2147483647
    const x = seed % canvas.width
    const y = Math.floor( seed / canvas.width ) % canvas.height
    const length = 1 + ( seed % 5 )
    context.fillStyle = index % 3 === 0 ? 'rgba(122, 195, 152, 0.038)' : 'rgba(0, 10, 6, 0.038)'
    context.fillRect( x, y, length, 1 )
    normalContext.fillStyle = index % 2 === 0 ? 'rgba(125, 138, 246, 0.18)' : 'rgba(138, 122, 249, 0.15)'
    normalContext.fillRect( x, y, length, 1 )
    roughnessContext.fillStyle = index % 4 === 0 ? 'rgba(255, 255, 255, 0.04)' : 'rgba(75, 75, 75, 0.02)'
    roughnessContext.fillRect( x, y, length, 1 )
  }

  const map = new THREE.CanvasTexture( canvas )
  const normalMap = new THREE.CanvasTexture( normalCanvas )
  const roughnessMap = new THREE.CanvasTexture( roughnessCanvas )
  ;[ map, normalMap, roughnessMap ].forEach( ( texture ) =>
  {
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set( 0.07, 0.045 )
    texture.anisotropy = 16
  } )
  map.colorSpace = THREE.SRGBColorSpace
  return { map, normalMap, roughnessMap }
}

/**
 * Hand-rubbed mahogany wood grain textures with pores and clearcoat varnish relief.
 */
const createWoodTextures = () =>
{
  const canvas = document.createElement( 'canvas' )
  const normalCanvas = document.createElement( 'canvas' )
  const bumpCanvas = document.createElement( 'canvas' )
  const roughnessCanvas = document.createElement( 'canvas' )
  canvas.width = 1536
  canvas.height = 512
  normalCanvas.width = 1536
  normalCanvas.height = 512
  bumpCanvas.width = 1536
  bumpCanvas.height = 512
  roughnessCanvas.width = 1536
  roughnessCanvas.height = 512

  const context = canvas.getContext( '2d' )
  const normalContext = normalCanvas.getContext( '2d' )
  const bumpContext = bumpCanvas.getContext( '2d' )
  const roughnessContext = roughnessCanvas.getContext( '2d' )

  const base = context.createLinearGradient( 0, 0, 0, canvas.height )
  base.addColorStop( 0, '#462419' )
  base.addColorStop( 0.46, '#1a0d09' )
  base.addColorStop( 1, '#562b1a' )
  context.fillStyle = base
  context.fillRect( 0, 0, canvas.width, canvas.height )

  normalContext.fillStyle = '#8080ff'
  normalContext.fillRect( 0, 0, normalCanvas.width, normalCanvas.height )
  bumpContext.fillStyle = '#777777'
  bumpContext.fillRect( 0, 0, bumpCanvas.width, bumpCanvas.height )
  roughnessContext.fillStyle = '#8f8f8f'
  roughnessContext.fillRect( 0, 0, roughnessCanvas.width, roughnessCanvas.height )

  for ( let index = 0; index < 78; index += 1 )
  {
    context.beginPath()
    normalContext.beginPath()
    bumpContext.beginPath()
    roughnessContext.beginPath()
    context.lineWidth = 1 + ( index % 4 )
    normalContext.lineWidth = context.lineWidth
    bumpContext.lineWidth = context.lineWidth
    roughnessContext.lineWidth = 1 + ( index % 2 )

    context.strokeStyle = index % 2 === 0 ? 'rgba(215, 134, 76, 0.21)' : 'rgba(6, 3, 2, 0.3)'
    normalContext.strokeStyle = index % 2 === 0 ? 'rgba(126, 138, 246, 0.28)' : 'rgba(138, 122, 249, 0.3)'
    bumpContext.strokeStyle = index % 2 === 0 ? 'rgba(225, 225, 225, 0.15)' : 'rgba(25, 25, 25, 0.18)'
    roughnessContext.strokeStyle = index % 3 === 0 ? 'rgba(225, 225, 225, 0.12)' : 'rgba(25, 25, 25, 0.06)'

    for ( let x = 0; x <= canvas.width; x += 16 )
    {
      const y = index * 7 + Math.sin( x * 0.012 + index ) * 7 + Math.sin( x * 0.038 ) * 2.2
      if ( x === 0 )
      {
        context.moveTo( x, y )
        normalContext.moveTo( x, y )
        bumpContext.moveTo( x, y )
        roughnessContext.moveTo( x, y )
      }
      else
      {
        context.lineTo( x, y )
        normalContext.lineTo( x, y )
        bumpContext.lineTo( x, y )
        roughnessContext.lineTo( x, y )
      }
    }
    context.stroke()
    normalContext.stroke()
    bumpContext.stroke()
    roughnessContext.stroke()
  }

  const map = new THREE.CanvasTexture( canvas )
  const normalMap = new THREE.CanvasTexture( normalCanvas )
  const bumpMap = new THREE.CanvasTexture( bumpCanvas )
  const roughnessMap = new THREE.CanvasTexture( roughnessCanvas )
  ;[ map, normalMap, bumpMap, roughnessMap ].forEach( ( texture ) =>
  {
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set( 1.4, 2 )
    texture.anisotropy = 16
  } )
  map.colorSpace = THREE.SRGBColorSpace
  return { map, normalMap, bumpMap, roughnessMap }
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

const createLeatherTextures = () =>
{
  const canvas = document.createElement( 'canvas' )
  const bumpCanvas = document.createElement( 'canvas' )
  canvas.width = 512
  canvas.height = 512
  bumpCanvas.width = 512
  bumpCanvas.height = 512
  const context = canvas.getContext( '2d' )
  const bumpContext = bumpCanvas.getContext( '2d' )
  context.fillStyle = '#141310'
  context.fillRect( 0, 0, 512, 512 )
  bumpContext.fillStyle = '#777777'
  bumpContext.fillRect( 0, 0, 512, 512 )

  for ( let index = 0; index < 20000; index += 1 )
  {
    const seed = ( index * 40699 ) % 2147483647
    const x = seed % 512
    const y = Math.floor( seed / 512 ) % 512
    context.fillStyle = index % 3 === 0 ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.075)'
    context.fillRect( x, y, 1 + seed % 2, 1 + seed % 2 )
    bumpContext.fillStyle = index % 2 === 0 ? 'rgba(215, 215, 215, 0.12)' : 'rgba(25, 25, 25, 0.13)'
    bumpContext.fillRect( x, y, 1, 1 )
  }

  const map = new THREE.CanvasTexture( canvas )
  const bumpMap = new THREE.CanvasTexture( bumpCanvas )
  ;[ map, bumpMap ].forEach( ( texture ) =>
  {
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set( 3, 3 )
    texture.anisotropy = 8
  } )
  map.colorSpace = THREE.SRGBColorSpace
  return { map, bumpMap }
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

const buildScene = ( canvas, simulation ) =>
{
  const scene = new THREE.Scene()
  scene.background = new THREE.Color( '#040605' )
  scene.fog = new THREE.FogExp2( '#040605', 0.018 )

  const camera = new THREE.PerspectiveCamera( 42, 1, 0.1, 100 )
  camera.position.set( 0, 3.5, 11.5 )

  const renderer = new THREE.WebGLRenderer( {
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  } )
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.02
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap

  const maxAnisotropy = Math.min( 16, renderer.capabilities.getMaxAnisotropy() )
  const environmentTarget = createWarmStudioEnvironment( renderer )
  scene.environment = environmentTarget.texture
  scene.environmentIntensity = 0.75

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
  const floor = new THREE.Mesh( new THREE.PlaneGeometry( 44, 54 ), floorMaterial )
  floor.rotation.x = -Math.PI / 2
  floor.position.set( 0, -1.18, -4 )
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

  // Simonis 860 worsted wool cloth with grazing sheen
  const feltTextures = createFeltTextures()
  const feltMaterial = new THREE.MeshPhysicalMaterial( {
    map: feltTextures.map,
    normalMap: feltTextures.normalMap,
    normalScale: new THREE.Vector2( 0.06, 0.06 ),
    roughnessMap: feltTextures.roughnessMap,
    roughness: 0.82,
    metalness: 0,
    sheen: 0.85,
    sheenRoughness: 0.38,
    sheenColor: new THREE.Color( '#2fb376' ),
    color: '#0d4230',
    clearcoat: 0.04,
    clearcoatRoughness: 0.45,
  } )
  const felt = new THREE.Mesh( createFeltGeometry(), feltMaterial )
  felt.receiveShadow = true
  table.add( felt )

  // Warm hand-rubbed mahogany rails and apron
  const woodTextures = createWoodTextures()
  const railMaterial = new THREE.MeshPhysicalMaterial( {
    map: woodTextures.map,
    normalMap: woodTextures.normalMap,
    normalScale: new THREE.Vector2( 0.35, 0.35 ),
    bumpMap: woodTextures.bumpMap,
    bumpScale: 0.018,
    roughnessMap: woodTextures.roughnessMap,
    color: '#8b4c32',
    roughness: 0.22,
    clearcoat: 0.78,
    clearcoatRoughness: 0.08,
    ior: 1.52,
    envMapIntensity: 0.95,
  } )
  const apronMaterial = new THREE.MeshPhysicalMaterial( {
    map: woodTextures.map,
    normalMap: woodTextures.normalMap,
    normalScale: new THREE.Vector2( 0.42, 0.42 ),
    bumpMap: woodTextures.bumpMap,
    bumpScale: 0.024,
    roughnessMap: woodTextures.roughnessMap,
    color: '#3d2117',
    roughness: 0.36,
    clearcoat: 0.5,
    clearcoatRoughness: 0.12,
    envMapIntensity: 0.75,
  } )
  const cushionMaterial = new THREE.MeshPhysicalMaterial( {
    map: feltTextures.map,
    color: '#3f9a72',
    roughnessMap: feltTextures.roughnessMap,
    roughness: 0.72,
    clearcoat: 0.06,
    clearcoatRoughness: 0.45,
    normalMap: feltTextures.normalMap,
    normalScale: new THREE.Vector2( 0.1, 0.1 ),
  } )

  addRoundedBox( table, [ 10.75, 0.72, 20.55 ], [ 0, -0.42, 0 ], apronMaterial, 0.14 )
  ;[ -10.0, 10.0 ].forEach( ( z ) =>
  {
    addRoundedBox( table, [ 7.3, 0.48, 0.54 ], [ 0, 0.22, z ], railMaterial, 0.1 )
    addRoundedBox( table, [ 0.26, 0.48, 0.54 ], [ -4.78, 0.22, z ], railMaterial, 0.08 )
    addRoundedBox( table, [ 0.26, 0.48, 0.54 ], [ 4.78, 0.22, z ], railMaterial, 0.08 )
    addRoundedBox( table, [ 7.2, 0.2, 0.38 ], [ 0, 0.48, z * 0.968 ], cushionMaterial, 0.08 )
  } )
  ;[ -4.96, 4.96 ].forEach( ( x ) =>
  {
    addRoundedBox( table, [ 0.38, 0.48, 19.45 ], [ x, 0.22, 0 ], railMaterial, 0.1 )
    addRoundedBox( table, [ 0.38, 0.2, 7.6 ], [ x * 0.923, 0.48, -4.8 ], cushionMaterial, 0.08 )
    addRoundedBox( table, [ 0.38, 0.2, 7.6 ], [ x * 0.923, 0.48, 4.8 ], cushionMaterial, 0.08 )
  } )

  // Pocket geometry & leather rims
  const leatherTextures = createLeatherTextures()
  const pocketWallMaterial = new THREE.MeshPhysicalMaterial( {
    map: leatherTextures.map,
    bumpMap: leatherTextures.bumpMap,
    bumpScale: 0.035,
    color: '#161512',
    roughness: 0.88,
    metalness: 0,
    side: THREE.DoubleSide,
  } )
  const pocketBottomMaterial = new THREE.MeshPhysicalMaterial( {
    color: '#000000',
    roughness: 1,
    metalness: 0,
  } )
  POCKET_POSITIONS.forEach( ( [ x, z ] ) =>
  {
    const cup = new THREE.Mesh(
      new THREE.CylinderGeometry( POCKET_RADIUS * 0.92, 0.22, 0.78, 64, 12, true ),
      pocketWallMaterial,
    )
    cup.position.set( x, -0.34, z )
    cup.receiveShadow = true
    table.add( cup )

    const bottom = new THREE.Mesh( new THREE.CircleGeometry( 0.26, 48 ), pocketBottomMaterial )
    bottom.rotation.x = -Math.PI / 2
    bottom.position.set( x, -0.75, z )
    bottom.receiveShadow = true
    table.add( bottom )

    const bowl = new THREE.Mesh(
      new THREE.SphereGeometry( POCKET_RADIUS * 0.86, 64, 32, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2 ),
      pocketBottomMaterial,
    )
    bowl.scale.y = 1.45
    bowl.position.set( x, -0.06, z )
    bowl.receiveShadow = true
    table.add( bowl )

    const liner = new THREE.Mesh(
      new THREE.TorusGeometry( POCKET_RADIUS * 0.84, 0.075, 18, 64 ),
      pocketWallMaterial,
    )
    liner.rotation.x = Math.PI / 2
    liner.position.set( x, 0.025, z )
    liner.castShadow = true
    liner.receiveShadow = true
    table.add( liner )
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
  const logoTexture = createLogoTexture( maxAnisotropy )
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

  // Maple Cue Stick with brass joint and chalked tip
  const cueWoodMaterial = new THREE.MeshPhysicalMaterial( {
    color: '#d5a260',
    roughness: 0.28,
    clearcoat: 0.6,
    clearcoatRoughness: 0.12,
  } )
  const cueDarkMaterial = new THREE.MeshPhysicalMaterial( {
    color: '#15120f',
    roughness: 0.3,
    clearcoat: 0.55,
    clearcoatRoughness: 0.14,
  } )
  const cueMetalMaterial = new THREE.MeshPhysicalMaterial( {
    color: '#b88b4d',
    metalness: 0.65,
    roughness: 0.2,
    clearcoat: 0.4,
  } )
  const cueChalkMaterial = new THREE.MeshPhysicalMaterial( {
    color: '#6ba995',
    roughness: 0.84,
    clearcoat: 0.06,
  } )
  const cueGroup = new THREE.Group()
  const addCueCylinder = ( geometry, material, z ) =>
  {
    const part = new THREE.Mesh( geometry, material )
    part.rotation.x = Math.PI / 2
    part.position.z = z
    part.castShadow = true
    cueGroup.add( part )
    return part
  }
  addCueCylinder( new THREE.CylinderGeometry( 0.035, 0.058, 5.9, 32 ), cueWoodMaterial, 3.0 )
  addCueCylinder( new THREE.CylinderGeometry( 0.058, 0.092, 1.15, 32 ), cueDarkMaterial, 5.95 )
  addCueCylinder( new THREE.CylinderGeometry( 0.06, 0.06, 0.14, 32 ), cueMetalMaterial, 0.12 )
  addCueCylinder( new THREE.CylinderGeometry( 0.04, 0.04, 0.14, 32 ), cueChalkMaterial, 0.03 )
  table.add( cueGroup )
  const cueMaterials = [ cueWoodMaterial, cueDarkMaterial, cueMetalMaterial, cueChalkMaterial ]
  cueMaterials.forEach( ( material ) => { material.transparent = true } )

  // Lighting Rig: Key Light + Overhead Soft Spotlight + Green Felt Bounce + Rim Light
  const keyLight = new THREE.DirectionalLight( '#ffe8c2', 3.4 )
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
  keyLight.shadow.bias = -0.00012
  keyLight.shadow.normalBias = 0.02
  scene.add( keyLight, keyLight.target )

  const overheadSpot = new THREE.SpotLight( '#fff3da', 16, 24, Math.PI / 3.2, 0.8, 1.3 )
  overheadSpot.position.set( 0, 8.5, -3.2 )
  overheadSpot.target.position.set( 0, 0, -3.2 )
  overheadSpot.castShadow = false
  scene.add( overheadSpot, overheadSpot.target )

  const feltBounce = new THREE.HemisphereLight( '#1c5e45', '#030504', 0.68 )
  scene.add( feltBounce )

  const rimLight = new THREE.DirectionalLight( '#df9654', 1.8 )
  rimLight.position.set( 5.5, 4.8, -7.5 )
  rimLight.target.position.set( 0, 0, -3 )
  scene.add( rimLight, rimLight.target )

  // Post-Processing Pipeline: SSAO + Bloom + Output
  const composer = new EffectComposer( renderer )
  const renderPass = new RenderPass( scene, camera )
  const ssaoPass = new SSAOPass( scene, camera, 1, 1, 32 )
  ssaoPass.kernelRadius = 12
  ssaoPass.minDistance = 0.002
  ssaoPass.maxDistance = 0.16
  const bloomPass = new UnrealBloomPass( new THREE.Vector2( 1, 1 ), 0.08, 0.28, 0.94 )
  const outputPass = new OutputPass()
  composer.addPass( renderPass )
  composer.addPass( ssaoPass )
  composer.addPass( bloomPass )
  composer.addPass( outputPass )

  const resize = () =>
  {
    const width = canvas.clientWidth || window.innerWidth
    const height = canvas.clientHeight || window.innerHeight
    const pixelRatio = Math.min( window.devicePixelRatio || 1, 1.75 )
    camera.aspect = width / height
    camera.fov = width / height < 0.8 ? 46 : 41
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
    cueGroup,
    cueMaterials,
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
    let introProgress = active ? 0 : 1
    let introStartedAt = performance.now()
    let pointerX = 0
    let pointerY = 0
    let pointerTargetX = 0
    let pointerTargetY = 0

    try
    {
      world = buildScene( canvas, simulation )
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
    const introCameraPosition = new THREE.Vector3()
    const introCameraTarget = new THREE.Vector3( 0, BALL_RADIUS, 0.5 * PHYSICS_SCALE )

    const renderScene = () =>
    {
      if ( failed || !world ) return

      const state = sampleBreakState( progress, simulation )

      if ( phaseLabel )
      {
        phaseLabel.textContent = progress <= 0.04
          ? 'TABLE  /  SET'
          : progress <= 0.52
            ? 'CUE  /  READY'
            : progress < CINEMATIC_EXIT_START
              ? 'BREAK  /  RUN'
              : progress < CINEMATIC_EXIT_END
                ? 'POCKET  /  CLEAR'
                : 'STUDIO  /  CUT'
      }

      const aimProgress = clamp( progress / 0.52 )
      const aimEase = aimProgress * aimProgress * ( 3 - 2 * aimProgress )
      const exitProgress = clamp( ( progress - CINEMATIC_EXIT_START ) / ( CINEMATIC_EXIT_END - CINEMATIC_EXIT_START ) )
      const cameraProgress = clamp( progress / 0.9 )

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

      // Cue stick strike choreography
      const cueBallMesh = world.ballMeshes[ 0 ]
      if ( cueBallMesh )
      {
        world.cueGroup.visible = progress > 0.015 && progress < 0.82
        const cueStartX = -3.2
        const cueStartZ = 0.5 * PHYSICS_SCALE + 2.2
        const cueAimX = cueBallMesh.position.x
        const cueAimZ = cueBallMesh.position.z + 0.35
        const strikeOffset = progress > 0.52 ? Math.sin( ( progress - 0.52 ) / 0.08 * Math.PI ) * 0.45 : 0
        const cueRecoil = progress > 0.56 ? ( progress - 0.56 ) * 1.8 : 0

        world.cueGroup.position.x = lerp( cueStartX, cueAimX, aimEase )
        world.cueGroup.position.y = BALL_RADIUS + 0.02
        world.cueGroup.position.z = lerp( cueStartZ, cueAimZ, aimEase ) - strikeOffset + cueRecoil
        world.cueGroup.rotation.y = lerp( 0.28, 0.012, aimEase )
        world.cueGroup.rotation.z = lerp( -0.06, 0.004, aimEase )
        world.cueMaterials.forEach( ( material ) =>
        {
          material.opacity = ( 1 - exitProgress ) * ( progress > 0.65 ? Math.max( 0, 1 - ( progress - 0.65 ) * 4 ) : 1 )
        } )
      }

      // Smooth camera perspective with pointer parallax
      const portraitMix = clamp( ( 0.86 - world.camera.aspect ) / 0.36 )
      cameraPosition.set(
        pointerX * 0.16,
        THREE.MathUtils.lerp( 3.5, 3.1, cameraProgress ) + portraitMix * 1.05 + pointerY * 0.08,
        THREE.MathUtils.lerp( 11.5, 10.2, cameraProgress ) + portraitMix * 3.4,
      )
      cameraTarget.set(
        pointerX * 0.08,
        0.18 + pointerY * 0.03,
        THREE.MathUtils.lerp( -1.5, -4.5, cameraProgress ),
      )

      const introEase = introProgress * introProgress * ( 3 - 2 * introProgress )
      introCameraPosition.set( 0, 0.72 + portraitMix * 0.6, 0.5 * PHYSICS_SCALE + 2.1 + portraitMix * 1.6 )
      world.camera.position.lerpVectors( introCameraPosition, cameraPosition, introEase )
      cameraTarget.lerpVectors( introCameraTarget, cameraTarget, introEase )
      world.camera.lookAt( cameraTarget )

      // Overall layer fade at chapter exit
      canvas.style.opacity = String( 1 - exitProgress )
    }

    const loop = ( time ) =>
    {
      if ( !isActive || failed )
      {
        frame = 0
        return
      }

      if ( introProgress < 1 ) introProgress = clamp( ( time - introStartedAt ) / 1750 )
      pointerX += ( pointerTargetX - pointerX ) * 0.045
      pointerY += ( pointerTargetY - pointerY ) * 0.045
      renderScene()
      world.render()
      frame = window.requestAnimationFrame( loop )
    }

    const updateScene = ( nextProgress ) =>
    {
      progress = clamp( nextProgress )
      if ( failed || !world ) return
      renderScene()
      world.render()
    }

    const handlePointerMove = ( event ) =>
    {
      if ( !isActive ) return
      pointerTargetX = ( event.clientX / window.innerWidth - 0.5 ) * 2
      pointerTargetY = ( event.clientY / window.innerHeight - 0.5 ) * -2
    }

    const handleResize = () =>
    {
      world?.resize()
      renderScene()
      world?.render()
    }

    const startLoop = () =>
    {
      if ( !isActive || failed || frame ) return
      frame = window.requestAnimationFrame( loop )
    }

    const controller = {
      setProgress ( value )
      {
        const wasPastOpening = progress > 0.03
        updateScene( value )
        if ( isActive && wasPastOpening && progress <= 0.002 )
        {
          introProgress = 0
          introStartedAt = performance.now()
        }
      },
      setActive ( nextActive )
      {
        const wasActive = isActive
        isActive = nextActive
        root.classList.toggle( 'is-active', nextActive )
        root.setAttribute( 'aria-hidden', String( !nextActive ) )
        if ( nextActive )
        {
          if ( !wasActive && progress < 0.03 )
          {
            introProgress = 0
            introStartedAt = performance.now()
          }
          startLoop()
        }
        else if ( frame )
        {
          window.cancelAnimationFrame( frame )
          frame = 0
          pointerTargetX = 0
          pointerTargetY = 0
        }
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
    world?.resize()
    updateScene( progress )

    return () =>
    {
      if ( frame ) window.cancelAnimationFrame( frame )
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
