const clamp = ( value, min = 0, max = 1 ) => Math.min( max, Math.max( min, value ) )

export function setRollingBallMark ( mark, progress, rotations = 2 )
{
  if ( !mark ) return

  // Move only the printed mark over the sphere; the outer ball never flips or loses its circle.
  const angle = progress * rotations * Math.PI * 2
  const surfaceDepth = Math.cos( angle )
  const surfaceY = -Math.sin( angle ) * 70
  const poleCompression = Math.max( 0.12, Math.abs( surfaceDepth ) )

  mark.style.transform = `translate3d(-50%, calc(-50% + ${surfaceY}%), 0) scaleY(${poleCompression})`
  // A real printed mark disappears while rotating around the rear hemisphere.
  mark.style.opacity = String( clamp( surfaceDepth * 4 ) )
}

export function RollingBallMark ()
{
  return (
    <span className="rolling-ball-mark" aria-hidden="true">
      <svg viewBox="0 0 100 100" focusable="false">
        {/* This vector keeps the supplied rounded 8 mark sharp at every responsive size. */}
        <path d="M26 17h48c8 0 13 5 13 13v12c0 6-3 10-9 12 6 2 9 6 9 12v4c0 8-5 13-13 13H26c-8 0-13-5-13-13v-4c0-6 3-10 9-12-6-2-9-6-9-12V30c0-8 5-13 13-13Z" />
        <rect x="37" y="32" width="26" height="8" rx="4" />
        <rect x="37" y="64" width="26" height="8" rx="4" />
      </svg>
    </span>
  )
}
