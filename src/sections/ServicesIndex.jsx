/**
 * FILE: src/sections/ServicesIndex.jsx
 * PURPOSE: services index draft: big numbered rows, hover preview follows pointer, click opens row media
 * UI: Site > Services (?services=index)
 * USED BY: src/App.jsx
 * KEY EXPORTS: ServicesIndex
 */

import { useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ArrowDownRight } from '@phosphor-icons/react'
import { SERVICES } from '../content'
import { useRiseTitle } from '../titleMotion'
import { scaleFade } from '../mediaMotion'

const pad = ( n ) => String( n + 1 ).padStart( 2, '0' )

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

// Services > Index: rows on hairlines; fine pointer gets floating reel preview, every pointer can open a row
export function ServicesIndex() {
  const rootRef = useRef( null )
  const titleRef = useRef( null )
  const previewRef = useRef( null )
  const [ hovered, setHovered ] = useState( -1 )
  const [ open, setOpen ] = useState( -1 )
  useRiseTitle( titleRef )

  // Services > Index > preview: follows pointer with lag, tilts with horizontal speed
  useLayoutEffect( () => {
    const root = rootRef.current
    const preview = previewRef.current
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
    if ( !window.matchMedia( '(hover: hover) and (pointer: fine)' ).matches ) {
      return () => {
        killFade()
        ctx.revert()
      }
    }
    gsap.set( preview, { xPercent: -50, yPercent: -50 } )
    const toX = gsap.quickTo( preview, 'x', { duration: 0.7, ease: 'power3' } )
    const toY = gsap.quickTo( preview, 'y', { duration: 0.7, ease: 'power3' } )
    const toTilt = gsap.quickTo( preview, 'rotation', { duration: 0.9, ease: 'power3' } )
    let lastX = 0
    const onMove = ( event ) => {
      toX( event.clientX )
      toY( event.clientY )
      toTilt( gsap.utils.clamp( -12, 12, ( event.clientX - lastX ) * 0.6 ) )
      lastX = event.clientX
    }
    const list = root.querySelector( '.index-list' )
    list.addEventListener( 'pointermove', onMove )
    return () => {
      list.removeEventListener( 'pointermove', onMove )
      killFade()
      ctx.revert()
    }
  }, [] )

  const active = hovered >= 0 ? SERVICES[ hovered ] : null

  return (
    <section className="section services-index" aria-labelledby="services-title" ref={ rootRef }>
      <div className="index-head">
        <h2 id="services-title" className="section-title" ref={ titleRef }>Our Services</h2>
        <p className="index-lede">Six services, one studio in Kuala Lumpur.</p>
      </div>
      <ol className="index-list" onPointerLeave={ () => setHovered( -1 ) }>
        { SERVICES.map( ( service, index ) => {
          const isOpen = open === index
          return (
            <li className={ `index-row${ isOpen ? ' is-open' : '' }` } key={ service.name } onPointerEnter={ () => setHovered( index ) }>
              <button
                type="button"
                className="index-button"
                aria-expanded={ isOpen }
                data-cursor={ isOpen ? 'Close' : 'Open' }
                onClick={ () => setOpen( isOpen ? -1 : index ) }
              >
                <span className="index-num">{ pad( index ) }</span>
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
      {/* fine pointer only (CSS): floating preview, posters stacked, slides to hovered row */}
      <div className={ `index-preview${ active && open < 0 ? ' is-on' : '' }` } ref={ previewRef } aria-hidden="true">
        <div className="index-preview-stack" style={ { '--i': Math.max( 0, hovered ) } }>
          { SERVICES.map( ( service ) => <img key={ service.name } src={ service.reel.poster } alt="" loading="lazy" decoding="async" /> ) }
        </div>
        { active && open < 0 && <video key={ active.name } className="index-preview-reel" src={ active.reel.src } muted autoPlay loop playsInline /> }
      </div>
    </section>
  )
}
