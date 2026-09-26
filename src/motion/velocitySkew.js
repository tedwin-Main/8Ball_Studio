import gsap from 'gsap'
import { skewFromVelocity } from './flowMath.js'
import { getTuning } from './runtimeTuning.js'

// Seconds without a scroll event before the lean is sent back to upright, in case the scroll source
// never reports a final zero velocity.
const IDLE_SECONDS = 0.12
// Degrees of lean per unit of scroll velocity, and how long the lean takes to follow it.
const GAIN = 0.35
const SETTLE_SECONDS = 0.4

/**
 * Velocity skew: everything in flow leans with the speed of the scroll, then settles upright.
 * `.skew-layer` elements lean vertically (skewY) and `.skew-layer-x` (the Projects track, which
 * travels sideways) lean horizontally. Those wrappers carry nothing else GSAP moves, so the lean
 * never fights another tween's transform. The pinned stage and fixed chrome have no skew layers.
 *
 * The most it leans is the skew setting, read live from src/motion/runtimeTuning.js.
 * Returns a cleanup that stands everything upright again.
 */
export function createVelocitySkew ( { root, subscribeScroll, getVelocity } )
{
  const leansY = gsap.utils.toArray( '.skew-layer', root )
  const leansX = gsap.utils.toArray( '.skew-layer-x', root )
  if ( !leansY.length && !leansX.length ) return () => {}

  const lean = { deg: 0 }
  const apply = () =>
  {
    // force3D keeps each lean on its own compositor layer, so leaning never repaints the content.
    if ( leansY.length ) gsap.set( leansY, { skewY: lean.deg, force3D: true } )
    if ( leansX.length ) gsap.set( leansX, { skewX: lean.deg, force3D: true } )
  }
  // One eased follower: the lean trails the velocity instead of snapping per event.
  const leanTo = gsap.quickTo( lean, 'deg', { duration: SETTLE_SECONDS, ease: 'power3.out', onUpdate: apply } )

  let idle = null
  const onScroll = () =>
  {
    leanTo( skewFromVelocity( getVelocity(), { gain: GAIN, maxDeg: getTuning().skew } ) )
    idle?.kill()
    idle = gsap.delayedCall( IDLE_SECONDS, () => leanTo( 0 ) )
  }
  const unsubscribe = subscribeScroll( onScroll )

  return () =>
  {
    unsubscribe()
    idle?.kill()
    gsap.killTweensOf( lean )
    gsap.set( [ ...leansY, ...leansX ], { clearProps: 'transform' } )
  }
}
