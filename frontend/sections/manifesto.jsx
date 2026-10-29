/**
 * FILE: frontend/sections/manifesto.jsx
 * PURPOSE: sticky scrubbed paragraph, words light up with scroll; chalk draft swaps to day ground
 * UI: Site > Manifesto
 * USED BY: app.jsx
 * KEY EXPORTS: Manifesto
 */

import { Fragment, useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { MANIFESTO } from '../lib/site-content'

// Manifesto > sticky paragraph: words scrub 0.1 to 1 across tall section
// variant: 'chalk' (day chapter) or 'felt' (original night ground)
export function Manifesto( { variant = 'chalk' } ) {
  const sectionRef = useRef( null )
  const wordsRef = useRef( null )
  const chalk = variant === 'chalk'

  useLayoutEffect( () => {
    // reduced motion: words full strength (CSS)
    if ( window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches ) return undefined
    const section = sectionRef.current
    const words = wordsRef.current.querySelectorAll( '.word' )
    // Scrub: the timeline's progress is tied to the scroll position through this section.
    const timeline = gsap.timeline( {
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: 'bottom bottom',
        scrub: true,
        invalidateOnRefresh: true,
      },
    } )
    // Each word takes 0.6 of the timeline; the stagger spreads the starts over the remaining 0.4,
    // so the whole timeline is exactly 1 long and scroll progress maps straight onto the words.
    timeline.fromTo( words, { opacity: 0.1 }, {
      opacity: 1,
      duration: 0.6,
      ease: 'none',
      stagger: { each: 0.4 / Math.max( 1, words.length - 1 ) },
    } )
    return () => {
      timeline.scrollTrigger?.kill()
      timeline.kill()
    }
  }, [] )

  const words = MANIFESTO.split( ' ' )

  return (
    <section
      className={ `manifesto is-${ variant }` }
      data-chapter={ chalk ? 'chalk' : 'felt' }
      ref={ sectionRef }
      aria-label="About the studio"
    >
      <div className="manifesto-sticky">
        <p className="manifesto-text" ref={ wordsRef }>
          { words.map( ( word, index ) => (
            // The space sits outside the inline-block word, so it is not swallowed.
            <Fragment key={ index }>
              <span className="word">{ word }</span>{ ' ' }
            </Fragment>
          ) ) }
        </p>
      </div>
    </section>
  )
}
