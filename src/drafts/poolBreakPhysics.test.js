import test from 'node:test'
import assert from 'node:assert/strict'
import { STORY_TIMING } from '../storyTiming.js'
import {
  getBreakSimulation,
  sampleBreakState,
  sampleDraft2BreakState,
  sampleCinematicBreakState,
} from './poolBreakPhysics.js'

test( 'sampleCinematicBreakState (Draft 1) rolls 8-ball forward immediately on first swipe and scatters rack', () =>
{
  const simulation = getBreakSimulation()
  const startingBall = sampleCinematicBreakState( 0, simulation ).balls[ 0 ]
  const movingBall = sampleCinematicBreakState( 0.15, simulation ).balls[ 0 ]
  const scatterState = sampleCinematicBreakState( 0.55, simulation )

  assert.ok( movingBall.position.z < startingBall.position.z )

  // Rack balls have separated and scattered
  const initialApex = simulation.frames[ 0 ].balls[ 1 ].position
  const scatteredApex = scatterState.balls[ 1 ].position
  assert.notDeepEqual( scatteredApex, initialApex )
} )

test( 'the intro 8-ball approach carries weight before impact', () =>
{
  const simulation = getBreakSimulation()
  const approachEnd = STORY_TIMING.intro.approachEnd
  const start = sampleCinematicBreakState( 0, simulation ).balls[ 0 ].position
  const impact = sampleCinematicBreakState( approachEnd, simulation ).balls[ 0 ].position
  const earlyProgress = approachEnd * 0.25
  const early = sampleCinematicBreakState( earlyProgress, simulation ).balls[ 0 ].position
  const linearFraction = 0.25
  const actualFraction = ( start.z - early.z ) / ( start.z - impact.z )

  // A weighted curve holds the ball back at the start of a light swipe.
  assert.ok( actualFraction < linearFraction )
  assert.ok( Math.abs( impact.z - simulation.initial.strikerImpact.z ) < 1e-12 )
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

test( 'sampleBreakState (Draft 2) rolls 8-ball forward immediately on first swipe and scatters rack', () =>
{
  const simulation = getBreakSimulation()
  const startBall = sampleBreakState( 0, simulation ).balls[ 0 ]
  const rollingBall = sampleBreakState( 0.15, simulation ).balls[ 0 ]
  const scatterState = sampleBreakState( 0.45, simulation )

  // 8-ball rolls forward immediately upon first scroll swipe
  assert.ok( rollingBall.position.z < startBall.position.z )

  // Rack balls scatter after 8-ball collision
  const initialApex = simulation.frames[ 0 ].balls[ 1 ].position
  const scatteredApex = scatterState.balls[ 1 ].position
  assert.notDeepEqual( scatteredApex, initialApex )
} )
