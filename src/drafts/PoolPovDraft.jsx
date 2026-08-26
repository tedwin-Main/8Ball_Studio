import { useLayoutEffect, useRef } from 'react'
import * as THREE from 'three'
import { DecalGeometry } from 'three/addons/geometries/DecalGeometry.js'
import brandLogo from '../assets/8BALL-V4.jpg'
import landscapePool from '../assets/drafts/pool-pov-landscape.png'
import portraitPool from '../assets/drafts/pool-pov-portrait.png'
import {
  getBreakSimulation,
  sampleCinematicBreakState,
} from './poolBreakPhysics'

const clamp = ( value, min = 0, max = 1 ) => Math.min( max, Math.max( min, value ) )
const lerp = ( start, end, progress ) => start + ( end - start ) * progress

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

// Scale Draft 2's opening camera into Draft 1 units so the 8-ball dominates the foreground.
const CLOSE_THIRD_PERSON_FOV = 38
const CLOSE_THIRD_PERSON_CAMERA = Object.freeze( {
  position: Object.freeze( [ 0, 0.103, 0.771 ] ),
  // Keep the far rack locked to the photographic table while moving closer to the 8-ball.
  target: Object.freeze( [ 0, -0.0312, -0.344 ] ),
} )

// Each plate stores its table, light, rail, and projected pocket measurements together.
const PLATE_CALIBRATIONS = Object.freeze( {
  landscape: Object.freeze( {
    referenceAspect: 1.6,
    fov: CLOSE_THIRD_PERSON_FOV,
    camera: CLOSE_THIRD_PERSON_CAMERA,
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
    fov: CLOSE_THIRD_PERSON_FOV,
    camera: CLOSE_THIRD_PERSON_CAMERA,
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

const projectUv = ( point, camera ) =>
{
  const projected = point.clone().project( camera )
  return [ ( projected.x + 1 ) / 2, ( 1 - projected.y ) / 2 ]
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
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = anisotropy

  const paint = () =>
  {
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
  roughness: 0.075,
  metalness: 0,
  clearcoat: 1,
  clearcoatRoughness: 0.035,
  ior: 1.54,
  reflectivity: 0.82,
  envMapIntensity: 0.78,
} )

const buildWorld = ( canvas, simulation ) =>
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
  // The photo already carries the table shading, so do not add a second shadow layer.
  renderer.shadowMap.enabled = false

  const maximumAnisotropy = Math.min( 8, renderer.capabilities.getMaxAnisotropy() )
  const disposableTextures = new Set()
  let renderWorld = () => {}
  const environmentTarget = createWarmEnvironment( renderer )
  scene.environment = environmentTarget.texture
  scene.environmentIntensity = 0.68

  const tableRoot = new THREE.Group()
  scene.add( tableRoot )

  const radius = simulation.config.ball.radius
  const ballGeometry = new THREE.SphereGeometry( radius, 48, 32 )
  const ballMeshes = []

  const logoTexture = createLogoTexture( maximumAnisotropy, () => renderWorld() )
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
    roughness: 0.12,
    clearcoat: 0.9,
    clearcoatRoughness: 0.05,
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
  } )

  // The pendant supplies warm specular light; ground shadows stay off against the photo plate.
  const pendantSpot = new THREE.SpotLight( '#ffe5b5', 18, 7, Math.PI / 3.1, 0.82, 1.35 )
  pendantSpot.castShadow = false
  pendantSpot.target.position.set( 0, 0, simulation.config.rack.apexZ )
  scene.add( pendantSpot, pendantSpot.target )

  const feltBounce = new THREE.HemisphereLight( '#1b5b43', '#020302', 0.42 )
  scene.add( feltBounce )
  const warmFill = new THREE.DirectionalLight( '#d9a36e', 0.34 )
  warmFill.position.set( 1.8, 1.05, 0.55 )
  scene.add( warmFill )

  const render = () =>
  {
    renderer.render( scene, camera )
  }
  renderWorld = render

  const resize = () =>
  {
    const width = Math.max( 1, canvas.clientWidth || window.innerWidth )
    const height = Math.max( 1, canvas.clientHeight || window.innerHeight )
    const aspect = width / height
    const mode = height > width ? 'portrait' : 'landscape'
    const calibration = PLATE_CALIBRATIONS[ mode ]
    const plane = calibration.tablePlane

    camera.aspect = aspect
    camera.fov = calibration.fov
    camera.position.set( ...calibration.camera.position )
    camera.lookAt( ...calibration.camera.target )
    camera.updateProjectionMatrix()
    camera.updateMatrixWorld()

    tableRoot.position.set( ...plane.position )
    tableRoot.rotation.set( ...plane.rotation )
    tableRoot.scale.setScalar( plane.scale )
    pendantSpot.position.set( ...calibration.lightPosition )

    // Cap fill rate on dense mobile screens while preserving ball material detail.
    const pixelRatioCap = width <= 768 ? 1.5 : 2
    const pixelRatio = Math.min( window.devicePixelRatio || 1, pixelRatioCap )
    renderer.setPixelRatio( pixelRatio )
    renderer.setSize( width, height, false )

    const apex = new THREE.Vector3(
      simulation.config.rack.apexX,
      radius,
      simulation.config.rack.apexZ,
    )
    const contact = new THREE.Vector3(
      simulation.initial.strikerImpact.x,
      radius,
      simulation.initial.strikerImpact.z,
    )
    const expectedApex = adaptReferenceUv(
      calibration.projectedAnchors.rackApex,
      calibration,
      aspect,
    )
    const expectedContact = adaptReferenceUv(
      calibration.projectedAnchors.strikerContact,
      calibration,
      aspect,
    )
    const actualApex = projectUv( apex, camera )
    const actualContact = projectUv( contact, camera )
    const anchorError = Math.max(
      Math.hypot(
        ( actualApex[ 0 ] - expectedApex[ 0 ] ) * width,
        ( actualApex[ 1 ] - expectedApex[ 1 ] ) * height,
      ),
      Math.hypot(
        ( actualContact[ 0 ] - expectedContact[ 0 ] ) * width,
        ( actualContact[ 1 ] - expectedContact[ 1 ] ) * height,
      ),
    )
    canvas.dataset.plate = mode
    canvas.dataset.anchorError = anchorError.toFixed( 2 )
    canvas.dataset.farRail = `${calibration.farRailAnchors.left.join( ',' )};${calibration.farRailAnchors.right.join( ',' )}`
    canvas.dataset.pockets = calibration.pocketProjection.length
    render()
  }

  const dispose = () =>
  {
    scene.traverse( ( object ) =>
    {
      if ( object.geometry && object.geometry !== ballGeometry ) object.geometry.dispose()
      if ( object.material )
      {
        const materials = Array.isArray( object.material ) ? object.material : [ object.material ]
        materials.forEach( ( material ) => material.dispose() )
      }
    } )
    ballGeometry.dispose()
    disposableTextures.forEach( ( texture ) => texture.dispose() )
    environmentTarget.dispose()
    renderer.dispose()
  }

  return {
    ballMeshes,
    renderer,
    resize,
    render,
    dispose,
  }
}

export function PoolPovDraft ( { active, onController } )
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

    try
    {
      world = buildWorld( canvas, simulation )
      root.dataset.webglError = 'false'
    }
    catch ( error )
    {
      // The photo remains visible if WebGL setup fails, so the opening is still usable.
      root.dataset.webglError = 'true'
      console.warn( 'Cinematic pool overlay unavailable:', error )
    }

    const updateScene = ( nextProgress ) =>
    {
      progress = clamp( nextProgress )
      const state = sampleCinematicBreakState( progress, simulation )

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
        } )

        world.render()
      }

      // Fade the photograph, lighting, and balls as one reversible composition.
      root.style.setProperty( '--draft-exit-opacity', String( state.opacity ) )
      root.dataset.phase = state.phase
    }

    const handleResize = () =>
    {
      world?.resize()
      updateScene( progress )
    }
    const handleContextLost = ( event ) =>
    {
      event.preventDefault()
      root.dataset.webglError = 'true'
    }

    const controller = {
      setProgress: updateScene,
      setActive ( nextActive )
      {
        isActive = nextActive
        root.classList.toggle( 'is-active', isActive )
        root.setAttribute( 'aria-hidden', String( !isActive ) )
        if ( isActive ) updateScene( progress )
      },
    }

    controllerRef.current = controller
    onController?.( controller )
    canvas.addEventListener( 'webglcontextlost', handleContextLost )
    window.addEventListener( 'resize', handleResize )
    world?.resize()
    controller.setProgress( progress )
    controller.setActive( active )

    return () =>
    {
      window.removeEventListener( 'resize', handleResize )
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
