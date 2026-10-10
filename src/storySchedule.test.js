import test from 'node:test'
import assert from 'node:assert/strict'
import { getDefaultStoryLayout, getStoryPages, getStudioStartUnits } from './storySchedule.js'
import { STAGE, toStoryProgress } from './storyStage.js'

test( 'Story schedule exposes domain Page ids and stable targets', () =>
{
  const pages = getStoryPages()
  const { pinnedRange, servicesTop, projectsTop, documentRange } = getDefaultStoryLayout()

  assert.deepEqual( pages.map( ( page ) => page.id ), [ 'intro', 'studio', 'services', 'projects', 'contact' ] )
  assert.deepEqual( pages.map( ( page ) => page.label ), [ 'Intro', 'Studio', 'Services', 'Projects', 'Contact' ] )
  assert.equal( pages[ 0 ].targetProgress, 0 )
  // Studio is lit at timeline unit 1, inside the pinned stage.
  assert.equal( pages[ 1 ].targetProgress, toStoryProgress( 1 ) * pinnedRange / documentRange )
  // Services, Projects and Contact land on their section tops; Contact is the end of the page.
  assert.equal( pages[ 2 ].targetProgress, servicesTop / documentRange )
  assert.equal( pages[ 3 ].targetProgress, projectsTop / documentRange )
  assert.equal( pages[ 4 ].targetProgress, 1 )
} )

test( 'Studio holds before the stage releases, and every Page starts after the one before it', () =>
{
  const pages = getStoryPages()
  const { pinnedRange, documentRange } = getDefaultStoryLayout()

  // The release hold keeps Studio pinned past its stable mark before Services can take over.
  assert.ok( pages[ 1 ].targetProgress < pinnedRange / documentRange )
  for ( let i = 1; i < pages.length; i++ )
  {
    assert.ok( pages[ i ].startProgress > pages[ i - 1 ].startProgress, `${pages[ i ].id} starts after ${pages[ i - 1 ].id}` )
    assert.ok( pages[ i ].targetProgress >= pages[ i ].startProgress, `${pages[ i ].id} target follows its start` )
  }
  // Services rises over the held Studio: it becomes the Page once it covers the lower half of the
  // screen, inside the handoff, and its target is exactly where the stage releases.
  assert.ok( pages[ 2 ].startProgress > pages[ 1 ].targetProgress, 'Services starts after Studio is stable' )
  assert.ok( pages[ 2 ].startProgress < pinnedRange / documentRange, 'Services starts during the handoff' )
  assert.equal( pages[ 2 ].targetProgress, pinnedRange / documentRange )
} )

test( 'the handoff overlap is a valid layout: Services may start exactly where the stage releases', () =>
{
  const layout = { viewport: 800, pinnedRange: 3600, servicesTop: 3600, projectsTop: 4400, contactTop: 6400, documentRange: 6400 }
  const pages = getStoryPages( layout )
  assert.equal( pages[ 2 ].startProgress, 3200 / 6400 )
  assert.equal( pages[ 2 ].targetProgress, 3600 / 6400 )
  assert.equal( pages[ 3 ].targetProgress, 4400 / 6400 )
  assert.equal( pages[ 4 ].targetProgress, 1 )
  // Services cannot start before the stage's last screen begins, and Projects cannot precede it.
  assert.throws( () => getStoryPages( { ...layout, servicesTop: 3599 } ), /in order/ )
  assert.throws( () => getStoryPages( { ...layout, projectsTop: 3599 } ), /in order/ )
} )

test( 'measured layouts put Services, Projects and Contact on their real section tops', () =>
{
  // 800px viewport, a 2800px pinned stage, and a Contact section taller than one screen.
  const layout = { viewport: 800, pinnedRange: 2800, servicesTop: 2800, projectsTop: 3600, contactTop: 4400, documentRange: 4700 }
  const pages = getStoryPages( layout )

  assert.equal( pages[ 2 ].targetProgress, 2800 / 4700 )
  assert.equal( pages[ 3 ].targetProgress, 3600 / 4700 )
  assert.equal( pages[ 3 ].startProgress, 3200 / 4700 )
  assert.equal( pages[ 4 ].targetProgress, 4400 / 4700 )

  // A short Contact section lands at the end of the page instead of past it.
  const short = getStoryPages( { ...layout, documentRange: 4300 } )
  assert.equal( short[ 4 ].targetProgress, 1 )
} )

test( 'invalid layouts are rejected', () =>
{
  const layout = getDefaultStoryLayout()
  assert.throws( () => getStoryPages( { ...layout, documentRange: 0 } ), /documentRange/ )
  assert.throws( () => getStoryPages( { ...layout, projectsTop: Number.NaN } ), /projectsTop/ )
  assert.throws( () => getStoryPages( { ...layout, servicesTop: Number.NaN } ), /servicesTop/ )
  assert.throws( () => getStoryPages( { ...layout, contactTop: layout.projectsTop - 1 } ), /in order/ )
} )

test( 'Story Page records and schedule are immutable', () =>
{
  const pages = getStoryPages()

  assert.equal( Object.isFrozen( pages ), true )
  assert.equal( Object.isFrozen( pages[ 0 ] ), true )
  assert.equal( Object.isFrozen( getDefaultStoryLayout() ), true )
} )
