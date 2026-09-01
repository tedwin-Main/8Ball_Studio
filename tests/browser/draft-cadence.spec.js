import { test, expect } from '@playwright/test'

const VIEWPORT = Object.freeze( { width: 1280, height: 800 } )
const MOBILE_VIEWPORT = Object.freeze( { width: 390, height: 844 } )
const REPETITIONS = 3
const SETTLED_CONFIRMATION_MS = 200
const IDLE_OBSERVATION_MS = 500
const POINTER_WARMUP_IDLE_MS = 250
// Require a full observation window without paints before declaring renderer idle.
const SETTLED_IDLE_QUIET_MS = IDLE_OBSERVATION_MS
const MAX_SETTLED_IDLE_WAIT_MS = 3_500
const MAX_IDLE_OBSERVATION_ATTEMPTS = 4
// Bound post-settle confirmation or quality work to a short 400 ms window.
const MAX_SETTLED_CONFIRMATION_PAINTS = 24
const MAX_TRANSITION_MS = 2_500
const MAX_PAINT_INTERVAL_MS = 35
// A second paint in the same 60-Hz display interval would produce a sub-8 ms gap.
const MIN_PAINT_INTERVAL_MS = 8
const MAX_PROGRESS_LAG = 0.06

const DRAFTS = Object.freeze( [
  Object.freeze( {
    id: 'cinematic',
    name: 'Draft 1 Cinematic',
    selector: '.draft-layer-2d',
  } ),
  Object.freeze( {
    id: 'webgl',
    name: 'Draft 2 WebGL',
    selector: '.draft-layer-webgl',
  } ),
] )

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

const intervals = ( timestamps ) => timestamps.slice( 1 )
  .map( ( timestamp, index ) => timestamp - timestamps[ index ] )
  .filter( Number.isFinite )

const installCadenceProbe = async ( page ) =>
{
  await page.addInitScript( () =>
  {
    const state = {
      running: false,
      frameHandle: 0,
      frameTimes: [],
      progressUpdates: [],
      paints: [],
      wheelEvents: [],
      startedAt: 0,
      lastProgress: new Map(),
      lastPaintAt: new Map(),
      observer: null,
    }

    const recordProgress = ( root ) =>
    {
      const progress = Number( root.dataset.webglProgress )
      if ( !Number.isFinite( progress ) ) return

      const selector = root.matches( '.draft-layer-webgl' ) ? 'webgl' : 'cinematic'
      if ( state.lastProgress.get( selector ) === progress ) return
      state.lastProgress.set( selector, progress )
      state.progressUpdates.push( {
        selector,
        progress,
        time: performance.now(),
      } )
    }

    const recordPaint = ( root ) =>
    {
      // Draft 2 already publishes this after world.render(); Draft 1 uses the same
      // benchmark-only marker so the comparison observes completed canvas work.
      const renderAt = Number( root.dataset.webglRenderAt )
      if ( !Number.isFinite( renderAt ) ) return

      const selector = root.matches( '.draft-layer-webgl' ) ? 'webgl' : 'cinematic'
      if ( state.lastPaintAt.get( selector ) === renderAt ) return
      state.lastPaintAt.set( selector, renderAt )
      state.paints.push( {
        selector,
        progress: Number( root.dataset.webglProgress ),
        time: Number.isFinite( renderAt ) ? renderAt : performance.now(),
      } )
    }

    const observe = ( records ) =>
    {
      if ( !state.running ) return
      records.forEach( ( record ) =>
      {
        if ( record.type !== 'attributes' ) return
        const root = record.target
        if ( !( root instanceof HTMLElement ) ) return
        if ( !root.matches( '.draft-layer-2d, .draft-layer-webgl' ) ) return
        if ( record.attributeName === 'data-webgl-progress' ) recordProgress( root )
        if ( record.attributeName === 'data-webgl-render-at' ) recordPaint( root )
      } )
    }

    state.observer = new MutationObserver( observe )
    // Observe the document boundary so the probe works before React mounts both drafts.
    state.observer.observe( document, {
      attributes: true,
      attributeFilter: [ 'data-webgl-progress', 'data-webgl-render-at' ],
      subtree: true,
    } )

    const sampleFrame = ( timestamp ) =>
    {
      if ( !state.running ) return
      state.frameTimes.push( timestamp )
      state.frameHandle = window.requestAnimationFrame( sampleFrame )
    }

    window.addEventListener( 'wheel', ( event ) =>
    {
      if ( state.running ) state.wheelEvents.push( {
        deltaY: event.deltaY,
        time: performance.now(),
      } )
    }, { capture: true, passive: true } )

    window.__draftCadenceProbe = {
      start ()
      {
        state.running = true
        state.startedAt = performance.now()
        state.frameTimes = []
        state.progressUpdates = []
        state.paints = []
        state.wheelEvents = []
        state.lastProgress = new Map()
        state.lastPaintAt = new Map()
        state.frameHandle = window.requestAnimationFrame( sampleFrame )
      },
      snapshot ()
      {
        return {
          startedAt: state.startedAt,
          frameTimes: [ ...state.frameTimes ],
          progressUpdates: [ ...state.progressUpdates ],
          paints: [ ...state.paints ],
          wheelEvents: [ ...state.wheelEvents ],
        }
      },
      stop ()
      {
        state.running = false
        if ( state.frameHandle ) window.cancelAnimationFrame( state.frameHandle )
        state.frameHandle = 0
        return {
          startedAt: state.startedAt,
          frameTimes: [ ...state.frameTimes ],
          progressUpdates: [ ...state.progressUpdates ],
          paints: [ ...state.paints ],
          wheelEvents: [ ...state.wheelEvents ],
        }
      },
    }
  } )
}

