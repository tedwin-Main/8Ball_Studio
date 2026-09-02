// Draft 4 is an isolated copy of the latest Draft 1 renderer kept intact while slots 1-3 roll back.
import { useLayoutEffect, useRef } from 'react'
import * as THREE from 'three'
import { DecalGeometry } from 'three/addons/geometries/DecalGeometry.js'
import brandLogo from '../assets/8BALL-V4.jpg'
import landscapePool from '../assets/drafts/pool-pov-landscape.png'
import portraitPool from '../assets/drafts/pool-pov-portrait.png'
// Draft 4 opts into the weighted physics path while slots 1-3 use the restored default.
import {
  getBreakSimulation,
  sampleCinematicBreakState,
} from './poolBreakPhysics'
import { STORY_TIMING } from '../storyTiming'
import {
  createPointerParallax,
  DRAFT2_SCENE_SCALE,
  resolveIntroCameraFraming,
  resolvePhotoHoverResponse,
} from './cameraFraming'
import {
  isFramingDiagnosticsEnabled,
  publishFramingDiagnostics,
} from './framingDiagnostics'
import { createDemandFrameScheduler } from './demandFrameScheduler'
import { LIGHTING_CONTRACT, MATERIAL_CONTRACT } from './renderContracts'

const clamp = ( value, min = 0, max = 1 ) => Math.min( max, Math.max( min, value ) )
const lerp = ( start, end, progress ) => start + ( end - start ) * progress

// Match Draft 2's maximum backing density so Retina desktops do not pay excess fill rate.
const DRAFT1_PIXEL_RATIO_CAP = 1.5

const BALL_COLORS = [
  '#f5b818', '#1b46a2', '#cb242a', '#59287a', '#e76317',
  '#126d40', '#7a1d33', '#0a0c0a', '#f5b818', '#1b46a2',
  '#cb242a', '#59287a', '#e76317', '#126d40', '#7a1d33',
]

// Keep the rack legal while placing the 7-ball on the right corner's sideways release path.
const RACK_BALL_NUMBERS = [
  1,
  5, 11,
  3, 8, 10,
  4, 13, 14, 2,
  9, 12, 15, 6, 7,
]

// Each plate stores its table, light, rail, and projected pocket measurements together.
const PLATE_CALIBRATIONS = Object.freeze( {
  landscape: Object.freeze( {
    referenceAspect: 1.6,
    tablePlane: Object.freeze( {
      position: Object.freeze( [ 0, 0, 0 ] ),
      rotation: Object.freeze( [ 0, 0, 0 ] ),
      scale: 1,
    } ),
    farRailAnchors: Object.freeze( {
      left: Object.freeze( [ 0.08433, 0.35152 ] ),
      right: Object.freeze( [ 0.91567, 0.35152 ] ),
    } ),
    projectedAnchors: Object.freeze( {
      rackApex: Object.freeze( [ 0.5, 0.38488 ] ),
      strikerContact: Object.freeze( [ 0.49807, 0.38747 ] ),
    } ),
    lightPosition: Object.freeze( [ -0.42, 1.42, -0.46 ] ),
    pocketProjection: Object.freeze( [
      Object.freeze( [ 0.08104, 0.35087 ] ),
      Object.freeze( [ 0.91896, 0.35087 ] ),
      Object.freeze( [ -0.12216, 0.55379 ] ),
      Object.freeze( [ 1.12216, 0.55379 ] ),
      Object.freeze( [ -0.69365, 1.13194 ] ),
      Object.freeze( [ 1.69365, 1.13194 ] ),
    ] ),
  } ),
  portrait: Object.freeze( {
    referenceAspect: 390 / 844,
    tablePlane: Object.freeze( {
      position: Object.freeze( [ 0, 0, 0 ] ),
      rotation: Object.freeze( [ 0, 0, 0 ] ),
      scale: 1,
    } ),
    farRailAnchors: Object.freeze( {
      left: Object.freeze( [ -0.01679, 0.30877 ] ),
      right: Object.freeze( [ 1.01679, 0.30877 ] ),
    } ),
    projectedAnchors: Object.freeze( {
      rackApex: Object.freeze( [ 0.5, 0.38488 ] ),
      strikerContact: Object.freeze( [ 0.49331, 0.38747 ] ),
    } ),
    lightPosition: Object.freeze( [ 0, 1.82, -0.52 ] ),
    pocketProjection: Object.freeze( [
      Object.freeze( [ -0.02088, 0.30795 ] ),
      Object.freeze( [ 1.02088, 0.30795 ] ),
      Object.freeze( [ -0.26938, 0.56218 ] ),
      Object.freeze( [ 1.26938, 0.56218 ] ),
      Object.freeze( [ -0.95393, 1.27181 ] ),
      Object.freeze( [ 1.95393, 1.27181 ] ),
    ] ),
  } ),
} )

