// The speed limit for wheel and trackpad scrolling. Lenis eases the page toward a target position and
// moves a fixed share (glide) of the remaining gap each frame, so the largest gap sets the top speed.
// Capping how far the target may run ahead of the page gives every hard flick the same steady, heavy
// pace instead of letting it race.

/**
 * Returns the wheel delta Lenis may add to its target, trimmed so the target never leads the page by
 * more than maxLead px in either direction. A maxLead of 0 or less means no limit.
 * @param {number} delta   the incoming wheel delta (already scaled by the wheel dial)
 * @param {number} lead    how far the target is already ahead of the page (target - page), signed
 * @param {number} maxLead the largest allowed lead in px
 */
export function limitScrollLead ( delta, lead, maxLead )
{
  if ( !Number.isFinite( delta ) || !( maxLead > 0 ) ) return delta
  const ahead = Number.isFinite( lead ) ? lead : 0
  return Math.max( -maxLead - ahead, Math.min( maxLead - ahead, delta ) )
}
