import { test, expect } from '@playwright/test'

test( 'localhost mounts the Story without a blank root or page errors', async ( { page } ) =>
{
  const pageErrors = []
  page.on( 'pageerror', ( error ) => pageErrors.push( error.message ) )

  await page.goto( '/', { waitUntil: 'domcontentloaded' } )
  await expect( page.locator( '.experience' ) ).toBeVisible()
  await expect( page.getByRole( 'heading', { name: 'Roll with us.' } ) ).toBeVisible()

  expect( pageErrors ).toEqual( [] )
} )

test( 'Draft 2 (3D break) renders without fallback activation or runtime errors', async ( { page } ) =>
{
  const pageErrors = []
  const warnings = []
  page.on( 'pageerror', ( error ) => pageErrors.push( error.message ) )
  page.on( 'console', ( msg ) => {
    if ( msg.type() === 'warning' && msg.text().includes( 'WebGL setup failed' ) ) {
      warnings.push( msg.text() )
    }
  } )

  await page.goto( '/?draft=webgl', { waitUntil: 'domcontentloaded' } )
  const draftRoot = page.locator( '.draft-layer[data-draft-id="webgl"]' )
  await expect( draftRoot ).toHaveAttribute( 'data-webgl-error', 'false' )
  await expect( draftRoot ).toHaveClass( /is-active/ )

  expect( warnings ).toEqual( [] )
  expect( pageErrors ).toEqual( [] )
} )

test( 'Draft 4 (photoreal) renders without missing balls or runtime errors', async ( { page } ) =>
{
  const pageErrors = []
  page.on( 'pageerror', ( error ) => pageErrors.push( error.message ) )

  await page.goto( '/?draft=photoreal', { waitUntil: 'domcontentloaded' } )
  const draftRoot = page.locator( '.draft-layer-photoreal' )
  await expect( draftRoot ).toHaveAttribute( 'data-webgl-error', 'false' )
  await expect( draftRoot ).toHaveAttribute( 'data-webgl-progress', '0.0000' )

  expect( pageErrors ).toEqual( [] )
} )

// ---- Fluid scroll and looks (DOCS/SPEC_FLUID_SCROLL_AND_LOOKS.md) ----

const waitForPreloader = ( page ) => page.waitForSelector( '.preloader', { state: 'detached', timeout: 10_000 } )
const sectionTop = ( page, selector ) =>
  page.evaluate( ( target ) => Math.round( document.querySelector( target ).getBoundingClientRect().top ), selector )

test( 'Acid Night is the default look, and the Look dropdown lists the three looks in order', async ( { page } ) =>
{
  await page.goto( '/', { waitUntil: 'domcontentloaded' } )
  await expect( page.locator( '.experience' ) ).toHaveAttribute( 'data-look', 'acid' )
  await expect( page.locator( '.look-switcher-select option' ) ).toHaveText( [ 'Acid Night', 'Cyc Wall', 'Downlight' ] )
  // A retired look falls back to the default instead of rendering unstyled.
  await page.goto( '/?look=marker', { waitUntil: 'domcontentloaded' } )
  await expect( page.locator( '.experience' ) ).toHaveAttribute( 'data-look', 'acid' )
} )

test( 'Projects runs its boards sideways and the header links land on each section', async ( { page } ) =>
{
  const pageErrors = []
  page.on( 'pageerror', ( error ) => pageErrors.push( error.message ) )
  await page.setViewportSize( { width: 1440, height: 900 } )
  await page.goto( '/', { waitUntil: 'load' } )
  await waitForPreloader( page )

  // Projects is pulled over the stage's last screen: its top is exactly where the stage releases.
  const layout = await page.evaluate( () =>
  {
    const story = document.querySelector( '.story' )
    const projects = document.querySelector( '#projects' )
    return {
      pinnedRange: story.offsetHeight - window.innerHeight,
      projectsTop: Math.round( projects.getBoundingClientRect().top + window.scrollY ),
      runDistance: parseFloat( projects.style.getPropertyValue( '--run-distance' ) ),
    }
  } )
  expect( Math.abs( layout.projectsTop - layout.pinnedRange ) ).toBeLessThanOrEqual( 1 )
  expect( layout.runDistance ).toBeGreaterThan( 0 )

  await page.getByRole( 'link', { name: 'Our Projects' } ).click()
  await expect.poll( () => sectionTop( page, '#projects' ), { timeout: 8_000 } ).toBe( 0 )

  // Scrolling through the pinned run slides the track by the whole run distance.
  await page.evaluate( ( distance ) => window.scrollBy( 0, distance ), layout.runDistance )
  await expect.poll(
    () => page.evaluate( () => new DOMMatrix( getComputedStyle( document.querySelector( '.projects-track' ) ).transform ).m41 ),
    { timeout: 8_000 },
  ).toBeLessThan( -layout.runDistance * 0.95 )

  await page.getByRole( 'link', { name: 'Contact Us' } ).click()
  await expect.poll( () => sectionTop( page, '#contact' ), { timeout: 8_000 } ).toBe( 0 )
  // The header and the browser chrome follow the section: Contact is full acid in Acid Night.
  await expect( page.locator( '.experience' ) ).toHaveAttribute( 'data-nav-section', 'contact' )
  await expect( page.locator( 'meta[name="theme-color"]' ) ).toHaveAttribute( 'content', '#b7d95b' )

  expect( pageErrors ).toEqual( [] )
} )

test( 'the closing board opens Contact, and the Instagram board links to the real profile', async ( { page } ) =>
{
  await page.goto( '/', { waitUntil: 'load' } )
  await waitForPreloader( page )
  await expect( page.getByRole( 'link', { name: /More on Instagram/ } ) ).toHaveAttribute( 'href', 'https://www.instagram.com/8ightball.studio/' )
  await page.getByRole( 'link', { name: /Your brand, next/ } ).click()
  await expect.poll( () => sectionTop( page, '#contact' ), { timeout: 8_000 } ).toBe( 0 )
} )

test( 'reduced motion scrolls natively and lays Projects out as a wrapped floor', async ( { browser } ) =>
{
  const context = await browser.newContext( { reducedMotion: 'reduce' } )
  const page = await context.newPage()
  const pageErrors = []
  page.on( 'pageerror', ( error ) => pageErrors.push( error.message ) )
  await page.goto( '/', { waitUntil: 'load' } )
  await waitForPreloader( page )

  const state = await page.evaluate( () => ( {
    lenis: document.documentElement.classList.contains( 'lenis' ),
    cursorBall: Boolean( document.querySelector( '.cursor-ball' ) ),
    runDistance: document.querySelector( '#projects' ).style.getPropertyValue( '--run-distance' ),
    trackWrap: getComputedStyle( document.querySelector( '.projects-track' ) ).flexWrap,
  } ) )
  expect( state ).toEqual( { lenis: false, cursorBall: false, runDistance: '', trackWrap: 'wrap' } )
  expect( pageErrors ).toEqual( [] )
  await context.close()
} )

test( 'the ?tune panel exists only on tune URLs', async ( { page } ) =>
{
  await page.goto( '/', { waitUntil: 'load' } )
  await expect( page.locator( '.tune-panel' ) ).toHaveCount( 0 )
  await page.goto( '/?tune', { waitUntil: 'load' } )
  await expect( page.locator( '.tune-panel-row' ) ).toHaveCount( 6 )
} )
