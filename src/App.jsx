import { Fragment, Suspense, lazy, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { CustomEase } from 'gsap/CustomEase'
import { useStoryPager } from './hooks/useStoryPager'
import { DraftSwitcher } from './components/DraftSwitcher'
import { LookSwitcher } from './components/LookSwitcher'
import { CursorBall } from './components/CursorBall'
import { Preloader } from './components/Preloader'
import { LookScenery } from './looks/LookScenery'
import { DEFAULT_LOOK_ID, getLookConfig, getRevealVars, getThemeColor, normalizeLookId } from './looks/lookRegistry'
import { createFlowMotion, createNavSections } from './motion/flowMotion'
import { createVelocitySkew } from './motion/velocitySkew'
import { createIntroEntrance } from './motion/introEntrance'
import { REBUILD_KEYS, getTuning, subscribeTuning } from './motion/runtimeTuning'
import { PoolPovDraft } from './drafts/PoolPovDraft'
import PhotorealPoolDraft from './drafts/PhotorealPoolDraft'
import { DRAFT_IDS, normalizeDraftId, getDraftConfig } from './drafts/draftRegistry'
import { STAGE, easeWeightedProgress, toStoryProgress, toTimelineUnits } from './storyStage'
import { getStoryPages, getStudioStartUnits } from './storySchedule'
// One V4 asset supplies both the header brand mark and animated 8-ball surface.
import brandLogo from './assets/8BALL-V4.jpg'
// Circular mark with real alpha outside the badge.
import artigustoGelato from './assets/Artigusto-Gelato_Clearned.webp'
import ersEnergyLogo from './assets/ers-energy-logo.png'
import haruplateLogo from './assets/haruplate-logo.png'
import shopeeLogo from './assets/shopee-logo.svg'

gsap.registerPlugin( ScrollTrigger, CustomEase )

// The scroll-feel panel is a dev tool: it exists only on ?tune URLs and ships as its own chunk.
const TunePanel = lazy( () => import( './components/TunePanel' ) )
const TUNE_REQUESTED = typeof window !== 'undefined' && new URLSearchParams( window.location.search ).has( 'tune' )

// The one motion signature of the Cyc Wall world: a studio light snapping on fast,
// then settling with a long tail, like a tungsten head reaching full output.
CustomEase.create( 'cue', 'M0,0 C0.14,0.66 0.24,1 1,1' )

// Resting state every look's Studio letters and labels settle into. The reveal shape, letter entrance,
// and label entrance come from the active look's motion block (src/looks/lookRegistry.js).
// Every property any look's entrance moves must appear here, or letters finish short of rest.
const CHAR_REST = { x: 0, y: 0, xPercent: 0, yPercent: 0, skewX: 0, scale: 1, scaleY: 1, rotation: 0, rotationX: 0, autoAlpha: 1 }
const LABEL_REST = { autoAlpha: 1, scale: 1, rotation: 0, rotationX: 0, x: 0, y: 0, xPercent: 0, yPercent: 0 }

const getInitialLook = () =>
{
  if ( typeof window === 'undefined' ) return DEFAULT_LOOK_ID
  return normalizeLookId( new URLSearchParams( window.location.search ).get( 'look' ) )
}

// The Intro's small beats on the pinned timeline, in units as [start, duration] (the 8-ball hits the
// rack at STAGE.intro.impact), and Studio's camera move per unit at depth 1.
const IMPACT = STAGE.intro.impact
const BEATS = Object.freeze( {
  tableOpen: 0.42,
  heroFade: [ 0.03, 0.28 ],
  promptFade: [ 0.05, 0.2 ],
  cameraGrid: 0.7,
  tableScale: [ IMPACT - 0.1, 0.26 ],
  ballPocket: [ IMPACT + 0.12, 0.14 ],
  ballVanish: [ IMPACT + 0.26, 0.04 ],
  pocketIris: [ IMPACT + 0.3, 0.18 ],
  endEpsilon: 0.005,
  driftVh: 10,
  wallPush: 0.06,
} )

// Keep the Draft 2 camera cut aligned with the shared intro timeline.
const DRAFT2_TRANSITION_READY_STORY_PROGRESS = toStoryProgress( STAGE.intro.draft2.transitionReady )
// Cut the shared 8-ball before its old pocket-drop path starts; Draft 1 keeps its original animation.
const DRAFT2_POCKET_CUT_STORY_PROGRESS = toStoryProgress( STAGE.intro.draft2.pocketCut )

// Draft/Look switches jump the Story in one go; finish the GSAP scrub catch-up at once so the
// new layer lands in place instead of replaying a weight-long slide from the old position.
const finishScrubCatchUp = () =>
  ScrollTrigger.getAll().forEach( ( trigger ) => trigger.getTween()?.progress( 1 ) )

// The page's full scroll range in px: the pinned stage plus the normal-scroll sections after it.
const getDocumentRange = () => Math.max( 1, document.documentElement.scrollHeight - window.innerHeight )

// Document-space top of an element, independent of the current scroll position.
const getDocumentTop = ( element ) => element.getBoundingClientRect().top + window.scrollY

const getDraft2ExitProgress = ( progress ) =>
  Math.min( 1, Math.max( 0, ( progress - DRAFT2_TRANSITION_READY_STORY_PROGRESS ) /
    STAGE.intro.draft2.transitionDurationProgress ) )

// Draft 2's Studio cue starts with its exit but runs the full cue length,
// so the title arrives at the same pace as in the other drafts and as the Projects and Contact titles.
const getDraft2CueProgress = ( progress ) =>
  Math.min( 1, Math.max( 0, ( progress - DRAFT2_TRANSITION_READY_STORY_PROGRESS ) /
    STAGE.intro.studioCue.durationProgress ) )

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

// Two boards close the Projects run. Both are next steps, never invented work: one opens Contact,
// one opens the studio's real Instagram, where its published content lives.
const NEXT_BOARDS = [
  {
    id: 'contact',
    title: 'Your brand, next',
    caption: 'Start a project',
    href: '#contact',
    cursor: 'Contact',
  },
  {
    id: 'instagram',
    title: 'More on Instagram',
    detail: '@8ightball.studio',
    caption: 'Instagram',
    href: 'https://www.instagram.com/8ightball.studio/',
    cursor: 'Instagram',
    external: true,
  },
]

// Small text is sentence case everywhere; only names (8 Ball Studio, WhatsApp, places) keep capitals.
const SERVICES = [ 'Social content management', 'Video & photography', 'Graphic design' ]

// The Intro title, one mask per word so the opening shot can raise it word by word.
const HERO_TITLE = 'Roll with us.'
const HERO_WORDS = HERO_TITLE.split( ' ' )
// The opening shot plays when the preloader reveals the Intro; if that signal never comes, it plays
// after this long anyway, so the Intro is never left held at the shot's start.
const INTRO_ENTRANCE_FALLBACK_MS = 4000

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

// A long email wraps before its @ in a narrow contact column, instead of breaking mid-word.
function wrapBeforeAt ( text )
{
  const at = text.indexOf( '@' )
  return at > 0 ? <>{ text.slice( 0, at ) }<wbr />{ text.slice( at ) }</> : text
}

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
  const projectsRef = useRef( null )
  const contactRef = useRef( null )
  const draftControllersRef = useRef( {} )
  // Share of the whole document's scroll range (Story navigation's progress).
  const storyProgressRef = useRef( 0 )
  // Scrubbed progress through the pinned Intro → Studio stage (the GSAP timeline's own progress).
  const timelineProgressRef = useRef( 0 )
  // Absolute scroll position captured when a Draft or Look switch starts, restored after it.
  const switchScrollYRef = useRef( null )
  const activeDraftRef = useRef( getInitialDraft() )
  const [ activeDraft, setActiveDraft ] = useState( getInitialDraft )
  const [ activeLook, setActiveLook ] = useState( getInitialLook )
  const [ activePage, setActivePage ] = useState( 'intro' )
  const [ indicatorPage, setIndicatorPage ] = useState( 'intro' )
  // Measured positions of the pinned stage and the sections after it; null until first layout.
  const [ storyLayout, setStoryLayout ] = useState( null )
  // The part of the Story under the header (stage, projects, contact): drives the header ink and
  // the browser chrome colour (src/motion/flowMotion.js tracks it).
  const [ navSection, setNavSection ] = useState( 'stage' )
  // Bumped when ?tune changes a scrub, which is fixed per trigger: the Story's timelines rebuild.
  const [ tuneVersion, setTuneVersion ] = useState( 0 )
  const storyPages = useMemo(
    () => ( storyLayout ? getStoryPages( activeDraft, storyLayout ) : getStoryPages( activeDraft ) ),
    [ activeDraft, storyLayout ],
  )

  // Raw (Lenis-smoothed) scroll position, remembered so Draft/Look switches restore the exact spot.
  const rememberStoryProgress = useCallback( ( progress ) =>
  {
    storyProgressRef.current = progress
  }, [] )

  // Reads where the stage ends and each section starts, so nav links and keys land on real section
  // tops. Runs on mount, on every ScrollTrigger refresh, and on resize; unchanged layouts keep state.
  const measureStoryLayout = useCallback( () =>
  {
    const story = storyRef.current
    const projects = projectsRef.current
    const contact = contactRef.current
    if ( !story || !projects || !contact ) return

    const viewport = window.innerHeight
    const pinnedRange = Math.max( 0, story.offsetHeight - viewport )
    // Projects is pulled up over the stage's last screen, so its top sits exactly where the stage
    // releases; clamp away the sub-pixel rounding that could put it a pixel early.
    const projectsTop = Math.max( pinnedRange, Math.round( getDocumentTop( projects ) ) )
    const next = {
      viewport,
      pinnedRange,
      projectsTop,
      contactTop: Math.max( projectsTop, Math.round( getDocumentTop( contact ) ) ),
      documentRange: getDocumentRange(),
    }
    setStoryLayout( ( previous ) =>
      previous && Object.keys( next ).every( ( key ) => previous[ key ] === next[ key ] ) ? previous : next )
  }, [] )

  // The intro scenes follow the *scrubbed* timeline progress instead of raw scroll, so the 3D break
  // stays in step with the DOM titles and gel floods that trail the scroll by the weight setting.
  const driveDraftVisuals = useCallback( ( progress ) =>
  {
    timelineProgressRef.current = progress
    // Drive only the selected intro layer; inactive layers seek when selected later.
    draftControllersRef.current[ activeDraftRef.current ]?.setProgress(
      Math.min( 1, toTimelineUnits( progress ) ),
    )
  }, [] )

  const {
    goToPage,
    seekProgress,
    getProgress,
    isTransitioning,
    subscribeScroll,
    getVelocity,
    stopScroll,
    startScroll,
    setScrollFeel,
    scrollToY,
  } = useStoryPager( {
    storyRef,
    pages: storyPages,
    activePage,
    onPageChange: setActivePage,
    onIndicatorPageChange: setIndicatorPage,
    onProgress: rememberStoryProgress,
  } )

  const registerDraftController = useCallback( ( draftId, controller ) =>
  {
    if ( controller )
    {
      draftControllersRef.current[ draftId ] = controller
      controller.setProgress( Math.min( 1, toTimelineUnits( timelineProgressRef.current ) ) )
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

  // Captures the absolute scroll spot before a switch; a refresh may change the page's height.
  const captureScrollSpot = useCallback( () =>
  {
    const currentProgress = getProgress()
    if ( Number.isFinite( currentProgress ) ) switchScrollYRef.current = currentProgress * getDocumentRange()
  }, [ getProgress ] )

  const switchDraft = useCallback( ( nextDraft ) =>
  {
    if ( !DRAFT_IDS.includes( nextDraft ) ) return

    // Capture Lenis's position before the draft-page effect can refresh it.
    captureScrollSpot()

    const url = new URL( window.location.href )
    url.searchParams.set( 'draft', nextDraft )
    // Replace only the query so changing a draft never reloads or adds history entries.
    window.history.replaceState( {}, '', `${url.pathname}${url.search}${url.hash}` )
    activeDraftRef.current = nextDraft
    setActiveDraft( nextDraft )
  }, [ captureScrollSpot ] )

  // Switch the whole-site look without a reload; the Story position carries over exactly like a Draft switch.
  const switchLook = useCallback( ( nextLook ) =>
  {
    const look = normalizeLookId( nextLook )
    captureScrollSpot()

    const url = new URL( window.location.href )
    url.searchParams.set( 'look', look )
    window.history.replaceState( {}, '', `${url.pathname}${url.search}${url.hash}` )
    setActiveLook( look )
  }, [ captureScrollSpot ] )

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
    const preservedY = switchScrollYRef.current ?? storyProgressRef.current * getDocumentRange()
    switchScrollYRef.current = null
    Object.entries( draftControllersRef.current ).forEach( ( [ draftId, controller ] ) =>
    {
      controller.setActive( draftId === activeDraft )
    } )

    // Seek the selected draft to the existing timeline position for a seamless switch.
    draftControllersRef.current[ activeDraft ]?.setProgress(
      Math.min( 1, toTimelineUnits( timelineProgressRef.current ) ),
    )

    // Reapply the shared GSAP playhead after a draft switch changes CSS visibility rules.
    // The spot is restored as an absolute position, re-expressed against the refreshed page height.
    const restoreSpot = () =>
    {
      seekProgress( preservedY / getDocumentRange() )
      ScrollTrigger.update()
      finishScrubCatchUp()
    }
    let restoreFrame = 0
    const refreshFrame = window.requestAnimationFrame( () =>
    {
      ScrollTrigger.refresh()
      // ScrollTrigger can read native scroll during refresh; restore Lenis's position afterward.
      restoreSpot()
      // A refresh can measure while Lenis is still settling; one follow-up frame closes that race.
      restoreFrame = window.requestAnimationFrame( restoreSpot )
    } )

    return () =>
    {
      window.cancelAnimationFrame( refreshFrame )
      if ( restoreFrame ) window.cancelAnimationFrame( restoreFrame )
    }
  }, [ activeDraft, activeLook, tuneVersion, seekProgress ] )

  // ?tune: glide and wheel distance apply to Lenis at once; a scrub change rebuilds the timelines.
  useEffect( () => subscribeTuning( ( next, previous ) =>
  {
    setScrollFeel( { lerp: next.glide, wheelMultiplier: next.wheel } )
    if ( REBUILD_KEYS.some( ( key ) => next[ key ] !== previous[ key ] ) )
    {
      captureScrollSpot()
      setTuneVersion( ( version ) => version + 1 )
    }
  } ), [ captureScrollSpot, setScrollFeel ] )

  // The browser chrome (<meta name="theme-color">) takes the colour of the section under the header:
  // the stage shows the Intro or Studio, after it Projects and Contact own the header.
  useEffect( () =>
  {
    const meta = document.querySelector( 'meta[name="theme-color"]' )
    if ( !meta ) return
    const page = navSection !== 'stage' ? navSection : indicatorPage === 'intro' ? 'intro' : 'studio'
    meta.setAttribute( 'content', getThemeColor( activeLook, page ) )
  }, [ activeLook, indicatorPage, navSection ] )

  // The Intro's opening shot (src/motion/introEntrance.js). It is held at its start before the first
  // paint, then plays when the preloader reveals the Intro. Reduced motion shows the Intro at rest.
  const introEntranceRef = useRef( null )
  useLayoutEffect( () =>
  {
    if ( window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches ) return undefined
    const entrance = createIntroEntrance( { root: rootRef.current, draftId: activeDraftRef.current } )
    introEntranceRef.current = entrance
    const fallback = window.setTimeout( () => entrance.play(), INTRO_ENTRANCE_FALLBACK_MS )
    return () =>
    {
      window.clearTimeout( fallback )
      entrance.revert()
      introEntranceRef.current = null
    }
  }, [] )
  const playIntroEntrance = useCallback( () => introEntranceRef.current?.play(), [] )

  // What the preloader waits for: the faces, the page's own resources, and the active intro Draft's
  // first finished frame (drafts without a controller, like 03 Original, need only the page load).
  const whenIntroReady = useCallback( () =>
  {
    const fonts = document.fonts?.ready ?? Promise.resolve()
    const pageLoad = document.readyState === 'complete'
      ? Promise.resolve()
      : new Promise( ( resolve ) => window.addEventListener( 'load', resolve, { once: true } ) )
    const draft = draftControllersRef.current[ activeDraftRef.current ]?.ready ?? Promise.resolve()
    return Promise.all( [ fonts, pageLoad, draft ] )
  }, [] )

  // Section tops move with viewport height and fonts; re-measure whenever ScrollTrigger re-measures.
  useLayoutEffect( () =>
  {
    measureStoryLayout()
    ScrollTrigger.addEventListener( 'refresh', measureStoryLayout )
    window.addEventListener( 'resize', measureStoryLayout )
    return () =>
    {
      ScrollTrigger.removeEventListener( 'refresh', measureStoryLayout )
      window.removeEventListener( 'resize', measureStoryLayout )
    }
  }, [ measureStoryLayout ] )

  useLayoutEffect( () =>
  {
    const root = rootRef.current
    const ballRig = root.querySelector( '.ball-rig' )
    // The active look supplies the Studio cue's reveal shape and entrances; switching looks rebuilds this timeline.
    const look = getLookConfig( activeLook )
    const motion = look.motion
    // Weight and depth come from the tuning store: STORY_SETTINGS unless ?tune has changed them.
    const tuning = getTuning()
    let stopNavSections = null
    const studioReveal = getRevealVars( activeLook )
    // entranceTo covers entrance properties with no neutral rest value (a chalk wipe's clip-path).
    const charRest = { ...CHAR_REST, ...( motion.entranceTo || {} ), ease: motion.letterEase }
    const labelRest = { ...LABEL_REST, ...( motion.label.to || {} ), ease: motion.label.ease }
    let pointerFrame = 0
    let pointerX = 0
    let pointerY = 0
    let ballLayerIsPromoted = false
    const hasFinePointer = window.matchMedia( '(hover: hover) and (pointer: fine)' ).matches
    const prefersReducedMotion = window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches

    // The pointer is the studio's key light. A proxy eases toward the pointer and writes
    // --lx / --ly (percent of the viewport); CSS turns them into the wall hotspot and the
    // shadow each silhouette letter casts away from the light.
    // The values go only on the elements the look names as readers (look.keyLight), never on the
    // root: a custom property changed on the root re-styles the whole page on every frame.
    const keyLight = { x: 30, y: 26 }
    const keyLightTargets = look.keyLight ? gsap.utils.toArray( look.keyLight, root ) : []
    let writtenX = ''
    let writtenY = ''
    const applyKeyLight = () =>
    {
      // Both axis tweens call this each frame; write only what changed.
      const x = keyLight.x.toFixed( 2 )
      const y = keyLight.y.toFixed( 2 )
      if ( x === writtenX && y === writtenY ) return
      writtenX = x
      writtenY = y
      keyLightTargets.forEach( ( target ) =>
      {
        target.style.setProperty( '--lx', x )
        target.style.setProperty( '--ly', y )
      } )
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
      // The header follows the section under it in every motion mode, reduced motion included.
      stopNavSections = createNavSections( { root, onNavSection: setNavSection } )

      if ( prefersReducedMotion )
      {
        // Progress here is through the pinned stage only; Projects and Contact are static sections
        // below it in every mode, so reduced motion only switches the stage from Intro to Studio.
        const showReducedPage = ( progress ) =>
        {
          // Reduced motion has no scrub lag: raw stage progress is also the visual progress.
          driveDraftVisuals( progress )
          const studioStartProgress = toStoryProgress( getStudioStartUnits( activeDraftRef.current ) )
          const showIntro = progress < studioStartProgress
          const showStudio = !showIntro
          const showEndScreen = showStudio

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
          // Studio switches on like a light: fully lit, nothing travelling.
          gsap.set( '.title-screen', { autoAlpha: showStudio ? 1 : 0, clipPath: 'none' } )
          gsap.set( '.title-screen .cyc-wall', { filter: 'none' } )
          gsap.set( '.final-title .cue-char', CHAR_REST )
          gsap.set( [ '.studio-floor .tape', '.final-meta' ], {
            autoAlpha: 1,
            scale: 1,
            rotation: 0,
            rotationX: 0,
            y: 0,
            xPercent: 0,
            yPercent: 0,
            clipPath: 'none',
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
          gsap.set( '.title-screen', { autoAlpha: 0 } )

          // The Studio lighting cue lives in its own paused timeline so both intro drafts can
          // drive it: Draft 1 scrubs it from the master timeline, Draft 2 from its handoff progress.
          // 1. Light floods the cyc from the pocket (clip-path circle) while the wall warms up.
          // 2. The silhouette letters are set down on the floor, right to left, away from the light.
          // 3. The service and location tapes are slapped onto the floor.
          const studioCue = gsap.timeline( { paused: true } )
            .fromTo( '.title-screen', studioReveal.from, {
              ease: 'cue',
              ...studioReveal.to,
              duration: 0.72,
            }, 0 )
            // Scrubbed warm-up: linear, so the wall changes a little on every notch of the reveal.
            // Looks can supply their own (a film light leak, a lamp swinging on); default is a warm-up.
            .fromTo( '.title-screen .cyc-wall', motion.warmup?.from ?? { filter: 'brightness(0.4)' }, {
              ...( motion.warmup?.to ?? { filter: 'brightness(1)' } ),
              ease: 'none',
              duration: 0.8,
            }, 0 )
            .fromTo( '.final-title .cue-char', motion.entrance, {
              ...charRest,
              duration: 0.34,
              // Order the letters arrive in: from the light's side by default, left to right for writing.
              stagger: { amount: 0.26, from: motion.letterFrom ?? 'end' },
            }, 0.12 )
            .fromTo( [ '.studio-floor .tape', '.final-meta' ], motion.label.from, {
              ...labelRest,
              duration: 0.2,
              stagger: 0.07,
            }, 0.58 )
          // Draft 1 cue window: from the draft exit, one screen of scroll.
          const studioCueDuration = STAGE.intro.studioCue.duration

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
            // The screen switches on with the 3D exit; an opacity reveal (Main's fade) is left to the
            // cue, which runs longer, so this set never jumps it ahead.
            if ( !studioReveal.usesOpacity ) gsap.set( '.title-screen', { autoAlpha: exitProgress } )
            studioCue.progress( getDraft2CueProgress( progress ) )
          }
          // The scrubbed timeline is the single clock for every intro visual. Its progress trails
          // the scroll by the weight setting, and the 3D draft plus the Draft 2 handoff read that same
          // lagged value, so the ball, rack, titles, and gel floods never drift apart.
          // (The timeline is padded to exactly totalTimelineUnits, so its progress equals stage progress.)
          const syncStoryVisuals = ( progress ) =>
          {
            driveDraftVisuals( progress )
            setBallLayerPromotion( progress > 0.001 && progress < 0.999 )
            syncDraft2Handoff( progress )
          }
          const timeline = gsap.timeline( {
            // `this` is the timeline inside GSAP callbacks; avoids reading `timeline` before assignment.
            onUpdate () { syncStoryVisuals( this.progress() ) },
            // Scrubbed over the pinned stage only; once it releases, the sections scroll 1:1 with no tweens.
            scrollTrigger: {
              trigger: storyRef.current,
              start: 'top top',
              end: 'bottom bottom',
              // Seconds the animations take to catch up with the Lenis-smoothed scroll (extra weight).
              scrub: tuning.weight,
              invalidateOnRefresh: true,
              onRefresh: ( self ) => syncStoryVisuals( self.animation ? self.animation.progress() : self.progress ),
            },
          } )

          const pages = STAGE.pages

          // One transition: Intro → Studio. Then Studio holds, and the stage releases into normal scroll.
          timeline
            .addLabel( 'intro', 0 )

            // Intro → Studio. The break plays, then the lights come up on the cyc.
            .to( '.pool-table', {
              scale: 1,
              rotationX: desktop ? 8 : 4,
              duration: BEATS.tableOpen,
            }, 0 )
            .to( '.ball-rig', {
              scale: 1,
              x: holdX,
              y: holdY,
              rotation: 0,
              // Intro Draft 3 uses the same resistant-to-momentum curve as the shared ball sampler.
              ease: easeWeightedProgress,
              duration: STAGE.intro.approachEnd,
            }, 0 )
            .to( '.hero-copy', {
              y: -36,
              autoAlpha: 0,
              duration: BEATS.heroFade[ 1 ],
            }, BEATS.heroFade[ 0 ] )
            .to( '.scroll-prompt', {
              y: 20,
              autoAlpha: 0,
              duration: BEATS.promptFade[ 1 ],
            }, BEATS.promptFade[ 0 ] )
            .to( '.camera-grid', {
              opacity: 0.38,
              duration: BEATS.cameraGrid,
            }, 0 )
            .to( '.pool-table', {
              scale: 0.84,
              duration: BEATS.tableScale[ 1 ],
            }, BEATS.tableScale[ 0 ] )
            .to( '.ball-rig', {
              x: pocketX,
              y: pocketY,
              rotation: 910,
              duration: BEATS.ballPocket[ 1 ],
            }, BEATS.ballPocket[ 0 ] )
            .to( '.ball-rig', {
              scale: 0.35,
              autoAlpha: 0,
              duration: BEATS.ballVanish[ 1 ],
            }, BEATS.ballVanish[ 0 ] )
            // Open the black-hole iris only after the ball has fully vanished.
            .to( '.pocket-iris', {
              scale: desktop ? 38 : 42,
              duration: BEATS.pocketIris[ 1 ],
            }, BEATS.pocketIris[ 0 ] )
            .to( '.scene-interface', {
              autoAlpha: 0,
              duration: STAGE.intro.draft1.transitionDuration,
            }, STAGE.intro.draft1.exitStart )
            // The Studio screen is switched on at once; its clip-path light does the revealing.
            .to( '.title-screen', { autoAlpha: studioReveal.usesOpacity ? 0 : 1, duration: 0.001 }, STAGE.intro.draft1.exitStart )
            .to( studioCue, {
              progress: 1,
              ease: 'none',
              duration: studioCueDuration,
            }, STAGE.intro.draft1.exitStart )
            .to( {}, { duration: BEATS.endEpsilon }, 1 - BEATS.endEpsilon )
            .addLabel( 'studio', pages.studioStable )
            // Studio holds on the pinned stage for pages.studioReleaseHold, then the stage releases.
            // This empty tween makes the complete timeline exactly the pinned stage's length.
            .to( {}, { duration: pages.timelineEndEpsilon }, pages.timelineEndStart )
            .addLabel( 'release', pages.releaseEnd )

          // Camera move, the source of scroll weight on the pinned stage: from the cue until the
          // stage releases, Studio's cyc wall pushes in and its foreground rises, both linear in
          // scroll, so no wheel notch lands on a frozen frame. The offset is zero at Studio's stable
          // mark. Foreground offsets are functions so invalidateOnRefresh recomputes them per viewport.
          // Compact layouts stack the floor right above the Draft switcher, so they drift at half rate.
          const driftVh = BEATS.driftVh * tuning.depth * ( desktop ? 1 : 0.5 )
          const driftPx = ( units ) => () => window.innerHeight * driftVh * units / 100
          const cameraStart = STAGE.intro.draft1.exitStart
          const cameraEnd = STAGE.totalTimelineUnits
          timeline
            .fromTo( '.title-screen .cyc-wall', { scale: 1 }, {
              scale: 1 + BEATS.wallPush * tuning.depth * ( cameraEnd - cameraStart ),
              ease: 'none',
              duration: cameraEnd - cameraStart,
            }, cameraStart )
            .fromTo( [ '.final-content', '.studio-floor', '.final-meta' ], { y: driftPx( pages.studioStable - cameraStart ) }, {
              y: driftPx( pages.studioStable - cameraEnd ),
              ease: 'none',
              duration: cameraEnd - cameraStart,
            }, cameraStart )

          // After the stage: the Studio → Projects handoff, the Projects run, the Contact reveal,
          // and the velocity lean on everything in flow. Shared by every look; reverted with this branch.
          const stopFlowMotion = createFlowMotion( {
            root,
            motion,
            charRest,
            compact: !desktop,
            scrub: tuning.weight / 2,
            depth: tuning.depth,
            scrollToY,
          } )
          const stopVelocitySkew = createVelocitySkew( {
            root,
            subscribeScroll,
            getVelocity,
          } )

          return () =>
          {
            stopVelocitySkew()
            stopFlowMotion()
          }
        },
      )

      return () => media.revert()
    }, root )

    return () =>
    {
      if ( pointerFrame ) window.cancelAnimationFrame( pointerFrame )
      if ( moveLightX ) window.removeEventListener( 'pointermove', movePointer )
      gsap.killTweensOf( keyLight )
      keyLightTargets.forEach( ( target ) =>
      {
        target.style.removeProperty( '--lx' )
        target.style.removeProperty( '--ly' )
      } )
      ballRig.style.removeProperty( 'will-change' )
      stopNavSections?.()
      animationContext.revert()
    }
  }, [ activeLook, tuneVersion, getVelocity, scrollToY, subscribeScroll ] )

  // Top is an intentional direct jump, so it targets the Intro Page.
  const replay = () => goToPage( 'intro' )

  return (
    <main
      className={ `experience draft-${activeDraft}` }
      data-look={ activeLook }
      ref={ rootRef }
      data-story-page={ activePage }
      data-story-indicator-page={ indicatorPage }
      data-nav-section={ navSection }
      data-story-state={ isTransitioning ? 'transitioning' : 'settled' }
      data-story-transitioning={ String( isTransitioning ) }
    >
      {/* Covers the Intro only while its faces and active Draft load, once per session. */}
      <Preloader whenReady={ whenIntroReady } stopScroll={ stopScroll } startScroll={ startScroll } onReveal={ playIntroEntrance } />

      {/* Fixed, outside the pinned stage, so navigation stays on screen over the scrolling sections. */}
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
            Our projects
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
            Contact us
            <svg viewBox="0 0 20 12" aria-hidden="true"><path d="M1 6h17M13 1l5 5-5 5" /></svg>
          </a>
          <button className="top-link tape" onClick={ replay } type="button" aria-label="Go back to top of page">
            Top
          </button>
        </nav>
      </header>

      {/* Pinned stage: scroll range = timeline units × viewportsPerUnit screens, plus the sticky screen itself.
          It holds the Intro break and Studio; in its last screen Projects rises over the held Studio. */}
      <section
        className="story"
        ref={ storyRef }
        style={ { '--story-height': `${ ( STAGE.totalTimelineUnits * STAGE.viewportsPerUnit + 1 ) * 100 }svh` } }
        aria-label="Interactive 8 Ball Studio introduction"
        data-story-page={ activePage }
        data-story-indicator-page={ indicatorPage }
        data-story-state={ isTransitioning ? 'transitioning' : 'settled' }
        data-story-transitioning={ String( isTransitioning ) }
      >
        <div className="stage" data-cursor={ indicatorPage === 'intro' ? 'Scroll to break' : undefined }>
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

          <div className="scene-interface">
            <div className="hero-copy">
              <h1 aria-label={ HERO_TITLE }>
                { HERO_WORDS.map( ( word, index ) => (
                  <Fragment key={ word }>
                    { index > 0 && ' ' }
                    <span className="hero-word" aria-hidden="true"><span className="hero-word-inner">{ word }</span></span>
                  </Fragment>
                ) ) }
              </h1>
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

          {/* Fills the stage in the look's hall colour behind Studio while it shrinks back for Projects. */}
          <div className="stage-backdrop" aria-hidden="true" />

          {/* Studio: the lights come up on a pink-gel cyc. */}
          <section className="title-screen cyc cyc-studio" aria-labelledby="studio-title">
            <div className="cyc-wall" aria-hidden="true" />
            <LookScenery look={ activeLook } page="studio" />
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

          {/* Dims the held Studio as Projects covers it. */}
          <div className="stage-shade" aria-hidden="true" />
        </div>
      </section>

      {/* Projects rises over the held Studio, then pins while its boards run sideways across the screen.
          Pulled up by the handoff screens; its height grows by the run (--run-distance, measured in JS). */}
      <section
        id="projects"
        className="projects-screen cyc cyc-flow cyc-projects"
        ref={ projectsRef }
        aria-labelledby="projects-title"
        style={ { '--handoff-screens': STAGE.pages.handoffScreens } }
      >
        <div className="projects-sticky">
          <div className="cyc-wall" aria-hidden="true" />
          <LookScenery look={ activeLook } page="projects" />
          <div className="projects-content">
            <h2 id="projects-title" className="projects-title cyc-title skew-layer" aria-label="Our Projects">
              <CueLine className="projects-title-line" text="Our" />
              <CueLine className="projects-title-line" text="Projects" />
            </h2>
          </div>
          <div className="projects-rail">
            <div className="projects-lean skew-layer-x">
              <div className="projects-track">
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
                <ul className="projects-next" aria-label="Work with us">
                  { NEXT_BOARDS.map( ( board ) => (
                    <li className={ `project-card is-next is-next-${board.id}` } key={ board.id }>
                      <a
                        className="project-board project-next"
                        href={ board.href }
                        data-cursor={ board.cursor }
                        target={ board.external ? '_blank' : undefined }
                        rel={ board.external ? 'noreferrer' : undefined }
                        onClick={ board.external ? undefined : ( event ) =>
                        {
                          // Glide to Contact with the Story's own motion instead of the browser jump.
                          event.preventDefault()
                          goToPage( 'contact' )
                        } }
                      >
                        <span className="project-next-title">{ board.title }</span>
                        { board.detail && <span className="project-next-detail">{ board.detail }</span> }
                        <svg className="project-next-arrow" viewBox="0 0 20 12" aria-hidden="true"><path d="M1 6h17M13 1l5 5-5 5" /></svg>
                      </a>
                      <span className="tape" aria-hidden="true">{ board.caption }</span>
                    </li>
                  ) ) }
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact: uncovered from beneath Projects as it scrolls away; the last section of the page. */}
      <section id="contact" className="contact-screen cyc cyc-flow cyc-contact" ref={ contactRef } aria-labelledby="contact-title">
        <div className="contact-inner">
          <div className="cyc-wall" aria-hidden="true" />
          <LookScenery look={ activeLook } page="contact" />
          <div className="contact-content skew-layer">
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
                      data-cursor={ item.action }
                      aria-label={ `${item.action} 8 Ball Studio on ${item.title}: ${item.description}` }
                    >
                      <span className="contact-icon"><ContactIcon type={ item.icon } /></span>
                      <span className="contact-channel">{ item.title }</span>
                      <span className="contact-detail">{ wrapBeforeAt( item.description ) }</span>
                      <span className="contact-action">
                        <span className="contact-action-label">{ item.action }</span>
                        <svg viewBox="0 0 20 12" aria-hidden="true"><path d="M1 6h17M13 1l5 5-5 5" /></svg>
                      </span>
                    </a>
                  </li>
                ) ) }
              </ul>
              {/* The foot line also carries the Look choice: a whole-site setting, kept at the end of
                  the Story instead of floating over every Page. */}
              <div className="call-sheet-foot">
                <span>8 Ball Studio</span>
                <span>Greater Kuala Lumpur</span>
                <LookSwitcher activeLook={ activeLook } onChange={ switchLook } />
              </div>
            </div>
          </div>
        </div>
        {/* The shadow Projects casts on Contact, lifting as Contact is uncovered. */}
        <div className="contact-shade" aria-hidden="true" />
      </section>

      {/* Drafts are treatments of the Intro: styles.css shows this only while the Intro is settled. */}
      <DraftSwitcher activeDraft={ activeDraft } onChange={ switchDraft } />

      {/* Mouse and trackpad only: a cue ball replaces the pointer. */}
      <CursorBall />

      { TUNE_REQUESTED && (
        <Suspense fallback={ null }>
          <TunePanel />
        </Suspense>
      ) }
    </main>
  )
}

export default App
