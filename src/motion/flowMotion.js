import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { getRunDistance, getRunScrollTarget, liftAt, sectionAt } from './flowMath.js'

gsap.registerPlugin( ScrollTrigger )

// A section takes over the header (its ink, the browser chrome colour) once its top passes this line.
const HEADER_LINE_PX = 64

// The handoff and reveal amounts at depth 1; the depth setting scales them all together.
// contactShade is the strength of the shadow Projects casts at its bottom edge onto Contact.
const FLOW_AT_DEPTH_1 = { riseVh: 8, shrink: 0.035, liftPercent: 2, dim: 0.35, contactOffsetPercent: 25, contactShade: 0.4 }

// Scroll per tile of the Services timeline, in screens: each reel or still holds the centre this long.
const TIMELINE_TILE_SCREENS = 0.55
// How far each tile's media drifts inside its frame (yPercent), the parallax of the column.
const TIMELINE_PARALLAX_PERCENT = 8

/**
 * Main's Services timeline (App.jsx, acid.css), after nickho-motorsports.nl's history: Services pins
 * while its column of media tiles (each service's reel, then its still) scrolls up through the centre.
 * The tile at the centre is active: it comes forward, and its reel plays. Each tile names its service
 * (data-step), so a service's name, detail and count stay up until the column has run past every one
 * of its tiles, and only then does the next service take over. Services' height grows by the
 * timeline's scroll (--timeline-distance), the way Projects grows by its run. Returns a cleanup.
 */
