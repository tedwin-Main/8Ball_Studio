import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, relative } from 'node:path'
import { test, expect } from '@playwright/test'
import { STORY_TIMING, toStoryProgress } from '../../src/storyTiming.js'

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'portrait', width: 390, height: 844 },
]

const FRAME_BUDGETS = Object.freeze( {
  desktop: Object.freeze( { medianMs: 20, p95Ms: 33 } ),
  portrait: Object.freeze( { medianMs: 25, p95Ms: 40 } ),
} )
const MAX_LONG_TASK_MS = 100
const INACTIVE_RENDER_FRAME_BUDGET = 0

const BREAK_STATES = [
  { name: 'start', progress: 0, settleMs: 220 },
  { name: 'impact', progress: toStoryProgress( STORY_TIMING.intro.impact ), settleMs: 80 },
  { name: 'scatter', progress: toStoryProgress( STORY_TIMING.intro.draft2.transitionReady ), settleMs: 220 },
  { name: 'exit', progress: toStoryProgress( STORY_TIMING.intro.draft2.exitEnd + 0.03 ), settleMs: 220 },
]

const median = ( values ) =>
{
  if ( values.length === 0 ) return 0
  const sorted = [ ...values ].sort( ( left, right ) => left - right )
  const middle = Math.floor( sorted.length / 2 )
  return sorted.length % 2 === 0
    ? ( sorted[ middle - 1 ] + sorted[ middle ] ) / 2
    : sorted[ middle ]
}

const percentile = ( values, ratio ) =>
{
  if ( values.length === 0 ) return 0
  const sorted = [ ...values ].sort( ( left, right ) => left - right )
  const index = Math.min( sorted.length - 1, Math.ceil( sorted.length * ratio ) - 1 )
  return sorted[ Math.max( 0, index ) ]
}

const toIntervals = ( timestamps ) => timestamps.slice( 1 )
  .map( ( timestamp, index ) => timestamp - timestamps[ index ] )
  .filter( Number.isFinite )

const installBenchmarkProbe = async ( page ) =>
{
  await page.addInitScript( () =>
  {
    const state = {
      drawing: false,
      drawCalls: 0,
      renderFrames: 0,
      pageFrameTimes: [],
      pagePreviousFrame: null,
      draftRenderTimes: [],
      draftRenderObserver: null,
      frameHandle: 0,
      longTasks: [],
      observer: null,
    }

    const isDraftTwoCanvas = function isDraftTwoCanvas ()
    {
      return Boolean( this?.canvas?.classList?.contains( 'webgl-pool-canvas' ) )
    }

    // Count WebGL draws for the Draft 2 canvas so lifecycle checks observe the
    // actual renderer, not unrelated page requestAnimationFrame callbacks.
    const patchWebglPrototype = ( prototype ) =>
    {
      if ( !prototype ) return

      ;[ 'clear', 'drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced' ].forEach( ( method ) =>
      {
        const original = prototype[ method ]
        if ( !original || original.__draft2BenchmarkWrapped ) return

        const wrapped = function wrappedWebglDraw ( ...args )
        {
          if ( state.drawing && isDraftTwoCanvas.call( this ) )
          {
            if ( method === 'clear' ) state.renderFrames += 1
            else state.drawCalls += 1
          }
          return original.apply( this, args )
        }
        wrapped.__draft2BenchmarkWrapped = true
        prototype[ method ] = wrapped
      } )
    }

    patchWebglPrototype( window.WebGLRenderingContext?.prototype )
    patchWebglPrototype( window.WebGL2RenderingContext?.prototype )

    const sampleFrame = ( timestamp ) =>
    {
      if ( state.pagePreviousFrame !== null ) state.pageFrameTimes.push( timestamp - state.pagePreviousFrame )
      state.pagePreviousFrame = timestamp
      state.frameHandle = window.requestAnimationFrame( sampleFrame )
    }

    const observeDraftTwoRenders = () =>
    {
      state.draftRenderObserver?.disconnect()
      const root = document.querySelector( ".draft-layer-webgl" )
      if ( !root ) return

      // The component writes this attribute immediately after world.render(), keeping this
      // test coupled only to its documented diagnostics instead of renderer internals.
      state.draftRenderObserver = new MutationObserver( ( records ) =>
      {
        records.forEach( () =>
        {
          const timestamp = Number( root.dataset.webglRenderAt )
          if ( Number.isFinite( timestamp ) ) state.draftRenderTimes.push( timestamp )
        } )
      } )
      state.draftRenderObserver.observe( root, { attributes: true, attributeFilter: [ "data-webgl-render-at" ] } )
    }

    window.__draft2Benchmark = {
      start ()
      {
        state.drawing = true
        state.drawCalls = 0
        state.renderFrames = 0
        state.pageFrameTimes = []
        state.pagePreviousFrame = null
        state.draftRenderTimes = []
        state.draftRenderObserver?.disconnect()
        state.draftRenderObserver = null
        observeDraftTwoRenders()
        state.longTasks = []

        if ( window.PerformanceObserver )
        {
          try
          {
            state.observer = new PerformanceObserver( ( list ) =>
            {
              list.getEntries().forEach( ( entry ) => state.longTasks.push( {
                name: entry.name,
                startTime: entry.startTime,
                duration: entry.duration,
              } ) )
            } )
            state.observer.observe( { type: 'longtask', buffered: false } )
          }
          catch
          {
            state.observer = null
          }
        }

        if ( !state.frameHandle ) state.frameHandle = window.requestAnimationFrame( sampleFrame )
      },
      resetLifecycle ()
      {
        state.drawCalls = 0
        state.renderFrames = 0
      },
      snapshot ()
      {
        return {
          drawCalls: state.drawCalls,
          renderFrames: state.renderFrames,
          pageFrameTimes: [ ...state.pageFrameTimes ],
          draftRenderTimes: [ ...state.draftRenderTimes ],
          longTasks: [ ...state.longTasks ],
        }
      },
      stop ()
      {
        state.drawing = false
        if ( state.frameHandle ) window.cancelAnimationFrame( state.frameHandle )
        state.frameHandle = 0
        state.observer?.disconnect()
        state.observer = null
        state.draftRenderObserver?.disconnect()
        state.draftRenderObserver = null
      },
    }
  } )
}

