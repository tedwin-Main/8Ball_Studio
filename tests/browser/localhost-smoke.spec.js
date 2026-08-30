import { test, expect } from '@playwright/test'

test( 'localhost mounts the Story without a blank root or page errors', async ( { page } ) =>
{
  const pageErrors = []
  page.on( 'pageerror', ( error ) => pageErrors.push( error.message ) )

  await page.goto( '/', { waitUntil: 'networkidle' } )
  await expect( page.locator( '.experience' ) ).toBeVisible()
  await expect( page.getByRole( 'heading', { name: 'Roll with us.' } ) ).toBeVisible()

  expect( pageErrors ).toEqual( [] )
} )
