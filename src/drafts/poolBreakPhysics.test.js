import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getBreakSimulation,
  sampleBreakState,
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

test( 'the cinematic timeline uses the configured exit fade timing', () =>
{
  const simulation = getBreakSimulation()

  assert.equal( sampleCinematicBreakState( 0.5, simulation ).opacity, 1 )
  assert.equal( sampleCinematicBreakState( 0.9, simulation ).opacity, 0 )
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
