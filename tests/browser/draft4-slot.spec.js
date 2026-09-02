import { test, expect } from '@playwright/test'

test( 'Draft 4 preserves the latest Draft 1 treatment and switches cleanly', async ( { page, baseURL } ) =>
{
  await page.goto( `${baseURL}/?draft=draft4`, { waitUntil: 'domcontentloaded' } )

  const main = page.locator( 'main.experience' )
  await expect( main ).toHaveAttribute( 'data-active-draft', 'draft4' )
  await expect( page.getByRole( 'button', { name: '04 3D POV' } ) ).toHaveAttribute( 'aria-pressed', 'true' )
  await expect( page.locator( '.draft-layer.is-active' ) ).toHaveCount( 1 )

  // Switching changes only the diagnostic query and keeps one renderer active.
  await page.getByRole( 'button', { name: '01 3D POV' } ).click()
  await expect( page ).toHaveURL( /[?&]draft=cinematic(?:&|$)/ )
  await expect( main ).toHaveAttribute( 'data-active-draft', 'cinematic' )
  await expect( page.locator( '.draft-layer.is-active' ) ).toHaveCount( 1 )
} )
