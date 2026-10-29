/**
 * FILE: src/features/manifesto/statement.jsx
 * PURPOSE: scrambled statement heading, gapless bento grid
 * UI: Site > Statement, Bento
 * USED BY: app.jsx
 * KEY EXPORTS: Statement
 */

import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin'
import { CLIENTS, PRIMARY_CONTACT, SERVICES } from '../../config/site-content'
import { useSplitTitle } from '../../common/utils/title-motion'
import { scaleFade } from '../../common/utils/media-motion'

gsap.registerPlugin( ScrambleTextPlugin )

// mixed set: letters, digits, symbols
const SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*?/'

// Interest: big statement, then gapless bento grid.
// Bento math: desktop is 4 columns x 2 rows = 8 cells, filled by reel 2x2 (4) + clients 2x1 (2) + place 1x1 + cta 1x1 = 8.
// Mobile is 2 columns x 4 rows = 8 cells, filled by reel 2x2 (4) + clients 2x1 (2) + place 1 + cta 1 = 8.
// grid-auto-flow: dense (in CSS) packs the cards with no holes.
export function Statement() {
  const titleRef = useRef( null )

  // Each word runs through random characters, then lands on its real text.
  // aria 'none': the heading's own aria-label stays its name.
  useSplitTitle( titleRef, { type: 'words', aria: 'none' }, ( split ) => {
    // width locked to real word so wider scramble glyphs never rewrap lines
    split.words.forEach( ( word ) => gsap.set( word, { display: 'inline-block', whiteSpace: 'nowrap', width: word.offsetWidth } ) )
    // plays once on first entry from below; replays only after last line fully cleared screen top (onLeave at bottom top), then returns
    // play (not restart) on enter: finished timeline ignores later re-entries from below; restart snaps to blank first, so no reset on leave
    const tl = gsap.timeline( { scrollTrigger: {
      trigger: titleRef.current,
      start: 'top 80%',
      end: 'bottom top',
      toggleActions: 'play none restart none',
    } } )
    split.words.forEach( ( word, i ) => {
      tl.fromTo( word, { opacity: 0 }, {
        opacity: 1,
        scrambleText: { text: word.textContent, chars: SCRAMBLE_CHARS, speed: 0.6, revealDelay: 0.25 },
        duration: 1.1,
        ease: 'expo.out',
      }, i * 0.06 )
    } )
    return tl
  } )

  const bentoRef = useRef( null )

  useLayoutEffect( () => {
    if ( window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches ) return undefined
    const bento = bentoRef.current
    const ctx = gsap.context( () => {
      // Bento > Reel: media zooms out to rest as card enters
      // wrapper, not video, so desktop hover scale on video still works
      gsap.fromTo( bento.querySelector( '.bento-media' ), { scale: 1.15 }, {
        scale: 1,
        ease: 'none',
        scrollTrigger: { trigger: bento.querySelector( '.bento-reel' ), start: 'top bottom', end: 'center center', scrub: true },
      } )
    }, bento )
    // Bento > Reel: card grows in, darkens out
    const killFade = scaleFade( bento.querySelector( '.bento-reel' ), { from: 0.9 } )
    return () => {
      killFade()
      ctx.revert()
    }
  }, [] )

  return (
    <section className="section" aria-labelledby="statement-title">
      <h2 id="statement-title" className="statement" ref={ titleRef } aria-label="We make brands stand out. Locally and internationally.">
        We make brands stand out. Locally and internationally.
      </h2>

      <div className="bento" ref={ bentoRef }>
        <article className="bento-card bento-reel">
          <div className="bento-media">
            <video src={ SERVICES[ 0 ].reel.src } poster={ SERVICES[ 0 ].reel.poster } muted autoPlay loop playsInline />
          </div>
          <p className="bento-caption">Brand films, reels and short-form edits</p>
        </article>

        <article className="bento-card bento-clients" aria-label="Clients">
          <ul className="logo-row">
            { CLIENTS.map( ( client ) => (
              <li key={ client.name }>
                <img src={ client.src } alt={ client.name } loading="lazy" />
              </li>
            ) ) }
          </ul>
        </article>

        <article className="bento-card bento-place">
          <p className="bento-kicker">Based in</p>
          <p className="bento-big">Greater Kuala Lumpur, Malaysia</p>
        </article>

        <a className="bento-card bento-cta" href={ PRIMARY_CONTACT.href } target="_blank" rel="noreferrer" data-cursor="Say hi">
          <p className="bento-kicker">Start here</p>
          <p className="bento-big">{ PRIMARY_CONTACT.label }</p>
          <span className="bento-arrow" aria-hidden="true">→</span>
        </a>
      </div>
    </section>
  )
}
