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

const clamp = ( value, min = 0, max = 1 ) => Math.min( max, Math.max( min, value ) )
const lerp = ( start, end, progress ) => start + ( end - start ) * progress

// Three measured tiers spend pixels and full-screen effects according to the device budget.
// These caps only change internal render targets; the CSS canvas and camera framing stay fixed.
const DRAFT2_QUALITY_TIERS = Object.freeze( {
  high: Object.freeze( {
    id: 'high',
    pixelRatioCap: 1.5,
    shadowMapSize: 2048,
    useSsao: true,
    renderBudgetMs: 20,
    ballWidthSegments: 48,
    ballHeightSegments: 28,
    ballTextureWidth: 1024,
    ballTextureHeight: 512,
  } ),
  standard: Object.freeze( {
    id: 'standard',
    pixelRatioCap: 1.25,
    shadowMapSize: 1536,
    useSsao: true,
    renderBudgetMs: 24,
    ballWidthSegments: 40,
    ballHeightSegments: 24,
    ballTextureWidth: 768,
    ballTextureHeight: 384,
  } ),
  low: Object.freeze( {
    id: 'low',
    pixelRatioCap: 1,
    shadowMapSize: 1024,
    useSsao: false,
    renderBudgetMs: 32,
    ballWidthSegments: 32,
    ballHeightSegments: 20,
    ballTextureWidth: 512,
    ballTextureHeight: 256,
  } ),
} )

const QUALITY_ORDER = [ 'low', 'standard', 'high' ]

const getQualityRank = ( tierId ) => QUALITY_ORDER.indexOf( tierId )

const getDraft2QualitySignals = ( width, height ) =>
{
  const coarsePointer = window.matchMedia( '(pointer: coarse)' ).matches
  const deviceMemory = Number.isFinite( navigator.deviceMemory ) ? navigator.deviceMemory : null
  const hardwareConcurrency = Number.isFinite( navigator.hardwareConcurrency )
    ? navigator.hardwareConcurrency
    : null
  const saveData = Boolean( navigator.connection?.saveData )
  const isSmallViewport = width <= 768 || Math.min( width, height ) <= 640
  const lowPower = saveData || deviceMemory !== null && deviceMemory <= 4 || hardwareConcurrency !== null && hardwareConcurrency <= 4

  return {
    width,
    height,
    devicePixelRatio: window.devicePixelRatio || 1,
    coarsePointer,
    deviceMemory,
    hardwareConcurrency,
    saveData,
    isSmallViewport,
    lowPower,
  }
}

// Pick an initial tier from observable signals, then let measured render time refine it.
// Browser names are deliberately absent: viewport, density, input mode, and power hints are portable.
const selectDraft2QualityTier = ( signals ) =>
{
  if ( signals.coarsePointer || signals.isSmallViewport || signals.lowPower ) return 'low'
  if (
    signals.width >= 1200 &&
    signals.devicePixelRatio <= 1.5 &&
    ( signals.deviceMemory === null || signals.deviceMemory >= 8 ) &&
    ( signals.hardwareConcurrency === null || signals.hardwareConcurrency >= 8 )
  ) return 'high'
  return 'standard'
}

