import { useLayoutEffect, useRef } from "react"
import * as THREE from "three"
import { DecalGeometry } from "three/addons/geometries/DecalGeometry.js"
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js"
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js"
import { OutputPass } from "three/addons/postprocessing/OutputPass.js"
import { RenderPass } from "three/addons/postprocessing/RenderPass.js"
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js"
import brandLogo from "../assets/8BALL-V4.jpg"
import { STORY_TIMING } from "../storyTiming"
import {
  getBreakSimulation,
  sampleDraft2BreakState,
} from "./poolBreakPhysics"
import {
  createPointerParallax,
  DRAFT2_SCENE_SCALE,
  resolveIntroCameraFraming,
} from "./cameraFraming"
import { createDemandFrameScheduler } from "./demandFrameScheduler"

RectAreaLightUniformsLib.init()

const DRAFT4_QUALITY_TIERS = Object.freeze( {
  high: Object.freeze( {
    id: "high",
    pixelRatioCap: 1.5,
    shadowMapSize: 2048,
    useSsao: false,
    renderBudgetMs: 20,
  } ),
  standard: Object.freeze( {
    id: "standard",
    pixelRatioCap: 1.25,
    shadowMapSize: 1024,
    useSsao: false,
    renderBudgetMs: 24,
  } ),
  low: Object.freeze( {
    id: "low",
    pixelRatioCap: 1.0,
    shadowMapSize: 512,
    useSsao: false,
    renderBudgetMs: 32,
  } ),
} )

const TABLE_WIDTH = 9.8
const TABLE_LENGTH = 19.6
const POCKET_RADIUS = 0.52
// Radius proportional to physical ball radius scaled into scene units (0.035m * 7.559 ~ 0.2646)
const BALL_RADIUS = 0.035 * DRAFT2_SCENE_SCALE

const BALL_COLORS = Object.freeze( [
  "#f5c518", "#0047bb", "#e53935", "#5b2c86", "#f26522", "#1b5e20", "#7b1113",
  "#0b0b0d",
  "#f5c518", "#0047bb", "#e53935", "#5b2c86", "#f26522", "#1b5e20", "#7b1113",
] )

const POCKET_POSITIONS = Object.freeze( [
  [ -TABLE_WIDTH / 2 + 0.15, -TABLE_LENGTH / 2 + 0.15 ],
  [ TABLE_WIDTH / 2 - 0.15, -TABLE_LENGTH / 2 + 0.15 ],
  [ -TABLE_WIDTH / 2 + 0.05, 0 ],
  [ TABLE_WIDTH / 2 - 0.05, 0 ],
  [ -TABLE_WIDTH / 2 + 0.15, TABLE_LENGTH / 2 - 0.15 ],
  [ TABLE_WIDTH / 2 - 0.15, TABLE_LENGTH / 2 - 0.15 ],
] )

