import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveStoryTiming, STORY_TIMING, toStoryProgress, toTimelineUnits } from './storyTiming.js'

test( 'resolves semantic intro and page milestones in order', () =>
{
  assert.equal( STORY_TIMING.intro.approachEnd, 0.52 )
  assert.equal( STORY_TIMING.intro.impact, STORY_TIMING.intro.approachEnd )
  assert.equal( STORY_TIMING.intro.draft2.transitionReady, 0.68 )
  assert.equal( STORY_TIMING.intro.draft2.exitEnd, 0.74 )
  assert.equal( STORY_TIMING.pages.cinematicStudioStart, 0.76 )
  assert.equal( STORY_TIMING.pages.contactStart, 2.14 )
  assert.equal( STORY_TIMING.pages.projectsFadeDuration, 0.46 )
  assert.equal( STORY_TIMING.pages.contactRevealDuration, 0.56 )
  assert.equal( toTimelineUnits( toStoryProgress( STORY_TIMING.pages.projectsStart ) ), STORY_TIMING.pages.projectsStart )
  assert.ok( STORY_TIMING.pages.studioStart < STORY_TIMING.pages.projectsStart )
  assert.ok( STORY_TIMING.pages.projectsStart < STORY_TIMING.pages.contactStart )
} )

test( 'changing one duration derives every dependent milestone', () =>
{
  const timing = resolveStoryTiming( {
    intro: { draft2ScatterDuration: 0.1, draft2TransitionDuration: 0.04 },
  } )

  assert.equal( timing.intro.draft2.transitionReady, 0.62 )
  assert.equal( timing.intro.draft2.exitEnd, 0.66 )
  assert.equal( timing.pages.studioStart, 0.62 )

  const laterPageTiming = resolveStoryTiming( { pages: { projectsFadeDuration: 0.22 } } )
  assert.equal( laterPageTiming.pages.projectsFadeDuration, 0.22 )
} )

test( 'rejects invalid duration contracts', () =>
{
  assert.throws(
    () => resolveStoryTiming( { intro: { draft2ScatterDuration: -0.1 } } ),
    /finite, non-negative/,
  )
  assert.throws(
    () => resolveStoryTiming( { intro: { draft2TransitionDuration: Number.NaN } } ),
    /finite, non-negative/,
  )
  assert.throws(
    () => resolveStoryTiming( { totalTimelineUnits: 0 } ),
    /greater than zero/,
  )
  assert.throws(
    () => resolveStoryTiming( { intro: { draft2PocketCutLead: 0.8 } } ),
    /pocket cut/,
  )
  assert.throws(
    () => resolveStoryTiming( { intro: { approachDuration: 0.1 } } ),
    /before impact/,
  )
  assert.throws(
    () => resolveStoryTiming( { pages: { timelineEndEpsilon: 4 } } ),
    /timelineEndEpsilon/,
  )
} )
