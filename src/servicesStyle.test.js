import test from 'node:test'
import assert from 'node:assert/strict'
import { SERVICES_STYLES, flatDrumActive, flatDrumRow, normalizeServicesStyle } from './servicesStyle.js'

test( 'the accordion is the default; ?tune offers it and the two flat drums', () =>
{
  assert.deepEqual( Object.keys( SERVICES_STYLES ), [ 'accordion', 'drum-media', 'drum-cards' ] )
  assert.equal( normalizeServicesStyle( undefined ), 'accordion' )
  assert.equal( normalizeServicesStyle( 'panels' ), 'accordion' )
  assert.equal( normalizeServicesStyle( 'drum-cards' ), 'drum-cards' )
} )

test( 'flat drum rows slide by whole rows and fade with distance from the centre', () =>
{
  assert.deepEqual( flatDrumRow( 0, { rowPx: 100, visible: 2 } ), { y: 0, opacity: 1 } )
  assert.deepEqual( flatDrumRow( -1, { rowPx: 100, visible: 2 } ), { y: -100, opacity: 0.5 } )
  assert.deepEqual( flatDrumRow( 3, { rowPx: 100, visible: 2 } ), { y: 300, opacity: 0 } )
} )

test( 'the active row follows the scroll and stays in range', () =>
{
  assert.equal( flatDrumActive( 0, 6 ), 0 )
  assert.equal( flatDrumActive( 0.5, 6 ), 3 )
  assert.equal( flatDrumActive( 1, 6 ), 5 )
  assert.equal( flatDrumActive( 1.4, 6 ), 5 )
  assert.equal( flatDrumActive( -0.2, 6 ), 0 )
} )
