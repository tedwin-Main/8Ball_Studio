import { Fragment, useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { MANIFESTO } from '../content'

// Desire: the paragraph lights up word by word as you scroll (a scrubbed reveal). The section is tall and
// its text is sticky, so the reveal has room to run before the next chapter arrives.
export function Manifesto() {
  const sectionRef = useRef( null )
  const wordsRef = useRef( null )

  useLayoutEffect( () => {
    const words = wordsRef.current.querySelectorAll( '.word' )
    // Scrub: the timeline's progress is tied to the scroll position through this section.
    const timeline = gsap.timeline( {
      scrollTrigger: {
        trigger: sectionRef.current,
        start: 'top top',
        end: 'bottom bottom',
        scrub: true,
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
    <section className="manifesto" ref={ sectionRef } aria-label="About the studio">
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