const waitForDraftReady = async ( page, draft ) =>
{
  await expect( page.locator( '.story' ) ).toHaveAttribute(
    'data-story-navigation-ready',
    'true',
    { timeout: 30_000 },
  )
  const root = page.locator( draft.selector )
  await expect( root ).toHaveAttribute( 'data-webgl-error', 'false', { timeout: 30_000 } )
  await expect( root ).toHaveAttribute( 'data-webgl-render-at', /.+/, { timeout: 30_000 } )
  await page.waitForFunction( ( selector ) =>
  {
    const canvas = document.querySelector( selector )?.querySelector( 'canvas' )
    return Boolean( canvas && canvas.width > 0 && canvas.height > 0 && window.__storyNavigationBenchmark )
  }, draft.selector )
}

const getSingleGestureDelta = ( page ) => page.evaluate( () =>
{
  const story = document.querySelector( '.story' )
  const range = story ? Math.max( 0, story.offsetHeight - window.innerHeight ) : 0
  // Keep one real wheel packet large enough to qualify, but below a full Story range.
  return Math.ceil( range * 0.9 )
} )

const waitForStableStudio = async ( page, draft ) =>
{
  await expect( page.getByRole( 'button', { name: 'Go to Studio page' } ) )
    .toHaveAttribute( 'aria-current', 'page', { timeout: 10_000 } )
  await expect( page.locator( '.story' ) ).toHaveAttribute( 'data-story-page', 'studio' )
  await expect( page.locator( '.story' ) ).toHaveAttribute( 'data-story-state', 'settled' )
  await expect( page.locator( '.title-screen' ) ).toBeVisible()
  await expect( page.locator( '.scene-interface' ) ).toBeHidden()
  await expect( page.locator( draft.selector ) ).toHaveAttribute( 'data-webgl-progress', '1.0000' )
}

const waitForStableIntro = async ( page, draft ) =>
{
  await expect( page.getByRole( 'button', { name: 'Go to Intro page' } ) )
    .toHaveAttribute( 'aria-current', 'page', { timeout: 10_000 } )
  await expect( page.locator( '.story' ) ).toHaveAttribute( 'data-story-page', 'intro' )
  await expect( page.locator( '.story' ) ).toHaveAttribute( 'data-story-state', 'settled' )
  await expect( page.locator( '.scene-interface' ) ).toBeVisible()
  await expect( page.locator( '.title-screen' ) ).toBeHidden()
  await expect( page.locator( draft.selector ) ).toHaveAttribute( 'data-webgl-progress', '0.0000' )
}

const waitForRenderQuiet = async ( page, draft, { quietWindowMs, timeoutMs, stateKey } ) =>
{
  await page.evaluate( ( key ) => { window[ key ] = null }, stateKey )
  await page.waitForFunction( ( { selector, quietWindowMs, stateKey } ) =>
  {
    const root = document.querySelector( selector )
    const renderAt = root?.dataset.webglRenderAt
    if ( !renderAt ) return false

    const sample = window[ stateKey ] || {
      renderAt,
      changedAt: performance.now(),
    }
    if ( sample.renderAt !== renderAt )
    {
      sample.renderAt = renderAt
      sample.changedAt = performance.now()
    }
    window[ stateKey ] = sample
    return performance.now() - sample.changedAt >= quietWindowMs
  }, { selector: draft.selector, quietWindowMs, stateKey }, { timeout: timeoutMs, polling: 50 } )
}

