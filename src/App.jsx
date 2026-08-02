import { useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const STORY_PAGES = [
  { id: 'page-intro', label: 'Intro' },
  { id: 'page-table', label: 'Pool table' },
  { id: 'page-studio', label: 'Studio' },
  { id: 'page-contact', label: 'Contact' },
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
  { icon: 'location', title: 'Kuala Lumpur', description: 'Malaysia' },
]

function ContactIcon({ type }) {
  if (type === 'whatsapp') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5.2 18.8 6 16.1a7.7 7.7 0 1 1 2 2Z" />
        <path d="M9 8.2c.2-.4.4-.4.7-.4h.4c.2 0 .4.1.5.5l.6 1.5c.1.3.1.5-.1.7l-.5.6c-.2.2-.1.4 0 .6.6 1 1.4 1.8 2.5 2.3.2.1.4.1.6-.1l.7-.8c.2-.2.4-.2.7-.1l1.5.7c.3.2.4.3.4.5 0 .3-.2 1.2-.8 1.6-.5.4-1.2.6-2 .4-1.3-.2-2.9-1-4.3-2.4-1.1-1.1-1.9-2.4-2.1-3.5-.2-.8.5-1.7 1.2-2.1Z" />
      </svg>
    )
  }

  if (type === 'instagram') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="4" width="16" height="16" rx="4" />
        <circle cx="12" cy="12" r="3.5" />
        <circle className="icon-fill" cx="17.3" cy="6.8" r="0.9" />
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

function PoolTable() {
  const pockets = ['top-left', 'top-middle', 'top-right', 'bottom-left', 'bottom-middle', 'bottom-right']

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
        {pockets.map((pocket) => (
          <span
            className={`pocket pocket-${pocket}${pocket === 'top-right' ? ' target-pocket' : ''}`}
            key={pocket}
          />
        ))}
      </div>
    </div>
  )
}

function EightBall() {
  return (
    <div className="ball-rig" aria-hidden="true">
      <div className="eight-ball">
        <div className="ball-gloss" />
        <div className="ball-face"><span>8</span></div>
      </div>
    </div>
  )
}

