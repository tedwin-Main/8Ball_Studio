// Pure helpers for the section choreography after the pinned stage (src/motion/flowMotion.js).
// They hold the arithmetic that has to be right on every screen size, apart from the DOM, so it
// can be unit-tested with node --test.

const clamp01 = ( value ) => Math.min( 1, Math.max( 0, Number.isFinite( value ) ? value : 0 ) )

// Distance the Projects track slides sideways: its full width minus the width it is seen through.
// Whole pixels, never negative (a track narrower than the screen simply does not run).
export function getRunDistance ( trackWidth, viewportWidth )
{
  if ( !Number.isFinite( trackWidth ) || !Number.isFinite( viewportWidth ) ) return 0
  return Math.max( 0, Math.round( trackWidth - viewportWidth ) )
}

// How far a board is lifted as it crosses the run: 0 at the screen edges, 1 at the centre, eased
// (smoothstep) so the lift starts and settles softly instead of peaking in a hard corner.
export function liftAt ( progress )
{
  const distanceFromEdge = 1 - Math.abs( clamp01( progress ) * 2 - 1 )
  return distanceFromEdge * distanceFromEdge * ( 3 - 2 * distanceFromEdge )
}

// The scroll position that brings a board to the centre of the run, for keyboard focus.
// The track slides left by progress × runDistance while Projects is pinned from sectionTop.
export function getRunScrollTarget ( { sectionTop, runDistance, boardLeft, boardWidth, viewportWidth } )
{
  if ( !( runDistance > 0 ) ) return Math.round( sectionTop )
  const progress = clamp01( ( boardLeft + boardWidth / 2 - viewportWidth / 2 ) / runDistance )
  return Math.round( sectionTop + progress * runDistance )
}

// Which part of the Story sits under a line at scroll position y (the header, or the pointer):
// the pinned stage, Projects, or Contact. Starts are the scroll positions where each section
// reaches that line.
export function sectionAt ( y, { projectsStart, contactStart } )
{
  if ( y >= contactStart ) return 'contact'
  if ( y >= projectsStart ) return 'projects'
  return 'stage'
}

// Scroll velocity (px per frame, signed) → lean in degrees, clamped both ways. Scrolling down leans
// positive. A non-finite velocity (no scroll source) leaves the content upright.
export function skewFromVelocity ( velocity, { gain, maxDeg } )
{
  if ( !Number.isFinite( velocity ) || !( maxDeg > 0 ) ) return 0
  const lean = velocity * gain
  return Math.max( -maxDeg, Math.min( maxDeg, lean ) )
}
