import { useState } from 'react'
import { SERVICES } from '../content'

// Desire: six vertical slices side by side. The open slice widens to show its reel; the rest keep their stills.
// Hover, focus and tap all open a slice, so keyboard and touch get the same behaviour.
export function ServicesAccordion() {
  const [ openIndex, setOpenIndex ] = useState( 0 )

  return (
    <section className="section services" aria-labelledby="services-title">
      <h2 id="services-title" className="section-title">What we make</h2>
      <ul className="accordion">
        { SERVICES.map( ( service, index ) => {
          const isOpen = index === openIndex
          return (
            <li
              key={ service.name }
              className={ `slice${ isOpen ? ' is-open' : '' }` }
              onMouseEnter={ () => setOpenIndex( index ) }
              onFocus={ () => setOpenIndex( index ) }
              onClick={ () => setOpenIndex( index ) }
            >
              <button type="button" className="slice-button" aria-expanded={ isOpen }>
                <img className="slice-still" src={ service.still } alt="" loading="lazy" />
                { isOpen && (
                  <video className="slice-reel" src={ service.reel.src } poster={ service.reel.poster } muted autoPlay loop playsInline />
                ) }
                <span className="slice-shade" aria-hidden="true" />
                <span className="slice-label">
                  <span className="slice-name">{ service.name }</span>
                  <span className="slice-detail">{ service.detail }</span>
                </span>
              </button>
            </li>
          )
        } ) }
      </ul>
    </section>
  )
}
