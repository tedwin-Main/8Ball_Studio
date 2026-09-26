import test from 'node:test'
import assert from 'node:assert/strict'
import { STORY_SETTINGS } from './storyTiming.js'
import { STAGE, easeStoryTransition, easeWeightedProgress, toStoryProgress, toTimelineUnits } from './storyStage.js'

test( 'the settings are six dials, one per kind of feel', () =>
{
  assert.deepEqual( STORY_SETTINGS, { glide: 0.1, wheel: 0.7, weight: 0.4, introSeconds: 3, depth: 1, skew: 4 } )
  assert.equal( Object.isFrozen( STORY_SETTINGS ), true )
} )

test( 'the stage schedule runs the break, lights Studio at 1, holds, then hands off', () =>
{
  const { intro, pages, totalTimelineUnits, viewportsPerUnit } = STAGE
  assert.equal( intro.impact, 0.28 )
  assert.equal( intro.draft1.transitionReady, 0.5 )
  assert.equal( intro.draft2.exitEnd, 0.66 )
  assert.ok( pages.draft2StudioStart > pages.studioStart && pages.draft2StudioStart < pages.studioStable )
  assert.equal( pages.studioStable, 1 )
  assert.ok( pages.handoffStart > pages.studioStable )
  assert.equal( totalTimelineUnits, pages.releaseEnd )
  // The Studio cue spans one screen and ends before Studio is stable.
  assert.ok( Math.abs( intro.studioCue.duration * viewportsPerUnit - 1 ) < 1e-9 )
  assert.ok( intro.draft1.exitStart + intro.studioCue.duration <= pages.studioStable )
} )

test( 'timeline units convert to stage progress and back', () =>
{
  assert.equal( toTimelineUnits( toStoryProgress( 1 ) ), 1 )
  assert.equal( toStoryProgress( STAGE.totalTimelineUnits ), 1 )
} )

test( 'the easings keep their endpoints, and the 8-ball starts slow', () =>
{
  assert.equal( easeStoryTransition( 0 ), 0 )
  assert.equal( easeStoryTransition( 1 ), 1 )
  assert.equal( easeStoryTransition( 0.5 ), 0.5 )
  assert.equal( easeWeightedProgress( 0 ), 0 )
  assert.equal( easeWeightedProgress( 1 ), 1 )
  assert.ok( easeWeightedProgress( 0.25 ) < 0.25 )
  assert.equal( easeWeightedProgress( 0.25, 0 ), 0.25 )
} )
