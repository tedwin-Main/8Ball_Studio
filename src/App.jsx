import { useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { useStoryPager } from './hooks/useStoryPager'
import brandLogo from './assets/8ball-studio-logo.png'
import artigustoGelato from './assets/artigusto-gelato-facebook-official.jpg'
import ersEnergyLogo from './assets/ers-energy-logo.png'
import haruplateLogo from './assets/haruplate-logo.png'
import shopeeLogo from './assets/shopee-logo.svg'

gsap.registerPlugin( ScrollTrigger )

const STORY_PAGES = [
  // Scene starts activate dots; stable targets land clicks after each transition finishes.
  { id: 'page-intro', label: 'Intro', startProgress: 0, targetProgress: 0 },
  { id: 'page-studio', label: 'Studio', startProgress: 0.78 / 3, targetProgress: 1 / 3 },
  { id: 'page-projects', label: 'Projects', startProgress: 1.16 / 3, targetProgress: 2 / 3 },
  { id: 'page-contact', label: 'Contact', startProgress: 2.14 / 3, targetProgress: 1 },
]

const PROJECT_ITEMS = [
  // Keep the full circular Artigusto logo centered instead of treating it like a crop-first photo.
  { src: artigustoGelato, alt: 'Artigusto Gelato' },
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
    pages: STORY_PAGES,
    activePage,
    onPageChange: setActivePage,
  } )

  useLayoutEffect( () =>
  {
    const root = rootRef.current
    const ballRig = root.querySelector( '.ball-rig' )
    const cursorDot = root.querySelector( '.cursor-dot' )
    const cursorRing = root.querySelector( '.cursor-ring' )
    const pointerGlow = root.querySelector( '.pointer-glow' )
    let pointerFrame = 0
    let pointerX = 0
    let pointerY = 0
    let ballLayerIsPromoted = false
    const hasFinePointer = window.matchMedia( '(hover: hover) and (pointer: fine)' ).matches

    // Use low input sensitivity and a short settle window for controlled scroll response.
    const lenis = new Lenis( {
      wheelMultiplier: 0.4,
      infinite: false,
      gestureOrientation: 'vertical',
      duration: 0.4,
      easing: ( value ) => Math.min( 1, 1.001 - Math.pow( 2, -10 * value ) ),
      autoRaf: false,
      autoResize: true,
    } )

    // Expose the one scroll controller so buttons and keyboard navigation use the same physics.
    window.lenis = lenis

    const handleLenisScroll = () =>
    {
      // ScrollTrigger reads the eased Lenis position and scrubs the scene on every frame.
      ScrollTrigger.update()
    }

    const driveLenis = ( time ) =>
    {
      // GSAP ticker time is seconds; Lenis expects milliseconds.
      lenis.raf( time * 1000 )
    }

    ScrollTrigger.scrollerProxy( document.body, {
      scrollTop ( value )
      {
        if ( arguments.length ) lenis.scrollTo( value )
        return window.scrollY
      },
      getBoundingClientRect ()
      {
        return {
          top: 0,
          left: 0,
          width: window.innerWidth,
          height: window.innerHeight,
        }
      },
    } )
    lenis.on( 'scroll', handleLenisScroll )
    gsap.ticker.add( driveLenis )
    // Disable GSAP's lag smoothing so scroll physics do not jump after a delayed frame.
    gsap.ticker.lagSmoothing( 0 )
    const refreshScroll = () => ScrollTrigger.refresh()
    window.addEventListener( 'resize', refreshScroll )

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
    const movePointerGlowX = hasFinePointer
      ? gsap.quickTo( pointerGlow, 'x', { duration: 0.14, ease: 'power2.out' } )
      : null
    const movePointerGlowY = hasFinePointer
      ? gsap.quickTo( pointerGlow, 'y', { duration: 0.14, ease: 'power2.out' } )
      : null

    // Start the glow in the same centered position as the old CSS gradient.
    if ( hasFinePointer )
    {
      gsap.set( pointerGlow, {
        x: window.innerWidth * 0.5,
        y: window.innerHeight * 0.5,
      } )
    }

    const getPageIndex = ( progress ) =>
      STORY_PAGES.reduce(
        ( currentIndex, page, index ) =>
          progress >= page.startProgress ? index : currentIndex,
        0,
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

      pointerFrame = window.requestAnimationFrame( () =>
      {
        moveCursorDotX( pointerX )
        moveCursorDotY( pointerY )
        moveCursorRingX( pointerX )
        moveCursorRingY( pointerY )
        // Move one isolated layer; this avoids repainting the full stage on hover.
        movePointerGlowX( pointerX )
        movePointerGlowY( pointerY )

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
          // Reduced-motion scenes use the same entry points as their active pagination dots.
          const showIntro = progress < STORY_PAGES[ 1 ].startProgress
          const showStudio = progress >= STORY_PAGES[ 1 ].startProgress && progress < STORY_PAGES[ 2 ].startProgress
          const showProjects = progress >= STORY_PAGES[ 2 ].startProgress && progress < STORY_PAGES[ 3 ].startProgress
          const showContact = progress >= STORY_PAGES[ 3 ].startProgress
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
          // Reduced motion hides the cue because its hit timing is intentionally disabled.
          gsap.set( '.cue-stick', { autoAlpha: 0 } )
          // Reduced motion keeps the warp closed and invisible instead of leaving a black circle.
          gsap.set( '.pocket-iris', {
            xPercent: -50,
            yPercent: -50,
            scale: 0,
            autoAlpha: 0,
          } )
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
          // Keep the roll target aligned with the old top-right pocket path.
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
          // Start the cue off-screen so scroll progress controls its approach.
          gsap.set( '.cue-stick', {
            x: desktop ? '-58vw' : compactLandscape ? '-68vw' : '-96vw',
            rotation: desktop ? -30 : compactLandscape ? -25 : -47,
            autoAlpha: 0,
          } )
          // Start the black-hole iris closed at the pocket; scroll progress opens it.
          gsap.set( '.pocket-iris', {
            xPercent: -50,
            yPercent: -50,
            scale: 0,
            autoAlpha: 1,
          } )
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

          // Three timeline segments match Intro, Studio, Projects, and Contact.
          timeline
            .addLabel( 'intro', 0 )

            // Intro → Studio. Fade the opening composition into the studio title.
            .to( '.pool-table', {
              scale: 1,
              rotationX: desktop ? 8 : 4,
              duration: 0.42,
            }, 0 )
            .to( '.ball-rig', {
              scale: 1,
              x: holdX,
              y: holdY,
              rotation: 0,
              duration: 0.52,
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
            // Approach: bring the cue in while the ball settles at its table position.
            .to( '.cue-stick', {
              x: 0,
              autoAlpha: 1,
              duration: 0.18,
            }, 0.34 )
            .to( '.pool-table', {
              scale: 0.84,
              duration: 0.26,
            }, 0.42 )
            // Contact: push the cue tip into the ball, then compress the ball briefly.
            .to( '.cue-stick', {
              x: desktop
                ? '3.1vw'
                : compactLandscape
                  ? '3.8vw'
                  : '5.8vw',
              duration: 0.08,
            }, 0.54 )
            .to( '.ball-rig', {
              scaleX: 0.88,
              scaleY: 1.08,
              duration: 0.04,
            }, 0.56 )
            .to( '.ball-rig', {
              scaleX: 1,
              scaleY: 1,
              duration: 0.05,
            }, 0.6 )
            // Recoil: pull the cue away as the ball rolls toward the pocket path.
            .to( '.cue-stick', {
              x: desktop
                ? '-7vw'
                : compactLandscape
                  ? '-8vw'
                  : '-12vw',
              autoAlpha: 0,
              duration: 0.14,
            }, 0.62 )
            .to( '.ball-rig', {
              x: pocketX,
              y: pocketY,
              rotation: 910,
              duration: 0.14,
            }, 0.64 )
            .to( '.ball-rig', {
              scale: 0.35,
              autoAlpha: 0,
              duration: 0.04,
            }, 0.78 )
            // Open the black-hole iris only after the ball has fully vanished.
            .to( '.pocket-iris', {
              scale: desktop ? 38 : 42,
              duration: 0.18,
            }, 0.82 )
            .to( '.scene-interface', {
              autoAlpha: 0,
              duration: 0.2,
            }, 0.7 )
            .to( '.title-screen', {
              autoAlpha: 1,
              duration: 0.04,
            }, 0.9 )
            .to( '.final-title-line > span', {
              yPercent: 0,
              duration: 0.05,
              stagger: 0.008,
            }, 0.93 )
            .to( '.final-meta', {
              y: 0,
              autoAlpha: 1,
              duration: 0.03,
            }, 0.97 )
            .to( {}, { duration: 0.01 }, 0.99 )
            .addLabel( 'studio', 1 )

            // Studio → Projects. Reveal the project heading.
            .to( '.projects-screen', {
              yPercent: 0,
              autoAlpha: 1,
              duration: 0.52,
            }, 1.16 )
            .to( '.title-screen', {
              scale: 0.965,
              yPercent: -2,
              autoAlpha: 0,
              duration: 0.46,
            }, 1.2 )
            .to( '.projects-title-line > span', {
              yPercent: 0,
              duration: 0.22,
              stagger: 0.04,
            }, 1.57 )
            .addLabel( 'projects', 2 )

            // Projects → Contact. Reveal every contact item.
            .to( '.contact-screen', {
              yPercent: 0,
              autoAlpha: 1,
              duration: 0.56,
            }, 2.14 )
            .to( '.projects-screen', {
              scale: 0.965,
              yPercent: -2,
              autoAlpha: 0,
              duration: 0.5,
            }, 2.18 )
            .to( '.contact-title-line > span', {
              yPercent: 0,
              duration: 0.24,
              stagger: 0.04,
            }, 2.52 )
            .to( '.contact-item', {
              y: 0,
              autoAlpha: 1,
              duration: 0.2,
              stagger: 0.05,
            }, 2.67 )
            // This empty tween makes the complete timeline exactly three units long.
            .to( {}, { duration: 0.01 }, 2.99 )
            .addLabel( 'contact', 3 )
        },
      )

      return () => media.revert()
    }, root )

    return () =>
    {
      if ( pointerFrame ) window.cancelAnimationFrame( pointerFrame )
      if ( hasFinePointer ) window.removeEventListener( 'pointermove', movePointer )
      window.removeEventListener( 'resize', refreshScroll )
      lenis.off( 'scroll', handleLenisScroll )
      gsap.ticker.remove( driveLenis )
      lenis.destroy()
      ScrollTrigger.scrollerProxy( document.body, null )
      if ( window.lenis === lenis ) delete window.lenis
      gsap.killTweensOf( [ cursorDot, cursorRing, pointerGlow ] )
      ballRig.style.removeProperty( 'will-change' )
      animationContext.revert()
    }
  }, [] )

  // Top is an intentional direct jump, so it targets the first page index.
  const replay = () => goToPage( 0 )

  return (
    <main
      className={ `experience${activePage === 2 ? ' is-projects-active' : ''}` }
      ref={ rootRef }
    >
      <section className="story" ref={ storyRef } aria-label="Interactive 8 Ball Studio introduction">
        <div className="stage">
          <div className="pointer-glow" aria-hidden="true" />
          <div className="camera-grid" aria-hidden="true" />
          <div className="ambient ambient-one" aria-hidden="true" />
          <div className="ambient ambient-two" aria-hidden="true" />

          <PoolTable />
          <div className="cue-stick" aria-hidden="true"><span className="cue-mark">8BS</span></div>
          <EightBall />
          {/* Expands from the target pocket to mask the transition into Studio. */}
          <div className="pocket-iris" aria-hidden="true" />

          <header className="site-header">
            <a className="wordmark" href="#top" onClick={ ( event ) => { event.preventDefault(); replay() } } aria-label="8 Ball Studio — return to start">
              <img className="brand-logo" src={ brandLogo } alt="8 Ball Studio" />
            </a>
            <nav className="header-meta" aria-label="Page navigation">
              <a
                className="header-link"
                href="#projects"
                onClick={ ( event ) =>
                {
                  // Stop the browser jump so the pager can land on the stable Projects target.
                  event.preventDefault()
                  goToPage( 2 )
                } }
              >
                Our Projects
              </a>
              <a
                className="header-link"
                href="#contact"
                onClick={ ( event ) =>
                {
                  // Use the same Lenis motion as pagination for the stable Contact target.
                  event.preventDefault()
                  goToPage( 3 )
                } }
              >
                Contact Us
              </a>
              <button className="top-link" onClick={ replay } type="button" aria-label="Go back to top of page">
                Top
              </button>
            </nav>
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