const waitForDraftTwo = async ( page ) =>
{
  await expect( page.locator( '.draft-layer-webgl' ) ).toHaveAttribute(
    'data-webgl-error',
    'false',
    { timeout: 30_000 },
  )
  await expect( page.locator( '.story' ) ).toHaveAttribute(
    'data-story-navigation-ready',
    'true',
    { timeout: 30_000 },
  )
  // Production code keeps Lenis private to the browser adapter; only the benchmark seam is public.
  expect( await page.evaluate( () => Object.prototype.hasOwnProperty.call( window, 'lenis' ) ) ).toBe( false )
  await page.waitForFunction( () =>
  {
    const canvas = document.querySelector( '.webgl-pool-canvas' )
    return Boolean( canvas && canvas.width > 0 && canvas.height > 0 && window.__storyNavigationBenchmark )
  } )
}

const readFramingSnapshot = ( page, selector ) => page.locator( selector ).evaluate( ( canvas ) =>
{
  const value = canvas.dataset.framing
  if ( !value ) throw new Error( `Framing diagnostics are not ready for ${selector}.` )
  return JSON.parse( value )
} )

const waitForFramingSnapshot = async ( page, selector ) =>
{
  await page.waitForFunction( ( targetSelector ) =>
  {
    return Boolean( document.querySelector( targetSelector )?.dataset.framing )
  }, selector )
}

const expectMatchingFraming = ( first, second ) =>
{
  expect( second.fov ).toBeCloseTo( first.fov, 6 )
  expect( second.trackProgress ).toBeCloseTo( first.trackProgress, 6 )
  expect( second.eightBall.x ).toBeCloseTo( first.eightBall.x, 3 )
  expect( second.eightBall.y ).toBeCloseTo( first.eightBall.y, 3 )
  expect( second.rackApex.x ).toBeCloseTo( first.rackApex.x, 3 )
  expect( second.rackApex.y ).toBeCloseTo( first.rackApex.y, 3 )
  expect( second.eightBallDiameter ).toBeCloseTo( first.eightBallDiameter, 1 )
  expect( second.centerlineError ).toBeCloseTo( first.centerlineError, 4 )
}

const dispatchPortraitTap = async ( context, page, x, y ) =>
{
  const client = await context.newCDPSession( page )
  const touchPoint = {
    x,
    y,
    radiusX: 1,
    radiusY: 1,
    force: 1,
    id: 1,
  }
  await client.send( 'Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [ touchPoint ],
    modifiers: 0,
  } )
  await client.send( 'Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
    modifiers: 0,
  } )
}

const FRAMING_MILESTONES = [
  { name: 'start', progress: 0 },
  { name: 'approach', progress: STORY_TIMING.intro.approachEnd * 0.5 },
  { name: 'impact', progress: STORY_TIMING.intro.impact },
  { name: 'scatter', progress: STORY_TIMING.intro.draft2.transitionReady },
]

test( 'Draft 1 and Draft 2 share foreground framing at Intro milestones', async ( { browser, baseURL } ) =>
{
  const context = await browser.newContext( {
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
  } )
  const page = await context.newPage()

  try
  {
    await page.goto( `${baseURL}/?draft=cinematic&benchmark=draft2`, { waitUntil: 'domcontentloaded' } )
    await waitForDraftTwo( page )
    const draftOneCanvas = '.pool-pov-balls-canvas'
    const draftTwoCanvas = '.webgl-pool-canvas'
    await waitForFramingSnapshot( page, draftOneCanvas )
    const photoPlate = page.locator( '.pool-pov-photo' )
    const portraitPlate = page.locator( '.pool-pov-visual source' )
    await expect( photoPlate ).toHaveAttribute( 'src', /pool-pov-landscape/ )
    await expect( portraitPlate ).toHaveAttribute( 'srcset', /pool-pov-portrait/ )
    await expect( photoPlate ).toHaveCSS( 'object-fit', 'cover' )
    await expect( photoPlate ).toHaveCSS( 'object-position', '50% 50%' )

    for ( const milestone of FRAMING_MILESTONES )
    {
      await driveStoryProgress( page, toStoryProgress( milestone.progress ) )
      await waitForFramingSnapshot( page, draftOneCanvas )
      const draftOne = await readFramingSnapshot( page, draftOneCanvas )
      if ( milestone.name === 'start' )
      {
        expect( Number.isFinite( draftOne.photoRegistration?.anchorError ) ).toBe( true )
      }

      await page.getByRole( 'button', { name: '02 3D Break' } ).click()
      await driveStoryProgress( page, toStoryProgress( milestone.progress ) )
      await waitForFramingSnapshot( page, draftTwoCanvas )
      const draftTwo = await readFramingSnapshot( page, draftTwoCanvas )
      expectMatchingFraming( draftOne, draftTwo )

      await page.getByRole( 'button', { name: '01 3D POV' } ).click()
      await waitForFramingSnapshot( page, draftOneCanvas )
    }
  }
  finally
  {
    await context.close()
  }
} )

