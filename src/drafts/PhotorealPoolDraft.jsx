// Draft 4 — Photoreal Break Intro Draft.
// Built from scratch with regulation 3D table geometry, PBR materials, and paused GSAP choreography.
import { useLayoutEffect, useRef } from "react"
import * as THREE from "three"
import { DecalGeometry } from "three/addons/geometries/DecalGeometry.js"
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js"
import brandLogo from "../assets/8BALL-V4.jpg"
import {
  TABLE_DIMS,
  POCKET_COORDS,
  createSlateGeometry,
  createApronGeometry,
  createRailAssembly,
  createPocketAssembly,
  createAngledCushionGeometry,
  createRailSights,
  createCueStick,
} from "./photorealGeometry.js"
import {
  createPhotorealMaterials,
  createPhenolicBallMaterial,
  createNumberedBallTexture,
} from "./photorealMaterials.js"
import { createPhotorealChoreography } from "./photorealTimeline.js"
import {
  createPointerParallax,
  DRAFT2_SCENE_SCALE,
  resolveIntroCameraFraming,
} from "./cameraFraming.js"
import { TABLE_PALETTE } from "./tablePalette.js"
import { STORY_TIMING } from "../storyTiming.js"
import { createDemandFrameScheduler } from "./demandFrameScheduler.js"

import { createStudioEnvironment } from './poolSurfaceTextures.js'
import { POOL_QUALITY_TIERS, getPoolQualitySignals, selectPoolQualityTier, createQualityMonitor } from './renderQuality.js'

RectAreaLightUniformsLib.init()

const BALL_COLORS = Object.freeze( [
  "#f5c518", "#0047bb", "#e53935", "#5b2c86", "#f26522", "#1b5e20", "#7b1113",
  "#0b0b0d",
  "#f5c518", "#0047bb", "#e53935", "#5b2c86", "#f26522", "#1b5e20", "#7b1113",
] )

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

  let disposed = false
  texture.addEventListener( "dispose", () => { disposed = true; image.onload = null } )
  const paint = () =>
  {
    if ( disposed || !image.naturalWidth ) return
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

  image.onload = paint
  image.src = brandLogo
  if ( image.complete ) paint()
  return texture
}

