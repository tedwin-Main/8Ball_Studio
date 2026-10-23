/**
 * FILE: frontend/components/footer.jsx
 * PURPOSE: closing call to action; grid draft adds contact columns, live clock and back-to-top
 * UI: Site > Footer (Contact)
 * USED BY: app.jsx
 * KEY EXPORTS: Footer
 */

import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ArrowUp } from '@phosphor-icons/react'
import { CONTACT_CHANNELS, PRIMARY_CONTACT, STUDIO } from './site-content'
import { RollText } from './cursor'
import { StudioClock } from './nav'

const EMAIL = CONTACT_CHANNELS.find( ( channel ) => channel.title === 'Email' )
const INSTAGRAM = CONTACT_CHANNELS.find( ( channel ) => channel.title === 'Instagram' )

// Action: one massive call to action, then the links and the footer row.
// The primary button is accent with ink text; the secondary ones are outlined with cream text.
// variant: 'grid' (contact columns + clock) or 'classic' (original single row)
export function Footer( { variant = 'grid' } ) {
  const titleRef = useRef( null )

  // One accent sweep across the heading as it arrives, pointing at the button below. The gradient's resting
  // position (index.css) is plain cream, so reduced-motion visitors simply see cream.
  useLayoutEffect( () => {
    if ( window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches ) return undefined
    const ctx = gsap.context( () => {
      gsap.fromTo( titleRef.current, { backgroundPosition: '100% 0%' }, {
        backgroundPosition: '0% 0%',
        duration: 1.6,
        ease: 'power2.inOut',
        scrollTrigger: { trigger: titleRef.current, start: 'top 75%', once: true },
      } )
    } )
    return () => ctx.revert()
  }, [] )

  const cta = (
    <div className="section footer-cta" id="contact">
      <h2 className="cta-title" ref={ titleRef }>Contact us.</h2>
      <div className="cta-actions">
        <a className="btn btn-accent btn-xl" href={ PRIMARY_CONTACT.href } target="_blank" rel="noreferrer">
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
    <footer className="footer is-grid" id="footer">
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
      <div className="footer-row">
        <p>&copy; { new Date().getFullYear() } 8ightBall Studio</p>
        <p>Made in { STUDIO.city }</p>
      </div>
    </footer>
  )
}