const adaptReferenceUv = ( uv, calibration, aspect ) => [
  0.5 + ( uv[ 0 ] - 0.5 ) * calibration.referenceAspect / aspect,
  uv[ 1 ],
]

// Keep the existing photo anchor measurement available to benchmark checks after camera sharing.
const getPhotoRegistration = ( camera, simulation, radius, calibration, aspect, width, height ) =>
{
  const project = ( point ) =>
  {
    const projected = point.clone().project( camera )
    return {
      x: ( projected.x + 1 ) / 2,
      y: ( 1 - projected.y ) / 2,
    }
  }
  const rackApex = project( new THREE.Vector3(
    simulation.config.rack.apexX,
    radius,
    simulation.config.rack.apexZ,
  ) )
  const strikerContact = project( new THREE.Vector3(
    simulation.initial.strikerImpact.x,
    radius,
    simulation.initial.strikerImpact.z,
  ) )
  const expectedRackApex = adaptReferenceUv( calibration.projectedAnchors.rackApex, calibration, aspect )
  const expectedStrikerContact = adaptReferenceUv( calibration.projectedAnchors.strikerContact, calibration, aspect )
  const distance = ( actual, expected ) => Math.hypot(
    ( actual.x - expected[ 0 ] ) * width,
    ( actual.y - expected[ 1 ] ) * height,
  )
  return {
    anchorError: Math.max(
      distance( rackApex, expectedRackApex ),
      distance( strikerContact, expectedStrikerContact ),
    ),
    rackApex,
    strikerContact,
  }
}

const createPoolBallTexture = ( color, number, anisotropy ) =>
{
  const canvas = document.createElement( 'canvas' )
  canvas.width = 1024
  canvas.height = 512
  const context = canvas.getContext( '2d' )
  const isStripe = number > 8

  // Stripe balls use an ivory shell with a regulation-width colored belt.
  context.fillStyle = isStripe ? '#f4f0e6' : color
  context.fillRect( 0, 0, canvas.width, canvas.height )
  if ( isStripe )
  {
    context.fillStyle = color
    context.fillRect( 0, 158, canvas.width, 196 )
  }

  ;[ 256, 768 ].forEach( ( centerX ) =>
  {
    context.fillStyle = '#f8f5ed'
    context.beginPath()
    context.arc( centerX, 256, 67, 0, Math.PI * 2 )
    context.fill()
    context.strokeStyle = 'rgba(0, 0, 0, 0.14)'
    context.lineWidth = 3
    context.stroke()
    context.fillStyle = '#090b09'
    context.font = '800 72px Arial, sans-serif'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText( String( number ), centerX, 260 )

    if ( number === 6 || number === 9 )
    {
      context.fillRect( centerX - 22, 292, 44, 5 )
    }
  } )

  const texture = new THREE.CanvasTexture( canvas )
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = anisotropy
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
    // Clip the supplied square artwork so only the circular brand mark reaches the decal.
    context.clearRect( 0, 0, canvas.width, canvas.height )
    context.save()
    context.beginPath()
    context.arc( 256, 256, 232, 0, Math.PI * 2 )
    context.clip()
    context.drawImage( image, 24, 24, 464, 464 )
    context.restore()
    texture.needsUpdate = true
    requestRender()
  }

  image.addEventListener( 'load', paint, { once: true } )
  image.src = brandLogo
  if ( image.complete ) paint()
  return {
    texture,
    dispose ()
    {
      disposed = true
      image.removeEventListener( 'load', paint )
      image.src = ''
    },
  }
}

// Use the same soft radial contact cue as Draft 2 so every ball reads as resting on felt.
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

