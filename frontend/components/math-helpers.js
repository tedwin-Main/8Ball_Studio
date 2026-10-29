// Provides shared math helpers for scroll progress and 3D motion: clamp, lerp, smoothstep.

export const clamp = ( value, min = 0, max = 1 ) => Math.min( max, Math.max( min, value ) )
export const lerp = ( start, end, progress ) => start + ( end - start ) * progress
export const smoothstep = ( progress ) => progress * progress * ( 3 - 2 * progress )

// Edge form: 0 below edge0, 1 above edge1, smooth curve between.
export const smoothstepBetween = ( edge0, edge1, value ) =>
  smoothstep( clamp( ( value - edge0 ) / ( edge1 - edge0 ) ) )
