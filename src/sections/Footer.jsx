import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { CONTACT_CHANNELS, PRIMARY_CONTACT } from '../content'

// Action: one massive call to action, then the links and the footer row.
// The primary button is lime with ink text; the secondary ones are outlined with cream text.
export function Footer() {
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

  return (
    <footer className="footer" id="footer">
      {/* id="contact" lives here now: the Nav's Contact link points at this call to action. */}
      <div className="section footer-cta" id="contact">
        <h2 className="cta-title" ref={ titleRef }>Send us the brief.</h2>
        <div className="cta-actions">
          <a className="btn btn-lime btn-xl" href={ PRIMARY_CONTACT.href } target="_blank" rel="noreferrer">
            { PRIMARY_CONTACT.label }
          </a>
          { CONTACT_CHANNELS.map( ( channel ) => (
            <a key={ channel.title } className="btn btn-outline btn-xl" href={ channel.href } target="_blank" rel="noreferrer">
              { channel.title }
            </a>
          ) ) }
        </div>
      </div>
      <div className="footer-row">
        <p>8ightBall Studio, Kuala Lumpur, Malaysia</p>
        <p>&copy; { new Date().getFullYear() } 8ightBall Studio</p>
      </div>
    </footer>
  )
}