const createWarmEnvironment = ( renderer ) =>
{
  const environmentScene = new THREE.Scene()
  // A dim felt-colored ambient floor stops glossy black surfaces clipping to absolute black.
  environmentScene.background = new THREE.Color( '#151b16' )
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

  // Reflection cards reproduce the photographed room and keep the black foreground ball readable.
  addCard( new THREE.CircleGeometry( 0.72, 48 ), '#ffd99a', 2.2, [ -0.25, 2.1, -0.55 ] )
  addCard( new THREE.PlaneGeometry( 1.8, 0.34 ), '#b77742', 0.62, [ 1.7, 0.72, 0.25 ] )
  addCard( new THREE.PlaneGeometry( 1.2, 0.26 ), '#426352', 0.32, [ -1.4, 0.38, -0.8 ] )
  addCard( new THREE.PlaneGeometry( 1.6, 0.72 ), '#8ca899', 0.38, [ 0, 0.58, 1.65 ], [ 0, 0.04, 0.3 ] )

  const generator = new THREE.PMREMGenerator( renderer )
  generator.compileCubemapShader()
  const target = generator.fromScene( environmentScene, 0.04 )
  resources.forEach( ( resource ) => resource.dispose() )
  generator.dispose()
  return target
}

const createBallMaterial = ( color, texture ) => new THREE.MeshPhysicalMaterial( {
  color: texture ? '#ffffff' : color,
  map: texture,
  ...MATERIAL_CONTRACT.ball,
  envMapIntensity: 0.78,
} )

