/**
 * FILE: src/features/clients/client-loop.jsx
 * PURPOSE: client logo loop with popping title
 * UI: Site > Clients
 * USED BY: app.jsx
 * KEY EXPORTS: ClientLoop
 */

import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { startMarqueeLoop } from '../marquee/index'
import { CLIENTS } from '../../config/site-content'
import { useSplitTitle } from '../../common/utils/title-motion'

// How many times the client logos repeat inside one group, so one group is always wider than a wide screen.
const REPEATS = 3

// Desire: an endless row of client logos that drifts to the right, the opposite way to the services marquee below.
// Two identical groups sit side by side and the track moves exactly one group's width, so the loop never shows a gap.
// Clients > title: letters pop in one by one as title rises from screen bottom
// Scrubbed to scroll: each letter scales up from nothing with back-ease overshoot and random tilt.
function usePopTitle( titleRef ) {
  useSplitTitle( titleRef, { type: 'chars' }, ( split ) =>
    gsap.from( split.chars, {
      scale: 0,
      rotation: () => gsap.utils.random( -45, 45 ),
      transformOrigin: '50% 60%',
      ease: 'back.out(2.5)',
      stagger: 0.08,
      scrollTrigger: { trigger: titleRef.current, start: 'top bottom', end: 'top 55%', scrub: 0.8 },
    } ) )
}

export function ClientLoop() {
  const trackRef = useRef( null )
  const titleRef = useRef( null )
  usePopTitle( titleRef )

  useLayoutEffect( () => {
    // Reduced-motion visitors get a still row, no loop.
    if ( window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches ) return undefined
    // Runs to the right, the opposite way to the services marquee.
    return startMarqueeLoop( trackRef.current, { reverse: true } )
  }, [] )

  // Only the first group is read by screen readers; the second is a visual copy that makes the loop seamless.
  const renderGroup = ( copy ) => (
    <ul className="clients-group" aria-hidden={ copy ? 'true' : undefined }>
      { Array.from( { length: REPEATS }, ( _, repeat ) => CLIENTS.map( ( client ) => (
        <li key={ `${ copy }-${ repeat }-${ client.name }` } className={ repeat ? 'clients-repeat' : undefined }>
          <img src={ client.src } alt={ copy || repeat ? '' : client.name } loading="lazy" decoding="async" />
        </li>
      ) ) ) }
    </ul>
  )

  return (
    <section className="section clients" id="clients" aria-labelledby="clients-title">
      <h2 id="clients-title" className="section-title" ref={ titleRef }>Our clients</h2>
      <div className="clients-loop">
        <div className="clients-track" ref={ trackRef }>
          { renderGroup( 0 ) }
          { renderGroup( 1 ) }
        </div>
      </div>
    </section>
  )
}