const waitForWarmupIdle = ( page, draft ) => waitForRenderQuiet( page, draft, {
  quietWindowMs: POINTER_WARMUP_IDLE_MS,
  timeoutMs: 5_000,
  stateKey: '__draftCadenceWarmupSample',
} )

const waitForSettledPaintIdle = ( page, draft, timeoutMs = MAX_SETTLED_IDLE_WAIT_MS ) => waitForRenderQuiet( page, draft, {
  quietWindowMs: SETTLED_IDLE_QUIET_MS,
  timeoutMs,
  stateKey: '__draftCadenceIdleSample',
} )

const countDraftPaints = ( snapshot, draft ) => snapshot.paints
  .filter( ( paint ) => paint.selector === draft.id ).length

const waitForIdleObservation = async ( page, draft ) =>
{
  // A renderer can resume after an apparently quiet interval; require one complete
  // quiet-plus-observation window while keeping the whole wait bounded.
  const startedAt = Date.now()
  for ( let attempt = 0; attempt < MAX_IDLE_OBSERVATION_ATTEMPTS; attempt += 1 )
  {
    const remainingMs = MAX_SETTLED_IDLE_WAIT_MS - ( Date.now() - startedAt )
    if ( remainingMs <= 0 ) break
    await waitForSettledPaintIdle( page, draft, remainingMs )
    const idleStartAt = await page.evaluate( () => performance.now() )
    const idleStart = await page.evaluate( () => window.__draftCadenceProbe.snapshot() )
    await page.waitForTimeout( IDLE_OBSERVATION_MS )
    const idleEnd = await page.evaluate( () => window.__draftCadenceProbe.snapshot() )
    if ( countDraftPaints( idleEnd, draft ) === countDraftPaints( idleStart, draft ) )
    {
      return { idleStartAt, idleStart, idleEnd }
    }
  }

  throw new Error( `Draft ${draft.id} did not remain idle within ${MAX_SETTLED_IDLE_WAIT_MS}ms` )
}

const getNearestFrameCount = ( frameTimes, timestamps ) =>
{
  if ( frameTimes.length === 0 ) return 0
  const buckets = new Set()
  timestamps.forEach( ( timestamp ) =>
  {
    let nearestIndex = 0
    let nearestDistance = Infinity
    frameTimes.forEach( ( frameTime, index ) =>
    {
      const distance = Math.abs( frameTime - timestamp )
      if ( distance < nearestDistance )
      {
        nearestDistance = distance
        nearestIndex = index
      }
    } )
    buckets.add( nearestIndex )
  } )
  return buckets.size
}

const measureCadence = ( snapshot, draft, direction = 'forward' ) =>
{
  const progressUpdates = snapshot.progressUpdates
    .filter( ( entry ) => entry.selector === draft.id )
    .filter( ( entry ) => Number.isFinite( entry.progress ) )
  const paints = snapshot.paints
    .filter( ( entry ) => entry.selector === draft.id )
    .filter( ( entry ) => Number.isFinite( entry.progress ) && Number.isFinite( entry.time ) )

  const firstProgress = progressUpdates[ 0 ]?.time ?? snapshot.startedAt
  const lastProgress = progressUpdates.at( -1 )?.time ?? firstProgress
  const activeFrameTimes = snapshot.frameTimes.filter( ( time ) =>
    time >= firstProgress - 8 && time <= lastProgress + 25,
  )
  const activePaints = paints.filter( ( paint ) =>
    paint.time >= firstProgress - 8 && paint.time <= lastProgress + 50,
  )
  const paintIntervals = intervals( activePaints.map( ( paint ) => paint.time ) )
  const progressPaints = activePaints.filter( ( paint, index ) =>
    index === 0 || Math.abs( paint.progress - activePaints[ index - 1 ].progress ) > 0.0005,
  )
  const changedProgressFrames = getNearestFrameCount(
    activeFrameTimes,
    progressUpdates.map( ( update ) => update.time ),
  )
  const activePaintFrames = getNearestFrameCount(
    activeFrameTimes,
    activePaints.map( ( paint ) => paint.time ),
  )
  const progressLags = activePaints.map( ( paint ) =>
  {
    const latestUpdate = progressUpdates
      .filter( ( update ) => update.time <= paint.time + 8 )
      .at( -1 )
    return latestUpdate ? Math.abs( latestUpdate.progress - paint.progress ) : null
  } ).filter( Number.isFinite )
  const staleProgressPaintCount = activePaints.slice( 1 ).filter( ( paint, index ) =>
  {
    const progressDelta = paint.progress - activePaints[ index ].progress
    return Math.abs( progressDelta ) > 0.0005 &&
      ( direction === 'reverse' ? progressDelta > 0 : progressDelta < 0 )
  } ).length

  return {
    direction,
    wheelCount: snapshot.wheelEvents.filter( ( event ) => direction === 'reverse'
      ? event.deltaY < 0
      : event.deltaY > 0 ).length,
    progressUpdateCount: progressUpdates.length,
    activeFrameCount: activeFrameTimes.length,
    changedProgressFrames,
    paintCount: activePaints.length,
    activePaintFrames,
    progressPaintCount: progressPaints.length,
    progressPaintCoverage: changedProgressFrames > 0 ? progressPaints.length / changedProgressFrames : 0,
    maxProgressLag: Math.max( 0, ...progressLags ),
    staleProgressPaintCount,
    paintFrameCoverage: activeFrameTimes.length > 0 ? activePaintFrames / activeFrameTimes.length : 0,
    paintIntervals: {
      samples: paintIntervals.length,
      minMs: paintIntervals.length > 0 ? Math.min( ...paintIntervals ) : 0,
      medianMs: median( paintIntervals ),
      p95Ms: percentile( paintIntervals, 0.95 ),
      maxMs: Math.max( 0, ...paintIntervals ),
    },
    finalPaintProgress: activePaints.at( -1 )?.progress ?? null,
    confirmationPaintCount: 0,
    idlePaintCount: 0,
    transitionDurationMs: 0,
  }
}

