import test from 'node:test'
import assert from 'node:assert/strict'
import {
  STORY_TIMING,
  easeCinematicBreakTransition,
  easeWeightedProgress,
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

test( 'easeWeightedProgress lets the intro ball weight be edited without changing endpoints', () =>
{
  assert.equal( easeWeightedProgress( 0.25, 0 ), 0.25 )
  assert.equal( easeWeightedProgress( 0, STORY_TIMING.scroll.introWeight ), 0 )
  assert.equal( easeWeightedProgress( 1, STORY_TIMING.scroll.introWeight ), 1 )
  assert.ok( easeWeightedProgress( 0.25, STORY_TIMING.scroll.introWeight ) < 0.25 )
} )

test( 'navigation timings are positive and non-zero', () =>
{
  assert.ok( STORY_TIMING.navigation.introToStudioSeconds > 0 )
  assert.ok( STORY_TIMING.navigation.studioToIntroSeconds > 0 )
  assert.ok( STORY_TIMING.navigation.defaultEdgeSeconds > 0 )
  assert.ok( STORY_TIMING.navigation.gestureThresholdPx > 0 )
  assert.ok( STORY_TIMING.navigation.gestureResetMs > 0 )
} )

test( 'Intro-to-Studio uses the same duration as standard page transitions', () =>
{
  assert.equal(
    STORY_TIMING.navigation.introToStudioSeconds,
    STORY_TIMING.navigation.defaultEdgeSeconds,
  )
} )
