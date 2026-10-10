import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { CLIENTS, PRIMARY_CONTACT } from '../content'

// Desire: client cards stack on top of each other. Each card stays pinned near the top while the next
// one slides up over it; the card underneath shrinks and dims.
export function ClientStack() {
  const listRef = useRef( null )

  useLayoutEffect( () => {
    const cards = listRef.current.querySelectorAll( '.stack-card' )
    const triggers = []
    cards.forEach( ( card, index ) => {
      const next = cards[ index + 1 ]
      if ( !next ) return
      // Scrub the card shrink and dim while the next card rises across it.
      const tween = gsap.to( card.querySelector( '.stack-inner' ), {
        scale: 0.92,
        opacity: 0.35,
        ease: 'none',
        scrollTrigger: { trigger: next, start: 'top 85%', end: 'top 25%', scrub: true },
      } )
      triggers.push( tween )
    } )
    return () => triggers.forEach( ( tween ) => { tween.scrollTrigger?.kill(); tween.kill() } )
  }, [] )

  return (
    <section className="section stack-section" id="clients" aria-labelledby="clients-title" ref={ listRef }>
      <h2 id="clients-title" className="section-title">Work with</h2>
      { CLIENTS.map( ( client, index ) => (
        <article key={ client.name } className="stack-card" style={ { '--i': index } }>
          <div className="stack-inner">
            <img src={ client.src } alt={ client.name } loading="lazy" />
            <p className="stack-name">{ client.name }</p>
          </div>
        </article>
      ) ) }
      <article className="stack-card" style={ { '--i': CLIENTS.length } } id="contact">
        <div className="stack-inner stack-next">
          <p className="stack-name">Your brand, next.</p>
          <a className="btn btn-lime" href={ PRIMARY_CONTACT.href } target="_blank" rel="noreferrer">
            { PRIMARY_CONTACT.label }
          </a>
        </div>
      </article>
    </section>
  )
}
