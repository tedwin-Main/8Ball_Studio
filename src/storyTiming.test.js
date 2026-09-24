import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveStoryTiming, STORY_TIMING, toStoryProgress, toTimelineUnits } from './storyTiming.js'

test( 'resolves semantic intro and page milestones in order', () =>
{
  assert.equal( STORY_TIMING.intro.approachEnd, 0.28 )
  assert.equal( STORY_TIMING.intro.impact, STORY_TIMING.intro.approachEnd )
  assert.equal( STORY_TIMING.intro.draft2.transitionReady, 0.5 )
  assert.equal( STORY_TIMING.intro.draft2.exitEnd, 0.66 )
  assert.equal( STORY_TIMING.pages.cinematicStudioStart, 0.5 )
  assert.equal( STORY_TIMING.pages.studioStable, 1 )
  assert.equal( toTimelineUnits( toStoryProgress( STORY_TIMING.pages.studioStable ) ), STORY_TIMING.pages.studioStable )
  assert.ok( STORY_TIMING.pages.draft2StudioStart > STORY_TIMING.pages.studioStart )
  assert.ok( STORY_TIMING.pages.draft2StudioStart < STORY_TIMING.pages.studioStable )
  assert.ok( STORY_TIMING.intro.visual.titleLineEnd <= 1 )
  assert.equal( STORY_TIMING.navigation.introToStudioSeconds, 3.0 )
  assert.equal( STORY_TIMING.navigation.studioToIntroSeconds, 1.6 )
  assert.equal( STORY_TIMING.navigation.defaultEdgeSeconds, 1.2 )
  assert.equal( STORY_TIMING.navigation.gestureThresholdPx, 14 )
  assert.equal( STORY_TIMING.navigation.gestureResetMs, 120 )
} )

test( 'the pinned stage is the Intro plus the Studio release hold, nothing after it', () =>
{
  // Projects and Contact scroll as normal sections, so the timeline has no Page transitions after Studio.
  assert.equal( STORY_TIMING.pages.studioReleaseHold, 0.17 )
  assert.equal( STORY_TIMING.pages.releaseEnd, 1 + STORY_TIMING.pages.studioReleaseHold )
  assert.equal( STORY_TIMING.totalTimelineUnits, STORY_TIMING.pages.releaseEnd )
  assert.equal( STORY_TIMING.pages.projectsStart, undefined )
  assert.equal( STORY_TIMING.pages.contactStart, undefined )
  // Half a screen of pinned scroll, give or take a wheel notch.
  const holdScreens = STORY_TIMING.pages.studioReleaseHold * STORY_TIMING.scroll.viewportsPerUnit
  assert.ok( holdScreens > 0.4 && holdScreens < 0.6 )
} )

test( 'Studio title reveal finishes before its Stable Page boundary', () =>
{
  assert.ok( STORY_TIMING.intro.visual.titleLineEnd <= STORY_TIMING.pages.studioStable )
  assert.ok( STORY_TIMING.intro.visual.metaStart + STORY_TIMING.intro.visual.metaDuration <= STORY_TIMING.pages.studioStable )
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

  // The pinned stage length follows the hold; a zero hold releases Studio as soon as it is lit.
  const longerHold = resolveStoryTiming( { pages: { studioReleaseHold: 0.3 } } )
  assert.equal( longerHold.totalTimelineUnits, 1.3 )
  assert.equal( longerHold.pages.timelineEndStart, 1.3 - longerHold.pages.timelineEndEpsilon )
  assert.equal( resolveStoryTiming( { pages: { studioReleaseHold: 0 } } ).totalTimelineUnits, 1 )
  // The length is derived; a stale override cannot desynchronize it.
  assert.equal( resolveStoryTiming( { totalTimelineUnits: 3 } ).totalTimelineUnits, STORY_TIMING.totalTimelineUnits )
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
    () => resolveStoryTiming( { pages: { studioReleaseHold: -0.1 } } ),
    /finite, non-negative/,
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
    () => resolveStoryTiming( { intro: { draft2ScatterDuration: 0.6 } } ),
    /Draft 2 Studio threshold|scatter end|transition end/,
  )
} )
