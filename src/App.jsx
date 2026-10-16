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
import { ServicesIndex } from './sections/ServicesIndex'
import { TuneSelect } from './sections/TuneSelect'
import { ClientLoop } from './sections/ClientLoop'
import { Marquee } from './sections/Marquee'
import { Footer } from './sections/Footer'
import { Cursor } from './Cursor'
import { Preloader } from './sections/Preloader'
import { intro, introDone } from './intro'
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
// chapter grounds: felt night, chalk day; GSAP tweens these onto :root vars
const GROUNDS = {
  felt: { '--bg': '#07110d', '--fg': '#f2f1e9', '--line': 'rgba(242, 241, 233, 0.14)' },
  chalk: { '--bg': '#f2f1e9', '--fg': '#070908', '--line': 'rgba(7, 9, 8, 0.16)' },
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
    // page holds still under preloader, released as panel lifts
    if ( !intro.done ) {
      lenis.stop()
      introDone.then( () => lenis.start() )
    }
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

  // Site > every [data-chapter] section: page ground swaps felt/chalk as chapter takes screen
  useEffect( () => {
    const root = document.documentElement
    const active = new Set()
    const paint = () => {
      const ground = active.size ? 'chalk' : 'felt'
      root.dataset.ground = ground
      gsap.to( root, { ...GROUNDS[ ground ], duration: 0.8, ease: 'power2.inOut', overwrite: true } )
    }
    const triggers = [ ...document.querySelectorAll( '[data-chapter="chalk"]' ) ].map( ( section ) => ScrollTrigger.create( {
      trigger: section,
      // swap once chapter owns most of screen, so outgoing cards never sit on wrong ground
      start: 'top 35%',
      end: 'bottom 65%',
      onToggle: ( self ) => {
        if ( self.isActive ) active.add( section )
        else active.delete( section )
        paint()
      },
    } ) )
    return () => {
      triggers.forEach( ( trigger ) => trigger.kill() )
      gsap.set( root, GROUNDS.felt )
      root.dataset.ground = 'felt'
    }
  }, [ drafts ] )

  return (
    <main id="top">
      <Preloader />
      <Cursor />
      {/* layoutKey: chapter meters re-bind when a draft swap replaces #clients or #contact */}
      <Nav align={ drafts.nav } layoutKey={ Object.values( drafts ).join( '|' ) } />
      <BreakHero />
      <Statement />
      <Manifesto variant={ drafts.manifesto } key={ drafts.manifesto } />
      { drafts.services === 'accordion' && <ServicesAccordion /> }
      { drafts.services === 'index' && <ServicesIndex /> }
      {/* flat drums: one layout per ?tune choice, keyed so each mounts its own scroll triggers */}
      { drafts.services.startsWith( 'drum' ) && <ServicesDrum key={ drafts.services } variant={ drafts.services } /> }
      <ClientLoop />
      { TUNE_REQUESTED && <TuneSelect drafts={ drafts } onChange={ switchDraft } /> }
      <Marquee />
      <Footer variant={ drafts.footer } key={ drafts.footer } />
    </main>
  )
}
