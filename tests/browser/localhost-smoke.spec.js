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

test( 'retired Drafts 02 and 03 fall back to 01 (3D POV) and render without runtime errors', async ( { page } ) =>
{
  const pageErrors = []
  page.on( 'pageerror', ( error ) => pageErrors.push( error.message ) )

  for ( const draft of [ 'photoreal', 'original' ] )
  {
    await page.goto( `/?draft=${draft}`, { waitUntil: 'domcontentloaded' } )
    await expect( page.locator( '.experience' ) ).toHaveClass( /draft-cinematic/ )
    await expect( page.locator( '.draft-layer-2d' ) ).toHaveClass( /is-active/ )
  }

  expect( pageErrors ).toEqual( [] )
} )

// ---- Fluid scroll and looks (DOCS/SPEC_FLUID_SCROLL_AND_LOOKS.md) ----

const waitForPreloader = ( page ) => page.waitForSelector( '.preloader', { state: 'detached', timeout: 10_000 } )
const sectionTop = ( page, selector ) =>
  page.evaluate( ( target ) => Math.round( document.querySelector( target ).getBoundingClientRect().top ), selector )

test( 'Main is the default look; the ?tune panel holds one Design list', async ( { page } ) =>
{
  await page.goto( '/', { waitUntil: 'domcontentloaded' } )
  await expect( page.locator( '.experience' ) ).toHaveAttribute( 'data-look', 'acid' )
  // Visitors see one site: no tune panel.
  await expect( page.locator( '.tune-panel' ) ).toHaveCount( 0 )
  await page.goto( '/?tune', { waitUntil: 'domcontentloaded' } )
  await expect( page.locator( '.tune-panel-choice' ) ).toHaveCount( 1 )
  await expect( page.locator( '.tune-panel-choice option' ) ).toHaveText( [
    'Studio2', 'Main · Panels', 'Main · Drum names + media', 'Main · Drum names', 'Main · Drum cards',
  ] )
  // Retired looks fall back to Main instead of rendering unstyled.
  for ( const look of [ 'downlight', 'cyc', 'espresso' ] )
  {
    await page.goto( `/?look=${look}`, { waitUntil: 'domcontentloaded' } )
    await expect( page.locator( '.experience' ) ).toHaveAttribute( 'data-look', 'acid' )
  }
} )

test( 'Projects runs its boards sideways and the header links land on each section', async ( { page } ) =>
{
  const pageErrors = []
  page.on( 'pageerror', ( error ) => pageErrors.push( error.message ) )
  await page.setViewportSize( { width: 1440, height: 900 } )
  await page.goto( '/', { waitUntil: 'load' } )
  await waitForPreloader( page )

  // Services is pulled over the stage's last screen: its top is exactly where the stage releases,
  // and Projects starts where Services ends.
  const layout = await page.evaluate( () =>
  {
    const story = document.querySelector( '.story' )
    const services = document.querySelector( '#services' )
    const projects = document.querySelector( '#projects' )
    return {
      pinnedRange: story.offsetHeight - window.innerHeight,
      servicesTop: Math.round( services.getBoundingClientRect().top + window.scrollY ),
      servicesBottom: Math.round( services.getBoundingClientRect().bottom + window.scrollY ),
      projectsTop: Math.round( projects.getBoundingClientRect().top + window.scrollY ),
      runDistance: parseFloat( projects.style.getPropertyValue( '--run-distance' ) ),
    }
  } )
  expect( Math.abs( layout.servicesTop - layout.pinnedRange ) ).toBeLessThanOrEqual( 1 )
  expect( Math.abs( layout.projectsTop - layout.servicesBottom ) ).toBeLessThanOrEqual( 1 )
  expect( layout.runDistance ).toBeGreaterThan( 0 )

  await page.getByRole( 'link', { name: 'Our Services' } ).click()
  await expect.poll( () => sectionTop( page, '#services' ), { timeout: 8_000 } ).toBe( 0 )

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
  // The header and the browser chrome follow the section: Contact is full acid in Main.
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
  await expect( page.locator( '.tune-panel-choice' ) ).toHaveCount( 1 )
} )
