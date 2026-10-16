/**
 * FILE: src/sections/Manifesto.jsx
 * PURPOSE: sticky scrubbed paragraph, words light up with scroll; chalk draft adds day ground and rolling cue ball
 * UI: Site > Manifesto
 * USED BY: src/App.jsx
 * KEY EXPORTS: Manifesto
 */

import { Fragment, useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { MANIFESTO } from '../content'

// Manifesto > sticky paragraph: words scrub 0.1 to 1 across tall section
// variant: 'chalk' (day chapter, cue line + ball track progress) or 'felt' (original night ground)
export function Manifesto( { variant = 'chalk' } ) {
  const sectionRef = useRef( null )
  const wordsRef = useRef( null )
  const chalk = variant === 'chalk'

  useLayoutEffect( () => {
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
    // Manifesto > cue line: hairline draws, ball rolls its length (spin from distance / circumference)
    const rule = section.querySelector( '.manifesto-rule' )
    const ball = section.querySelector( '.manifesto-ball' )
    if ( rule && ball ) {
      const travel = () => rule.offsetWidth - ball.offsetWidth
      timeline
        .fromTo( rule, { scaleX: 0 }, { scaleX: 1, duration: 1, ease: 'none' }, 0 )
        .fromTo( ball, { x: 0, rotation: 0 }, { x: travel, rotation: () => ( travel() / ( Math.PI * ball.offsetWidth ) ) * 360, duration: 1, ease: 'none' }, 0 )
    }
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
        { chalk && (
          <div className="manifesto-track" aria-hidden="true">
            <span className="manifesto-rule" />
            <span className="manifesto-ball"><span>8</span></span>
          </div>
        ) }
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
