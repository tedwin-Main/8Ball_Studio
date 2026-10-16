import { useLayoutEffect } from 'react'
import gsap from 'gsap'
import { SplitText } from 'gsap/SplitText'

gsap.registerPlugin( SplitText )

// Splits a heading and runs its entrance. onSplit gets the split and returns the animation; autoSplit splits again
// when the web font lands or the width changes, and carries the animation over. Reduced-motion visitors keep the
// plain heading. The context revert restores the text and kills the triggers when the section unmounts.
export function useSplitTitle( ref, { type, mask, aria }, onSplit ) {
  useLayoutEffect( () => {
    if ( window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches ) return undefined
    const ctx = gsap.context( () => {
      SplitText.create( ref.current, { type, mask, aria, autoSplit: true, onSplit } )
    } )
    return () => ctx.revert()
  }, [] )
}

// Scroll trigger for heading entrances: plays on every entry, from below or above. restart snaps to the start
// first, so no reset on leave (a reset would blank the heading while it is still partly visible).
export function replayTrigger( trigger ) {
  return { trigger, start: 'top 85%', end: 'bottom 15%', toggleActions: 'restart none restart none' }
}

// "Our Services", in both layouts: each letter rises out of its own mask, the way drum rows slide up past the centre.
export function useRiseTitle( ref ) {
  useSplitTitle( ref, { type: 'chars', mask: 'chars' }, ( split ) =>
    gsap.from( split.chars, {
      yPercent: 110,
      rotate: 6,
      duration: 0.9,
      ease: 'expo.out',
      stagger: 0.03,
      scrollTrigger: replayTrigger( ref.current ),
    } ) )
}

// Wordmark > fit: font size scaled so word spans parent's content box (gutter to gutter) at any width
export function useFitWidth( ref ) {
  useLayoutEffect( () => {
    const el = ref.current
    const frame = el.parentElement
    const fit = () => {
      const pad = window.getComputedStyle( frame )
      const room = frame.clientWidth - parseFloat( pad.paddingLeft ) - parseFloat( pad.paddingRight )
      el.style.fontSize = '100px'
      const ratio = room / el.getBoundingClientRect().width
      el.style.fontSize = `${ Math.floor( 100 * ratio * 100 ) / 100 }px`
    }
    fit()
    const observer = new ResizeObserver( fit )
    observer.observe( frame )
    // web font swap changes glyph widths after first fit
    document.fonts?.ready.then( fit )
    return () => observer.disconnect()
  }, [] )
}
