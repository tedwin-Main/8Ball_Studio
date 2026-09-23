import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { CustomEase } from 'gsap/CustomEase'
import { useStoryPager } from './hooks/useStoryPager'
import { DraftSwitcher } from './components/DraftSwitcher'
import { PoolPovDraft } from './drafts/PoolPovDraft'
import PhotorealPoolDraft from './drafts/PhotorealPoolDraft'
import { DRAFT_IDS, normalizeDraftId, getDraftConfig } from './drafts/draftRegistry'
import { STORY_TIMING, easeWeightedProgress, toStoryProgress, toTimelineUnits } from './storyTiming'
import { getStoryPages } from './storySchedule'
// One V4 asset supplies both the header brand mark and animated 8-ball surface.
import brandLogo from './assets/8BALL-V4.jpg'
// Circular mark with real alpha outside the badge.
import artigustoGelato from './assets/Artigusto-Gelato_Clearned.webp'
import ersEnergyLogo from './assets/ers-energy-logo.png'
import haruplateLogo from './assets/haruplate-logo.png'
import shopeeLogo from './assets/shopee-logo.svg'

gsap.registerPlugin( ScrollTrigger, CustomEase )

// The one motion signature of the Cyc Wall world: a studio light snapping on fast,
// then settling with a long tail, like a tungsten head reaching full output.
CustomEase.create( 'cue', 'M0,0 C0.14,0.66 0.24,1 1,1' )

// Each Page is the same cyc wall relit from a different light position.
// Studio light spills out of the pocket the 8-ball just dropped into.
const CUE_ORIGINS = Object.freeze( {
  studio: '88% 27%',
  projects: '6% 32%',
  contact: '50% 104%',
} )
const lightsOff = ( origin ) => `circle(0% at ${origin})`
const lightsUp = ( origin ) => `circle(150% at ${origin})`

// Silhouette letters enter from their page's light: Studio's spill comes from the pocket at
// top-right, Projects' side key from the left, Contact's footlight from the floor.
const CHAR_ENTRANCES = Object.freeze( {
  studio: { xPercent: 70, skewX: -14, autoAlpha: 0 },
  projects: { xPercent: -80, skewX: 12, autoAlpha: 0 },
  contact: { yPercent: 55, scaleY: 0.4, transformOrigin: '50% 100%', autoAlpha: 0 },
} )
const CHAR_REST = { xPercent: 0, yPercent: 0, skewX: 0, scaleY: 1, autoAlpha: 1, ease: 'cue' }
// Paper tape labels are slapped on: a little oversize and twisted, then pressed flat.
const TAPE_SLAP = { autoAlpha: 0, scale: 1.14, rotation: 7 }
const TAPE_REST = { autoAlpha: 1, scale: 1, rotation: 0, ease: 'back.out(2.2)' }

// Keep the Draft 2 camera cut aligned with the shared intro timeline.
const DRAFT2_TRANSITION_READY_STORY_PROGRESS = toStoryProgress( STORY_TIMING.intro.draft2.transitionReady )
// Cut the shared 8-ball before its old pocket-drop path starts; Draft 1 keeps its original animation.
const DRAFT2_POCKET_CUT_STORY_PROGRESS = toStoryProgress( STORY_TIMING.intro.draft2.pocketCut )

const getDraft2ExitProgress = ( progress ) =>
  Math.min( 1, Math.max( 0, ( progress - DRAFT2_TRANSITION_READY_STORY_PROGRESS ) /
    STORY_TIMING.intro.draft2.transitionDurationProgress ) )

const getInitialDraft = () =>
{
  if ( typeof window === 'undefined' ) return 'cinematic'
  const requestedDraft = new URLSearchParams( window.location.search ).get( 'draft' )
  return normalizeDraftId( requestedDraft )
}