test( 'Draft 1 and Draft 2 stay centered after touch input on portrait', async ( { browser, baseURL } ) =>
{
  const context = await browser.newContext( {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    hasTouch: true,
    isMobile: true,
  } )
  const page = await context.newPage()

  try
  {
    await page.goto( `${baseURL}/?draft=cinematic&benchmark=draft2`, { waitUntil: 'domcontentloaded' } )
    await waitForDraftTwo( page )
    const draftOneCanvas = '.pool-pov-balls-canvas'
    const draftTwoCanvas = '.webgl-pool-canvas'
    await waitForFramingSnapshot( page, draftOneCanvas )
    const draftOneBaseline = await readFramingSnapshot( page, draftOneCanvas )
    expect( draftOneBaseline.pointerEnabled ).toBe( false )
    expect( draftOneBaseline.centerlineError ).toBeLessThan( 0.002 )

    for ( const [ x, y ] of [ [ 20, 110 ], [ 370, 110 ], [ 20, 790 ], [ 370, 790 ] ] )
    {
      await dispatchPortraitTap( context, page, x, y )
      await page.waitForTimeout( 40 )
      expectMatchingFraming( draftOneBaseline, await readFramingSnapshot( page, draftOneCanvas ) )
    }

    await page.getByRole( 'button', { name: '02 3D Break' } ).click()
    await waitForFramingSnapshot( page, draftTwoCanvas )
    const draftTwoBaseline = await readFramingSnapshot( page, draftTwoCanvas )
    expect( draftTwoBaseline.pointerEnabled ).toBe( false )
    expect( draftTwoBaseline.centerlineError ).toBeLessThan( 0.002 )
    expectMatchingFraming( draftOneBaseline, draftTwoBaseline )

    for ( const [ x, y ] of [ [ 20, 110 ], [ 370, 110 ], [ 20, 790 ], [ 370, 790 ] ] )
    {
      await dispatchPortraitTap( context, page, x, y )
      await page.waitForTimeout( 40 )
      expectMatchingFraming( draftTwoBaseline, await readFramingSnapshot( page, draftTwoCanvas ) )
    }
  }
  finally
  {
    await context.close()
  }
} )

test( 'fine-pointer parallax remains bounded and returns to shared center', async ( { browser, baseURL } ) =>
{
  const context = await browser.newContext( {
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
  } )
  const page = await context.newPage()

  try
  {
    await page.goto( `${baseURL}/?draft=cinematic&benchmark=draft2`, { waitUntil: 'domcontentloaded' } )
    await waitForDraftTwo( page )
    const draftOneCanvas = '.pool-pov-balls-canvas'
    const draftTwoCanvas = '.webgl-pool-canvas'
    await driveStoryProgress( page, toStoryProgress( STORY_TIMING.intro.approachEnd * 0.5 ) )
    await waitForFramingSnapshot( page, draftOneCanvas )
    await page.mouse.move( 640, 400 )
    await page.waitForTimeout( 300 )
    const draftOneCenter = await readFramingSnapshot( page, draftOneCanvas )
    await page.mouse.move( 1270, 400 )
    await page.waitForTimeout( 500 )
    const draftOneMoved = await readFramingSnapshot( page, draftOneCanvas )
    const draftOneDelta = draftOneMoved.eightBall.x - draftOneCenter.eightBall.x
    expect( Math.abs( draftOneDelta ) ).toBeGreaterThan( 0.001 )
    expect( Math.abs( draftOneDelta ) ).toBeLessThan( 0.02 )

    await page.getByRole( 'button', { name: '02 3D Break' } ).click()
    await page.mouse.move( 640, 400 )
    await page.waitForTimeout( 500 )
    const draftTwoCenter = await readFramingSnapshot( page, draftTwoCanvas )
    await page.mouse.move( 1270, 400 )
    await page.waitForTimeout( 500 )
    const draftTwoMoved = await readFramingSnapshot( page, draftTwoCanvas )
    const draftTwoDelta = draftTwoMoved.eightBall.x - draftTwoCenter.eightBall.x
    expect( draftTwoDelta ).toBeCloseTo( draftOneDelta, 3 )

    await page.mouse.move( 640, 400 )
    await page.waitForTimeout( 700 )
    expectMatchingFraming( draftOneCenter, await readFramingSnapshot( page, draftTwoCanvas ) )
  }
  finally
  {
    await context.close()
  }
} )


const installGestureProbe = async ( page ) =>
{
  await page.addInitScript( () =>
  {
    const state = {
      wheelCount: 0,
      forwardWheelCount: 0,
      reverseWheelCount: 0,
      touchStartCount: 0,
      touchMoveCount: 0,
      touchEndCount: 0,
    }

    // Count browser input at the document boundary so a handoff cannot pass by
    // silently consuming a second wheel event inside the scene.
    window.addEventListener( 'wheel', ( event ) =>
    {
      state.wheelCount += 1
      if ( event.deltaY > 0 ) state.forwardWheelCount += 1
      if ( event.deltaY < 0 ) state.reverseWheelCount += 1
    }, { capture: true, passive: true } )

    // Touch counters prove the portrait path used a real touch sequence when the browser supports CDP input.
    window.addEventListener( "touchstart", () => { state.touchStartCount += 1 }, { capture: true, passive: true } )
    window.addEventListener( "touchmove", () => { state.touchMoveCount += 1 }, { capture: true, passive: true } )
    window.addEventListener( "touchend", () => { state.touchEndCount += 1 }, { capture: true, passive: true } )

    window.__draft2GestureProbe = {
      snapshot: () => ( { ...state } ),
    }
  } )
}

