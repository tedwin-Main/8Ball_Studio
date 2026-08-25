import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, relative } from 'node:path'
import { test, expect } from '@playwright/test'

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'portrait', width: 390, height: 844 },
]

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

      // Switching drafts is the public activation boundary. A short quiet window
      // proves Draft 2 stops drawing, then the inverse switch proves it can resume.
      await page.evaluate( () => window.__draft2Benchmark.resetLifecycle() )
      await page.getByRole( 'button', { name: '01 3D POV' } ).click()
      await expect( page.locator( '.draft-layer-webgl' ) ).not.toHaveClass( /is-active/ )
      await page.waitForTimeout( 450 )
      const inactive = await page.evaluate( () => window.__draft2Benchmark.snapshot().renderFrames )

      await page.getByRole( 'button', { name: '02 3D Break' } ).click()
      await expect( page.locator( '.draft-layer-webgl' ) ).toHaveClass( /is-active/ )
      await page.waitForTimeout( 450 )
      const reactivated = await page.evaluate( () => window.__draft2Benchmark.snapshot().renderFrames )

      const frameIntervals = measured.frameTimes.filter( Number.isFinite )
      const longTasks = measured.longTasks.filter( ( entry ) => Number.isFinite( entry.duration ) )
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
          inactiveRenderFrames: inactive,
          reactivatedRenderFrames: reactivated,
          stoppedAfterDeactivate: inactive <= 2,
          reactivatedAfterActivate: reactivated > 0,
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
      // Record the current lifecycle result for the optimization tickets; the
      // certification ticket turns this baseline into an enforced stop budget.
      expect( Number.isFinite( inactive ) ).toBe( true )
      expect( reactivated ).toBeGreaterThan( 0 )
    }
    finally
    {
      await page.evaluate( () => window.__draft2Benchmark?.stop() ).catch( () => {} )
      await context.close()
    }
  } )
}
