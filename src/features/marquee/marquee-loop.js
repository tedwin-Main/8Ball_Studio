// Drives endless marquee row with constant pixel speed CSS animation.

// Pixels per second that every marquee row moves at. One value keeps the services and client rows in step.
export const MARQUEE_SPEED = 120

// Drives an endless row. The track holds two identical copies, so moving it by one copy's width loops with no gap.
// `reverse` runs the row to the right instead of the left. Returns a cleanup that stops the loop.
// CSS animation (marquee-loop in client-loop.css), not a GSAP tween: transform keyframes run on compositor, so phone
// touch scroll and busy main thread (WebGL break, scroll handlers) never stall the row.
export function startMarqueeLoop( track, { reverse = false } = {} ) {
  // Run engine: one copy per duration, so duration = copy width / speed
  const setSpeed = () => {
    const copyWidth = track.offsetWidth / 2
    if ( copyWidth > 0 ) track.style.setProperty( '--marquee-duration', `${ copyWidth / MARQUEE_SPEED }s` )
  }

  // Re-measure when the track resizes. Logos load lazily, so the width changes after first paint, and so does a viewport resize.
  const observer = new ResizeObserver( setSpeed )
  observer.observe( track )
  setSpeed()
  track.classList.add( 'is-looping' )
  track.classList.toggle( 'is-reverse', reverse )

  // Off screen the row is paused, so it costs no frames while the visitor is elsewhere on the page.
  const visibility = new IntersectionObserver( ( [ entry ] ) => {
    track.style.animationPlayState = entry.isIntersecting ? 'running' : 'paused'
  } )
  visibility.observe( track.parentElement )

  return () => {
    visibility.disconnect()
    observer.disconnect()
    track.classList.remove( 'is-looping', 'is-reverse' )
    track.style.removeProperty( '--marquee-duration' )
    track.style.removeProperty( 'animation-play-state' )
  }
}