const installPhaseProbe = async ( page ) =>
{
  await page.evaluate( () =>
  {
    const phase = document.querySelector( '.webgl-phase' )
    if ( !phase ) throw new Error( 'Draft 2 phase label is not available.' )

    const phases = []
    const recordPhase = () =>
    {
      const value = phase.textContent?.trim()
      if ( value && phases[ phases.length - 1 ] !== value ) phases.push( value )
    }

    recordPhase()
    const observer = new MutationObserver( recordPhase )
    observer.observe( phase, { childList: true, characterData: true, subtree: true } )

    // Keep the observer behind a small public test seam; no Three.js objects or
    // private tween state are exposed to the browser assertion.
    window.__draft2PhaseProbe = {
      snapshot: () => ( { phases: [ ...phases ] } ),
      stop: () => observer.disconnect(),
    }
  } )
}

const getBoundedSoftGestureDelta = ( page ) => page.evaluate( () =>
{
  const story = document.querySelector( '.story' )
  const range = story ? Math.max( 0, story.offsetHeight - window.innerHeight ) : 0

  // A single bounded wheel packet crosses the intro weighting on both target
  // viewports while remaining below one full story range.
  return Math.ceil( range * 0.9 )
} )

const dispatchPortraitTouchGesture = async ( context ) =>
{
  const client = await context.newCDPSession( await context.pages()[ 0 ] )
  const touchPoint = ( y ) => ( {
    x: 195,
    y,
    radiusX: 1,
    radiusY: 1,
    force: 1,
    id: 1,
  } )

  await client.send( 'Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [ touchPoint( 840 ) ],
    modifiers: 0,
  } )
  await client.send( 'Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [ touchPoint( 700 ) ],
    modifiers: 0,
  } )
  await client.send( 'Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
    modifiers: 0,
  } )
}

const waitForStudioHandoff = async ( page ) =>
{
  const startedAt = Date.now()
  const completionBudgetMs = 2_500
  await expect( page.getByRole( 'button', { name: 'Go to Studio page' } ) )
    .toHaveAttribute( 'aria-current', 'page', { timeout: 10_000 } )
  await expect( page.locator( '.title-screen' ) ).toBeVisible()
  await expect( page.locator( '.scene-interface' ) ).toBeHidden()
  await expect.poll( async () => page.locator( '.draft-layer-webgl' ).getAttribute( 'data-webgl-progress' ), {
    timeout: 10_000,
  } ).toBe( '1.0000' )
  await expect( page.locator( '.webgl-pool-canvas' ) ).toHaveCSS( 'opacity', '0' )
  expect( Date.now() - startedAt ).toBeLessThan( completionBudgetMs )
}

for ( const viewport of VIEWPORTS )
{
  test( `Draft 2 one soft gesture reaches Studio — ${viewport.name}`, async ( { browser, baseURL } ) =>
  {
    const context = await browser.newContext( {
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 1,
    } )
    const page = await context.newPage()

    try
    {
      await installGestureProbe( page )
      await page.goto( `${baseURL}/?draft=webgl&benchmark=draft2`, { waitUntil: 'domcontentloaded' } )
      await waitForDraftTwo( page )
      await installPhaseProbe( page )
      await page.mouse.move( viewport.width / 2, viewport.height / 2 )

      // One bounded wheel packet is the complete visitor gesture. No follow-up
      // nudge is allowed after the rack reaches its readable spread.
      const gestureDelta = await getBoundedSoftGestureDelta( page )
      await page.mouse.wheel( 0, gestureDelta )
      await waitForStudioHandoff( page )

      const gesture = await page.evaluate( () => window.__draft2GestureProbe.snapshot() )
      const phaseTrace = await page.evaluate( () => window.__draft2PhaseProbe.snapshot() )
      expect( gesture.wheelCount ).toBe( 1 )
      expect( gesture.forwardWheelCount ).toBe( 1 )
      expect( phaseTrace.phases ).toContain( 'BREAK  /  RUN' )
      // The faster Draft 2 path intentionally cuts past the old pocket phase.
      expect( phaseTrace.phases ).toContain( 'STUDIO  /  CUT' )

      // A reverse gesture after the handoff must remain authoritative; the
      // shortened transition must not leave Lenis locked at the page boundary.
      await page.mouse.wheel( 0, -Math.ceil( gestureDelta * 0.2 ) )
      await expect.poll( async () => Number(
        await page.locator( '.draft-layer-webgl' ).getAttribute( 'data-webgl-progress' ),
      ) ).toBeLessThan( 1 )
      const reversedGesture = await page.evaluate( () => window.__draft2GestureProbe.snapshot() )
      expect( reversedGesture.forwardWheelCount ).toBe( 1 )
      expect( reversedGesture.reverseWheelCount ).toBe( 1 )
    }
    finally
    {
      await page.evaluate( () => window.__draft2PhaseProbe?.stop() ).catch( () => {} )
      await context.close()
    }
  } )
}

test( 'Draft 2 touch gesture reaches Studio on portrait', async ( { browser, baseURL } ) =>
{
  const context = await browser.newContext( {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    hasTouch: true,
    isMobile: true,
  } )
  const page = await context.newPage()

  try
  {
    await installGestureProbe( page )
    await page.goto( `${baseURL}/?draft=webgl&benchmark=draft2`, { waitUntil: 'domcontentloaded' } )
    await waitForDraftTwo( page )
    await driveStoryProgress( page, toStoryProgress( STORY_TIMING.pages.studioStart ) - 0.006 )
    await dispatchPortraitTouchGesture( context )
    await waitForStudioHandoff( page )

    const gesture = await page.evaluate( () => window.__draft2GestureProbe.snapshot() )
    expect( gesture.wheelCount ).toBe( 0 )
    expect( gesture.touchStartCount ).toBe( 1 )
    expect( gesture.touchMoveCount ).toBeGreaterThan( 0 )
    expect( gesture.touchEndCount ).toBe( 1 )
  }
  finally
  {
    await context.close()
  }
} )