function createServicesTimeline ( { services, timeline, scrub } )
{
  const track = timeline.querySelector( '.timeline-track' )
  const windowEl = timeline.querySelector( '.timeline-window' )
  const tiles = gsap.utils.toArray( '.timeline-tile', timeline )
  const steps = gsap.utils.toArray( '.timeline-step', timeline )
  const count = timeline.querySelector( '.timeline-count' )
  const fill = timeline.querySelector( '.timeline-bar-fill' )
  if ( !track || !windowEl || tiles.length < 2 ) return () => {}

  const last = tiles.length - 1
  const stepOf = tiles.map( ( tile ) => Number( tile.dataset.step ) || 0 )
  const videos = tiles.map( ( tile ) => tile.querySelector( 'video' ) )
  // Each tile's media drifts against the column's move (quickSetter: no tween per frame).
  const setDrift = tiles.map( ( tile ) => gsap.quickSetter( tile.querySelector( '.timeline-media' ), 'yPercent' ) )

  let distance = 0
  const measure = () =>
  {
    distance = Math.round( last * TIMELINE_TILE_SCREENS * window.innerHeight )
    services.style.setProperty( '--timeline-distance', `${distance}px` )
  }
  measure()
  ScrollTrigger.addEventListener( 'refreshInit', measure )

  // The track's offset that puts a tile's centre on the window's centre (read at each refresh).
  const centreOn = ( index ) => () =>
    windowEl.clientHeight / 2 - ( tiles[ index ].offsetTop + tiles[ index ].offsetHeight / 2 )

  // Only the centred reel plays, and only while Services is on screen; the next two start loading
  // so they are ready when they arrive.
  let onScreen = false
  const playOnly = ( index ) =>
  {
    if ( !onScreen ) return
    videos.forEach( ( video, videoIndex ) =>
    {
      if ( !video ) return
      if ( videoIndex === index )
      {
        video.play()?.catch( () => {} )
        return
      }
      if ( !video.paused ) video.pause()
      if ( videoIndex > index && videoIndex <= index + 2 ) video.preload = 'auto'
    } )
  }

  // Only touch the DOM when the centred tile changes, not on every scrubbed frame.
  let currentTile = -1
  let currentStep = -1
  const setTile = ( next ) =>
  {
    if ( next === currentTile ) return
    tiles[ currentTile ]?.classList.remove( 'is-active' )
    currentTile = next
    tiles[ currentTile ].classList.add( 'is-active' )
    playOnly( currentTile )
    const step = stepOf[ currentTile ]
    if ( step === currentStep ) return
    steps[ currentStep ]?.classList.remove( 'is-active' )
    currentStep = step
    steps[ currentStep ]?.classList.add( 'is-active' )
    if ( count ) count.textContent = String( currentStep + 1 ).padStart( 2, '0' )
  }
  // The markup starts with the first tile and step active.
  tiles.forEach( ( tile, index ) => tile.classList.toggle( 'is-active', index === 0 ) )
  steps.forEach( ( step, index ) => step.classList.toggle( 'is-active', index === 0 ) )
  currentTile = 0
  currentStep = 0

  // Tiles are evenly spaced, so a linear move keeps every tile the same length of scroll.
  // The scrubbed progress (not raw scroll) picks the tile, so text swaps in time with the column.
  const trigger = { trigger: services, start: 'top top', end: () => `+=${Math.max( 1, distance )}`, scrub, invalidateOnRefresh: true }
  const syncTimeline = ( progress ) =>
  {
    const position = progress * last
    setTile( Math.round( position ) )
    setDrift.forEach( ( set, index ) => set( gsap.utils.clamp( -1, 1, index - position ) * TIMELINE_PARALLAX_PERCENT ) )
  }
  const column = gsap.fromTo( track, { y: centreOn( 0 ) }, {
    y: centreOn( last ),
    ease: 'none',
    // A refresh can land the column anywhere (a restored scroll spot, a resize): re-read it then too.
    scrollTrigger: { ...trigger, onRefresh: ( self ) => syncTimeline( self.animation?.progress() ?? self.progress ) },
    onUpdate () { syncTimeline( this.progress() ) },
  } )
  // The bar fills with the column, from one tile's share to full at the last tile.
  if ( fill ) gsap.fromTo( fill, { scaleX: 1 / tiles.length }, { scaleX: 1, ease: 'none', scrollTrigger: { ...trigger } } )
  syncTimeline( column.progress() )

  // Reels stop when Services is off screen.
  const visibility = ScrollTrigger.create( {
    trigger: services,
    start: 'top bottom',
    end: 'bottom top',
    onToggle: ( self ) =>
    {
      onScreen = self.isActive
      if ( onScreen ) playOnly( currentTile )
      else videos.forEach( ( video ) => video?.pause() )
    },
  } )

  return () =>
  {
    ScrollTrigger.removeEventListener( 'refreshInit', measure )
    services.style.removeProperty( '--timeline-distance' )
    visibility.kill()
    videos.forEach( ( video ) => video?.pause() )
    tiles.forEach( ( tile, index ) => tile.classList.toggle( 'is-active', index === 0 ) )
    steps.forEach( ( step, index ) => step.classList.toggle( 'is-active', index === 0 ) )
    if ( count ) count.textContent = '01'
  }
}

/**
 * Tracks which part of the Story sits under the header: the pinned stage, Services, Projects, or Contact.
 * Runs in every motion mode (reduced motion too), because the header's ink and the browser chrome
 * colour must follow the section even when nothing animates. Returns a cleanup.
 */
export function createNavSections ( { root, onNavSection } )
{
  const services = root.querySelector( '.services-screen' )
  const projects = root.querySelector( '.projects-screen' )
  const contact = root.querySelector( '.contact-screen' )
  if ( !services || !projects || !contact ) return () => {}

  const starts = { servicesStart: Infinity, projectsStart: Infinity, contactStart: Infinity }
  let current = null
  const sync = ( self ) =>
  {
    const next = sectionAt( self.scroll(), starts )
    if ( next === current ) return
    current = next
    onNavSection?.( next )
  }

  // One trigger from Services reaching the header line to Contact reaching it. Projects' line is
  // measured on refresh from its own document top. Every edge callback re-reads the scroll position,
  // so a jump straight past several sections still lands on the right one.
  const trigger = ScrollTrigger.create( {
    trigger: services,
    start: `top top+=${HEADER_LINE_PX}`,
    endTrigger: contact,
    end: `top top+=${HEADER_LINE_PX}`,
    onRefresh: ( self ) =>
    {
      starts.servicesStart = self.start
      starts.projectsStart = projects.getBoundingClientRect().top + window.scrollY - HEADER_LINE_PX
      starts.contactStart = self.end
      sync( self )
    },
    onUpdate: sync,
    onEnter: sync,
    onLeave: sync,
    onEnterBack: sync,
    onLeaveBack: sync,
  } )

  return () =>
  {
    trigger.kill()
    onNavSection?.( 'stage' )
  }
}