// Procedural pre-weave worsted wool microfiber cloth textures from commit 1b9d299.
const createFeltTextures = () =>
{
  const canvas = document.createElement( "canvas" )
  const normalCanvas = document.createElement( "canvas" )
  const roughnessCanvas = document.createElement( "canvas" )
  canvas.width = 1024
  canvas.height = 1024
  normalCanvas.width = 1024
  normalCanvas.height = 1024
  roughnessCanvas.width = 1024
  roughnessCanvas.height = 1024
  const context = canvas.getContext( "2d" )
  const normalContext = normalCanvas.getContext( "2d" )
  const roughnessContext = roughnessCanvas.getContext( "2d" )

  context.fillStyle = "#0b4a35"
  context.fillRect( 0, 0, canvas.width, canvas.height )
  normalContext.fillStyle = "#8080ff"
  normalContext.fillRect( 0, 0, normalCanvas.width, normalCanvas.height )
  roughnessContext.fillStyle = "#dcdcdc"
  roughnessContext.fillRect( 0, 0, roughnessCanvas.width, roughnessCanvas.height )

  for ( let index = 0; index < 75000; index += 1 )
  {
    const seed = ( index * 16807 ) % 2147483647
    const x = seed % canvas.width
    const y = Math.floor( seed / canvas.width ) % canvas.height
    const length = 1 + ( seed % 5 )
    context.fillStyle = index % 3 === 0 ? "rgba(122, 195, 152, 0.038)" : "rgba(0, 10, 6, 0.038)"
    context.fillRect( x, y, length, 1 )
    normalContext.fillStyle = index % 2 === 0 ? "rgba(125, 138, 246, 0.18)" : "rgba(138, 122, 249, 0.15)"
    normalContext.fillRect( x, y, length, 1 )
    roughnessContext.fillStyle = index % 4 === 0 ? "rgba(255, 255, 255, 0.04)" : "rgba(75, 75, 75, 0.02)"
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

// Hand-rubbed warm mahogany wood grain textures from commit 1b9d299.
const createWoodTextures = () =>
{
  const canvas = document.createElement( "canvas" )
  const normalCanvas = document.createElement( "canvas" )
  const bumpCanvas = document.createElement( "canvas" )
  const roughnessCanvas = document.createElement( "canvas" )
  canvas.width = 1536
  canvas.height = 512
  normalCanvas.width = 1536
  normalCanvas.height = 512
  bumpCanvas.width = 1536
  bumpCanvas.height = 512
  roughnessCanvas.width = 1536
  roughnessCanvas.height = 512

  const context = canvas.getContext( "2d" )
  const normalContext = normalCanvas.getContext( "2d" )
  const bumpContext = bumpCanvas.getContext( "2d" )
  const roughnessContext = roughnessCanvas.getContext( "2d" )

  const base = context.createLinearGradient( 0, 0, 0, canvas.height )
  base.addColorStop( 0, "#462419" )
  base.addColorStop( 0.46, "#1a0d09" )
  base.addColorStop( 1, "#562b1a" )
  context.fillStyle = base
  context.fillRect( 0, 0, canvas.width, canvas.height )

  normalContext.fillStyle = "#8080ff"
  normalContext.fillRect( 0, 0, normalCanvas.width, normalCanvas.height )
  bumpContext.fillStyle = "#777777"
  bumpContext.fillRect( 0, 0, bumpCanvas.width, bumpCanvas.height )
  roughnessContext.fillStyle = "#8f8f8f"
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

    context.strokeStyle = index % 2 === 0 ? "rgba(215, 134, 76, 0.21)" : "rgba(6, 3, 2, 0.3)"
    normalContext.strokeStyle = index % 2 === 0 ? "rgba(126, 138, 246, 0.28)" : "rgba(138, 122, 249, 0.3)"
    bumpContext.strokeStyle = index % 2 === 0 ? "rgba(225, 225, 225, 0.15)" : "rgba(25, 25, 25, 0.18)"
    roughnessContext.strokeStyle = index % 3 === 0 ? "rgba(225, 225, 225, 0.12)" : "rgba(25, 25, 25, 0.06)"

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

// Dark leather texture for classic pockets from commit 1b9d299.
const createLeatherTextures = () =>
{
  const canvas = document.createElement( "canvas" )
  const bumpCanvas = document.createElement( "canvas" )
  canvas.width = 512
  canvas.height = 512
  bumpCanvas.width = 512
  bumpCanvas.height = 512
  const context = canvas.getContext( "2d" )
  const bumpContext = bumpCanvas.getContext( "2d" )
  context.fillStyle = "#141310"
  context.fillRect( 0, 0, 512, 512 )
  bumpContext.fillStyle = "#777777"
  bumpContext.fillRect( 0, 0, 512, 512 )

  for ( let index = 0; index < 20000; index += 1 )
  {
    const seed = ( index * 40699 ) % 2147483647
    const x = seed % 512
    const y = Math.floor( seed / 512 ) % 512
    context.fillStyle = index % 3 === 0 ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.075)"
    context.fillRect( x, y, 1 + seed % 2, 1 + seed % 2 )
    bumpContext.fillStyle = index % 2 === 0 ? "rgba(215, 215, 215, 0.12)" : "rgba(25, 25, 25, 0.13)"
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

// Soft contact shadow gradient texture.
const createContactShadowTexture = () =>
{
  const canvas = document.createElement( "canvas" )
  canvas.width = 128
  canvas.height = 128
  const context = canvas.getContext( "2d" )
  const gradient = context.createRadialGradient( 64, 64, 0, 64, 64, 64 )
  gradient.addColorStop( 0, "rgba(0, 0, 0, 0.95)" )
  gradient.addColorStop( 0.28, "rgba(0, 0, 0, 0.8)" )
  gradient.addColorStop( 0.62, "rgba(0, 0, 0, 0.25)" )
  gradient.addColorStop( 1, "rgba(0, 0, 0, 0)" )
  context.fillStyle = gradient
  context.fillRect( 0, 0, 128, 128 )
  return new THREE.CanvasTexture( canvas )
}

// Numbered pool ball canvas texture generation with vector numerals and rings.
const createNumberedBallTexture = ( number, color, anisotropy ) =>
{
  const canvas = document.createElement( "canvas" )
  canvas.width = 1024
  canvas.height = 512
  const context = canvas.getContext( "2d" )
  const isStripe = number > 8

  context.fillStyle = isStripe ? "#f3eee2" : color
  context.fillRect( 0, 0, canvas.width, canvas.height )

  if ( isStripe )
  {
    context.fillStyle = color
    context.fillRect( 0, 120, canvas.width, 272 )
  }

  ;[ canvas.width * 0.25, canvas.width * 0.75 ].forEach( ( centerX ) =>
  {
    context.fillStyle = "#f8f4ea"
    context.beginPath()
    context.arc( centerX, 256, 76, 0, Math.PI * 2 )
    context.fill()

    context.fillStyle = "#111214"
    context.font = "bold 84px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    context.textAlign = "center"
    context.textBaseline = "middle"
    context.fillText( String( number ), centerX, 260 )
    if ( number === 6 || number === 9 )
    {
      context.fillRect( centerX - 24, 302, 48, 6 )
    }
  } )

  const texture = new THREE.CanvasTexture( canvas )
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = anisotropy
  return texture
}

const createBallMaterial = ( color, texture ) => new THREE.MeshPhysicalMaterial( {
  color: texture ? "#ffffff" : color,
  map: texture,
  roughness: 0.055,
  metalness: 0,
  clearcoat: 1.0,
  clearcoatRoughness: 0.028,
  ior: 1.54,
  reflectivity: 0.84,
  envMapIntensity: 0.85,
} )

const createLogoTexture = ( anisotropy, requestRender ) =>
{
  const canvas = document.createElement( "canvas" )
  canvas.width = 512
  canvas.height = 512
  const context = canvas.getContext( "2d" )
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

  image.addEventListener( "load", paint, { once: true } )
  image.src = brandLogo
  if ( image.complete ) paint()
  return texture
}

const createWarmStudioEnvironment = ( renderer ) =>
{
  const environmentScene = new THREE.Scene()
  environmentScene.background = new THREE.Color( "#040504" )
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

  addCard( new THREE.PlaneGeometry( 16, 26 ), "#fff6df", 2.8, [ 0, 14, 0 ], [ 0, 0, 0 ] )
  addCard( new THREE.PlaneGeometry( 10, 20 ), "#ffcf90", 1.2, [ -14, 8, 2 ], [ 0, 0, 0 ] )
  addCard( new THREE.PlaneGeometry( 10, 20 ), "#c8e2d4", 0.8, [ 14, 8, -2 ], [ 0, 0, 0 ] )
  addCard( new THREE.PlaneGeometry( 20, 30 ), "#184f39", 0.35, [ 0, -5, 0 ], [ 0, 0, 0 ] )

  const pmremGenerator = new THREE.PMREMGenerator( renderer )
  pmremGenerator.compileEquirectangularShader()
  const renderTarget = pmremGenerator.fromScene( environmentScene, 0.04 )
  pmremGenerator.dispose()
  resources.forEach( ( res ) => res.dispose?.() )
  return renderTarget
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
    hole.absarc( x, z, POCKET_RADIUS, 0, Math.PI * 2, true )
    shape.holes.push( hole )
  } )

  const geometry = new THREE.ShapeGeometry( shape, 24 )
  geometry.rotateX( -Math.PI / 2 )
  return geometry
}

const addRoundedBox = ( group, size, position, material, radius = 0.06 ) =>
{
  const geometry = new RoundedBoxGeometry( size[ 0 ], size[ 1 ], size[ 2 ], 3, radius )
  const mesh = new THREE.Mesh( geometry, material )
  mesh.position.set( ...position )
  mesh.castShadow = true
  mesh.receiveShadow = true
  group.add( mesh )
  return { mesh, geometry }
}

const buildClassicScene = ( canvas, simulation, onTextureReady, onQualityState ) =>
{
  const disposableGeometries = new Set()
  const disposableMaterials = new Set()
  const disposableTextures = new Set()

  const renderer = new THREE.WebGLRenderer( {
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
    stencil: false,
    depth: true,
  } )
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.15
  renderer.shadowMap.enabled = true
  // Soft percentage-closer filtering to eliminate harsh pixelated shadow edges.
  renderer.shadowMap.type = THREE.PCFSoftShadowMap

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera( 42, 1, 0.1, 80 )

  const envTarget = createWarmStudioEnvironment( renderer )
  scene.environment = envTarget.texture
  scene.environmentIntensity = 0.72

  const table = new THREE.Group()
  scene.add( table )

  // Procedural 1b9d299 felt textures (fiber wool)
  const feltTextures = createFeltTextures()
  ;[ feltTextures.map, feltTextures.normalMap, feltTextures.roughnessMap ].forEach( ( t ) => disposableTextures.add( t ) )
  const feltGeometry = createFeltGeometry()
  disposableGeometries.add( feltGeometry )
  const feltMaterial = new THREE.MeshPhysicalMaterial( {
    map: feltTextures.map,
    normalMap: feltTextures.normalMap,
    normalScale: new THREE.Vector2( 0.06, 0.06 ),
    roughnessMap: feltTextures.roughnessMap,
    roughness: 0.82,
    metalness: 0,
    sheen: 0.85,
    sheenRoughness: 0.38,
    sheenColor: new THREE.Color( "#2fb376" ),
    color: "#0d4230",
    clearcoat: 0,
  } )
  disposableMaterials.add( feltMaterial )
  const felt = new THREE.Mesh( feltGeometry, feltMaterial )
  felt.receiveShadow = true
  table.add( felt )

  // Procedural 1b9d299 mahogany rails & apron
  const woodTextures = createWoodTextures()
  ;[ woodTextures.map, woodTextures.normalMap, woodTextures.bumpMap, woodTextures.roughnessMap ].forEach( ( t ) => disposableTextures.add( t ) )
  const railMaterial = new THREE.MeshPhysicalMaterial( {
    map: woodTextures.map,
    normalMap: woodTextures.normalMap,
    normalScale: new THREE.Vector2( 0.35, 0.35 ),
    bumpMap: woodTextures.bumpMap,
    bumpScale: 0.018,
    roughnessMap: woodTextures.roughnessMap,
    color: "#8b4c32",
    roughness: 0.22,
    clearcoat: 0.78,
    clearcoatRoughness: 0.12,
  } )
  disposableMaterials.add( railMaterial )

  const cushionMaterial = new THREE.MeshPhysicalMaterial( {
    map: feltTextures.map,
    color: "#3f9a72",
    roughnessMap: feltTextures.roughnessMap,
    roughness: 0.72,
    clearcoat: 0.06,
    clearcoatRoughness: 0.45,
    normalMap: feltTextures.normalMap,
    normalScale: new THREE.Vector2( 0.1, 0.1 ),
  } )
  disposableMaterials.add( cushionMaterial )

  ;[ -9.75, 9.75 ].forEach( ( z ) =>
  {
    const { geometry: g1 } = addRoundedBox( table, [ 9.9, 0.48, 0.38 ], [ 0, 0.22, z ], railMaterial, 0.1 )
    const { geometry: g2 } = addRoundedBox( table, [ 7.2, 0.2, 0.38 ], [ 0, 0.48, z * 0.968 ], cushionMaterial, 0.08 )
    disposableGeometries.add( g1 )
    disposableGeometries.add( g2 )
  } )
  ;[ -4.96, 4.96 ].forEach( ( x ) =>
  {
    const { geometry: g1 } = addRoundedBox( table, [ 0.38, 0.48, 19.45 ], [ x, 0.22, 0 ], railMaterial, 0.1 )
    const { geometry: g2 } = addRoundedBox( table, [ 0.38, 0.2, 7.6 ], [ x * 0.923, 0.48, -4.8 ], cushionMaterial, 0.08 )
    const { geometry: g3 } = addRoundedBox( table, [ 0.38, 0.2, 7.6 ], [ x * 0.923, 0.48, 4.8 ], cushionMaterial, 0.08 )
    disposableGeometries.add( g1 )
    disposableGeometries.add( g2 )
    disposableGeometries.add( g3 )
  } )

  // Procedural 1b9d299 leather pockets
  const leatherTextures = createLeatherTextures()
  ;[ leatherTextures.map, leatherTextures.bumpMap ].forEach( ( t ) => disposableTextures.add( t ) )
  const pocketWallMaterial = new THREE.MeshPhysicalMaterial( {
    map: leatherTextures.map,
    bumpMap: leatherTextures.bumpMap,
    bumpScale: 0.035,
    color: "#161512",
    roughness: 0.88,
    metalness: 0,
    side: THREE.DoubleSide,
  } )
  disposableMaterials.add( pocketWallMaterial )

  const pocketWallGeometry = new THREE.CylinderGeometry( POCKET_RADIUS, POCKET_RADIUS * 0.9, 0.45, 24, 1, true )
  disposableGeometries.add( pocketWallGeometry )
  POCKET_POSITIONS.forEach( ( [ x, z ] ) =>
  {
    const cylinder = new THREE.Mesh( pocketWallGeometry, pocketWallMaterial )
    cylinder.position.set( x, 0.1, z )
    table.add( cylinder )
  } )

  // Contact shadow texture and geometry
  const contactShadowTexture = createContactShadowTexture()
  disposableTextures.add( contactShadowTexture )
  const contactShadowMaterial = new THREE.MeshBasicMaterial( {
    map: contactShadowTexture,
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
    toneMapped: false,
  } )
  disposableMaterials.add( contactShadowMaterial )
  const contactShadowGeometry = new THREE.PlaneGeometry( BALL_RADIUS * 2.8, BALL_RADIUS * 2.8 )
  contactShadowGeometry.rotateX( -Math.PI / 2 )
  disposableGeometries.add( contactShadowGeometry )

  const shadowGroup = new THREE.Group()
  table.add( shadowGroup )

  // Ball meshes and materials
  const ballGeometry = new THREE.SphereGeometry( BALL_RADIUS, 48, 28 )
  disposableGeometries.add( ballGeometry )

  const ballMeshes = []
  const contactShadows = []

  // Striker (8-Ball)
  const strikerMaterial = createBallMaterial( "#070807", null )
  disposableMaterials.add( strikerMaterial )
  const strikerMesh = new THREE.Mesh( ballGeometry, strikerMaterial )
  strikerMesh.castShadow = true
  strikerMesh.receiveShadow = true
  table.add( strikerMesh )
  ballMeshes.push( strikerMesh )

  const logoTexture = createLogoTexture( 16, onTextureReady )
  disposableTextures.add( logoTexture )
  const decalMaterial = new THREE.MeshPhysicalMaterial( {
    map: logoTexture,
    color: "#ffffff",
    transparent: true,
    depthTest: true,
    depthWrite: false,
    roughness: 0.05,
    clearcoat: 1.0,
    clearcoatRoughness: 0.02,
    polygonOffset: true,
    polygonOffsetFactor: -4,
  } )
  disposableMaterials.add( decalMaterial )
  const decalGeometry = new DecalGeometry(
    strikerMesh,
    new THREE.Vector3( 0, BALL_RADIUS, 0 ),
    new THREE.Euler( -Math.PI / 2, 0, 0 ),
    new THREE.Vector3( BALL_RADIUS * 1.08, BALL_RADIUS * 1.08, BALL_RADIUS * 1.08 ),
  )
  disposableGeometries.add( decalGeometry )
  const decalMesh = new THREE.Mesh( decalGeometry, decalMaterial )
  strikerMesh.add( decalMesh )

  const strikerShadow = new THREE.Mesh( contactShadowGeometry, contactShadowMaterial )
  strikerShadow.position.y = 0.001
  shadowGroup.add( strikerShadow )
  contactShadows.push( strikerShadow )

  // Object balls (1 to 15)
  for ( let number = 1; number <= 15; number += 1 )
  {
    const texture = createNumberedBallTexture( number, BALL_COLORS[ number - 1 ], 16 )
    disposableTextures.add( texture )
    const material = createBallMaterial( BALL_COLORS[ number - 1 ], texture )
    disposableMaterials.add( material )
    const mesh = new THREE.Mesh( ballGeometry, material )
    mesh.castShadow = true
    mesh.receiveShadow = true
    table.add( mesh )
    ballMeshes.push( mesh )

    const shadow = new THREE.Mesh( contactShadowGeometry, contactShadowMaterial )
    shadow.position.y = 0.001
    shadowGroup.add( shadow )
    contactShadows.push( shadow )
  }

  // Lighting Rig
  const overheadRectLight = new THREE.RectAreaLight( 0xffffff, 2.75, 9.0, 16.0 )
  overheadRectLight.position.set( 0, 6.8, 0 )
  overheadRectLight.rotation.x = -Math.PI / 2
  scene.add( overheadRectLight )

  const leftChamferFill = new THREE.DirectionalLight( "#d4eae0", 0.45 )
  leftChamferFill.position.set( -8.5, 3.8, 0 )
  leftChamferFill.target.position.set( 0, 0, 0 )
  scene.add( leftChamferFill, leftChamferFill.target )

  const rightChamferFill = new THREE.DirectionalLight( "#f0e6d6", 0.40 )
  rightChamferFill.position.set( 8.5, 3.8, 0 )
  rightChamferFill.target.position.set( 0, 0, 0 )
  scene.add( rightChamferFill, rightChamferFill.target )

  const keyLight = new THREE.DirectionalLight( "#ffe8c2", 1.85 )
  keyLight.position.set( -4.8, 8.8, 5.2 )
  keyLight.target.position.set( 0, 0, -2.5 )
  keyLight.castShadow = true
  keyLight.shadow.mapSize.set( 2048, 2048 )
  // Enclose entire table in shadow camera frustum to avoid edge clipping.
  keyLight.shadow.camera.left = -12
  keyLight.shadow.camera.right = 12
  keyLight.shadow.camera.top = 9
  keyLight.shadow.camera.bottom = -11
  keyLight.shadow.camera.near = 0.5
  keyLight.shadow.camera.far = 28
  // Positive bias and normalBias eliminate self-shadowing acne across flat cloth receiver.
  keyLight.shadow.bias = 0.00005
  keyLight.shadow.normalBias = 0.02
  scene.add( keyLight, keyLight.target )

  const overheadSpot = new THREE.SpotLight( "#fff3da", 5.6, 26, Math.PI / 3.2, 0.8, 1.3 )
  overheadSpot.position.set( 0, 8.5, -3.2 )
  overheadSpot.target.position.set( 0, 0, -3.2 )
  overheadSpot.castShadow = false
  scene.add( overheadSpot, overheadSpot.target )

  const feltBounce = new THREE.HemisphereLight( "#1c5e45", "#030504", 0.52 )
  scene.add( feltBounce )

  const rimLight = new THREE.DirectionalLight( "#df9654", 0.68 )
  rimLight.position.set( 5.5, 4.8, -7.5 )
  rimLight.target.position.set( 0, 0, -3 )
  scene.add( rimLight, rimLight.target )

  // Effect composer
  const composer = new EffectComposer( renderer )
  const renderPass = new RenderPass( scene, camera )
  composer.addPass( renderPass )
  const outputPass = new OutputPass()
  composer.addPass( outputPass )

  let activeTier = DRAFT4_QUALITY_TIERS.high

  const updateQuality = ( width, height ) =>
  {
    const dpr = Math.min( window.devicePixelRatio || 1, activeTier.pixelRatioCap )
    renderer.setPixelRatio( dpr )
    renderer.setSize( width, height, false )
    composer.setSize( width, height )
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    onQualityState?.( {
      id: activeTier.id,
      pixelRatioCap: activeTier.pixelRatioCap,
      shadowMapSize: activeTier.shadowMapSize,
      ssao: activeTier.useSsao,
    } )
  }

  const render = () =>
  {
    composer.render()
  }

  const dispose = () =>
  {
    envTarget.dispose()
    composer.dispose()
    renderer.dispose()
    disposableGeometries.forEach( ( g ) => g.dispose?.() )
    disposableMaterials.forEach( ( m ) => m.dispose?.() )
    disposableTextures.forEach( ( t ) => t.dispose?.() )
  }

  return {
    camera,
    ballMeshes,
    contactShadows,
    strikerMesh,
    renderer,
    render,
    updateQuality,
    dispose,
  }
}

export default function WebglClassicDraft ( {
  active = false,
  onController,
  onUnavailable,
  draftId = "webgl-classic",
} )
{
  const rootRef = useRef( null )
  const canvasRef = useRef( null )
  const controllerRef = useRef( null )

  useLayoutEffect( () =>
  {
    const root = rootRef.current
    const canvas = canvasRef.current
    if ( !root || !canvas ) return

    let world = null
    let destroyed = false
    let failed = false
    let currentProgress = 0
    let isActive = active
    let renderContinuation = false
    let resizePending = false

    const simulation = getBreakSimulation()

    // Demand-driven frame scheduler coordinates repaints with window animation frames.
    const scheduler = createDemandFrameScheduler( {
      active: isActive,
      requestAnimationFrame: ( callback ) => window.requestAnimationFrame( callback ),
      cancelAnimationFrame: ( handle ) => window.cancelAnimationFrame( handle ),
      render: () => renderScene(),
      shouldContinue: () => renderContinuation,
    } )

    const requestRender = () => scheduler.invalidate()

    // Pointer parallax responds to fine mouse input while staying neutral on mobile.
    const pointer = createPointerParallax( {
      windowObject: window,
      isActive: () => isActive,
      requestRender,
      onResize: () => { resizePending = true },
    } )

    try
    {
      world = buildClassicScene( canvas, simulation, requestRender, ( qualityState ) =>
      {
        root.dataset.webglQuality = qualityState.id
        root.dataset.webglDprCap = String( qualityState.pixelRatioCap )
        root.dataset.webglSsao = String( qualityState.ssao )
        root.dataset.webglShadowMap = String( qualityState.shadowMapSize )
      } )
      root.dataset.webglError = "false"
    }
    catch ( error )
    {
      failed = true
      root.dataset.webglError = "true"
      console.warn( "Draft " + draftId + " setup failed; fallback active.", error )
      onUnavailable?.( draftId )
    }

    const cameraPos = new THREE.Vector3()
    const cameraTgt = new THREE.Vector3()

    const renderScene = () =>
    {
      if ( failed || !world ) return

      const width = root.clientWidth || window.innerWidth
      const height = root.clientHeight || window.innerHeight

      if ( resizePending )
      {
        world.updateQuality( width, height )
        resizePending = false
      }

      // Shared camera framing with pointer parallax and transition progress.
      const framing = resolveIntroCameraFraming( {
        progress: currentProgress,
        transitionReadyProgress: STORY_TIMING.intro.draft2.transitionReady,
        aspect: world.camera.aspect,
        sourceScale: 1,
        pointerX: pointer.state.x,
        pointerY: pointer.state.y,
        pointerEnabled: pointer.state.enabled,
      } )

      cameraPos.set( ...framing.camera )
      cameraTgt.set( ...framing.target )
      world.camera.position.copy( cameraPos )
      world.camera.lookAt( cameraTgt )
      world.camera.fov = framing.fov
      world.camera.updateProjectionMatrix()
      world.camera.updateMatrixWorld( true )

      // Sample deterministic break state
      const state = sampleDraft2BreakState( currentProgress, simulation )

      // Scale SI-unit physics positions into WebGL scene units
      const striker = state.balls[ 0 ]
      if ( striker && world.strikerMesh )
      {
        const strikerX = striker.position.x * DRAFT2_SCENE_SCALE
        const strikerZ = striker.position.z * DRAFT2_SCENE_SCALE
        world.strikerMesh.position.set( strikerX, BALL_RADIUS, strikerZ )
        world.strikerMesh.quaternion.set(
          striker.quaternion.x,
          striker.quaternion.y,
          striker.quaternion.z,
          striker.quaternion.w,
        )
        if ( world.contactShadows[ 0 ] )
        {
          world.contactShadows[ 0 ].position.set( strikerX, 0.001, strikerZ )
        }
      }

      // Update 15 object balls and their contact shadows
      state.balls.slice( 1 ).forEach( ( ball, index ) =>
      {
        const mesh = world.ballMeshes[ index + 1 ]
        const shadow = world.contactShadows[ index + 1 ]
        if ( mesh && shadow )
        {
          const posX = ball.position.x * DRAFT2_SCENE_SCALE
          const posZ = ball.position.z * DRAFT2_SCENE_SCALE
          mesh.position.set( posX, BALL_RADIUS, posZ )
          mesh.quaternion.set(
            ball.quaternion.x,
            ball.quaternion.y,
            ball.quaternion.z,
            ball.quaternion.w,
          )
          shadow.position.set( posX, 0.001, posZ )
        }
      } )

      world.render()

      root.dataset.webglProgress = currentProgress.toFixed( 4 )
      root.dataset.webglRenderAt = performance.now().toFixed( 3 )
      const info = world.renderer.info.memory
      root.dataset.webglGeometries = String( info.geometries )
      root.dataset.webglTextures = String( info.textures )
      root.dataset.webglPrograms = String( world.renderer.info.programs?.length ?? 0 )

      const pointerSettled = pointer.advance()
      renderContinuation = !pointerSettled || resizePending
    }

    const controller = {
      setProgress: ( nextProgress ) =>
      {
        currentProgress = nextProgress
        requestRender()
      },
      setActive: ( nextActive ) =>
      {
        isActive = nextActive
        root.classList.toggle( "is-active", nextActive || failed )
        root.setAttribute( "aria-hidden", String( !nextActive && !failed ) )
        if ( !nextActive ) pointer.reset()
        if ( nextActive ) pointer.syncCapability()
        scheduler.setActive( nextActive )
      },
    }

    controllerRef.current = controller
    onController?.( controller )
    controller.setProgress( 0 )
    controller.setActive( active )

    if ( world )
    {
      pointer.addListeners()
      world.updateQuality( root.clientWidth || window.innerWidth, root.clientHeight || window.innerHeight )
      requestRender()
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
      className="draft-layer draft-layer-webgl draft-layer-webgl-classic"
      ref={ rootRef }
      aria-hidden={ !active }
      data-draft-id={ draftId }
    >
      <canvas ref={ canvasRef } className="webgl-pool-canvas" aria-hidden="true" />
      <div className="webgl-vignette" aria-hidden="true" />
      <p className="webgl-phase" aria-hidden="true">TABLE / CLASSIC</p>
      <p className="webgl-fallback" role="status">3D draft unavailable on this device. Showing 2.5D draft.</p>
    </div>
  )
}