test( 'Draft 2 page controls reach Projects and Contact', async ( { browser, baseURL } ) =>
{
  const context = await browser.newContext( { viewport: { width: 1280, height: 800 } } )
  const page = await context.newPage()

  try
  {
    await page.goto( `${baseURL}/?draft=webgl&benchmark=draft2`, { waitUntil: 'domcontentloaded' } )
    await waitForDraftTwo( page )

    const projectsButton = page.getByRole( 'button', { name: 'Go to Projects page' } )
    await projectsButton.click()
    await expect( projectsButton ).toHaveAttribute( 'aria-current', 'page' )
    await expect( page.locator( '.projects-screen' ) ).toHaveCSS( 'opacity', '1' )
    await expect( page.getByRole( 'heading', { name: 'Our Projects' } ) ).toBeVisible()

    const contactButton = page.getByRole( 'button', { name: 'Go to Contact page' } )
    await contactButton.click()
    await expect( contactButton ).toHaveAttribute( 'aria-current', 'page' )
    await expect( page.locator( '.contact-screen' ) ).toHaveCSS( 'opacity', '1' )
    await expect( page.getByRole( 'heading', { name: 'Contact Us' } ) ).toBeVisible()
  }
  finally
  {
    await context.close()
  }
} )

test( 'Story indicator activates with each visible Page reveal', async ( { browser, baseURL } ) =>
{
  const context = await browser.newContext( { viewport: { width: 1280, height: 800 } } )
  const page = await context.newPage()

  const readPagination = () => page.evaluate( () =>
  {
    const dots = [ ...document.querySelectorAll( '.page-dot' ) ]
    const activeDots = dots.filter( ( dot ) => dot.classList.contains( 'is-active' ) )
    const currentDots = dots.filter( ( dot ) => dot.getAttribute( 'aria-current' ) === 'page' )
    const root = document.querySelector( 'main' )
    return {
      activeCount: activeDots.length,
      currentCount: currentDots.length,
      activeLabel: activeDots[ 0 ]?.getAttribute( 'aria-label' ) || null,
      currentLabel: currentDots[ 0 ]?.getAttribute( 'aria-label' ) || null,
      labelsMatch: activeDots[ 0 ]?.getAttribute( 'aria-label' ) === currentDots[ 0 ]?.getAttribute( 'aria-label' ),
      stablePage: root?.dataset.storyPage || null,
      indicatorPage: root?.dataset.storyIndicatorPage || null,
      state: root?.dataset.storyState || null,
    }
  } )

  const expectMidTransition = async ( destinationPage, sourcePage ) =>
  {
    // Poll one DOM snapshot so the indicator and Stable Page assertions cannot straddle a render.
    await expect.poll( readPagination, { timeout: 2_000 } ).toMatchObject( {
      indicatorPage: destinationPage,
      stablePage: sourcePage,
      state: 'transitioning',
      activeCount: 1,
      currentCount: 1,
      labelsMatch: true,
    } )
  }

  const expectSettledPage = async ( pageId ) =>
  {
    await expect.poll( async () => ( await readPagination() ).stablePage, { timeout: 2_000 } ).toBe( pageId )
    await expect( page.locator( 'main' ) ).toHaveAttribute( 'data-story-state', 'settled' )
  }

  try
  {
    await page.goto( `${baseURL}/?draft=webgl&benchmark=draft2`, { waitUntil: 'domcontentloaded' } )
    await waitForDraftTwo( page )
    await expect( page.getByRole( 'button', { name: 'Go to Intro page' } ) ).toHaveAttribute( 'aria-current', 'page' )

    const studioButton = page.getByRole( 'button', { name: 'Go to Studio page' } )
    await studioButton.click()
    await expectMidTransition( 'studio', 'intro' )
    await expect( studioButton ).toHaveAttribute( 'aria-current', 'page' )
    await expect( page.locator( '.title-screen' ) ).toBeVisible()
    await expect.poll( async () => page.locator( '.final-title-line > span' ).evaluate( ( node ) =>
    {
      const transform = getComputedStyle( node ).transform.replace( /\s/g, '' )
      return transform === 'none' || transform === 'matrix(1,0,0,1,0,0)'
    } ) ).toBe( true )
    await expectSettledPage( 'studio' )

    const projectsButton = page.getByRole( 'button', { name: 'Go to Projects page' } )
    await projectsButton.click()
    await expectMidTransition( 'projects', 'studio' )
    await expect( projectsButton ).toHaveAttribute( 'aria-current', 'page' )
    await expectSettledPage( 'projects' )

    const contactButton = page.getByRole( 'button', { name: 'Go to Contact page' } )
    await contactButton.click()
    await expectMidTransition( 'contact', 'projects' )
    await expect( contactButton ).toHaveAttribute( 'aria-current', 'page' )
    await expectSettledPage( 'contact' )

    await studioButton.click()
    await expectMidTransition( 'studio', 'contact' )
    await expect( studioButton ).toHaveAttribute( 'aria-current', 'page' )
  }
  finally
  {
    await context.close()
  }
} )