const buildPhotorealScene = ( canvas, onTextureReady, onQualityState ) =>
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
  renderer.toneMappingExposure = 0.92
  renderer.shadowMap.enabled = true
  // Soft percentage-closer filtering eliminates harsh pixelated shadow edges.
  renderer.shadowMap.type = THREE.PCFShadowMap

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera( 42, 1, 0.1, 80 )

  const envTarget = createStudioEnvironment( renderer )
  scene.environment = envTarget.texture
  scene.environmentIntensity = 0.45

  const anisotropy = Math.min( 8, renderer.capabilities.getMaxAnisotropy() )
  const materials = createPhotorealMaterials( disposableMaterials, disposableTextures, anisotropy, onTextureReady )

  const table = new THREE.Group()
  scene.add( table )

  // 1. Slate & Cloth surface with pocket holes
  const slateGeom = createSlateGeometry()
  disposableGeometries.add( slateGeom )
  const feltMesh = new THREE.Mesh( slateGeom, materials.cloth )
  feltMesh.receiveShadow = true
  table.add( feltMesh )

  // 2. Real 3D pocket cavities & castings
  createPocketAssembly( POCKET_COORDS, materials, table, disposableGeometries )

  createRailAssembly( materials.rails, table, disposableGeometries, materials.metalCastings )

  // Rail cushions with 40-45 degree beveled facings angled inward toward pocket throats
  const headFootCushionGeom = createAngledCushionGeometry( 7.64, 0.36, 0.20, 42, 42 )
  disposableGeometries.add( headFootCushionGeom )
  const sideCushionGeom = createAngledCushionGeometry( 8.06, 0.36, 0.20, 42, 42 )
  disposableGeometries.add( sideCushionGeom )

  // Head rail cushion
  const headCushion = new THREE.Mesh( headFootCushionGeom, materials.cushions )
  headCushion.position.set( 0, 0.22, -9.24 )
  headCushion.castShadow = true
  table.add( headCushion )

  // Foot rail cushion
  const footCushion = new THREE.Mesh( headFootCushionGeom, materials.cushions )
  footCushion.rotation.y = Math.PI
  footCushion.position.set( 0, 0.22, 9.24 )
  footCushion.castShadow = true
  table.add( footCushion )

  // Side cushions (4 segments with facings angled inward toward corner and side pockets)
  ;[
    { x: 4.44, z: 4.65, rotY: -Math.PI / 2 },
    { x: 4.44, z: -4.65, rotY: -Math.PI / 2 },
    { x: -4.44, z: 4.65, rotY: Math.PI / 2 },
    { x: -4.44, z: -4.65, rotY: Math.PI / 2 },
  ].forEach( ( cfg ) =>
  {
    const cushion = new THREE.Mesh( sideCushionGeom, materials.cushions )
    cushion.rotation.y = cfg.rotY
    cushion.position.set( cfg.x, 0.22, cfg.z )
    cushion.castShadow = true
    table.add( cushion )
  } )

  // 4. Inlaid diamond sights
  createRailSights( materials, table, disposableGeometries )

  // 5. Apron skirt box
  // Positioned so top of apron skirt (-0.06) sits below felt (0.00) to eliminate co-planar Z-fighting.
  const apronGeom = createApronGeometry()
  disposableGeometries.add( apronGeom )
  const apronMesh = new THREE.Mesh( apronGeom, materials.apron )
  apronMesh.position.set( 0, -0.42, 0 )
  apronMesh.receiveShadow = true
  table.add( apronMesh )

  // 6. Contact shadows
  const shadowGroup = new THREE.Group()
  table.add( shadowGroup )
  const contactShadowGeom = new THREE.PlaneGeometry( TABLE_DIMS.ballRadius * 2.8, TABLE_DIMS.ballRadius * 2.8 )
  contactShadowGeom.rotateX( -Math.PI / 2 )
  disposableGeometries.add( contactShadowGeom )

  const contactShadows = []

  // 7. Balls (16 phenolic resin balls)
  const ballGeometry = new THREE.SphereGeometry( TABLE_DIMS.ballRadius, 48, 28 )
  disposableGeometries.add( ballGeometry )

  const ballMeshes = []

  // Striker (8-Ball)
  const strikerMaterial = createPhenolicBallMaterial( "#060706", null, disposableMaterials, materials.resin )
  const strikerMesh = new THREE.Mesh( ballGeometry, strikerMaterial )
  strikerMesh.castShadow = true
  strikerMesh.receiveShadow = true
  table.add( strikerMesh )

  const logoTexture = createLogoTexture( anisotropy, onTextureReady )
  disposableTextures.add( logoTexture )
  const decalMaterial = new THREE.MeshPhysicalMaterial( {
    map: logoTexture,
    color: "#ffffff",
    transparent: true,
    depthTest: true,
    depthWrite: false,
    roughness: 0.12,
    metalness: 0,
    clearcoat: 0.85,
    clearcoatRoughness: 0.05,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  } )
  disposableMaterials.add( decalMaterial )

  // Update world matrix before projecting DecalGeometry
  strikerMesh.updateMatrixWorld( true )
  // Double-sided 8-ball decals facing front (+Z) and back (-Z)
  ;[ [ TABLE_DIMS.ballRadius, 0 ], [ -TABLE_DIMS.ballRadius, Math.PI ] ].forEach( ( [ decalZ, yaw ] ) =>
  {
    const decalGeom = new DecalGeometry(
      strikerMesh,
      new THREE.Vector3( 0, 0, decalZ ),
      new THREE.Euler( 0, yaw, 0 ),
      new THREE.Vector3( TABLE_DIMS.ballRadius * 1.58, TABLE_DIMS.ballRadius * 1.58, TABLE_DIMS.ballRadius * 0.42 ),
    )
    disposableGeometries.add( decalGeom )
    const decal = new THREE.Mesh( decalGeom, decalMaterial )
    decal.renderOrder = 2
    strikerMesh.add( decal )
  } )

  const strikerShadow = new THREE.Mesh( contactShadowGeom, materials.contactShadow )
  strikerShadow.position.y = 0.001
  shadowGroup.add( strikerShadow )
  contactShadows.push( strikerShadow )

  // Object balls (1 to 15)
  for ( let number = 1; number <= 15; number += 1 )
  {
    const texture = createNumberedBallTexture( number, BALL_COLORS[ number - 1 ], anisotropy )
    disposableTextures.add( texture )
    const ballMat = createPhenolicBallMaterial( BALL_COLORS[ number - 1 ], texture, disposableMaterials, materials.resin )
    const mesh = new THREE.Mesh( ballGeometry, ballMat )
    mesh.castShadow = true
    mesh.receiveShadow = true
    table.add( mesh )
    ballMeshes.push( mesh )

    const shadow = new THREE.Mesh( contactShadowGeom, materials.contactShadow )
    shadow.position.y = 0.001
    shadowGroup.add( shadow )
    contactShadows.push( shadow )
  }

  // 8. Tapered two-piece tournament cue stick
  const cueStick = createCueStick( materials, disposableGeometries )
  table.add( cueStick )

  // 9. Three-point studio lighting rig
  const overheadRectLight = new THREE.RectAreaLight( 0xfff4e5, 2.1, 2.8, 12.0 )
  overheadRectLight.position.set( -2.8, 6, 1.5 )
  overheadRectLight.lookAt( 0, 0, -1 )
  scene.add( overheadRectLight )

  const keyLight = new THREE.DirectionalLight( "#ffe8c2", 1.25 )
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

  const leftChamferFill = new THREE.DirectionalLight( "#d4eae0", 0.28 )
  leftChamferFill.position.set( -8.5, 3.8, 0 )
  leftChamferFill.target.position.set( 0, 0, 0 )
  scene.add( leftChamferFill, leftChamferFill.target )

  const rightChamferFill = new THREE.DirectionalLight( "#f0e6d6", 0.25 )
  rightChamferFill.position.set( 8.5, 3.8, 0 )
  rightChamferFill.target.position.set( 0, 0, 0 )
  scene.add( rightChamferFill, rightChamferFill.target )

  const overheadSpot = new THREE.SpotLight( "#fff3da", 3.6, 26, Math.PI / 3.2, 0.8, 1.3 )
  overheadSpot.position.set( 0, 8.5, -3.2 )
  overheadSpot.target.position.set( 0, 0, -3.2 )
  overheadSpot.castShadow = false
  scene.add( overheadSpot, overheadSpot.target )

  const feltBounce = new THREE.HemisphereLight( TABLE_PALETTE.feltBounce, "#020403", 0.35 )
  scene.add( feltBounce )

  const rimLight = new THREE.DirectionalLight( "#df9654", 0.48 )
  rimLight.position.set( 5.5, 4.8, -7.5 )
  rimLight.target.position.set( 0, 0, -3 )
  scene.add( rimLight, rimLight.target )

  // 10. GSAP Choreography
  const choreography = createPhotorealChoreography( {
    camera,
    cueStick,
    strikerMesh,
    ballMeshes,
    contactShadows,
    keyLight,
  } )

  let width = canvas.clientWidth || window.innerWidth
  let height = canvas.clientHeight || window.innerHeight
  const signals = getPoolQualitySignals( width, height )
  let activeTier = POOL_QUALITY_TIERS[ selectPoolQualityTier( signals ) ]
  const applySize = () =>
  {
    renderer.setPixelRatio( Math.min( window.devicePixelRatio || 1, activeTier.pixelRatioCap ) )
    renderer.setSize( width, height, false )
    camera.aspect = width / height
    camera.updateProjectionMatrix()
  }
  const applyTier = ( id ) =>
  {
    activeTier = POOL_QUALITY_TIERS[ id ]
    keyLight.shadow.map?.dispose()
    keyLight.shadow.map = null
    keyLight.shadow.mapSize.set( activeTier.shadowMapSize, activeTier.shadowMapSize )
    keyLight.shadow.needsUpdate = true
    applySize()
    onQualityState?.( { ...activeTier, ssao: false } )
    onTextureReady()
  }
  const qualityMonitor = createQualityMonitor( activeTier.id, signals, applyTier )
  applyTier( activeTier.id )
  const updateQuality = ( nextWidth, nextHeight ) =>
  {
    width = nextWidth
    height = nextHeight
    qualityMonitor.suggestFromSignals( getPoolQualitySignals( width, height ) )
    applySize()
  }
  const render = () => renderer.render( scene, camera )

  const dispose = () =>
  {
    choreography.dispose()
    envTarget.dispose()
    renderer.dispose()
    disposableGeometries.forEach( ( g ) => g.dispose?.() )
    disposableMaterials.forEach( ( m ) => m.dispose?.() )
    disposableTextures.forEach( ( t ) => t.dispose?.() )
  }

  return {
    camera,
    renderer,
    choreography,
    qualityMonitor,
    updateQuality,
    render,
    dispose,
  }
}

