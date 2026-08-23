import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CINEMATIC_CUE_READY_PROGRESS,
  getBreakSimulation,
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