/**
 * The section choreography after the pinned stage, shared by every look:
 * 1. Studio → Services: Services rises over the held Studio, which shrinks back and dims.
 *    Services → Projects: Projects rises over Services, which shrinks back and dims the same way.
 * 2. The Projects run: the section pins while its track of boards slides sideways, each board
 *    lifting (--lift) as it crosses the centre; the title drifts and the wall pushes in for depth.
 * 3. Projects → Contact: Projects scrolls away and Contact is uncovered from beneath it.
 *    A look with motion.handoff 'sameTable' (Pool Table) keeps one still table under all three
 *    Pages instead: Studio does not shrink or dim, and no sheet shows its own table while it moves.
 * 4. Titles are set with the look's own letter entrance; Contact's rows settle in.
 *
 * Every sheet arrives in its final colour: nothing here changes a Page's ground while it moves, so
 * a Handoff never shows a mid-tone between two palettes (see the Sheet Rule in DESIGN.md).
 *
 * Call it inside the Story's gsap.context / matchMedia callback: every tween and ScrollTrigger made
 * here is reverted with it. The returned cleanup undoes what GSAP cannot (listeners, custom props).
 */
export function createFlowMotion ( { root, motion, charRest, compact, touch = false, scrub, depth = 1, scrollToY } )
{
  // Scrub for the pinned sideways moves (the Projects run, the Services timeline). On touch screens
  // they lock to the scroll position (true): native momentum is already smooth, and a catch-up lag
  // on top of the finger read as the run lagging behind it on phones.
  const pinnedScrub = touch ? true : scrub
  const d = Math.max( 0, depth )
  const flow = {
    riseVh: FLOW_AT_DEPTH_1.riseVh * d,
    shrinkScale: 1 - FLOW_AT_DEPTH_1.shrink * d,
    shrinkLiftPercent: FLOW_AT_DEPTH_1.liftPercent * d,
    shrinkDim: Math.min( 1, FLOW_AT_DEPTH_1.dim * d ),
    contactRevealOffsetPercent: FLOW_AT_DEPTH_1.contactOffsetPercent * d,
    contactShade: Math.min( 1, FLOW_AT_DEPTH_1.contactShade * d ),
  }
  const services = root.querySelector( '.services-screen' )
  const projects = root.querySelector( '.projects-screen' )
  const contact = root.querySelector( '.contact-screen' )
  const track = projects?.querySelector( '.projects-track' )
  const rail = projects?.querySelector( '.projects-rail' )
  if ( !services || !projects || !contact || !track || !rail ) return () => {}

  const servicesInner = services.querySelector( '.services-inner' )
  const servicesContent = services.querySelector( '.services-content' )
  const servicesShade = services.querySelector( '.services-shade' )

  const titleScreen = root.querySelector( '.title-screen' )
  const stageBackdrop = root.querySelector( '.stage-backdrop' )
  const stageShade = root.querySelector( '.stage-shade' )
  const projectsContent = projects.querySelector( '.projects-content' )
  const projectsDepth = projects.querySelectorAll( ':scope .projects-sticky > .cyc-wall, :scope .projects-sticky > .look-scenery' )
  const contactInner = contact.querySelector( '.contact-inner' )
  const contactShade = contact.querySelector( '.contact-shade' )
  // Pool Table: one table under every Page. The sheets still rise and uncover as in every look, but
  // each Page's own hall and table stay hidden while they move, so the visitor sees one table that
  // never moves and only the things on its cloth change. Each swap happens where the two tables
  // cover the same pixels, so it cannot be seen.
  const sameTable = motion.handoff === 'sameTable'
  const studioItems = root.querySelectorAll( '.title-screen :is(.final-content, .studio-floor, .final-meta, .dl-balls)' )
  const contactContent = contact.querySelector( '.contact-content' )
  const contactSurface = contact.querySelectorAll( ':scope .contact-inner > .cyc-wall, :scope .contact-inner > .look-scenery' )
  const cleanups = []
  // Phones travel shorter: the same moves at a little over half the distance.
  const reach = compact ? 0.6 : 1

  // ---- The run's length: measured before every refresh, so Projects is tall enough to pin it. ----
  let runDistance = 0
  const measure = () =>
  {
    runDistance = getRunDistance( track.scrollWidth, rail.clientWidth )
    projects.style.setProperty( '--run-distance', `${runDistance}px` )
  }
  measure()
  ScrollTrigger.addEventListener( 'refreshInit', measure )
  cleanups.push( () =>
  {
    ScrollTrigger.removeEventListener( 'refreshInit', measure )
    projects.style.removeProperty( '--run-distance' )
  } )

  // ---- 1a. Studio → Services: rise over, shrink back. ----
  // The backdrop fills the stage behind the shrinking Studio with the look's hall colour, so the
  // frozen Intro scene never shows around its edges.
  const riseOver = gsap.timeline( {
    scrollTrigger: { trigger: services, start: 'top bottom', end: 'top top', scrub, invalidateOnRefresh: true },
  } )
    .fromTo( stageBackdrop, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.001, ease: 'none' }, 0 )
    // Services' content arrives a little behind its surface, then catches up: the rise.
    .fromTo( servicesContent, { y: () => window.innerHeight * flow.riseVh * reach / 100 }, {
      y: 0,
      duration: 1,
      ease: 'power2.out',
    }, 0 )
  if ( sameTable )
  {
    // Studio's title, services, and resting balls clear off the cloth in the first half of the rise;
    // Studio's table stays, full size and fully lit, under Services' incoming content. (A CSS
    // variable, read in downlight.css, so the Studio cue keeps sole use of these items' opacity.)
    riseOver
      .fromTo( titleScreen, { '--studio-clear': 1 }, { '--studio-clear': 0, duration: 0.5, ease: 'power1.in' }, 0 )
      // Services' own table switches on when its sheet reaches the top: exactly over Studio's.
      .fromTo( services, { '--table-in': 0 }, { '--table-in': 1, duration: 0.001, ease: 'none' }, 0.999 )
  }
  else
  {
    riseOver
      .fromTo( titleScreen, { scale: 1, yPercent: 0 }, {
        scale: flow.shrinkScale,
        yPercent: -flow.shrinkLiftPercent,
        duration: 1,
        ease: 'none',
      }, 0 )
      .fromTo( stageShade, { opacity: 0 }, { opacity: flow.shrinkDim, duration: 1, ease: 'none' }, 0 )
  }

  // ---- 1b. Services → Projects: the same rise over, one sheet on. ----
  const riseOverServices = gsap.timeline( {
    scrollTrigger: { trigger: projects, start: 'top bottom', end: 'top top', scrub, invalidateOnRefresh: true },
  } )
    // Projects' content arrives a little behind its surface, then catches up: the rise.
    .fromTo( [ projectsContent, rail ], { y: () => window.innerHeight * flow.riseVh * reach / 100 }, {
      y: 0,
      duration: 1,
      ease: 'power2.out',
    }, 0 )
  if ( sameTable )
  {
    // One table: Services' type clears off the cloth, and Projects' table switches on at the top.
    riseOverServices
      .fromTo( servicesContent, { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.5, ease: 'power1.in' }, 0 )
      .fromTo( projects, { '--table-in': 0 }, { '--table-in': 1, duration: 0.001, ease: 'none' }, 0.999 )
  }
  else
  {
    riseOverServices
      .fromTo( servicesInner, { scale: 1, yPercent: 0 }, {
        scale: flow.shrinkScale,
        yPercent: -flow.shrinkLiftPercent,
        duration: 1,
        ease: 'none',
      }, 0 )
      .fromTo( servicesShade, { opacity: 0 }, { opacity: flow.shrinkDim, duration: 1, ease: 'none' }, 0 )
  }

  // ---- 2. The Projects run. ----
  const runTrigger = () => ( {
    trigger: projects,
    start: 'top top',
    end: () => `+=${Math.max( 1, runDistance )}`,
    scrub: pinnedScrub,
    invalidateOnRefresh: true,
  } )
  const run = gsap.to( track, { x: () => -runDistance, ease: 'none', scrollTrigger: runTrigger() } )
  // Depth: the title drifts against the boards, and the wall (or table) pushes in slightly.
  gsap.to( projectsContent, { x: () => -window.innerWidth * 0.04 * reach, ease: 'none', scrollTrigger: runTrigger() } )
  // (Not with one table: a pushed-in table would no longer match the next Page's.)
  if ( projectsDepth.length && !sameTable ) gsap.fromTo( projectsDepth, { scale: 1 }, { scale: 1.04, ease: 'none', scrollTrigger: runTrigger() } )

  // Each board lifts as it crosses the centre; every look turns --lift into its own gesture.
  // Not on touch screens: a custom property written on every card each frame re-styled the whole
  // track while the finger moved. There the boards rest unlifted (Main shows its logos at full strength).
  if ( !touch ) gsap.utils.toArray( '.project-card', track ).forEach( ( card ) =>
  {
    const setLift = ( self ) => card.style.setProperty( '--lift', liftAt( self.progress ).toFixed( 3 ) )
    ScrollTrigger.create( {
      trigger: card,
      containerAnimation: run,
      start: 'left right',
      end: 'right left',
      onUpdate: setLift,
      onRefresh: setLift,
    } )
    cleanups.push( () => card.style.removeProperty( '--lift' ) )
  } )

  // Keyboard focus on a board link glides the run until that board sits at the centre.
  const followFocus = ( event ) =>
  {
    const card = event.target.closest?.( '.project-card' )
    const start = run.scrollTrigger?.start
    if ( !card || !Number.isFinite( start ) || !( runDistance > 0 ) ) return
    scrollToY?.( getRunScrollTarget( {
      sectionTop: start,
      runDistance,
      boardLeft: card.offsetLeft,
      boardWidth: card.offsetWidth,
      viewportWidth: rail.clientWidth,
    } ) )
  }
  track.addEventListener( 'focusin', followFocus )
  cleanups.push( () => track.removeEventListener( 'focusin', followFocus ) )

  // ---- 3. Projects → Contact: uncovered from beneath. ----
  // The shade is the soft shadow Projects casts at its bottom edge (a mask in styles.css), so
  // Contact shows its own colour from the first pixel; the shadow lifts as Projects leaves.
  const uncover = gsap.timeline( {
    scrollTrigger: { trigger: contact, start: 'top bottom', end: 'top top', scrub, invalidateOnRefresh: true },
  } )
    .fromTo( contactInner, { yPercent: -flow.contactRevealOffsetPercent * reach }, { yPercent: 0, duration: 1, ease: 'none' }, 0 )
  if ( sameTable )
  {
    // Contact's table is held above its sheet's top edge during the reveal: the sheet must not clip it.
    contact.style.overflow = 'visible'
    cleanups.push( () => contact.style.removeProperty( 'overflow' ) )
    // Contact's table is held still on screen while its sheet comes up: this offset cancels the
    // sheet's climb (one screen) less the inner screen's own settle, both linear in scroll.
    uncover
      .fromTo( contactSurface, { y: () => -window.innerHeight * ( 1 - flow.contactRevealOffsetPercent * reach / 100 ) }, {
        y: 0,
        duration: 1,
        ease: 'none',
      }, 0 )
      // Contact's type comes up from under the bottom rail, never across the hall floor below the
      // table: its bottom edge is clipped where its settled position ends, by the same offset.
      // (Negative insets leave the top and sides free: the corner pocket's 8-ball sits above the box.)
      .fromTo( contactContent, { clipPath: () => `inset(-50vh -50vw ${Math.round( window.innerHeight * ( 1 - flow.contactRevealOffsetPercent * reach / 100 ) )}px -50vw)` }, {
        clipPath: 'inset(-50vh -50vw 0px -50vw)',
        duration: 1,
        ease: 'none',
      }, 0 )
      // Projects' table switches off as the reveal starts, when Contact's lies exactly beneath it.
      .fromTo( projects, { '--table-out': 1 }, { '--table-out': 0, duration: 0.001, ease: 'none' }, 0 )
  }
  else
  {
    uncover.fromTo( contactShade, { opacity: flow.contactShade }, { opacity: 0, duration: 1, ease: 'none' }, 0 )
  }

  // ---- 4. Titles in the look's own entrance, and Contact's rows settling in. ----
  // Rows fade with opacity, never visibility, so their links stay reachable by keyboard.
  const revealTitle = ( section, selector, start, end ) =>
  {
    const letters = section.querySelectorAll( selector )
    if ( !letters.length ) return
    gsap.fromTo( letters, motion.entrance, {
      ...charRest,
      stagger: { amount: 0.3, from: motion.letterFrom ?? 'end' },
      scrollTrigger: { trigger: section, start, end, scrub },
    } )
  }
  revealTitle( services, '.services-title .cue-char', 'top 80%', 'top 15%' )
  revealTitle( projects, '.projects-title .cue-char', 'top 80%', 'top 15%' )

  // The running order is read out one row at a time as Services rises: each row slides up out of
  // its own rule, left to right down the list, finishing as the sheet reaches the top.
  const serviceRows = services.querySelectorAll( '.service-row' )
  if ( serviceRows.length )
  {
    gsap.fromTo( serviceRows, { y: 24, opacity: 0 }, {
      y: 0,
      opacity: 1,
      ease: 'power2.out',
      stagger: 0.1,
      scrollTrigger: { trigger: services, start: 'top 70%', end: 'top 5%', scrub },
    } )
  }

  // Main shows the running order as a pinned timeline instead of the list (hidden by CSS elsewhere).
  const servicesTimeline = services.querySelector( '.services-timeline' )
  if ( servicesTimeline && window.getComputedStyle( servicesTimeline ).display !== 'none' )
  {
    cleanups.push( createServicesTimeline( { services, timeline: servicesTimeline, scrub: pinnedScrub } ) )
  }
  revealTitle( contact, '.contact-title .cue-char', 'top 75%', 'top 10%' )

  const rows = contact.querySelectorAll( '.contact-lead, .contact-primary, .contact-list li, .call-sheet-foot' )
  if ( rows.length )
  {
    gsap.fromTo( rows, { y: 20, opacity: 0 }, {
      y: 0,
      opacity: 1,
      ease: 'power2.out',
      stagger: 0.12,
      scrollTrigger: { trigger: contact, start: 'top 60%', end: 'top 5%', scrub },
    } )
  }

  // ---- 5. The closing shot: the break's last beat. As Contact settles, the 8-ball rolls in from
  // the left, turning, reaches the pocket, and drops into it (it shrinks and darkens as it sinks).
  // The CSS rest state is the ball lying in the pocket, so reduced motion shows the same last frame.
  const ball = contact.querySelector( '.contact-pocket-ball' )
  if ( ball )
  {
    gsap.timeline( { scrollTrigger: { trigger: contact, start: 'top 70%', end: 'top 2%', scrub } } )
      .fromTo( ball, { xPercent: -520 * reach, rotation: -540, scale: 1, filter: 'brightness(1)' }, {
        xPercent: 0,
        rotation: 0,
        duration: 0.7,
        ease: 'power2.out',
      } )
      .to( ball, { scale: 0.64, filter: 'brightness(0.55)', duration: 0.3, ease: 'power2.in' } )
  }

  if ( sameTable )
  {
    cleanups.push( () =>
    {
      titleScreen?.style.removeProperty( '--studio-clear' )
      services.style.removeProperty( '--table-in' )
      projects.style.removeProperty( '--table-in' )
      projects.style.removeProperty( '--table-out' )
    } )
  }

  return () => cleanups.forEach( ( cleanup ) => cleanup() )
}
