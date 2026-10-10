import { useCallback, useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { PoolPovDraft } from '../drafts/PoolPovDraft'
import { STAGE } from '../storyStage'

const clamp = ( value ) => Math.min( 1, Math.max( 0, value ) )

// Attention: the pool break is the hero. Scrolling through this tall section plays the 8-ball hitting
// the rack; the sticky stage keeps the table on screen while it plays.
export function BreakHero() {
  const sectionRef = useRef( null )
  const copyRef = useRef( null )
  const controllerRef = useRef( null )

  // PoolPovDraft hands its controller up on mount and null on unmount.
  const registerController = useCallback( ( controller ) => {
    controllerRef.current = controller
  }, [] )

  useLayoutEffect( () => {
    const section = sectionRef.current
    // Lenis smooths the wheel but leaves touch scroll native, so on phones the break would step with
    // every raw scroll event. Touch screens get a short scrub catch-up instead; elsewhere it tracks 1:1.
    const touch = window.matchMedia( '(hover: none) and (pointer: coarse)' ).matches
    const playhead = { progress: 0 }
    // The trigger runs until the section's bottom reaches the viewport top, so the scatter keeps playing
    // while the stage scrolls away under the next section (not frozen for a full screen).
    const tween = gsap.to( playhead, {
      progress: 1,
      ease: 'none',
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: 'bottom top',
        scrub: touch ? 0.5 : true,
      },
      onUpdate: () => {
        const { progress } = playhead
        // Physics ends at transitionReady; past it the break only runs the old exit fade, so map onto that range.
        controllerRef.current?.setProgress( progress * STAGE.intro.draft1.transitionReady )
        // The title clears as the 8-ball leaves the cue, so the table reads alone.
        gsap.set( copyRef.current, { autoAlpha: 1 - clamp( progress / 0.14 ), y: -36 * clamp( progress / 0.14 ) } )
      },
    } )
    return () => {
      tween.scrollTrigger?.kill()
      tween.kill()
    }
  }, [] )

  return (
    <section className="break" ref={ sectionRef } aria-label="Intro: the 8-ball breaks the rack">
      <div className="break-stage">
        <PoolPovDraft active onController={ registerController } />

        <div className="break-copy" ref={ copyRef }>
          <h1 className="break-title" aria-label="Roll with us.">
            Roll with us.
          </h1>
          <p className="break-hint">Scroll to break</p>
        </div>

      </div>
    </section>
  )
}