const runMeasurement = async ( browser, baseURL, draft, {
  viewport = VIEWPORT,
  deviceScaleFactor = 2,
  direction = 'forward',
  hasTouch = false,
  isMobile = false,
} = {} ) =>
{
  const context = await browser.newContext( {
    viewport,
    deviceScaleFactor,
    hasTouch,
    isMobile,
  } )
  const page = await context.newPage()

  try
  {
    await installCadenceProbe( page )
    await page.goto( `${baseURL}/?draft=${draft.id}&benchmark=draft2`, { waitUntil: 'domcontentloaded' } )
    await waitForDraftReady( page, draft )
    expect( await page.evaluate( () => ( {
      devicePixelRatio: window.devicePixelRatio,
      width: window.innerWidth,
      height: window.innerHeight,
    } ) ) ).toEqual( {
      devicePixelRatio: deviceScaleFactor,
      width: viewport.width,
      height: viewport.height,
    } )
    await waitForStableIntro( page, draft )

    // Center the pointer before warm-up so Draft 2's damping can settle outside the measurement window.
    await page.mouse.move( viewport.width / 2, viewport.height / 2 )
    // Warm shaders, textures, the pointer state, and the production preview before measuring the gesture.
    await page.waitForTimeout( 900 )
    await waitForWarmupIdle( page, draft )

    if ( direction === 'reverse' )
    {
      // Reach the Stable Studio page before sampling so the measured gesture is genuinely reverse.
      await page.mouse.wheel( 0, await getSingleGestureDelta( page ) )
      await waitForStableStudio( page, draft )
      await waitForSettledPaintIdle( page, draft )
    }

    await page.evaluate( () => window.__draftCadenceProbe.start() )
    const gestureStart = await page.evaluate( () => performance.now() )
    const gestureDelta = await getSingleGestureDelta( page )
    await page.mouse.wheel( 0, direction === 'reverse' ? -gestureDelta : gestureDelta )
    if ( direction === 'reverse' ) await waitForStableIntro( page, draft )
    else await waitForStableStudio( page, draft )
    const settledAt = await page.evaluate( () => performance.now() )

    const settledSnapshot = await page.evaluate( () => window.__draftCadenceProbe.snapshot() )

    // Allow one bounded confirmation/quality window, then require true demand-driven idling.
    await page.waitForTimeout( SETTLED_CONFIRMATION_MS )
    const confirmation = await page.evaluate( () => window.__draftCadenceProbe.snapshot() )
    const measurement = measureCadence( confirmation, draft, direction )
    measurement.transitionDurationMs = settledAt - gestureStart
    const idleObservation = await waitForIdleObservation( page, draft )
    const idle = await page.evaluate( () => window.__draftCadenceProbe.stop() )
    measurement.confirmationPaintCount = countDraftPaints( idleObservation.idleStart, draft )
      - countDraftPaints( settledSnapshot, draft )
    measurement.idlePaintCount = countDraftPaints( idleObservation.idleEnd, draft )
      - countDraftPaints( idleObservation.idleStart, draft )
    measurement.settledIdleWaitMs = idleObservation.idleStartAt - settledAt
    measurement.wheelCount = idle.wheelEvents.filter( ( event ) => direction === 'reverse'
      ? event.deltaY < 0
      : event.deltaY > 0 ).length
    measurement.progressUpdateCount = idle.progressUpdates.filter( ( entry ) => entry.selector === draft.id ).length
    measurement.idleSnapshot = {
      confirmationPaints: measurement.confirmationPaintCount,
      paintsAfterConfirmation: measurement.idlePaintCount,
      settledIdleWaitMs: measurement.settledIdleWaitMs,
    }

    return measurement
  }
  finally
  {
    await context.close()
  }
}