export default function PhotorealPoolDraft ( {
  active = false,
  onController,
  onUnavailable,
  draftId = "photoreal",
} )
{
  const rootRef = useRef( null )
  const canvasRef = useRef( null )
  const controllerRef = useRef( null )
  const phaseRef = useRef( null )

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
    let lastRenderedProgress = null
    let stableProgressFrames = 0

    // Demand-driven frame scheduler coordinates repaints with window animation frames.
    const scheduler = createDemandFrameScheduler( {
      active: isActive,
      requestAnimationFrame: ( callback ) => window.requestAnimationFrame( callback ),
      cancelAnimationFrame: ( handle ) => window.cancelAnimationFrame( handle ),
      render: () => renderScene(),
      shouldContinue: () => renderContinuation,
    } )

    const requestRender = () => { if ( !destroyed ) scheduler.invalidate() }

    // Pointer parallax responds to fine mouse input while staying neutral on mobile.
    const pointer = createPointerParallax( {
      windowObject: window,
      isActive: () => isActive,
      requestRender,
      onResize: () => { resizePending = true },
    } )

    try
    {
      world = buildPhotorealScene( canvas, requestRender, ( qualityState ) =>
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
      renderContinuation = false
      if ( destroyed || !isActive || failed || !world ) return
      const renderStartedAt = performance.now()
      stableProgressFrames = lastRenderedProgress === currentProgress ? stableProgressFrames + 1 : 0
      lastRenderedProgress = currentProgress

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
        treatment: "photoreal",
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

      // Seek paused GSAP master timeline
      const result = world.choreography.seek( currentProgress )
      if ( phaseRef.current && result.phase )
      {
        phaseRef.current.textContent = "TABLE / " + result.phase
      }

      world.render()

      root.dataset.webglProgress = currentProgress.toFixed( 4 )
      root.dataset.webglRenderAt = performance.now().toFixed( 3 )
      const info = world.renderer.info.memory
      root.dataset.webglGeometries = String( info.geometries )
      root.dataset.webglTextures = String( info.textures )
      root.dataset.webglPrograms = String( world.renderer.info.programs?.length ?? 0 )

      const pointerSettled = pointer.advance()
      const qualityChanged = world.qualityMonitor.observe( performance.now() - renderStartedAt, stableProgressFrames >= 4 && pointerSettled && !resizePending )
      renderContinuation = !pointerSettled || resizePending || qualityChanged || world.qualityMonitor.pending
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
      className="draft-layer draft-layer-webgl draft-layer-photoreal"
      ref={ rootRef }
      aria-hidden={ !active }
      data-draft-id={ draftId }
    >
      <canvas ref={ canvasRef } className="webgl-pool-canvas" aria-hidden="true" />
      <div className="webgl-vignette" aria-hidden="true" />
      <p className="webgl-phase" ref={ phaseRef } aria-hidden="true">TABLE / PHOTOREAL</p>
      <p className="webgl-fallback" role="status">3D draft unavailable on this device. Showing 2.5D draft.</p>
    </div>
  )
}
