import test from 'node:test'
import assert from 'node:assert/strict'
import {
  STORY_TIMING,
  easeCinematicBreakTransition,
  easeStoryTransition,
} from '../storyTiming.js'

test( 'easeCinematicBreakTransition produces smooth normalized curve', () =>
{
  assert.equal( easeCinematicBreakTransition( 0 ), 0 )
  assert.equal( easeCinematicBreakTransition( 1 ), 1 )
  assert.equal( easeCinematicBreakTransition( 0.5 ), 0.5 )
  assert.ok( easeCinematicBreakTransition( 0.25 ) < 0.25 )
  assert.ok( easeCinematicBreakTransition( 0.75 ) > 0.75 )
} )

test( 'easeStoryTransition produces smooth normalized curve', () =>
{
  assert.equal( easeStoryTransition( 0 ), 0 )
  assert.equal( easeStoryTransition( 1 ), 1 )
  assert.equal( easeStoryTransition( 0.5 ), 0.5 )
} )

test( 'navigation timings are positive and non-zero', () =>
{
  assert.ok( STORY_TIMING.navigation.introToStudioSeconds > 0 )
  assert.ok( STORY_TIMING.navigation.studioToIntroSeconds > 0 )
  assert.ok( STORY_TIMING.navigation.defaultEdgeSeconds > 0 )
  assert.ok( STORY_TIMING.navigation.gestureThresholdPx > 0 )
  assert.ok( STORY_TIMING.navigation.gestureResetMs > 0 )
} )

test( 'Intro-to-Studio has longer duration than standard page transitions', () =>
{
  assert.ok(
    STORY_TIMING.navigation.introToStudioSeconds > STORY_TIMING.navigation.defaultEdgeSeconds,
    'Cinematic pool break requires longer duration for readability',
  )
} )
