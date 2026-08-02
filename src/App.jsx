import { useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import brandLogo from './assets/8ball-studio-logo.png'
import artigustoGelato from './assets/artigusto-gelato-facebook-official.jpg'
import ersEnergyLogo from './assets/ers-energy-logo.png'
import haruplateLogo from './assets/haruplate-logo.png'
import shopeeLogo from './assets/shopee-logo.svg'

gsap.registerPlugin( ScrollTrigger )

const STORY_SCRUB_SECONDS = 4

const STORY_PAGES = [
  { id: 'page-intro', label: 'Intro' },
  { id: 'page-shot', label: 'Shot' },
  { id: 'page-studio', label: 'Studio' },
  { id: 'page-projects', label: 'Projects' },
  { id: 'page-contact', label: 'Contact' },
]

const PROJECT_ITEMS = [
  { src: artigustoGelato, alt: 'Artigusto Gelato', type: 'photo' },
  { src: ersEnergyLogo, alt: 'ERS Energy' },
  { src: haruplateLogo, alt: 'Haruplate' },
  { src: shopeeLogo, alt: 'Shopee' },
]

const CONTACT_ITEMS = [
  {
    icon: 'whatsapp',
    title: 'WhatsApp',
    description: '+60 12-783 7511',
    href: 'https://wa.me/60127837511',
  },
  {
    icon: 'instagram',
    title: 'Instagram',
    description: '@8ightball.studio',
    href: 'https://www.instagram.com/8ightball.studio/',
  },
  {
    icon: 'email',
    title: 'Email',
    description: '8ightball.studio@gmail.com',
    href: 'mailto:8ightball.studio@gmail.com',
  },
]

function ContactIcon ( { type } )
{
  if ( type === 'whatsapp' )
  {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5.2 18.8 6 16.1a7.7 7.7 0 1 1 2 2Z" />
        <path d="M9 8.2c.2-.4.4-.4.7-.4h.4c.2 0 .4.1.5.5l.6 1.5c.1.3.1.5-.1.7l-.5.6c-.2.2-.1.4 0 .6.6 1 1.4 1.8 2.5 2.3.2.1.4.1.6-.1l.7-.8c.2-.2.4-.2.7-.1l1.5.7c.3.2.4.3.4.5 0 .3-.2 1.2-.8 1.6-.5.4-1.2.6-2 .4-1.3-.2-2.9-1-4.3-2.4-1.1-1.1-1.9-2.4-2.1-3.5-.2-.8.5-1.7 1.2-2.1Z" />
      </svg>
    )
  }

  if ( type === 'instagram' )
  {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="4" width="16" height="16" rx="4" />
        <circle cx="12" cy="12" r="3.5" />
        <circle className="icon-fill" cx="17.3" cy="6.8" r="0.9" />
      </svg>
    )
  }

  if ( type === 'email' )
  {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3.5" y="5.5" width="17" height="13" rx="1.5" />
        <path d="m4.5 7 7.5 5.8L19.5 7" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 21s6-5.4 6-11a6 6 0 1 0-12 0c0 5.6 6 11 6 11Z" />
      <circle cx="12" cy="10" r="2.2" />
    </svg>
  )
}

function PoolTable ()
{
  const pockets = [ 'top-left', 'top-middle', 'top-right', 'bottom-left', 'bottom-middle', 'bottom-right' ]

  return (
    <div className="pool-table" aria-hidden="true">
      <div className="table-shadow" />
      <div className="table-frame">
        <div className="wood-grain" />
        <div className="felt">
          <div className="felt-light" />
          <div className="head-string" />
          <div className="foot-spot" />
          <span className="rail-sight sight-1" />
          <span className="rail-sight sight-2" />
          <span className="rail-sight sight-3" />
          <span className="rail-sight sight-4" />
          <span className="rail-sight sight-5" />
          <span className="rail-sight sight-6" />
        </div>
        { pockets.map( ( pocket ) => (
          <span
            className={ `pocket pocket-${pocket}${pocket === 'top-right' ? ' target-pocket' : ''}` }
            key={ pocket }
          />
        ) ) }
      </div>
    </div>
  )
}

