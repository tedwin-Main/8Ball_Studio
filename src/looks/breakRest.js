// Where the Intro break leaves the balls, for the Pool Table look's Studio table: the camera has
// risen to the lamp and looks down on the same table the visitor just broke on.
// The spots are the Draft 1 break simulation's last frame (src/drafts/poolBreakPhysics.js), stored
// here as data so the page never runs the 42 ms simulation just to draw them. breakRest.test.js
// re-runs the simulation and fails if these spots drift from it.
import { BALL_COLORS } from '../drafts/rackLayout.js'

// The physics table: 1.27 wide (x) and 2.54 long (z), centred on 0, in metres.
const TABLE = Object.freeze( { width: 1.27, length: 2.54 } )
export const BALL_DIAMETER = 0.07

// The 1, 2 and 3 balls leave the table: the Studio services list wears them (downlight.css).
// The 2 also dropped in the far corner pocket during the break.
export const SERVICE_BALLS = Object.freeze( [ 1, 2, 3 ] )

// number 0 is the striker: the black 8-ball that carries the studio logo.
export const BREAK_REST_BALLS = Object.freeze( [
  Object.freeze( { number: 0, x: -0.535, z: -0.748 } ),
  Object.freeze( { number: 5, x: -0.498, z: -0.222 } ),
  Object.freeze( { number: 11, x: -0.015, z: -0.907 } ),
  Object.freeze( { number: 8, x: -0.004, z: -1.051 } ),
  Object.freeze( { number: 10, x: 0.155, z: -1.066 } ),
  Object.freeze( { number: 4, x: -0.572, z: -1.016 } ),
  Object.freeze( { number: 13, x: -0.067, z: -1.136 } ),
  Object.freeze( { number: 14, x: 0.113, z: -1.125 } ),
  Object.freeze( { number: 9, x: -0.253, z: 0.026 } ),
  Object.freeze( { number: 12, x: -0.089, z: -1.228 } ),
  Object.freeze( { number: 15, x: 0.043, z: -1.166 } ),
  Object.freeze( { number: 6, x: 0.138, z: -1.223 } ),
  Object.freeze( { number: 7, x: 0.177, z: -0.832 } ),
] )

/**
 * A ball's spot on the landscape plate's cloth, as 0-1 shares of the cloth's width (u) and height (v).
 * The long axis runs across the screen with the rack's end on the right, and the table is mirrored
 * so the loose balls lie at the bottom: the Studio title fills the top left, and the rack stays clear
 * of the services list at the bottom right.
 */
export function toLandscapeCloth ( { x, z } )
{
  return {
    u: 0.5 - z / TABLE.length,
    v: 0.5 - x / TABLE.width,
  }
}

// The ball's diameter as a share of the landscape cloth's width.
export const BALL_SHARE_OF_CLOTH_WIDTH = BALL_DIAMETER / TABLE.length

// How a ball is painted: 'striker' (the logo 8-ball), 'solid' (1-8), or 'stripe' (9-15).
export function ballKind ( number )
{
  if ( number === 0 ) return 'striker'
  return number > 8 ? 'stripe' : 'solid'
}

export function ballColor ( number )
{
  return number === 0 ? '#070807' : BALL_COLORS[ number - 1 ]
}
