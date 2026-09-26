import test from 'node:test'
import assert from 'node:assert/strict'
import { getBreakSimulation, sampleCinematicBreakState } from '../drafts/poolBreakPhysics.js'
import { RACK_BALL_NUMBERS } from '../drafts/rackLayout.js'
import { BREAK_REST_BALLS, SERVICE_BALLS, toLandscapeCloth, BALL_SHARE_OF_CLOTH_WIDTH } from './breakRest.js'

test( 'the Studio table shows the Draft 1 break exactly where the simulation leaves it', () =>
{
  const state = sampleCinematicBreakState( 1, getBreakSimulation() )
  const expected = state.balls
    .map( ( ball, index ) => ( {
      number: index === 0 ? 0 : RACK_BALL_NUMBERS[ index - 1 ],
      x: ball.position.x,
      z: ball.position.z,
      onTable: ball.visibility && !ball.pocketDepth,
    } ) )
    .filter( ( ball ) => ball.onTable && !SERVICE_BALLS.includes( ball.number ) )

  assert.equal( BREAK_REST_BALLS.length, expected.length )
  expected.forEach( ( ball ) =>
  {
    const stored = BREAK_REST_BALLS.find( ( entry ) => entry.number === ball.number )
    assert.ok( stored, `ball ${ball.number} is stored` )
    assert.ok( Math.abs( stored.x - ball.x ) < 0.002, `ball ${ball.number} x` )
    assert.ok( Math.abs( stored.z - ball.z ) < 0.002, `ball ${ball.number} z` )
  } )
} )

test( 'every resting ball lies fully on the landscape cloth', () =>
{
  const radiusU = BALL_SHARE_OF_CLOTH_WIDTH / 2
  const radiusV = radiusU * 2
  BREAK_REST_BALLS.forEach( ( ball ) =>
  {
    const { u, v } = toLandscapeCloth( ball )
    assert.ok( u - radiusU >= 0 && u + radiusU <= 1, `ball ${ball.number} u ${u}` )
    assert.ok( v - radiusV >= 0 && v + radiusV <= 1, `ball ${ball.number} v ${v}` )
  } )
} )