test( 'Draft 2 cuts the pocket drop before the Studio crossfade', async ( { browser, baseURL } ) =>
{
  const context = await browser.newContext( {
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
  } )
  const page = await context.newPage()

  try
  {
    await page.goto( `${baseURL}/?draft=webgl&benchmark=draft2`, { waitUntil: 'domcontentloaded' } )
    await waitForDraftTwo( page )
    await driveStoryProgress( page, toStoryProgress( STORY_TIMING.intro.draft2.pocketCut ) )

    const ballOpacity = await page.locator( '.ball-rig' ).evaluate( ( node ) => getComputedStyle( node ).opacity )
    const pocketOpacity = await page.locator( '.pocket-iris' ).evaluate( ( node ) => getComputedStyle( node ).opacity )
    const titleOpacity = await page.locator( '.title-screen' ).evaluate( ( node ) => getComputedStyle( node ).opacity )

    // The 8-ball and pocket mask are already cut while the next-page title has not started fading in.
    expect( ballOpacity ).toBe( '0' )
    expect( pocketOpacity ).toBe( '0' )
    expect( titleOpacity ).toBe( '0' )
  }
  finally
  {
    await context.close()
  }
} )

test( 'Draft 2 one soft gesture respects reduced motion', async ( { browser, baseURL } ) =>
{
  const context = await browser.newContext( {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  } )
  const page = await context.newPage()

  try
  {
    await installGestureProbe( page )
    await page.goto( `${baseURL}/?draft=webgl&benchmark=draft2`, { waitUntil: 'domcontentloaded' } )
    await waitForDraftTwo( page )
    await page.mouse.move( 195, 422 )
    await page.mouse.wheel( 0, await getBoundedSoftGestureDelta( page ) )
    await waitForStudioHandoff( page )

    const gesture = await page.evaluate( () => window.__draft2GestureProbe.snapshot() )
    expect( gesture.wheelCount ).toBe( 1 )
    expect( gesture.forwardWheelCount ).toBe( 1 )
  }
  finally
  {
    await context.close()
  }
} )

test( 'Draft 2 page controls remain keyboard reachable', async ( { browser, baseURL } ) =>
{
  const context = await browser.newContext( { viewport: { width: 1280, height: 800 } } )
  const page = await context.newPage()

  try
  {
    await page.goto( `${baseURL}/?draft=webgl&benchmark=draft2`, { waitUntil: 'domcontentloaded' } )
    await waitForDraftTwo( page )
    const studioButton = page.getByRole( 'button', { name: 'Go to Studio page' } )
    await studioButton.focus()
    await page.keyboard.press( 'Enter' )
    await expect( studioButton ).toHaveAttribute( 'aria-current', 'page' )
    await expect( page.locator( '.title-screen' ) ).toBeVisible()
  }
  finally
  {
    await context.close()
  }
} )

const driveStoryProgress = async ( page, progress ) =>
{
  const target = await page.evaluate( ( nextProgress ) =>
  {
    if ( !window.__storyNavigationBenchmark ) throw new Error( 'Story navigation benchmark seam is not ready.' )
    return window.__storyNavigationBenchmark.seekProgress( nextProgress )
  }, progress )

  await page.waitForTimeout( 2 )
  return target
}

const driveDraftTwoRenderBurst = ( page, sampleCount = 32 ) => page.evaluate( async ( count ) =>
{
  if ( !window.__storyNavigationBenchmark ) throw new Error( "Story navigation benchmark seam is not ready." )

  // One benchmark progress seek per browser frame produces a measurable sequence of real Draft 2 paints.
  await new Promise( ( resolve ) =>
  {
    let index = 0
    const driveNext = () =>
    {
      const progress = 0.12 + 0.68 * ( index / Math.max( 1, count - 1 ) )
      window.__storyNavigationBenchmark.seekProgress( progress )
      index += 1
      if ( index < count )
      {
        window.requestAnimationFrame( driveNext )
        return
      }

      // Let the demand-driven renderer consume the final input before the test snapshots diagnostics.
      window.requestAnimationFrame( () => window.requestAnimationFrame( resolve ) )
    }
    window.requestAnimationFrame( driveNext )
  } )
}, sampleCount )

const readDraftDiagnostics = ( page ) => page.locator( '.draft-layer-webgl' ).evaluate( ( root ) => ( {
  progress: Number( root.dataset.webglProgress ),
  quality: root.dataset.webglQuality,
  dprCap: Number( root.dataset.webglDprCap ),
  ssao: root.dataset.webglSsao,
  shadowMapSize: Number( root.dataset.webglShadowMap ),
  geometries: Number( root.dataset.webglGeometries ),
  textures: Number( root.dataset.webglTextures ),
  programs: Number( root.dataset.webglPrograms ),
} ) )

const captureState = async ( page, testInfo, viewportName, stateName ) =>
{
  const screenshotPath = testInfo.outputPath( `screenshots/${viewportName}/${stateName}.png` )
  await mkdir( dirname( screenshotPath ), { recursive: true } )
  await page.screenshot( { path: screenshotPath } )
  await testInfo.attach( `${viewportName}-${stateName}`, {
    path: screenshotPath,
    contentType: 'image/png',
  } )
  return relative( process.cwd(), screenshotPath )
}

