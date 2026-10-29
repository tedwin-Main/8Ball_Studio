/**
 * FILE: frontend/sections/wordmark-page.jsx
 * PURPOSE: full-screen studio title page after hero; 8ightBall / Studio letters rise from line masks, scrubbed
 * UI: Site > Studio
 * USED BY: app.jsx
 * KEY EXPORTS: WordmarkPage
 */

import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { STUDIO } from '../lib/site-content'

gsap.registerPlugin( ScrollTrigger )

// Studio > title line: one span per letter so each rises from line mask; heading carries accessible name
function CueLine( { text } ) {
  return (
    <span className="wordmark-line">
      <span aria-hidden="true">
        { [ ...text ].map( ( character, index, characters ) => (
          <span
            // capital after lowercase starts joined word ("8ightBall"); gap stops tight caps fusing "tB"
            className={ /[a-z]/.test( characters[ index - 1 ] ?? '' ) && /[A-Z]/.test( character ) ? 'wordmark-char is-joined-cap' : 'wordmark-char' }
            key={ index }
          >
            { character }
          </span>
        ) ) }
      </span>
    </span>
  )
}

// Studio > page: tall section, sticky stage holds title while scroll builds it
export function WordmarkPage() {
  const rootRef = useRef( null )
  const stageRef = useRef( null )
  const markRef = useRef( null )

  useLayoutEffect( () => {
    if ( window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches ) return undefined
    const ctx = gsap.context( () => {
      // Studio > build: scrubbed across stage hold; letters rise from masks left to right
      gsap.timeline( {
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: rootRef.current, start: 'top 70%', end: 'bottom bottom', scrub: 0.9 },
      } )
        .fromTo( markRef.current.querySelectorAll( '.wordmark-char' ), { yPercent: 115 }, {
          yPercent: 0,
          duration: 0.34,
          ease: 'power3.out',
          stagger: { amount: 0.26, from: 'start' },
        } )
        // short rest so last letter settles before stage unpins
        .to( {}, { duration: 0.3 } )

      // Studio > exit: title drifts up and dims as stage unpins, hands off to statement
      gsap.to( stageRef.current, {
        yPercent: -12,
        opacity: 0.35,
        ease: 'none',
        scrollTrigger: { trigger: rootRef.current, start: 'bottom bottom', end: 'bottom top', scrub: true },
      } )
    } )
    return () => ctx.revert()
  }, [] )

  return (
    <section className="wordmark-page" id="studio" aria-label={ `8ightBall Studio, ${ STUDIO.region }` } ref={ rootRef }>
      <div className="wordmark-stage" ref={ stageRef }>
        <div className="wordmark-frame">
          <h2 className="wordmark" ref={ markRef } aria-label="8ightBall Studio">
            <CueLine text="8ightBall" />
            <CueLine text="Studio" />
          </h2>
        </div>
      </div>
    </section>
  )
}