const summarizeDraft = ( draft, measurements ) => ( {
  draft: draft.name,
  repetitions: measurements.length,
  medianProgressPaintCoverage: median( measurements.map( ( measurement ) => measurement.progressPaintCoverage ) ),
  medianPaintFrameCoverage: median( measurements.map( ( measurement ) => measurement.paintFrameCoverage ) ),
  medianPaintCount: median( measurements.map( ( measurement ) => measurement.paintCount ) ),
  p95PaintIntervalMs: percentile( measurements.map( ( measurement ) => measurement.paintIntervals.p95 ), 0.5 ),
  medianTransitionDurationMs: median( measurements.map( ( measurement ) => measurement.transitionDurationMs ) ),
  measurements,
} )

const collectScenario = async ( browser, baseURL, options = {} ) =>
{
  const summaries = []
  for ( const draft of DRAFTS )
  {
    summaries.push( summarizeDraft( draft, [ await runMeasurement( browser, baseURL, draft, options ) ] ) )
  }
  return summaries
}

const expectCadenceContract = ( summaries, direction = 'forward' ) =>
{
  const draft1 = summaries[ 0 ]
  const draft2 = summaries[ 1 ]
  const allMeasurements = summaries.flatMap( ( summary ) => summary.measurements )
  const finalProgressIsSettled = direction === 'reverse'
    ? ( measurement ) => measurement.finalPaintProgress === null || measurement.finalPaintProgress <= 0.001
    : ( measurement ) => measurement.finalPaintProgress === null || measurement.finalPaintProgress >= 0.999

  expect( allMeasurements.every( ( measurement ) => measurement.wheelCount === 1 ) ).toBe( true )
  expect( allMeasurements.every( ( measurement ) => measurement.progressUpdateCount > 20 ) ).toBe( true )
  expect( allMeasurements.every( ( measurement ) => measurement.transitionDurationMs > 0 ) ).toBe( true )
  expect( allMeasurements.every( ( measurement ) => measurement.transitionDurationMs <= MAX_TRANSITION_MS ) ).toBe( true )
  expect( allMeasurements.every( finalProgressIsSettled ) ).toBe( true )
  expect( allMeasurements.every( ( measurement ) => measurement.confirmationPaintCount <= MAX_SETTLED_CONFIRMATION_PAINTS ) ).toBe( true )
  expect( allMeasurements.every( ( measurement ) => measurement.settledIdleWaitMs <= MAX_SETTLED_IDLE_WAIT_MS ) ).toBe( true )
  expect( allMeasurements.every( ( measurement ) => measurement.idlePaintCount === 0 ) ).toBe( true )
  expect( allMeasurements.every( ( measurement ) => measurement.paintIntervals.minMs >= MIN_PAINT_INTERVAL_MS ) ).toBe( true )
  expect( allMeasurements.every( ( measurement ) => measurement.maxProgressLag <= MAX_PROGRESS_LAG ) ).toBe( true )
  expect( allMeasurements.every( ( measurement ) => measurement.staleProgressPaintCount === 0 ) ).toBe( true )
  expect( allMeasurements.every( ( measurement ) => measurement.paintIntervals.p95Ms <= MAX_PAINT_INTERVAL_MS ) ).toBe( true )

  // Both treatments must use the available display frames; Draft 1 cannot fall back to its old half-rate cadence.
  expect( draft1.medianPaintFrameCoverage ).toBeGreaterThanOrEqual( 0.9 )
  expect( draft2.medianPaintFrameCoverage ).toBeGreaterThanOrEqual( 0.9 )
  expect( draft1.medianPaintFrameCoverage ).toBeGreaterThanOrEqual( draft2.medianPaintFrameCoverage * 0.95 )
  expect( draft1.medianPaintCount ).toBeGreaterThanOrEqual( draft2.medianPaintCount * 0.95 )
  expect( draft1.medianProgressPaintCoverage ).toBeGreaterThanOrEqual( 0.9 )
  expect( draft2.medianProgressPaintCoverage ).toBeGreaterThanOrEqual( 0.9 )
}

