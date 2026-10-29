// Tests Services style selection, flat drum math, and URL draft registry.
import test from 'node:test'
import assert from 'node:assert/strict'
import { SERVICES_STYLES, flatDrumActive, flatDrumRow, normalizeDraft, normalizeServicesStyle, readDrafts } from './services-style.js'

test( 'the index is the default; ?tune offers it, the accordion and the two flat drums', () =>
{
  assert.deepEqual( Object.keys( SERVICES_STYLES ), [ 'accordion', 'drum-media', 'drum-cards', 'index' ] )
  assert.equal( normalizeServicesStyle( undefined ), 'index' )
  assert.equal( normalizeServicesStyle( 'panels' ), 'index' )
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

test( 'the draft registry reads every section from the URL and falls back per section', () =>
{
  assert.deepEqual( readDrafts( '?services=drum-media&nav=bogus' ), { services: 'drum-media', nav: 'rail', manifesto: 'chalk', footer: 'grid', theme: 'lime' } )
  assert.deepEqual( readDrafts( '' ), { services: 'index', nav: 'rail', manifesto: 'chalk', footer: 'grid', theme: 'lime' } )
  assert.equal( normalizeDraft( 'nav', 'center' ), 'center' )
  assert.equal( normalizeDraft( 'theme', 'noir' ), 'noir' )
  assert.equal( normalizeDraft( 'theme', 'neon' ), 'lime' )
} )
