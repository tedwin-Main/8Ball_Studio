import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, relative } from 'node:path'
import { test, expect } from '@playwright/test'

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
  { name: 'impact', progress: 0.52, settleMs: 80 },
  { name: 'scatter', progress: 0.76, settleMs: 220 },
  { name: 'exit', progress: 0.91, settleMs: 220 },
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

const installBenchmarkProbe = async ( page ) =>
{
  await page.addInitScript( () =>
  {
    const state = {
      drawing: false,
      drawCalls: 0,
      renderFrames: 0,
      frameTimes: [],
      previousFrame: null,
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
      if ( state.previousFrame !== null ) state.frameTimes.push( timestamp - state.previousFrame )
      state.previousFrame = timestamp
      state.frameHandle = window.requestAnimationFrame( sampleFrame )
    }

    window.__draft2Benchmark = {
      start ()
      {
        state.drawing = true
        state.drawCalls = 0
        state.renderFrames = 0
        state.frameTimes = []
        state.previousFrame = null
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
          frameTimes: [ ...state.frameTimes ],
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
  await page.waitForFunction( () =>
  {
    const canvas = document.querySelector( '.webgl-pool-canvas' )
    return Boolean( canvas && canvas.width > 0 && canvas.height > 0 && window.lenis )
  } )
}

const driveStoryProgress = async ( page, progress ) =>
{
  const target = await page.evaluate( ( nextProgress ) =>
  {
    const story = document.querySelector( '.story' )
    if ( !story || !window.lenis ) throw new Error( 'Draft 2 scroll controller is not ready.' )

    const bounds = story.getBoundingClientRect()
    const range = Math.max( 0, story.offsetHeight - window.innerHeight )
    const storyTop = window.scrollY + bounds.top
    const targetScroll = storyTop + range * nextProgress

    // Use the public Lenis scroll controller so benchmark inputs match visitors.
    window.lenis.scrollTo( targetScroll, {
      immediate: true,
      force: true,
      programmatic: true,
    } )

    return {
      targetScroll,
      currentScroll: window.lenis.scroll,
    }
  }, progress )

  await page.waitForTimeout( 2 )
  return target
}

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

      const measured = await page.evaluate( () => window.__draft2Benchmark.snapshot() )

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
      await driveStoryProgress( page, 0.76 )
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
      const restored = await readDraftDiagnostics( page )

      const frameIntervals = measured.frameTimes.filter( Number.isFinite )
      const longTasks = measured.longTasks.filter( ( entry ) => Number.isFinite( entry.duration ) )
      const budget = FRAME_BUDGETS[ viewport.name ]
      const report = {
        viewport,
        warmupMs: 900,
        progressTrace,
        frameIntervals: {
          samples: frameIntervals.length,
          medianMs: median( frameIntervals ),
          p95Ms: percentile( frameIntervals, 0.95 ),
          maxMs: Math.max( 0, ...frameIntervals ),
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

      expect( frameIntervals.length ).toBeGreaterThan( 20 )
      expect( measured.drawCalls ).toBeGreaterThan( 0 )
      expect( median( frameIntervals ) ).toBeLessThanOrEqual( budget.medianMs )
      expect( percentile( frameIntervals, 0.95 ) ).toBeLessThanOrEqual( budget.p95Ms )
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