function App() {
  const rootRef = useRef(null)
  const storyRef = useRef(null)
  const [activePage, setActivePage] = useState(0)

  useLayoutEffect(() => {
    const root = rootRef.current
    const ballRig = root.querySelector('.ball-rig')
    let pointerFrame = 0
    let ballLayerIsPromoted = false
    const hasFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches

    const getPageIndex = (progress) => {
      if (progress < 1 / 6) return 0
      if (progress < 1 / 2) return 1
      if (progress < 5 / 6) return 2
      return 3
    }

    const updateActivePage = (progress) => {
      const nextPage = getPageIndex(progress)
      setActivePage((currentPage) => (currentPage === nextPage ? currentPage : nextPage))
    }

    const setBallLayerPromotion = (active) => {
      if (active === ballLayerIsPromoted) return
      ballLayerIsPromoted = active
      ballRig.style.willChange = active ? 'transform, opacity' : 'auto'
    }

    const movePointer = (event) => {
      if (pointerFrame) return

      pointerFrame = window.requestAnimationFrame(() => {
        const x = event.clientX
        const y = event.clientY
        root.style.setProperty('--pointer-x', `${(x / window.innerWidth) * 100}%`)
        root.style.setProperty('--pointer-y', `${(y / window.innerHeight) * 100}%`)
        gsap.to('.cursor-dot', { x, y, duration: 0.12, ease: 'power2.out', overwrite: true })
        gsap.to('.cursor-ring', { x, y, duration: 0.42, ease: 'power3.out', overwrite: true })
        pointerFrame = 0
      })
    }

    if (hasFinePointer) {
      window.addEventListener('pointermove', movePointer, { passive: true })
    }

    const animationContext = gsap.context(() => {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

      if (prefersReducedMotion) {
        const showReducedPage = (progress) => {
          const pageIndex = getPageIndex(progress)
          const showIntro = pageIndex === 0
          const showStudio = pageIndex === 2
          const showContact = pageIndex === 3
          const showEndScreen = showStudio || showContact

          updateActivePage(progress)
          gsap.set('.pool-table', {
            xPercent: -50,
            yPercent: -50,
            scale: showIntro ? 2.5 : 1,
            rotationX: showIntro ? 0 : 5,
          })
          gsap.set('.ball-rig', {
            xPercent: -50,
            yPercent: -50,
            x: showIntro ? 0 : '-5vw',
            y: showIntro ? 0 : '8vh',
            scale: showIntro ? 6.25 : 1,
            autoAlpha: showEndScreen ? 0 : 1,
          })
          gsap.set('.ball-shadow', {
            xPercent: -50,
            yPercent: -50,
            x: '-5vw',
            y: '8vh',
            autoAlpha: showIntro || showEndScreen ? 0 : 0.55,
          })
          gsap.set(['.cue-stick', '.impact-ring', '.strike-flash', '.pocket-iris'], { autoAlpha: 0 })
          gsap.set('.hero-copy', { autoAlpha: showIntro ? 1 : 0 })
          gsap.set('.scroll-prompt', { autoAlpha: showIntro ? 1 : 0 })
          gsap.set('.scene-interface', { autoAlpha: showEndScreen ? 0 : 1 })
          gsap.set('.title-screen', { autoAlpha: showStudio ? 1 : 0 })
          gsap.set(['.final-kicker', '.final-title-line > span', '.final-meta'], {
            autoAlpha: showStudio ? 1 : 0,
            y: 0,
            yPercent: 0,
          })
          gsap.set('.contact-screen', { autoAlpha: showContact ? 1 : 0 })
          gsap.set(['.contact-kicker', '.contact-title-line > span', '.contact-item'], {
            autoAlpha: showContact ? 1 : 0,
            y: 0,
            yPercent: 0,
          })
        }

        const reducedTrigger = ScrollTrigger.create({
          trigger: storyRef.current,
          start: 'top top',
          end: 'bottom bottom',
          invalidateOnRefresh: true,
          onUpdate: ({ progress }) => showReducedPage(progress),
          onRefresh: ({ progress }) => showReducedPage(progress),
        })

        showReducedPage(reducedTrigger.progress)
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
        (context) => {
          const desktop = context.conditions.desktop
          const compactLandscape = context.conditions.compact && context.conditions.landscape
          const holdX = desktop ? '-5vw' : compactLandscape ? '-3vw' : '-7vw'
          const holdY = desktop ? '8vh' : compactLandscape ? '5vh' : '6vh'
          const pocketX = () => {
            if (desktop) return window.innerWidth * 0.375
            if (compactLandscape) return window.innerWidth * 0.385 - 14
            return window.innerWidth * 0.484 - 14
          }
          const pocketY = () => {
            if (desktop) return window.innerHeight * -0.23
            if (compactLandscape) return window.innerHeight * 0.05 - window.innerWidth * 0.2045
            return window.innerHeight * 0.03 - window.innerWidth * 0.348 + 8
          }

          gsap.set('.pool-table', {
            xPercent: -50,
            yPercent: -50,
            scale: desktop ? 2.5 : compactLandscape ? 1.8 : 2.15,
            rotationX: 0,
          })
          gsap.set('.ball-rig', {
            xPercent: -50,
            yPercent: -50,
            scale: desktop ? 6.25 : compactLandscape ? 3.35 : 4.25,
            x: 0,
            y: 0,
            rotation: 0,
          })
          gsap.set('.ball-shadow', { xPercent: -50, yPercent: -50, x: holdX, y: holdY, opacity: 0 })
          gsap.set('.cue-stick', {
            x: desktop ? '-58vw' : compactLandscape ? '-68vw' : '-96vw',
            rotation: desktop ? -30 : compactLandscape ? -25 : -47,
            autoAlpha: 0,
          })
          gsap.set('.impact-ring', {
            xPercent: -50,
            yPercent: -50,
            x: holdX,
            y: holdY,
            scale: 0.25,
            autoAlpha: 0,
          })
          gsap.set('.pocket-iris', { xPercent: -50, yPercent: -50, scale: 0 })
          gsap.set('.title-screen', { autoAlpha: 0 })
          gsap.set('.final-title-line > span', { yPercent: 115 })
          gsap.set(['.final-kicker', '.final-meta'], { y: 20, autoAlpha: 0 })
          gsap.set('.contact-screen', { autoAlpha: 0 })
          gsap.set('.contact-title-line > span', { yPercent: 115 })
          gsap.set(['.contact-kicker', '.contact-item'], { y: 20, autoAlpha: 0 })

          const timeline = gsap.timeline({
            defaults: { ease: 'none' },
            scrollTrigger: {
              trigger: storyRef.current,
              start: 'top top',
              end: 'bottom bottom',
              scrub: 0.65,
              invalidateOnRefresh: true,
              onUpdate: ({ progress }) => {
                setBallLayerPromotion(progress > 0.001 && progress < 0.999)
                updateActivePage(progress)
              },
            },
          })

          timeline
            .to('.pool-table', { scale: 1, rotationX: desktop ? 8 : 4, duration: 4.35 }, 0)
            .to('.ball-rig', { scale: 1, x: holdX, y: holdY, rotation: 0, duration: 4.35 }, 0)
            .to('.hero-copy', { y: -36, autoAlpha: 0, duration: 1.35 }, 0.3)
            .to('.scroll-prompt', { y: 20, autoAlpha: 0, duration: 0.9 }, 0.55)
            .to('.camera-grid', { opacity: 0.38, duration: 3.2 }, 0)
            .to('.ball-shadow', { opacity: 0.58, scale: 1, duration: 0.85 }, 3.35)
            .to('.cue-stick', { x: 0, autoAlpha: 1, duration: 0.95, ease: 'power3.out' }, 5.2)
            .to('.cue-stick', { x: desktop ? '3.1vw' : compactLandscape ? '3.8vw' : '5.8vw', duration: 0.2, ease: 'power4.in' }, 6.15)
            .to('.impact-ring', { scale: 1, autoAlpha: 0.92, duration: 0.08 }, 6.3)
            .to('.impact-ring', { scale: 3.3, autoAlpha: 0, duration: 0.45, ease: 'power2.out' }, 6.38)
            .to('.strike-flash', { autoAlpha: 0.8, duration: 0.05 }, 6.3)
            .to('.strike-flash', { autoAlpha: 0, duration: 0.27 }, 6.35)
            .to('.cue-stick', { x: desktop ? '-7vw' : compactLandscape ? '-8vw' : '-12vw', autoAlpha: 0, duration: 0.42, ease: 'power2.out' }, 6.4)
            .to('.ball-rig', { scaleX: 0.88, scaleY: 1.08, duration: 0.08 }, 6.26)
            .to('.ball-rig', { scaleX: 1, scaleY: 1, duration: 0.1 }, 6.34)
            .to('.ball-rig', { x: pocketX, y: pocketY, rotation: 910, duration: 1.25, ease: 'power2.in' }, 6.38)
            .to('.ball-shadow', { x: pocketX, y: pocketY, scale: 0.66, opacity: 0.16, duration: 1.2, ease: 'power2.in' }, 6.38)
            .to('.ball-rig', { scale: 0.35, autoAlpha: 0, duration: 0.28, ease: 'power2.in' }, 7.45)
            .to('.ball-shadow', { autoAlpha: 0, duration: 0.18 }, 7.47)
            .to('.target-pocket', { boxShadow: '0 0 0 2px rgba(197,255,78,.7), 0 0 44px 20px rgba(197,255,78,.18)', duration: 0.14 }, 7.37)
            .to('.target-pocket', { boxShadow: '0 0 0 0 rgba(197,255,78,0), 0 0 0 0 rgba(197,255,78,0)', duration: 0.34 }, 7.59)
            .to('.pocket-iris', { scale: desktop ? 38 : 42, duration: 1.15, ease: 'power3.inOut' }, 7.68)
            .to('.scene-interface', { autoAlpha: 0, duration: 0.32 }, 8.02)
            .to('.pool-table', { scale: 0.84, duration: 0.65 }, 7.78)
            .to('.title-screen', { autoAlpha: 1, duration: 0.01 }, 8.72)
            .to('.final-kicker', { y: 0, autoAlpha: 1, duration: 0.42, ease: 'power2.out' }, 8.75)
            .to('.final-title-line > span', { yPercent: 0, duration: 0.65, stagger: 0.08, ease: 'power4.out' }, 8.76)
            .to('.final-meta', { y: 0, autoAlpha: 1, duration: 0.42, ease: 'power2.out' }, 9.25)
            .to('.title-screen', { autoAlpha: 0, duration: 0.75, ease: 'power2.inOut' }, 11.15)
            .to('.contact-screen', { autoAlpha: 1, duration: 0.01 }, 11.78)
            .to('.contact-kicker', { y: 0, autoAlpha: 1, duration: 0.45, ease: 'power2.out' }, 11.82)
            .to('.contact-title-line > span', { yPercent: 0, duration: 0.72, stagger: 0.08, ease: 'power4.out' }, 11.86)
            .to('.contact-item', { y: 0, autoAlpha: 1, duration: 0.5, stagger: 0.12, ease: 'power2.out' }, 12.72)
            .to({}, { duration: 0.2 }, 14.8)
        },
      )

      return () => media.revert()
    }, root)

    return () => {
      if (pointerFrame) window.cancelAnimationFrame(pointerFrame)
      if (hasFinePointer) window.removeEventListener('pointermove', movePointer)
      ballRig.style.removeProperty('will-change')
      animationContext.revert()
    }
  }, [])

  const goToPage = (pageId) => {
    const page = document.getElementById(pageId)
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
    page?.scrollIntoView({ behavior, block: 'start' })
  }

  const replay = () => goToPage(STORY_PAGES[0].id)

  return (
    <main className="experience" ref={rootRef}>
      <section className="story" ref={storyRef} aria-label="Interactive 8 Ball Studio introduction">
        <div className="story-pages" aria-hidden="true">
          {STORY_PAGES.map((page) => <div className="story-page" id={page.id} key={page.id} />)}
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

          <div className="scene-interface">
            <header className="site-header">
              <a className="wordmark" href="#top" onClick={(event) => { event.preventDefault(); replay() }} aria-label="8 Ball Studio — return to start">
                <span className="wordmark-ball">8</span>
                <span>Ball Studio</span>
              </a>
              <div className="header-meta">
                <button className="top-link" onClick={replay} type="button" aria-label="Go back to top of page">
                  Top
                </button>
              </div>
            </header>

            <div className="hero-copy">
              <h1>Make the<br />first move.</h1>
              <p className="hero-note">A studio built for ideas<br />with somewhere to go.</p>
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

          <section className="contact-screen" aria-labelledby="contact-title">
            <div className="contact-orbit" aria-hidden="true" />
            <div className="contact-content">
              <p className="contact-kicker"><span /> Get in touch</p>
              <h2 id="contact-title" className="contact-title">
                <span className="contact-title-line"><span>Contact</span></span>
                <span className="contact-title-line contact-title-indent"><span>Us</span></span>
              </h2>
              <div className="contact-list">
                {CONTACT_ITEMS.map((item) => {
                  const Item = item.href ? 'a' : 'div'

                  return (
                    <Item
                      className="contact-item"
                      href={item.href}
                      target={item.href ? '_blank' : undefined}
                      rel={item.href ? 'noreferrer' : undefined}
                      key={item.title}
                    >
                      <span className="contact-icon"><ContactIcon type={item.icon} /></span>
                      <span>
                        <h3>{item.title}</h3>
                        <p>{item.description}</p>
                      </span>
                    </Item>
                  )
                })}
              </div>
            </div>
          </section>

          <div className="cursor-dot" aria-hidden="true" />
          <div className="cursor-ring" aria-hidden="true" />
        </div>
      </section>

      <nav className="page-dots" aria-label="Story page navigation">
        {STORY_PAGES.map((page, index) => (
          <button
            className={`page-dot${activePage === index ? ' is-active' : ''}`}
            type="button"
            aria-label={`Go to ${page.label} page`}
            aria-current={activePage === index ? 'page' : undefined}
            onClick={() => goToPage(page.id)}
            key={page.id}
          >
            <span>{page.label}</span>
          </button>
        ))}
      </nav>
    </main>
  )
}

export default App
