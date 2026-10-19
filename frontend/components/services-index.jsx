/**
 * FILE: frontend/components/services-index.jsx
 * PURPOSE: services index draft: big name rows, cursor shows Open/Close, click opens row media
 * UI: Site > Services (?services=index)
 * USED BY: app.jsx
 * KEY EXPORTS: ServicesIndex
 */

import { useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ArrowDownRight } from '@phosphor-icons/react'
import { SERVICES } from './site-content'
import { useRiseTitle } from './title-motion'
import { scaleFade } from './media-motion'

// Services > Index > row media: open row shows its strip (first reel plays, rest stills/posters)
function RowMedia( { service } ) {
  return (
    <div className="index-media">
      { service.media.slice( 0, 4 ).map( ( piece, i ) => (
        <figure className="index-media-tile" key={ i }>
          { piece.type === 'video' && i === 0
            ? <video src={ piece.src } poster={ piece.poster } muted autoPlay loop playsInline />
            : <img src={ piece.type === 'video' ? piece.poster : piece.src } alt="" loading="lazy" decoding="async" /> }
        </figure>
      ) ) }
    </div>
  )
}

// Services > Index: rows on hairlines; every pointer can open a row
export function ServicesIndex() {
  const rootRef = useRef( null )
  const titleRef = useRef( null )
  const [ open, setOpen ] = useState( -1 )
  useRiseTitle( titleRef )

  // Services > Index > rows: rise in on entry, list scales in and fades out with scroll
  useLayoutEffect( () => {
    const root = rootRef.current
    if ( window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches ) return undefined
    const ctx = gsap.context( () => {
      // rows rise in on entry, one after another
      gsap.from( root.querySelectorAll( '.index-row' ), {
        yPercent: 60,
        autoAlpha: 0,
        duration: 1,
        ease: 'expo.out',
        stagger: 0.07,
        scrollTrigger: { trigger: root.querySelector( '.index-list' ), start: 'top 80%' },
      } )
    }, root )
    const killFade = scaleFade( root.querySelector( '.index-list' ), { from: 0.94 } )
    return () => {
      killFade()
      ctx.revert()
    }
  }, [] )

  return (
    <section className="section services-index" id="services" aria-labelledby="services-title" ref={ rootRef }>
      <div className="index-head">
        <h2 id="services-title" className="section-title" ref={ titleRef }>Our Services</h2>
      </div>
      <ol className="index-list">
        { SERVICES.map( ( service, index ) => {
          const isOpen = open === index
          return (
            <li className={ `index-row${ isOpen ? ' is-open' : '' }` } key={ service.name }>
              <button
                type="button"
                className="index-button"
                aria-expanded={ isOpen }
                data-cursor={ isOpen ? 'Close' : 'Open' }
                onClick={ () => setOpen( isOpen ? -1 : index ) }
              >
                <span className="index-name">{ service.name }</span>
                <span className="index-detail">{ service.detail.split( '\n' )[ 0 ] }</span>
                <ArrowDownRight className="index-arrow" size={ 28 } weight="light" aria-hidden="true" />
              </button>
              <div className="index-drawer">
                <div className="index-drawer-inner">{ isOpen && <RowMedia service={ service } /> }</div>
              </div>
            </li>
          )
        } ) }
      </ol>
    </section>
  )
}
