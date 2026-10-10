import { useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { SERVICES_STYLES } from '../looks/lookRegistry'
import { Nav } from './sections/Nav'
import { BreakHero } from './sections/BreakHero'
import { Statement } from './sections/Statement'
import { Manifesto } from './sections/Manifesto'
import { ServicesAccordion } from './sections/ServicesAccordion'
import { ClientStack } from './sections/ClientStack'
import { Marquee } from './sections/Marquee'
import { Footer } from './sections/Footer'

gsap.registerPlugin( ScrollTrigger )

// ?tune exists on Studio2 only to pick the Design. Studio2 is its own page, so each Main option
// opens the Main site on that Services layout (?tune&services=<id>); Studio2 is the page it is on.
const TUNE_REQUESTED = typeof window !== 'undefined' && new URLSearchParams( window.location.search ).has( 'tune' )

function DesignSelect () {
  return (
    <label className="design-select" data-lenis-prevent>
      <span>Design</span>
      <select
        value="studio2"
        onChange={ ( event ) => {
          if ( event.target.value !== 'studio2' ) window.location.assign( `/?tune&services=${ event.target.value }` )
        } }
      >
        { Object.entries( SERVICES_STYLES ).map( ( [ id, label ] ) => <option value={ id } key={ id }>{ label }</option> ) }
      </select>
    </label>
  )
}

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
      { TUNE_REQUESTED && <DesignSelect /> }
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
