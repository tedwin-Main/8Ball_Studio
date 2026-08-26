import test from 'node:test'
import assert from 'node:assert/strict'
import { STORY_TIMING } from '../storyTiming.js'
import {
  getBreakSimulation,
  sampleDraft2BreakState,
  sampleCinematicBreakState,
} from './poolBreakPhysics.js'

test( 'the first cinematic swipe aims the cue without moving the 8-ball', () =>
{
  const simulation = getBreakSimulation()
  const startingBall = sampleCinematicBreakState( 0, simulation ).balls[ 0 ]
  const aimedBall = sampleCinematicBreakState(
    STORY_TIMING.cue.ready,
    simulation,
  ).balls[ 0 ]
  const roundedCheckpointBall = sampleCinematicBreakState(
    STORY_TIMING.cue.ready + 0.001,
    simulation,
  ).balls[ 0 ]

  assert.deepEqual( aimedBall.position, startingBall.position )
  assert.deepEqual( aimedBall.quaternion, startingBall.quaternion )
  assert.deepEqual( roundedCheckpointBall.position, startingBall.position )
} )

test( 'the second cinematic swipe starts the 8-ball moving', () =>
{
  const simulation = getBreakSimulation()
  const aimedBall = sampleCinematicBreakState(
    STORY_TIMING.cue.ready,
    simulation,
  ).balls[ 0 ]
  const movingBall = sampleCinematicBreakState(
    STORY_TIMING.cue.ready + 0.08,
    simulation,
  ).balls[ 0 ]

  assert.notDeepEqual( movingBall.position, aimedBall.position )
} )

test( 'the cinematic timeline keeps the existing exit fade timing', () =>
{
  const simulation = getBreakSimulation()

  assert.equal( sampleCinematicBreakState( STORY_TIMING.intro.draft1.exitStart, simulation ).opacity, 1 )
  assert.equal( sampleCinematicBreakState( STORY_TIMING.intro.draft1.exitEnd, simulation ).opacity, 0 )
} )


test( 'Draft 2 maps the deterministic spread to a short, reversible handoff', () =>
{
  const simulation = getBreakSimulation()
  const readyState = sampleDraft2BreakState( STORY_TIMING.intro.draft2.transitionReady, simulation )
  const milestoneFrame = simulation.frames[ simulation.milestones.transitionReadyFrame ]
  const afterReadyState = sampleDraft2BreakState( STORY_TIMING.intro.draft2.transitionReady + 0.001, simulation )
  const handoffState = sampleDraft2BreakState( STORY_TIMING.intro.draft2.studioHandoff, simulation )

  assert.equal( readyState.phase, 'break' )
  assert.equal( readyState.opacity, 1 )
  assert.deepEqual(
    readyState.balls.map( ( ball ) => ball.position ),
    milestoneFrame.balls.map( ( ball ) => ball.position ),
  )
  assert.equal( afterReadyState.phase, 'exit' )
  assert.ok( afterReadyState.opacity < 1 )
  assert.equal( handoffState.opacity, 0 )
  assert.deepEqual( handoffState.balls, readyState.balls )
} )
