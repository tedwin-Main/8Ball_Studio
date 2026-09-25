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

test( 'the pinned stage is the Intro, the Studio hold, and the handoff screen Projects rises over', () =>
{
  const { pages, scroll } = STORY_TIMING
  assert.equal( pages.studioReleaseHold, 0.17 )
  assert.equal( pages.handoffScreens, 1 )
  // Studio holds alone first; the handoff starts only after that, so Projects never covers a half-lit Studio.
  assert.equal( pages.handoffStart, pages.studioStable + pages.studioReleaseHold )
  assert.equal( pages.releaseEnd, pages.handoffStart + pages.handoffScreens / scroll.viewportsPerUnit )
  assert.equal( STORY_TIMING.totalTimelineUnits, pages.releaseEnd )
  // The Projects and Contact choreography lives in src/motion/flowMotion.js, not on this timeline.
  assert.equal( pages.projectsStart, undefined )
  assert.equal( pages.contactStart, undefined )
  // Half a screen of pinned scroll, give or take a wheel notch.
  const holdScreens = pages.studioReleaseHold * scroll.viewportsPerUnit
  assert.ok( holdScreens > 0.4 && holdScreens < 0.6 )
} )

test( 'scroll weight is the heavy cinematic glide, with a shorter scrub for the sections', () =>
{
  assert.equal( STORY_TIMING.scroll.lerp, 0.05 )
  assert.equal( STORY_TIMING.scroll.wheelMultiplier, 0.8 )
  assert.equal( STORY_TIMING.scroll.scrubSeconds, 1.2 )
  assert.equal( STORY_TIMING.scroll.sectionScrubSeconds, 0.6 )
  assert.ok( STORY_TIMING.scroll.sectionScrubSeconds < STORY_TIMING.scroll.scrubSeconds )
} )

test( 'flow choreography values are resolved, frozen, and validated', () =>
{
  const { flow } = STORY_TIMING
  assert.equal( Object.isFrozen( flow ), true )
  assert.equal( flow.shrinkScale, 0.965 )
  assert.equal( flow.contactRevealOffsetPercent, 25 )
  assert.equal( flow.shrinkLiftPercent, 2 )
  assert.equal( flow.skewMaxDeg, 4 )
  assert.ok( flow.preloaderMaxMs >= flow.preloaderMinMs )
  assert.equal( resolveStoryTiming( { flow: { skewMaxDeg: 6 } } ).flow.skewMaxDeg, 6 )

  assert.throws( () => resolveStoryTiming( { flow: { skewGain: -1 } } ), /finite, non-negative/ )
  assert.throws( () => resolveStoryTiming( { flow: { shrinkDim: 1.5 } } ), /between 0 and 1/ )
  assert.throws( () => resolveStoryTiming( { flow: { preloaderMinMs: 3000 } } ), /preloaderMaxMs/ )
  assert.throws( () => resolveStoryTiming( { pages: { handoffScreens: 2 } } ), /between 0 and 1/ )
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

  // The pinned stage length follows the hold and the handoff; with neither, Studio releases as soon as it is lit.
  const handoffUnits = 1 / STORY_TIMING.scroll.viewportsPerUnit
  const longerHold = resolveStoryTiming( { pages: { studioReleaseHold: 0.3 } } )
  assert.equal( longerHold.totalTimelineUnits, 1.3 + handoffUnits )
  assert.equal( longerHold.pages.timelineEndStart, 1.3 + handoffUnits - longerHold.pages.timelineEndEpsilon )
  assert.equal( resolveStoryTiming( { pages: { studioReleaseHold: 0, handoffScreens: 0 } } ).totalTimelineUnits, 1 )
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
