import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveStoryTiming, STORY_TIMING, toStoryProgress, toTimelineUnits } from './storyTiming.js'

test( 'resolves semantic intro and page milestones in order', () =>
{
  assert.equal( STORY_TIMING.intro.approachEnd, 0.28 )
  assert.equal( STORY_TIMING.intro.impact, STORY_TIMING.intro.approachEnd )
  assert.equal( STORY_TIMING.intro.draft2.transitionReady, 0.5 )
  assert.equal( STORY_TIMING.intro.draft2.exitEnd, 0.9 )
  assert.equal( STORY_TIMING.pages.cinematicStudioStart, 0.5 )
  assert.equal( STORY_TIMING.pages.contactStart, 2.14 )
  assert.equal( STORY_TIMING.pages.projectsFadeDuration, 0.46 )
  assert.equal( STORY_TIMING.pages.contactRevealDuration, 0.56 )
  assert.equal( toTimelineUnits( toStoryProgress( STORY_TIMING.pages.projectsStart ) ), STORY_TIMING.pages.projectsStart )
  assert.ok( STORY_TIMING.pages.draft2StudioStart > STORY_TIMING.pages.studioStart )
  assert.ok( STORY_TIMING.pages.draft2StudioStart < STORY_TIMING.pages.projectsStart )
  assert.ok( STORY_TIMING.pages.projectsTitleEnd <= STORY_TIMING.pages.projectsStable )
  assert.ok( STORY_TIMING.pages.contactItemsEnd <= STORY_TIMING.pages.contactStable )
  assert.ok( STORY_TIMING.intro.visual.titleLineEnd <= 1 )
  assert.ok( STORY_TIMING.pages.projectsStart < STORY_TIMING.pages.contactStart )
  assert.equal( STORY_TIMING.navigation.introToStudioSeconds, 1.2 )
  assert.equal( STORY_TIMING.navigation.studioToIntroSeconds, 1.6 )
  assert.equal( STORY_TIMING.navigation.defaultEdgeSeconds, 1.2 )
  assert.equal( STORY_TIMING.navigation.gestureThresholdPx, 14 )
  assert.equal( STORY_TIMING.navigation.gestureResetMs, 120 )
} )

test( 'changing one duration derives every dependent milestone', () =>
{
  const timing = resolveStoryTiming( {
    intro: { draft2ScatterDuration: 0.1, draft2TransitionDuration: 0.04 },
    navigation: { introToStudioSeconds: 2.0 },
  } )

  assert.equal( timing.navigation.introToStudioSeconds, 2.0 )
  assert.equal( timing.intro.draft2.transitionReady, 0.38 )
  assert.equal( timing.intro.draft2.exitEnd, 0.42 )
  assert.equal( timing.pages.studioStart, 0.38 )

  const laterPageTiming = resolveStoryTiming( { pages: { projectsFadeDuration: 0.22, contactHoldDuration: 0.2, contactItemDuration: 0.1 } } )
  assert.equal( laterPageTiming.pages.projectsFadeDuration, 0.22 )
  assert.ok( Math.abs( laterPageTiming.pages.contactStable - 2.9 ) < 1e-9 )
} )

test( 'rejects invalid duration contracts', () =>
{
  assert.throws(
    () => resolveStoryTiming( { navigation: { introToStudioSeconds: -1 } } ),
    /finite, non-negative/,
  )
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
    () => resolveStoryTiming( { intro: { draft2TransitionDuration: 0 } } ),
    /greater than zero/,
  )
  assert.throws(
    () => resolveStoryTiming( { intro: { approachDuration: 0.1 } } ),
    /before impact/,
  )
  assert.throws(
    () => resolveStoryTiming( { pages: { timelineEndEpsilon: 4 } } ),
    /timelineEndEpsilon/,
  )
  assert.throws(
    () => resolveStoryTiming( { pages: { projectsTitleDelay: 1.2 } } ),
    /Projects content/,
  )
  assert.throws(
    () => resolveStoryTiming( { pages: { contactFadeDuration: 1 } } ),
    /Contact fade/,
  )
} )
