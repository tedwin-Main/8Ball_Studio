import test from 'node:test'
import assert from 'node:assert/strict'
import { createLayoutResizeFilter } from './viewportResize.js'

const fakeWindow = ( width, height, coarse ) => ( {
  innerWidth: width,
  innerHeight: height,
  matchMedia: () => ( { matches: coarse } ),
} )

test( 'on touch screens an address-bar slide is not a layout resize; rotation is', () =>
{
  const win = fakeWindow( 390, 664, true )
  const isLayoutResize = createLayoutResizeFilter( win )
  win.innerHeight = 750
  assert.equal( isLayoutResize(), false )
  win.innerHeight = 664
  assert.equal( isLayoutResize(), false )
  win.innerWidth = 844
  win.innerHeight = 390
  assert.equal( isLayoutResize(), true )
} )

test( 'with a mouse every resize is a layout resize', () =>
{
  const win = fakeWindow( 1440, 900, false )
  const isLayoutResize = createLayoutResizeFilter( win )
  win.innerHeight = 860
  assert.equal( isLayoutResize(), true )
} )
