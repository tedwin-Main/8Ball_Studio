// Renders the Intro pool break: photo plate plus WebGL balls, driven by scroll progress through a controller.
import { useLayoutEffect, useRef } from 'react'
import landscapePool from '../images/pool-pov-landscape.webp'
import portraitPool from '../images/pool-pov-portrait.webp'
import {
  getBreakSimulation,
  sampleBreakTail,
  sampleCinematicBreakState,
} from './pool-break-physics'
import { STAGE } from './story-stage'
import {
  createPointerParallax,
  DRAFT2_SCENE_SCALE,
  resolveIntroCameraFraming,
  resolvePhotoHoverResponse,
} from './camera-framing'
import { createDemandFrameScheduler } from './demand-frame-scheduler'
import { buildWorld } from './pool-break-world.js'
import { clamp } from './math-helpers.js'

// The photo remains visible if WebGL setup fails, so the opening is still usable.
const tryBuildWorld = ( root, canvas, simulation, requestRender ) =>
{
  try
  {
    const world = buildWorld( canvas, simulation, requestRender )
    root.dataset.webglError = 'false'
    return world
  }
  catch ( error )
  {
    root.dataset.webglError = 'true'
    console.warn( 'Cinematic pool overlay unavailable:', error )
    return null
  }
}

// Ready once the photographic plate is decoded and the first ball frame is drawn, so the
// preloader (components/preloader.jsx) lifts on a finished Intro, never on a blank one.
// Without WebGL the plate alone is the Intro, so only the plate is awaited.
const waitForIntroReady = ( root, hasWorld ) =>
{
  let markFirstFrame = () => {}
  const firstFrame = hasWorld ? new Promise( ( resolve ) => { markFirstFrame = resolve } ) : Promise.resolve()
  const plate = root.querySelector( '.pool-pov-photo' )
  const plateReady = plate?.decode ? plate.decode().catch( () => {} ) : Promise.resolve()
  const ready = Promise.all( [ plateReady, firstFrame ] ).then( () => {} )
  return { ready, markFirstFrame: () => markFirstFrame() }
}

const placeBallsAndShadows = ( world, balls ) =>
{
  balls.forEach( ( ball, index ) =>
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
}

const aimCamera = ( world, framing ) =>
{
  world.camera.fov = framing.fov
  world.camera.position.set( ...framing.camera )
  world.camera.lookAt( ...framing.target )
  world.camera.updateProjectionMatrix()
  world.camera.updateMatrixWorld( true )
}

const drawWorld = ( world, balls, progress, pointerState ) =>
{
  placeBallsAndShadows( world, balls )
  const framing = resolveIntroCameraFraming( {
    progress,
    transitionReadyProgress: STAGE.intro.draft1.transitionReady,
    aspect: world.camera.aspect,
    sourceScale: 1 / DRAFT2_SCENE_SCALE,
    pointerX: pointerState.x,
    pointerY: pointerState.y,
    pointerEnabled: pointerState.enabled,
    lockToPlate: true,
  } )
  world.setHoverResponse( resolvePhotoHoverResponse( {
    pointerX: pointerState.x,
    pointerY: pointerState.y,
    pointerEnabled: pointerState.enabled,
  } ) )
  aimCamera( world, framing )
  world.render()
}

// Owns the WebGL world, frame scheduler and pointer for one mount; returns the scroll controller and a destroy step.
const createSceneController = ( { root, canvas, active, onController } ) =>
{
  const simulation = getBreakSimulation()
  let isActive = active
  let progress = 0
  // 0-1 while the finished table scrolls off screen; balls keep settling until it is gone
  let tail = 0
  let resizePending = true
  let destroyed = false
  let renderFrame = () => {}
  let renderContinuation = false

  const scheduler = createDemandFrameScheduler( {
    active: isActive,
    requestAnimationFrame: ( callback ) => window.requestAnimationFrame( callback ),
    cancelAnimationFrame: ( handle ) => window.cancelAnimationFrame( handle ),
    render: ( frameState ) => renderFrame( frameState ),
    shouldContinue: () => renderContinuation,
  } )
  const requestRender = () => scheduler.invalidate()
  const world = tryBuildWorld( root, canvas, simulation, requestRender )
  const { ready, markFirstFrame } = waitForIntroReady( root, Boolean( world ) )

  // Fine-pointer input shares Draft 2's bounded damping for the transparent 3D ball layer.
  const prefersReducedMotion = window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches
  const pointer = createPointerParallax( {
    windowObject: window,
    // Only while the table can be seen: the layer has faded to nothing by its exit end, so a
    // moving pointer over Studio and later Pages must not render it.
    isActive: () => isActive && progress < STAGE.intro.draft1.exitEnd,
    requestRender,
    onResize: () => { resizePending = true },
    // Reduced-motion visitors get the neutral plate composition without a damped hover loop.
    enabled: !prefersReducedMotion,
  } )

  const renderScene = () =>
  {
    // Tail only runs once the break has landed (progress holds at 1 there), so the two samplers meet at the milestone frame
    const state = tail > 0 ? sampleBreakTail( tail, simulation ) : sampleCinematicBreakState( progress, simulation )
    if ( world ) drawWorld( world, state.balls, progress, pointer.state )

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
    ready,
    setProgress ( nextProgress )
    {
      // Skip identical playheads (progress holds at 1 on every later Page) so scrolling there costs no WebGL frames.
      if ( clamp( nextProgress ) === progress ) return
      updateScene( nextProgress )
    },
    setTail ( nextTail )
    {
      const next = clamp( nextTail )
      if ( next === tail ) return
      tail = next
      requestRender()
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
    markFirstFrame()

    const pointerSettled = pointer.advance()
    // Pointer damping or a pending resize keeps the demand-driven scheduler alive until settled.
    renderContinuation = !pointerSettled || resizePending
  }

  onController?.( controller )
  canvas.addEventListener( 'webglcontextlost', handleContextLost )
  pointer.addListeners()
  controller.setProgress( progress )
  controller.setActive( active )

  const destroy = () =>
  {
    destroyed = true
    scheduler.destroy()
    pointer.removeListeners()
    canvas.removeEventListener( 'webglcontextlost', handleContextLost )
    onController?.( null )
    world?.dispose()
  }

  return { controller, destroy }
}

export function PoolBreakScene ( { active, onController } )
{
  const rootRef = useRef( null )
  const canvasRef = useRef( null )
  const controllerRef = useRef( null )

  useLayoutEffect( () =>
  {
    const root = rootRef.current
    const canvas = canvasRef.current
    if ( !root || !canvas ) return undefined

    const scene = createSceneController( { root, canvas, active, onController } )
    controllerRef.current = scene.controller
    return () =>
    {
      scene.destroy()
      if ( controllerRef.current === scene.controller ) controllerRef.current = null
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
