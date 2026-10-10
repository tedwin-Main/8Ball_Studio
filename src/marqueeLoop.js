import gsap from 'gsap'

// Pixels per second that every marquee row moves at. One value keeps the services and client rows in step.
export const MARQUEE_SPEED = 120

// Drives an endless row. The track holds two identical copies, so moving it by one copy's width loops with no gap.
// `reverse` runs the row to the right instead of the left. Returns a cleanup that stops the loop.
export function startMarqueeLoop( track, { reverse = false } = {} ) {
  // Left: 0 to -50% of the track. Right: -50% back to 0. One copy is half the track's width.
  const tween = gsap.fromTo(
    track,
    { xPercent: reverse ? -50 : 0 },
    { xPercent: reverse ? 0 : -50, ease: 'none', duration: 1, repeat: -1 },
  )

  // Sets the tween speed so the row moves MARQUEE_SPEED pixels per second, whatever the copy's width is.
  // At timeScale 1 the tween covers one copy in one second, so timeScale = speed / copy width.
  const setSpeed = () => {
    const copyWidth = track.offsetWidth / 2
    if ( copyWidth > 0 ) tween.timeScale( MARQUEE_SPEED / copyWidth )
  }

  // Re-measure when the track resizes. Logos load lazily, so the width changes after first paint, and so does a viewport resize.
  const observer = new ResizeObserver( setSpeed )
  observer.observe( track )
  setSpeed()

  return () => {
    observer.disconnect()
    tween.kill()
  }
}