const createQualityMonitor = ( initialTier, signals, applyTier ) =>
{
  let currentTier = initialTier
  let pendingTier = null
  let slowSamples = 0
  let healthySamples = 0
  const renderDurations = []
  const isUpgradeLocked = ( currentSignals ) =>
    currentSignals.coarsePointer || currentSignals.isSmallViewport || currentSignals.lowPower
  let upgradesLocked = isUpgradeLocked( signals )

  const setPendingTier = ( nextTier ) =>
  {
    if ( nextTier === currentTier )
    {
      pendingTier = null
      return
    }
    pendingTier = nextTier
  }

  const suggestFromSignals = ( nextSignals ) =>
  {
    // Recompute the lock after every resize so a desktop scene cannot later
    // promote itself while the viewport is small, coarse-pointer, or low-power.
    upgradesLocked = isUpgradeLocked( nextSignals )
    const suggestedTier = selectDraft2QualityTier( nextSignals )
    const currentRank = getQualityRank( currentTier )
    const suggestedRank = getQualityRank( suggestedTier )

    // A resize can lower quality immediately at the next settled frame, but never raises
    // a mobile/low-power device into an SSAO tier just because a single frame was quick.
    if ( suggestedRank < currentRank || !upgradesLocked ) setPendingTier( suggestedTier )
  }

  const commitPending = ( sceneSettled ) =>
  {
    if ( !pendingTier || !sceneSettled ) return false
    currentTier = pendingTier
    pendingTier = null
    slowSamples = 0
    healthySamples = 0
    renderDurations.length = 0
    applyTier( currentTier )
    return true
  }

  const observe = ( durationMs, sceneSettled ) =>
  {
    if ( !Number.isFinite( durationMs ) ) return commitPending( sceneSettled )
    renderDurations.push( durationMs )
    if ( renderDurations.length > 12 ) renderDurations.shift()
    if ( renderDurations.length < 8 ) return commitPending( sceneSettled )

    const tier = DRAFT2_QUALITY_TIERS[ currentTier ]
    const average = renderDurations.reduce( ( total, duration ) => total + duration, 0 ) / renderDurations.length
    // Hysteresis avoids tier thrash: sustained 18% over-budget cost drops after 6 samples,
    // while a much quieter 38% headroom must hold for 24 samples before quality can rise.
    if ( average > tier.renderBudgetMs * 1.18 && getQualityRank( currentTier ) > getQualityRank( 'low' ) )
    {
      slowSamples += 1
      healthySamples = 0
      if ( slowSamples >= 6 ) setPendingTier( QUALITY_ORDER[ getQualityRank( currentTier ) - 1 ] )
    }
    else if ( average < tier.renderBudgetMs * 0.62 && getQualityRank( currentTier ) < getQualityRank( 'high' ) && !upgradesLocked )
    {
      healthySamples += 1
      slowSamples = 0
      if ( healthySamples >= 24 ) setPendingTier( QUALITY_ORDER[ getQualityRank( currentTier ) + 1 ] )
    }
    else
    {
      slowSamples = 0
      healthySamples = 0
    }

    return commitPending( sceneSettled )
  }

  return {
    get current () { return currentTier },
    get pending () { return Boolean( pendingTier ) },
    observe,
    suggestFromSignals,
  }
}

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
 * Procedural Simonis 860 worsted wool microfiber cloth textures.
 * Generates interwoven warp/weft yarn bundles with twisted ply striations, micro-fiber nap fuzz,
 * and tangent-space normal gradients. The map set stays deliberately small: one albedo, one
 * normal, and one roughness texture can serve both the bed and cushion materials. The map
 * frequencies are separated so broad dye variation survives mipmapping while the weave stays
 * fine at grazing angles.
 */
