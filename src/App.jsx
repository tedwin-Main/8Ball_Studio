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

// In-page link glide, weighted like a normal Lenis scroll: a short push that builds speed (quadratic ramp over
// the first RAMP of the time), then a long cubic settle, so the arrival feels like a wheel scroll coming to rest.
// K joins the two pieces with no jump in speed. No overshoot: normal scrolling never passes its target.
const RAMP = 0.2
const K = 3 / ( 2 * RAMP + RAMP ** 2 )
const easeGlide = ( t ) => {
  if ( t < RAMP ) return K * t * t
  const start = K * RAMP * RAMP
  return start + ( 1 - start ) * ( 1 - ( 1 - ( t - RAMP ) / ( 1 - RAMP ) ) ** 3 )
}
// Glide length grows with distance (seconds): short hops stay quick, the full page caps out so it never whips past.
const glideSeconds = ( distance ) => Math.min( 4.5, Math.max( 1.2, 0.9 + distance / 2500 ) )

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

    // In-page links (nav, brand, footer) glide to their section through Lenis instead of the browser's instant jump.
    const glideToAnchor = ( event ) => {
      const link = event.target.closest?.( 'a[href^="#"]' )
      if ( !link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey ) return
      const hash = link.getAttribute( 'href' )
      const target = hash === '#' || hash === '#top' ? 0 : document.querySelector( hash )
      if ( target === null ) return
      event.preventDefault()
      const targetY = target === 0 ? 0 : target.getBoundingClientRect().top + lenis.scroll
      lenis.scrollTo( target, { duration: glideSeconds( Math.abs( targetY - lenis.scroll ) ), easing: easeGlide } )
      // Keep the URL in step, as the native jump would.
      window.history.pushState( null, '', hash )
    }
    document.addEventListener( 'click', glideToAnchor )

    return () => {
      document.removeEventListener( 'click', glideToAnchor )
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
