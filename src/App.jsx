import { useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { Nav } from './sections/Nav'
import { BreakHero } from './sections/BreakHero'
import { Statement } from './sections/Statement'
import { Manifesto } from './sections/Manifesto'
import { ServicesAccordion } from './sections/ServicesAccordion'
import { ClientStack } from './sections/ClientStack'
import { Marquee } from './sections/Marquee'
import { Footer } from './sections/Footer'

gsap.registerPlugin( ScrollTrigger )

// Page shell. The break (Attention) is the hero; the rest is Interest, Desire and Action.
export default function App() {
  useEffect( () => {
    // Lenis gives the page a weighted smooth scroll. Its position feeds ScrollTrigger and the GSAP ticker drives it.
    // Reduced-motion visitors keep native scroll.
    if ( window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches ) return undefined
    const lenis = new Lenis( { lerp: 0.1 } )
    lenis.on( 'scroll', ScrollTrigger.update )
    const tick = ( time ) => lenis.raf( time * 1000 )
    gsap.ticker.add( tick )
    gsap.ticker.lagSmoothing( 0 )
    return () => {
      gsap.ticker.remove( tick )
      lenis.destroy()
    }
  }, [] )

  return (
    <main id="top">
      <Nav />
      <BreakHero />
      <Statement />
      <Manifesto />
      <ServicesAccordion />
      <ClientStack />
      <Marquee />
      <Footer />
    </main>
  )
}