const createFeltTextures = ( anisotropy = 16, microRepeatX = 38.4, microRepeatY = 76.8 ) =>
{
  const width = 512
  const height = 512
  const numThreads = 32 // 16 pixels per yarn thread
  const threadSize = width / numThreads

  const canvas = document.createElement( 'canvas' )
  const normalCanvas = document.createElement( 'canvas' )
  const roughnessCanvas = document.createElement( 'canvas' )

  canvas.width = width
  canvas.height = height
  normalCanvas.width = width
  normalCanvas.height = height
  roughnessCanvas.width = width
  roughnessCanvas.height = height

  const context = canvas.getContext( '2d' )
  const normalContext = normalCanvas.getContext( '2d' )
  const roughnessContext = roughnessCanvas.getContext( '2d' )

  const albedoImage = context.createImageData( width, height )
  const normalImage = normalContext.createImageData( width, height )
  const roughnessImage = roughnessContext.createImageData( width, height )

  const albedoData = albedoImage.data
  const normalData = normalImage.data
  const roughnessData = roughnessImage.data

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
  // Keep the weave below the silhouette scale; the grazing light should reveal it without
  // turning the table into a visibly embossed grid.
  const normalStrength = 0.9
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

      // Albedo Map: rich tournament green with yarn crest illumination and crevice shadow.
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

      // Roughness Map: broad nap response with only a small yarn-to-yarn difference.
      const roughnessVal = Math.round( ( 0.96 - h * 0.05 + dyeShift * 0.002 ) * 255 )
      roughnessData[ pixelIdx ] = roughnessVal
      roughnessData[ pixelIdx + 1 ] = roughnessVal
      roughnessData[ pixelIdx + 2 ] = roughnessVal
      roughnessData[ pixelIdx + 3 ] = 255

    }
  }

  context.putImageData( albedoImage, 0, 0 )
  normalContext.putImageData( normalImage, 0, 0 )
  roughnessContext.putImageData( roughnessImage, 0, 0 )

  const map = new THREE.CanvasTexture( canvas )
  const normalMap = new THREE.CanvasTexture( normalCanvas )
  const roughnessMap = new THREE.CanvasTexture( roughnessCanvas )

  ;[ map, normalMap, roughnessMap ].forEach( ( texture ) =>
  {
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.anisotropy = anisotropy
    // Mipmaps keep the woven surface stable at distance while linear filtering avoids hard tile edges.
    texture.generateMipmaps = true
    texture.minFilter = THREE.LinearMipmapLinearFilter
    texture.magFilter = THREE.LinearFilter
  } )

  // Use different world-frequency bands: macro color, mid-scale nap, and fine weave detail.
  map.repeat.set( Math.max( 1, microRepeatX / 16 ), Math.max( 1, microRepeatY / 16 ) )
  roughnessMap.repeat.set( Math.max( 1, microRepeatX / 8 ), Math.max( 1, microRepeatY / 8 ) )
  normalMap.repeat.set( microRepeatX, microRepeatY )

  map.colorSpace = THREE.SRGBColorSpace
  normalMap.colorSpace = THREE.NoColorSpace
  roughnessMap.colorSpace = THREE.NoColorSpace
  return { map, normalMap, roughnessMap }
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

/**
 * Shared micro-surface maps for phenolic resin. One pair serves every ball so the
 * polished finish gains believable variation without adding one texture per mesh.
 */
const createBallSurfaceTextures = ( anisotropy = 16 ) =>
{
  const size = 256
  const normalCanvas = document.createElement( 'canvas' )
  const roughnessCanvas = document.createElement( 'canvas' )
  normalCanvas.width = size
  normalCanvas.height = size
  roughnessCanvas.width = size
  roughnessCanvas.height = size

  const normalContext = normalCanvas.getContext( '2d' )
  const roughnessContext = roughnessCanvas.getContext( '2d' )
  const normalImage = normalContext.createImageData( size, size )
  const roughnessImage = roughnessContext.createImageData( size, size )
  const heightMap = new Float32Array( size * size )

  // Two very low-amplitude grain bands break up the perfect clearcoat reflection without
  // making the balls look scratched or dirty at normal viewing distance.
  for ( let y = 0; y < size; y += 1 )
  {
    for ( let x = 0; x < size; x += 1 )
    {
      const diagonal = Math.sin( ( x * 0.16 + y * 0.11 ) * Math.PI * 2 ) * 0.018
      const crossGrain = Math.sin( ( x * 0.037 - y * 0.053 ) * Math.PI * 2 ) * 0.012
      heightMap[ y * size + x ] = 0.5 + diagonal + crossGrain
    }
  }

  const normalStrength = 0.72
  for ( let y = 0; y < size; y += 1 )
  {
    const ym1 = ( y - 1 + size ) % size
    const yp1 = ( y + 1 ) % size

    for ( let x = 0; x < size; x += 1 )
    {
      const xm1 = ( x - 1 + size ) % size
      const xp1 = ( x + 1 ) % size
      const idx = y * size + x
      const pixelIdx = idx * 4
      const dx = ( heightMap[ y * size + xp1 ] - heightMap[ y * size + xm1 ] ) * normalStrength
      const dy = ( heightMap[ yp1 * size + x ] - heightMap[ ym1 * size + x ] ) * normalStrength
      const len = Math.sqrt( dx * dx + dy * dy + 1 )

      normalImage.data[ pixelIdx ] = Math.round( ( -dx / len * 0.5 + 0.5 ) * 255 )
      normalImage.data[ pixelIdx + 1 ] = Math.round( ( -dy / len * 0.5 + 0.5 ) * 255 )
      normalImage.data[ pixelIdx + 2 ] = Math.round( ( 1 / len * 0.5 + 0.5 ) * 255 )
      normalImage.data[ pixelIdx + 3 ] = 255

      const variation = ( heightMap[ idx ] - 0.5 ) * 0.8
      const roughness = Math.max( 0.82, Math.min( 1, 0.91 - variation ) )
      roughnessImage.data[ pixelIdx ] = Math.round( roughness * 255 )
      roughnessImage.data[ pixelIdx + 1 ] = Math.round( roughness * 255 )
      roughnessImage.data[ pixelIdx + 2 ] = Math.round( roughness * 255 )
      roughnessImage.data[ pixelIdx + 3 ] = 255
    }
  }

  normalContext.putImageData( normalImage, 0, 0 )
  roughnessContext.putImageData( roughnessImage, 0, 0 )

  const normalMap = new THREE.CanvasTexture( normalCanvas )
  const roughnessMap = new THREE.CanvasTexture( roughnessCanvas )
  ;[ normalMap, roughnessMap ].forEach( ( texture ) =>
  {
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set( 2.5, 2.5 )
    texture.anisotropy = anisotropy
    texture.generateMipmaps = true
    texture.minFilter = THREE.LinearMipmapLinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.colorSpace = THREE.NoColorSpace
  } )

  return { normalMap, roughnessMap }
}

