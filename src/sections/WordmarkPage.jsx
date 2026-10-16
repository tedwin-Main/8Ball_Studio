/**
 * FILE: src/sections/WordmarkPage.jsx
 * PURPOSE: full-screen studio wordmark page after hero; lime 8 rolls in like cue ball, rest of word rises, facts line draws
 * UI: Site > Studio (?wordmark=page)
 * USED BY: src/App.jsx
 * KEY EXPORTS: WordmarkPage
 */

import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { STUDIO } from '../content'
import { useFitWidth } from '../titleMotion'
import { StudioClock } from './Nav'

gsap.registerPlugin( ScrollTrigger, SplitText )

// Studio > facts: six SERVICES names cut to one word each
const SERVICE_WORDS = 'Video, design, marketing, social, web, AI'

// Studio > page: tall section, sticky stage holds wordmark while scroll builds it
export function WordmarkPage() {
  const rootRef = useRef( null )
  const stageRef = useRef( null )
  const markRef = useRef( null )
  const eightRef = useRef( null )
  const restRef = useRef( null )
  const cueRef = useRef( null )
  const factsRef = useRef( null )
  useFitWidth( markRef )

  useLayoutEffect( () => {
    if ( window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches ) return undefined
    const ctx = gsap.context( () => {
      // Studio > build: scrubbed across stage hold; 8 rolls in from left edge, letters rise behind it, cue line draws
      const split = SplitText.create( restRef.current, { type: 'chars', mask: 'chars', aria: 'none' } )
      const build = gsap.timeline( {
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: rootRef.current, start: 'top 70%', end: 'bottom bottom', scrub: 0.9 },
      } )
      build
        // one turn per glyph width travelled reads as rolling, not spinning
        .fromTo( eightRef.current, { xPercent: -900, rotate: -900 }, { xPercent: 0, rotate: 0, duration: 1, ease: 'back.out(1.4)' } )
        .from( split.chars, { yPercent: 110, duration: 0.6, ease: 'expo.out', stagger: 0.06 }, 0.35 )
        .fromTo( cueRef.current, { scaleX: 0 }, { scaleX: 1, duration: 0.6, ease: 'power3.inOut' }, 0.9 )
        .from( factsRef.current.children, { autoAlpha: 0, y: 14, duration: 0.4, ease: 'expo.out', stagger: 0.12 }, 1.15 )
        // short rest so last fact settles before stage unpins
        .to( {}, { duration: 0.3 } )

      // Studio > exit: word drifts up and dims as stage unpins, hands off to statement
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
          <p className="wordmark" ref={ markRef } aria-label="8ightBall">
            <span className="wordmark-eight" ref={ eightRef } aria-hidden="true">8</span>
            {/* phones stack 8ight over Ball so word fills tall screen; br hidden on wider screens */}
            <span className="wordmark-rest" ref={ restRef } aria-hidden="true">ight<br className="wordmark-break" />Ball</span>
          </p>
        </div>
        <div className="wordmark-base">
          <span className="wordmark-cue" ref={ cueRef } aria-hidden="true" />
          <div className="wordmark-facts" ref={ factsRef }>
            <p>{ STUDIO.region }</p>
            <p>{ SERVICE_WORDS }</p>
            <StudioClock className="wordmark-clock" />
          </div>
        </div>
      </div>
    </section>
  )
}
