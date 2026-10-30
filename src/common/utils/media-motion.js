// Handles scroll scale-and-fade animations for media blocks.

import gsap from 'gsap'

// Run engine: scrubbed in (scale from -> 1) and out (opacity 1 -> 0.2, brightness 1 -> 0.45).
// trigger defaults to element; sticky stages pass their tall track, so exit starts when stage unpins.
// Returns kill fn. Caller guards reduced motion (or runs inside gsap.context and reverts).
export function scaleFade( el, { trigger = el, from = 0.86 } = {} ) {
  if ( !el ) return () => {}
  const grow = gsap.fromTo( el, { scale: from }, {
    scale: 1,
    ease: 'none',
    scrollTrigger: { trigger, start: 'top bottom', end: 'top 35%', scrub: 0.6 },
  } )
  const leave = gsap.fromTo( el, { opacity: 1, filter: 'brightness(1)' }, {
    opacity: 0.2,
    filter: 'brightness(0.45)',
    ease: 'none',
    immediateRender: false,
    scrollTrigger: { trigger, start: 'bottom 45%', end: 'bottom top', scrub: 0.6 },
  } )
  return () => {
    grow.scrollTrigger?.kill()
    leave.scrollTrigger?.kill()
    grow.kill()
    leave.kill()
    gsap.set( el, { clearProps: 'scale,opacity,filter,transform' } )
  }
}
