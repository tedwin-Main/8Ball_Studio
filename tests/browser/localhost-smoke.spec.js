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