for ( const viewport of VIEWPORTS )
{
  test( `Draft 2 benchmark — ${viewport.name} ${viewport.width}x${viewport.height}`, async ( { browser, baseURL }, testInfo ) =>
  {
    const context = await browser.newContext( {
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 1,
    } )
    const page = await context.newPage()
    const screenshotPaths = {}

    try
    {
      await installBenchmarkProbe( page )
      await page.goto( `${baseURL}/?draft=webgl&benchmark=draft2`, { waitUntil: 'domcontentloaded' } )
      await waitForDraftTwo( page )

      // Warm-up lets Vite compilation, texture generation, and shader compilation
      // finish before frame intervals or long tasks enter the report.
      await page.waitForTimeout( 900 )
      await page.evaluate( () => window.__draft2Benchmark.start() )
      await driveDraftTwoRenderBurst( page )
      const performanceMeasured = await page.evaluate( () => window.__draft2Benchmark.snapshot() )

      const progressTrace = []
      for ( const state of BREAK_STATES )
      {
        progressTrace.push( {
          name: state.name,
          progress: state.progress,
          scroll: await driveStoryProgress( page, state.progress ),
        } )
        await page.waitForTimeout( state.settleMs )
        screenshotPaths[ state.name ] = await captureState(
          page,
          testInfo,
          viewport.name,
          state.name,
        )
      }

      // Switching drafts is the public lifecycle boundary. Three quiet/resume cycles
      // must leave no renderer work behind and must retain the same GPU allocations.
      const resourcesBeforeLifecycle = await readDraftDiagnostics( page )
      expect( Number.isFinite( resourcesBeforeLifecycle.progress ) ).toBe( true )
      expect( Number.isFinite( resourcesBeforeLifecycle.geometries ) ).toBe( true )
      expect( Number.isFinite( resourcesBeforeLifecycle.textures ) ).toBe( true )
      expect( Number.isFinite( resourcesBeforeLifecycle.programs ) ).toBe( true )
      const lifecycleCycles = []
      for ( let cycle = 0; cycle < 3; cycle += 1 )
      {
        await page.getByRole( 'button', { name: '01 3D POV' } ).click()
        await expect( page.locator( '.draft-layer-webgl' ) ).not.toHaveClass( /is-active/ )
        // Ignore the switch event itself; the contract is zero continued draws once
        // the cancellation boundary has settled.
        await page.waitForTimeout( 100 )
        await page.evaluate( () => window.__draft2Benchmark.resetLifecycle() )
        await page.waitForTimeout( 350 )
        const inactiveRenderFrames = await page.evaluate( () => window.__draft2Benchmark.snapshot().renderFrames )

        await page.getByRole( 'button', { name: '02 3D Break' } ).click()
        await expect( page.locator( '.draft-layer-webgl' ) ).toHaveClass( /is-active/ )
        await page.waitForFunction( () => window.__draft2Benchmark.snapshot().renderFrames > 0 )
        const resumed = await readDraftDiagnostics( page )
        lifecycleCycles.push( { inactiveRenderFrames, resumed } )
      }

      // Restore a settled source playhead, then rotate. Resize must not restart it.
      await driveStoryProgress( page, toStoryProgress( STORY_TIMING.intro.draft2.transitionReady ) )
      await page.waitForTimeout( 350 )
      const beforeResize = await readDraftDiagnostics( page )

      // Browser resize emits a real viewport event. The retained playhead and restored
      // device-selected tier prove the scheduler never restarts the story on rotation.
      await page.setViewportSize( { width: viewport.height, height: viewport.width } )
      await page.waitForTimeout( 500 )
      const rotated = await readDraftDiagnostics( page )
      await page.setViewportSize( { width: viewport.width, height: viewport.height } )
      await page.waitForFunction( ( expectedQuality ) =>
        document.querySelector( ".draft-layer-webgl" )?.dataset.webglQuality === expectedQuality,
      resourcesBeforeLifecycle.quality )
      // Wait for the debounced Story resize restore before reading the retained playhead.
      await page.waitForTimeout( 500 )
      const restored = await readDraftDiagnostics( page )

      const renderIntervals = toIntervals( performanceMeasured.draftRenderTimes )
      const pageFrameIntervals = performanceMeasured.pageFrameTimes.filter( Number.isFinite )
      const longTasks = performanceMeasured.longTasks.filter( ( entry ) => Number.isFinite( entry.duration ) )
      const budget = FRAME_BUDGETS[ viewport.name ]
      const report = {
        viewport,
        warmupMs: 900,
        progressTrace,
        renderIntervals: {
          samples: renderIntervals.length,
          medianMs: median( renderIntervals ),
          p95Ms: percentile( renderIntervals, 0.95 ),
          maxMs: Math.max( 0, ...renderIntervals ),
          source: "data-webgl-render-at after world.render()",
        },
        pageFrameIntervals: {
          samples: pageFrameIntervals.length,
          medianMs: median( pageFrameIntervals ),
          p95Ms: percentile( pageFrameIntervals, 0.95 ),
          note: "page RAF timing is context only; assertions use Draft 2 paint intervals.",
        },
        longTasks: {
          samples: longTasks.length,
          maxMs: Math.max( 0, ...longTasks.map( ( entry ) => entry.duration ) ),
          entries: longTasks,
        },
        lifecycle: {
          cycles: lifecycleCycles,
          inactiveRenderFrameBudget: INACTIVE_RENDER_FRAME_BUDGET,
          stoppedAfterDeactivate: lifecycleCycles.every( ( cycle ) =>
            cycle.inactiveRenderFrames <= INACTIVE_RENDER_FRAME_BUDGET,
          ),
          reactivatedAfterActivate: lifecycleCycles.every( ( cycle ) =>
            cycle.resumed.geometries === resourcesBeforeLifecycle.geometries &&
            cycle.resumed.textures === resourcesBeforeLifecycle.textures &&
            cycle.resumed.programs === resourcesBeforeLifecycle.programs,
          ),
        },
        resize: {
          before: beforeResize,
          rotated,
          restored,
        },
        visualBaseline: {
          numberDiskBorder: 'captured in state screenshots for outline-removal comparison',
          naturalContactShadows: 'captured in state screenshots for grounding comparison',
          screenshots: screenshotPaths,
        },
      }

      const reportPath = testInfo.outputPath( `${viewport.name}.json` )
      await writeFile( reportPath, JSON.stringify( report, null, 2 ) )
      await testInfo.attach( `${viewport.name}-benchmark.json`, {
        path: reportPath,
        contentType: 'application/json',
      } )
      console.log( `Draft 2 ${viewport.name}: ${JSON.stringify( report )}` )

      expect( renderIntervals.length ).toBeGreaterThanOrEqual( 20 )
      expect( performanceMeasured.drawCalls ).toBeGreaterThan( 0 )
      expect( median( renderIntervals ) ).toBeLessThanOrEqual( budget.medianMs )
      expect( percentile( renderIntervals, 0.95 ) ).toBeLessThanOrEqual( budget.p95Ms )
      expect( Math.max( 0, ...longTasks.map( ( entry ) => entry.duration ) ) )
        .toBeLessThanOrEqual( MAX_LONG_TASK_MS )

      lifecycleCycles.forEach( ( cycle ) =>
      {
        expect( cycle.inactiveRenderFrames ).toBeLessThanOrEqual( INACTIVE_RENDER_FRAME_BUDGET )
        expect( cycle.resumed.geometries ).toBe( resourcesBeforeLifecycle.geometries )
        expect( cycle.resumed.textures ).toBe( resourcesBeforeLifecycle.textures )
        expect( cycle.resumed.programs ).toBe( resourcesBeforeLifecycle.programs )
      } )
      expect( rotated.progress ).toBeCloseTo( beforeResize.progress, 3 )
      expect( restored.progress ).toBeCloseTo( beforeResize.progress, 3 )
      expect( Number.isFinite( rotated.dprCap ) ).toBe( true )
      expect( Number.isFinite( rotated.shadowMapSize ) ).toBe( true )
      expect( restored.quality ).toBe( resourcesBeforeLifecycle.quality )
      expect( restored.dprCap ).toBe( resourcesBeforeLifecycle.dprCap )
    }
    finally
    {
      await page.evaluate( () => window.__draft2Benchmark?.stop() ).catch( () => {} )
      await context.close()
    }
  } )
}

