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
import { Cursor } from './Cursor'
import { normalizeDraft, readDrafts } from './servicesStyle'

gsap.registerPlugin( ScrollTrigger )

// ?tune is review panel: one select per draft section. ?<section>=<id> picks a draft directly
const TUNE_REQUESTED = new URLSearchParams( window.location.search ).has( 'tune' )

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
  const [ drafts, setDrafts ] = useState( () => readDrafts( window.location.search ) )

  // Site > ?tune > any select: swap one section's draft, URL kept in step so reload or shared link shows same page
  const switchDraft = ( section, next ) => {
    const value = normalizeDraft( section, next )
    const url = new URL( window.location.href )
    url.searchParams.set( section, value )
    window.history.replaceState( {}, '', `${ url.pathname }${ url.search }${ url.hash }` )
    setDrafts( ( prev ) => ( { ...prev, [ section ]: value } ) )
    // drafts differ in scroll length, so ScrollTrigger must re-measure page
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
      <Cursor />
      <Nav align={ drafts.nav } />
      <BreakHero />
      <Statement />
      <Manifesto />
      { drafts.services === 'accordion'
        ? <ServicesAccordion />
        // The flat drums: one layout per ?tune choice, keyed so each mounts its own scroll triggers.
        : <ServicesDrum key={ drafts.services } variant={ drafts.services } /> }
      <ClientLoop />
      { TUNE_REQUESTED && <TuneSelect drafts={ drafts } onChange={ switchDraft } /> }
      <Marquee />
      <Footer />
    </main>
  )
}
