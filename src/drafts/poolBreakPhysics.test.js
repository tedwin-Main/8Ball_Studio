import test from 'node:test'
import assert from 'node:assert/strict'
import { STORY_TIMING } from '../storyTiming.js'
import {
  createBreakSimulation,
  getBreakSimulation,
  sampleBreakState,
  sampleDraft2BreakState,
  sampleCinematicBreakState,
} from './poolBreakPhysics.js'

const interquartileRange = ( values ) =>
{
  const sorted = [ ...values ].sort( ( first, second ) => first - second )
  const quantile = ( fraction ) =>
  {
    const position = ( sorted.length - 1 ) * fraction
    const lower = Math.floor( position )
    const upper = Math.ceil( position )
    return sorted[ lower ] + ( sorted[ upper ] - sorted[ lower ] ) * ( position - lower )
  }
  return quantile( 0.75 ) - quantile( 0.25 )
}

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

test( 'the retuned break scatters asymmetrically off the table centerline', () =>
{
  const simulation = getBreakSimulation()
  const milestoneFrame = simulation.frames[ simulation.milestones.transitionReadyFrame ]
  const rackBalls = milestoneFrame.balls.slice( 1 ).filter( ( ball ) => !ball.pocketed )
  const centroidX = rackBalls.reduce( ( total, ball ) => total + ball.position.x, 0 ) / rackBalls.length

  assert.ok(
    Math.abs( centroidX ) > simulation.config.ball.radius * 1.5,
    `rack centroid x ${centroidX.toFixed( 4 )} should leave the centerline`,
  )
} )

test( 'the retuned break spreads into a pack with depth instead of a flat wall', () =>
{
  const simulation = getBreakSimulation()
  const diameter = simulation.config.ball.radius * 2
  const milestoneFrame = simulation.frames[ simulation.milestones.transitionReadyFrame ]
  const rackBalls = milestoneFrame.balls.slice( 1 ).filter( ( ball ) => !ball.pocketed )
  const horizontal = rackBalls.map( ( ball ) => ball.position.x )
  const vertical = rackBalls.map( ( ball ) => ball.position.z )

  // A flat break degenerates into a band several times wider than it is deep.
  assert.ok(
    interquartileRange( horizontal ) / interquartileRange( vertical ) < 3,
    `spread depth ${interquartileRange( vertical ).toFixed( 4 )} is too thin for width ${interquartileRange( horizontal ).toFixed( 4 )}`,
  )
  // Wider footprint target: vertical interquartile range clears at least 5 ball diameters.
  assert.ok( interquartileRange( vertical ) >= diameter * 5 )
} )

test( 'the retuned break drives at least 2 balls out of the rack zone up-table past mid-table', () =>
{
  const simulation = getBreakSimulation()
  const milestoneFrame = simulation.frames[ simulation.milestones.transitionReadyFrame ]
  const rackBalls = milestoneFrame.balls.slice( 1 ).filter( ( ball ) => !ball.pocketed )
  // Mid-table is z = 0; balls with z > 0 have passed mid-table into the foreground open felt.
  const upTableBalls = rackBalls.filter( ( ball ) => ball.position.z > 0 )

  assert.ok(
    upTableBalls.length >= 2,
    `expected at least 2 rack balls up-table of mid-table, got ${upTableBalls.length}`,
  )
} )

test( 'the retuned break visibly displaces the pack centroid by at least 3 ball diameters', () =>
{
  const simulation = getBreakSimulation()
  const diameter = simulation.config.ball.radius * 2
  const milestoneFrame = simulation.frames[ simulation.milestones.transitionReadyFrame ]
  const rackBalls = milestoneFrame.balls.slice( 1 ).filter( ( ball ) => !ball.pocketed )
  const initialRack = simulation.initial.positions.slice( 1 )
  const initialCentroid = {
    x: initialRack.reduce( ( total, ball ) => total + ball.x, 0 ) / initialRack.length,
    z: initialRack.reduce( ( total, ball ) => total + ball.z, 0 ) / initialRack.length,
  }
  const endCentroid = {
    x: rackBalls.reduce( ( total, ball ) => total + ball.position.x, 0 ) / rackBalls.length,
    z: rackBalls.reduce( ( total, ball ) => total + ball.position.z, 0 ) / rackBalls.length,
  }
  const displacement = Math.hypot( endCentroid.x - initialCentroid.x, endCentroid.z - initialCentroid.z )

  assert.ok(
    displacement >= diameter * 3,
    `centroid displacement ${( displacement / diameter ).toFixed( 2 )} diameters should be at least 3`,
  )
} )

