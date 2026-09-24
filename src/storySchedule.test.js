import test from 'node:test'
import assert from 'node:assert/strict'
import { getDefaultStoryLayout, getStoryPages, getStudioStartUnits } from './storySchedule.js'
import { STORY_TIMING, toStoryProgress } from './storyTiming.js'

test( 'Story schedule exposes domain Page ids and stable targets', () =>
{
  const pages = getStoryPages( 'cinematic' )
  const { pinnedRange, projectsTop, documentRange } = getDefaultStoryLayout()

  assert.deepEqual( pages.map( ( page ) => page.id ), [ 'intro', 'studio', 'projects', 'contact' ] )
  assert.deepEqual( pages.map( ( page ) => page.label ), [ 'Intro', 'Studio', 'Projects', 'Contact' ] )
  assert.equal( pages[ 0 ].targetProgress, 0 )
  // Studio is lit at timeline unit 1, inside the pinned stage.
  assert.equal( pages[ 1 ].targetProgress, toStoryProgress( 1 ) * pinnedRange / documentRange )
  // Projects and Contact land on their section tops; Contact is the end of the page.
  assert.equal( pages[ 2 ].targetProgress, projectsTop / documentRange )
  assert.equal( pages[ 3 ].targetProgress, 1 )
} )

test( 'Studio holds before the stage releases, and every Page starts after the one before it', () =>
{
  const pages = getStoryPages( 'cinematic' )
  const { pinnedRange, documentRange } = getDefaultStoryLayout()

  // The release hold keeps Studio pinned past its stable mark before Projects can take over.
  assert.ok( pages[ 1 ].targetProgress < pinnedRange / documentRange )
  for ( let i = 1; i < pages.length; i++ )
  {
    assert.ok( pages[ i ].startProgress > pages[ i - 1 ].startProgress, `${pages[ i ].id} starts after ${pages[ i - 1 ].id}` )
    assert.ok( pages[ i ].targetProgress >= pages[ i ].startProgress, `${pages[ i ].id} target follows its start` )
  }
  assert.ok( pages[ 2 ].startProgress > pinnedRange / documentRange, 'Projects starts after the stage releases' )
} )

test( 'Draft 2 gets its measured Studio threshold without moving stable targets', () =>
{
  const cinematicPages = getStoryPages( 'cinematic' )
  const webglPages = getStoryPages( 'webgl' )

  assert.ok( webglPages[ 1 ].startProgress > cinematicPages[ 1 ].startProgress )
  assert.equal( webglPages[ 1 ].targetProgress, cinematicPages[ 1 ].targetProgress )
  assert.equal( getStoryPages( 'original' )[ 1 ].startProgress, cinematicPages[ 1 ].startProgress )
  assert.equal( getStudioStartUnits( 'photoreal' ), STORY_TIMING.pages.draft2StudioStart )
} )

test( 'measured layouts put Projects and Contact on their real section tops', () =>
{
  // 800px viewport, a 2800px pinned stage, and a Contact section taller than one screen.
  const layout = { viewport: 800, pinnedRange: 2800, projectsTop: 3600, contactTop: 4400, documentRange: 4700 }
  const pages = getStoryPages( 'cinematic', layout )

  assert.equal( pages[ 2 ].targetProgress, 3600 / 4700 )
  assert.equal( pages[ 2 ].startProgress, 3200 / 4700 )
  assert.equal( pages[ 3 ].targetProgress, 4400 / 4700 )

  // A short Contact section lands at the end of the page instead of past it.
  const short = getStoryPages( 'cinematic', { ...layout, documentRange: 4300 } )
  assert.equal( short[ 3 ].targetProgress, 1 )
} )

test( 'invalid layouts are rejected', () =>
{
  const layout = getDefaultStoryLayout()
  assert.throws( () => getStoryPages( 'cinematic', { ...layout, documentRange: 0 } ), /documentRange/ )
  assert.throws( () => getStoryPages( 'cinematic', { ...layout, projectsTop: Number.NaN } ), /projectsTop/ )
  assert.throws( () => getStoryPages( 'cinematic', { ...layout, contactTop: layout.projectsTop - 1 } ), /in order/ )
} )

test( 'Story Page records and schedule are immutable', () =>
{
  const pages = getStoryPages()

  assert.equal( Object.isFrozen( pages ), true )
  assert.equal( Object.isFrozen( pages[ 0 ] ), true )
  assert.equal( Object.isFrozen( getDefaultStoryLayout() ), true )
} )
