import test from 'node:test'
import assert from 'node:assert/strict'
import { getStoryPages } from './storySchedule.js'

test( 'Story schedule exposes domain Page ids and stable targets', () =>
{
  const pages = getStoryPages( 'cinematic' )

  assert.deepEqual( pages.map( ( page ) => page.id ), [ 'intro', 'studio', 'projects', 'contact' ] )
  assert.deepEqual( pages.map( ( page ) => page.label ), [ 'Intro', 'Studio', 'Projects', 'Contact' ] )
  assert.equal( pages[ 0 ].targetProgress, 0 )
  assert.equal( pages[ 1 ].targetProgress, 1 / 3 )
  assert.equal( pages[ 2 ].targetProgress, 2 / 3 )
  assert.equal( pages[ 3 ].targetProgress, 1 )
} )

test( 'Draft 2 gets its measured Studio threshold without moving stable targets', () =>
{
  const cinematicPages = getStoryPages( 'cinematic' )
  const webglPages = getStoryPages( 'webgl' )

  assert.ok( webglPages[ 1 ].startProgress > cinematicPages[ 1 ].startProgress )
  assert.equal( webglPages[ 1 ].targetProgress, cinematicPages[ 1 ].targetProgress )
  assert.equal( getStoryPages( 'original' )[ 1 ].startProgress, cinematicPages[ 1 ].startProgress )
} )

test( 'Story Page records and schedule are immutable', () =>
{
  const pages = getStoryPages()

  assert.equal( Object.isFrozen( pages ), true )
  assert.equal( Object.isFrozen( pages[ 0 ] ), true )
} )
