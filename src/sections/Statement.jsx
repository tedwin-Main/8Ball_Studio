import { CLIENTS, PILL_IMAGES, PRIMARY_CONTACT, SERVICES } from '../content'

// Interest: a big statement with small pictures set inside the words, then a gapless bento grid.
// Bento math: desktop is 4 columns x 2 rows = 8 cells, filled by reel 2x2 (4) + clients 2x1 (2) + place 1x1 + cta 1x1 = 8.
// Mobile is 2 columns x 4 rows = 8 cells, filled by reel 2x2 (4) + clients 2x1 (2) + place 1 + cta 1 = 8.
// grid-auto-flow: dense (in CSS) packs the cards with no holes.
export function Statement() {
  return (
    <section className="section" id="services" aria-labelledby="statement-title">
      <h2 id="statement-title" className="statement">
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
