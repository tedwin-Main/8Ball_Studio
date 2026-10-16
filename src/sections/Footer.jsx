/**
 * FILE: src/sections/Footer.jsx
 * PURPOSE: closing call to action; wordmark draft adds contact grid, live clock, back-to-top and full-bleed rising wordmark
 * UI: Site > Footer (Contact)
 * USED BY: src/App.jsx
 * KEY EXPORTS: Footer
 */

import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { ArrowUp } from '@phosphor-icons/react'
import { CONTACT_CHANNELS, PRIMARY_CONTACT, STUDIO } from '../content'
import { RollText } from '../Cursor'
import { StudioClock } from './Nav'

gsap.registerPlugin( SplitText )

const EMAIL = CONTACT_CHANNELS.find( ( channel ) => channel.title === 'Email' )
const INSTAGRAM = CONTACT_CHANNELS.find( ( channel ) => channel.title === 'Instagram' )

// Footer > Wordmark: "8ightBall" fitted edge to edge, chars rise from masks as page bottom arrives
function Wordmark() {
  const markRef = useRef( null )

  // Footer > Wordmark > fit: font size scaled so word spans gutter to gutter at any width
  useLayoutEffect( () => {
    const mark = markRef.current
    const fit = () => {
      const frame = mark.parentElement
      const pad = window.getComputedStyle( frame )
      const room = frame.clientWidth - parseFloat( pad.paddingLeft ) - parseFloat( pad.paddingRight )
      mark.style.fontSize = '100px'
      const ratio = room / mark.getBoundingClientRect().width
      mark.style.fontSize = `${ Math.floor( 100 * ratio * 100 ) / 100 }px`
    }
    fit()
    const observer = new ResizeObserver( fit )
    observer.observe( mark.parentElement )
    // web font swap changes glyph widths after first fit
    document.fonts?.ready.then( fit )
    return () => observer.disconnect()
  }, [] )

  useLayoutEffect( () => {
    const root = document.documentElement
    // Footer > Wordmark: page-wide bottom fade lifts while wordmark is on screen, so its baseline is never fogged
    const endTrigger = ScrollTrigger.create( {
      trigger: markRef.current,
      start: 'top bottom',
      // past page end, so trigger stays active at max scroll
      end: 'bottom top',
      onToggle: ( self ) => root.classList.toggle( 'is-page-end', self.isActive ),
    } )
    if ( window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches ) {
      return () => {
        endTrigger.kill()
        root.classList.remove( 'is-page-end' )
      }
    }
    const ctx = gsap.context( () => {
      SplitText.create( markRef.current, {
        type: 'chars',
        mask: 'chars',
        aria: 'none',
        onSplit: ( split ) => gsap.from( split.chars, {
          yPercent: 105,
          ease: 'none',
          stagger: 0.06,
          scrollTrigger: { trigger: markRef.current, start: 'top bottom', end: 'bottom bottom', scrub: 0.8 },
        } ),
      } )
    } )
    return () => {
      ctx.revert()
      endTrigger.kill()
      root.classList.remove( 'is-page-end' )
    }
  }, [] )

  return (
    <div className="wordmark-frame">
      <p className="wordmark" ref={ markRef } aria-label="8ightBall">
        <span className="wordmark-eight">8</span>ightBall
      </p>
    </div>
  )
}

// Action: one massive call to action, then the links and the footer row.
// The primary button is lime with ink text; the secondary ones are outlined with cream text.
// variant: 'wordmark' (contact grid + rising wordmark finale) or 'classic' (original single row)
export function Footer( { variant = 'wordmark' } ) {
  const titleRef = useRef( null )

  // One lime sweep across the heading as it arrives, pointing at the button below. The gradient's resting
  // position (index.css) is plain cream, so reduced-motion visitors simply see cream.
  useLayoutEffect( () => {
    if ( window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches ) return undefined
    const ctx = gsap.context( () => {
      gsap.fromTo( titleRef.current, { backgroundPosition: '100% 0%' }, {
        backgroundPosition: '0% 0%',
        duration: 1.4,
        ease: 'power2.inOut',
        scrollTrigger: { trigger: titleRef.current, start: 'top 75%', once: true },
      } )
    } )
    return () => ctx.revert()
  }, [] )

  const cta = (
    <div className="section footer-cta" id="contact">
      <h2 className="cta-title" ref={ titleRef }>Send us the brief.</h2>
      <div className="cta-actions">
        <a className="btn btn-lime btn-xl" href={ PRIMARY_CONTACT.href } target="_blank" rel="noreferrer">
          <RollText>{ PRIMARY_CONTACT.label }</RollText>
        </a>
        { CONTACT_CHANNELS.map( ( channel ) => (
          <a key={ channel.title } className="btn btn-outline btn-xl" href={ channel.href } target="_blank" rel="noreferrer">
            <RollText>{ channel.title }</RollText>
          </a>
        ) ) }
      </div>
    </div>
  )

  if ( variant === 'classic' ) {
    return (
      <footer className="footer" id="footer">
        { cta }
        <div className="footer-row">
          <p>8ightBall Studio, Kuala Lumpur, Malaysia</p>
          <p>&copy; { new Date().getFullYear() } 8ightBall Studio</p>
        </div>
      </footer>
    )
  }

  return (
    <footer className="footer is-wordmark" id="footer">
      { cta }
      {/* Footer > Contact grid: talk, follow, studio (with live clock), back to top */}
      <div className="footer-grid">
        <div className="footer-col">
          <p className="footer-col-head">Talk</p>
          <a className="footer-link" href={ PRIMARY_CONTACT.href } target="_blank" rel="noreferrer"><RollText>{ PRIMARY_CONTACT.number }</RollText></a>
          <a className="footer-link" href={ EMAIL.href }><RollText>{ EMAIL.value }</RollText></a>
        </div>
        <div className="footer-col">
          <p className="footer-col-head">Follow</p>
          <a className="footer-link" href={ INSTAGRAM.href } target="_blank" rel="noreferrer"><RollText>{ INSTAGRAM.value }</RollText></a>
        </div>
        <div className="footer-col">
          <p className="footer-col-head">Studio</p>
          <p className="footer-text">{ STUDIO.region }</p>
          <StudioClock className="footer-clock" />
        </div>
        <div className="footer-col footer-col-end">
          <a className="footer-top" href="#top" data-magnet="">
            <RollText>Back to top</RollText>
            <ArrowUp size={ 16 } weight="bold" aria-hidden="true" />
          </a>
        </div>
      </div>
      <Wordmark />
      <div className="footer-row">
        <p>&copy; { new Date().getFullYear() } 8ightBall Studio</p>
        <p>Made in { STUDIO.city }</p>
      </div>
    </footer>
  )
}