const PROJECT_ITEMS = [
  // Round badge mark: its board gives it a little more room than the wordmarks.
  { src: artigustoGelato, alt: 'Artigusto Gelato', type: 'artigusto' },
  { src: ersEnergyLogo, alt: 'ERS Energy' },
  // Pale mark drawn for dark grounds: its board is cut from gaffer.
  { src: haruplateLogo, alt: 'Haruplate', type: 'haruplate' },
  { src: shopeeLogo, alt: 'Shopee' },
]

const SERVICES = [ 'Social Content Management', 'Video & Photography', 'Graphic Design' ]

// Spike-tape colour per Page: the felt for the Intro, then each Page's gel.
const PAGE_MARKS = Object.freeze( {
  intro: 'var(--felt-mark)',
  studio: 'var(--gel-studio)',
  projects: 'var(--gel-projects)',
  contact: 'var(--gel-contact)',
} )

const CONTACT_ITEMS = [
  {
    icon: 'whatsapp',
    title: 'WhatsApp',
    description: '+60 12-783 7511',
    action: 'Message',
    href: 'https://wa.me/60127837511',
  },
  {
    icon: 'instagram',
    title: 'Instagram',
    description: '@8ightball.studio',
    action: 'Follow',
    href: 'https://www.instagram.com/8ightball.studio/',
  },
  {
    icon: 'email',
    title: 'Email',
    description: '8ightball.studio@gmail.com',
    action: 'Write',
    href: 'mailto:8ightball.studio@gmail.com',
  },
]

// One title line split into per-letter spans so each letter can be "set down" on the cyc floor.
// The parent heading carries the accessible name, so the letters stay out of the reading order.
function CueLine ( { text, className } )
{
  return (
    <span className={ className }>
      <span aria-hidden="true">
        { [ ...text ].map( ( character, index ) => (
          <span className="cue-char" key={ index }>{ character === ' ' ? ' ' : character }</span>
        ) ) }
      </span>
    </span>
  )
}

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
      {/* Reuse the V4 brand asset while ball-rig keeps its GSAP movement and rotation. */ }
      <img className="eight-ball-logo" src={ brandLogo } alt="" />
    </div>
  )
}