/**
 * Shared ebonized-wood maps for the rails and apron. The low contrast keeps the table
 * luxurious at a distance while directional grain gives the black surfaces a material identity.
 */
const createEbonizedWoodTextures = ( anisotropy = 16 ) =>
{
  const size = 256
  const canvas = document.createElement( 'canvas' )
  const normalCanvas = document.createElement( 'canvas' )
  const roughnessCanvas = document.createElement( 'canvas' )
  canvas.width = size
  canvas.height = size
  normalCanvas.width = size
  normalCanvas.height = size
  roughnessCanvas.width = size
  roughnessCanvas.height = size

  const context = canvas.getContext( '2d' )
  const normalContext = normalCanvas.getContext( '2d' )
  const roughnessContext = roughnessCanvas.getContext( '2d' )
  const albedoImage = context.createImageData( size, size )
  const normalImage = normalContext.createImageData( size, size )
  const roughnessImage = roughnessContext.createImageData( size, size )
  const heightMap = new Float32Array( size * size )

  for ( let y = 0; y < size; y += 1 )
  {
    for ( let x = 0; x < size; x += 1 )
    {
      // Long grain runs in U; the second band keeps it from looking like a repeated barcode.
      const grain = Math.sin( ( x * 0.022 + Math.sin( y * 0.035 ) * 2.4 ) * Math.PI * 2 )
      const secondary = Math.sin( ( x * 0.073 + y * 0.013 ) * Math.PI * 2 )
      const height = 0.5 + grain * 0.045 + secondary * 0.012
      const idx = y * size + x
      const pixelIdx = idx * 4
      heightMap[ idx ] = height

      // Ebonizing leaves a warm brown undertone in the highlights rather than dead RGB black.
      const value = 0.5 + grain * 0.5 + secondary * 0.12
      albedoImage.data[ pixelIdx ] = Math.round( 34 + value * 30 )
      albedoImage.data[ pixelIdx + 1 ] = Math.round( 23 + value * 22 )
      albedoImage.data[ pixelIdx + 2 ] = Math.round( 16 + value * 17 )
      albedoImage.data[ pixelIdx + 3 ] = 255

      const roughness = 0.78 - grain * 0.06
      roughnessImage.data[ pixelIdx ] = Math.round( roughness * 255 )
      roughnessImage.data[ pixelIdx + 1 ] = Math.round( roughness * 255 )
      roughnessImage.data[ pixelIdx + 2 ] = Math.round( roughness * 255 )
      roughnessImage.data[ pixelIdx + 3 ] = 255
    }
  }

  const normalStrength = 0.8
  for ( let y = 0; y < size; y += 1 )
  {
    const ym1 = ( y - 1 + size ) % size
    const yp1 = ( y + 1 ) % size

    for ( let x = 0; x < size; x += 1 )
    {
      const xm1 = ( x - 1 + size ) % size
      const xp1 = ( x + 1 ) % size
      const pixelIdx = ( y * size + x ) * 4
      const dx = ( heightMap[ y * size + xp1 ] - heightMap[ y * size + xm1 ] ) * normalStrength
      const dy = ( heightMap[ yp1 * size + x ] - heightMap[ ym1 * size + x ] ) * normalStrength
      const len = Math.sqrt( dx * dx + dy * dy + 1 )

      normalImage.data[ pixelIdx ] = Math.round( ( -dx / len * 0.5 + 0.5 ) * 255 )
      normalImage.data[ pixelIdx + 1 ] = Math.round( ( -dy / len * 0.5 + 0.5 ) * 255 )
      normalImage.data[ pixelIdx + 2 ] = Math.round( ( 1 / len * 0.5 + 0.5 ) * 255 )
      normalImage.data[ pixelIdx + 3 ] = 255
    }
  }

  context.putImageData( albedoImage, 0, 0 )
  normalContext.putImageData( normalImage, 0, 0 )
  roughnessContext.putImageData( roughnessImage, 0, 0 )

  const map = new THREE.CanvasTexture( canvas )
  const normalMap = new THREE.CanvasTexture( normalCanvas )
  const roughnessMap = new THREE.CanvasTexture( roughnessCanvas )
  ;[ map, normalMap, roughnessMap ].forEach( ( texture ) =>
  {
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set( 3.5, 1.5 )
    texture.anisotropy = anisotropy
    texture.generateMipmaps = true
    texture.minFilter = THREE.LinearMipmapLinearFilter
    texture.magFilter = THREE.LinearFilter
  } )

  map.colorSpace = THREE.SRGBColorSpace
  normalMap.colorSpace = THREE.NoColorSpace
  roughnessMap.colorSpace = THREE.NoColorSpace
  return { map, normalMap, roughnessMap }
}