test( 'all non-pocketed balls remain contained inside playfield bounds in every frame', () =>
{
  const simulation = getBreakSimulation()
  const halfWidth = simulation.config.table.width / 2
  const halfLength = simulation.config.table.length / 2

  simulation.frames.forEach( ( frame ) =>
  {
    frame.balls.forEach( ( ball, ballIndex ) =>
    {
      if ( !ball.pocketed )
      {
        assert.ok(
          Math.abs( ball.position.x ) <= halfWidth + 1e-4,
          `ball ${ballIndex} escaped table x bounds at ${frame.time}s: ${ball.position.x}`,
        )
        assert.ok(
          Math.abs( ball.position.z ) <= halfLength + 1e-4,
          `ball ${ballIndex} escaped table z bounds at ${frame.time}s: ${ball.position.z}`,
        )
      }
      else if ( ball.pocketIndex >= 0 )
      {
        const pocket = simulation.table.pockets[ ball.pocketIndex ]
        const distanceToPocket = Math.hypot(
          ball.position.x - pocket.x,
          ball.position.z - pocket.z,
        )
        assert.ok(
          distanceToPocket <= pocket.radius * 2,
          `pocketed ball ${ballIndex} drifted out of pocket radius: ${distanceToPocket}`,
        )
      }
    } )
  } )
} )

test( 'the retuned break gives the striker cue-ball contact instead of a plow-through mass', () =>
{
  const simulation = getBreakSimulation()

  // Equal mass is the physical precondition for cue-ball deflection; x/y spread depends on it.
  assert.equal( simulation.config.striker.massMultiplier, 1 )
  assert.ok(
    !simulation.frames[ simulation.milestones.transitionReadyFrame ].balls[ 0 ].pocketed,
    'the striker should still be on the table when the spread settles',
  )
  assert.ok(
    !simulation.frames.some( ( frame ) => frame.balls[ 0 ].pocketed ),
    'the striker should never be pocketed throughout the simulation',
  )
} )

test( 'the retuned break mixes fast movers with slow movers', () =>
{
  const simulation = getBreakSimulation()
  const postImpactFrame = simulation.frames[ Math.round( 0.4 / simulation.config.timestep ) ]
  const speeds = postImpactFrame.balls
    .filter( ( ball ) => !ball.pocketed )
    .map( ( ball ) => Math.hypot( ball.velocity.x, ball.velocity.z ) )
  const maximum = Math.max( ...speeds )
  const minimum = Math.min( ...speeds )

  assert.ok( maximum > 1.5, `fastest ball speed ${maximum.toFixed( 3 )} should exceed 1.5 m/s` )
  assert.ok(
    minimum < maximum * 0.4,
    `slowest ball speed ${minimum.toFixed( 3 )} should lag well behind the fastest ${maximum.toFixed( 3 )}`,
  )
} )

test( 'the retuned break reaches the cushions and rebounds', () =>
{
  const simulation = getBreakSimulation()

  // Cushion impacts meet or exceed the previously shipped break count of 15.
  assert.ok( simulation.diagnostics.cushionImpacts >= 15 )
} )

test( 'the retuned break reaches its spread milestone naturally inside the time window', () =>
{
  const simulation = getBreakSimulation()
  const { milestones } = simulation

  assert.equal( milestones.naturalMilestone, true )
  assert.ok(
    milestones.transitionReadyTime >= simulation.config.milestone.minimumTime
    && milestones.transitionReadyTime <= simulation.config.milestone.maximumTime,
  )
  assert.ok( milestones.ballsOutsideRack >= simulation.config.milestone.ballsOutsideRack )
  assert.ok( milestones.rmsBallDiameters >= simulation.config.milestone.rmsBallDiameters )
} )

test( 'rack seating variance stays deterministic and keeps the apex anchor exact', () =>
{
  const simulation = getBreakSimulation()
  const apex = simulation.frames[ 0 ].balls[ 1 ].position

  assert.equal( apex.x, simulation.config.rack.apexX )
  assert.equal( apex.z, simulation.config.rack.apexZ )

  const seeded = createBreakSimulation( { rack: { gapJitter: 0.0003 } } )
  assert.deepEqual( seeded.frames[ 0 ].balls.map( ( ball ) => ball.position ), simulation.frames[ 0 ].balls.map( ( ball ) => ball.position ) )

  const perfectlySeated = createBreakSimulation( { rack: { gapJitter: 0 } } )
  const secondRow = perfectlySeated.frames[ 0 ].balls.slice( 2, 4 ).map( ( ball ) => ball.position.x )
  const expectedSpacing = perfectlySeated.config.ball.radius * 2 + perfectlySeated.config.rack.gap

  // Without seating variance the rack is exactly symmetric, so the tuned look stays opt-out.
  assert.ok( Math.abs( secondRow[ 0 ] + secondRow[ 1 ] ) < 1e-12 )
  assert.ok( Math.abs( secondRow[ 1 ] - secondRow[ 0 ] - expectedSpacing ) < 1e-9 )
} )

test( 'the default break simulation is fully deterministic', () =>
{
  const first = JSON.stringify( createBreakSimulation() )
  const second = JSON.stringify( createBreakSimulation() )

  assert.equal( first, second )
} )

test( 'the retuned break leaves the solver healthy', () =>
{
  const simulation = getBreakSimulation()
  const { diagnostics } = simulation

  assert.ok( diagnostics.unresolvedOverlap <= 1e-6, `unresolved overlap ${diagnostics.unresolvedOverlap}` )
  assert.ok( diagnostics.maxEnergyCorrection <= 1e-6, `energy correction ${diagnostics.maxEnergyCorrection}` )
} )
