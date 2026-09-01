import { test, expect } from '@playwright/test'

test( 'Draft 1 keeps high-density canvas work within the Draft 2 pixel budget', async ( { browser, baseURL } ) =>
{
  const context = await browser.newContext( {
    viewport: { width: 1280, height: 800 },
    // Retina density is the reported slow path; Draft 1 must not render twice
    // as many pixels as Draft 2 on the same physical viewport.
    deviceScaleFactor: 2,
  } )
  const page = await context.newPage()

  try
  {
    await page.goto( `${baseURL}/?draft=cinematic`, { waitUntil: 'domcontentloaded' } )
    await expect( page.locator( '.story' ) ).toHaveAttribute( 'data-story-navigation-ready', 'true', { timeout: 30_000 } )
    const draft = page.locator( '.draft-layer-2d' )
    const canvas = page.locator( '.pool-pov-balls-canvas' )
    await expect( draft ).toHaveAttribute( 'data-webgl-error', 'false' )
    // The plate marker is written after Three.js applies the real viewport and DPR.
    await expect( canvas ).toHaveAttribute( 'data-plate', 'landscape' )

    const metrics = await canvas.evaluate( ( node ) => ( {
      devicePixelRatio: window.devicePixelRatio,
      backingRatio: node.width / Math.max( 1, node.clientWidth ),
    } ) )

    expect( metrics.devicePixelRatio ).toBe( 2 )
    expect( metrics.backingRatio ).toBeLessThanOrEqual( 1.5 )
  }
  finally
  {
    await context.close()
  }
} )
