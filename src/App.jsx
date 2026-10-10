import { useEffect, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { Nav } from './sections/Nav'
import { BreakHero } from './sections/BreakHero'
import { Statement } from './sections/Statement'
import { Manifesto } from './sections/Manifesto'
import { ServicesAccordion } from './sections/ServicesAccordion'
import { ServicesDrum } from './sections/ServicesDrum'
import { TuneSelect } from './sections/TuneSelect'
import { ClientLoop } from './sections/ClientLoop'
import { Marquee } from './sections/Marquee'
import { Footer } from './sections/Footer'
import { normalizeServicesStyle } from './servicesStyle'

gsap.registerPlugin( ScrollTrigger )

// ?tune is the review panel: it adds the Services select. ?services=<id> picks a layout directly.
const TUNE_REQUESTED = new URLSearchParams( window.location.search ).has( 'tune' )
const getInitialServicesStyle = () => normalizeServicesStyle( new URLSearchParams( window.location.search ).get( 'services' ) )

// Page shell. The break (Attention) is the hero; the rest is Interest, Desire and Action.
export default function App() {
  const [ servicesStyle, setServicesStyle ] = useState( getInitialServicesStyle )

  // Swap the Services layout and keep the URL in step, so a reload or shared link shows the same layout.
  const switchServicesStyle = ( next ) => {
    const style = normalizeServicesStyle( next )
    const url = new URL( window.location.href )
    url.searchParams.set( 'services', style )
    window.history.replaceState( {}, '', `${ url.pathname }${ url.search }${ url.hash }` )
    setServicesStyle( style )
    // The drum's scroll length changes with the layout, so ScrollTrigger must re-measure the page.
    requestAnimationFrame( () => ScrollTrigger.refresh() )
  }

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
      { servicesStyle === 'accordion'
        ? <ServicesAccordion />
        // The flat drums: one layout per ?tune choice, keyed so each mounts its own scroll triggers.
        : <ServicesDrum key={ servicesStyle } variant={ servicesStyle } /> }
      <ClientLoop />
      { TUNE_REQUESTED && <TuneSelect value={ servicesStyle } onChange={ switchServicesStyle } /> }
      <Marquee />
      <Footer />
    </main>
  )
}
