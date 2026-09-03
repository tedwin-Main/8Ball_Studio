// Draft 5 — Photoreal Break Intro Draft.
// Built from scratch with regulation 3D table geometry, PBR materials, and paused GSAP choreography.
import { useLayoutEffect, useRef } from "react"
import * as THREE from "three"
import { DecalGeometry } from "three/addons/geometries/DecalGeometry.js"
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js"
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js"
import { OutputPass } from "three/addons/postprocessing/OutputPass.js"
import { RenderPass } from "three/addons/postprocessing/RenderPass.js"
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js"
import brandLogo from "../assets/8BALL-V4.jpg"
import {
  TABLE_DIMS,
  POCKET_COORDS,
  createSlateGeometry,
  createPocketAssembly,
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
import { createDemandFrameScheduler } from "./demandFrameScheduler.js"

RectAreaLightUniformsLib.init()

const BALL_COLORS = Object.freeze( [
  "#f5c518", "#0047bb", "#e53935", "#5b2c86", "#f26522", "#1b5e20", "#7b1113",
  "#0b0b0d",
  "#f5c518", "#0047bb", "#e53935", "#5b2c86", "#f26522", "#1b5e20", "#7b1113",
] )

const DRAFT5_QUALITY_TIERS = Object.freeze( {
  high: Object.freeze( {
    id: "high",
    pixelRatioCap: 1.5,
    shadowMapSize: 2048,
    renderBudgetMs: 20,
  } ),
  standard: Object.freeze( {
    id: "standard",
    pixelRatioCap: 1.25,
    shadowMapSize: 1024,
    renderBudgetMs: 24,
  } ),
  low: Object.freeze( {
    id: "low",
    pixelRatioCap: 1.0,
    shadowMapSize: 512,
    renderBudgetMs: 32,
  } ),
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

const createStudioEnvironment = ( renderer ) =>
{
  const envScene = new THREE.Scene()
  envScene.background = new THREE.Color( "#030403" )
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
    envScene.add( card )
    resources.push( geometry, material )
  }

  addCard( new THREE.PlaneGeometry( 18, 28 ), "#fff8e6", 3.0, [ 0, 14, 0 ], [ 0, 0, 0 ] )
  addCard( new THREE.PlaneGeometry( 12, 22 ), "#ffcaa0", 1.4, [ -15, 9, 3 ], [ 0, 0, 0 ] )
  addCard( new THREE.PlaneGeometry( 12, 22 ), "#c4e6d4", 0.9, [ 15, 9, -3 ], [ 0, 0, 0 ] )
  addCard( new THREE.PlaneGeometry( 22, 32 ), "#144632", 0.4, [ 0, -6, 0 ], [ 0, 0, 0 ] )

  const pmremGenerator = new THREE.PMREMGenerator( renderer )
  pmremGenerator.compileEquirectangularShader()
  const renderTarget = pmremGenerator.fromScene( envScene, 0.04 )
  pmremGenerator.dispose()
  resources.forEach( ( res ) => res.dispose?.() )
  return renderTarget
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
  renderer.toneMappingExposure = 1.18
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera( 42, 1, 0.1, 80 )

  const envTarget = createStudioEnvironment( renderer )
  scene.environment = envTarget.texture
  scene.environmentIntensity = 0.76

  const materials = createPhotorealMaterials( disposableMaterials )

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

  // 3. Solid hardwood rails (Head/Foot and Side Rails)
  ;[ -9.75, 9.75 ].forEach( ( z ) =>
  {
    const railGeom = new RoundedBoxGeometry( 9.9, 0.48, 0.38, 3, 0.1 )
    disposableGeometries.add( railGeom )
    const railMesh = new THREE.Mesh( railGeom, materials.rails )
    railMesh.position.set( 0, 0.22, z )
    railMesh.castShadow = true
    railMesh.receiveShadow = true
    table.add( railMesh )

    const cushionGeom = new RoundedBoxGeometry( 7.2, 0.2, 0.38, 3, 0.08 )
    disposableGeometries.add( cushionGeom )
    const cushionMesh = new THREE.Mesh( cushionGeom, materials.cushions )
    cushionMesh.position.set( 0, 0.48, z * 0.968 )
    cushionMesh.castShadow = true
    table.add( cushionMesh )
  } )

  ;[ -4.96, 4.96 ].forEach( ( x ) =>
  {
    const railGeom = new RoundedBoxGeometry( 0.38, 0.48, 19.45, 3, 0.1 )
    disposableGeometries.add( railGeom )
    const railMesh = new THREE.Mesh( railGeom, materials.rails )
    railMesh.position.set( x, 0.22, 0 )
    railMesh.castShadow = true
    railMesh.receiveShadow = true
    table.add( railMesh )

    ;[ -4.8, 4.8 ].forEach( ( z ) =>
    {
      const cushionGeom = new RoundedBoxGeometry( 0.38, 0.2, 7.6, 3, 0.08 )
      disposableGeometries.add( cushionGeom )
      const cushionMesh = new THREE.Mesh( cushionGeom, materials.cushions )
      cushionMesh.position.set( x * 0.923, 0.48, z )
      cushionMesh.castShadow = true
      table.add( cushionMesh )
    } )
  } )

  // 4. Inlaid diamond sights
  createRailSights( materials, table, disposableGeometries )

  // 5. Apron skirt box
  const apronGeom = new RoundedBoxGeometry( TABLE_DIMS.width + 0.5, 0.9, TABLE_DIMS.length + 0.5, 3, 0.12 )
  disposableGeometries.add( apronGeom )
  const apronMesh = new THREE.Mesh( apronGeom, materials.apron )
  apronMesh.position.set( 0, -0.45, 0 )
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
  const strikerMaterial = createPhenolicBallMaterial( "#060706", null, disposableMaterials )
  const strikerMesh = new THREE.Mesh( ballGeometry, strikerMaterial )
  strikerMesh.castShadow = true
  strikerMesh.receiveShadow = true
  table.add( strikerMesh )

  const logoTexture = createLogoTexture( 16, onTextureReady )
  disposableTextures.add( logoTexture )
  const decalMaterial = new THREE.MeshPhysicalMaterial( {
    map: logoTexture,
    color: "#ffffff",
    transparent: true,
    depthTest: true,
    depthWrite: false,
    roughness: 0.04,
    clearcoat: 1.0,
    clearcoatRoughness: 0.02,
    polygonOffset: true,
    polygonOffsetFactor: -4,
  } )
  disposableMaterials.add( decalMaterial )
  const decalGeom = new DecalGeometry(
    strikerMesh,
    new THREE.Vector3( 0, TABLE_DIMS.ballRadius, 0 ),
    new THREE.Euler( -Math.PI / 2, 0, 0 ),
    new THREE.Vector3( TABLE_DIMS.ballRadius * 1.08, TABLE_DIMS.ballRadius * 1.08, TABLE_DIMS.ballRadius * 1.08 ),
  )
  disposableGeometries.add( decalGeom )
  strikerMesh.add( new THREE.Mesh( decalGeom, decalMaterial ) )

  const strikerShadow = new THREE.Mesh( contactShadowGeom, materials.contactShadow )
  strikerShadow.position.y = 0.001
  shadowGroup.add( strikerShadow )
  contactShadows.push( strikerShadow )

  // Object balls (1 to 15)
  for ( let number = 1; number <= 15; number += 1 )
  {
    const texture = createNumberedBallTexture( number, BALL_COLORS[ number - 1 ], 16 )
    disposableTextures.add( texture )
    const ballMat = createPhenolicBallMaterial( BALL_COLORS[ number - 1 ], texture, disposableMaterials )
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
  const overheadRectLight = new THREE.RectAreaLight( 0xffffff, 2.85, 9.2, 16.2 )
  overheadRectLight.position.set( 0, 7.0, 0 )
  overheadRectLight.rotation.x = -Math.PI / 2
  scene.add( overheadRectLight )

  const keyLight = new THREE.DirectionalLight( "#ffe8c2", 1.85 )
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

  const leftChamferFill = new THREE.DirectionalLight( "#d4eae0", 0.46 )
  leftChamferFill.position.set( -8.5, 3.8, 0 )
  leftChamferFill.target.position.set( 0, 0, 0 )
  scene.add( leftChamferFill, leftChamferFill.target )

  const rightChamferFill = new THREE.DirectionalLight( "#f0e6d6", 0.42 )
  rightChamferFill.position.set( 8.5, 3.8, 0 )
  rightChamferFill.target.position.set( 0, 0, 0 )
  scene.add( rightChamferFill, rightChamferFill.target )

  const overheadSpot = new THREE.SpotLight( "#fff3da", 5.8, 26, Math.PI / 3.2, 0.8, 1.3 )
  overheadSpot.position.set( 0, 8.5, -3.2 )
  overheadSpot.target.position.set( 0, 0, -3.2 )
  overheadSpot.castShadow = false
  scene.add( overheadSpot, overheadSpot.target )

  const feltBounce = new THREE.HemisphereLight( "#1a5a41", "#020403", 0.54 )
  scene.add( feltBounce )

  const rimLight = new THREE.DirectionalLight( "#df9654", 0.72 )
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

  // 11. Composer
  const composer = new EffectComposer( renderer )
  composer.addPass( new RenderPass( scene, camera ) )
  composer.addPass( new OutputPass() )

  let activeTier = DRAFT5_QUALITY_TIERS.high

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
      ssao: false,
    } )
  }

  const render = () =>
  {
    composer.render()
  }

  const dispose = () =>
  {
    choreography.dispose()
    envTarget.dispose()
    composer.dispose()
    renderer.dispose()
    disposableGeometries.forEach( ( g ) => g.dispose?.() )
    disposableMaterials.forEach( ( m ) => m.dispose?.() )
    disposableTextures.forEach( ( t ) => t.dispose?.() )
  }

  return {
    camera,
    renderer,
    choreography,
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
    let resizePending = false

    const scheduler = createDemandFrameScheduler( {
      renderFrame: () => renderScene(),
      onIdleStateChange: () => {},
    } )

    const requestRender = () => scheduler.requestRender()

    const pointer = createPointerParallax( {
      element: window,
      enabled: true,
      onMove: () => requestRender(),
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
      if ( failed || !world ) return

      const width = root.clientWidth || window.innerWidth
      const height = root.clientHeight || window.innerHeight

      if ( resizePending )
      {
        world.updateQuality( width, height )
        resizePending = false
      }

      // Camera framing with fine pointer response
      const framing = resolveIntroCameraFraming( {
        viewportWidth: width,
        viewportHeight: height,
        sceneScale: DRAFT2_SCENE_SCALE,
        pointerOffsetX: pointer.offsetX,
        pointerOffsetY: pointer.offsetY,
        pointerEnabled: pointer.isPointerActive(),
      } )

      cameraPos.copy( framing.position )
      cameraTgt.copy( framing.target )
      world.camera.position.copy( cameraPos )
      world.camera.lookAt( cameraTgt )
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

      return pointer.hasPendingParallax() || resizePending
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