test( "Draft 2 remount disposal keeps GPU allocations stable", async ( { browser, baseURL } ) =>
{
  const context = await browser.newContext( { viewport: { width: 1280, height: 800 } } )
  const remountSnapshots = []

  try
  {
    for ( let cycle = 0; cycle < 3; cycle += 1 )
    {
      const page = await context.newPage()
      try
      {
        await installBenchmarkProbe( page )
        await page.goto( new URL( "/?draft=webgl&benchmark=draft2", baseURL ).toString(), { waitUntil: "domcontentloaded" } )
        await waitForDraftTwo( page )
        // Each fresh page warms a new WebGL scene; closing it below invokes the component cleanup.
        await page.waitForTimeout( 900 )
        const diagnostics = await readDraftDiagnostics( page )
        expect( Number.isFinite( diagnostics.geometries ) ).toBe( true )
        expect( Number.isFinite( diagnostics.textures ) ).toBe( true )
        expect( Number.isFinite( diagnostics.programs ) ).toBe( true )
        remountSnapshots.push( diagnostics )
      }
      finally
      {
        // A browser-page close is the real unmount boundary, not an active/inactive toggle.
        await page.close()
      }
    }

    const baseline = remountSnapshots[ 0 ]
    remountSnapshots.slice( 1 ).forEach( ( snapshot ) =>
    {
      expect( snapshot.geometries ).toBe( baseline.geometries )
      expect( snapshot.textures ).toBe( baseline.textures )
      expect( snapshot.programs ).toBe( baseline.programs )
    } )
  }
  finally
  {
    await context.close()
  }
} )

test( "Draft 2 forced WebGL failure preserves fallback status and keyboard focus", async ( { browser, baseURL } ) =>
{
  const context = await browser.newContext( { viewport: { width: 1280, height: 800 } } )
  const page = await context.newPage()

  try
  {
    await page.addInitScript( () =>
    {
      const originalGetContext = HTMLCanvasElement.prototype.getContext
      HTMLCanvasElement.prototype.getContext = function getContextWithoutWebgl ( contextType, ...args )
      {
        if ( [ "webgl", "webgl2", "experimental-webgl" ].includes( contextType ) ) return null
        return originalGetContext.call( this, contextType, ...args )
      }
    } )
    await page.goto( `${baseURL}/?draft=webgl&benchmark=draft2`, { waitUntil: "domcontentloaded" } )

    const layer = page.locator( ".draft-layer-webgl" )
    const status = page.getByRole( "status" )
    await expect( layer ).toHaveAttribute( "data-webgl-error", "true" )
    await expect( layer ).toHaveAttribute( "aria-hidden", "false" )
    await expect( status ).toContainText( "3D draft unavailable on this device" )
    await expect( status ).toBeVisible()

    // The switcher stays outside the artwork and remains reachable when Draft 2 falls back.
    const povButton = page.getByRole( "button", { name: "01 3D POV" } )
    await page.keyboard.press( "Tab" )
    await povButton.focus()
    await expect( povButton ).toBeFocused()
    await expect( povButton ).toHaveCSS( "outline-style", "solid" )
  }
  finally
  {
    await context.close()
  }
} )