function App ()
{
  const rootRef = useRef( null )
  const storyRef = useRef( null )
  const draftControllersRef = useRef( {} )
  const storyProgressRef = useRef( 0 )
  const draftSwitchProgressRef = useRef( null )
  const activeDraftRef = useRef( getInitialDraft() )
  const [ activeDraft, setActiveDraft ] = useState( getInitialDraft )
  const [ activePage, setActivePage ] = useState( 'intro' )
  const [ indicatorPage, setIndicatorPage ] = useState( 'intro' )
  const storyPages = useMemo( () => getStoryPages( activeDraft ), [ activeDraft ] )

  const updateDraftProgress = useCallback( ( progress ) =>
  {
    storyProgressRef.current = progress
    // Drive only the selected intro layer; inactive layers seek when selected later.
    draftControllersRef.current[ activeDraftRef.current ]?.setProgress(
      Math.min( 1, toTimelineUnits( progress ) ),
    )
  }, [] )

  const { goToPage, seekProgress, getProgress, isTransitioning } = useStoryPager( {
    storyRef,
    pages: storyPages,
    activePage,
    onPageChange: setActivePage,
    onIndicatorPageChange: setIndicatorPage,
    onProgress: updateDraftProgress,
  } )

  const registerDraftController = useCallback( ( draftId, controller ) =>
  {
    if ( controller )
    {
      draftControllersRef.current[ draftId ] = controller
      controller.setProgress( Math.min( 1, toTimelineUnits( storyProgressRef.current ) ) )
      controller.setActive( activeDraftRef.current === draftId )
      return
    }

    delete draftControllersRef.current[ draftId ]
  }, [] )

  const registerCinematicController = useCallback(
    ( controller ) => registerDraftController( 'cinematic', controller ),
    [ registerDraftController ],
  )
  const registerPhotorealController = useCallback(
    ( controller ) => registerDraftController( 'photoreal', controller ),
    [ registerDraftController ],
  )

  const switchDraft = useCallback( ( nextDraft ) =>
  {
    if ( !DRAFT_IDS.includes( nextDraft ) ) return

    // Capture Lenis's normalized playhead before the draft-page effect can refresh it.
    const currentProgress = getProgress()
    if ( Number.isFinite( currentProgress ) ) draftSwitchProgressRef.current = currentProgress

    const url = new URL( window.location.href )
    url.searchParams.set( 'draft', nextDraft )
    // Replace only the query so changing a draft never reloads or adds history entries.
    window.history.replaceState( {}, '', `${url.pathname}${url.search}${url.hash}` )
    activeDraftRef.current = nextDraft
    setActiveDraft( nextDraft )
  }, [ getProgress ] )

  const handleWebglUnavailable = useCallback( ( draftId ) =>
  {
    const config = getDraftConfig( draftId )
    if ( activeDraftRef.current === draftId && config.fallbackId )
    {
      switchDraft( config.fallbackId )
    }
  }, [ switchDraft ] )

  useEffect( () =>
  {
    const preservedProgress = draftSwitchProgressRef.current ?? storyProgressRef.current
    draftSwitchProgressRef.current = null
    Object.entries( draftControllersRef.current ).forEach( ( [ draftId, controller ] ) =>
    {
      controller.setActive( draftId === activeDraft )
    } )

    // Seek the selected draft to the existing story position for a seamless switch.
    draftControllersRef.current[ activeDraft ]?.setProgress(
      Math.min( 1, toTimelineUnits( preservedProgress ) ),
    )

    // Reapply the shared GSAP playhead after a draft switch changes CSS visibility rules.
    let restoreFrame = 0
    const refreshFrame = window.requestAnimationFrame( () =>
    {
      ScrollTrigger.refresh()
      // ScrollTrigger can read native scroll during refresh; restore Lenis's normalized playhead afterward.
      seekProgress( preservedProgress )
      ScrollTrigger.update()
      // A refresh can measure while Lenis is still settling; one follow-up frame closes that race.
      restoreFrame = window.requestAnimationFrame( () =>
      {
        seekProgress( preservedProgress )
        ScrollTrigger.update()
      } )
    } )

    return () =>
    {
      window.cancelAnimationFrame( refreshFrame )
      if ( restoreFrame ) window.cancelAnimationFrame( restoreFrame )
    }
  }, [ activeDraft, seekProgress ] )

  useLayoutEffect( () =>
  {
    const root = rootRef.current
    const ballRig = root.querySelector( '.ball-rig' )
    let pointerFrame = 0
    let pointerX = 0
    let pointerY = 0
    let ballLayerIsPromoted = false
    const hasFinePointer = window.matchMedia( '(hover: hover) and (pointer: fine)' ).matches
    const prefersReducedMotion = window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches

    // The pointer is the studio's key light. A proxy eases toward the pointer and writes
    // --lx / --ly (percent of the viewport); CSS turns them into the wall hotspot and the
    // shadow each silhouette letter casts away from the light.
    const keyLight = { x: 30, y: 26 }
    const applyKeyLight = () =>
    {
      root.style.setProperty( '--lx', keyLight.x.toFixed( 2 ) )
      root.style.setProperty( '--ly', keyLight.y.toFixed( 2 ) )
    }
    const moveLightX = hasFinePointer && !prefersReducedMotion
      ? gsap.quickTo( keyLight, 'x', { duration: 0.9, ease: 'power3.out', onUpdate: applyKeyLight } )
      : null
    const moveLightY = hasFinePointer && !prefersReducedMotion
      ? gsap.quickTo( keyLight, 'y', { duration: 0.9, ease: 'power3.out', onUpdate: applyKeyLight } )
      : null

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
        moveLightX( ( pointerX / window.innerWidth ) * 100 )
        moveLightY( ( pointerY / window.innerHeight ) * 100 )
        pointerFrame = 0
      } )
    }

    if ( moveLightX )
    {
      window.addEventListener( 'pointermove', movePointer, { passive: true } )
    }

    const animationContext = gsap.context( () =>
    {
      if ( prefersReducedMotion )
      {
        const showReducedPage = ( progress ) =>
        {
          // Reduced-motion scenes use the same entry points as their active pagination dots.
          updateDraftProgress( progress )
          const reducedPages = getStoryPages( activeDraftRef.current )
          const studioStartProgress = reducedPages[ 1 ].startProgress
          const showIntro = progress < studioStartProgress
          const showStudio = progress >= studioStartProgress && progress < reducedPages[ 2 ].startProgress
          const showProjects = progress >= reducedPages[ 2 ].startProgress && progress < reducedPages[ 3 ].startProgress
          const showContact = progress >= reducedPages[ 3 ].startProgress
          const showEndScreen = showStudio || showProjects || showContact

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
          // Pages switch like a light being switched on: fully lit, nothing travelling.
          gsap.set( '.title-screen', { autoAlpha: showStudio ? 1 : 0, clipPath: 'none' } )
          gsap.set( '.projects-screen', { autoAlpha: showProjects ? 1 : 0, clipPath: 'none' } )
          gsap.set( '.contact-screen', { autoAlpha: showContact ? 1 : 0, clipPath: 'none' } )
          gsap.set( '.cyc-wall', { filter: 'none' } )
          gsap.set( '.cue-char', { xPercent: 0, yPercent: 0, skewX: 0, scaleY: 1, autoAlpha: 1 } )
          gsap.set( [ '.studio-floor .tape', '.final-meta', '.project-card', '.call-sheet', '.contact-item' ], {
            autoAlpha: 1,
            scale: 1,
            rotation: 0,
            rotationX: 0,
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
          // Start the black-hole iris closed at the pocket; scroll progress opens it.
          gsap.set( '.pocket-iris', {
            xPercent: -50,
            yPercent: -50,
            scale: 0,
            autoAlpha: 1,
          } )
          gsap.set( [ '.title-screen', '.projects-screen', '.contact-screen' ], { autoAlpha: 0 } )

          // The Studio lighting cue lives in its own paused timeline so both intro drafts can
          // drive it: Draft 1 scrubs it from the master timeline, Draft 2 from its handoff progress.
          // 1. Light floods the cyc from the pocket (clip-path circle) while the wall warms up.
          // 2. The silhouette letters are set down on the floor, right to left, away from the light.
          // 3. The service and location tapes are slapped onto the floor.
          const studioCue = gsap.timeline( { paused: true } )
            .fromTo( '.title-screen', { clipPath: lightsOff( CUE_ORIGINS.studio ) }, {
              clipPath: lightsUp( CUE_ORIGINS.studio ),
              ease: 'cue',
              duration: 0.72,
            }, 0 )
            .fromTo( '.title-screen .cyc-wall', { filter: 'brightness(0.4)' }, {
              filter: 'brightness(1)',
              ease: 'cue',
              duration: 0.8,
            }, 0 )
            .fromTo( '.final-title .cue-char', CHAR_ENTRANCES.studio, {
              ...CHAR_REST,
              duration: 0.34,
              stagger: { amount: 0.26, from: 'end' },
            }, 0.12 )
            .fromTo( [ '.studio-floor .tape', '.final-meta' ], TAPE_SLAP, {
              ...TAPE_REST,
              duration: 0.2,
              stagger: 0.07,
            }, 0.58 )
          // Draft 1 cue window: from the draft exit to the end of the old meta reveal.
          const studioCueEnd = STORY_TIMING.intro.visual.metaStart + STORY_TIMING.intro.visual.metaDuration
          const studioCueDuration = studioCueEnd - STORY_TIMING.intro.draft1.exitStart

          const syncDraft2Handoff = ( progress ) =>
          {
            const is3dBreak = activeDraftRef.current === 'webgl' ||
              activeDraftRef.current === 'photoreal'
            if ( !is3dBreak ) return

            const cutPocketDrop = progress >= DRAFT2_POCKET_CUT_STORY_PROGRESS
            // Draft 2 skips the old 8-ball drop and iris hold; Draft 1 remains untouched.
            gsap.set( '.ball-rig', { autoAlpha: cutPocketDrop ? 0 : 1 } )
            gsap.set( '.pocket-iris', { autoAlpha: cutPocketDrop ? 0 : 1 } )

            const exitProgress = getDraft2ExitProgress( progress )
            gsap.set( '.scene-interface', { autoAlpha: 1 - exitProgress } )
            // Only drive the Studio cue while the Studio page still owns the screen;
            // later pages hide it through the master timeline.
            if ( progress < toStoryProgress( STORY_TIMING.pages.projectsStart ) )
            {
              gsap.set( '.title-screen', { autoAlpha: exitProgress } )
              studioCue.progress( exitProgress )
            }
          }
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
                updateDraftProgress( progress )
                setBallLayerPromotion( progress > 0.001 && progress < 0.999 )
                syncDraft2Handoff( progress )
              },
              onRefresh: ( { progress } ) =>
              {
                updateDraftProgress( progress )
                syncDraft2Handoff( progress )
              },
            },
          } )

          const pages = STORY_TIMING.pages

          // Three timeline segments match Intro, Studio, Projects, and Contact.
          timeline
            .addLabel( 'intro', 0 )

            // Intro → Studio. The break plays, then the lights come up on the cyc.
            .to( '.pool-table', {
              scale: 1,
              rotationX: desktop ? 8 : 4,
              duration: STORY_TIMING.intro.visual.tableOpenDuration,
            }, 0 )
            .to( '.ball-rig', {
              scale: 1,
              x: holdX,
              y: holdY,
              rotation: 0,
              // Intro Draft 3 uses the same resistant-to-momentum curve as the shared ball sampler.
              ease: easeWeightedProgress,
              duration: STORY_TIMING.intro.approachDuration,
            }, 0 )
            .to( '.hero-copy', {
              y: -36,
              autoAlpha: 0,
              duration: STORY_TIMING.intro.visual.heroFadeDuration,
            }, STORY_TIMING.intro.visual.heroFadeDelay )
            .to( '.scroll-prompt', {
              y: 20,
              autoAlpha: 0,
              duration: STORY_TIMING.intro.visual.promptFadeDuration,
            }, STORY_TIMING.intro.visual.promptFadeDelay )
            .to( '.camera-grid', {
              opacity: 0.38,
              duration: STORY_TIMING.intro.visual.cameraGridDuration,
            }, 0 )
            .to( '.pool-table', {
              scale: 0.84,
              duration: STORY_TIMING.intro.visual.tableScaleDuration,
            }, STORY_TIMING.intro.visual.tableScaleStart )
            .to( '.ball-rig', {
              x: pocketX,
              y: pocketY,
              rotation: 910,
              duration: STORY_TIMING.intro.visual.ballPocketDuration,
            }, STORY_TIMING.intro.visual.ballPocketStart )
            .to( '.ball-rig', {
              scale: 0.35,
              autoAlpha: 0,
              duration: STORY_TIMING.intro.visual.ballVanishDuration,
            }, STORY_TIMING.intro.visual.ballVanishStart )
            // Open the black-hole iris only after the ball has fully vanished.
            .to( '.pocket-iris', {
              scale: desktop ? 38 : 42,
              duration: STORY_TIMING.intro.visual.pocketIrisDuration,
            }, STORY_TIMING.intro.visual.pocketIrisStart )
            .to( '.scene-interface', {
              autoAlpha: 0,
              duration: STORY_TIMING.intro.draft1.transitionDuration,
            }, STORY_TIMING.intro.draft1.exitStart )
            // The Studio screen is switched on at once; its clip-path light does the revealing.
            .to( '.title-screen', { autoAlpha: 1, duration: 0.001 }, STORY_TIMING.intro.draft1.exitStart )
            .to( studioCue, {
              progress: 1,
              ease: 'none',
              duration: studioCueDuration,
            }, STORY_TIMING.intro.draft1.exitStart )
            .to( {}, { duration: STORY_TIMING.intro.visual.timelineEndEpsilon }, 1 - STORY_TIMING.intro.visual.timelineEndEpsilon )
            .addLabel( 'studio', pages.studioStable )

            // Studio → Projects. A teal side light sweeps in from the left over the pink wall.
            .to( '.projects-screen', { autoAlpha: 1, duration: 0.001 }, pages.projectsStart )
            .fromTo( '.projects-screen', { clipPath: lightsOff( CUE_ORIGINS.projects ) }, {
              clipPath: lightsUp( CUE_ORIGINS.projects ),
              ease: 'cue',
              duration: pages.studioRevealDuration,
            }, pages.projectsStart )
            .fromTo( '.projects-screen .cyc-wall', { filter: 'brightness(0.4)' }, {
              filter: 'brightness(1)',
              ease: 'cue',
              duration: pages.studioRevealDuration,
            }, pages.projectsStart )
            // The covered Studio screen switches off underneath once the new light owns the frame.
            .to( '.title-screen', {
              autoAlpha: 0,
              duration: pages.projectsFadeDuration,
            }, pages.projectsFadeStart )
            .fromTo( '.projects-title .cue-char', CHAR_ENTRANCES.projects, {
              ...CHAR_REST,
              duration: pages.projectsTitleDuration * 0.6,
              stagger: { amount: pages.projectsTitleDuration * 0.4 + pages.projectsTitleStagger, from: 'start' },
            }, pages.projectsTitleStart )
            // Client boards are stood up on the floor, one after another, pivoting on their feet.
            .fromTo( '.project-card', { autoAlpha: 0, rotationX: -70, transformOrigin: '50% 100%' }, {
              autoAlpha: 1,
              rotationX: 0,
              ease: 'cue',
              duration: pages.projectsTitleDuration,
              stagger: 0.03,
            }, pages.projectsTitleStart + pages.projectsTitleStagger )
            .addLabel( 'projects', pages.projectsStable )

            // Projects → Contact. Amber footlight rises from the floor.
            .to( '.contact-screen', { autoAlpha: 1, duration: 0.001 }, pages.contactStart )
            .fromTo( '.contact-screen', { clipPath: lightsOff( CUE_ORIGINS.contact ) }, {
              clipPath: lightsUp( CUE_ORIGINS.contact ),
              ease: 'cue',
              duration: pages.contactRevealDuration,
            }, pages.contactStart )
            .fromTo( '.contact-screen .cyc-wall', { filter: 'brightness(0.4)' }, {
              filter: 'brightness(1)',
              ease: 'cue',
              duration: pages.contactRevealDuration,
            }, pages.contactStart )
            .to( '.projects-screen', {
              autoAlpha: 0,
              duration: pages.contactFadeDuration,
            }, pages.contactFadeStart )
            .fromTo( '.contact-title .cue-char', CHAR_ENTRANCES.contact, {
              ...CHAR_REST,
              duration: pages.contactTitleDuration * 0.6,
              stagger: { amount: pages.contactTitleDuration * 0.4 + pages.contactTitleStagger, from: 'center' },
            }, pages.contactTitleStart )
            // The call sheet is taped up, then its three rows are filled in.
            .fromTo( '.call-sheet', { autoAlpha: 0, yPercent: 8, rotation: 3 }, {
              autoAlpha: 1,
              yPercent: 0,
              rotation: 0,
              ease: 'cue',
              duration: pages.contactTitleDuration,
            }, pages.contactTitleStart )
            .fromTo( '.contact-item', { y: 20, autoAlpha: 0 }, {
              y: 0,
              autoAlpha: 1,
              duration: pages.contactItemDuration,
              stagger: pages.contactItemStagger,
            }, pages.contactItemsStart )
            // This empty tween makes the complete timeline exactly the configured length.
            .to( {}, { duration: pages.timelineEndEpsilon }, pages.timelineEndStart )
            .addLabel( 'contact', pages.contactStable )
        },
      )

      return () => media.revert()
    }, root )

    return () =>
    {
      if ( pointerFrame ) window.cancelAnimationFrame( pointerFrame )
      if ( moveLightX ) window.removeEventListener( 'pointermove', movePointer )
      gsap.killTweensOf( keyLight )
      ballRig.style.removeProperty( 'will-change' )
      animationContext.revert()
    }
  }, [] )

  // Top is an intentional direct jump, so it targets the Intro Page.
  const replay = () => goToPage( 'intro' )

  return (
    <main
      className={ `experience draft-${activeDraft}` }
      ref={ rootRef }
      data-story-page={ activePage }
      data-story-indicator-page={ indicatorPage }
      data-story-state={ isTransitioning ? 'transitioning' : 'settled' }
      data-story-transitioning={ String( isTransitioning ) }
    >
      {/* Keep one viewport of physical scroll distance per editable timeline unit. */}
      <section
        className="story"
        ref={ storyRef }
        style={ { '--story-height': `${ ( STORY_TIMING.totalTimelineUnits + 1 ) * 100 }svh` } }
        aria-label="Interactive 8 Ball Studio introduction"
        data-story-page={ activePage }
        data-story-indicator-page={ indicatorPage }
        data-story-state={ isTransitioning ? 'transitioning' : 'settled' }
        data-story-transitioning={ String( isTransitioning ) }
      >
        <div className="stage">
          <div className="camera-grid" aria-hidden="true" />
          <div className="ambient ambient-one" aria-hidden="true" />
          <div className="ambient ambient-two" aria-hidden="true" />

          <PoolPovDraft
            active={ activeDraft === 'cinematic' }
            onController={ registerCinematicController }
          />
          <PhotorealPoolDraft
            active={ activeDraft === 'photoreal' }
            onController={ registerPhotorealController }
            onUnavailable={ handleWebglUnavailable }
            draftId="photoreal"
          />

          <PoolTable />
          <EightBall />
          {/* Expands from the target pocket to mask the transition into Studio. */}
          <div className="pocket-iris" aria-hidden="true" />

          <header className="site-header">
            <a className="wordmark" href="#top" onClick={ ( event ) => { event.preventDefault(); replay() } } aria-label="8 Ball Studio — return to start">
              <img className="brand-logo" src={ brandLogo } alt="8 Ball Studio" />
            </a>
            {/* Nav tapes are coloured with the gel of the Page they lead to. */}
            <nav className="header-meta" aria-label="Page navigation">
              <a
                className="header-link tape tape-projects"
                href="#projects"
                onClick={ ( event ) =>
                {
                  // Stop the browser jump so the pager can land on the stable Projects target.
                  event.preventDefault()
                  goToPage( 'projects' )
                } }
              >
                Our Projects
              </a>
              <a
                className="header-link tape tape-contact"
                href="#contact"
                onClick={ ( event ) =>
                {
                  // Use the same Lenis motion as pagination for the stable Contact target.
                  event.preventDefault()
                  goToPage( 'contact' )
                } }
              >
                Contact Us
                <svg viewBox="0 0 20 12" aria-hidden="true"><path d="M1 6h17M13 1l5 5-5 5" /></svg>
              </a>
              <button className="top-link tape" onClick={ replay } type="button" aria-label="Go back to top of page">
                Top
              </button>
            </nav>
          </header>

          <div className="scene-interface">
            <div className="hero-copy">
              <h1>Roll with us.</h1>
              <ul className="hero-services" aria-label="Services">
                { SERVICES.map( ( service ) => <li key={ service }>{ service }</li> ) }
              </ul>
            </div>

            <div className="scroll-prompt">
              <span className="tape">Scroll to break</span>
              <svg className="scroll-arrow" viewBox="0 0 16 24" aria-hidden="true">
                <path d="M8 2v19M2 15l6 6 6-6" />
              </svg>
            </div>
          </div>

          {/* Studio: the lights come up on a pink-gel cyc. */}
          <section className="title-screen cyc cyc-studio" aria-labelledby="studio-title">
            <div className="cyc-wall" aria-hidden="true" />
            <div className="final-content">
              <h2 id="studio-title" className="final-title cyc-title" aria-label="8 Ball Studio">
                <CueLine className="final-title-line" text="8 Ball" />
                <CueLine className="final-title-line" text="Studio" />
              </h2>
            </div>
            <div className="studio-floor">
              <ul className="studio-services" aria-label="Services">
                { SERVICES.map( ( service ) => <li className="tape" key={ service }>{ service }</li> ) }
              </ul>
            </div>
            <p className="final-meta tape">Greater Kuala Lumpur, Malaysia</p>
          </section>

          {/* Projects: a teal side light, client boards gliding along the floor. */}
          <section className="projects-screen cyc cyc-projects" aria-labelledby="projects-title">
            <div className="cyc-wall" aria-hidden="true" />
            <div className="projects-content">
              <h2 id="projects-title" className="projects-title cyc-title" aria-label="Our Projects">
                <CueLine className="projects-title-line" text="Our" />
                <CueLine className="projects-title-line" text="Projects" />
              </h2>
            </div>
            <ul className="projects-floor" aria-label="Clients">
              { PROJECT_ITEMS.map( ( project ) => (
                <li className={ `project-card${project.type ? ` is-${project.type}` : ''}` } key={ project.alt }>
                  <div className="project-board">
                    <img src={ project.src } alt={ project.alt } />
                  </div>
                  <span className="tape">{ project.alt }</span>
                </li>
              ) ) }
            </ul>
          </section>

          {/* Contact: amber footlight, and a call sheet taped to the wall. */}
          <section className="contact-screen cyc cyc-contact" aria-labelledby="contact-title">
            <div className="cyc-wall" aria-hidden="true" />
            <div className="contact-content">
              <h2 id="contact-title" className="contact-title cyc-title" aria-label="Contact Us">
                <CueLine className="contact-title-line" text="Contact" />
                <CueLine className="contact-title-line" text="Us" />
              </h2>
              <div className="call-sheet">
                <ul className="contact-list">
                  { CONTACT_ITEMS.map( ( item ) => (
                    <li key={ item.title }>
                      <a
                        className="contact-item"
                        href={ item.href }
                        target="_blank"
                        rel="noreferrer"
                        aria-label={ `${item.action} 8 Ball Studio on ${item.title}: ${item.description}` }
                      >
                        <span className="contact-icon"><ContactIcon type={ item.icon } /></span>
                        <span className="contact-channel">{ item.title }</span>
                        <span className="contact-detail">{ item.description }</span>
                        <span className="contact-action">
                          <span className="contact-action-label">{ item.action }</span>
                          <svg viewBox="0 0 20 12" aria-hidden="true"><path d="M1 6h17M13 1l5 5-5 5" /></svg>
                        </span>
                      </a>
                    </li>
                  ) ) }
                </ul>
                <p className="call-sheet-foot">
                  <span>8 Ball Studio</span>
                  <span>Greater Kuala Lumpur</span>
                </p>
              </div>
            </div>
          </section>
        </div>
      </section>

      <DraftSwitcher activeDraft={ activeDraft } onChange={ switchDraft } />

      {/* Spike marks: one strip of tape per Page, coloured with that Page's gel. */}
      <nav className="page-dots" aria-label="Story page navigation">
        { storyPages.map( ( page ) => (
          <button
            className={ `page-dot${indicatorPage === page.id ? ' is-active' : ''}` }
            type="button"
            style={ { '--mark': PAGE_MARKS[ page.id ] } }
            aria-label={ `Go to ${page.label} page` }
            aria-current={ indicatorPage === page.id ? 'page' : undefined }
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
