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

test( 'Draft 4 (webgl-classic) renders 3D table without blank screen or TypeError', async ( { page } ) =>
{
  const pageErrors = []
  page.on( 'pageerror', ( error ) => pageErrors.push( error.message ) )

  await page.goto( '/?draft=webgl-classic', { waitUntil: 'domcontentloaded' } )
  const draftRoot = page.locator( '.draft-layer-webgl-classic' )
  await expect( draftRoot ).toHaveAttribute( 'data-webgl-error', 'false' )
  await expect( draftRoot ).toHaveAttribute( 'data-webgl-progress', '0.0000' )

  expect( pageErrors ).toEqual( [] )
} )

test( 'Draft 5 (photoreal) renders without missing balls or runtime errors', async ( { page } ) =>
{
  const pageErrors = []
  page.on( 'pageerror', ( error ) => pageErrors.push( error.message ) )

  await page.goto( '/?draft=photoreal', { waitUntil: 'domcontentloaded' } )
  const draftRoot = page.locator( '.draft-layer-photoreal' )
  await expect( draftRoot ).toHaveAttribute( 'data-webgl-error', 'false' )
  await expect( draftRoot ).toHaveAttribute( 'data-webgl-progress', '0.0000' )

  expect( pageErrors ).toEqual( [] )
} )
