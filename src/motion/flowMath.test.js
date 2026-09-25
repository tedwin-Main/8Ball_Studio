import test from 'node:test'
import assert from 'node:assert/strict'
import { easeThemeMorph, getRunDistance, getRunScrollTarget, liftAt, sectionAt, skewFromVelocity, themeProgressAt } from './flowMath.js'

test( 'the Projects run slides the track by its overflow, never backwards', () =>
{
  assert.equal( getRunDistance( 2400, 1440 ), 960 )
  assert.equal( getRunDistance( 1200.6, 1440 ), 0 )
  assert.equal( getRunDistance( 1440.4, 1440 ), 0 )
  assert.equal( getRunDistance( Number.NaN, 1440 ), 0 )
} )

test( 'a board lifts most at the centre of the run and rests at the edges', () =>
{
  assert.equal( liftAt( 0 ), 0 )
  assert.equal( liftAt( 1 ), 0 )
  assert.equal( liftAt( 0.5 ), 1 )
  assert.ok( liftAt( 0.25 ) > 0 && liftAt( 0.25 ) < 1 )
  // Symmetric either side of the centre, and clamped outside the run.
  assert.ok( Math.abs( liftAt( 0.3 ) - liftAt( 0.7 ) ) < 1e-9 )
  assert.equal( liftAt( -2 ), 0 )
  assert.equal( liftAt( 3 ), 0 )
} )

test( 'keyboard focus scrolls the run until the board sits at the centre', () =>
{
  const base = { sectionTop: 5000, runDistance: 1000, boardWidth: 200, viewportWidth: 1400 }
  // A board already left of centre at the start needs no run.
  assert.equal( getRunScrollTarget( { ...base, boardLeft: 100 } ), 5000 )
  // Halfway along the track.
  assert.equal( getRunScrollTarget( { ...base, boardLeft: 1100 } ), 5500 )
  // Past the end: clamped to the last pinned position.
  assert.equal( getRunScrollTarget( { ...base, boardLeft: 5000 } ), 6000 )
  // No run (the track fits): the section top.
  assert.equal( getRunScrollTarget( { ...base, runDistance: 0, boardLeft: 1100 } ), 5000 )
} )

test( 'the section theme runs 0 → 1 over the handoff, holds through the run, then 1 → 2 over the reveal', () =>
{
  const parts = { handoff: 800, run: 1600, reveal: 800 }
  assert.equal( themeProgressAt( 0, parts ), 0 )
  assert.equal( themeProgressAt( 0.125, parts ), 0.5 )
  assert.equal( themeProgressAt( 0.25, parts ), 1 )
  assert.equal( themeProgressAt( 0.5, parts ), 1 )
  assert.equal( themeProgressAt( 0.75, parts ), 1 )
  assert.equal( themeProgressAt( 0.875, parts ), 1.5 )
  assert.equal( themeProgressAt( 1, parts ), 2 )
  // A run of zero length goes straight from the handoff to the reveal.
  assert.equal( themeProgressAt( 0.5, { handoff: 800, run: 0, reveal: 800 } ), 1 )
  assert.equal( themeProgressAt( 0.5, { handoff: 0, run: 0, reveal: 0 } ), 0 )
} )

test( 'each palette change holds, moves inside its window, then settles', () =>
{
  // Ink → paper: all within the first half of the handoff.
  assert.equal( easeThemeMorph( 0 ), 0 )
  assert.equal( easeThemeMorph( 0.05 ), 0 )
  assert.ok( Math.abs( easeThemeMorph( 0.3 ) - 0.5 ) < 1e-9 )
  assert.equal( easeThemeMorph( 0.6 ), 1 )
  assert.equal( easeThemeMorph( 1 ), 1 )
  // Paper → acid: through the middle of the reveal.
  assert.equal( easeThemeMorph( 1.1 ), 1 )
  assert.ok( Math.abs( easeThemeMorph( 1.45 ) - 1.5 ) < 1e-9 )
  assert.equal( easeThemeMorph( 1.9 ), 2 )
  assert.equal( easeThemeMorph( 2 ), 2 )
  // Monotonic: scrolling on never moves the palette backwards.
  let previous = 0
  for ( let t = 0; t <= 2; t += 0.01 )
  {
    const eased = easeThemeMorph( t )
    assert.ok( eased >= previous - 1e-12, `at ${t}` )
    previous = eased
  }
} )

test( 'the section under a line follows the section starts', () =>
{
  const starts = { projectsStart: 4000, contactStart: 6000 }
  assert.equal( sectionAt( 0, starts ), 'stage' )
  assert.equal( sectionAt( 3999, starts ), 'stage' )
  assert.equal( sectionAt( 4000, starts ), 'projects' )
  assert.equal( sectionAt( 6000, starts ), 'contact' )
} )

test( 'velocity leans the content, clamped both ways, upright without a velocity', () =>
{
  const feel = { gain: 0.35, maxDeg: 4 }
  assert.equal( skewFromVelocity( 0, feel ), 0 )
  assert.equal( skewFromVelocity( 10, feel ), 3.5 )
  assert.equal( skewFromVelocity( 100, feel ), 4 )
  assert.equal( skewFromVelocity( -100, feel ), -4 )
  assert.equal( skewFromVelocity( Number.NaN, feel ), 0 )
  assert.equal( skewFromVelocity( 10, { gain: 0.35, maxDeg: 0 } ), 0 )
} )