function EightBall ()
{
  return (
    <div className="ball-rig" aria-hidden="true">
      <div className="eight-ball">
        <div className="ball-gloss" />
        <div className="ball-face"><span>8</span></div>
      </div>
    </div>
  )
}

function App ()
{
  const rootRef = useRef( null )
  const storyRef = useRef( null )
  const [ activePage, setActivePage ] = useState( 0 )

  useLayoutEffect( () =>
  {
    const root = rootRef.current
    const ballRig = root.querySelector( '.ball-rig' )
    let pointerFrame = 0
    let ballLayerIsPromoted = false
    const hasFinePointer = window.matchMedia( '(hover: hover) and (pointer: fine)' ).matches

    const getPageIndex = ( progress ) =>
    {
      if ( progress < 1 / 8 ) return 0
      if ( progress < 3 / 8 ) return 1
      if ( progress < 5 / 8 ) return 2
      if ( progress < 7 / 8 ) return 3
      return 4
    }

    const updateActivePage = ( progress ) =>
    {
      const nextPage = getPageIndex( progress )
      setActivePage( ( currentPage ) => ( currentPage === nextPage ? currentPage : nextPage ) )
    }

    const setBallLayerPromotion = ( active ) =>
    {
      if ( active === ballLayerIsPromoted ) return
      ballLayerIsPromoted = active
      ballRig.style.willChange = active ? 'transform, opacity' : 'auto'
    }

    const movePointer = ( event ) =>
    {
      if ( pointerFrame ) return

      pointerFrame = window.requestAnimationFrame( () =>
      {
        const x = event.clientX
        const y = event.clientY
        root.style.setProperty( '--pointer-x', `${( x / window.innerWidth ) * 100}%` )
        root.style.setProperty( '--pointer-y', `${( y / window.innerHeight ) * 100}%` )
        gsap.to( '.cursor-dot', { x, y, duration: 0.2, ease: 'expo.out', overwrite: true } )
        gsap.to( '.cursor-ring', { x, y, duration: 0.5, ease: 'expo.out', overwrite: true } )
        pointerFrame = 0
      } )
    }

    if ( hasFinePointer )
    {
      window.addEventListener( 'pointermove', movePointer, { passive: true } )
    }

    const animationContext = gsap.context( () =>
    {
      const prefersReducedMotion = window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches

      if ( prefersReducedMotion )
      {
        const showReducedPage = ( progress ) =>
        {
          const pageIndex = getPageIndex( progress )
          const showIntro = pageIndex === 0
          const showShot = pageIndex === 1
          const showStudio = pageIndex === 2
          const showProjects = pageIndex === 3
          const showContact = pageIndex === 4
          const showEndScreen = showStudio || showProjects || showContact

          updateActivePage( progress )
          gsap.set( '.pool-table', {
            xPercent: -50,
            yPercent: -50,
            scale: showIntro ? 2.5 : 1,
            rotationX: showIntro ? 0 : 5,
          } )
          gsap.set( '.ball-rig', {
            xPercent: -50,
            yPercent: -50,
            x: showIntro ? 0 : '-5vw',
            y: showIntro ? 0 : '8vh',
            scale: showIntro ? 6.25 : 1,
            autoAlpha: showEndScreen ? 0 : 1,
          } )
          gsap.set( '.ball-shadow', {
            xPercent: -50,
            yPercent: -50,
            x: '-5vw',
            y: '8vh',
            autoAlpha: showShot ? 0.55 : 0,
          } )
          gsap.set( '.cue-stick', { x: 0, rotation: -30, autoAlpha: showShot ? 1 : 0 } )
          gsap.set( [ '.impact-ring', '.strike-flash', '.pocket-iris' ], { autoAlpha: 0 } )
          gsap.set( '.hero-copy', { autoAlpha: showIntro ? 1 : 0 } )
          gsap.set( '.scroll-prompt', { autoAlpha: showIntro ? 1 : 0 } )
          gsap.set( '.scene-interface', { autoAlpha: showEndScreen ? 0 : 1 } )
          gsap.set( '.title-screen', { autoAlpha: showStudio ? 1 : 0 } )
          gsap.set( [ '.final-kicker', '.final-title-line > span', '.final-meta' ], {
            autoAlpha: showStudio ? 1 : 0,
            y: 0,
            yPercent: 0,
          } )
          gsap.set( '.projects-screen', {
            autoAlpha: showProjects ? 1 : 0,
            yPercent: 0,
          } )
          gsap.set( [ '.projects-kicker', '.projects-title-line > span' ], {
            autoAlpha: showProjects ? 1 : 0,
            y: 0,
            yPercent: 0,
          } )
          gsap.set( '.contact-screen', {
            autoAlpha: showContact ? 1 : 0,
            yPercent: 0,
          } )
          gsap.set( [ '.contact-kicker', '.contact-title-line > span', '.contact-item' ], {
            autoAlpha: showContact ? 1 : 0,
            y: 0,
            yPercent: 0,
          } )
        }

        const reducedTrigger = ScrollTrigger.create( {
          trigger: storyRef.current,
          start: 'top top',
          end: 'bottom bottom',
          invalidateOnRefresh: true,
          onUpdate: ( { progress } ) => showReducedPage( progress ),
          onRefresh: ( { progress } ) => showReducedPage( progress ),
        } )

        showReducedPage( reducedTrigger.progress )
        return
      }

      const media = gsap.matchMedia()

      media.add(
        {
          desktop: '(min-width: 769px) and (min-height: 541px)',
          compact: '(max-width: 768px), (max-height: 540px)',
          portrait: '(orientation: portrait)',
          landscape: '(orientation: landscape)',
        },
        ( context ) =>
        {
          const desktop = context.conditions.desktop
          const compactLandscape = context.conditions.compact && context.conditions.landscape
          const holdX = desktop ? '-5vw' : compactLandscape ? '-3vw' : '-7vw'
          const holdY = desktop ? '8vh' : compactLandscape ? '5vh' : '6vh'
          const pocketX = () =>
          {
            if ( desktop ) return window.innerWidth * 0.375
            if ( compactLandscape ) return window.innerWidth * 0.385 - 14
            return window.innerWidth * 0.484 - 14
          }
          const pocketY = () =>
          {
            if ( desktop ) return window.innerHeight * -0.23
            if ( compactLandscape ) return window.innerHeight * 0.05 - window.innerWidth * 0.2045
            return window.innerHeight * 0.03 - window.innerWidth * 0.348 + 8
          }

          gsap.set( '.pool-table', {
            xPercent: -50,
            yPercent: -50,
            scale: desktop ? 2.5 : compactLandscape ? 1.8 : 2.15,
            rotationX: 0,
          } )
          gsap.set( '.ball-rig', {
            xPercent: -50,
            yPercent: -50,
            scale: desktop ? 6.25 : compactLandscape ? 3.35 : 4.25,
            x: 0,
            y: 0,
            rotation: 0,
          } )
          gsap.set( '.ball-shadow', { xPercent: -50, yPercent: -50, x: holdX, y: holdY, opacity: 0 } )
          gsap.set( '.cue-stick', {
            x: desktop ? '-58vw' : compactLandscape ? '-68vw' : '-96vw',
            rotation: desktop ? -30 : compactLandscape ? -25 : -47,
            autoAlpha: 0,
          } )
          gsap.set( '.impact-ring', {
            xPercent: -50,
            yPercent: -50,
            x: holdX,
            y: holdY,
            scale: 0.25,
            autoAlpha: 0,
          } )
          gsap.set( '.pocket-iris', { xPercent: -50, yPercent: -50, scale: 0 } )
          gsap.set( '.title-screen', { autoAlpha: 0, scale: 1, yPercent: 0, force3D: true } )
          gsap.set( '.final-title-line > span', { y: 0, yPercent: 115 } )
          gsap.set( [ '.final-kicker', '.final-meta' ], { y: 20, autoAlpha: 0 } )
          gsap.set( '.projects-screen', { autoAlpha: 0, yPercent: 8, force3D: true } )
          gsap.set( '.projects-title-line > span', { y: 0, yPercent: 115 } )
          gsap.set( '.projects-kicker', { y: 20, autoAlpha: 0 } )
          gsap.set( '.contact-screen', { autoAlpha: 0, yPercent: 8, force3D: true } )
          gsap.set( '.contact-title-line > span', { y: 0, yPercent: 115 } )
          gsap.set( [ '.contact-kicker', '.contact-item' ], { y: 20, autoAlpha: 0 } )

          const timeline = gsap.timeline( {
            defaults: { ease: 'none' },
            scrollTrigger: {
              trigger: storyRef.current,
              start: 'top top',
              end: 'bottom bottom',
              scrub: STORY_SCRUB_SECONDS,
              invalidateOnRefresh: true,
              onUpdate: ( { progress } ) =>
              {
                setBallLayerPromotion( progress > 0.001 && progress < 0.999 )
                updateActivePage( progress )
              },
            },
          } )

          timeline
            .to( '.pool-table', { scale: 1, rotationX: desktop ? 8 : 4, duration: 2.15 }, 0 )
            .to( '.ball-rig', { scale: 1, x: holdX, y: holdY, rotation: 0, duration: 2.15 }, 0 )
            .to( '.hero-copy', { y: -36, autoAlpha: 0, duration: 0.7 }, 0.15 )
            .to( '.scroll-prompt', { y: 20, autoAlpha: 0, duration: 0.45 }, 0.28 )
            .to( '.camera-grid', { opacity: 0.38, duration: 1.6 }, 0 )
            .to( '.ball-shadow', { opacity: 0.58, scale: 1, duration: 0.42 }, 1.68 )
            .to( '.cue-stick', { x: 0, autoAlpha: 1, duration: 0.5, ease: 'power3.out' }, 2.45 )
            .to( '.cue-stick', { x: desktop ? '3.1vw' : compactLandscape ? '3.8vw' : '5.8vw', duration: 0.1, ease: 'power4.in' }, 3.43 )
            .to( '.impact-ring', { scale: 1, autoAlpha: 0.92, duration: 0.04 }, 3.5 )
            .to( '.impact-ring', { scale: 3.3, autoAlpha: 0, duration: 0.23, ease: 'power2.out' }, 3.54 )
            .to( '.strike-flash', { autoAlpha: 0.8, duration: 0.03 }, 3.5 )
            .to( '.strike-flash', { autoAlpha: 0, duration: 0.14 }, 3.53 )
            .to( '.cue-stick', { x: desktop ? '-7vw' : compactLandscape ? '-8vw' : '-12vw', autoAlpha: 0, duration: 0.21, ease: 'power2.out' }, 3.55 )
            .to( '.ball-rig', { scaleX: 0.88, scaleY: 1.08, duration: 0.04 }, 3.48 )
            .to( '.ball-rig', { scaleX: 1, scaleY: 1, duration: 0.05 }, 3.52 )
            .to( '.ball-rig', { x: pocketX, y: pocketY, rotation: 910, duration: 0.63, ease: 'power2.in' }, 3.54 )
            .to( '.ball-shadow', { x: pocketX, y: pocketY, scale: 0.66, opacity: 0.16, duration: 0.6, ease: 'power2.in' }, 3.54 )
            .to( '.ball-rig', { scale: 0.35, autoAlpha: 0, duration: 0.14, ease: 'power2.in' }, 4.08 )
            .to( '.ball-shadow', { autoAlpha: 0, duration: 0.1 }, 4.1 )
            .to( '.target-pocket', { boxShadow: '0 0 0 2px rgba(197,255,78,.7), 0 0 44px 20px rgba(197,255,78,.18)', duration: 0.07 }, 4.04 )
            .to( '.target-pocket', { boxShadow: '0 0 0 0 rgba(197,255,78,0), 0 0 0 0 rgba(197,255,78,0)', duration: 0.17 }, 4.15 )
            .to( '.pocket-iris', { scale: desktop ? 38 : 42, duration: 1.1, ease: 'power2.inOut' }, 4.18 )
            .to( '.scene-interface', { autoAlpha: 0, duration: 0.5, ease: 'power2.inOut' }, 4.65 )
            .to( '.pool-table', { scale: 0.84, duration: 0.85, ease: 'power2.inOut' }, 4.25 )
            .to( '.title-screen', { autoAlpha: 1, duration: 0.3, ease: 'power2.out' }, 5.2 )
            .to( '.final-kicker', { y: 0, autoAlpha: 1, duration: 0.3, ease: 'power2.out' }, 5.3 )
            .to( '.final-title-line > span', { yPercent: 0, duration: 0.45, stagger: 0.05, ease: 'power4.out' }, 5.32 )
            .to( '.final-meta', { y: 0, autoAlpha: 1, duration: 0.25, ease: 'power2.out' }, 5.75 )
            .to( '.projects-screen', { yPercent: 0, autoAlpha: 1, duration: 1.4, ease: 'power2.inOut' }, 6.5 )
            .to( '.title-screen', { scale: 0.965, yPercent: -2, autoAlpha: 0, duration: 1.1, ease: 'power2.inOut' }, 6.6 )
            .to( '.projects-kicker', { y: 0, autoAlpha: 1, duration: 0.35, ease: 'power2.out' }, 7.25 )
            .to( '.projects-title-line > span', { yPercent: 0, duration: 0.7, stagger: 0.08, ease: 'power4.out' }, 7.3 )
            .to( '.contact-screen', { yPercent: 0, autoAlpha: 1, duration: 1.7, ease: 'power2.inOut' }, 9.3 )
            .to( '.projects-screen', { scale: 0.965, yPercent: -2, autoAlpha: 0, duration: 1.2, ease: 'power2.inOut' }, 9.4 )
            .to( '.contact-kicker', { y: 0, autoAlpha: 1, duration: 0.55, ease: 'power2.out' }, 10.25 )
            .to( '.contact-title-line > span', { yPercent: 0, duration: 0.7, stagger: 0.08, ease: 'power4.out' }, 10.3 )
            .to( '.contact-item', { y: 0, autoAlpha: 1, duration: 0.65, stagger: 0.12, ease: 'power2.out' }, 11.1 )
            .to( {}, { duration: 0.2 }, 11.8 )
        },
      )

      return () => media.revert()
    }, root )

    return () =>
    {
      if ( pointerFrame ) window.cancelAnimationFrame( pointerFrame )
      if ( hasFinePointer ) window.removeEventListener( 'pointermove', movePointer )
      ballRig.style.removeProperty( 'will-change' )
      animationContext.revert()
    }
  }, [] )

  const goToPage = ( pageId ) =>
  {
    const page = document.getElementById( pageId )
    const behavior = window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches ? 'auto' : 'smooth'
    page?.scrollIntoView( { behavior, block: 'start' } )
  }

  const replay = () => goToPage( STORY_PAGES[ 0 ].id )

  return (
    <main className="experience" ref={ rootRef }>
      <section className="story" ref={ storyRef } aria-label="Interactive 8 Ball Studio introduction">
        <div className="story-pages" aria-hidden="true">
          { STORY_PAGES.map( ( page ) => <div className="story-page" id={ page.id } key={ page.id } /> ) }
        </div>

        <div className="stage">
          <div className="camera-grid" aria-hidden="true" />
          <div className="ambient ambient-one" aria-hidden="true" />
          <div className="ambient ambient-two" aria-hidden="true" />

          <PoolTable />
          <div className="ball-shadow" aria-hidden="true" />
          <div className="cue-stick" aria-hidden="true"><span className="cue-mark">8BS</span></div>
          <EightBall />
          <div className="impact-ring" aria-hidden="true" />
          <div className="strike-flash" aria-hidden="true" />
          <div className="pocket-iris" aria-hidden="true" />

          <header className="site-header">
            <a className="wordmark" href="#top" onClick={ ( event ) => { event.preventDefault(); replay() } } aria-label="8 Ball Studio — return to start">
              <img className="brand-logo" src={ brandLogo } alt="8 Ball Studio" />
            </a>
            <div className="header-meta">
              <button className="top-link" onClick={ replay } type="button" aria-label="Go back to top of page">
                Top
              </button>
            </div>
          </header>

          <div className="scene-interface">
            <div className="hero-copy">
              <h1>Roll with us.</h1>
              <p className="hero-note">Social Content Management.<br />Video &amp; Photography.<br />Graphic Design.</p>
            </div>

            <div className="scroll-prompt">
              <span className="scroll-icon"><span /></span>
              <p>Scroll<br />to break</p>
            </div>
          </div>

          <section className="title-screen" aria-labelledby="studio-title">
            <div className="final-orbit orbit-one" aria-hidden="true" />
            <div className="final-orbit orbit-two" aria-hidden="true" />
            <div className="final-content">
              <p className="final-kicker"><span /> The table is open</p>
              <h2 id="studio-title" className="final-title" aria-label="8 Ball Studio">
                <span className="final-title-line"><span>8 Ball</span></span>
                <span className="final-title-line final-title-indent"><span>Studio</span></span>
              </h2>
              <div className="final-footer">
                <p className="final-meta">Greater Kuala Lumpur, Malaysia</p>
              </div>
            </div>
          </section>

          <section className="projects-screen" aria-labelledby="projects-title">
            <div className="projects-content">
              <p className="projects-kicker"><span /> Selected work</p>
              <h2 id="projects-title" className="projects-title">
                <span className="projects-title-line"><span>Our</span></span>
                <span className="projects-title-line projects-title-indent"><span>Projects</span></span>
              </h2>
            </div>
            <div className="projects-marquee" aria-label="Our projects">
              <div className="projects-track">
                { [ 0, 1 ].map( ( groupIndex ) => (
                  <div className="projects-group" aria-hidden={ groupIndex === 1 } key={ groupIndex }>
                    { PROJECT_ITEMS.map( ( project ) => (
                      <figure className={ `project-card${project.type ? ` is-${project.type}` : ''}` } key={ project.alt }>
                        <img src={ project.src } alt={ project.alt } />
                      </figure>
                    ) ) }
                  </div>
                ) ) }
              </div>
            </div>
          </section>

          <section className="contact-screen" aria-labelledby="contact-title">
            <div className="contact-orbit" aria-hidden="true" />
            <div className="contact-content">
              <p className="contact-kicker"><span /> Get in touch</p>
              <h2 id="contact-title" className="contact-title">
                <span className="contact-title-line"><span>Contact</span></span>
                <span className="contact-title-line contact-title-indent"><span>Us</span></span>
              </h2>
              <div className="contact-list">
                { CONTACT_ITEMS.map( ( item ) =>
                {
                  const Item = item.href ? 'a' : 'div'

                  return (
                    <Item
                      className="contact-item"
                      href={ item.href }
                      target={ item.href ? '_blank' : undefined }
                      rel={ item.href ? 'noreferrer' : undefined }
                      key={ item.title }
                    >
                      <span className="contact-icon"><ContactIcon type={ item.icon } /></span>
                      <span>
                        <h3>{ item.title }</h3>
                        <p>{ item.description }</p>
                      </span>
                    </Item>
                  )
                } ) }
              </div>
            </div>
          </section>

          <div className="cursor-dot" aria-hidden="true" />
          <div className="cursor-ring" aria-hidden="true" />
        </div>
      </section>

      <nav className="page-dots" aria-label="Story page navigation">
        { STORY_PAGES.map( ( page, index ) => (
          <button
            className={ `page-dot${activePage === index ? ' is-active' : ''}` }
            type="button"
            aria-label={ `Go to ${page.label} page` }
            aria-current={ activePage === index ? 'page' : undefined }
            onClick={ () => goToPage( page.id ) }
            key={ page.id }
          >
            <span>{ page.label }</span>
          </button>
        ) ) }
      </nav>
    </main>
  )
}

export default App