const buildWorld = ( canvas, simulation, requestRender ) =>
{
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera( 36, 1, 0.01, 40 )
  const renderer = new THREE.WebGLRenderer( {
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
  } )
  renderer.setClearColor( 0x000000, 0 )
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.95
  // The photo carries broad table shading; explicit contact planes add ball grounding without a shadow-map pass.
  renderer.shadowMap.enabled = false

  const maximumAnisotropy = Math.min( 8, renderer.capabilities.getMaxAnisotropy() )
  const disposableTextures = new Set()
  const environmentTarget = createWarmEnvironment( renderer )
  scene.environment = environmentTarget.texture
  scene.environmentIntensity = 0.68

  const tableRoot = new THREE.Group()
  scene.add( tableRoot )

  const radius = simulation.config.ball.radius
  const ballGeometry = new THREE.SphereGeometry( radius, 48, 32 )
  const ballMeshes = []
  const contactShadowTexture = createContactShadowTexture( maximumAnisotropy )
  disposableTextures.add( contactShadowTexture )
  const contactShadowMaterial = new THREE.MeshBasicMaterial( {
    map: contactShadowTexture,
    color: '#020403',
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  } )
  const contactShadowGeometry = new THREE.PlaneGeometry( radius * 2.8, radius * 2.8 )
  contactShadowGeometry.rotateX( -Math.PI / 2 )
  const shadowGroup = new THREE.Group()
  tableRoot.add( shadowGroup )
  const ballShadows = []
  const addBallShadow = () =>
  {
    const shadow = new THREE.Mesh( contactShadowGeometry, contactShadowMaterial )
    shadow.position.y = 0.001
    shadow.renderOrder = 1
    shadowGroup.add( shadow )
    ballShadows.push( shadow )
  }

  const logoAsset = createLogoTexture( maximumAnisotropy, requestRender )
  const logoTexture = logoAsset.texture
  disposableTextures.add( logoTexture )
  const strikerMaterial = createBallMaterial( '#070807', null )
  const strikerMesh = new THREE.Mesh( ballGeometry, strikerMaterial )
  strikerMesh.castShadow = false
  strikerMesh.receiveShadow = false
  strikerMesh.updateMatrixWorld()

  const decalMaterial = new THREE.MeshPhysicalMaterial( {
    map: logoTexture,
    color: '#ffffff',
    // Pure-black logo pixels need a low ambient floor or they crush despite the reflected light.
    emissive: '#26382f',
    emissiveIntensity: 0.35,
    transparent: true,
    ...MATERIAL_CONTRACT.decal,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  } )
  const strikerGroup = new THREE.Group()

  ;[ [ radius, 0 ], [ -radius, Math.PI ] ].forEach( ( [ decalZ, yaw ] ) =>
  {
    const decal = new THREE.Mesh(
      new DecalGeometry(
        strikerMesh,
        new THREE.Vector3( 0, 0, decalZ ),
        new THREE.Euler( 0, yaw, 0 ),
        new THREE.Vector3( radius * 1.58, radius * 1.58, radius * 0.42 ),
      ),
      decalMaterial,
    )
    decal.renderOrder = 2
    strikerGroup.add( decal )
  } )
  strikerGroup.add( strikerMesh )
  tableRoot.add( strikerGroup )
  ballMeshes.push( strikerGroup )
  addBallShadow()

  RACK_BALL_NUMBERS.forEach( ( number ) =>
  {
    const texture = createPoolBallTexture(
      BALL_COLORS[ number - 1 ],
      number,
      maximumAnisotropy,
    )
    disposableTextures.add( texture )
    const material = createBallMaterial( BALL_COLORS[ number - 1 ], texture )
    const mesh = new THREE.Mesh( ballGeometry, material )
    mesh.castShadow = false
    mesh.receiveShadow = false
    tableRoot.add( mesh )
    ballMeshes.push( mesh )
    addBallShadow()
  } )

  // The pendant supplies warm specular light while the contact planes anchor balls to the photo plate.
  const pendantSpot = new THREE.SpotLight( '#ffe5b5', 18, 7, Math.PI / 3.1, 0.82, 1.35 )
  pendantSpot.castShadow = false
  pendantSpot.target.position.set( 0, 0, simulation.config.rack.apexZ )
  scene.add( pendantSpot, pendantSpot.target )

  const baseLightPosition = new THREE.Vector3()
  let hoverResponse = resolvePhotoHoverResponse()
  const setHoverResponse = ( nextResponse = resolvePhotoHoverResponse() ) =>
  {
    hoverResponse = nextResponse
    // Keep the existing key light and 8-ball reflection response aligned with the camera hover cue.
    pendantSpot.position.set(
      baseLightPosition.x + nextResponse.x * 0.045,
      baseLightPosition.y + nextResponse.y * 0.035,
      baseLightPosition.z - nextResponse.x * 0.02 + nextResponse.y * 0.02,
    )
    strikerMaterial.envMapIntensity = 0.78 + nextResponse.strength * 0.12
    decalMaterial.envMapIntensity = 1 + nextResponse.strength * 0.1
    decalMaterial.emissiveIntensity = 0.35 + nextResponse.strength * 0.04
  }

  const feltBounce = new THREE.HemisphereLight( '#1b5b43', '#020302', 0.42 )
  scene.add( feltBounce )
  const warmFill = new THREE.DirectionalLight( LIGHTING_CONTRACT.key.color, 0.28 )
  warmFill.position.set( 1.8, 1.05, 0.55 )
  scene.add( warmFill )

  const render = () =>
  {
    renderer.render( scene, camera )
  }
  const resize = () =>
  {
    const width = Math.max( 1, canvas.clientWidth || window.innerWidth )
    const height = Math.max( 1, canvas.clientHeight || window.innerHeight )
    const aspect = width / height
    const mode = height > width ? 'portrait' : 'landscape'
    const calibration = PLATE_CALIBRATIONS[ mode ]
    const plane = calibration.tablePlane

    camera.aspect = aspect
    camera.updateProjectionMatrix()

    tableRoot.position.set( ...plane.position )
    tableRoot.rotation.set( ...plane.rotation )
    tableRoot.scale.setScalar( plane.scale )
    baseLightPosition.set( ...calibration.lightPosition )
    setHoverResponse( hoverResponse )

    // Keep CSS size and camera framing unchanged while limiting internal render pixels.
    const pixelRatio = Math.min( window.devicePixelRatio || 1, DRAFT1_PIXEL_RATIO_CAP )
    renderer.setPixelRatio( pixelRatio )
    renderer.setSize( width, height, false )

    canvas.dataset.plate = mode
    canvas.dataset.farRail = `${calibration.farRailAnchors.left.join( ',' )};${calibration.farRailAnchors.right.join( ',' )}`
    canvas.dataset.pockets = calibration.pocketProjection.length
    canvas.dataset.contactShadows = String( ballShadows.length )
  }

  const dispose = () =>
  {
    if ( dispose.called ) return
    dispose.called = true
    logoAsset.dispose()
    const geometries = new Set()
    const disposableMaterials = new Set()
    scene.traverse( ( object ) =>
    {
      if ( object.geometry ) geometries.add( object.geometry )
      if ( object.material )
      {
        const objectMaterials = Array.isArray( object.material ) ? object.material : [ object.material ]
        objectMaterials.forEach( ( material ) => disposableMaterials.add( material ) )
      }
    } )
    geometries.forEach( ( geometry ) => geometry.dispose() )
    disposableMaterials.forEach( ( material ) => material.dispose() )
    disposableTextures.forEach( ( texture ) => texture.dispose() )
    // Detach scene references before releasing the PMREM target so Three.js cannot
    // retain a disposed environment or background through the scene graph.
    scene.environment = null
    scene.background = null
    environmentTarget.dispose()
    renderer.renderLists.dispose()
    renderer.dispose()
  }

  return {
    camera,
    radius,
    ballMeshes,
    ballShadows,
    renderer,
    resize,
    render,
    setHoverResponse,
    dispose,
  }
}