/**
 * Small shared leather maps give each pocket a readable lining without allocating one texture
 * per aperture. The low-frequency grain keeps the deep cavity from becoming a flat black void.
 */
const createPocketLeatherTextures = ( anisotropy = 16 ) =>
{
  const size = 128
  const canvas = document.createElement( 'canvas' )
  const normalCanvas = document.createElement( 'canvas' )
  const roughnessCanvas = document.createElement( 'canvas' )
  canvas.width = size
  canvas.height = size
  normalCanvas.width = size
  normalCanvas.height = size
  roughnessCanvas.width = size
  roughnessCanvas.height = size

  const context = canvas.getContext( '2d' )
  const normalContext = normalCanvas.getContext( '2d' )
  const roughnessContext = roughnessCanvas.getContext( '2d' )
  const albedoImage = context.createImageData( size, size )
  const normalImage = normalContext.createImageData( size, size )
  const roughnessImage = roughnessContext.createImageData( size, size )
  const heightMap = new Float32Array( size * size )

  // Saddle leather has broad grain, then small pores that catch a little of the cavity fill.
  for ( let y = 0; y < size; y += 1 )
  {
    for ( let x = 0; x < size; x += 1 )
    {
      const grain = Math.sin( ( x * 0.06 + Math.sin( y * 0.08 ) * 1.6 ) * Math.PI * 2 ) * 0.035
      const pores = Math.sin( ( x * 0.31 + y * 0.23 ) * Math.PI * 2 ) * 0.012
      const height = 0.5 + grain + pores
      const idx = y * size + x
      const pixelIdx = idx * 4
      heightMap[ idx ] = height

      const value = 0.5 + grain * 4 + pores * 2
      // Keep the map neutral; the material color supplies the dark saddle-brown base.
      albedoImage.data[ pixelIdx ] = Math.round( 178 + value * 36 )
      albedoImage.data[ pixelIdx + 1 ] = Math.round( 174 + value * 32 )
      albedoImage.data[ pixelIdx + 2 ] = Math.round( 168 + value * 28 )
      albedoImage.data[ pixelIdx + 3 ] = 255

      const roughness = 0.72 - grain * 0.7 - pores * 0.5
      const roughnessValue = Math.round( Math.max( 0.62, Math.min( 0.86, roughness ) ) * 255 )
      roughnessImage.data[ pixelIdx ] = roughnessValue
      roughnessImage.data[ pixelIdx + 1 ] = roughnessValue
      roughnessImage.data[ pixelIdx + 2 ] = roughnessValue
      roughnessImage.data[ pixelIdx + 3 ] = 255
    }
  }

  const normalStrength = 0.58
  for ( let y = 0; y < size; y += 1 )
  {
    const ym1 = ( y - 1 + size ) % size
    const yp1 = ( y + 1 ) % size

    for ( let x = 0; x < size; x += 1 )
    {
      const xm1 = ( x - 1 + size ) % size
      const xp1 = ( x + 1 ) % size
      const idx = y * size + x
      const pixelIdx = idx * 4
      const dx = ( heightMap[ y * size + xp1 ] - heightMap[ y * size + xm1 ] ) * normalStrength
      const dy = ( heightMap[ yp1 * size + x ] - heightMap[ ym1 * size + x ] ) * normalStrength
      const len = Math.sqrt( dx * dx + dy * dy + 1 )

      normalImage.data[ pixelIdx ] = Math.round( ( -dx / len * 0.5 + 0.5 ) * 255 )
      normalImage.data[ pixelIdx + 1 ] = Math.round( ( -dy / len * 0.5 + 0.5 ) * 255 )
      normalImage.data[ pixelIdx + 2 ] = Math.round( ( 1 / len * 0.5 + 0.5 ) * 255 )
      normalImage.data[ pixelIdx + 3 ] = 255
    }
  }

  context.putImageData( albedoImage, 0, 0 )
  normalContext.putImageData( normalImage, 0, 0 )
  roughnessContext.putImageData( roughnessImage, 0, 0 )

  const map = new THREE.CanvasTexture( canvas )
  const normalMap = new THREE.CanvasTexture( normalCanvas )
  const roughnessMap = new THREE.CanvasTexture( roughnessCanvas )
  ;[ map, normalMap, roughnessMap ].forEach( ( texture ) =>
  {
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set( 3, 5 )
    texture.anisotropy = anisotropy
    texture.generateMipmaps = true
    texture.minFilter = THREE.LinearMipmapLinearFilter
    texture.magFilter = THREE.LinearFilter
  } )

  map.colorSpace = THREE.SRGBColorSpace
  normalMap.colorSpace = THREE.NoColorSpace
  roughnessMap.colorSpace = THREE.NoColorSpace
  return { map, normalMap, roughnessMap }
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

  // A long, soft strip creates one recognisable product-photography reflection on the balls.
  addCard( new THREE.PlaneGeometry( 8.5, 1.35 ), '#fff2d6', 1.9, [ 0, 8.5, -2 ], [ 0, 0, -2 ] )
  // Warm mahogany wood side reflection cards
  addCard( new THREE.PlaneGeometry( 12, 3.5 ), '#c57d48', 0.85, [ 6.5, 3.2, 0 ], [ 0, 0, 0 ] )
  addCard( new THREE.PlaneGeometry( 12, 3.5 ), '#c57d48', 0.85, [ -6.5, 3.2, 0 ], [ 0, 0, 0 ] )
  // Emerald felt upward bounce card
  addCard( new THREE.PlaneGeometry( 14, 24 ), '#367256', 0.45, [ 0, -0.6, 0 ], [ 0, 10, 0 ] )

  const generator = new THREE.PMREMGenerator( renderer )
  generator.compileCubemapShader()
  // Stay inside PMREM's sample budget; the enlarged strip supplies the softness without clipping.
  const target = generator.fromScene( environmentScene, 0.035 )
  resources.forEach( ( resource ) => resource.dispose() )
  generator.dispose()
  return target
}

