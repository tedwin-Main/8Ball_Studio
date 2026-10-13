/**
 * FILE: src/App.jsx
 * PURPOSE: root shell, Lenis scroll controller, layout variants, section tree
 * UI: Site > Root Shell
 * USED BY: src/main.jsx
 * KEY EXPORTS: default (App)
 */

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
import { normalizeNavStyle, normalizeServicesStyle } from './servicesStyle'

gsap.registerPlugin( ScrollTrigger )

// ?tune is review panel: adds Services select. ?services=<id> picks layout directly
const TUNE_REQUESTED = new URLSearchParams( window.location.search ).has( 'tune' )
const getInitialServicesStyle = () => normalizeServicesStyle( new URLSearchParams( window.location.search ).get( 'services' ) )
const getInitialNavStyle = () => normalizeNavStyle( new URLSearchParams( window.location.search ).get( 'nav' ) )

// Lenis scroll glide weighting
const RAMP = 0.2
const K = 3 / ( 2 * RAMP + RAMP ** 2 )
const easeGlide = ( t ) => {
  if ( t < RAMP ) return K * t * t
  const start = K * RAMP * RAMP
  return start + ( 1 - start ) * ( 1 - ( 1 - ( t - RAMP ) / ( 1 - RAMP ) ) ** 3 )
}
// glide length scales with distance
const glideSeconds = ( distance ) => Math.min( 4.5, Math.max( 1.2, 0.9 + distance / 2500 ) )

// Site > Root Shell > App: root container and Lenis scroll engine
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

  const [ navStyle, setNavStyle ] = useState( getInitialNavStyle )

  // ?tune nav draft: same URL-in-step trick as the Services select.
  const switchNavStyle = ( next ) => {
    const style = normalizeNavStyle( next )
    const url = new URL( window.location.href )
    url.searchParams.set( 'nav', style )
    window.history.replaceState( {}, '', `${ url.pathname }${ url.search }${ url.hash }` )
    setNavStyle( style )
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
      // negative offset keeps fixed nav pill clear of target heading
      const offset = target === 0 ? 0 : -88
      const targetY = target === 0 ? 0 : target.getBoundingClientRect().top + lenis.scroll + offset
      lenis.scrollTo( target, { offset, duration: glideSeconds( Math.abs( targetY - lenis.scroll ) ), easing: easeGlide } )
      // keep URL in step
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
      <Nav align={ navStyle } />
      <BreakHero />
      <Statement />
      <Manifesto />
      { servicesStyle === 'accordion'
        ? <ServicesAccordion />
        // The flat drums: one layout per ?tune choice, keyed so each mounts its own scroll triggers.
        : <ServicesDrum key={ servicesStyle } variant={ servicesStyle } /> }
      <ClientLoop />
      { TUNE_REQUESTED && <TuneSelect value={ servicesStyle } onChange={ switchServicesStyle } navValue={ navStyle } onNavChange={ switchNavStyle } /> }
      <Marquee />
      <Footer />
    </main>
  )
}