export function Draft4PoolPov ( { active, onController } )
{
  const rootRef = useRef( null )
  const canvasRef = useRef( null )
  const controllerRef = useRef( null )

  useLayoutEffect( () =>
  {
    const root = rootRef.current
    const canvas = canvasRef.current
    if ( !root || !canvas ) return undefined

    const simulation = getBreakSimulation()
    let world = null
    let isActive = active
    let progress = 0
    let resizePending = true
    let destroyed = false
    let renderFrame = () => {}
    let renderContinuation = false
    const diagnosticsEnabled = isFramingDiagnosticsEnabled( window )

    const scheduler = createDemandFrameScheduler( {
      active: isActive,
      requestAnimationFrame: ( callback ) => window.requestAnimationFrame( callback ),
      cancelAnimationFrame: ( handle ) => window.cancelAnimationFrame( handle ),
      render: ( frameState ) => renderFrame( frameState ),
      shouldContinue: () => renderContinuation,
    } )

    try
    {
      world = buildWorld( canvas, simulation, () => scheduler.invalidate() )
      root.dataset.webglError = 'false'
      // Diagnostics expose the shared physical contract without retaining Three.js objects.
      root.dataset.ballRoughness = String( MATERIAL_CONTRACT.ball.roughness )
      root.dataset.ballClearcoat = String( MATERIAL_CONTRACT.ball.clearcoat )
      root.dataset.ballIor = String( MATERIAL_CONTRACT.ball.ior )
      root.dataset.materialColorSpace = 'srgb'
    }
    catch ( error )
    {
      // The photo remains visible if WebGL setup fails, so the opening is still usable.
      root.dataset.webglError = 'true'
      console.warn( 'Cinematic pool overlay unavailable:', error )
    }

    const requestRender = () => scheduler.invalidate()

    // Fine-pointer input shares Draft 2's bounded damping for the transparent 3D ball layer.
    const prefersReducedMotion = window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches
    const pointer = createPointerParallax( {
      windowObject: window,
      isActive: () => isActive,
      requestRender,
      onResize: () => { resizePending = true },
      // Reduced-motion visitors get the neutral plate composition without a damped hover loop.
      enabled: !prefersReducedMotion,
    } )

    const renderScene = () =>
    {
      const state = sampleCinematicBreakState( progress, simulation, { weightedApproach: true } )

      if ( world )
      {
        state.balls.forEach( ( ball, index ) =>
        {
          const mesh = world.ballMeshes[ index ]
          if ( !mesh ) return
          mesh.position.set( ball.position.x, ball.position.y, ball.position.z )
          mesh.quaternion.set(
            ball.quaternion.x,
            ball.quaternion.y,
            ball.quaternion.z,
            ball.quaternion.w,
          )
          mesh.visible = ball.visibility

          const shadow = world.ballShadows[ index ]
          if ( shadow )
          {
            shadow.position.set( ball.position.x, 0.001, ball.position.z )
            // Keep the shadow on the felt plane, fading it as a ball drops into a pocket.
            const heightOffset = Math.max( 0, ( ball.position.y - world.radius ) / world.radius )
            const pocketFade = ball.pocketDepth ? Math.max( 0, 1 - ball.pocketDepth * 4 ) : 1
            const shadowScale = ( 1 - heightOffset * 0.8 ) * pocketFade
            shadow.scale.setScalar( Math.max( 0.001, shadowScale ) )
            shadow.visible = ball.visibility && shadowScale > 0.02
          }
        } )

        const framing = resolveIntroCameraFraming( {
          progress,
          transitionReadyProgress: STORY_TIMING.intro.draft1.transitionReady,
          aspect: world.camera.aspect,
          sourceScale: 1 / DRAFT2_SCENE_SCALE,
          pointerX: pointer.state.x,
          pointerY: pointer.state.y,
          pointerEnabled: pointer.state.enabled,
          lockToPlate: true,
        } )
        const hoverResponse = resolvePhotoHoverResponse( {
          pointerX: pointer.state.x,
          pointerY: pointer.state.y,
          pointerEnabled: pointer.state.enabled,
        } )
        world.setHoverResponse( hoverResponse )
        world.camera.fov = framing.fov
        world.camera.position.set( ...framing.camera )
        world.camera.lookAt( ...framing.target )
        world.camera.updateProjectionMatrix()
        world.camera.updateMatrixWorld( true )
        if ( diagnosticsEnabled )
        {
          const width = Math.max( 1, canvas.clientWidth || window.innerWidth )
          const height = Math.max( 1, canvas.clientHeight || window.innerHeight )
          const calibration = PLATE_CALIBRATIONS[ canvas.dataset.plate ]
          const photoRegistration = calibration
            ? getPhotoRegistration(
              world.camera,
              simulation,
              world.radius,
              calibration,
              world.camera.aspect,
              width,
              height,
            )
            : null
          publishFramingDiagnostics(
            canvas,
            world.camera,
            state.balls,
            world.radius,
            framing,
            photoRegistration,
            hoverResponse,
          )
        }
        world.render()
        // Keep render-completion timing behind the existing benchmark seam so
        // normal visitors pay no dataset mutation on each WebGL paint.
        if ( diagnosticsEnabled ) root.dataset.webglRenderAt = performance.now().toFixed( 3 )
      }

      // Fade the photograph, lighting, and balls as one reversible composition.
      root.style.setProperty( '--draft-exit-opacity', String( state.opacity ) )
      root.dataset.phase = state.phase
    }

    const updateScene = ( nextProgress ) =>
    {
      progress = clamp( nextProgress )
      // Keep the selected Draft's Story playhead observable even while its render is demand-driven.
      root.dataset.webglProgress = progress.toFixed( 4 )
      requestRender()
    }

    const handleContextLost = ( event ) =>
    {
      event.preventDefault()
      root.dataset.webglError = 'true'
    }

    const controller = {
      setProgress ( nextProgress )
      {
        updateScene( nextProgress )
      },
      setActive ( nextActive )
      {
        isActive = nextActive
        root.classList.toggle( 'is-active', isActive )
        root.setAttribute( 'aria-hidden', String( !isActive ) )
        if ( !isActive )
        {
          pointer.reset()
          // Clear the hidden Draft's light response so reactivation starts from neutral.
          world?.setHoverResponse( resolvePhotoHoverResponse() )
        }

        if ( isActive ) pointer.syncCapability()
        scheduler.setActive( isActive )
        updateScene( progress )
      },
    }

    renderFrame = () =>
    {
      renderContinuation = false
      if ( destroyed || !isActive || !world ) return

      if ( resizePending )
      {
        world.resize()
        resizePending = false
      }

      renderScene()

      const pointerSettled = pointer.advance()
      // Pointer damping or a pending resize keeps the demand-driven scheduler alive until settled.
      renderContinuation = !pointerSettled || resizePending
    }

    controllerRef.current = controller
    onController?.( controller )
    canvas.addEventListener( 'webglcontextlost', handleContextLost )
    pointer.addListeners()
    controller.setProgress( progress )
    controller.setActive( active )

    return () =>
    {
      destroyed = true
      scheduler.destroy()
      pointer.removeListeners()
      canvas.removeEventListener( 'webglcontextlost', handleContextLost )
      onController?.( null )
      if ( controllerRef.current === controller ) controllerRef.current = null
      world?.dispose()
    }
  }, [ onController ] )

  useLayoutEffect( () =>
  {
    controllerRef.current?.setActive( active )
  }, [ active ] )

  return (
    <div className="draft-layer draft-layer-2d" ref={ rootRef } aria-hidden={ !active }>
      <picture className="pool-pov-visual" aria-hidden="true">
        <source media="(orientation: portrait)" srcSet={ portraitPool } />
        <img className="pool-pov-photo" src={ landscapePool } alt="" />
      </picture>
      <canvas ref={ canvasRef } className="pool-pov-balls-canvas" aria-hidden="true" />
      <div className="pool-pov-vignette" aria-hidden="true" />
    </div>
  )
}
