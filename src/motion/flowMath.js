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

// The palette position of a look with section themes (Acid Night): 0 while Studio holds the screen,
// 1 once Projects covers it, 2 once Contact is fully uncovered. The whole stretch, from Projects
// entering to Contact settling, is one scroll range made of three parts in px: the handoff
// (Projects rising), the run (held at 1), and the reveal (Contact uncovering).
export function themeProgressAt ( progress, { handoff, run, reveal } )
{
  const total = handoff + run + reveal
  if ( !( total > 0 ) ) return 0
  const scrolled = clamp01( progress ) * total
  if ( scrolled <= handoff ) return handoff > 0 ? scrolled / handoff : 1
  if ( scrolled <= handoff + run ) return 1
  return 1 + ( reveal > 0 ? ( scrolled - handoff - run ) / reveal : 1 )
}

// Where each palette change happens inside its stretch of scroll, as [start, end] shares of it.
// Ink → paper runs over the first half of the handoff, so Projects is already paper by the time it
// covers half the screen; paper → acid runs through the middle of the reveal, as Contact emerges.
export const THEME_MORPH_WINDOWS = Object.freeze( [ Object.freeze( [ 0.1, 0.5 ] ), Object.freeze( [ 0.2, 0.7 ] ) ] )

// Shapes a palette position (from themeProgressAt) so each change holds, then moves quickly and
// smoothly inside its window, then settles: the muddy midpoint between two palettes only flashes past.
export function easeThemeMorph ( t, windows = THEME_MORPH_WINDOWS )
{
  if ( !Number.isFinite( t ) || t <= 0 ) return 0
  const whole = Math.floor( t )
  const part = t - whole
  const window = windows[ whole ]
  if ( part === 0 || !window ) return t
  const [ start, end ] = window
  const x = clamp01( ( part - start ) / ( end - start ) )
  return whole + x * x * ( 3 - 2 * x )
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
