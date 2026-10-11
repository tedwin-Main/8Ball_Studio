import { useRef } from 'react'
import gsap from 'gsap'
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin'
import { CLIENTS, PILL_IMAGES, PRIMARY_CONTACT, SERVICES } from '../content'
import { useSplitTitle } from '../titleMotion'

gsap.registerPlugin( ScrambleTextPlugin )

// mixed set: letters, digits, symbols
const SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*?/'

// Interest: a big statement with small pictures set inside the words, then a gapless bento grid.
// Bento math: desktop is 4 columns x 2 rows = 8 cells, filled by reel 2x2 (4) + clients 2x1 (2) + place 1x1 + cta 1x1 = 8.
// Mobile is 2 columns x 4 rows = 8 cells, filled by reel 2x2 (4) + clients 2x1 (2) + place 1 + cta 1 = 8.
// grid-auto-flow: dense (in CSS) packs the cards with no holes.
export function Statement() {
  const titleRef = useRef( null )

  // Each word runs through random characters, then lands on its real text; pictures stay static.
  // aria 'none': the heading's own aria-label (spaces where the pictures sit) stays its name.
  useSplitTitle( titleRef, { type: 'words', aria: 'none' }, ( split ) => {
    // width locked to real word so wider scramble glyphs never rewrap lines
    split.words.forEach( ( word ) => gsap.set( word, { display: 'inline-block', whiteSpace: 'nowrap', width: word.offsetWidth } ) )
    // replays on every entry, from below or above; restart snaps to blank first, so no reset on leave (would blank while still visible)
    const tl = gsap.timeline( { scrollTrigger: {
      trigger: titleRef.current,
      start: 'top 80%',
      end: 'bottom 20%',
      toggleActions: 'restart none restart none',
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

  return (
    <section className="section" id="services" aria-labelledby="statement-title">
      <h2 id="statement-title" className="statement" ref={ titleRef } aria-label="Brands that look good on social, made in Kuala Lumpur.">
        Brands that look good on
        <span className="pill-img" style={ { backgroundImage: `url(${PILL_IMAGES.social})` } } aria-hidden="true" />
        social, made in
        <span className="pill-img pill-img-wide" style={ { backgroundImage: `url(${PILL_IMAGES.kl})` } } aria-hidden="true" />
        Kuala Lumpur.
      </h2>

      <div className="bento">
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

        <a className="bento-card bento-cta" href={ PRIMARY_CONTACT.href } target="_blank" rel="noreferrer">
          <p className="bento-kicker">Start here</p>
          <p className="bento-big">{ PRIMARY_CONTACT.label }</p>
          <span className="bento-arrow" aria-hidden="true">→</span>
        </a>
      </div>
    </section>
  )
}
