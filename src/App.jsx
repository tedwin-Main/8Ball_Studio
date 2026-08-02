import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

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

  useLayoutEffect(() => {
    const root = rootRef.current
    let pointerFrame = 0

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

    window.addEventListener('pointermove', movePointer, { passive: true })

    const animationContext = gsap.context(() => {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

      if (prefersReducedMotion) {
        gsap.set('.pool-table', { xPercent: -50, yPercent: -50, scale: 1, rotationX: 5 })
        gsap.set('.ball-rig', { xPercent: -50, yPercent: -50, x: '-5vw', y: '8vh', scale: 1 })
        gsap.set('.ball-shadow', { xPercent: -50, yPercent: -50, x: '-5vw', y: '8vh', opacity: 0.55 })
        gsap.set('.cue-stick', { opacity: 0 })
        return
      }

      const media = gsap.matchMedia()

      media.add(
        {
          desktop: '(min-width: 769px)',
          mobile: '(max-width: 768px)',
        },
        (context) => {
          const desktop = context.conditions.desktop
          const holdX = desktop ? '-5vw' : '-7vw'
          const holdY = desktop ? '8vh' : '6vh'
          const pocketX = desktop ? '37.5vw' : '40vw'
          const pocketY = desktop ? '-23vh' : '-10vh'

          gsap.set('.pool-table', {
            xPercent: -50,
            yPercent: -50,
            scale: desktop ? 2.5 : 2.15,
            rotationX: 0,
          })
          gsap.set('.ball-rig', {
            xPercent: -50,
            yPercent: -50,
            scale: desktop ? 6.25 : 4.25,
            x: 0,
            y: 0,
            rotation: 0,
          })
          gsap.set('.ball-shadow', { xPercent: -50, yPercent: -50, x: holdX, y: holdY, opacity: 0 })
          gsap.set('.cue-stick', {
            x: desktop ? '-58vw' : '-96vw',
            rotation: desktop ? -30 : -47,
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

          const timeline = gsap.timeline({
            defaults: { ease: 'none' },
            scrollTrigger: {
              trigger: storyRef.current,
              start: 'top top',
              end: () => `+=${window.innerHeight * (desktop ? 5.6 : 5.1)}`,
              pin: true,
              scrub: 0.8,
              anticipatePin: 1,
              invalidateOnRefresh: true,
            },
          })

          timeline
            .to('.pool-table', { scale: 1, rotationX: desktop ? 8 : 4, duration: 2.35 }, 0)
            .to('.ball-rig', { scale: 1, x: holdX, y: holdY, rotation: 0, duration: 2.35 }, 0)
            .to('.hero-copy', { y: -36, autoAlpha: 0, duration: 0.85 }, 0.2)
            .to('.scroll-prompt', { y: 20, autoAlpha: 0, duration: 0.6 }, 0.4)
            .to('.camera-grid', { opacity: 0.38, duration: 1.7 }, 0)
            .to('.ball-shadow', { opacity: 0.58, scale: 1, duration: 0.7 }, 1.35)
            .to('.cue-stick', { x: 0, autoAlpha: 1, duration: 1.05, ease: 'power3.out' }, 2.3)
            .to('.cue-stick', { x: desktop ? '3.1vw' : '5.8vw', duration: 0.22, ease: 'power4.in' }, 3.38)
            .to('.impact-ring', { scale: 1, autoAlpha: 0.92, duration: 0.08 }, 3.54)
            .to('.impact-ring', { scale: 3.3, autoAlpha: 0, duration: 0.52, ease: 'power2.out' }, 3.62)
            .to('.strike-flash', { autoAlpha: 0.8, duration: 0.05 }, 3.54)
            .to('.strike-flash', { autoAlpha: 0, duration: 0.3 }, 3.59)
            .to('.cue-stick', { x: desktop ? '-7vw' : '-12vw', autoAlpha: 0, duration: 0.48, ease: 'power2.out' }, 3.64)
            .to('.ball-rig', { scaleX: 0.88, scaleY: 1.08, duration: 0.08 }, 3.5)
            .to('.ball-rig', { scaleX: 1, scaleY: 1, duration: 0.1 }, 3.58)
            .to('.ball-rig', { x: pocketX, y: pocketY, rotation: 910, duration: 1.42, ease: 'power2.in' }, 3.62)
            .to('.ball-shadow', { x: pocketX, y: pocketY, scale: 0.66, opacity: 0.16, duration: 1.36, ease: 'power2.in' }, 3.62)
            .to('.ball-rig', { scale: 0.35, autoAlpha: 0, duration: 0.3, ease: 'power2.in' }, 4.82)
            .to('.ball-shadow', { autoAlpha: 0, duration: 0.2 }, 4.84)
            .to('.target-pocket', { boxShadow: '0 0 0 2px rgba(197,255,78,.7), 0 0 44px 20px rgba(197,255,78,.18)', duration: 0.16 }, 4.72)
            .to('.target-pocket', { boxShadow: '0 0 0 0 rgba(197,255,78,0), 0 0 0 0 rgba(197,255,78,0)', duration: 0.38 }, 4.94)
            .to('.pocket-iris', { scale: desktop ? 38 : 42, duration: 1.25, ease: 'power3.inOut' }, 4.96)
            .to('.scene-interface', { autoAlpha: 0, duration: 0.35 }, 5.24)
            .to('.pool-table', { scale: 0.84, duration: 0.7 }, 5.05)
            .to('.title-screen', { autoAlpha: 1, duration: 0.01 }, 5.74)
            .to('.final-kicker', { y: 0, autoAlpha: 1, duration: 0.46, ease: 'power2.out' }, 5.77)
            .to('.final-title-line > span', { yPercent: 0, duration: 0.72, stagger: 0.1, ease: 'power4.out' }, 5.78)
            .to('.final-meta', { y: 0, autoAlpha: 1, duration: 0.48, ease: 'power2.out' }, 6.12)
            .to({}, { duration: 0.6 })
        },
      )

      return () => media.revert()
    }, root)

    return () => {
      if (pointerFrame) window.cancelAnimationFrame(pointerFrame)
      window.removeEventListener('pointermove', movePointer)
      animationContext.revert()
    }
  }, [])

  const replay = () => window.scrollTo({ top: 0, behavior: 'smooth' })

  return (
    <main className="experience" ref={rootRef}>
      <section className="story" ref={storyRef} aria-label="Interactive 8 Ball Studio introduction">
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

          <div className="cursor-dot" aria-hidden="true" />
          <div className="cursor-ring" aria-hidden="true" />
        </div>
      </section>
    </main>
  )
}

export default App
