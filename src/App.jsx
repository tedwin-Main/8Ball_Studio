import { useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useStoryPager } from './hooks/useStoryPager'
import brandLogo from './assets/8ball-studio-logo.png'
import artigustoGelato from './assets/artigusto-gelato-facebook-official.jpg'
import ersEnergyLogo from './assets/ers-energy-logo.png'
import haruplateLogo from './assets/haruplate-logo.png'
import shopeeLogo from './assets/shopee-logo.svg'

gsap.registerPlugin( ScrollTrigger )

const STORY_PAGES = [
  { id: 'page-intro', label: 'Intro' },
  { id: 'page-shot', label: 'Shot' },
  { id: 'page-studio', label: 'Studio' },
  { id: 'page-projects', label: 'Projects' },
  { id: 'page-contact', label: 'Contact' },
]

// Stable IDs prevent the paging hook from receiving a new array every render.
const STORY_PAGE_IDS = STORY_PAGES.map( ( page ) => page.id )

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
      {/* Reuse the brand logo while ball-rig keeps the GSAP movement and rotation. */ }
      <img className="eight-ball-logo" src={ brandLogo } alt="" />
    </div>
  )
}

function App ()
{
  const rootRef = useRef( null )
  const storyRef = useRef( null )
  const [ activePage, setActivePage ] = useState( 0 )
  const { goToPage } = useStoryPager( {
    storyRef,
    pageIds: STORY_PAGE_IDS,
    activePage,
    onPageChange: setActivePage,
  } )

  useLayoutEffect( () =>
  {
    const root = rootRef.current
    const ballRig = root.querySelector( '.ball-rig' )
    const cursorDot = root.querySelector( '.cursor-dot' )
    const cursorRing = root.querySelector( '.cursor-ring' )
    let pointerFrame = 0
    let pointerX = 0
    let pointerY = 0
    let lastPointerPaint = 0
    let ballLayerIsPromoted = false
    const hasFinePointer = window.matchMedia( '(hover: hover) and (pointer: fine)' ).matches
    const moveCursorDotX = hasFinePointer
      ? gsap.quickTo( cursorDot, 'x', { duration: 0.05 } )
      : null
    const moveCursorDotY = hasFinePointer
      ? gsap.quickTo( cursorDot, 'y', { duration: 0.05 } )
      : null
    const moveCursorRingX = hasFinePointer
      ? gsap.quickTo( cursorRing, 'x', { duration: 0.12 } )
      : null
    const moveCursorRingY = hasFinePointer
      ? gsap.quickTo( cursorRing, 'y', { duration: 0.12 } )
      : null

    const getPageIndex = ( progress ) =>
      Math.min(
        STORY_PAGES.length - 1,
        Math.max(
          0,
          Math.round( progress * ( STORY_PAGES.length - 1 ) ),
        ),
      )

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
      // Store the newest pointer position even when one animation frame is already queued.
      pointerX = event.clientX
      pointerY = event.clientY

      if ( pointerFrame ) return

      pointerFrame = window.requestAnimationFrame( ( timestamp ) =>
      {
        moveCursorDotX( pointerX )
        moveCursorDotY( pointerY )
        moveCursorRingX( pointerX )
        moveCursorRingY( pointerY )

        // Repaint the large pointer-reactive gradients at 30fps instead of every frame.
        if ( timestamp - lastPointerPaint >= 33 )
        {
          root.style.setProperty( '--pointer-x', `${( pointerX / window.innerWidth ) * 100}%` )
          root.style.setProperty( '--pointer-y', `${( pointerY / window.innerHeight ) * 100}%` )
          lastPointerPaint = timestamp
        }

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
          gsap.set( [ '.final-title-line > span', '.final-meta' ], {
            autoAlpha: showStudio ? 1 : 0,
            y: 0,
            yPercent: 0,
          } )
          gsap.set( '.projects-screen', {
            autoAlpha: showProjects ? 1 : 0,
            yPercent: 0,
          } )
          gsap.set( '.projects-title-line > span', {
            autoAlpha: showProjects ? 1 : 0,
            y: 0,
            yPercent: 0,
          } )
          gsap.set( '.contact-screen', {
            autoAlpha: showContact ? 1 : 0,
            yPercent: 0,
          } )
          gsap.set( [ '.contact-title-line > span', '.contact-item' ], {
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
          gsap.set( '.final-meta', { y: 20, autoAlpha: 0 } )
          gsap.set( '.projects-screen', { autoAlpha: 0, yPercent: 8, force3D: true } )
          gsap.set( '.projects-title-line > span', { y: 0, yPercent: 115 } )
          gsap.set( '.contact-screen', { autoAlpha: 0, yPercent: 8, force3D: true } )
          gsap.set( '.contact-title-line > span', { y: 0, yPercent: 115 } )
          gsap.set( '.contact-item', { y: 20, autoAlpha: 0 } )

          const timeline = gsap.timeline( {
            scrollTrigger: {
              trigger: storyRef.current,
              start: 'top top',
              end: 'bottom bottom',
              // The pager already smooths window scroll for 1.3 seconds.
              scrub: true,
              invalidateOnRefresh: true,
              onUpdate: ( { progress } ) =>
              {
                setBallLayerPromotion( progress > 0.001 && progress < 0.999 )
                updateActivePage( progress )
              },
              onRefresh: ( { progress } ) =>
              {
                updateActivePage( progress )
              },
            },
          } )

          // Four equal timeline segments match the four scroll distances between five pages.
          timeline
            .addLabel( 'intro', 0 )

            // Intro → Shot. Stop 2 ends with the cue visible and waiting.
            .to( '.pool-table', {
              scale: 1,
              rotationX: desktop ? 8 : 4,
              duration: 0.82,
            }, 0 )
            .to( '.ball-rig', {
              scale: 1,
              x: holdX,
              y: holdY,
              rotation: 0,
              duration: 0.82,
            }, 0 )
            .to( '.hero-copy', {
              y: -36,
              autoAlpha: 0,
              duration: 0.28,
            }, 0.03 )
            .to( '.scroll-prompt', {
              y: 20,
              autoAlpha: 0,
              duration: 0.2,
            }, 0.05 )
            .to( '.camera-grid', {
              opacity: 0.38,
              duration: 0.7,
            }, 0 )
            .to( '.ball-shadow', {
              opacity: 0.58,
              scale: 1,
              duration: 0.18,
            }, 0.65 )
            .to( '.cue-stick', {
              x: 0,
              autoAlpha: 1,
              duration: 0.25,
            }, 0.73 )
            .addLabel( 'shot', 1 )

            // Shot → Studio. Complete the hit, roll, sink, and title before Stop 3.
            .to( '.cue-stick', {
              x: desktop
                ? '3.1vw'
                : compactLandscape
                  ? '3.8vw'
                  : '5.8vw',
              duration: 0.12,
            }, 1.08 )
            .to( '.ball-rig', {
              scaleX: 0.88,
              scaleY: 1.08,
              duration: 0.05,
            }, 1.17 )
            .to( '.ball-rig', {
              scaleX: 1,
              scaleY: 1,
              duration: 0.06,
            }, 1.22 )
            .to( '.impact-ring', {
              scale: 1,
              autoAlpha: 0.92,
              duration: 0.04,
            }, 1.19 )
            .to( '.impact-ring', {
              scale: 3.3,
              autoAlpha: 0,
              duration: 0.18,
            }, 1.23 )
            .to( '.strike-flash', {
              autoAlpha: 0.8,
              duration: 0.03,
            }, 1.19 )
            .to( '.strike-flash', {
              autoAlpha: 0,
              duration: 0.12,
            }, 1.22 )
            .to( '.cue-stick', {
              x: desktop
                ? '-7vw'
                : compactLandscape
                  ? '-8vw'
                  : '-12vw',
              autoAlpha: 0,
              duration: 0.18,
            }, 1.21 )
            .to( '.ball-rig', {
              x: pocketX,
              y: pocketY,
              rotation: 910,
              duration: 0.42,
            }, 1.21 )
            .to( '.ball-shadow', {
              x: pocketX,
              y: pocketY,
              scale: 0.66,
              opacity: 0.16,
              duration: 0.42,
            }, 1.21 )
            .to( '.ball-rig', {
              scale: 0.35,
              autoAlpha: 0,
              duration: 0.15,
            }, 1.58 )
            .to( '.ball-shadow', {
              autoAlpha: 0,
              duration: 0.1,
            }, 1.65 )
            .to( '.target-pocket', {
              boxShadow: '0 0 0 2px rgba(183,217,91,.56), 0 0 28px 12px rgba(183,217,91,.12)',
              duration: 0.06,
            }, 1.58 )
            .to( '.target-pocket', {
              boxShadow: '0 0 0 0 rgba(183,217,91,0), 0 0 0 0 rgba(183,217,91,0)',
              duration: 0.12,
            }, 1.64 )
            .to( '.pocket-iris', {
              scale: desktop ? 38 : 42,
              duration: 0.36,
            }, 1.62 )
            .to( '.pool-table', {
              scale: 0.84,
              duration: 0.34,
            }, 1.58 )
            .to( '.scene-interface', {
              autoAlpha: 0,
              duration: 0.3,
            }, 1.63 )
            .to( '.title-screen', {
              autoAlpha: 1,
              duration: 0.18,
            }, 1.78 )
            .to( '.final-title-line > span', {
              yPercent: 0,
              duration: 0.12,
              stagger: 0.03,
            }, 1.82 )
            .to( '.final-meta', {
              y: 0,
              autoAlpha: 1,
              duration: 0.09,
            }, 1.89 )
            .addLabel( 'studio', 2 )

            // Studio → Projects. Stop 4 ends with the project heading fully revealed.
            .to( '.projects-screen', {
              yPercent: 0,
              autoAlpha: 1,
              duration: 0.52,
            }, 2.16 )
            .to( '.title-screen', {
              scale: 0.965,
              yPercent: -2,
              autoAlpha: 0,
              duration: 0.46,
            }, 2.2 )
            .to( '.projects-title-line > span', {
              yPercent: 0,
              duration: 0.22,
              stagger: 0.04,
            }, 2.57 )
            .addLabel( 'projects', 3 )

            // Projects → Contact. Stop 5 ends with every contact item visible.
            .to( '.contact-screen', {
              yPercent: 0,
              autoAlpha: 1,
              duration: 0.56,
            }, 3.14 )
            .to( '.projects-screen', {
              scale: 0.965,
              yPercent: -2,
              autoAlpha: 0,
              duration: 0.5,
            }, 3.18 )
            .to( '.contact-title-line > span', {
              yPercent: 0,
              duration: 0.24,
              stagger: 0.04,
            }, 3.52 )
            .to( '.contact-item', {
              y: 0,
              autoAlpha: 1,
              duration: 0.2,
              stagger: 0.05,
            }, 3.67 )
            // This empty tween makes the complete timeline exactly four units long.
            .to( {}, { duration: 0.01 }, 3.99 )
            .addLabel( 'contact', 4 )
        },
      )

      return () => media.revert()
    }, root )

    return () =>
    {
      if ( pointerFrame ) window.cancelAnimationFrame( pointerFrame )
      if ( hasFinePointer ) window.removeEventListener( 'pointermove', movePointer )
      gsap.killTweensOf( [ cursorDot, cursorRing ] )
      ballRig.style.removeProperty( 'will-change' )
      animationContext.revert()
    }
  }, [] )

  // Top is an intentional direct jump, so it targets the first page index.
  const replay = () => goToPage( 0 )

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
                        {/* Keep each card label simple so the marquee reads as a clean work reel. */ }
                        <figcaption>
                          <span>{ project.alt }</span>
                        </figcaption>
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
            onClick={ () => goToPage( index ) }
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
