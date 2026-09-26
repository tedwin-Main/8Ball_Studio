import gsap from 'gsap'

// The opening shot of the Story, played once per page load as the Intro is first shown:
// 1. The active Draft's layer settles from a slight push-in, like a camera finding its mark.
// 2. "Roll with us." rises out of its line, word by word (the titles' own mask move).
// 3. The service lines settle under it; the scroll prompt arrives last.
// Timing is in seconds from the moment the Intro starts to show (the preloader's lift).
const SHOT = Object.freeze( {
  // The settle is long and gentle (power2.out): the cover still hides the table for its first few
  // tenths of a second, so a front-loaded ease would spend the whole move out of sight.
  pushIn: 1.06,
  settleSeconds: 2.4,
  wordsAt: 0.35,
  wordSeconds: 1,
  wordStagger: 0.08,
  servicesAt: 0.6,
  promptAt: 1,
  shadowSeconds: 0.6,
} )

// The layer each Draft paints its table in. Draft 3 (Original) is drawn by the scrubbed timeline
// itself, so it has no layer to push in.
const DRAFT_LAYERS = Object.freeze( {
  cinematic: '.draft-layer-2d',
  photoreal: '.draft-layer-photoreal',
} )

// A text-shadow with every colour made fully transparent, so it can fade in to the real one.
const transparentShadow = ( shadow ) =>
  shadow.replace( /rgba?\(([^)]+)\)/g, ( _, channels ) =>
  {
    const [ r, g, b ] = channels.split( ',' ).map( ( part ) => part.trim() )
    return `rgba(${r}, ${g}, ${b}, 0)`
  } )

/**
 * Builds the opening shot inside `root` and holds every part at its start, so the call must come
 * before the first paint (a layout effect) or under a cover. Returns `play()` (runs it once; later
 * calls do nothing) and `revert()` (puts every touched element back, for unmount).
 * Only the words, the service lines, the prompt's parts and the Draft layer are touched: the
 * scrubbed Intro timeline owns `.hero-copy` and `.scroll-prompt` themselves.
 */
export function createIntroEntrance ( { root, draftId } )
{
  let played = false
  let timeline = null
  const context = gsap.context( () =>
  {
    const title = root.querySelector( '.hero-copy h1' )
    const words = gsap.utils.toArray( '.hero-word', root )
    const wordInners = gsap.utils.toArray( '.hero-word-inner', root )
    const services = gsap.utils.toArray( '.hero-services li', root )
    const prompt = gsap.utils.toArray( '.scroll-prompt > *', root )
    const layer = DRAFT_LAYERS[ draftId ] ? root.querySelector( DRAFT_LAYERS[ draftId ] ) : null

    // The words are clipped below their line only: open above and to the sides, so ascenders and
    // the title's soft shadow are never cut into boxes. The clip and the held shadow clear once
    // the words have landed.
    const restShadow = title ? getComputedStyle( title ).textShadow : 'none'
    const hasShadow = Boolean( restShadow && restShadow !== 'none' )
    gsap.set( words, { clipPath: 'inset(-100% -100% 0% -100%)' } )
    gsap.set( wordInners, { yPercent: 110 } )
    if ( hasShadow ) gsap.set( title, { textShadow: transparentShadow( restShadow ) } )
    gsap.set( services, { autoAlpha: 0, y: 14 } )
    gsap.set( prompt, { autoAlpha: 0, y: 10 } )
    if ( layer ) gsap.set( layer, { scale: SHOT.pushIn, willChange: 'transform' } )

    timeline = gsap.timeline( { paused: true } )
    if ( layer )
    {
      timeline.to( layer, { scale: 1, duration: SHOT.settleSeconds, ease: 'power2.out', clearProps: 'transform,willChange' }, 0 )
    }
    timeline
      .to( wordInners, {
        yPercent: 0,
        duration: SHOT.wordSeconds,
        ease: 'power4.out',
        stagger: SHOT.wordStagger,
        clearProps: 'transform',
      }, SHOT.wordsAt )
      .set( words, { clearProps: 'clipPath' } )
      .to( services, {
        autoAlpha: 1,
        y: 0,
        duration: 0.8,
        ease: 'power3.out',
        stagger: 0.07,
        clearProps: 'transform,opacity,visibility',
      }, SHOT.servicesAt )
      .to( prompt, {
        autoAlpha: 1,
        y: 0,
        duration: 0.6,
        ease: 'power2.out',
        stagger: 0.08,
        clearProps: 'transform,opacity,visibility',
      }, SHOT.promptAt )
    if ( hasShadow )
    {
      // Starts as the last word lands; the words' clip has already cleared.
      const shadowAt = SHOT.wordsAt + SHOT.wordSeconds + SHOT.wordStagger * Math.max( 0, wordInners.length - 1 )
      timeline.to( title, { textShadow: restShadow, duration: SHOT.shadowSeconds, ease: 'power1.out', clearProps: 'textShadow' }, shadowAt )
    }
  }, root )

  return {
    play ()
    {
      if ( played || !timeline ) return
      played = true
      timeline.play()
    },
    revert ()
    {
      context.revert()
    },
  }
}
