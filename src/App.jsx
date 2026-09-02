import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useStoryPager } from './hooks/useStoryPager'
import { DraftSwitcher } from './components/DraftSwitcher'
import { WebglPoolDraft } from './drafts/WebglPoolDraft'
import { STORY_TIMING, easeWeightedProgress, toStoryProgress, toTimelineUnits } from './storyTiming'
import { getStoryPages } from './storySchedule'
// One V4 asset supplies both the header brand mark and animated 8-ball surface.
import brandLogo from './assets/8BALL-V4.jpg'

gsap.registerPlugin( ScrollTrigger )

// Keep the photo-backed fallback and its large source images out of the public
// Production load; the chunk is fetched only for diagnostics or WebGL failure.
const PoolPovDraft = lazy( () => import( './drafts/PoolPovDraft' ).then( ( module ) => ( {
  default: module.PoolPovDraft,
} ) ) )

// Keep the Draft 2 camera cut aligned with the shared intro timeline.
const DRAFT2_TRANSITION_READY_STORY_PROGRESS = toStoryProgress( STORY_TIMING.intro.draft2.transitionReady )
// Cut the shared 8-ball before its old pocket-drop path starts; Draft 1 keeps its original animation.
const DRAFT2_POCKET_CUT_STORY_PROGRESS = toStoryProgress( STORY_TIMING.intro.draft2.pocketCut )

const getDraft2ExitProgress = ( progress ) =>
  Math.min( 1, Math.max( 0, ( progress - DRAFT2_TRANSITION_READY_STORY_PROGRESS ) /
    STORY_TIMING.intro.draft2.transitionDurationProgress ) )

const DRAFT_IDS = [ 'cinematic', 'webgl', 'original' ]

// Draft controls are a diagnostic entry point, never part of the public Story chrome.
const getDraftDiagnosticsState = () =>
{
  if ( typeof window === 'undefined' ) return { enabled: false, mountAll: false }

  const params = new URLSearchParams( window.location.search )
  const enabled = params.has( 'draft' ) || params.has( 'drafts' ) || params.has( 'benchmark' )
  return {
    enabled,
    // Existing benchmark probes compare layers; normal diagnostics still mount one renderer.
    mountAll: enabled && params.has( 'benchmark' ),
  }
}

const getInitialDraft = () =>
{
  if ( typeof window === 'undefined' ) return 'webgl'

  const requestedDraft = new URLSearchParams( window.location.search ).get( 'draft' )
  // Keep old shared links working while the certified WebGL treatment is the public Production Draft.
  const normalizedDraft = requestedDraft === 'photo' ? 'cinematic' : requestedDraft

  // Invalid URLs use WebGL; its guarded failure path immediately hands off to Cinematic.
  return DRAFT_IDS.includes( normalizedDraft ) ? normalizedDraft : 'webgl'
}