test( 'Draft 1 and Draft 2 keep comparable paint cadence during one real DPR2 Story gesture', async ( { browser, baseURL }, testInfo ) =>
{
  const summaries = []

  for ( const draft of DRAFTS )
  {
    const measurements = []
    for ( let repetition = 0; repetition < REPETITIONS; repetition += 1 )
    {
      measurements.push( await runMeasurement( browser, baseURL, draft ) )
    }
    summaries.push( summarizeDraft( draft, measurements ) )
  }

  await testInfo.attach( 'draft-cadence-report.json', {
    body: JSON.stringify( { viewport: VIEWPORT, summaries }, null, 2 ),
    contentType: 'application/json',
  } )
  console.log( `Draft cadence: ${JSON.stringify( { viewport: VIEWPORT, summaries } )}` )
  expectCadenceContract( summaries )
} )

test( 'Draft 1 and Draft 2 keep comparable cadence when reversing to Intro', async ( { browser, baseURL }, testInfo ) =>
{
  const summaries = await collectScenario( browser, baseURL, { direction: 'reverse' } )

  await testInfo.attach( 'draft-cadence-reverse-report.json', {
    body: JSON.stringify( { viewport: VIEWPORT, direction: 'reverse', summaries }, null, 2 ),
    contentType: 'application/json',
  } )
  console.log( `Draft reverse cadence: ${JSON.stringify( { viewport: VIEWPORT, summaries } )}` )
  expectCadenceContract( summaries, 'reverse' )
} )

test( 'Draft 1 and Draft 2 keep comparable cadence at the portrait mobile viewport', async ( { browser, baseURL }, testInfo ) =>
{
  const summaries = await collectScenario( browser, baseURL, {
    viewport: MOBILE_VIEWPORT,
    deviceScaleFactor: 1,
    hasTouch: true,
    isMobile: true,
  } )

  await testInfo.attach( 'draft-cadence-mobile-report.json', {
    body: JSON.stringify( { viewport: MOBILE_VIEWPORT, summaries }, null, 2 ),
    contentType: 'application/json',
  } )
  console.log( `Draft mobile cadence: ${JSON.stringify( { viewport: MOBILE_VIEWPORT, summaries } )}` )
  expectCadenceContract( summaries )
} )

test( 'Draft 1 cancels inactive paints and resumes with the latest state', async ( { browser, baseURL } ) =>
{
  const context = await browser.newContext( {
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
  } )
  const page = await context.newPage()
  const draft = DRAFTS[ 0 ]

  try
  {
    await installCadenceProbe( page )
    await page.goto( `${baseURL}/?draft=cinematic&benchmark=draft2`, { waitUntil: 'domcontentloaded' } )
    await waitForDraftReady( page, draft )
    await waitForStableIntro( page, draft )

    const draftRoot = page.locator( draft.selector )
    await page.getByRole( 'button', { name: '02 3D Break' } ).click()
    await expect( draftRoot ).not.toHaveClass( /is-active/ )
    // Ignore the switch callback itself, then prove the inactive renderer stays quiet.
    await page.waitForTimeout( 100 )
    await page.evaluate( () => window.__draftCadenceProbe.start() )
    await page.waitForTimeout( 350 )
    const inactive = await page.evaluate( () => window.__draftCadenceProbe.stop() )
    expect( countDraftPaints( inactive, draft ) ).toBe( 0 )

    await page.evaluate( () => window.__draftCadenceProbe.start() )
    await page.getByRole( 'button', { name: '01 3D POV' } ).click()
    await expect( draftRoot ).toHaveClass( /is-active/ )
    await page.waitForFunction( () => window.__draftCadenceProbe.snapshot().paints.some( ( paint ) => paint.selector === 'cinematic' ) )
    const resumed = await page.evaluate( () => window.__draftCadenceProbe.stop() )
    expect( countDraftPaints( resumed, draft ) ).toBeGreaterThan( 0 )
  }
  finally
  {
    await context.close()
  }
} )
