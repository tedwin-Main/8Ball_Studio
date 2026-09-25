import { test, expect } from '@playwright/test'

// Frame pace through the section choreography (DOCS/SPEC_FLUID_SCROLL_AND_LOOKS.md): wheel-scroll
// from the held Studio through the Studio → Projects handoff, the Projects run, and the Contact
// reveal, sampling every animation frame. At most 2% of frames may take longer than 20 ms.
const VIEWPORT = Object.freeze( { width: 1440, height: 900 } )
const SLOW_FRAME_MS = 20
const MAX_SLOW_SHARE = 0.02

// Frame pace needs the machine's real GPU. Under SwiftShader (software GL, which the Draft 2 WebGL
// checks rely on) the CPU does the compositing, so the numbers measure the emulator, not the site:
// on 2026-09-25 untouched main dropped 7–10% of frames there against 0–3% on the Apple M4 GPU.
test.use( {
  launchOptions: {
    args: process.platform === 'darwin'
      ? [ '--headless=new', '--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization' ]
      : [ '--headless=new', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization' ],
  },
} )

for ( const look of [ 'acid', 'cyc', 'downlight' ] )
{
  test( `${look}: handoffs and the Projects run hold frame pace under the wheel`, async ( { page } ) =>
  {
    await page.setViewportSize( VIEWPORT )
    await page.goto( `/?look=${look}`, { waitUntil: 'load' } )
    await page.waitForSelector( '.preloader', { state: 'detached', timeout: 10_000 } )

    // Start a little above the handoff, with the Studio cue settled.
    const start = await page.evaluate( () =>
      document.querySelector( '#projects' ).getBoundingClientRect().top + window.scrollY - window.innerHeight * 1.2 )
    await page.evaluate( ( y ) => window.scrollTo( 0, y ), start )
    await page.waitForTimeout( 2_500 )
    await page.mouse.move( VIEWPORT.width / 2, VIEWPORT.height / 2 )

    await page.evaluate( () =>
    {
      const probe = { frames: [], running: true }
      let last = performance.now()
      const tick = ( now ) =>
      {
        probe.frames.push( now - last )
        last = now
        if ( probe.running ) requestAnimationFrame( tick )
      }
      requestAnimationFrame( tick )
      window.__flowProbe = probe
    } )

    // A steady wheel: 70 notches, one every 50 ms, then let the glide and the scrubs settle.
    for ( let notch = 0; notch < 70; notch++ )
    {
      await page.mouse.wheel( 0, 100 )
      await page.waitForTimeout( 50 )
    }
    await page.waitForTimeout( 1_500 )

    const { frames, reachedContact } = await page.evaluate( () =>
    {
      window.__flowProbe.running = false
      return {
        frames: window.__flowProbe.frames.slice( 1 ),
        reachedContact: document.querySelector( '#contact' ).getBoundingClientRect().top < window.innerHeight,
      }
    } )
    const slow = frames.filter( ( ms ) => ms > SLOW_FRAME_MS ).length
    console.log( `${look}: ${frames.length} frames, ${slow} over ${SLOW_FRAME_MS} ms (${( slow / frames.length * 100 ).toFixed( 2 )}%)` )

    expect( reachedContact ).toBe( true )
    expect( slow / frames.length ).toBeLessThanOrEqual( MAX_SLOW_SHARE )
  } )
}
