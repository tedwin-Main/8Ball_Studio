import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CINEMATIC_CUE_READY_PROGRESS,
  DRAFT2_TIMING_CONTRACT,
  getBreakSimulation,
  sampleDraft2BreakState,
  sampleCinematicBreakState,
} from './poolBreakPhysics.js'

test( 'the first cinematic swipe aims the cue without moving the 8-ball', () =>
{
  const simulation = getBreakSimulation()
  const startingBall = sampleCinematicBreakState( 0, simulation ).balls[ 0 ]
  const aimedBall = sampleCinematicBreakState(
    CINEMATIC_CUE_READY_PROGRESS,
    simulation,
  ).balls[ 0 ]
  const roundedCheckpointBall = sampleCinematicBreakState(
    CINEMATIC_CUE_READY_PROGRESS + 0.001,
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
    CINEMATIC_CUE_READY_PROGRESS,
    simulation,
  ).balls[ 0 ]
  const movingBall = sampleCinematicBreakState(
    CINEMATIC_CUE_READY_PROGRESS + 0.08,
    simulation,
  ).balls[ 0 ]

  assert.notDeepEqual( movingBall.position, aimedBall.position )
} )

test( 'the cinematic timeline keeps the existing exit fade timing', () =>
{
  const simulation = getBreakSimulation()

  assert.equal( sampleCinematicBreakState( 0.76, simulation ).opacity, 1 )
  assert.equal( sampleCinematicBreakState( 0.9, simulation ).opacity, 0 )
} )


test( 'Draft 2 maps the deterministic spread to a short, reversible handoff', () =>
{
  const simulation = getBreakSimulation()
  const readyState = sampleDraft2BreakState( DRAFT2_TIMING_CONTRACT.transitionReady, simulation )
  const milestoneFrame = simulation.frames[ simulation.milestones.transitionReadyFrame ]
  const afterReadyState = sampleDraft2BreakState( DRAFT2_TIMING_CONTRACT.transitionReady + 0.001, simulation )
  const handoffState = sampleDraft2BreakState( DRAFT2_TIMING_CONTRACT.studioHandoff, simulation )

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
