/**
 * FILE: frontend/components/break-hero.jsx
 * PURPOSE: scroll-driven pool break hero, title, scroll hint
 * UI: Site > Hero
 * USED BY: app.jsx
 * KEY EXPORTS: BreakHero
 */

import { useCallback, useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { PoolBreakScene } from './pool-break-scene'
import { STAGE } from './story-stage'
import { intro, introDone } from './intro-state'
import { useSplitTitle } from './title-motion'
import { clamp } from './math-helpers'

// Phones: the same query as the phone scroll-distance block in index.css (narrow screens and touch screens).
const PHONE_QUERY = '(max-width: 767px), (hover: none) and (pointer: coarse)'
const IS_PHONE = window.matchMedia( PHONE_QUERY ).matches
// Share of the phone swipe spent on the roll (the rest is the scatter). Desktop keeps the stage's own split
// (APPROACH_END / transitionReady, about 56%); phones reach the rack sooner, so the first swipe lands the hit.
const PHONE_ROLL_SHARE = 0.4

// Maps scroll progress (0-1) onto the break's playhead (0 → transitionReady).
const toBreakPlayhead = ( progress ) => {
  const { approachEnd, transitionReady } = STAGE.intro.draft1
  if ( !IS_PHONE ) return progress * transitionReady
  if ( progress <= PHONE_ROLL_SHARE ) return ( progress / PHONE_ROLL_SHARE ) * approachEnd
  return approachEnd + ( ( progress - PHONE_ROLL_SHARE ) / ( 1 - PHONE_ROLL_SHARE ) ) * ( transitionReady - approachEnd )
}

// Attention: the pool break is the hero. Scrolling through this tall section plays the 8-ball hitting
// the rack; the sticky stage keeps the table on screen while it plays.
export function BreakHero() {
  const sectionRef = useRef( null )
  const copyRef = useRef( null )
  const controllerRef = useRef( null )

  const titleRef = useRef( null )

  // Hero > title: chars rise out of their masks once preloader lifts; subline and cue follow
  useSplitTitle( titleRef, { type: 'chars,words', mask: 'chars' }, ( split ) => {
    const tl = gsap.timeline( { paused: !intro.done } )
      .from( split.chars, { yPercent: 115, rotate: 8, duration: 1.2, ease: 'expo.out', stagger: 0.035 } )
      .from( copyRef.current.querySelectorAll( '.break-sub, .break-hint' ), { autoAlpha: 0, y: 18, duration: 0.9, ease: 'expo.out', stagger: 0.1 }, 0.45 )
    if ( !intro.done ) introDone.then( () => tl.play() )
    return tl
  } )

  // PoolBreakScene hands its controller up on mount and null on unmount.
  const registerController = useCallback( ( controller ) => {
    controllerRef.current = controller
  }, [] )

  useLayoutEffect( () => {
    const section = sectionRef.current
    // Lenis smooths the wheel but leaves touch scroll native, so on phones the break would step with
    // every raw scroll event. Phones get a short scrub catch-up (the ball tracks the finger and stops when it
    // stops); desktop a longer one, so the ball trails the wheel and settles like a heavy object.
    const playhead = { progress: 0 }
    // One scrub drives both the break and the tail, so they share one playhead and cannot drift apart on a fast
    // scroll back up (two scrubs left the tail lagging, then it snapped to the break state).
    // Held table: the first travel minus the stage height. Tail: the last stage height, while the table scrolls off.
    const tween = gsap.to( playhead, {
      progress: 1,
      ease: 'none',
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: 'bottom top',
        scrub: IS_PHONE ? 0.25 : 0.6,
      },
      onUpdate: () => {
        const { progress } = playhead
        const stageHeight = section.querySelector( '.break-stage' ).offsetHeight
        const travel = section.offsetHeight
        const held = travel - stageHeight
        const px = progress * travel
        const breakProgress = clamp( px / held )
        // Physics ends at transitionReady; the tail picks up after it, while the table scrolls off.
        controllerRef.current?.setProgress( toBreakPlayhead( breakProgress ) )
        controllerRef.current?.setTail( clamp( ( px - held ) / stageHeight ) )
        // The title clears as the 8-ball leaves the cue, so the table reads alone.
        gsap.set( copyRef.current, { autoAlpha: 1 - clamp( breakProgress / 0.14 ), y: -36 * clamp( breakProgress / 0.14 ) } )
        // Hero > cursor hint: desktop tag beside cursor (cursor.jsx) clears with title copy
        if ( breakProgress < 0.14 ) section.dataset.cursorHint = 'Scroll to break'
        else delete section.dataset.cursorHint
      },
    } )
    return () => {
      tween.scrollTrigger?.kill()
      tween.kill()
    }
  }, [] )

  return (
    <section className="break" ref={ sectionRef } aria-label="Intro: the 8-ball breaks the rack" data-cursor-hint="Scroll to break">
      <div className="break-stage">
        <PoolBreakScene active onController={ registerController } />

        <div className="break-copy" ref={ copyRef }>
          <h1 className="break-title" ref={ titleRef }>Roll with us.</h1>
          <p className="break-sub">Video, design, web, social and AI content, made in Kuala Lumpur.</p>
          <p className="break-hint">
            <span className="break-cue" aria-hidden="true" />
            { IS_PHONE ? 'Swipe to break' : 'Scroll to break' }
          </p>
        </div>

      </div>
    </section>
  )
}