const PROJECT_ITEMS = [
  // Logos are the only approved project evidence in this repository; roster copy says so plainly.
  {
    id: 'artigusto-gelato',
    alt: 'Artigusto Gelato',
    type: 'artigusto',
    load: () => import( './assets/Artigusto-Gelato_Clearned.png' ).then( ( module ) => module.default ),
    client: 'Artigusto Gelato',
    discipline: 'Roster content',
    summary: 'Approved client mark shown as roster content; discipline and project details are not published.',
  },
  {
    id: 'ers-energy',
    alt: 'ERS Energy',
    client: 'ERS Energy',
    load: () => import( './assets/ers-energy-logo.png' ).then( ( module ) => module.default ),
    discipline: 'Roster content',
    summary: 'Approved client mark shown as roster content; discipline and project details are not published.',
  },
  {
    id: 'haruplate',
    alt: 'Haruplate',
    client: 'Haruplate',
    load: () => import( './assets/haruplate-logo.png' ).then( ( module ) => module.default ),
    discipline: 'Roster content',
    summary: 'Approved client mark shown as roster content; discipline and project details are not published.',
  },
  {
    id: 'shopee',
    alt: 'Shopee',
    client: 'Shopee',
    load: () => import( './assets/shopee-logo.svg' ).then( ( module ) => module.default ),
    discipline: 'Roster content',
    summary: 'Approved client mark shown as roster content; discipline and project details are not published.',
  },
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
  const diagnosticsState = useMemo( getDraftDiagnosticsState, [] )
  const [ activeDraft, setActiveDraft ] = useState( getInitialDraft )
  const [ selectedProjectId, setSelectedProjectId ] = useState( PROJECT_ITEMS[ 0 ].id )
  const [ featuredProjectSrc, setFeaturedProjectSrc ] = useState( null )
  const [ webglFallbackActive, setWebglFallbackActive ] = useState( false )
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
  const registerWebglController = useCallback(
    ( controller ) => registerDraftController( 'webgl', controller ),
    [ registerDraftController ],
  )

  const switchDraft = useCallback( ( nextDraft, { fallback = false } = {} ) =>
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
    setWebglFallbackActive( fallback )
    setActiveDraft( nextDraft )
  }, [ getProgress ] )

  const handleWebglUnavailable = useCallback( ( draftId ) =>
  {
    // Draft 1 is the no-WebGL fallback so the opening still has a rendered pool scene.
    if ( activeDraftRef.current === draftId )
    {
      switchDraft( 'cinematic', { fallback: true } )
    }
  }, [ switchDraft ] )

  const featuredProject = PROJECT_ITEMS.find( ( project ) => project.id === selectedProjectId ) || PROJECT_ITEMS[ 0 ]

  useEffect( () =>
  {
    let cancelled = false
    if ( activePage !== 'projects' )
    {
      setFeaturedProjectSrc( null )
      return () => { cancelled = true }
    }

    // Fetch one approved mark only once Projects is the active Page; Intro keeps
    // its first viewport free from lower-Page media requests.
    setFeaturedProjectSrc( null )
    featuredProject.load().then( ( source ) =>
    {
      if ( !cancelled ) setFeaturedProjectSrc( source )
    } ).catch( () =>
    {
      if ( !cancelled ) setFeaturedProjectSrc( null )
    } )

    return () => { cancelled = true }
  }, [ activePage, featuredProject.id ] )

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
    const cursorDot = root.querySelector( '.cursor-dot' )
    const cursorRing = root.querySelector( '.cursor-ring' )
    const pointerGlow = root.querySelector( '.pointer-glow' )
    let pointerFrame = 0
    let pointerX = 0
    let pointerY = 0
    let ballLayerIsPromoted = false
    const hasFinePointer = window.matchMedia( '(hover: hover) and (pointer: fine)' ).matches
    const prefersReducedMotion = window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches

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
          gsap.set( '.title-screen', { autoAlpha: showStudio ? 1 : 0 } )
          gsap.set( [ '.final-title-line > span', '.final-meta' ], {
            autoAlpha: showStudio ? 1 : 0,
            y: 0,
            yPercent: 0,
          } )
          gsap.set( '.studio-editorial', { autoAlpha: showStudio ? 1 : 0, y: 0 } )
          gsap.set( '.projects-screen', {
            autoAlpha: showProjects ? 1 : 0,
            yPercent: 0,
          } )
          gsap.set( '.projects-title-line > span', {
            autoAlpha: showProjects ? 1 : 0,
            y: 0,
            yPercent: 0,
          } )
          gsap.set( [ '.projects-featured', '.projects-index' ], { autoAlpha: showProjects ? 1 : 0, y: 0 } )
          gsap.set( '.contact-screen', {
            autoAlpha: showContact ? 1 : 0,
            yPercent: 0,
          } )
          gsap.set( [ '.contact-title-line > span', '.contact-item' ], {
            autoAlpha: showContact ? 1 : 0,
            y: 0,
            yPercent: 0,
          } )
          gsap.set( [ '.contact-intro', '.contact-cta' ], { autoAlpha: showContact ? 1 : 0, y: 0 } )
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
          gsap.set( '.title-screen', { autoAlpha: 0, scale: 1, yPercent: 0, force3D: true } )
          gsap.set( '.final-title-line > span', { y: 0, yPercent: 115 } )
          gsap.set( '.final-meta', { y: 20, autoAlpha: 0 } )
          gsap.set( '.studio-editorial', { y: 24, autoAlpha: 0 } )
          gsap.set( '.projects-screen', { autoAlpha: 0, yPercent: 8, force3D: true } )
          gsap.set( '.projects-title-line > span', { y: 0, yPercent: 115 } )
          gsap.set( [ '.projects-featured', '.projects-index' ], { y: 24, autoAlpha: 0 } )
          gsap.set( '.contact-screen', { autoAlpha: 0, yPercent: 8, force3D: true } )
          gsap.set( '.contact-title-line > span', { y: 0, yPercent: 115 } )
          gsap.set( '.contact-item', { y: 20, autoAlpha: 0 } )
          gsap.set( [ '.contact-intro', '.contact-cta' ], { y: 20, autoAlpha: 0 } )

          const syncDraft2Handoff = ( progress ) =>
          {
            if ( activeDraftRef.current !== 'webgl' ) return

            const cutPocketDrop = progress >= DRAFT2_POCKET_CUT_STORY_PROGRESS
            // Draft 2 skips the old 8-ball drop and iris hold; Draft 1 remains untouched.
            gsap.set( '.ball-rig', { autoAlpha: cutPocketDrop ? 0 : 1 } )
            gsap.set( '.pocket-iris', { autoAlpha: cutPocketDrop ? 0 : 1 } )

            const exitProgress = getDraft2ExitProgress( progress )
            const titleOffset = ( 1 - exitProgress ) * 115
            gsap.set( '.scene-interface', { autoAlpha: 1 - exitProgress } )
            gsap.set( '.title-screen', { autoAlpha: exitProgress } )
            gsap.set( '.final-title-line > span', {
              autoAlpha: exitProgress,
              yPercent: titleOffset,
            } )
            gsap.set( '.final-meta', {
              autoAlpha: exitProgress,
              y: ( 1 - exitProgress ) * 20,
            } )
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

          // Three timeline segments match Intro, Studio, Projects, and Contact.
          timeline
            .addLabel( 'intro', 0 )

            // Intro → Studio. Fade the opening composition into the studio title.
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
            // Crossfade into Studio as soon as the colored balls reach the reference spread.
            .to( '.title-screen', {
              autoAlpha: 1,
              duration: STORY_TIMING.intro.draft1.transitionDuration,
            }, STORY_TIMING.intro.draft1.exitStart )
            .to( '.final-title-line > span', {
              yPercent: 0,
              duration: STORY_TIMING.intro.visual.titleLineDuration,
              stagger: STORY_TIMING.intro.visual.titleLineStagger,
            }, STORY_TIMING.intro.visual.titleLineStart )
            .to( '.final-meta', {
              y: 0,
              autoAlpha: 1,
              duration: STORY_TIMING.intro.visual.metaDuration,
            }, STORY_TIMING.intro.visual.metaStart )
            .to( '.studio-editorial', {
              y: 0,
              autoAlpha: 1,
              duration: STORY_TIMING.intro.visual.metaDuration,
            }, STORY_TIMING.intro.visual.metaStart + 0.04 )
            .to( {}, { duration: STORY_TIMING.intro.visual.timelineEndEpsilon }, 1 - STORY_TIMING.intro.visual.timelineEndEpsilon )
            .addLabel( 'studio', STORY_TIMING.pages.studioStable )

            // Studio → Projects. Reveal the project heading.
            .to( '.projects-screen', {
              yPercent: 0,
              autoAlpha: 1,
              duration: STORY_TIMING.pages.studioRevealDuration,
            }, STORY_TIMING.pages.projectsStart )
            .to( '.title-screen', {
              scale: 0.965,
              yPercent: -2,
              autoAlpha: 0,
              duration: STORY_TIMING.pages.projectsFadeDuration,
            }, STORY_TIMING.pages.projectsFadeStart )
            .to( '.projects-title-line > span', {
              yPercent: 0,
              duration: STORY_TIMING.pages.projectsTitleDuration,
              stagger: STORY_TIMING.pages.projectsTitleStagger,
            }, STORY_TIMING.pages.projectsTitleStart )
            .to( [ '.projects-featured', '.projects-index' ], {
              y: 0,
              autoAlpha: 1,
              duration: STORY_TIMING.pages.projectsTitleDuration,
            }, STORY_TIMING.pages.projectsTitleStart + 0.04 )
            .addLabel( 'projects', STORY_TIMING.pages.projectsStable )

            // Projects → Contact. Reveal every contact item.
            .to( '.contact-screen', {
              yPercent: 0,
              autoAlpha: 1,
              duration: STORY_TIMING.pages.contactRevealDuration,
            }, STORY_TIMING.pages.contactStart )
            .to( '.projects-screen', {
              scale: 0.965,
              yPercent: -2,
              autoAlpha: 0,
              duration: STORY_TIMING.pages.contactFadeDuration,
            }, STORY_TIMING.pages.contactFadeStart )
            .to( '.contact-title-line > span', {
              yPercent: 0,
              duration: STORY_TIMING.pages.contactTitleDuration,
              stagger: STORY_TIMING.pages.contactTitleStagger,
            }, STORY_TIMING.pages.contactTitleStart )
            .to( [ '.contact-intro', '.contact-cta' ], {
              y: 0,
              autoAlpha: 1,
              duration: STORY_TIMING.pages.contactTitleDuration,
            }, STORY_TIMING.pages.contactTitleStart + 0.04 )
            .to( '.contact-item', {
              y: 0,
              autoAlpha: 1,
              duration: STORY_TIMING.pages.contactItemDuration,
              stagger: STORY_TIMING.pages.contactItemStagger,
            }, STORY_TIMING.pages.contactItemsStart )
            // This empty tween makes the complete timeline exactly the configured length.
            .to( {}, { duration: STORY_TIMING.pages.timelineEndEpsilon }, STORY_TIMING.pages.timelineEndStart )
            .addLabel( 'contact', STORY_TIMING.pages.contactStable )
        },
      )

      return () => media.revert()
    }, root )

    return () =>
    {
      if ( pointerFrame ) window.cancelAnimationFrame( pointerFrame )
      if ( hasFinePointer ) window.removeEventListener( 'pointermove', movePointer )
      gsap.killTweensOf( [ cursorDot, cursorRing, pointerGlow ] )
      ballRig.style.removeProperty( 'will-change' )
      animationContext.revert()
    }
  }, [] )

  // Top is an intentional direct jump, so it targets the Intro Page.
  const replay = () => goToPage( 'intro' )

  return (
    <main
      className={ `experience draft-${activeDraft}${indicatorPage === 'projects' ? ' is-projects-active' : ''}` }
      ref={ rootRef }
      data-active-draft={ activeDraft }
      data-draft-mount-mode={ diagnosticsState.mountAll ? 'diagnostic' : 'production' }
      data-webgl-fallback={ String( webglFallbackActive ) }
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
          <div className="pointer-glow" aria-hidden="true" />
          <div className="camera-grid" aria-hidden="true" />
          <div className="ambient ambient-one" aria-hidden="true" />
          <div className="ambient ambient-two" aria-hidden="true" />

          { ( diagnosticsState.mountAll || activeDraft === 'cinematic' ) && (
            <Suspense fallback={ null }>
              <PoolPovDraft
                active={ activeDraft === 'cinematic' }
                onController={ registerCinematicController }
              />
            </Suspense>
          ) }
          { ( diagnosticsState.mountAll || activeDraft === 'webgl' ) && (
            <WebglPoolDraft
              active={ activeDraft === 'webgl' }
              onController={ registerWebglController }
              onUnavailable={ handleWebglUnavailable }
              diagnostic={ diagnosticsState.mountAll }
              draftId="webgl"
            />
          ) }

          <PoolTable />
          <EightBall />
          {/* Expands from the target pocket to mask the transition into Studio. */}
          <div className="pocket-iris" aria-hidden="true" />

          { webglFallbackActive && activeDraft === 'cinematic' && !diagnosticsState.mountAll && (
            <p className="webgl-fallback app-fallback" role="status">
              3D draft unavailable on this device. Showing the cinematic fallback.
            </p>
          ) }

          <header className="site-header">
            <a className="wordmark" href="#top" onClick={ ( event ) => { event.preventDefault(); replay() } } aria-label="8 Ball Studio — return to start">
              <img className="brand-logo" src={ brandLogo } alt="8 Ball Studio" />
            </a>
            <nav className="header-meta" aria-label="Page navigation">
              <a
                className="header-link header-projects-link"
                href="#projects"
                onClick={ ( event ) =>
                {
                  // Stop the browser jump so the pager can land on the stable Projects target.
                  event.preventDefault()
                  goToPage( 'projects', { interrupt: true } )
                } }
              >
                Our Projects
              </a>
              <a
                className="header-link header-contact-link"
                href="#contact"
                onClick={ ( event ) =>
                {
                  // Use the same Lenis motion as pagination for the stable Contact target.
                  event.preventDefault()
                  goToPage( 'contact', { interrupt: true } )
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
              <p className="hero-kicker">8 Ball Studio / Greater Kuala Lumpur</p>
              <h1 className="hero-title" aria-label="Roll with us.">
                <span className="hero-title-line">Roll</span>
                <span className="hero-title-line hero-title-line-offset">with us.</span>
              </h1>
              <p className="hero-note">Social-first stories, moving images, and graphic worlds with a sharp point of view.</p>
              <p className="hero-disciplines" aria-label="Studio disciplines">Social content management&nbsp; / &nbsp;Video &amp; photography&nbsp; / &nbsp;Graphic design</p>
              <span className="hero-rule" aria-hidden="true" />
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
              <div className="studio-editorial">
                <p className="studio-kicker">Creative studio / after-hours billiards</p>
                <p className="studio-statement">We make social-first stories, moving images, and graphic worlds with a sharp point of view.</p>
                <ul className="studio-disciplines" aria-label="Studio disciplines">
                  <li>Social content management</li>
                  <li>Video &amp; photography</li>
                  <li>Graphic design</li>
                </ul>
              </div>
              <div className="final-footer">
                <p className="final-meta">Greater Kuala Lumpur, Malaysia</p>
                <p className="final-meta final-meta-index">01 / 04 — Studio</p>
              </div>
            </div>
          </section>

          <section className="projects-screen" aria-labelledby="projects-title">
            <div className="projects-content">
              <p className="page-kicker">02 / 04 — Work roster</p>
              <h2 id="projects-title" className="projects-title">
                <span className="projects-title-line"><span>Our</span></span>
                <span className="projects-title-line projects-title-indent"><span>Projects</span></span>
              </h2>
              <div className="projects-featured" id="featured-project" role="tabpanel" aria-labelledby={ `project-tab-${featuredProject.id}` } aria-live="polite">
                <div className={ `featured-media${featuredProject.type ? ` is-${featuredProject.type}` : ''}` }>
                  <img
                    src={ activePage === 'projects' ? featuredProjectSrc || undefined : undefined }
                    alt={ featuredProject.alt }
                    loading={ activePage === 'projects' ? 'eager' : 'lazy' }
                    fetchPriority={ activePage === 'projects' ? 'high' : 'low' }
                  />
                </div>
                <div className="featured-copy">
                  <p className="featured-label">Featured / approved roster</p>
                  <h3>{ featuredProject.client }</h3>
                  <p className="featured-discipline">{ featuredProject.discipline }</p>
                  <p className="featured-summary">{ featuredProject.summary }</p>
                </div>
              </div>
            </div>
            <div className="projects-index" role="tablist" aria-label="Project roster">
              { PROJECT_ITEMS.map( ( project, index ) => (
                <button
                  className={ `project-index-item${project.id === featuredProject.id ? ' is-active' : ''}` }
                  id={ `project-tab-${project.id}` }
                  type="button"
                  role="tab"
                  aria-selected={ project.id === featuredProject.id }
                  tabIndex={ project.id === featuredProject.id ? 0 : -1 }
                  aria-controls="featured-project"
                  onClick={ () => setSelectedProjectId( project.id ) }
                  onKeyDown={ ( event ) =>
                  {
                    if ( ![ 'ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp' ].includes( event.key ) ) return
                    event.preventDefault()
                    const direction = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1
                    const nextIndex = ( index + direction + PROJECT_ITEMS.length ) % PROJECT_ITEMS.length
                    const nextProject = PROJECT_ITEMS[ nextIndex ]
                    setSelectedProjectId( nextProject.id )
                    window.requestAnimationFrame( () => document.getElementById( `project-tab-${nextProject.id}` )?.focus() )
                  } }
                  key={ project.id }
                >
                  <span className="project-index-number">{ String( index + 1 ).padStart( 2, '0' ) }</span>
                  <span className="project-index-client">{ project.client }</span>
                  <span className="project-index-discipline">{ project.discipline }</span>
                </button>
              ) ) }
            </div>
          </section>

          <section className="contact-screen" aria-labelledby="contact-title">
            <div className="contact-orbit" aria-hidden="true" />
            <div className="contact-content">
              <h2 id="contact-title" className="contact-title" aria-label="Contact Us">
                <span className="contact-title-line"><span>Contact</span></span>
                <span className="contact-title-line contact-title-indent"><span>to start</span></span>
              </h2>
              <p className="contact-intro">Have a brief, a launch, or a story worth breaking open? Start a project with the studio.</p>
              <a className="contact-cta" href="mailto:8ightball.studio@gmail.com?subject=Start%20a%20project">
                Start a project <span aria-hidden="true">↗</span>
              </a>
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

      { diagnosticsState.enabled && (
        <DraftSwitcher activeDraft={ activeDraft } onChange={ switchDraft } />
      ) }

      <nav className="page-dots" aria-label="Story page navigation">
        { storyPages.map( ( page, index ) => (
          <button
            className={ `page-dot${indicatorPage === page.id ? ' is-active' : ''}` }
            type="button"
            aria-label={ `Go to ${page.label} page` }
            aria-current={ indicatorPage === page.id ? 'page' : undefined }
            onClick={ () => goToPage( page.id, { interrupt: true } ) }
            key={ page.id }
          >
            <span className="page-dot-number">{ String( index + 1 ).padStart( 2, '0' ) }</span>
            <span className="page-dot-label">{ page.label }</span>
          </button>
        ) ) }
      </nav>
    </main>
  )
}

export default App