/**
 * Aramith phenolic resin physical ball material with accurate IOR, clearcoat, and sheen.
 */
const createBallMaterial = ( color, texture, surfaceTextures ) => new THREE.MeshPhysicalMaterial( {
  color: texture ? '#ffffff' : color,
  map: texture,
  roughness: 0.16,
  roughnessMap: surfaceTextures?.roughnessMap,
  metalness: 0,
  clearcoat: 0.85,
  clearcoatRoughness: 0.075,
  clearcoatNormalMap: surfaceTextures?.normalMap,
  clearcoatNormalScale: new THREE.Vector2( 0.035, 0.035 ),
  ior: 1.54,
  reflectivity: 0.78,
  envMapIntensity: 0.62,
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

// Cut pocket openings into the cloth/slate bed at all six pocket locations.
// The green felt curves inward around pocket throats, leaving dark cavities open and visible.
const createFeltGeometry = () =>
{
  const shape = new THREE.Shape()
  // Boundary coordinates matching the cushion-felt interface in XY shape coordinates (y becomes -z in world)
  const xHead = 4.144
  const yHead = 9.60
  const xRail = 4.80
  const yCorner = 9.004
  const ySide = 0.296

  // 1. Head rail edge (from Top-Left to Top-Right)
  shape.moveTo( -xHead, yHead )
  shape.lineTo( xHead, yHead )

  // 2. Top-Right corner pocket throat cutout (inward curve around pocket opening at 4.45, 9.25)
  shape.quadraticCurveTo( 3.80, 8.60, xRail, yCorner )

  // 3. Right head-side edge
  shape.lineTo( xRail, ySide )

  // 4. Right side pocket throat cutout (inward curve around pocket opening at 4.65, 0)
  shape.quadraticCurveTo( 4.10, 0, xRail, -ySide )

  // 5. Right foot-side edge
  shape.lineTo( xRail, -yCorner )

  // 6. Bottom-Right corner pocket throat cutout (inward curve around pocket opening at 4.45, -9.25)
  shape.quadraticCurveTo( 3.80, -8.60, xHead, -yHead )

  // 7. Foot rail edge (from Bottom-Right to Bottom-Left)
  shape.lineTo( -xHead, -yHead )

  // 8. Bottom-Left corner pocket throat cutout (inward curve around pocket opening at -4.45, -9.25)
  shape.quadraticCurveTo( -3.80, -8.60, -xRail, -yCorner )

  // 9. Left foot-side edge
  shape.lineTo( -xRail, -ySide )

  // 10. Left side pocket throat cutout (inward curve around pocket opening at -4.65, 0)
  shape.quadraticCurveTo( -4.10, 0, -xRail, ySide )

  // 11. Left head-side edge
  shape.lineTo( -xRail, yCorner )

  // 12. Top-Left corner pocket throat cutout (inward curve around pocket opening at -4.45, 9.25)
  shape.quadraticCurveTo( -3.80, 8.60, -xHead, yHead )
  shape.closePath()

  // Triangulate 2D bed polygon and rotate to horizontal XZ plane
  const geometry = new THREE.ShapeGeometry( shape, 24 )
  geometry.rotateX( -Math.PI / 2 )
  geometry.computeVertexNormals()
  return geometry
}

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
  renderer.toneMappingExposure = 1.15
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
  const environmentTarget = createWarmStudioEnvironment( renderer )
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
  const feltTextures = createFeltTextures( maxAnisotropy, 16, 32 )
  ownTextures( ...Object.values( feltTextures ) )
  const feltMaterial = new THREE.MeshPhysicalMaterial( {
    map: feltTextures.map,
    normalMap: feltTextures.normalMap,
    normalScale: new THREE.Vector2( 0.04, 0.04 ),
    roughnessMap: feltTextures.roughnessMap,
    // The roughness map already contains the full cloth range; avoid multiplying it down.
    roughness: 1.0,
    metalness: 0.0,
    sheen: 0.44,
    sheenRoughness: 0.82,
    sheenColor: new THREE.Color( TABLE_PALETTE.feltSheen ),
    color: TABLE_PALETTE.felt,
    // Balanced envMapIntensity keeps the cloth green while retaining a bright studio response.
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

  // Slice 2: Ebonized wood rails with a separate dense-cloth cushion surface.
  const woodTextures = createEbonizedWoodTextures( maxAnisotropy )
  ownTextures( ...Object.values( woodTextures ) )
  const pianoBlackRailMaterial = new THREE.MeshPhysicalMaterial( {
    map: woodTextures.map,
    normalMap: woodTextures.normalMap,
    normalScale: new THREE.Vector2( 0.045, 0.045 ),
    roughnessMap: woodTextures.roughnessMap,
    color: TABLE_PALETTE.rail,
    roughness: 0.34,
    metalness: 0.0,
    clearcoat: 0.55,
    clearcoatRoughness: 0.16,
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
    roughness: 0.38,
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
    clearcoat: 0.55,
    clearcoatRoughness: 0.14,
    ior: 1.52,
    envMapIntensity: 0.6,
  } )

  // Apron skirt box
  addRoundedBox( table, [ 10.75, 0.72, 20.55 ], [ 0, -0.42, 0 ], apronMaterial, 0.14 )

  // 1. Head and foot rails: run between corner castings, seated flush without gaps or overshoot
  ;[ -9.87, 9.87 ].forEach( ( z ) =>
  {
    addRoundedBox( table, [ 8.96, 0.48, 0.54 ], [ 0, 0.24, z ], pianoBlackRailMaterial, 0.08 )
  } )

  // 2. Corner pocket castings: sit flush at the 4 table corners bridging head/foot and side rails
  ;[ [ -4.91, -9.71 ], [ 4.91, -9.71 ], [ -4.91, 9.71 ], [ 4.91, 9.71 ] ].forEach( ( [ cx, cz ] ) =>
  {
    addRoundedBox( table, [ 0.86, 0.48, 0.86 ], [ cx, 0.24, cz ], pocketCollarMaterial, 0.08 )
  } )

  // 3. Side pocket hardware: bridges head-side and foot-side rails at each side pocket
  ;[ -4.91, 4.91 ].forEach( ( x ) =>
  {
    addRoundedBox( table, [ 0.54, 0.48, 1.16 ], [ x, 0.24, 0 ], pocketCollarMaterial, 0.08 )
  } )

  // 4. Side rails: 4 independent rails seated flush between corner castings and side pocket hardware
  ;[ -4.91, 4.91 ].forEach( ( x ) =>
  {
    ;[ -4.93, 4.93 ].forEach( ( z ) =>
    {
      addRoundedBox( table, [ 0.54, 0.48, 8.70 ], [ x, 0.24, z ], pianoBlackRailMaterial, 0.08 )
    } )
  } )

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
  const overheadRectLight = new THREE.RectAreaLight( 0xffffff, 2.75, 8.5, 21.2 )
  overheadRectLight.position.set( 0, 7.0, 0 )
  overheadRectLight.rotation.x = -Math.PI / 2
  scene.add( overheadRectLight )

  // Cool directional fill to illuminate the left cushions and pocket openings.
  const leftChamferFill = new THREE.DirectionalLight( '#d4eae0', 0.45 )
  leftChamferFill.position.set( -8.5, 3.8, 0 )
  leftChamferFill.target.position.set( 0, 0, 0 )
  scene.add( leftChamferFill, leftChamferFill.target )

  // Warm directional fill to bring out right rail textures and wood grain.
  const rightChamferFill = new THREE.DirectionalLight( '#f0e6d6', 0.42 )
  rightChamferFill.position.set( 8.5, 3.8, 0 )
  rightChamferFill.target.position.set( 0, 0, 0 )
  scene.add( rightChamferFill, rightChamferFill.target )

  // Local far-rail fill preserves the rack silhouette while lifting the cushion and sights.
  const farRailFill = new THREE.DirectionalLight( '#dcf2e4', 1.25 )
  farRailFill.position.set( 0, 6.2, -12.8 )
  farRailFill.target.position.set( 0, 0.48, -9.68 )
  scene.add( farRailFill, farRailFill.target )

  // Key directional light provides clear form definition, highlights, and crisp shadows.
  const keyLight = new THREE.DirectionalLight( '#ffe8c2', 1.85 )
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

  // Overhead spotlight focuses radiance on the active rack and balls corridor.
  const overheadSpot = new THREE.SpotLight( '#fff3da', 5.5, 26, Math.PI / 3.2, 0.8, 1.3 )
  overheadSpot.position.set( 0, 8.5, -3.2 )
  overheadSpot.target.position.set( 0, 0, -3.2 )
  overheadSpot.castShadow = false
  scene.add( overheadSpot, overheadSpot.target )

  // Ambient felt bounce light softens dark shadows under balls and rail returns.
  const feltBounce = new THREE.HemisphereLight( TABLE_PALETTE.feltBounce, '#030504', 0.48 )
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
